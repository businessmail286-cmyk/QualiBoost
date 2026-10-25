import React from 'react';
import { RotateCcw, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { EnhancementMode, UpscaleFactor, EnhancementSettings } from '../../types';
import { ENHANCEMENT_TOOLS } from '../../data/presets';

interface ControlsBarProps {
  settings: EnhancementSettings;
  onUpdateSettings: (updater: (prev: EnhancementSettings) => EnhancementSettings) => void;
  onResetSettings: () => void;
  onEnhanceClick: () => void;
  hasImage: boolean;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  settings,
  onUpdateSettings,
  onResetSettings,
  onEnhanceClick,
  hasImage,
}) => {
  const currentTool = ENHANCEMENT_TOOLS.find((t) => t.id === settings.mode);

  return (
    <div className="bg-[#191919] border border-[#383838] rounded-xl p-4 sm:p-5 space-y-5">
      
      {/* Top row: Mode selector + Reset */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#292929]">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-white">
            Active Enhancement Profile
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {currentTool?.name || 'General Image Enhancement'}
            </span>
            <span className="text-xs text-[#777777]">·</span>
            <span className="text-xs text-[#A3A3A3]">
              {currentTool?.shortDescription}
            </span>
          </div>
        </div>

        <button
          onClick={onResetSettings}
          className="px-3 py-1.5 text-xs font-medium text-[#A3A3A3] hover:text-white bg-[#222222] border border-[#383838] rounded hover:bg-[#292929] hover:border-[#777777] transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Settings</span>
        </button>
      </div>

      {/* Grid of parameter controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
        
        {/* Control 1: Enhancement Strength Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-white flex items-center gap-1.5">
              Enhancement Strength
            </span>
            <span className="font-mono text-white bg-[#292929] border border-[#383838] px-2 py-0.5 rounded text-[11px]">
              {settings.strength}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={settings.strength}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onUpdateSettings((prev) => ({ ...prev, strength: val }));
              }}
              className="w-full h-1.5 bg-[#292929] rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="flex justify-between text-[10px] text-[#777777] font-mono">
            <span>Subtle (0%)</span>
            <span>Balanced (50%)</span>
            <span>Intensive (100%)</span>
          </div>
        </div>

        {/* Control 2: Resolution Upscaling (2x or 4x) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-white">
              Target Resolution Upscaling
            </span>
            <span className="text-[11px] text-[#777777] font-mono">
              Output Dimensions
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['2x', '4x'] as UpscaleFactor[]).map((factor) => {
              const isSelected = settings.upscaleFactor === factor;
              return (
                <button
                  key={factor}
                  type="button"
                  onClick={() => onUpdateSettings((prev) => ({ ...prev, upscaleFactor: factor }))}
                  className={`py-2 px-3 text-xs font-semibold rounded border transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    isSelected
                      ? 'bg-[#292929] border-white text-white'
                      : 'bg-[#141414] border-[#383838] text-[#A3A3A3] hover:text-white hover:bg-[#1f1f1f]'
                  }`}
                >
                  <span>{factor.toUpperCase()}</span>
                  <span className="text-[10px] text-[#777777] font-normal">
                    {factor === '2x' ? 'Double' : 'Quadruple'}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-[#777777]">
            {settings.upscaleFactor === '2x'
              ? 'Multiplies pixel density by 200% for standard screens.'
              : 'Multiplies pixel density by 400% for fine-art & commercial print.'}
          </p>
        </div>

        {/* Control 3: The Primary Enhance Image Action */}
        <div className="space-y-2">
          <div className="text-xs text-[#777777] flex items-center justify-between">
            <span>Ready for pipeline</span>
            <span className="font-mono text-[10px]">Client parameters set</span>
          </div>

          <button
            onClick={onEnhanceClick}
            disabled={!hasImage}
            className={`w-full py-3 px-4 rounded text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              hasImage
                ? 'bg-[#F2F2F2] text-[#080808] hover:bg-white active:bg-[#e0e0e0] shadow-md'
                : 'bg-[#222222] text-[#555555] border border-[#2e2e2e] cursor-not-allowed'
            }`}
          >
            <span>Enhance Image</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <p className="text-[10px] text-[#777777] text-center">
            Opens processing parameters & engine deployment status
          </p>
        </div>

      </div>
    </div>
  );
};
