import React from 'react';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-[#080808] border-t border-[#383838] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#292929]">
          
          {/* Brand lockup */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded border border-[#777777] bg-[#191919] flex items-center justify-center p-1.5 shadow-xs">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-white">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="3" x2="16.5" y2="10.8" />
                  <line x1="16.5" y1="10.8" x2="10.5" y2="18.9" />
                  <line x1="10.5" y1="18.9" x2="4.5" y2="8.4" />
                  <line x1="4.5" y1="8.4" x2="19.5" y2="8.4" />
                </svg>
              </div>
              <span className="text-base font-semibold tracking-tight text-white">
                QualiBoost
              </span>
            </div>
            <p className="text-xs text-[#A3A3A3] pt-0.5">
              Every Detail. Better.
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#A3A3A3]">
            <button
              onClick={() => onNavigate('workspace')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Enhance Workspace
            </button>
            <button
              onClick={() => onNavigate('preservation')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Flyer Preservation
            </button>
            <button
              onClick={() => onNavigate('features')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => onNavigate('how-it-works')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <span className="text-[#383838]">|</span>
            <span className="hover:text-white cursor-pointer text-[#777777]">
              Privacy Policy
            </span>
            <span className="hover:text-white cursor-pointer text-[#777777]">
              Terms of Service
            </span>
          </nav>
        </div>

        {/* Bottom row: Copyright & Architecture notice */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#777777] font-mono">
          <p>© 2026 QualiBoost Studio. Professional image quality & restoration studio.</p>
          <p>Phase 1 Frontend Interface · Strict Monochrome Architecture</p>
        </div>

      </div>
    </footer>
  );
};
