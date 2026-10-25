import React from 'react';
import { Upload, Sliders, Download } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Upload Your Image',
      description: 'Select or drop any JPG, PNG, or WebP photograph, event flyer, or graphic up to 25 MB directly into the studio workspace.',
      icon: <Upload className="w-5 h-5 text-white" />,
    },
    {
      step: '02',
      title: 'Choose Your Enhancement Settings',
      description: 'Select a restoration profile (General, Portrait, Flyer, Noise Reduction, or Upscale) and calibrate restoration strength and 2× or 4× resolution factor.',
      icon: <Sliders className="w-5 h-5 text-white" />,
    },
    {
      step: '03',
      title: 'Preview and Download Your Result',
      description: 'Inspect fine structural boundaries with the interactive comparison viewer, verify output dimensions, and export in full uncompressed master quality.',
      icon: <Download className="w-5 h-5 text-white" />,
    },
  ];

  return (
    <section id="how-it-works" className="w-full bg-[#080808] border-b border-[#383838] py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#777777]">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>Workflow</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
            How It Works
          </h2>

          <p className="text-base text-[#A3A3A3] leading-relaxed">
            A three-step workstation workflow designed for immediate clarity, predictable adjustments, and zero guesswork.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl bg-[#191919] border border-[#383838] relative flex flex-col justify-between space-y-6 hover:border-[#777777] transition-colors"
            >
              {/* Header with Step Number & Icon */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-bold text-[#777777] tracking-wider">
                  {item.step}
                </span>
                <div className="w-9 h-9 rounded-lg bg-[#111111] border border-[#2e2e2e] flex items-center justify-center">
                  {item.icon}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-[#A3A3A3] leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Progress Indicator line */}
              <div className="pt-3 border-t border-[#292929] flex items-center justify-between text-[11px] font-mono text-[#777777]">
                <span>Stage {idx + 1} of 3</span>
                <span>QualiBoost Pipeline</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
