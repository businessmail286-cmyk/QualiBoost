import React, { useState, useRef, useCallback } from 'react';
import { Download, RefreshCw, Maximize2, CheckCircle2, Columns, Loader2, AlertCircle } from 'lucide-react';
import { ImageMetadata, UpscaleResult } from '../../types';
import { downloadJobResultBlob } from '../../services/upscaleService';

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
  const [downloadingFormat, setDownloadingFormat] = useState<'png' | 'jpeg' | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
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
   * Retrieves and triggers download of authentic image blobs in PNG or JPEG format.
   * - Uses existing backend job ID to call GET /api/jobs/{job_id}/result (PNG) or
   *   GET /api/jobs/{job_id}/result?format=jpeg (JPEG, quality 95).
   * - Sets appropriate filenames (.png or .jpg).
   * - Prevents duplicate downloads while in progress.
   * - Displays loading indicator and error feedback on failure.
   */
  const handleDownloadFormat = async (targetFormat: 'png' | 'jpeg') => {
    if (downloadingFormat) return;
    setDownloadingFormat(targetFormat);
    setDownloadError(null);

    const baseName = metadata.name ? metadata.name.replace(/\.[^/.]+$/, '') : 'qualiboost';
    const downloadFilename = targetFormat === 'png'
      ? `${baseName}-enhanced.png`
      : `${baseName}-enhanced.jpg`;

    try {
      let blob: Blob;

      if (result.jobId) {
        // Fetch from backend using completed job ID and selected format
        blob = await downloadJobResultBlob(result.jobId, targetFormat, result.blob);
      } else if (targetFormat === 'png' && result.blob) {
        // Direct PNG blob already in memory
        blob = result.blob;
      } else {
        // Fallback for preset images or direct non-job API responses
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

        if (targetFormat === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);

        const mimeType = targetFormat === 'png' ? 'image/png' : 'image/jpeg';
        const quality = targetFormat === 'jpeg' ? 0.95 : undefined;

        const canvasBlob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), mimeType, quality);
        });

        if (!canvasBlob) throw new Error(`Browser failed to encode image as ${targetFormat.toUpperCase()}.`);
        blob = canvasBlob;
      }

      // Trigger authentic browser download
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
      const errMsg = err instanceof Error ? err.message : 'Download failed. Please try again.';
      setDownloadError(`Failed to download ${targetFormat.toUpperCase()}: ${errMsg}`);
    } finally {
      setDownloadingFormat(null);
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
            {result.studioMode === 'studio' && (
              <span className="font-mono text-[10px] text-white bg-[#222222] border border-[#555555] px-1.5 py-0.5 rounded">
                Studio Mode (GFPGAN Faces)
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

        {/* Error notification banner if download fails */}
        {downloadError && (
          <div className="bg-[#1f1212] border-t border-[#5c2424] px-5 py-3 flex items-center justify-between gap-3 text-xs text-[#fca5a5]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#f87171]" />
              <span>{downloadError}</span>
            </div>
            <button
              onClick={() => setDownloadError(null)}
              className="text-[#A3A3A3] hover:text-white underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Bottom Actions Bar with Genuine PNG & JPEG Downloads */}
        <div className="bg-[#141414] border-t border-[#292929] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <button
            onClick={onReset}
            className="w-full sm:w-auto px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white bg-[#191919] border border-[#383838] rounded-lg hover:bg-[#222222] hover:border-[#777777] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#A3A3A3]" />
            <span>Upscale Another Image</span>
          </button>

          {/* Download Options: PNG (Maximum preservation) and JPEG (Quality 95) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {/* Download PNG — maximum preservation */}
            <button
              onClick={() => handleDownloadFormat('png')}
              disabled={Boolean(downloadingFormat)}
              className="px-5 py-2.5 text-xs font-semibold text-[#080808] bg-[#F2F2F2] rounded-lg hover:bg-white active:bg-[#e0e0e0] transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed group text-left"
              title="Download PNG — maximum preservation"
            >
              {downloadingFormat === 'png' ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#080808] shrink-0" />
              ) : (
                <Download className="w-4 h-4 text-[#080808] shrink-0" />
              )}
              <div className="flex flex-col items-start leading-tight">
                <span className="uppercase tracking-wider font-bold">
                  {downloadingFormat === 'png' ? 'Preparing PNG...' : 'Download PNG'}
                </span>
                <span className="text-[10px] text-[#555555] font-normal font-sans">
                  Maximum preservation
                </span>
              </div>
            </button>

            {/* Download JPEG — high-quality JPEG, quality 95 */}
            <button
              onClick={() => handleDownloadFormat('jpeg')}
              disabled={Boolean(downloadingFormat)}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#222222] border border-[#383838] rounded-lg hover:bg-[#292929] hover:border-[#777777] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group text-left"
              title="Download JPEG — high-quality JPEG, quality 95"
            >
              {downloadingFormat === 'jpeg' ? (
                <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
              ) : (
                <Download className="w-4 h-4 text-[#A3A3A3] group-hover:text-white shrink-0" />
              )}
              <div className="flex flex-col items-start leading-tight">
                <span className="uppercase tracking-wider font-bold">
                  {downloadingFormat === 'jpeg' ? 'Preparing JPEG...' : 'Download JPEG'}
                </span>
                <span className="text-[10px] text-[#888888] font-normal font-sans">
                  Quality 95
                </span>
              </div>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
