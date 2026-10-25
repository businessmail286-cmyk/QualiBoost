import React, { useState, useRef, useEffect } from 'react';
import { StageUpload } from './StageUpload';
import { StageReady } from './StageReady';
import { StageProcessing } from './StageProcessing';
import { StageResult } from './StageResult';
import { StageError } from './StageError';
import { FlowStage, ImageMetadata, PresetImage, UpscaleResult, ScaleValue } from '../../types';
import { requestImageUpscale } from '../../services/upscaleService';
import { checkBackendHealth, BackendHealthStatus } from '../../config/api';

interface UpscaleWorkflowProps {
  onToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
  externalUploadTrigger?: number;
}

export const UpscaleWorkflow: React.FC<UpscaleWorkflowProps> = ({
  onToast,
  externalUploadTrigger,
}) => {
  const [stage, setStage] = useState<FlowStage>('upload');
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [selectedScale, setSelectedScale] = useState<ScaleValue>(4);
  const [selectedModel, setSelectedModel] = useState<string>('RealESRGAN_x4plus');
  const [result, setResult] = useState<UpscaleResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [healthStatus, setHealthStatus] = useState<BackendHealthStatus | null>(null);

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check backend health on mount and periodically
  useEffect(() => {
    let isMounted = true;
    const runCheck = async () => {
      const status = await checkBackendHealth();
      if (isMounted) {
        setHealthStatus(status);
      }
    };
    runCheck();
    return () => {
      isMounted = false;
    };
  }, [stage]);

  // External trigger from header button
  useEffect(() => {
    if (externalUploadTrigger && externalUploadTrigger > 0) {
      hiddenFileInputRef.current?.click();
    }
  }, [externalUploadTrigger]);

  // Clean up object URLs when metadata changes or unmounts
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

  // Handle user file upload
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
      setErrorMessage('');
      setStage('ready');
      onToast(`Loaded "${file.name}" (${img.naturalWidth}×${img.naturalHeight}px)`, 'success');
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      onToast('Failed to read image file. Please provide a valid JPG, PNG, or WebP.', 'error');
    };
    img.src = objectUrl;
  };

  // Handle sample preset selection
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
      isPreset: true,
    });
    setResult(null);
    setErrorMessage('');
    setStage('ready');
    onToast(`Loaded sample photo "${preset.title}"`, 'info');
  };

  // Clear image and return to Stage A
  const handleRemove = () => {
    if (metadata && metadata.file && metadata.url.startsWith('blob:')) {
      URL.revokeObjectURL(metadata.url);
    }
    if (result?.enhancedUrl && result.enhancedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(result.enhancedUrl);
    }
    setMetadata(null);
    setResult(null);
    setErrorMessage('');
    setStage('upload');
  };

  // Cancel processing request
  const handleCancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsSubmitting(false);
    setStage('ready');
    onToast('Upscaling request cancelled', 'info');
  };

  // Start real upscaling request
  const handleStartUpscaling = async () => {
    if (!metadata) return;

    if (result?.enhancedUrl && result.enhancedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(result.enhancedUrl);
    }

    setIsSubmitting(true);
    setStage('processing');
    setErrorMessage('');

    abortControllerRef.current = new AbortController();

    try {
      const res = await requestImageUpscale(metadata, selectedScale, selectedModel, abortControllerRef.current.signal);
      setResult(res);
      setStage('result');
      onToast(`Real-ESRGAN ${selectedScale}× inference completed!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected processing error occurred.';
      setErrorMessage(msg);
      setStage('error');
      onToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <section id="workflow" className="w-full bg-[#080808] py-12 lg:py-16 px-4 sm:px-6 lg:px-8 border-b border-[#383838]">
      
      {/* Hidden file input for Replace action */}
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

      <div className="max-w-6xl mx-auto">
        {/* Render Stage A: Upload Your Image */}
        {stage === 'upload' && (
          <StageUpload
            onImageSelected={handleUserFile}
            onPresetSelected={handlePresetSelect}
            onError={(msg) => onToast(msg, 'error')}
          />
        )}

        {/* Render Stage B: One Upscale Button */}
        {stage === 'ready' && metadata && (
          <StageReady
            metadata={metadata}
            selectedScale={selectedScale}
            onScaleChange={setSelectedScale}
            onUpscaleClick={handleStartUpscaling}
            onReplaceClick={() => hiddenFileInputRef.current?.click()}
            onRemoveClick={handleRemove}
            isSubmitting={isSubmitting}
            healthStatus={healthStatus}
            selectedModel={selectedModel}
          />
        )}

        {/* Render Stage C: Animated Upscaling Experience */}
        {stage === 'processing' && metadata && (
          <StageProcessing
            metadata={metadata}
            onCancel={handleCancelProcessing}
          />
        )}

        {/* Render Stage D: Real Result Screen */}
        {stage === 'result' && metadata && result && (
          <StageResult
            metadata={metadata}
            result={result}
            onReset={handleRemove}
          />
        )}

        {/* Render Error Screen (Preserves upload) */}
        {stage === 'error' && metadata && (
          <StageError
            metadata={metadata}
            errorMessage={errorMessage}
            onRetry={handleStartUpscaling}
            onReplaceClick={() => hiddenFileInputRef.current?.click()}
          />
        )}
      </div>

    </section>
  );
};
