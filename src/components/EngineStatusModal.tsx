import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, Server, Terminal } from 'lucide-react';
import { checkBackendHealth, BackendHealthStatus, API_CONFIG } from '../config/api';

interface EngineStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EngineStatusModal: React.FC<EngineStatusModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [health, setHealth] = useState<BackendHealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const runHealthCheck = async () => {
    setIsChecking(true);
    try {
      const res = await checkBackendHealth();
      setHealth(res);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runHealthCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const baseUrl = API_CONFIG.getBaseUrl() || '(Using Vite local proxy)';
  const enhanceUrl = API_CONFIG.getEnhanceUrl();
  const healthUrl = API_CONFIG.getHealthUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-[#141414] border border-[#383838] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="engine-modal-title"
      >
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-[#191919] border-b border-[#292929] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-[#222222] border border-[#383838] flex items-center justify-center">
              <Server className="w-3.5 h-3.5 text-white" />
            </div>
            <span id="engine-modal-title" className="text-sm font-semibold text-white tracking-tight">
              Real-ESRGAN Backend Diagnostics
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* Live Status Card */}
          <div className="bg-[#111111] border border-[#292929] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#777777]">
                Live Health Check
              </span>
              <button
                onClick={runHealthCheck}
                disabled={isChecking}
                className="text-xs text-[#A3A3A3] hover:text-white flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Re-test</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex items-center justify-center">
                {health?.connected ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#555555]" />
                )}
              </div>
              <div className="text-xs">
                <span className="font-semibold text-white">
                  {health?.connected ? 'Real-ESRGAN Engine Connected' : 'Engine Not Reachable'}
                </span>
                <p className="text-[11px] text-[#777777] font-mono mt-0.5">
                  {health?.statusText ? `Status: ${health.statusText}` : 'Testing connection...'}
                </p>
              </div>
            </div>

            {health?.errorMessage && (
              <p className="text-[11px] text-[#A3A3A3] bg-[#191919] p-2.5 rounded border border-[#2e2e2e]">
                {health.errorMessage}
              </p>
            )}
          </div>

          {/* Endpoints Matrix */}
          <div className="space-y-2 text-xs">
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#777777] block">
              Configured Endpoints
            </span>

            <div className="bg-[#111111] border border-[#292929] rounded-xl p-3 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-[#A3A3A3]">
                <span className="text-[#777777]">Base URL:</span>
                <span className="text-white">{baseUrl}</span>
              </div>
              <div className="flex items-center justify-between text-[#A3A3A3]">
                <span className="text-[#777777]">Health Endpoint:</span>
                <span>{healthUrl}</span>
              </div>
              <div className="flex items-center justify-between text-[#A3A3A3]">
                <span className="text-[#777777]">Inference Endpoint:</span>
                <span>{enhanceUrl}</span>
              </div>
              <div className="flex items-center justify-between text-[#A3A3A3]">
                <span className="text-[#777777]">Supported Scales:</span>
                <span className="text-white">2× and 4×</span>
              </div>
            </div>
          </div>

          {/* Setup Guide */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-white font-medium">
              <Terminal className="w-3.5 h-3.5 text-[#A3A3A3]" />
              <span>Starting the FastAPI Backend</span>
            </div>
            <div className="bg-[#0a0a0a] border border-[#222222] rounded-lg p-3 font-mono text-[11px] text-[#A3A3A3] space-y-1">
              <p className="text-[#777777]"># Run in backend directory:</p>
              <p className="text-white">pip install -r requirements.txt</p>
              <p className="text-white">uvicorn main:app --host 0.0.0.0 --port 8000</p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#191919] border-t border-[#292929] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[#080808] bg-[#F2F2F2] rounded hover:bg-white active:bg-[#e0e0e0] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
