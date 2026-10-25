import React from 'react';
import { 
  Type, 
  Calendar, 
  ShieldCheck, 
  UserCheck, 
  Palette, 
  LayoutGrid, 
  Maximize,
  Check
} from 'lucide-react';

export const FlyerPreservation: React.FC = () => {
  const principles = [
    {
      icon: <Type className="w-4 h-4 text-white" />,
      title: 'Original Text & Spelling',
      desc: 'No AI OCR hallucinations, character swaps, or unintended word replacements. Every letterform is sharpened exactly as set.',
    },
    {
      icon: <Calendar className="w-4 h-4 text-white" />,
      title: 'Names, Dates & Numbers',
      desc: 'Critical event schedules, venue addresses, phone numbers, and admission times remain completely intact and legible.',
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-white" />,
      title: 'Logos & Vector Branding',
      desc: 'Sponsor crests, company emblems, and graphic marks preserve their authentic geometries without rounded edge distortion.',
    },
    {
      icon: <UserCheck className="w-4 h-4 text-white" />,
      title: 'Faces & Artist Portraits',
      desc: 'Guest speakers, pastors, musical performers, and team photos retain true human likeness with natural micro-contrast.',
    },
    {
      icon: <Palette className="w-4 h-4 text-white" />,
      title: 'Original Colours & Gradients',
      desc: 'Strict color space fidelity. No unsolicited psychedelic neon tinting or chromatic shifts away from the designer’s palette.',
    },
    {
      icon: <LayoutGrid className="w-4 h-4 text-white" />,
      title: 'Layout & Element Placement',
      desc: 'Zero automatic layout rearrangement. Spatial hierarchy, margins, gutters, and alignments remain bit-for-bit identical.',
    },
    {
      icon: <Maximize className="w-4 h-4 text-white" />,
      title: 'Aspect Ratio & Composition',
      desc: 'Standard A4, US Letter, Instagram 1:1, or 9:16 vertical poster proportions are maintained with precision sub-pixel scaling.',
    },
  ];

  return (
    <section id="preservation" className="w-full bg-[#080808] border-b border-[#383838] py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#777777]">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>Design Integrity Standard</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
            Flyer Preservation Priority
          </h2>

          <p className="text-base text-[#A3A3A3] leading-relaxed">
            Enhancement must restore clarity without redesigning the artwork. Built specifically for event promoters, church media teams, commercial print shops, and business advertisers.
          </p>
        </div>

        {/* 7 Guarantees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {principles.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl bg-[#191919] border border-[#383838] hover:border-[#777777] transition-colors space-y-3"
            >
              <div className="w-9 h-9 rounded-lg bg-[#111111] border border-[#2e2e2e] flex items-center justify-center">
                {item.icon}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                  <span>{item.title}</span>
                  <Check className="w-3.5 h-3.5 text-[#777777]" />
                </h3>
                <p className="text-xs text-[#A3A3A3] mt-1.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}

          {/* Core Philosophy Callout Card */}
          <div className="p-5 rounded-xl bg-[#141414] border border-[#383838] flex flex-col justify-between space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#777777]">
              Zero-Hallucination Policy
            </span>
            <blockquote className="text-xs text-[#E5E5E5] leading-relaxed italic border-l-2 border-[#777777] pl-3 py-1">
              "An image enhancement studio must be an amplifier of existing human intent, never an uninvited illustrator."
            </blockquote>
            <span className="text-[11px] font-mono text-[#777777]">
              QualiBoost Core Architectural Invariant
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
