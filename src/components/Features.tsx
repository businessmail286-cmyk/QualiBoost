import React from 'react';
import { Camera, UserCheck, FileText, Layers, Maximize2 } from 'lucide-react';

export const Features: React.FC = () => {
  const features = [
    {
      title: 'Clearer Photos',
      icon: <Camera className="w-5 h-5 text-white" />,
      description: 'Restores crisp micro-contrast and edge sharpness to soft or slightly out-of-focus digital captures, resolving lost textures in fabrics, landscapes, and architectural surfaces.',
      badge: 'Edge Recovery',
    },
    {
      title: 'Natural Portrait Restoration',
      icon: <UserCheck className="w-5 h-5 text-white" />,
      description: 'Maintains authentic human anatomy with detailed skin pores, realistic eyelid definition, and iris clarity—avoiding the artificial plastic smoothing of generic algorithms.',
      badge: 'Texture Priority',
    },
    {
      title: 'Flyer and Poster Clarity',
      icon: <FileText className="w-5 h-5 text-white" />,
      description: 'Engineered specifically for promotional graphics. Re-rasterizes degraded typography, contact numbers, and company logos while ensuring zero letter distortion.',
      badge: 'Zero OCR Alteration',
    },
    {
      title: 'Noise Reduction',
      icon: <Layers className="w-5 h-5 text-white" />,
      description: 'Eliminates aggressive JPEG 8×8 block compression artifacts, color banding, and low-light sensor speckle while preserving fine photographic boundaries.',
      badge: 'Artifact Cleansing',
    },
    {
      title: 'Image Resolution Upscaling',
      icon: <Maximize2 className="w-5 h-5 text-white" />,
      description: 'High-precision 2× and 4× pixel dimension scaling. Reconstructs sub-pixel detail for large-format exhibition printing, billboards, and high-DPI displays.',
      badge: '2× & 4× Scaling',
    },
  ];

  return (
    <section id="features" className="w-full bg-[#111111] border-b border-[#383838] py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#777777]">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>Capability Matrix</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
            Engineered for Precision Restoration
          </h2>

          <p className="text-base text-[#A3A3A3] leading-relaxed">
            Professional processing profiles tuned to the distinct physical realities of lens optics, sensor noise, and graphic print media.
          </p>
        </div>

        {/* 5 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl bg-[#191919] border border-[#383838] hover:border-[#777777] transition-all duration-200 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-[#222222] border border-[#383838] flex items-center justify-center group-hover:border-white transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-mono text-[#A3A3A3] bg-[#292929] px-2 py-0.5 rounded">
                    {item.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#A3A3A3] mt-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#292929] flex items-center justify-between text-[11px] font-mono text-[#777777]">
                <span>Status</span>
                <span className="text-[#A3A3A3]">Interface Configured</span>
              </div>
            </div>
          ))}

          {/* 6th Card: Studio Workstation Guarantee */}
          <div className="p-6 rounded-xl bg-[#141414] border border-[#2c2c2c] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#777777]">
                Platform Architecture
              </span>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Client Privacy & Local Buffer
              </h3>
              <p className="text-xs text-[#A3A3A3] leading-relaxed">
                Your images remain in your browser memory until explicitly submitted for enhancement. No automatic cloud uploads or background telemetry scraping.
              </p>
            </div>

            <div className="pt-3 border-t border-[#292929] flex items-center justify-between text-[11px] font-mono text-[#777777]">
              <span>Security</span>
              <span className="text-white">Zero Cloud Leakage</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
