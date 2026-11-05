import { ImageMetadata, UpscaleResult, ScaleValue } from '../types';
import { API_CONFIG, parseJsonResponse, sanitizeBaseUrl } from '../config/api';

export interface UpscaleProgressInfo {
  stage: 'queued' | 'processing' | 'downloading' | 'completed';
  elapsedSeconds: number;
  message?: string;
  isEstimate?: boolean;
}

interface JobStatusPayload {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
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
  onProgress?: (info: UpscaleProgressInfo) => void
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

  // 4. Validate scale (strictly 2, 3, or 4) and model
  const validScale: ScaleValue = scale === 2 || scale === 3 || scale === 4 ? scale : 4;
  const validModel = model && model.trim() ? model.trim() : 'RealESRGAN_x4plus';

  // 5. Construct FormData (do NOT manually set Content-Type header)
  const formData = new FormData();
  formData.append('file', uploadFile, metadata.name || 'image.png');
  formData.append('scale', validScale.toString());
  formData.append('model', validModel);

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
  let progressTimer: any = null;

  // Live progress ticker for indeterminate animation
  const startProgressTicker = () => {
    onProgress?.({
      stage: 'processing',
      elapsedSeconds: 0,
      message: `Submitting image to Real-ESRGAN ${validScale}× pipeline...`,
      isEstimate: false,
    });
    progressTimer = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      onProgress?.({
        stage: 'processing',
        elapsedSeconds: elapsed,
        message: `Real-ESRGAN ${validScale}× inference in progress (${elapsed}s elapsed)...`,
        isEstimate: false,
      });
    }, 1000);
  };

  const stopProgressTicker = () => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  };

  let is404MissingJobsEndpoint = false;
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
          elapsedSeconds: Math.round((Date.now() - startTime) / 1000),
          message: 'Inference complete! Preparing image preview...',
          isEstimate: false,
        });

        return buildUpscaleResult(blob, contentType || 'image/png', metadata, validScale, validModel);
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
            onProgress
          );
        }

        if (!parsed.ok) {
          if (parsed.statusCode === 404) is404MissingJobsEndpoint = true;
          submitErrors.push(parsed.error);
        } else {
          submitErrors.push(parsed.data?.message || `Received unexpected JSON from ${endpoint}`);
        }
      } else {
        const parsedErr = await parseJsonResponse(res, `job submission response (${endpoint})`);
        if (!parsedErr.ok && parsedErr.statusCode === 404) {
          is404MissingJobsEndpoint = true;
        }
        submitErrors.push(parsedErr.ok ? JSON.stringify(parsedErr.data) : parsedErr.error);
      }
    } catch (err: unknown) {
      stopProgressTicker();
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Enhancement request was cancelled.');
        }
        submitErrors.push(`Failed to reach ${endpoint}: ${err.message}`);
      } else {
        submitErrors.push(`Failed to reach ${endpoint}: Network error`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Fallback: If /api/jobs/enhance returned 404, check /api/enhance?scale=X
  // --------------------------------------------------------------------------
  if (is404MissingJobsEndpoint) {
    const directEnhance = `${API_CONFIG.getEnhanceUrl()}?scale=${validScale}`;
    const fallbackEndpoints = directEnhance.startsWith('http')
      ? [directEnhance, `/api/enhance?scale=${validScale}`]
      : [`/api/enhance?scale=${validScale}`, directEnhance];

    for (const endpoint of fallbackEndpoints) {
      if (signal?.aborted) throw new Error('Enhancement request was cancelled.');

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: getHeaders(endpoint),
          body: formData,
          signal,
        });

        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (res.ok && (contentType.startsWith('image/') || contentType.includes('application/octet-stream'))) {
          const blob = await res.blob();
          if (blob.size > 0) {
            return buildUpscaleResult(blob, contentType || 'image/png', metadata, validScale, validModel);
          }
        }
      } catch {
        // ignore fallback errors
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
  onProgress?: (info: UpscaleProgressInfo) => void
): Promise<UpscaleResult> {
  const rootBase = submissionEndpoint.startsWith('/')
    ? ''
    : submissionEndpoint.replace(/\/api\/(jobs\/enhance|enhance)\/?.*$/, '');
  const statusEndpoint = rootBase ? `${rootBase}/api/jobs/${jobId}` : `/api/jobs/${jobId}`;
  const resultEndpoint = rootBase ? `${rootBase}/api/jobs/${jobId}/result` : `/api/jobs/${jobId}/result`;

  onProgress?.({
    stage: 'queued',
    elapsedSeconds: 0,
    message: 'Inference job queued in Real-ESRGAN backend...',
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

    if (statusData.status === 'failed') {
      throw new Error(`Real-ESRGAN inference failed: ${statusData.error || 'Unknown engine error'}`);
    }

    if (statusData.status === 'cancelled') {
      throw new Error('Enhancement job was cancelled.');
    }

    if (statusData.status === 'completed') {
      onProgress?.({
        stage: 'downloading',
        elapsedSeconds: elapsedSec,
        message: 'Inference complete! Downloading enhanced PNG...',
        isEstimate: false,
      });
      break;
    }

    onProgress?.({
      stage: statusData.status === 'processing' ? 'processing' : 'queued',
      elapsedSeconds: statusData.elapsed_seconds ?? elapsedSec,
      message:
        statusData.progress_label ||
        (statusData.status === 'processing'
          ? `Real-ESRGAN inference active (${elapsedSec}s elapsed)...`
          : `Job queued in backend (${elapsedSec}s)...`),
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
    elapsedSeconds: Math.round((Date.now() - startTime) / 1000),
    message: 'Processing complete! Preparing image preview...',
    isEstimate: false,
  });

  return buildUpscaleResult(blob, resultContentType || 'image/png', metadata, validScale, validModel);
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
  model: string
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
  };
}
