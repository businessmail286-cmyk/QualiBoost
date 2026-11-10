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

export const DEFAULT_PRODUCTION_API_URL = 'https://loving-pointer-worlds-elections.trycloudflare.com';

/**
 * Normalizes and sanitizes a backend base URL:
 * - Trims whitespace and trailing slashes
 * - Strips accidental /docs, /health, /redoc, /openapi.json paths
 * - Strips duplicate /api suffix from base URL
 */
export function sanitizeBaseUrl(raw?: string | null): string {
  if (!raw || !raw.trim()) return DEFAULT_PRODUCTION_API_URL;
  let url = raw.trim().replace(/\/+$/, '');
  // Remove /docs, /health, /redoc, /openapi.json if accidentally included
  url = url.replace(/\/(docs|health|redoc|openapi\.json)$/i, '');
  // Remove accidental trailing endpoints like /api/jobs/enhance, /api/enhance, or /api/jobs
  url = url.replace(/\/api\/jobs\/enhance$/i, '');
  url = url.replace(/\/api\/enhance$/i, '');
  url = url.replace(/\/api\/jobs$/i, '');
  // Remove trailing duplicate /api so appending /api/jobs/enhance doesn't produce /api/api/...
  url = url.replace(/\/api$/i, '');
  return url.replace(/\/+$/, '') || DEFAULT_PRODUCTION_API_URL;
}

/**
 * Formats error details from FastAPI/HTTP responses into human-readable strings,
 * preventing '[object Object]' or unhelpful validation error dumps.
 */
export function formatErrorDetail(detail: unknown): string {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const loc = Array.isArray((item as any).loc)
            ? (item as any).loc.filter((p: any) => p !== 'body').join('.')
            : (item as any).loc
            ? String((item as any).loc)
            : '';
          const msg = (item as any).msg || (item as any).message || JSON.stringify(item);
          return loc ? `${loc}: ${msg}` : msg;
        }
        return String(item);
      })
      .join('; ');
  }
  if (typeof detail === 'object') {
    const obj = detail as Record<string, any>;
    if (obj.message && typeof obj.message === 'string') return obj.message;
    if (obj.error && typeof obj.error === 'string') return obj.error;
    if (obj.detail) return formatErrorDetail(obj.detail);
    try {
      return JSON.stringify(detail);
    } catch {
      return String(detail);
    }
  }
  return String(detail);
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
            'none-salary-controllers-precision',
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
    return `${base}/health`;
  },

  getJobsSubmitUrl(overrideBase?: string): string {
    const base = sanitizeBaseUrl(overrideBase !== undefined ? overrideBase : this.getBaseUrl());
    return `${base}/api/jobs/enhance`;
  },

  getJobStatusUrl(jobId: string, overrideBase?: string): string {
    const base = sanitizeBaseUrl(overrideBase !== undefined ? overrideBase : this.getBaseUrl());
    return `${base}/api/jobs/${jobId}`;
  },

  getJobResultUrl(jobId: string, overrideBase?: string): string {
    const base = sanitizeBaseUrl(overrideBase !== undefined ? overrideBase : this.getBaseUrl());
    return `${base}/api/jobs/${jobId}/result`;
  },
};

/**
 * Performs an authentic health-check request to the Real-ESRGAN backend.
 * Conforms to contract: GET /health -> {"status": "ok"}
 * Uses direct backend base URL consistently in both Preview and Vercel production.
 */
export async function checkBackendHealth(
  overrideUrl?: string,
  timeoutMs = 12000
): Promise<BackendHealthStatus> {
  const targetUrl = overrideUrl ? API_CONFIG.getHealthUrl(overrideUrl) : API_CONFIG.getHealthUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Verify Content-Type is JSON (not HTML fallback or CDN error page)
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      const textPreview = await response.text().catch(() => '');
      const sanitized = textPreview.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

      let errMsg = '';
      let statusText = `HTTP ${response.status}`;

      if (response.status === 502 || response.status === 503 || response.status === 504) {
        errMsg = `HTTP ${response.status}: Backend tunnel is unreachable or disconnected. Google Colab session may need to be restarted.`;
        statusText = `Tunnel offline (HTTP ${response.status})`;
      } else if (response.status === 404) {
        errMsg = `HTTP 404: Health endpoint not found at ${targetUrl}. Server returned non-JSON page: ${sanitized || 'Not Found'}`;
        statusText = 'HTTP 404';
      } else {
        errMsg = `HTTP ${response.status}: Endpoint returned non-JSON format (${contentType || 'HTML'}): ${sanitized || response.statusText || 'Unexpected format'}`;
      }

      return {
        connected: false,
        endpointUrl: targetUrl,
        statusText,
        errorMessage: errMsg,
        checkedAt: new Date(),
      };
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const rawDetail = errJson?.detail || errJson?.error || errJson?.message;
      const detailMsg = formatErrorDetail(rawDetail) || response.statusText;

      let errMsg = '';
      let statusText = `HTTP ${response.status}`;

      if (response.status === 401) {
        errMsg =
          'HTTP 401 Unauthorized: Target reached an internal daemon requiring authorization. Real-ESRGAN requires no authorization. Please verify API Base URL in Settings.';
        statusText = 'Auth conflict (HTTP 401)';
      } else if (response.status === 503 || response.status === 502) {
        errMsg = `HTTP ${response.status}: ${detailMsg || 'Backend service unavailable. The Cloudflare tunnel may be offline.'}`;
        statusText = `Offline (HTTP ${response.status})`;
      } else {
        errMsg = `HTTP ${response.status}: Health check failed (${detailMsg || response.statusText})`;
      }

      return {
        connected: false,
        endpointUrl: targetUrl,
        statusText,
        errorMessage: errMsg,
        checkedAt: new Date(),
      };
    }

    const data = await response.json().catch(() => null);

    // Verify authentic Real-ESRGAN backend contract.
    // Do NOT accept {"status": "healthy"} from internal container control-plane-api.
    if (data && data.status === 'healthy' && !data.engine_source_found && !data.async_jobs_supported) {
      return {
        connected: false,
        endpointUrl: targetUrl,
        statusText: 'Wrong Target',
        errorMessage:
          'Connected to preview container port 8000 instead of Real-ESRGAN backend. Please configure your Cloudflare tunnel URL in Settings.',
        checkedAt: new Date(),
      };
    }

    if (data && data.status === 'ok') {
      const gpuNote = data.gpu ? ` (${data.gpu.replace('NVIDIA ', '')})` : '';
      return {
        connected: true,
        statusText: `Ready${gpuNote}`,
        endpointUrl: targetUrl,
        checkedAt: new Date(),
      };
    }

    return {
      connected: false,
      endpointUrl: targetUrl,
      statusText: 'Invalid response format',
      errorMessage: `Backend returned HTTP 200 but response body did not contain {"status": "ok"}: ${JSON.stringify(data)}`,
      checkedAt: new Date(),
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    let errMsg = 'Network unreachable';
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        errMsg = `Health check timed out after ${timeoutMs}ms`;
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errMsg = `Network or CORS error reaching ${targetUrl}. The backend tunnel at ${targetUrl} may be offline, or cross-origin requests from ${typeof window !== 'undefined' ? window.location.origin : 'this origin'} are disallowed.`;
      } else {
        errMsg = err.message || 'Network unreachable';
      }
    } else {
      errMsg = formatErrorDetail(err) || 'Network unreachable';
    }

    return {
      connected: false,
      endpointUrl: targetUrl,
      statusText: 'Unreachable',
      errorMessage: errMsg,
      checkedAt: new Date(),
    };
  }
}
