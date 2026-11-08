import React, { useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Globe, ArrowRight } from 'lucide-react';
import { API_CONFIG, checkBackendHealth, BackendHealthStatus, sanitizeBaseUrl } from '../config/api';

interface BackendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newUrl: string) => void;
}

export const BackendSettingsModal: React.FC<BackendSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const currentBase = API_CONFIG.getBaseUrl();
  const [urlInput, setUrlInput] = useState<string>(currentBase);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<BackendHealthStatus | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const sanitized = sanitizeBaseUrl(urlInput.trim());
    try {
      const res = await checkBackendHealth(sanitized, 5000);
      setTestResult(res);
    } catch {
      setTestResult({
        connected: false,
        endpointUrl: sanitized || urlInput.trim(),
        statusText: 'Unreachable',
        errorMessage: 'Connection test failed to resolve.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const sanitized = sanitizeBaseUrl(urlInput.trim());
    API_CONFIG.setBaseUrl(sanitized);
    onSaved(sanitized);
    onClose();
  };

  const handleUsePreset = (presetUrl: string) => {
    const sanitized = sanitizeBaseUrl(presetUrl);
    setUrlInput(sanitized);
    setTestResult(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backend-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg bg-[#111111] border border-[#383838] rounded-2xl shadow-2xl overflow-hidden font-sans text-white">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#292929] flex items-center justify-between bg-[#161616]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#222222] border border-[#383838] flex items-center justify-center">
              <Server className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h3 id="backend-settings-title" className="text-sm font-semibold tracking-tight text-white">
                Backend Connection Settings
              </h3>
              <p className="text-[11px] text-[#888888] font-mono">
                Real-ESRGAN Inference Endpoint
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888888] hover:text-white hover:bg-[#222222] rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="backend-url-input" className="block text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
              API Base URL
            </label>
            <div className="relative">
              <input
                id="backend-url-input"
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://none-salary-controllers-precision.trycloudflare.com"
                className="w-full px-3.5 py-2.5 bg-[#0a0a0a] border border-[#383838] rounded-lg text-xs font-mono text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
              />
            </div>
            <p className="text-[11px] text-[#777777] leading-relaxed">
              Active backend runs on Google Colab via Cloudflare tunnel at <code className="text-[#A3A3A3]">https://none-salary-controllers-precision.trycloudflare.com</code>. You can paste a custom endpoint or leave empty to use this default.
            </p>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-[#666666]">Quick Fill:</span>
            <button
              type="button"
              onClick={() => handleUsePreset('https://none-salary-controllers-precision.trycloudflare.com')}
              className="px-2 py-1 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-[#A3A3A3] hover:text-white hover:border-[#555555] transition-colors cursor-pointer font-mono"
            >
              Cloudflare Tunnel (Colab)
            </button>
            <button
              type="button"
              onClick={() => handleUsePreset('')}
              className="px-2 py-1 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-[#A3A3A3] hover:text-white hover:border-[#555555] transition-colors cursor-pointer font-mono"
            >
              Reset to Default
            </button>
            <button
              type="button"
              onClick={() => handleUsePreset('http://127.0.0.1:8000')}
              className="px-2 py-1 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-[#A3A3A3] hover:text-white hover:border-[#555555] transition-colors cursor-pointer font-mono"
            >
              127.0.0.1:8000 (Local)
            </button>
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-3 ${
                testResult.connected
                  ? 'bg-[#141414] border-[#444444] text-white'
                  : 'bg-[#161616] border-[#383838] text-[#A3A3A3]'
              }`}
            >
              {testResult.connected ? (
                <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#888888] shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="font-semibold text-white flex items-center justify-between">
                  <span>{testResult.connected ? 'Engine Online' : 'Engine Offline'}</span>
                  <span className="text-[10px] text-[#777777] font-normal">
                    {testResult.statusText}
                  </span>
                </div>
                <p className="text-[11px] text-[#888888] leading-tight break-all">
                  {testResult.errorMessage || 'Contract verified: GET /health returned {"status":"ok"}'}
                </p>
              </div>
            </div>
          )}

          {/* Notice on CORS */}
          <div className="p-3 bg-[#0a0a0a] border border-[#222222] rounded-lg text-[11px] text-[#777777] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[#A3A3A3]">
              <Globe className="w-3 h-3 text-[#666666]" />
              <span>CORS Note for Direct Browser Connections</span>
            </div>
            <p>
              Ensure <code className="text-white">qualiboost_backend/app.py</code> includes this applet’s preview origin in its CORS allowlist.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#161616] border-t border-[#292929] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-3.5 py-2 text-xs font-medium text-white bg-[#222222] border border-[#383838] rounded-lg hover:bg-[#2a2a2a] hover:border-[#666666] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#A3A3A3] ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[#888888] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#080808] bg-[#F2F2F2] rounded-lg hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Save & Apply</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
