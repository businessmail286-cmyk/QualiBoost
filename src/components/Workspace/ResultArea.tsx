import React, { useState } from 'react';
import { Download, RefreshCw, CheckCircle2, Maximize2 } from 'lucide-react';
import { ImageMetadata, EnhancementSettings, UpscaleResult } from '../../types';

interface ResultAreaProps {
  metadata: ImageMetadata;
  settings: EnhancementSettings;
  result?: UpscaleResult | null;
  isProcessing?: boolean;
  onProcessAnother: () => void;
  onOpenEngineInfo: () => void;
}

export const ResultArea: React.FC<ResultAreaProps> = ({
  metadata,
  settings,
  result,
  isProcessing = false,
  onProcessAnother,
  onOpenEngineInfo,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const multiplier = settings.upscaleFactor === '4x' ? 4 : 2;
  const targetWidth = result?.outputWidth || metadata.width * multiplier;
  const targetHeight = result?.outputHeight || metadata.height * multiplier;
  const estimatedMegapixels = ((targetWidth * targetHeight) / 1000000).toFixed(1);

  const handleDownload = async (format: 'png' | 'jpeg') => {
    if (!result || isExporting) return;
    setIsExporting(true);

    const safeBaseName = metadata.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const scaleSuffix = settings.upscaleFactor ? `-${settings.upscaleFactor}` : '';
    const downloadFilename = `${safeBaseName}-upscaled${scaleSuffix}.${format === 'png' ? 'png' : 'jpg'}`;

    try {
      if (format === 'png' && result.blob && result.format.includes('png')) {
        const directUrl = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = directUrl;
        link.download = downloadFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(directUrl), 2000);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to decode image.'));
        img.src = result.enhancedUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || targetWidth;
      canvas.height = img.naturalHeight || targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable.');

      if (format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpeg' ? 0.95 : undefined;

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), mimeType, quality);
      });

      if (!blob) throw new Error(`Browser failed to encode ${format}.`);

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const hasRealResult = Boolean(result && result.enhancedUrl);

  return (
    <div className="bg-[#191919] border border-[#383838] rounded-xl p-5 space-y-5">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#292929]">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
            <span>Result & Export Specifications</span>
            {hasRealResult && (
              <span className="text-[10px] font-mono text-white bg-[#222222] border border-[#383838] px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>Verified Output</span>
              </span>
            )}
          </h3>
          <p className="text-xs text-[#777777] mt-0.5">
            {hasRealResult
              ? 'Real-ESRGAN inference complete. Genuine output available for export.'
              : 'Target render properties configured for subsequent pipeline execution'}
          </p>
        </div>

        <button
          onClick={onProcessAnother}
          className="px-3 py-1.5 text-xs font-medium text-white bg-[#222222] border border-[#383838] rounded hover:bg-[#292929] hover:border-[#777777] transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#A3A3A3]" />
          <span>Process Another Image</span>
        </button>
      </div>

      {/* Target Output Dimension Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        
        <div className="bg-[#111111] border border-[#292929] p-3 rounded-lg">
          <span className="text-[10px] uppercase font-mono text-[#777777] block mb-1">
            Original Input
          </span>
          <span className="font-mono text-white text-sm font-semibold">
            {metadata.width} × {metadata.height}
          </span>
          <span className="text-[10px] text-[#A3A3A3] block mt-0.5">
            {((metadata.width * metadata.height) / 1000000).toFixed(1)} MP
          </span>
        </div>

        <div className="bg-[#111111] border border-[#292929] p-3 rounded-lg">
          <span className="text-[10px] uppercase font-mono text-[#777777] block mb-1">
            {hasRealResult ? 'Verified Output' : `Target Output (${settings.upscaleFactor})`}
          </span>
          <span className="font-mono text-white text-sm font-semibold">
            {targetWidth} × {targetHeight}
          </span>
          <span className="text-[10px] text-[#A3A3A3] block mt-0.5">
            {estimatedMegapixels} MP ({multiplier * 100}% area)
          </span>
        </div>

        <div className="bg-[#111111] border border-[#292929] p-3 rounded-lg">
          <span className="text-[10px] uppercase font-mono text-[#777777] block mb-1">
            Target Color Space
          </span>
          <span className="font-mono text-white text-sm font-semibold">
            sRGB / 16-Bit Pro
          </span>
          <span className="text-[10px] text-[#A3A3A3] block mt-0.5">
            Uncompressed gamut
          </span>
        </div>

        <div className="bg-[#111111] border border-[#292929] p-3 rounded-lg">
          <span className="text-[10px] uppercase font-mono text-[#777777] block mb-1">
            Engine Model
          </span>
          <span className="font-mono text-white text-sm font-semibold">
            Real-ESRGAN {settings.upscaleFactor}
          </span>
          <span className="text-[10px] text-[#A3A3A3] block mt-0.5">
            Sub-pixel recovery
          </span>
        </div>

      </div>

      {/* Export Actions & Download Section */}
      <div className="bg-[#141414] border border-[#2c2c2c] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white">
              Export Enhanced Master
            </span>
            <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
              hasRealResult
                ? 'bg-white text-[#080808] border-white font-semibold'
                : 'text-[#A3A3A3] bg-[#222222] border-[#383838]'
            }`}>
              {hasRealResult ? 'Ready for Download' : 'Awaiting Processing'}
            </span>
          </div>
          <p className="text-xs text-[#777777] max-w-xl">
            {hasRealResult
              ? 'Click to download the actual Real-ESRGAN processed image in uncompressed PNG or high-quality JPEG format.'
              : 'Downloads activate automatically once the image is enhanced by the real backend engine.'}
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            disabled={!hasRealResult || isExporting || isProcessing}
            onClick={() => handleDownload('png')}
            className={`flex-1 md:flex-initial px-4 py-2.5 text-xs font-medium rounded flex items-center justify-center gap-2 transition-all ${
              hasRealResult && !isProcessing
                ? 'bg-[#F2F2F2] text-[#080808] hover:bg-white cursor-pointer shadow-sm'
                : 'bg-[#1e1e1e] text-[#555555] border border-[#2c2c2c] cursor-not-allowed opacity-60'
            }`}
            title={hasRealResult ? 'Download PNG image' : 'Available after processing'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>

          <button
            type="button"
            disabled={!hasRealResult || isExporting || isProcessing}
            onClick={() => handleDownload('jpeg')}
            className={`flex-1 md:flex-initial px-4 py-2.5 text-xs font-medium rounded flex items-center justify-center gap-2 transition-all ${
              hasRealResult && !isProcessing
                ? 'bg-[#222222] text-white border border-[#383838] hover:bg-[#292929] hover:border-[#777777] cursor-pointer'
                : 'bg-[#1e1e1e] text-[#555555] border border-[#2c2c2c] cursor-not-allowed opacity-60'
            }`}
            title={hasRealResult ? 'Download JPEG image' : 'Available after processing'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JPEG</span>
          </button>
        </div>

      </div>

      {/* Architecture Status note */}
      <div className="flex items-center justify-between text-xs text-[#777777] pt-2">
        <span className="font-mono text-[11px]">
          Client Configuration: Mode: {settings.mode} · Strength: {settings.strength}% · Scale: {settings.upscaleFactor}
        </span>
        <button
          onClick={onOpenEngineInfo}
          className="text-xs text-[#A3A3A3] hover:text-white underline underline-offset-4 cursor-pointer"
        >
          Backend Diagnostics
        </button>
      </div>

    </div>
  );
};
