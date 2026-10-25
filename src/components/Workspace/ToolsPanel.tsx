import React from 'react';
import { Sliders, UserCheck, FileText, Layers, Maximize2, Info } from 'lucide-react';
import { EnhancementMode, ToolDefinition } from '../../types';
import { ENHANCEMENT_TOOLS } from '../../data/presets';

interface ToolsPanelProps {
  selectedMode: EnhancementMode;
  onSelectMode: (mode: EnhancementMode) => void;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  selectedMode,
  onSelectMode,
}) => {
  const getToolIcon = (iconName: string, isSelected: boolean) => {
    const iconClass = `w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#A3A3A3]'}`;
    switch (iconName) {
      case 'Sliders':
        return <Sliders className={iconClass} />;
      case 'UserCheck':
        return <UserCheck className={iconClass} />;
      case 'FileText':
        return <FileText className={iconClass} />;
      case 'Layers':
        return <Layers className={iconClass} />;
      case 'Maximize2':
        return <Maximize2 className={iconClass} />;
      default:
        return <Sliders className={iconClass} />;
    }
  };

  return (
    <div className="bg-[#191919] border border-[#383838] rounded-xl p-4 sm:p-5 flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#292929]">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-white">
            Enhancement Tools
          </h3>
          <p className="text-xs text-[#777777]">
            Select restoration target profile
          </p>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#A3A3A3] bg-[#222222] border border-[#383838] px-2 py-0.5 rounded">
          5 Profiles
        </span>
      </div>

      {/* Tool List */}
      <div className="space-y-2 flex-1">
        {ENHANCEMENT_TOOLS.map((tool: ToolDefinition) => {
          const isSelected = selectedMode === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onSelectMode(tool.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3.5 ${
                isSelected
                  ? 'bg-[#292929] border-white shadow-sm'
                  : 'bg-[#141414] border-[#2c2c2c] hover:border-[#777777] hover:bg-[#1a1a1a]'
              }`}
            >
              <div
                className={`p-2 rounded mt-0.5 border ${
                  isSelected
                    ? 'bg-[#111111] border-white text-white'
                    : 'bg-[#191919] border-[#383838] text-[#A3A3A3]'
                }`}
              >
                {getToolIcon(tool.iconName, isSelected)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-semibold tracking-tight ${
                      isSelected ? 'text-white' : 'text-[#E5E5E5]'
                    }`}
                  >
                    {tool.name}
                  </span>
                  {isSelected && (
                    <span className="text-[9px] font-mono uppercase tracking-wider bg-white text-[#080808] px-1.5 py-0.5 rounded font-semibold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#A3A3A3] mt-0.5 line-clamp-1">
                  {tool.shortDescription}
                </p>
                <p className="text-[11px] text-[#777777] mt-1 leading-snug">
                  {tool.fullDescription}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Notice box indicating upcoming processing pipeline */}
      <div className="pt-3 border-t border-[#292929] flex items-start gap-2 text-[11px] text-[#777777] leading-relaxed">
        <Info className="w-3.5 h-3.5 text-[#A3A3A3] shrink-0 mt-0.5" />
        <span>
          Tools represent planned processing profiles. Real restoration engine integration will be enabled in Phase 2.
        </span>
      </div>
    </div>
  );
};
