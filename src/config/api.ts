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

export const API_CONFIG = {
  // Configured via VITE_QUALIBOOST_API_URL in .env or environment.
  // Defaults to empty string in production (using relative /api and /health through proxy)
  // or explicit URL if configured.
  getBaseUrl(): string {
    const envUrl = (import.meta.env.VITE_QUALIBOOST_API_URL as string | undefined)?.trim();
    if (envUrl) {
      // Strip trailing slash if present
      return envUrl.replace(/\/+$/, '');
    }
    // If not set, use relative path (handled by Vite proxy in dev or reverse proxy in prod)
    return '';
  },

  getHealthUrl(): string {
    const base = this.getBaseUrl();
    return base ? `${base}/health` : '/health';
  },

  getEnhanceUrl(): string {
    const base = this.getBaseUrl();
    return base ? `${base}/api/enhance` : '/api/enhance';
  },
};

/**
 * Performs a real health-check request to the Real-ESRGAN backend.
 * Conforms to contract: GET /health -> {"status": "ok"}
 */
export async function checkBackendHealth(timeoutMs = 4000): Promise<BackendHealthStatus> {
  const url = API_CONFIG.getHealthUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        connected: false,
        endpointUrl: url,
        statusText: `HTTP ${response.status}`,
        errorMessage: `Health check responded with status ${response.status} (${response.statusText})`,
        checkedAt: new Date(),
      };
    }

    const data = await response.json().catch(() => null);
    if (data && (data.status === 'ok' || data.status === 'healthy' || data.status === 'running')) {
      return {
        connected: true,
        statusText: data.status,
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
    let errMsg = 'Connection failed';
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        errMsg = `Request timed out after ${timeoutMs}ms`;
      } else {
        errMsg = err.message || 'Network unreachable';
      }
    }
    return {
      connected: false,
      endpointUrl: url,
      statusText: 'Unreachable',
      errorMessage: errMsg,
      checkedAt: new Date(),
    };
  }
}
