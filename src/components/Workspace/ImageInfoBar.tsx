import React from 'react';
import { Trash2, RefreshCw, FileText, Maximize2, HardDrive, FileType } from 'lucide-react';
import { ImageMetadata } from '../../types';

interface ImageInfoBarProps {
  metadata: ImageMetadata;
  onRemove: () => void;
  onReplaceClick: () => void;
}

export const ImageInfoBar: React.FC<ImageInfoBarProps> = ({
  metadata,
  onRemove,
  onReplaceClick,
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getFormatLabel = (mimeOrName: string) => {
    if (mimeOrName.includes('jpeg') || mimeOrName.includes('jpg')) return 'JPEG';
    if (mimeOrName.includes('png')) return 'PNG';
    if (mimeOrName.includes('webp')) return 'WebP';
    const ext = metadata.name.split('.').pop()?.toUpperCase();
    return ext || 'IMAGE';
  };

  return (
    <div className="w-full bg-[#191919] border border-[#383838] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4">
      {/* File Details */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        {/* Name */}
        <div className="flex items-center gap-2 max-w-xs sm:max-w-md truncate">
          <FileText className="w-4 h-4 text-[#A3A3A3] shrink-0" />
          <span className="font-medium text-white truncate" title={metadata.name}>
            {metadata.name}
          </span>
          {metadata.isPreset && (
            <span className="text-[10px] font-mono text-[#A3A3A3] bg-[#292929] px-1.5 py-0.5 rounded">
              Sample Preset
            </span>
          )}
        </div>

        {/* Dimensions */}
        <div className="flex items-center gap-1.5 text-[#A3A3A3] font-mono">
          <Maximize2 className="w-3.5 h-3.5 text-[#777777]" />
          <span>{metadata.width} × {metadata.height} px</span>
        </div>

        {/* Size */}
        <div className="flex items-center gap-1.5 text-[#A3A3A3] font-mono">
          <HardDrive className="w-3.5 h-3.5 text-[#777777]" />
          <span>{formatBytes(metadata.sizeBytes)}</span>
        </div>

        {/* Format */}
        <div className="flex items-center gap-1.5 text-[#A3A3A3] font-mono">
          <FileType className="w-3.5 h-3.5 text-[#777777]" />
          <span>{getFormatLabel(metadata.format)}</span>
        </div>
      </div>

      {/* Action Buttons: Replace & Remove */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onReplaceClick}
          className="px-3 py-1.5 text-xs font-medium text-white bg-[#222222] border border-[#383838] rounded hover:bg-[#292929] hover:border-[#777777] transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Choose a different image"
        >
          <RefreshCw className="w-3 h-3 text-[#A3A3A3]" />
          <span>Replace</span>
        </button>

        <button
          onClick={onRemove}
          className="px-3 py-1.5 text-xs font-medium text-[#A3A3A3] hover:text-white bg-[#222222] border border-[#383838] rounded hover:bg-[#292929] hover:border-[#777777] transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Remove current image"
        >
          <Trash2 className="w-3 h-3 text-[#777777]" />
          <span>Remove</span>
        </button>
      </div>
    </div>
  );
};
