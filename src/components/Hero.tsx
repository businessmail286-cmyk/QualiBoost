import React, { useState, useRef, useCallback } from 'react';
import { Camera, FileText, Maximize2, ArrowDown, Sparkles } from 'lucide-react';

interface HeroProps {
  onEnhanceClick: () => void;
  onExploreFeaturesClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onEnhanceClick, onExploreFeaturesClick }) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
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

  return (
    <section className="relative w-full border-b border-[#383838] bg-[#080808] pt-12 pb-16 lg:pt-16 lg:pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Typographic Hierarchy */}
          <div className="lg:col-span-6 space-y-6">
            
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#A3A3A3]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#777777]" />
              <span>Professional Studio Image Restoration</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight text-balance">
              Every Detail. Better.
            </h1>

            <p className="text-base sm:text-lg text-[#A3A3A3] leading-relaxed max-w-xl">
              Bring clarity back to your photos, restore image details and improve the quality of your flyers and graphics.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onEnhanceClick}
                className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#080808] bg-[#F2F2F2] rounded hover:bg-white active:bg-[#d6d6d6] transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <span>Enhance an Image</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onExploreFeaturesClick}
                className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white bg-[#191919] border border-[#383838] rounded hover:bg-[#222222] hover:border-[#777777] transition-colors cursor-pointer"
              >
                Explore Features
              </button>
            </div>

            {/* Three Compact Feature Indicators */}
            <div className="pt-6 border-t border-[#292929] grid grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <Camera className="w-3.5 h-3.5 text-[#A3A3A3]" />
                  <span>Photo Enhancement</span>
                </div>
                <p className="text-[#777777] text-[11px] leading-snug">Micro-contrast & sharpness</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <FileText className="w-3.5 h-3.5 text-[#A3A3A3]" />
                  <span>Flyer Restoration</span>
                </div>
                <p className="text-[#777777] text-[11px] leading-snug">Zero text distortion</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <Maximize2 className="w-3.5 h-3.5 text-[#A3A3A3]" />
                  <span>2× / 4× Upscaling</span>
                </div>
                <p className="text-[#777777] text-[11px] leading-snug">High-res pixel output</p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Demonstration Comparison Preview */}
          <div className="lg:col-span-6">
            <div className="bg-[#191919] border border-[#383838] rounded-xl p-3 sm:p-4 shadow-xl">
              
              {/* Header bar of comparison showcase */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#292929] text-xs text-[#A3A3A3]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#383838]" />
                  <span className="font-mono text-[11px] text-[#A3A3A3]">Interactive Demonstration</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span>Drag slider to compare</span>
                  <span className="text-white font-medium">{Math.round(sliderPosition)}%</span>
                </div>
              </div>

              {/* Slider Container */}
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                className="relative w-full aspect-[4/3] rounded-lg overflow-hidden cursor-ew-resize select-none bg-[#111111]"
              >
                {/* Right / Enhanced Image (Full base layer) */}
                <img
                  src="/src/assets/images/demo_portrait_photo_1792939872297.jpg"
                  alt="Enhanced portrait demonstration"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Left / Low-Fidelity Original Layer with simulated compression and slight blur */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src="/src/assets/images/demo_portrait_photo_1792939872297.jpg"
                    alt="Original low quality demonstration"
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    style={{
                      width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                      filter: 'blur(2px) contrast(0.85) brightness(0.95)',
                    }}
                  />
                  {/* Overlay label */}
                  <div className="absolute top-3 left-3 bg-[#080808]/80 backdrop-blur-sm border border-[#383838] px-2.5 py-1 text-[11px] font-mono text-[#A3A3A3] rounded">
                    Original
                  </div>
                </div>

                {/* Right label */}
                <div className="absolute top-3 right-3 bg-[#080808]/80 backdrop-blur-sm border border-[#383838] px-2.5 py-1 text-[11px] font-mono text-white rounded">
                  Enhanced
                </div>

                {/* Divider Line & Handle */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)] pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#111111] border-2 border-white flex items-center justify-center shadow-lg">
                    <div className="flex items-center gap-0.5 text-white">
                      <span className="text-[10px] leading-none">‹</span>
                      <span className="text-[10px] leading-none">›</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Caption clearly stating this is a demonstration */}
              <div className="pt-3 flex items-center justify-between text-[11px] text-[#777777]">
                <span>Sample: Studio Monochrome Portrait</span>
                <span>Visual demonstration · Engine integration in progress</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
