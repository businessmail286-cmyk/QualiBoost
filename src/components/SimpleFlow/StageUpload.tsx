import React, { useState, useRef } from 'react';
import { Upload, ImageIcon } from 'lucide-react';
import { PresetImage } from '../../types';
import { DEMO_PRESETS } from '../../data/presets';

interface StageUploadProps {
  onImageSelected: (file: File) => void;
  onPresetSelected: (preset: PresetImage) => void;
  onError: (msg: string) => void;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const StageUpload: React.FC<StageUploadProps> = ({
  onImageSelected,
  onPresetSelected,
  onError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (file: File) => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      onError(`Unsupported format (${file.type || 'unknown'}). Please upload a JPG, PNG, or WebP image.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      onError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 25 MB limit.`);
      return;
    }
    onImageSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Stage A Clear Heading & Supporting Text */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
          Make Your Image Clearer
        </h1>
        <p className="text-base sm:text-lg text-[#A3A3A3] max-w-xl mx-auto">
          Upload your picture and let QualiBoost improve its quality.
        </p>
      </div>

      {/* Large Attractive Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer p-10 sm:p-16 text-center flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-white bg-[#1c1c1c]'
            : 'border-[#383838] bg-[#111111] hover:border-[#777777] hover:bg-[#161616]'
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              validateAndProcessFile(e.target.files[0]);
              e.target.value = '';
            }
          }}
          className="hidden"
          aria-label="Upload image"
        />

        {/* Simple Upload Icon */}
        <div className="w-16 h-16 rounded-full bg-[#191919] border border-[#383838] flex items-center justify-center mb-5 text-[#A3A3A3]">
          <Upload className="w-7 h-7 text-white" />
        </div>

        {/* Text as strictly specified */}
        <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mb-1">
          Drop your image here
        </h2>
        
        <p className="text-sm text-[#A3A3A3] mb-6">
          or choose a photo from your device
        </p>

        {/* Clear Choose Image Button */}
        <button
          type="button"
          className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#080808] bg-[#F2F2F2] rounded-lg hover:bg-white active:bg-[#e0e0e0] transition-colors cursor-pointer shadow-md"
        >
          Choose Image
        </button>

        {/* Format guidelines */}
        <div className="mt-8 flex items-center justify-center gap-3 text-xs text-[#777777] font-mono">
          <span>JPG, JPEG, PNG, WEBP</span>
          <span>·</span>
          <span>Up to 25 MB</span>
        </div>
      </div>

      {/* Preset Samples Strip for instant testing */}
      <div className="bg-[#141414] border border-[#292929] rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-medium text-white flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-[#A3A3A3]" />
            Or try with a sample photo:
          </span>
          <span className="text-[#777777] text-[11px] font-mono">Click to test instantly</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={(e) => {
                e.stopPropagation();
                onPresetSelected(preset);
              }}
              className="text-left p-2.5 rounded-lg border border-[#292929] bg-[#111111] hover:border-[#777777] hover:bg-[#1c1c1c] transition-all flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-[#222222] border border-[#383838]">
                <img
                  src={preset.originalUrl}
                  alt={preset.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">
                  {preset.title}
                </p>
                <p className="text-[11px] text-[#777777] truncate font-mono">
                  {preset.dimensions}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
