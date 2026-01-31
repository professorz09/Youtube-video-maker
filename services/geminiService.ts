import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is missing");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper function to handle 503 Overloaded errors with backoff
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const msg = error.message || JSON.stringify(error);
      const isOverloaded = msg.includes('503') || msg.includes('overloaded') || msg.includes('UNAVAILABLE');
      
      if (i === retries - 1 || !isOverloaded) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i); // 2s, 4s, 8s
      console.log(`Model overloaded (503). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error("Max retries exceeded");
};

export const refinePrompt = async (currentPrompt: string): Promise<string> => {
  const ai = getClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rewrite the following image prompt to be more descriptive, funny, and specific for an "MS Paint" style meme image. Keep it under 50 words. Ensure it is different from the original.
      
      Original Prompt: "${currentPrompt}"`,
      config: {
        responseMimeType: "text/plain",
      }
    });
    return response.text?.trim() || currentPrompt;
  } catch (e) {
    console.error("Failed to refine prompt", e);
    return currentPrompt;
  }
};

export const analyzeScript = async (scriptText: string, model: string = "gemini-3-flash-preview"): Promise<AnalysisResponse> => {
  const ai = getClient();
  
  const systemInstruction = `
    You are a granular storyboard engine for a fast-paced YouTube explanation channel (MS Paint style).
    
    **CRITICAL GOAL: EXTREME GRANULARITY (40+ SCENES)**
    - You MUST break the script down into tiny fragments.
    - **Do NOT** group full sentences. Split long sentences into 2 or 3 distinct visual beats.
    - Target density: 1 scene every 2-3 seconds of reading time.
    - If the script is 300 words, I expect at least 40 scenes.
    
    **Visual Style:**
    - "MS Paint" aesthetic. Badly drawn, funny, internet meme style. Stick figures are good.

    For each scene:
    1. **narration**: The specific phrase (often just half a sentence).
    2. **visualDescription**: Simple concept.
    3. **imagePrompt**: A prompt for Gemini 3 Pro Image (MS Paint style).
  `;

  const prompt = `
    Analyze this script. Break it down into AS MANY small scenes as possible. Aim for 40+ scenes if the length allows.
    
    Script:
    "${scriptText}"
    
    Return JSON.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      scenes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            narration: { type: Type.STRING },
            visualDescription: { type: Type.STRING },
            imagePrompt: { 
              type: Type.STRING, 
              description: "Prompt for the image model. Start with 'An MS Paint style digital drawing of...'" 
            }
          },
          required: ["narration", "visualDescription", "imagePrompt"]
        }
      }
    }
  };

  try {
    // Wrap the API call with retry logic
    const response = await callWithRetry(async () => {
      return await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as AnalysisResponse;
  } catch (error) {
    console.error("Error analyzing script:", error);
    throw error;
  }
};

export const generateTextOverlay = async (narration: string): Promise<{ heading: string; points: string[] }> => {
  const ai = getClient();

  const prompt = `
    Analyze this narration and create a MINIMALIST VISUAL EQUATION or PUNCHLINE for a video slide.
    
    Narration: "${narration}"
    
    **CRITICAL STYLE GUIDE:**
    - Do NOT use sentences.
    - Use mathematical symbols where possible: > (greater than), < (less than), = (equals), vs (versus), + (plus), -> (arrow).
    - Make it instant to understand.
    
    **Examples:**
    - Input: "Rich people have more power than poor people."
      -> Heading: "THE REALITY"
      -> Points: ["Money = Power"]
      
    - Input: "We often ignore facts because our emotions take over."
      -> Heading: "BIAS"
      -> Points: ["Emotions > Facts"]
      
    - Input: "There are two choices: speed or safety."
      -> Heading: "THE TRADE-OFF"
      -> Points: ["Speed vs Safety"]

    Output Requirements:
    - Heading: Uppercase, 1-3 words.
    - Points: 1 or 2 lines maximum. VERY short.
    
    Return JSON.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      heading: { type: Type.STRING },
      points: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["heading", "points"]
  };

  try {
    // Retry text overlay generation as well if overloaded
    const response = await callWithRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to generate text overlay", e);
    return { heading: "ERROR", points: ["Try again"] };
  }
};

export const generateSceneImage = async (prompt: string): Promise<string> => {
  const ai = getClient();

  // Updated prompt to strictly remove UI elements
  const styledPrompt = `${prompt}. 
  STYLE REQUIREMENTS: 
  - Aesthetic: "Internet Meme" / "Badly Drawn" digital art.
  - Technique: Rough mouse-drawn lines, bucket-fill flat colors, high contrast.
  - COMPOSITION: Fullscreen artwork only. 
  - NEGATIVE PROMPT: Do NOT include the MS Paint user interface, toolbars, window borders, menus, or mouse cursors. Do NOT write the words "MS Paint" or the prompt text on the image. Just the artwork itself.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: styledPrompt,
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No image generated");

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found");
  } catch (error: any) {
    console.error("Error generating image:", error);
    
    const errMsg = error.message || JSON.stringify(error);
    if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
        throw error;
    }

    // Re-throw to be handled by the smart retry in App.tsx
    throw error;
  }
};