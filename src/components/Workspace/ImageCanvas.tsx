import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  RotateCcw, 
  Columns, 
  Eye, 
  Grid,
  Move
} from 'lucide-react';
import { ImageMetadata } from '../../types';

interface ImageCanvasProps {
  metadata: ImageMetadata;
}

export const ImageCanvas: React.FC<ImageCanvasProps> = ({ metadata }) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showCheckerboard, setShowCheckerboard] = useState<boolean>(false);
  const [comparisonMode, setComparisonMode] = useState<boolean>(true);
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef<boolean>(false);

  // Reset zoom & pan when image changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [metadata.url]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleFitToScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Slider Dragging
  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const percentage = (clampedX / rect.width) * 100;
    setSliderPosition(percentage);
  }, []);

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    isDraggingSlider.current = true;
  };

  // Panning when zoomed in
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1 && !isDraggingSlider.current) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSlider.current) {
      handleSliderMove(e.clientX);
      return;
    }
    if (isPanning && zoom > 1) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    isDraggingSlider.current = false;
  };

  return (
    <div className="bg-[#111111] border border-[#383838] rounded-xl overflow-hidden flex flex-col h-[520px] lg:h-[620px] relative">
      
      {/* Top Canvas Toolbar */}
      <div className="bg-[#191919] border-b border-[#292929] px-4 py-2.5 flex items-center justify-between text-xs text-[#A3A3A3] z-20">
        
        {/* Left Toolbar Items: Mode Switch & Background */}
        <div className="flex items-center gap-2">
          {/* Comparison Mode Toggle */}
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
              comparisonMode
                ? 'bg-[#292929] border-white text-white'
                : 'bg-[#141414] border-[#383838] text-[#A3A3A3] hover:text-white'
            }`}
            title="Toggle Split Comparison Mode"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Comparison View</span>
          </button>

          {/* Checkerboard toggle */}
          <button
            onClick={() => setShowCheckerboard(!showCheckerboard)}
            className={`p-1.5 rounded border transition-colors cursor-pointer ${
              showCheckerboard
                ? 'bg-[#292929] border-white text-white'
                : 'bg-[#141414] border-[#383838] text-[#A3A3A3] hover:text-white'
            }`}
            title="Toggle Transparency Checkerboard"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Image Dimensions */}
        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-[#777777]">
          <span>{metadata.width} × {metadata.height} px</span>
          <span>·</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>

        {/* Right Toolbar Items: Zoom & Pan Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="p-1.5 rounded bg-[#141414] border border-[#383838] text-[#A3A3A3] hover:text-white hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="w-12 text-center font-mono text-xs text-white">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="p-1.5 rounded bg-[#141414] border border-[#383838] text-[#A3A3A3] hover:text-white hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-[#292929] mx-1" />

          <button
            onClick={handleFitToScreen}
            className="p-1.5 rounded bg-[#141414] border border-[#383838] text-[#A3A3A3] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
            title="Fit to Screen"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded bg-[#141414] border border-[#383838] text-[#A3A3A3] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
            title="Reset Zoom & Position"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        className={`flex-1 relative overflow-hidden select-none flex items-center justify-center ${
          showCheckerboard ? 'checkerboard-pattern' : 'bg-[#0e0e0e]'
        } ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      >
        {/* Render View: Either Comparison Slider or Pure Inspection */}
        {comparisonMode ? (
          <div 
            className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: 'center center',
            }}
          >
            {/* The Image Element container matching aspect ratio */}
            <div className="relative inline-block max-w-full max-h-[460px] lg:max-h-[550px] shadow-2xl">
              
              {/* Enhanced / Inspection Target Layer (Full width) */}
              <img
                src={metadata.url}
                alt={metadata.name}
                className="max-h-[460px] lg:max-h-[550px] w-auto h-auto object-contain block pointer-events-none"
              />

              {/* Original / Comparison side (Clipped to slider percentage) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
              >
                <img
                  src={metadata.url}
                  alt="Original inspection"
                  className="max-h-[460px] lg:max-h-[550px] w-auto h-auto object-contain max-w-none pointer-events-none"
                  style={{
                    filter: metadata.isPreset ? 'blur(1.8px) contrast(0.88)' : 'none',
                  }}
                />
                
                {/* Left Tag */}
                <div className="absolute top-3 left-3 bg-[#080808]/85 border border-[#383838] px-2 py-0.5 text-[10px] font-mono text-[#A3A3A3] rounded pointer-events-none">
                  {metadata.isPreset ? 'Simulated Low-Res' : 'Original Baseline'}
                </div>
              </div>

              {/* Right Tag */}
              <div className="absolute top-3 right-3 bg-[#080808]/85 border border-[#383838] px-2 py-0.5 text-[10px] font-mono text-white rounded pointer-events-none">
                {metadata.isPreset ? 'Sharp Master' : 'Inspection View'}
              </div>

              {/* Slider Divider Bar & Handle */}
              <div
                onMouseDown={handleSliderMouseDown}
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_8px_rgba(255,255,255,0.4)] z-10"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#111111] border-2 border-white flex items-center justify-center shadow-xl">
                  <div className="flex items-center gap-0.5 text-white">
                    <span className="text-[10px] font-bold">‹</span>
                    <span className="text-[10px] font-bold">›</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Pure Single Image Inspection */
          <div 
            className="relative flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: 'center center',
            }}
          >
            <img
              src={metadata.url}
              alt={metadata.name}
              className="max-h-[460px] lg:max-h-[550px] w-auto h-auto object-contain block pointer-events-none shadow-2xl"
            />
          </div>
        )}

        {/* Floating Pan Hint when zoomed in */}
        {zoom > 1 && (
          <div className="absolute bottom-3 left-3 bg-[#080808]/90 border border-[#383838] px-2.5 py-1 rounded text-[11px] font-mono text-[#A3A3A3] flex items-center gap-1.5 pointer-events-none">
            <Move className="w-3 h-3 text-white" />
            <span>Click and drag to pan around image</span>
          </div>
        )}

        {/* Mode Indicator Overlay */}
        <div className="absolute bottom-3 right-3 bg-[#080808]/90 border border-[#383838] px-2.5 py-1 rounded text-[11px] font-mono text-[#777777] pointer-events-none">
          {metadata.isPreset ? 'Interactive Demonstration Preset' : 'Uploaded Local Image'}
        </div>
      </div>
    </div>
  );
};
