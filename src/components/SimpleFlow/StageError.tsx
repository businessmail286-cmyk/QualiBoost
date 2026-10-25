import React from 'react';
import { AlertCircle, RotateCcw, RefreshCw, Server } from 'lucide-react';
import { ImageMetadata } from '../../types';
import { API_CONFIG } from '../../config/api';

interface StageErrorProps {
  metadata: ImageMetadata;
  errorMessage: string;
  onRetry: () => void;
  onReplaceClick: () => void;
}

export const StageError: React.FC<StageErrorProps> = ({
  metadata,
  errorMessage,
  onRetry,
  onReplaceClick,
}) => {
  const isBackendMissing =
    errorMessage.includes('not reached') ||
    errorMessage.includes('404') ||
    errorMessage.includes('unreachable') ||
    errorMessage.includes('Connection failed') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503');

  const enhanceEndpoint = API_CONFIG.getEnhanceUrl();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Error Banner */}
      <div className="bg-[#191919] border border-[#383838] rounded-2xl p-6 sm:p-8 space-y-5">
        
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#222222] border border-[#383838] flex items-center justify-center shrink-0">
            {isBackendMissing ? (
              <Server className="w-5 h-5 text-white" />
            ) : (
              <AlertCircle className="w-5 h-5 text-white" />
            )}
          </div>

          <div className="space-y-1 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {isBackendMissing
                ? 'Real-ESRGAN Backend Not Reachable'
                : 'Enhancement Request Failed'}
            </h2>
            <p className="text-sm text-[#A3A3A3] leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>

        {/* Technical Integration Status Callout */}
        {isBackendMissing && (
          <div className="bg-[#111111] border border-[#292929] rounded-xl p-4 text-xs font-mono space-y-2 text-[#A3A3A3]">
            <div className="flex items-center justify-between text-[#777777]">
              <span>Real-ESRGAN Contract</span>
              <span>Endpoint: {enhanceEndpoint}</span>
            </div>
            <p className="text-[#A3A3A3] font-sans leading-normal">
              QualiBoost’s client-side interface and image upload staging are active. To complete genuine super-resolution inference, run the FastAPI backend (<code className="text-white bg-[#191919] px-1.5 py-0.5 rounded">uvicorn main:app --port 8000</code>) and verify that <code className="text-white bg-[#191919] px-1.5 py-0.5 rounded">GET /health</code> returns <code className="text-white bg-[#191919] px-1.5 py-0.5 rounded">&#123;"status": "ok"&#125;</code>.
            </p>
          </div>
        )}

        {/* Preserved Upload Preview */}
        <div className="pt-2">
          <div className="text-xs text-[#777777] mb-2 font-mono flex items-center justify-between">
            <span>Preserved Uploaded Image ({metadata.name})</span>
            <span>{metadata.width} × {metadata.height} px</span>
          </div>

          <div className="flex items-center gap-4 bg-[#111111] border border-[#292929] p-3 rounded-xl">
            <div className="w-16 h-16 rounded overflow-hidden shrink-0 bg-[#080808] border border-[#383838]">
              <img
                src={metadata.url}
                alt={metadata.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <p className="text-white font-medium truncate">{metadata.name}</p>
              <p className="text-[#777777] mt-0.5 font-mono">
                Preserved in browser buffer · Retry without re-uploading
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-[#292929] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onReplaceClick}
            className="px-4 py-2.5 text-xs font-medium text-[#A3A3A3] hover:text-white bg-[#141414] border border-[#383838] rounded-lg hover:border-[#777777] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#777777]" />
            <span>Choose Different Image</span>
          </button>

          <button
            onClick={onRetry}
            className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#080808] bg-[#F2F2F2] rounded-lg hover:bg-white active:bg-[#e0e0e0] transition-colors flex items-center gap-2 cursor-pointer shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Request</span>
          </button>
        </div>

      </div>

    </div>
  );
};
