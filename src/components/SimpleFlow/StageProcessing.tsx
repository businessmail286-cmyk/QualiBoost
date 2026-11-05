import React, { useState, useEffect } from 'react';
import { Loader2, X, Clock, ShieldCheck } from 'lucide-react';
import { ImageMetadata } from '../../types';
import { UpscaleProgressInfo } from '../../services/upscaleService';

interface StageProcessingProps {
  metadata: ImageMetadata;
  onCancel?: () => void;
  progressInfo?: UpscaleProgressInfo | null;
}

const DEFAULT_MESSAGES = [
  'Submitting image to Real-ESRGAN backend...',
  'Analyzing structural edges and visual textures...',
  'Reconstructing high-frequency details with neural weights...',
  'Restoring clarity and removing compression artifacts...',
  'Finalizing enhanced PNG output bytes...',
];

export const StageProcessing: React.FC<StageProcessingProps> = ({
  metadata,
  onCancel,
  progressInfo,
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [internalElapsed, setInternalElapsed] = useState(0);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setInternalElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Transition through status messages
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev < DEFAULT_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const elapsed = progressInfo?.elapsedSeconds !== undefined ? progressInfo.elapsedSeconds : internalElapsed;
  const activeMessage = progressInfo?.message || DEFAULT_MESSAGES[messageIndex];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Title & Phase message */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Enhancing Image Quality...
        </h2>
        <p className="text-sm font-medium text-[#A3A3A3] transition-all duration-300">
          {activeMessage}
        </p>
      </div>

      {/* Main Preview Container with the Scanning Photograph */}
      <div className="bg-[#111111] border border-[#383838] rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* Top Processing Bar */}
        <div className="bg-[#191919] border-b border-[#292929] px-5 py-3 flex items-center justify-between text-xs text-[#A3A3A3]">
          <div className="flex items-center gap-3">
            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            <span className="font-mono text-[11px] text-white">
              {progressInfo?.stage === 'queued'
                ? 'Job Queued in Backend'
                : progressInfo?.stage === 'downloading'
                ? 'Downloading Enhanced PNG'
                : 'Real-ESRGAN Processing in Progress'}
            </span>
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#242424] text-[10px] font-mono text-[#A3A3A3]">
              <Clock className="w-3 h-3 text-[#A3A3A3]" />
              <span>{elapsed}s elapsed</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-[#777777] font-mono">
              <ShieldCheck className="w-3 h-3 text-emerald-500/80" />
              <span>Real-ESRGAN Engine Connected</span>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-2.5 py-1 text-[11px] font-mono text-[#A3A3A3] hover:text-white bg-[#222222] border border-[#383838] rounded hover:border-[#777777] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* The Photograph Frame with Real Scanline Beam */}
        <div className="relative p-4 sm:p-8 flex items-center justify-center bg-[#080808] min-h-[380px] max-h-[580px] overflow-hidden select-none">
          
          <div className="relative inline-block max-h-[500px]">
            {/* The Actual Uploaded Photograph */}
            <img
              src={metadata.url}
              alt="Processing upload"
              className="max-h-[500px] w-auto h-auto object-contain rounded-lg border border-[#2a2a2a] shadow-2xl block"
            />

            {/* Restrained Optical Laser Scanline moving vertically top to bottom */}
            <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
              <div className="scanline-beam">
                <div className="scanline-glow" />
              </div>
            </div>

            {/* Subtle live scanning badge */}
            <div className="absolute top-3 left-3 bg-[#080808]/85 backdrop-blur-xs border border-[#383838] px-2.5 py-1 rounded text-[10px] font-mono text-white flex items-center gap-1.5 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Scanning Structure & Edges</span>
            </div>

            {/* Elapsed Timer Overlay */}
            <div className="absolute bottom-3 right-3 bg-[#080808]/85 backdrop-blur-xs border border-[#383838] px-2.5 py-1 rounded text-[10px] font-mono text-[#A3A3A3] flex items-center gap-1.5 pointer-events-none">
              <Clock className="w-3 h-3 text-white" />
              <span>{elapsed}s</span>
            </div>
          </div>

        </div>

        {/* Bottom Status strip */}
        <div className="bg-[#141414] border-t border-[#292929] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#777777]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Server-side restoration pipeline active</span>
          </div>

          <div className="text-[11px] font-mono text-[#A3A3A3]">
            {activeMessage}
          </div>
        </div>

      </div>

    </div>
  );
};
