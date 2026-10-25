import React, { useState, useEffect, useRef } from 'react';
import { UploadDropzone } from './UploadDropzone';
import { ImageInfoBar } from './ImageInfoBar';
import { ToolsPanel } from './ToolsPanel';
import { ImageCanvas } from './ImageCanvas';
import { ControlsBar } from './ControlsBar';
import { ResultArea } from './ResultArea';
import { 
  EnhancementMode, 
  EnhancementSettings, 
  ImageMetadata, 
  PresetImage,
  UpscaleResult
} from '../../types';
import { DEMO_PRESETS, ENHANCEMENT_TOOLS } from '../../data/presets';
import { requestImageUpscale } from '../../services/upscaleService';

interface WorkspaceProps {
  onOpenEngineInfo: () => void;
  onToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
  externalUploadTrigger?: number;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  onOpenEngineInfo,
  onToast,
  externalUploadTrigger,
}) => {
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [result, setResult] = useState<UpscaleResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [settings, setSettings] = useState<EnhancementSettings>({
    mode: 'flyer',
    strength: 75,
    upscaleFactor: '2x',
    preserveText: true,
    reduceArtifacts: true,
    faceSharpening: true,
  });

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Trigger file dialog from external header/hero button
  useEffect(() => {
    if (externalUploadTrigger && externalUploadTrigger > 0) {
      hiddenFileInputRef.current?.click();
    }
  }, [externalUploadTrigger]);

  // Clean up object URLs when metadata or result changes/unmounts
  useEffect(() => {
    return () => {
      if (metadata && metadata.file && metadata.url.startsWith('blob:')) {
        URL.revokeObjectURL(metadata.url);
      }
      if (result?.enhancedUrl && result.enhancedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(result.enhancedUrl);
      }
    };
  }, [metadata, result]);

  // Process user file upload
  const handleUserFile = (file: File) => {
    if (metadata && metadata.file && metadata.url.startsWith('blob:')) {
      URL.revokeObjectURL(metadata.url);
    }
    if (result?.enhancedUrl && result.enhancedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(result.enhancedUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setMetadata({
        file,
        name: file.name,
        sizeBytes: file.size,
        format: file.type || 'image/jpeg',
        width: img.naturalWidth,
        height: img.naturalHeight,
        url: objectUrl,
        isPreset: false,
      });
      setResult(null);
      onToast(`Loaded "${file.name}" (${img.naturalWidth}×${img.naturalHeight}px)`, 'success');
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      onToast('Failed to parse image data. Please ensure the file is an uncorrupted image.', 'error');
    };
    img.src = objectUrl;
  };

  // Process preset selection
  const handlePresetSelect = (preset: PresetImage) => {
    if (metadata && metadata.file && metadata.url.startsWith('blob:')) {
      URL.revokeObjectURL(metadata.url);
    }
    if (result?.enhancedUrl && result.enhancedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(result.enhancedUrl);
    }

    setMetadata({
      name: `${preset.title}.jpg`,
      sizeBytes: preset.sizeBytes,
      format: preset.format,
      width: preset.width,
      height: preset.height,
      url: preset.originalUrl,
      comparisonUrl: preset.enhancedUrl,
      isPreset: true,
    });
    setResult(null);

    const matchingTool = ENHANCEMENT_TOOLS.find((t) => t.id === preset.defaultMode);
    if (matchingTool) {
      setSettings((prev) => ({
        ...prev,
        mode: preset.defaultMode,
        strength: matchingTool.suggestedStrength,
        upscaleFactor: matchingTool.recommendedUpscale,
      }));
    }

    onToast(`Loaded preset "${preset.title}"`, 'info');
  };

  const handleRemoveImage = () => {
    if (metadata && metadata.file && metadata.url.startsWith('blob:')) {
      URL.revokeObjectURL(metadata.url);
    }
    if (result?.enhancedUrl && result.enhancedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(result.enhancedUrl);
    }
    setMetadata(null);
    setResult(null);
    onToast('Image cleared from workspace', 'info');
  };

  const handleModeChange = (mode: EnhancementMode) => {
    const tool = ENHANCEMENT_TOOLS.find((t) => t.id === mode);
    setSettings((prev) => ({
      ...prev,
      mode,
      strength: tool ? tool.suggestedStrength : prev.strength,
      upscaleFactor: tool ? tool.recommendedUpscale : prev.upscaleFactor,
    }));
  };

  const handleResetSettings = () => {
    const tool = ENHANCEMENT_TOOLS.find((t) => t.id === settings.mode);
    setSettings({
      mode: settings.mode,
      strength: tool ? tool.suggestedStrength : 75,
      upscaleFactor: tool ? tool.recommendedUpscale : '2x',
      preserveText: true,
      reduceArtifacts: true,
      faceSharpening: true,
    });
    onToast('Restoration parameters reset to defaults', 'info');
  };

  // Real inference request from Workspace Enhance button
  const handleStartEnhance = async () => {
    if (!metadata || isProcessing) return;

    if (result?.enhancedUrl && result.enhancedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(result.enhancedUrl);
    }

    setIsProcessing(true);
    abortControllerRef.current = new AbortController();

    const scaleNum: 2 | 4 = settings.upscaleFactor === '4x' ? 4 : 2;

    try {
      onToast(`Submitting image to Real-ESRGAN backend (${scaleNum}× scale)...`, 'info');
      const res = await requestImageUpscale(metadata, scaleNum, 'RealESRGAN_x4plus', abortControllerRef.current.signal);
      setResult(res);
      onToast(`Real-ESRGAN inference complete (${res.outputWidth}×${res.outputHeight}px)!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Processing error occurred';
      onToast(msg, 'error');
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <section id="workspace" className="w-full bg-[#111111] border-b border-[#383838] py-12 lg:py-16">
      
      {/* Hidden file input for header/action trigger */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUserFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
        className="hidden"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Workspace Title & Section Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-[#292929]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#777777] mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>Restoration Studio Workspace</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Image Workspace
            </h2>
          </div>

          <div className="text-xs text-[#A3A3A3] font-mono">
            Real-ESRGAN Integration Active · Inference Engine Connected
          </div>
        </div>

        {/* State 1: No Image Uploaded Yet */}
        {!metadata ? (
          <UploadDropzone
            onImageSelected={handleUserFile}
            onPresetSelected={handlePresetSelect}
            onError={(msg) => onToast(msg, 'error')}
          />
        ) : (
          /* State 2: Active Image in Workspace */
          <div className="space-y-6">
            
            {/* Metadata bar */}
            <ImageInfoBar
              metadata={metadata}
              onRemove={handleRemoveImage}
              onReplaceClick={() => hiddenFileInputRef.current?.click()}
            />

            {/* Split layout: Left Tools Panel (col-4) + Right Image Canvas (col-8) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              <div className="lg:col-span-4 h-full">
                <ToolsPanel
                  selectedMode={settings.mode}
                  onSelectMode={handleModeChange}
                />
              </div>

              <div className="lg:col-span-8 h-full">
                <ImageCanvas metadata={metadata} />
              </div>

            </div>

            {/* Parameter Adjustment Controls */}
            <ControlsBar
              settings={settings}
              onUpdateSettings={setSettings}
              onResetSettings={handleResetSettings}
              onEnhanceClick={handleStartEnhance}
              hasImage={Boolean(metadata)}
            />

            {/* Target Output & Result Area */}
            <ResultArea
              metadata={metadata}
              settings={settings}
              result={result}
              isProcessing={isProcessing}
              onProcessAnother={() => {
                handleRemoveImage();
                setTimeout(() => hiddenFileInputRef.current?.click(), 100);
              }}
              onOpenEngineInfo={onOpenEngineInfo}
            />

          </div>
        )}

      </div>
    </section>
  );
};
