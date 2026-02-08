export interface Scene {
  id: number;
  narration: string;
  visualDescription: string;
  imagePrompt: string;
  textOverlay?: {
    heading: string;
    points: string[];
  };
  imageUrl?: string;
  isLoadingImage: boolean;
  isLoadingTextOverlay?: boolean;
  isRefining?: boolean;
  error?: string;
  statusMessage?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface AnalysisResponse {
  scenes: {
    narration: string;
    visualDescription: string;
    imagePrompt: string;
  }[];
}

export interface ScriptBlock {
  id: string;
  text: string;
  isEditing: boolean;
}

export interface AudioSettings {
  voiceId: string;
  voiceName: string;
  stability: number;
  similarityBoost: number;
  speed: number;
}

export interface GeneratedAudio {
  url: string;
  duration: number;
  text: string;
}
