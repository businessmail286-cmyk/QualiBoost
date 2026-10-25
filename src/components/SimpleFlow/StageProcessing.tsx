import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { ImageMetadata } from '../../types';

interface StageProcessingProps {
  metadata: ImageMetadata;
  onCancel?: () => void;
}

const STATUS_MESSAGES = [
  'Preparing your image...',
  'Enhancing image details...',
  'Improving image clarity...',
  'Finalizing your result...',
];

export const StageProcessing: React.FC<StageProcessingProps> = ({
  metadata,
  onCancel,
}) => {
  const [messageIndex, setMessageIndex] = useState(0);

  // Transition through the honest status messages while waiting for backend
  useEffect(() => {
    const intervals = [1600, 2400, 2800]; // milliseconds for each phase
    let currentIdx = 0;

    const timer = setInterval(() => {
      if (currentIdx < STATUS_MESSAGES.length - 1) {
        currentIdx += 1;
        setMessageIndex(currentIdx);
      }
    }, intervals[currentIdx] || 2500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Title & Phase message */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Enhancing Image Quality...
        </h2>
        <p className="text-sm font-medium text-[#A3A3A3] transition-all duration-300">
          {STATUS_MESSAGES[messageIndex]}
        </p>
      </div>

      {/* Main Preview Container with the Scanning Photograph */}
      <div className="bg-[#111111] border border-[#383838] rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* Top Processing Bar */}
        <div className="bg-[#191919] border-b border-[#292929] px-5 py-3 flex items-center justify-between text-xs text-[#A3A3A3]">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            <span className="font-mono text-[11px] text-white">
              Processing Request in Progress
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[#777777] font-mono hidden sm:inline">
              Target: {metadata.width * 2} × {metadata.height * 2} px
            </span>
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
          </div>

        </div>

        {/* Bottom Status strip */}
        <div className="bg-[#141414] border-t border-[#292929] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#777777]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#777777]" />
            <span>Server-side restoration pipeline active</span>
          </div>

          <div className="text-[11px] font-mono text-[#A3A3A3]">
            {STATUS_MESSAGES[messageIndex]}
          </div>
        </div>

      </div>

    </div>
  );
};
