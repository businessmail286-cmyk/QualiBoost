/**
 * Central API configuration for QualiBoost backend integration.
 * Connects to the Real-ESRGAN FastAPI backend.
 */

export interface BackendHealthStatus {
  connected: boolean;
  statusText?: string;
  endpointUrl: string;
  errorMessage?: string;
  checkedAt?: Date;
}

export const DEFAULT_PRODUCTION_API_URL = 'https://none-salary-controllers-precision.trycloudflare.com';

/**
 * Normalizes and sanitizes a backend base URL:
 * - Trims whitespace and trailing slashes
 * - Strips accidental /docs, /health, /redoc, /openapi.json paths
 * - Strips duplicate /api suffix from base URL
 */
export function sanitizeBaseUrl(raw?: string | null): string {
  if (!raw) return '';
  let url = raw.trim().replace(/\/+$/, '');
  // Remove /docs, /health, /redoc, /openapi.json if accidentally included
  url = url.replace(/\/(docs|health|redoc|openapi\.json)$/i, '');
  // Remove accidental trailing endpoints like /api/jobs/enhance, /api/enhance, or /api/jobs
  url = url.replace(/\/api\/jobs\/enhance$/i, '');
  url = url.replace(/\/api\/enhance$/i, '');
  url = url.replace(/\/api\/jobs$/i, '');
  // Remove trailing duplicate /api so appending /api/jobs/enhance doesn't produce /api/api/...
  url = url.replace(/\/api$/i, '');
  return url.replace(/\/+$/, '');
}

/**
 * Safely parses a response expected to be JSON.
 * Inspects response status and Content-Type header before attempting to parse.
 * If the response is HTML, text, or another unexpected format, returns a descriptive error
 * rather than throwing a SyntaxError ("Unexpected token '<'... is not valid JSON").
 */
export async function parseJsonResponse<T = any>(
  response: Response,
  contextDescription: string = 'API response'
): Promise<{ ok: true; data: T } | { ok: false; error: string; statusCode: number; isHtml: boolean }> {
  const statusCode = response.status;
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (!isJson) {
    const rawText = await response.text().catch(() => '');
    const isHtml =
      contentType.toLowerCase().includes('text/html') ||
      rawText.trim().toLowerCase().startsWith('<!doctype') ||
      rawText.trim().toLowerCase().startsWith('<html');

    let excerpt = '';
    if (isHtml) {
      const titleMatch = rawText.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';
      const stripped = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
      excerpt = title ? `"${title}" (${stripped})` : stripped;
    } else {
      excerpt = rawText.trim().slice(0, 160);
    }

    let helpfulMessage = '';
    if (statusCode === 404) {
      helpfulMessage = `Endpoint not found (HTTP 404). Server returned HTML page: ${excerpt || 'Not Found'}`;
    } else if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
      helpfulMessage = `Backend service is temporarily unreachable (HTTP ${statusCode}). The temporary Cloudflare tunnel or Google Colab notebook may be reconnecting or restarting.`;
    } else if (statusCode === 200 && isHtml) {
      helpfulMessage = `Received HTML webpage instead of JSON API response (HTTP 200). Ensure the backend base URL points to the API root and does not end in /docs, /health, or a frontend page. Preview: ${excerpt || 'HTML page'}`;
    } else {
      helpfulMessage = `Expected JSON response for ${contextDescription} but received ${contentType || 'non-JSON'} (HTTP ${statusCode}): ${excerpt || response.statusText}`;
    }

    return {
      ok: false,
      error: helpfulMessage,
      statusCode,
      isHtml,
    };
  }

  try {
    const data = await response.json();
    return { ok: true, data: data as T };
  } catch (parseErr) {
    const errText = parseErr instanceof Error ? parseErr.message : 'Invalid JSON';
    return {
      ok: false,
      error: `Failed to parse ${contextDescription} as JSON (${errText}).`,
      statusCode,
      isHtml: false,
    };
  }
}

export const API_CONFIG = {
  /**
   * Retrieves the current backend base URL.
   * Priority:
   * 1. User-configured localStorage override (sanitized)
   * 2. VITE_API_BASE_URL from environment / .env (sanitized)
   * 3. VITE_QUALIBOOST_API_URL from environment / .env (sanitized)
   * 4. Current active backend (DEFAULT_PRODUCTION_API_URL)
   */
  getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('qualiboost_api_url');
        if (stored !== null && stored.trim() !== '') {
          const sanitized = sanitizeBaseUrl(stored);
          const staleKeywords = [
            'onrender.com',
            'understood-centers-level-thee',
            'gravity-kid-starts-queen',
            'packages-separately-send-mobiles',
          ];
          if (sanitized && !staleKeywords.some((k) => sanitized.includes(k))) {
            return sanitized;
          }
        }
      } catch {
        // ignore localStorage access errors
      }
    }

    const envUrl = (
      (import.meta.env.VITE_QUALIBOOST_API_URL as string | undefined) ||
      (import.meta.env.VITE_API_BASE_URL as string | undefined)
    )?.trim();
    if (envUrl) {
      const sanitized = sanitizeBaseUrl(envUrl);
      if (sanitized) return sanitized;
    }
    return sanitizeBaseUrl(DEFAULT_PRODUCTION_API_URL);
  },

  setBaseUrl(url: string): void {
    if (typeof window !== 'undefined') {
      try {
        const sanitized = sanitizeBaseUrl(url);
        if (sanitized) {
          localStorage.setItem('qualiboost_api_url', sanitized);
        } else {
          localStorage.removeItem('qualiboost_api_url');
        }
      } catch {
        // ignore
      }
    }
  },

  getHealthUrl(overrideBase?: string): string {
    const base = sanitizeBaseUrl(overrideBase !== undefined ? overrideBase : this.getBaseUrl());
    return base ? `${base}/health` : '/health';
  },

  getJobsSubmitUrl(overrideBase?: string): string {
    const base = sanitizeBaseUrl(overrideBase !== undefined ? overrideBase : this.getBaseUrl());
    return base ? `${base}/api/jobs/enhance` : '/api/jobs/enhance';
  },

  getJobStatusUrl(jobId: string, overrideBase?: string): string {
    const base = sanitizeBaseUrl(overrideBase !== undefined ? overrideBase : this.getBaseUrl());
    return base ? `${base}/api/jobs/${jobId}` : `/api/jobs/${jobId}`;
  },

  getJobResultUrl(jobId: string, overrideBase?: string): string {
    const base = sanitizeBaseUrl(overrideBase !== undefined ? overrideBase : this.getBaseUrl());
    return base ? `${base}/api/jobs/${jobId}/result` : `/api/jobs/${jobId}/result`;
  },
};

/**
 * Performs an authentic health-check request to the Real-ESRGAN backend.
 * Conforms to contract: GET /health -> {"status": "ok"}
 */
export async function checkBackendHealth(
  overrideUrl?: string,
  timeoutMs = 12000
): Promise<BackendHealthStatus> {
  const directUrl = overrideUrl ? API_CONFIG.getHealthUrl(overrideUrl) : API_CONFIG.getHealthUrl();
  const urlsToTry: string[] = [];

  // Always try relative same-origin proxy first (/health) to avoid cross-origin CORS blocks
  // in hosted environments (e.g. Google Cloud Run preview). The proxy sets Origin: http://localhost:3000.
  urlsToTry.push('/health');
  if (directUrl && directUrl.startsWith('http') && directUrl !== '/health') {
    urlsToTry.push(directUrl);
  }

  let lastError = 'Connection failed';
  let lastStatusText = 'Unreachable';

  for (const url of urlsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const configuredBase = overrideUrl ? overrideUrl.trim().replace(/\/+$/, '') : API_CONFIG.getBaseUrl();
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      // Only attach routing header to relative proxy endpoint (/health)
      // Never send custom headers to external URLs to avoid triggering CORS preflight rejections
      if (url.startsWith('/') && configuredBase) {
        headers['x-backend-target-url'] = configuredBase;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Verify Content-Type is JSON (not HTML fallback)
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textPreview = await response.text().catch(() => '');
        const sanitized = textPreview.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
        if (response.status === 502 || response.status === 503) {
          lastError = `Backend tunnel returned HTTP ${response.status}. The Cloudflare tunnel or Google Colab session may be disconnected.`;
          lastStatusText = `Tunnel offline (${response.status})`;
          continue;
        }
        lastError = `Endpoint ${url} returned ${response.status} with non-JSON format (${contentType}): ${sanitized || 'HTML page'}`;
        lastStatusText = `Format error (${response.status})`;
        continue;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const detailMsg = errJson?.detail || errJson?.error || response.statusText;

        if (response.status === 401) {
          lastError =
            '401 Unauthorized: Target reached an internal container daemon. Real-ESRGAN requires no authorization. Please verify the API Base URL in Settings.';
          lastStatusText = 'Auth conflict (401)';
          continue;
        } else if (response.status === 503 || response.status === 502) {
          lastError = detailMsg || `Backend service returned HTTP ${response.status} (Service Unavailable).`;
          lastStatusText = `Offline (${response.status})`;
          continue;
        } else {
          lastError = `Health check responded with status ${response.status} (${detailMsg || response.statusText})`;
          lastStatusText = `HTTP ${response.status}`;
        }

        return {
          connected: false,
          endpointUrl: url,
          statusText: lastStatusText,
          errorMessage: lastError,
          checkedAt: new Date(),
        };
      }

      const data = await response.json().catch(() => null);

      // Verify authentic Real-ESRGAN backend contract.
      // Do NOT accept {"status": "healthy"} from internal container control-plane-api.
      if (data && data.status === 'healthy' && !data.engine_source_found && !data.async_jobs_supported) {
        lastError =
          'Connected to preview container port 8000 instead of Real-ESRGAN backend. Please configure your Cloudflare tunnel URL in Settings.';
        lastStatusText = 'Wrong Target';
        continue;
      }

      if (data && data.status === 'ok') {
        const gpuNote = data.gpu ? ` (${data.gpu.replace('NVIDIA ', '')})` : '';
        return {
          connected: true,
          statusText: `Ready${gpuNote}`,
          endpointUrl: url,
          checkedAt: new Date(),
        };
      }

      return {
        connected: false,
        endpointUrl: url,
        statusText: 'Invalid response format',
        errorMessage: 'Backend returned 200 OK but response did not contain {"status": "ok"}.',
        checkedAt: new Date(),
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          lastError = `Request timed out after ${timeoutMs}ms`;
        } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
          lastError = `CORS or network error reaching ${url}. Browser blocked access because the FastAPI backend does not allow origin ${window.location.origin} (CORS disallowed) or the tunnel is down.`;
        } else {
          lastError = err.message || 'Network unreachable';
        }
      }
      continue;
    }
  }

  return {
    connected: false,
    endpointUrl: directUrl,
    statusText: lastStatusText,
    errorMessage: lastError,
    checkedAt: new Date(),
  };
}
