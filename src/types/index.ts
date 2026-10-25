export type EnhancementMode = 
  | 'general'
  | 'portrait'
  | 'flyer'
  | 'noise'
  | 'upscale';

export type UpscaleFactor = '2x' | '3x' | '4x';
export type ScaleValue = 2 | 3 | 4;

export interface ImageMetadata {
  file?: File;
  name: string;
  sizeBytes: number;
  format: string;
  width: number;
  height: number;
  url: string;
  previewUrl?: string;
  isPreset?: boolean;
  comparisonUrl?: string; // Optional comparison image for demo
}

export interface EnhancementSettings {
  mode: EnhancementMode;
  strength: number; // 0 to 100
  upscaleFactor: UpscaleFactor;
  preserveText: boolean;
  reduceArtifacts: boolean;
  faceSharpening: boolean;
}

export interface ToolDefinition {
  id: EnhancementMode;
  name: string;
  shortDescription: string;
  fullDescription: string;
  iconName: string;
  suggestedStrength: number;
  recommendedUpscale: UpscaleFactor;
}

export interface PresetImage {
  id: string;
  title: string;
  category: string;
  dimensions: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
  originalUrl: string;
  enhancedUrl: string;
  description: string;
  defaultMode: EnhancementMode;
}

export type FlowStage = 'upload' | 'ready' | 'processing' | 'result' | 'error';

export interface UpscaleResult {
  enhancedUrl: string;
  blob?: Blob;
  outputWidth: number;
  outputHeight: number;
  format: string;
  sizeBytes?: number;
  filename: string;
  scale?: ScaleValue;
  model?: string;
}
