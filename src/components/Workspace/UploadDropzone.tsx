import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { PresetImage } from '../../types';
import { DEMO_PRESETS } from '../../data/presets';

interface UploadDropzoneProps {
  onImageSelected: (file: File) => void;
  onPresetSelected: (preset: PresetImage) => void;
  onError: (msg: string) => void;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onImageSelected,
  onPresetSelected,
  onError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (file: File) => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      onError(`Unsupported format (${file.type || 'unknown'}). Please upload a JPG, PNG, or WebP file.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      onError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 25 MB.`);
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
      e.target.value = ''; // Reset so the same file can be re-selected if desired
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full rounded-xl border-2 border-dashed transition-all duration-150 cursor-pointer p-8 sm:p-12 text-center flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-white bg-[#222222]'
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
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Upload image file"
        />

        <div className="w-16 h-16 rounded-full bg-[#191919] border border-[#383838] flex items-center justify-center mb-4 text-[#A3A3A3] group-hover:text-white transition-colors">
          <Upload className="w-7 h-7 text-white" />
        </div>

        <h3 className="text-lg font-semibold text-white tracking-tight mb-1">
          Drag & drop your image here, or browse files
        </h3>
        
        <p className="text-sm text-[#A3A3A3] max-w-md mb-6">
          High-fidelity restoration for photographs, event flyers, church posters, and graphic banners.
        </p>

        <div className="inline-flex items-center gap-3">
          <button
            type="button"
            className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#080808] bg-[#F2F2F2] rounded hover:bg-white active:bg-[#e0e0e0] transition-colors"
          >
            Select Image From Computer
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#777777] font-mono">
          <span>Supported: JPG, PNG, WebP</span>
          <span>·</span>
          <span>Max file size: 25 MB</span>
          <span>·</span>
          <span>All processing preserved locally</span>
        </div>
      </div>

      {/* Preset Samples Strip */}
      <div className="bg-[#191919] border border-[#383838] rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-semibold text-white tracking-tight flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-[#A3A3A3]" />
            Or try with sample studio assets:
          </span>
          <span className="text-[#777777] text-[11px]">Instant load · Ready to inspect</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onPresetSelected(preset)}
              className="group text-left p-2.5 rounded-lg border border-[#292929] bg-[#111111] hover:border-[#777777] hover:bg-[#1c1c1c] transition-all flex items-center gap-3 cursor-pointer"
            >
              <div className="w-14 h-14 rounded overflow-hidden shrink-0 bg-[#222222] border border-[#383838]">
                <img
                  src={preset.originalUrl}
                  alt={preset.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate group-hover:text-white">
                  {preset.title}
                </p>
                <p className="text-[11px] text-[#A3A3A3] truncate">
                  {preset.category}
                </p>
                <p className="text-[10px] font-mono text-[#777777] mt-0.5">
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
