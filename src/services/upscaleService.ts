import { ImageMetadata, UpscaleResult, ScaleValue } from '../types';
import { API_CONFIG } from '../config/api';

/**
 * Initiates the Real-ESRGAN enhancement request conforming to the contract:
 * Endpoint: POST /api/enhance
 * Form Fields:
 *   - 'file': Binary image file (multipart/form-data)
 *   - 'scale': 2, 3, or 4 (numeric integer or string representation)
 *   - 'model': Model identifier (e.g., 'RealESRGAN_x4plus')
 * Response: Enhanced PNG image bytes with image/png or image/* Content-Type header.
 */
export async function requestImageUpscale(
  metadata: ImageMetadata,
  scale: ScaleValue = 4,
  model: string = 'RealESRGAN_x4plus',
  signal?: AbortSignal
): Promise<UpscaleResult> {
  // Validate that image data exists
  if (!metadata.url) {
    throw new Error('No valid image data available to process.');
  }

  // Obtain the actual File / Blob to send as multipart 'file'
  let uploadFile: File | Blob;
  if (metadata.file) {
    uploadFile = metadata.file;
  } else {
    // If user loaded a sample preset or blob url, resolve the real blob
    try {
      const res = await fetch(metadata.url);
      uploadFile = await res.blob();
    } catch {
      throw new Error('Unable to read selected image data for upload.');
    }
  }

  const formData = new FormData();
  // Contract requires file field named 'file'
  formData.append('file', uploadFile, metadata.name || 'image.png');
  // Contract requires scale field named 'scale' with value 2, 3, or 4
  formData.append('scale', scale.toString());
  // Contract requires model field named 'model'
  formData.append('model', model);

  const endpoint = API_CONFIG.getEnhanceUrl();

  try {
    // Note: Do not set Content-Type header manually; browser automatically sets multipart/form-data with boundary
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `The Real-ESRGAN backend was not found at ${endpoint} (HTTP 404). Please verify that your local FastAPI server is running (e.g. at http://127.0.0.1:8000) and that VITE_QUALIBOOST_API_URL is configured.`
        );
      }

      if (response.status === 502 || response.status === 503 || response.status === 504) {
        throw new Error(
          `The Real-ESRGAN backend is currently unreachable (HTTP ${response.status}). Ensure the FastAPI server is running.`
        );
      }

      // Check for backend detail (FastAPI returns JSON on HTTPException or Validation error)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errJson = await response.json().catch(() => null);
        const detail = errJson?.detail;
        if (typeof detail === 'string') {
          throw new Error(`Backend error (${response.status}): ${detail}`);
        } else if (Array.isArray(detail)) {
          const formatted = detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
          throw new Error(`Validation error: ${formatted}`);
        }
      }

      const errText = await response.text().catch(() => '');
      throw new Error(
        `Backend service rejected request with HTTP ${response.status}: ${errText.slice(0, 150) || response.statusText}`
      );
    }

    // Validate Content-Type of the successful response
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      const textPreview = await response.text().catch(() => '');
      throw new Error(
        `Invalid response format: Expected enhanced image bytes, but received "${contentType}". Content: ${textPreview.slice(0, 100)}`
      );
    }

    // Retrieve binary image blob (PNG bytes)
    const imageBlob = await response.blob();
    if (imageBlob.size === 0) {
      throw new Error('Received an empty image response from the enhancement backend.');
    }

    // Create object URL for the real enhanced image
    const enhancedUrl = URL.createObjectURL(imageBlob);

    // Decode actual dimensions from the returned image to guarantee authentic metrics
    const { width: outputWidth, height: outputHeight } = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const testImg = new Image();
        testImg.onload = () => resolve({ width: testImg.naturalWidth, height: testImg.naturalHeight });
        testImg.onerror = () => reject(new Error('Failed to decode returned binary image. Output file may be corrupted.'));
        testImg.src = enhancedUrl;
      }
    );

    const safeBaseName = metadata.name.replace(/\.[^/.]+$/, '');
    const extension = contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'png';

    return {
      enhancedUrl,
      blob: imageBlob,
      outputWidth,
      outputHeight,
      format: contentType,
      sizeBytes: imageBlob.size,
      filename: `${safeBaseName}-upscaled-${scale}x.${extension}`,
      scale,
      model,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('Enhancement request was cancelled.');
      }
      throw err;
    }
    throw new Error('An unexpected connection error occurred while contacting the Real-ESRGAN backend.');
  }
}
