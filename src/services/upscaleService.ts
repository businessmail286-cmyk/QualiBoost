import { ImageMetadata, UpscaleResult, ScaleValue, ProcessingStudioMode } from '../types';
import { API_CONFIG, parseJsonResponse, sanitizeBaseUrl } from '../config/api';

export interface UpscaleProgressInfo {
  stage: 'queued' | 'processing' | 'downloading' | 'completed';
  progressPercent: number; // 0 to 100
  elapsedSeconds?: number;
  message?: string;
  isEstimate?: boolean;
}

interface JobStatusPayload {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  elapsed_seconds?: number;
  progress_is_estimate?: boolean;
  progress_label?: string;
  error?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
}

/** Maximum file size supported by the backend (50 MB) */
export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Initiates the Real-ESRGAN enhancement request using the verified asynchronous jobs API:
 * 1. POST /api/jobs/enhance -> returns HTTP 202 with { job_id }
 * 2. GET /api/jobs/{job_id} -> polls status ('queued', 'processing', 'completed', 'failed')
 * 3. GET /api/jobs/{job_id}/result -> retrieves final enhanced binary PNG Blob
 * 4. Downloads as 'qualiboost-enhanced.png'
 */
export async function requestImageUpscale(
  metadata: ImageMetadata,
  scale: ScaleValue = 4,
  model: string = 'RealESRGAN_x4plus',
  signal?: AbortSignal,
  onProgress?: (info: UpscaleProgressInfo) => void,
  sharpening: number = 70,
  studioMode: ProcessingStudioMode = 'standard'
): Promise<UpscaleResult> {
  // 1. Validate that an image is selected
  if (!metadata || !metadata.url) {
    throw new Error('No image selected to enhance. Please select or upload an image first.');
  }

  // 2. Resolve the binary File / Blob
  let uploadFile: File | Blob;
  if (metadata.file) {
    uploadFile = metadata.file;
  } else {
    try {
      const res = await fetch(metadata.url);
      uploadFile = await res.blob();
    } catch {
      throw new Error('Unable to read selected image data for upload.');
    }
  }

  // 3. Client-side validation: non-empty & size limit
  if (uploadFile.size === 0) {
    throw new Error('The selected image is empty (0 bytes). Please upload a valid image.');
  }

  if (uploadFile.size > MAX_UPLOAD_SIZE_BYTES) {
    const sizeMb = (uploadFile.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Image size (${sizeMb} MB) exceeds the backend limit of 50 MB. Please select an image under 50 MB.`
    );
  }

  // 4. Validate scale (strictly 2, 3, or 4), model, and sharpening (0-100)
  const validScale: ScaleValue = scale === 2 || scale === 3 || scale === 4 ? scale : 4;
  const validModel = model && model.trim() ? model.trim() : 'RealESRGAN_x4plus';
  const validSharpening = Math.round(
    Math.min(100, Math.max(0, typeof sharpening === 'number' && !isNaN(sharpening) ? sharpening : 70))
  );

  // 5. Construct FormData (do NOT manually set Content-Type header; browser sets multipart boundary)
  const formData = new FormData();
  formData.append('file', uploadFile, metadata.name || 'image.png');
  formData.append('scale', validScale.toString());
  formData.append('model', validModel);
  formData.append('sharpening', validSharpening.toString());
  formData.append('studio_mode', studioMode === 'studio' ? 'studio' : 'standard');

  const configuredBase = sanitizeBaseUrl(API_CONFIG.getBaseUrl());

  // Helper to build headers for same-origin proxy
  const getHeaders = (endpointUrl: string): Record<string, string> => {
    const headers: Record<string, string> = {
      Accept: 'application/json, image/*, */*',
    };
    if (endpointUrl.startsWith('/') && configuredBase) {
      headers['x-backend-target-url'] = configuredBase;
    }
    return headers;
  };

  // --------------------------------------------------------------------------
  // Step 1: Submit to Real-ESRGAN /api/jobs/enhance
  // --------------------------------------------------------------------------
  const directJobs = API_CONFIG.getJobsSubmitUrl();
  const submitEndpoints: string[] = [];

  // Try relative proxy endpoint first (avoids cross-origin CORS blocks on preview domains)
  submitEndpoints.push('/api/jobs/enhance');
  if (directJobs && directJobs.startsWith('http') && directJobs !== '/api/jobs/enhance') {
    submitEndpoints.push(directJobs);
  }

  const startTime = Date.now();

  // Initial progress event
  const startProgressTicker = () => {
    onProgress?.({
      stage: 'processing',
      progressPercent: 0,
      elapsedSeconds: 0,
      message:
        studioMode === 'studio'
          ? 'Submitting image to Studio Mode (4× Real-ESRGAN + GFPGAN Face Restoration)...'
          : `Submitting image to Real-ESRGAN ${validScale}× pipeline...`,
      isEstimate: false,
    });
  };

  const stopProgressTicker = () => {
    // No-op kept for cleanup symmetry
  };

  const submitErrors: string[] = [];

  for (const endpoint of submitEndpoints) {
    if (signal?.aborted) {
      throw new Error('Enhancement request was cancelled.');
    }

    startProgressTicker();

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getHeaders(endpoint),
        body: formData,
        signal,
      });

      stopProgressTicker();

      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      // Case A: Backend returns enhanced binary image directly (HTTP 200 with image/*)
      if (res.ok && (contentType.startsWith('image/') || contentType.includes('application/octet-stream'))) {
        const blob = await res.blob();
        if (blob.size === 0) {
          throw new Error('Backend returned an empty image (0 bytes).');
        }

        onProgress?.({
          stage: 'completed',
          progressPercent: 100,
          elapsedSeconds: Math.round((Date.now() - startTime) / 1000),
          message: 'Inference complete! Preparing image preview...',
          isEstimate: false,
        });

        return buildUpscaleResult(blob, contentType || 'image/png', metadata, validScale, validModel, undefined, studioMode);
      }

      // Case B: Backend returns JSON (job submission with job_id or error)
      if (contentType.includes('application/json')) {
        const parsed = await parseJsonResponse<{ job_id?: string; status?: string; message?: string }>(
          res,
          `job submission (${endpoint})`
        );

        if (parsed.ok && parsed.data?.job_id) {
          // Asynchronous jobs API: poll status until complete
          return await pollAsyncJob(
            parsed.data.job_id,
            endpoint,
            getHeaders,
            startTime,
            metadata,
            validScale,
            validModel,
            signal,
            onProgress,
            studioMode
          );
        }

        if (!parsed.ok) {
          submitErrors.push(parsed.error);
        } else {
          submitErrors.push(parsed.data?.message || `Received unexpected JSON from ${endpoint}`);
        }
      } else {
        const parsedErr = await parseJsonResponse(res, `job submission response (${endpoint})`);
        submitErrors.push(parsedErr.ok ? JSON.stringify(parsedErr.data) : parsedErr.error);
      }
    } catch (err: unknown) {
      stopProgressTicker();
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Enhancement request was cancelled.');
        }
        if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
          submitErrors.push(
            `CORS restriction reaching ${endpoint}: The FastAPI backend blocked cross-origin requests from ${typeof window !== 'undefined' ? window.location.origin : 'this origin'}. Please set QUALIBOOST_ALLOWED_ORIGINS="*" in your backend environment.`
          );
        } else {
          submitErrors.push(`Failed to reach ${endpoint}: ${err.message}`);
        }
      } else {
        submitErrors.push(`Failed to reach ${endpoint}: Network error`);
      }
    }
  }

  const summary = submitErrors.join(' | ');
  throw new Error(
    summary ||
      `Unable to connect to Real-ESRGAN backend at ${configuredBase || 'the configured endpoint'}. Please verify that the tunnel is active.`
  );
}

/**
 * Polls an asynchronous job endpoint until completed.
 */
async function pollAsyncJob(
  jobId: string,
  submissionEndpoint: string,
  getHeaders: (url: string) => Record<string, string>,
  startTime: number,
  metadata: ImageMetadata,
  validScale: ScaleValue,
  validModel: string,
  signal?: AbortSignal,
  onProgress?: (info: UpscaleProgressInfo) => void,
  studioMode: ProcessingStudioMode = 'standard'
): Promise<UpscaleResult> {
  const rootBase = submissionEndpoint.startsWith('/')
    ? ''
    : submissionEndpoint.replace(/\/api\/jobs\/enhance\/?.*$/, '');
  const statusEndpoint = rootBase ? `${rootBase}/api/jobs/${jobId}` : `/api/jobs/${jobId}`;
  const resultEndpoint = rootBase ? `${rootBase}/api/jobs/${jobId}/result` : `/api/jobs/${jobId}/result`;

  let currentPercent = 0;

  onProgress?.({
    stage: 'queued',
    progressPercent: 0,
    elapsedSeconds: 0,
    message:
      studioMode === 'studio'
        ? 'Inference job queued in Studio Mode pipeline...'
        : 'Inference job queued in Real-ESRGAN backend...',
    isEstimate: false,
  });

  const pollIntervalMs = 2000;
  const maxTimeoutMs = 600000; // 10 minutes

  while (true) {
    if (signal?.aborted) {
      fetch(statusEndpoint, { method: 'DELETE', headers: getHeaders(statusEndpoint) }).catch(() => {});
      throw new Error('Enhancement request was cancelled.');
    }

    if (Date.now() - startTime > maxTimeoutMs) {
      throw new Error('Inference job timed out after 10 minutes.');
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const statusRes = await fetch(statusEndpoint, {
      method: 'GET',
      headers: getHeaders(statusEndpoint),
      signal,
    });

    const parsedStatus = await parseJsonResponse<JobStatusPayload>(statusRes, `job status (${statusEndpoint})`);
    if (!parsedStatus.ok) throw new Error(parsedStatus.error);

    const statusData = parsedStatus.data;
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);

    // Read genuine progress percentage from backend
    if (typeof statusData.progress === 'number' && !isNaN(statusData.progress)) {
      currentPercent = Math.max(currentPercent, Math.min(100, Math.round(statusData.progress)));
    }

    if (statusData.status === 'failed') {
      throw new Error(`Real-ESRGAN inference failed: ${statusData.error || 'Unknown engine error'}`);
    }

    if (statusData.status === 'cancelled') {
      throw new Error('Enhancement job was cancelled.');
    }

    if (statusData.status === 'completed') {
      currentPercent = 100;
      onProgress?.({
        stage: 'downloading',
        progressPercent: 100,
        elapsedSeconds: elapsedSec,
        message: 'Inference complete! Downloading enhanced PNG...',
        isEstimate: false,
      });
      break;
    }

    onProgress?.({
      stage: statusData.status === 'processing' ? 'processing' : 'queued',
      progressPercent: currentPercent,
      elapsedSeconds: statusData.elapsed_seconds ?? elapsedSec,
      message:
        statusData.progress_label ||
        (statusData.status === 'processing'
          ? studioMode === 'studio'
            ? `Studio Mode active: Real-ESRGAN + GFPGAN (${currentPercent}%)...`
            : `Real-ESRGAN inference active (${currentPercent}%)...`
          : `Job queued in backend...`),
      isEstimate: Boolean(statusData.progress_is_estimate),
    });
  }

  const resultRes = await fetch(resultEndpoint, {
    method: 'GET',
    headers: getHeaders(resultEndpoint),
    signal,
  });

  const resultContentType = (resultRes.headers.get('content-type') || '').toLowerCase();
  if (!resultRes.ok || resultContentType.includes('text/html') || resultContentType.includes('application/json')) {
    const parsedErr = await parseJsonResponse(resultRes, `result download (${resultEndpoint})`);
    throw new Error(parsedErr.ok ? JSON.stringify(parsedErr.data) : parsedErr.error);
  }

  const blob = await resultRes.blob();
  if (blob.size === 0) throw new Error('Backend returned an empty image (0 bytes).');

  onProgress?.({
    stage: 'completed',
    progressPercent: 100,
    elapsedSeconds: Math.round((Date.now() - startTime) / 1000),
    message: 'Processing complete! Preparing image preview...',
    isEstimate: false,
  });

  return buildUpscaleResult(blob, resultContentType || 'image/png', metadata, validScale, validModel, jobId, studioMode);
}

/**
 * Downloads the completed enhanced image from the backend in the specified format ('png' or 'jpeg').
 * PNG endpoint: GET /api/jobs/{job_id}/result (maximum preservation)
 * JPEG endpoint: GET /api/jobs/{job_id}/result?format=jpeg (quality 95)
 */
export async function downloadJobResultBlob(
  jobId: string,
  format: 'png' | 'jpeg',
  cachedBlob?: Blob
): Promise<Blob> {
  // If format is PNG and we already have a valid PNG blob in memory, return it directly
  if (
    format === 'png' &&
    cachedBlob &&
    cachedBlob.size > 0 &&
    (cachedBlob.type === 'image/png' || !cachedBlob.type || cachedBlob.type.includes('png'))
  ) {
    return cachedBlob;
  }

  const configuredBase = sanitizeBaseUrl(API_CONFIG.getBaseUrl());
  const pathWithQuery = `/api/jobs/${jobId}/result${format === 'jpeg' ? '?format=jpeg' : ''}`;
  const directUrl = API_CONFIG.getJobResultUrl(jobId) + (format === 'jpeg' ? '?format=jpeg' : '');

  const endpointsToTry: string[] = [pathWithQuery];
  if (directUrl && directUrl.startsWith('http') && directUrl !== pathWithQuery) {
    endpointsToTry.push(directUrl);
  }

  let lastError = 'Failed to download enhanced image.';

  for (const endpoint of endpointsToTry) {
    try {
      const headers: Record<string, string> = {
        Accept: format === 'jpeg' ? 'image/jpeg, image/*, */*' : 'image/png, image/*, */*',
      };
      if (endpoint.startsWith('/') && configuredBase) {
        headers['x-backend-target-url'] = configuredBase;
      }

      const res = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      if (!res.ok || contentType.includes('application/json') || contentType.includes('text/html')) {
        const parsedErr = await parseJsonResponse(res, `image download (${endpoint})`);
        lastError = parsedErr.ok ? JSON.stringify(parsedErr.data) : parsedErr.error;
        continue;
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        lastError = `Backend returned an empty ${format.toUpperCase()} image (0 bytes).`;
        continue;
      }

      return blob;
    } catch (err) {
      if (err instanceof Error) {
        lastError = err.message;
      }
    }
  }

  throw new Error(lastError);
}

/**
 * Builds the verified UpscaleResult with authentic natural dimensions.
 * File is configured for download as 'qualiboost-enhanced.png'.
 */
async function buildUpscaleResult(
  blob: Blob,
  contentType: string,
  metadata: ImageMetadata,
  scale: ScaleValue,
  model: string,
  jobId?: string,
  studioMode?: ProcessingStudioMode
): Promise<UpscaleResult> {
  const enhancedUrl = URL.createObjectURL(blob);

  const { width: outputWidth, height: outputHeight } = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const testImg = new Image();
      testImg.onload = () => resolve({ width: testImg.naturalWidth, height: testImg.naturalHeight });
      testImg.onerror = () =>
        reject(new Error('Failed to decode returned binary image. Output file may be corrupted.'));
      testImg.src = enhancedUrl;
    }
  );

  return {
    enhancedUrl,
    blob,
    outputWidth,
    outputHeight,
    format: contentType || 'image/png',
    sizeBytes: blob.size,
    filename: 'qualiboost-enhanced.png',
    scale,
    model,
    jobId,
    studioMode,
  };
}
