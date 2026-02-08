export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url?: string;
}

const getApiKey = (): string => {
  const key = (typeof process !== 'undefined' && process.env?.ELEVENLABS_API_KEY) || '';
  return key;
};

export const getVoices = async (apiKey: string): Promise<ElevenLabsVoice[]> => {
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.status}`);
  }

  const data = await response.json();
  return data.voices || [];
};

export const generateSpeech = async (
  apiKey: string,
  text: string,
  voiceId: string,
  stability: number = 0.5,
  similarityBoost: number = 0.75,
  speed: number = 1.0
): Promise<Blob> => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          speed,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  return await response.blob();
};

export const generateSpeechStream = async (
  apiKey: string,
  text: string,
  voiceId: string,
  stability: number = 0.5,
  similarityBoost: number = 0.75,
  speed: number = 1.0
): Promise<string> => {
  const blob = await generateSpeech(apiKey, text, voiceId, stability, similarityBoost, speed);
  return URL.createObjectURL(blob);
};
