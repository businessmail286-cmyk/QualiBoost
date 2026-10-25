import React, { useState } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';

interface HeaderProps {
  onUploadClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUploadClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#080808]/95 backdrop-blur-md border-b border-[#383838]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Brand Wordmark and Minimal Monochrome Logo */}
        <a 
          href="#" 
          className="flex items-center gap-2.5 text-white tracking-tight hover:opacity-90 transition-opacity shrink-0"
        >
          {/* Minimal monochrome camera aperture / focus frame mark */}
          <div className="w-8 h-8 rounded border border-[#777777] bg-[#191919] flex items-center justify-center p-1.5 shadow-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-white">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="3" x2="16.5" y2="10.8" />
              <line x1="16.5" y1="10.8" x2="10.5" y2="18.9" />
              <line x1="10.5" y1="18.9" x2="4.5" y2="8.4" />
              <line x1="4.5" y1="8.4" x2="19.5" y2="8.4" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white whitespace-nowrap">
            QualiBoost
          </span>
        </a>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#A3A3A3]">
          <button
            onClick={() => scrollToSection('workflow')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Enhance
          </button>
          <button
            onClick={() => scrollToSection('preservation')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Flyer Preservation
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            How It Works
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onUploadClick}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#080808] bg-[#F2F2F2] rounded hover:bg-white active:bg-[#e0e0e0] transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Upload Image</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#A3A3A3] hover:text-white hover:bg-[#191919] rounded transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#383838] bg-[#111111] px-4 py-4 space-y-3">
          <button
            onClick={() => scrollToSection('workflow')}
            className="block w-full text-left py-2 text-sm text-[#A3A3A3] hover:text-white"
          >
            Enhance Image
          </button>
          <button
            onClick={() => scrollToSection('preservation')}
            className="block w-full text-left py-2 text-sm text-[#A3A3A3] hover:text-white"
          >
            Flyer Preservation
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="block w-full text-left py-2 text-sm text-[#A3A3A3] hover:text-white"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="block w-full text-left py-2 text-sm text-[#A3A3A3] hover:text-white"
          >
            How It Works
          </button>
          <div className="pt-2 border-t border-[#292929]">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onUploadClick();
              }}
              className="w-full py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-[#080808] bg-[#F2F2F2] rounded hover:bg-white"
            >
              Upload Image
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
