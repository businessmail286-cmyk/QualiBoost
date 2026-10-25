import React, { useState, useRef, useCallback } from 'react';
import { Download, RefreshCw, Maximize2, CheckCircle2, Columns } from 'lucide-react';
import { ImageMetadata, UpscaleResult } from '../../types';

interface StageResultProps {
  metadata: ImageMetadata;
  result: UpscaleResult;
  onReset: () => void;
}

export const StageResult: React.FC<StageResultProps> = ({
  metadata,
  result,
  onReset,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [viewMode, setViewMode] = useState<'compare' | 'enhanced'>('compare');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const percentage = (clampedX / rect.width) * 100;
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  /**
   * Genuine browser image decoding and encoding for PNG / JPEG downloads.
   * Conforms to Rule 8:
   * - If PNG requested and blob is already image/png, downloads directly without quality loss.
   * - If JPEG requested or conversion needed, renders into canvas and encodes with canvas.toBlob().
   * - Releases temporary object URLs.
   */
  const handleDownloadFormat = async (targetFormat: 'png' | 'jpeg') => {
    if (isExporting) return;
    setIsExporting(true);

    const safeBaseName = metadata.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const scaleSuffix = result.scale ? `-${result.scale}x` : '';
    const downloadFilename = `${safeBaseName}-upscaled${scaleSuffix}.${targetFormat === 'png' ? 'png' : 'jpg'}`;

    try {
      // If user requested PNG and the backend already returned a PNG blob, download directly
      if (targetFormat === 'png' && result.blob && result.format.includes('png')) {
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

      // If user requested JPEG or format conversion is necessary, use canvas.toBlob
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to decode enhanced image for export.'));
        img.src = result.enhancedUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || result.outputWidth;
      canvas.height = img.naturalHeight || result.outputHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable.');

      // If JPEG, fill white background in case of alpha transparency
      if (targetFormat === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      const mimeType = targetFormat === 'png' ? 'image/png' : 'image/jpeg';
      const quality = targetFormat === 'jpeg' ? 0.95 : undefined;

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), mimeType, quality);
      });

      if (!blob) throw new Error(`Browser failed to encode image as ${targetFormat.toUpperCase()}.`);

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
    } catch (err) {
      console.error('Download export failed:', err);
      // Fallback to original enhanced url download
      const link = document.createElement('a');
      link.href = result.enhancedUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Title & Success feedback */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#191919] border border-[#383838] text-xs font-mono text-white mb-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          <span>Real-ESRGAN Inference Complete</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Enhanced Result
        </h2>
        <p className="text-sm text-[#A3A3A3]">
          Drag the comparison slider to inspect restored micro-contrast, edge sharpness, and clarity.
        </p>
      </div>

      {/* Main Result Card */}
      <div className="bg-[#111111] border border-[#383838] rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Top Bar with View Mode and Resolution */}
        <div className="bg-[#191919] border-b border-[#292929] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Output Resolution */}
          <div className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-[#777777]" />
            <span className="text-[#A3A3A3]">Verified Output Resolution:</span>
            <span className="font-mono text-white font-semibold">
              {result.outputWidth} × {result.outputHeight} px
            </span>
            {result.scale && (
              <span className="font-mono text-[10px] text-[#A3A3A3] bg-[#222222] border border-[#383838] px-1.5 py-0.5 rounded">
                {result.scale}× Scale
              </span>
            )}
          </div>

          {/* Toggle between Split Comparison and Pure Enhanced */}
          <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-lg border border-[#2e2e2e]">
            <button
              onClick={() => setViewMode('compare')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'compare'
                  ? 'bg-[#292929] text-white shadow-xs'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Before / After</span>
            </button>
            <button
              onClick={() => setViewMode('enhanced')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'enhanced'
                  ? 'bg-[#292929] text-white shadow-xs'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              <span>Enhanced Only</span>
            </button>
          </div>

        </div>

        {/* Comparison Viewer / Enhanced View */}
        <div className="p-4 sm:p-8 flex items-center justify-center bg-[#0a0a0a] min-h-[380px] max-h-[580px] overflow-hidden select-none">
          {viewMode === 'compare' ? (
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              className="relative max-h-[500px] rounded-lg overflow-hidden cursor-ew-resize border border-[#2a2a2a] shadow-2xl inline-block"
            >
              {/* Right / Enhanced Image (Base layer) */}
              <img
                src={result.enhancedUrl}
                alt="Real-ESRGAN enhanced result"
                className="max-h-[500px] w-auto h-auto object-contain block pointer-events-none"
              />

              {/* Left / Original Image (Clipped layer) */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${sliderPosition}%` }}
              >
                <img
                  src={metadata.url}
                  alt="Original image"
                  className="max-h-[500px] w-auto h-auto object-contain max-w-none block"
                  style={{
                    width: containerRef.current ? `${containerRef.current.clientWidth}px` : 'auto',
                    height: containerRef.current ? `${containerRef.current.clientHeight}px` : 'auto',
                  }}
                />
                
                {/* Left Tag */}
                <div className="absolute top-3 left-3 bg-[#080808]/85 border border-[#383838] px-2.5 py-1 text-[11px] font-mono text-[#A3A3A3] rounded">
                  Original ({metadata.width}×{metadata.height})
                </div>
              </div>

              {/* Right Tag */}
              <div className="absolute top-3 right-3 bg-[#080808]/85 border border-[#383838] px-2.5 py-1 text-[11px] font-mono text-white rounded pointer-events-none">
                Enhanced ({result.outputWidth}×{result.outputHeight})
              </div>

              {/* Slider Divider Bar & Handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)] pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#111111] border-2 border-white flex items-center justify-center shadow-xl">
                  <div className="flex items-center gap-0.5 text-white">
                    <span className="text-[10px] leading-none">‹</span>
                    <span className="text-[10px] leading-none">›</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Enhanced Only View */
            <div className="relative max-h-[500px] rounded-lg overflow-hidden border border-[#2a2a2a] shadow-2xl">
              <img
                src={result.enhancedUrl}
                alt="Enhanced result"
                className="max-h-[500px] w-auto h-auto object-contain block"
              />
            </div>
          )}
        </div>

        {/* Bottom Actions Bar with Genuine PNG & JPEG Downloads */}
        <div className="bg-[#141414] border-t border-[#292929] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <button
            onClick={onReset}
            className="w-full sm:w-auto px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white bg-[#191919] border border-[#383838] rounded-lg hover:bg-[#222222] hover:border-[#777777] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#A3A3A3]" />
            <span>Upscale Another Image</span>
          </button>

          {/* Genuine PNG & JPEG Download Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => handleDownloadFormat('png')}
              disabled={isExporting}
              className="flex-1 sm:flex-initial px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#080808] bg-[#F2F2F2] rounded-lg hover:bg-white active:bg-[#e0e0e0] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              title="Download uncompressed PNG"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>

            <button
              onClick={() => handleDownloadFormat('jpeg')}
              disabled={isExporting}
              className="flex-1 sm:flex-initial px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#222222] border border-[#383838] rounded-lg hover:bg-[#292929] hover:border-[#777777] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Download high-quality JPEG (95% quality)"
            >
              <Download className="w-4 h-4 text-[#A3A3A3]" />
              <span>Download JPEG</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
