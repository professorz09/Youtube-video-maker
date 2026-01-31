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
  statusMessage?: string; // For rate limit countdowns or specific status updates
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