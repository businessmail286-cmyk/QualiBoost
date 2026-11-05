import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import dotenv from 'dotenv';
import { defineConfig, Plugin } from 'vite';

function isCloudPreviewEnvironment(): boolean {
  return (
    fs.existsSync('/app/control-plane-api') ||
    Boolean(process.env.AIS_APPLET_ID || process.env.K_SERVICE)
  );
}

function sanitizeTargetUrl(raw: string): string {
  if (!raw) return '';
  let url = raw.trim().replace(/\/+$/, '');
  url = url.replace(/\/(docs|health|redoc|openapi\.json)$/i, '');
  url = url.replace(/\/api$/i, '');
  return url.replace(/\/+$/, '');
}

function getTargetUrl(): string {
  if (fs.existsSync('.env')) {
    try {
      const parsed = dotenv.parse(fs.readFileSync('.env'));
      const val = parsed.VITE_API_BASE_URL?.trim() || parsed.VITE_QUALIBOOST_API_URL?.trim();
      if (val) {
        return sanitizeTargetUrl(val);
      }
    } catch {
      // ignore
    }
  }
  if (process.env.VITE_API_BASE_URL?.trim()) {
    return sanitizeTargetUrl(process.env.VITE_API_BASE_URL.trim());
  }
  if (process.env.VITE_QUALIBOOST_API_URL?.trim()) {
    return sanitizeTargetUrl(process.env.VITE_QUALIBOOST_API_URL.trim());
  }
  return 'https://gravity-kid-starts-queen.trycloudflare.com';
}

function qualiboostProxyPlugin(): Plugin {
  return {
    name: 'qualiboost-proxy-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url?.split('?')[0];

        // Only handle backend routes: /health and /api/*
        if (urlPath === '/health' || urlPath?.startsWith('/api/')) {
          // Allow frontend to pass runtime URL override via custom header
          const customTarget = req.headers['x-backend-target-url'] as string | undefined;
          const rawTarget = sanitizeTargetUrl((customTarget && customTarget.trim()) || getTargetUrl());

          if (!rawTarget) {
            res.writeHead(500, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(
              JSON.stringify({
                status: 'offline',
                error: 'Backend endpoint is not configured.',
              })
            );
            return;
          }

          let parsedTarget: URL;
          try {
            parsedTarget = new URL(rawTarget);
          } catch {
            res.writeHead(500, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(
              JSON.stringify({
                status: 'offline',
                error: `Invalid backend target URL: ${rawTarget}`,
              })
            );
            return;
          }

          // GUARD: In cloud preview containers, localhost (127.0.0.1 / localhost) is the cloud container,
          // NOT the user's personal Windows PC. Port 8000 in this container is occupied by /app/control-plane-api.
          // Never forward localhost requests to port 8000 inside the cloud preview container!
          const isLocalhostTarget =
            parsedTarget.hostname === '127.0.0.1' ||
            parsedTarget.hostname === 'localhost' ||
            parsedTarget.hostname === '0.0.0.0';

          if (isCloudPreviewEnvironment() && isLocalhostTarget) {
            const isHealthCheck = urlPath === '/health';
            res.writeHead(503, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
              'Access-Control-Allow-Headers': '*',
            });
            res.end(
              JSON.stringify({
                status: 'offline',
                error: isHealthCheck
                  ? 'Real-ESRGAN backend target is currently set to localhost (127.0.0.1:8000). The cloud preview server cannot reach localhost on your personal PC directly. Please expose your backend via Cloudflare tunnel (cloudflared tunnel --url http://127.0.0.1:8000) and enter the trycloudflare.com URL in Settings.'
                  : 'Cannot reach localhost (127.0.0.1:8000) from the cloud preview environment. Real-ESRGAN runs on your personal PC. Please open Backend Settings and enter your active Cloudflare tunnel URL (https://<name>.trycloudflare.com).',
                code: 'LOCALHOST_IN_CLOUD_PREVIEW',
                target: rawTarget,
              })
            );
            return;
          }

          // Handle CORS preflight options request
          if (req.method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
              'Access-Control-Allow-Headers': '*',
            });
            res.end();
            return;
          }

          const isHttps = parsedTarget.protocol === 'https:';
          const transport = isHttps ? https : http;

          // Build outgoing headers, setting origin to http://localhost:3000 to satisfy FastAPI CORS
          const outgoingHeaders: Record<string, string | string[] | undefined> = {
            ...req.headers,
            host: parsedTarget.host,
            origin: 'http://localhost:3000',
          };
          delete outgoingHeaders['x-backend-target-url'];

          const targetPort = parsedTarget.port
            ? parseInt(parsedTarget.port, 10)
            : isHttps
            ? 443
            : 80;

          const basePath = parsedTarget.pathname.replace(/\/+$/, '');
          let requestPath = `${basePath}${req.url || ''}` || '/';
          // Ensure duplicate /api/api/ is normalized
          requestPath = requestPath.replace(/^\/api\/api\//, '/api/');

          const proxyReq = transport.request(
            {
              protocol: parsedTarget.protocol,
              hostname: parsedTarget.hostname,
              port: targetPort,
              method: req.method,
              path: requestPath,
              headers: outgoingHeaders,
              timeout: 300000, // 5 minutes for large model inference
            },
            (proxyRes) => {
              const resHeaders = { ...proxyRes.headers };
              // Ensure cross-origin permissions in iframe
              resHeaders['access-control-allow-origin'] = '*';
              resHeaders['access-control-allow-methods'] = 'GET, POST, OPTIONS, PUT, DELETE';
              resHeaders['access-control-allow-headers'] = '*';

              res.writeHead(proxyRes.statusCode || 200, resHeaders);
              proxyRes.pipe(res);
            }
          );

          proxyReq.on('error', (err: any) => {
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(
                JSON.stringify({
                  status: 'offline',
                  error: 'Real-ESRGAN backend is unreachable or tunnel has expired.',
                  code: err.code || 'PROXY_ERROR',
                  detail: err.message,
                })
              );
            }
          });

          proxyReq.on('timeout', () => {
            proxyReq.destroy();
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(
                JSON.stringify({
                  status: 'offline',
                  error: 'Backend request timed out during inference.',
                })
              );
            }
          });

          req.on('error', () => {
            proxyReq.destroy();
          });

          req.pipe(proxyReq);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  const activeTargetUrl = getTargetUrl();

  return {
    plugins: [react(), tailwindcss(), qualiboostProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(activeTargetUrl),
      'import.meta.env.VITE_QUALIBOOST_API_URL': JSON.stringify(activeTargetUrl),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Custom Connect middleware handles /health and /api cleanly without http-proxy stderr errors
    },
  };
});
