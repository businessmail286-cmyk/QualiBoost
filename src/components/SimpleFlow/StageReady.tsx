import React from 'react';
import { ArrowRight, RefreshCw, Trash2, Maximize2, HardDrive, FileType, Server } from 'lucide-react';
import { ImageMetadata } from '../../types';
import { BackendHealthStatus } from '../../config/api';

interface StageReadyProps {
  metadata: ImageMetadata;
  selectedScale: 2 | 3 | 4;
  onScaleChange: (scale: 2 | 3 | 4) => void;
  onUpscaleClick: () => void;
  onReplaceClick: () => void;
  onRemoveClick: () => void;
  isSubmitting?: boolean;
  healthStatus?: BackendHealthStatus | null;
  selectedModel?: string;
}

export const StageReady: React.FC<StageReadyProps> = ({
  metadata,
  selectedScale,
  onScaleChange,
  onUpscaleClick,
  onReplaceClick,
  onRemoveClick,
  isSubmitting = false,
  healthStatus,
  selectedModel = 'RealESRGAN_x4plus',
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatLabel = metadata.format.includes('png')
    ? 'PNG'
    : metadata.format.includes('webp')
    ? 'WebP'
    : 'JPEG';

  const targetWidth = metadata.width * selectedScale;
  const targetHeight = metadata.height * selectedScale;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Step Heading */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Image Ready for Enhancement
        </h2>
        <p className="text-sm text-[#A3A3A3]">
          Choose your upscale factor and submit to the Real-ESRGAN inference engine.
        </p>
      </div>

      {/* Main Preview Container */}
      <div className="bg-[#111111] border border-[#383838] rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Top Info Bar */}
        <div className="bg-[#191919] border-b border-[#292929] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[#A3A3A3]">
            <span className="font-semibold text-white truncate max-w-xs" title={metadata.name}>
              {metadata.name}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Maximize2 className="w-3.5 h-3.5 text-[#777777]" />
              <span>{metadata.width} × {metadata.height} px</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <HardDrive className="w-3.5 h-3.5 text-[#777777]" />
              <span>{formatBytes(metadata.sizeBytes)}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <FileType className="w-3.5 h-3.5 text-[#777777]" />
              <span>{formatLabel}</span>
            </div>
          </div>

          {/* Remove / Replace Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onReplaceClick}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded bg-[#222222] border border-[#383838] text-white hover:bg-[#292929] hover:border-[#777777] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3 text-[#A3A3A3]" />
              <span>Replace</span>
            </button>
            <button
              onClick={onRemoveClick}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded bg-[#222222] border border-[#383838] text-[#A3A3A3] hover:text-white hover:bg-[#292929] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3 text-[#777777]" />
              <span>Remove</span>
            </button>
          </div>

        </div>

        {/* Large Image Preview */}
        <div className="p-4 sm:p-8 flex items-center justify-center bg-[#0a0a0a] min-h-[360px] max-h-[540px] overflow-hidden">
          <img
            src={metadata.url}
            alt={metadata.name}
            className="max-h-[460px] w-auto h-auto object-contain rounded-lg border border-[#222222] shadow-lg"
          />
        </div>

        {/* Configuration Bar: Scale Selection + Target Readout + Connectivity */}
        <div className="bg-[#141414] border-t border-[#292929] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
          
          {/* Left: Scale Selector & Dimensions */}
          <div className="space-y-2 w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-white">
                Upscale Factor:
              </span>
              <div className="inline-flex rounded-lg bg-[#1f1f1f] p-1 border border-[#383838]">
                {([2, 3, 4] as const).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => onScaleChange(sc)}
                    disabled={isSubmitting}
                    className={`px-3 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      selectedScale === sc
                        ? 'bg-white text-[#080808] shadow-xs'
                        : 'text-[#A3A3A3] hover:text-white'
                    }`}
                  >
                    {sc}×
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-mono text-[#777777]">
                Model: <span className="text-[#A3A3A3]">{selectedModel}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#777777]">
              <span>Target Resolution:</span>
              <span className="font-mono text-white font-medium">
                {targetWidth} × {targetHeight} px
              </span>
              <span>·</span>
              <span className="font-mono text-[11px] text-[#A3A3A3]">
                {selectedScale}× Enhanced Detail
              </span>
            </div>

            {/* Backend connectivity status hint */}
            {healthStatus && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <Server className="w-3 h-3 text-[#777777]" />
                <span className="text-[#777777]">Engine:</span>
                <span className={healthStatus.connected ? 'text-white' : 'text-[#888888]'}>
                  {healthStatus.connected ? 'Connected (Ready)' : 'Offline / Awaiting Start'}
                </span>
              </div>
            )}
          </div>

          {/* Right: The Primary Upscale Image Button */}
          <button
            onClick={onUpscaleClick}
            disabled={isSubmitting}
            className={`w-full sm:w-auto px-8 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#080808] bg-[#F2F2F2] rounded-lg hover:bg-white active:bg-[#e0e0e0] transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shrink-0 ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span>Upscale Image</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
