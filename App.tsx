import React, { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import ScriptInput from './components/ScriptInput';
import SceneDashboard from './components/SceneDashboard';
import { Scene, AppState } from './types';
import { analyzeScript, generateSceneImage, refinePrompt, generateTextOverlay } from './services/geminiService';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingAllText, setIsGeneratingAllText] = useState(false);

  // Helper to update a specific scene
  const updateScene = (id: number, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  useEffect(() => {
    const checkKey = async () => {
      try {
        if ((window as any).aistudio) {
          const selected = await (window as any).aistudio.hasSelectedApiKey();
          setHasApiKey(selected);
        } else {
          setHasApiKey(true);
        }
      } catch (e) {
        console.error("Error checking API key:", e);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleAnalysis = useCallback(async (scriptText: string, model: string) => {
    setAppState(AppState.ANALYZING);
    setError(null);
    setScenes([]);

    try {
      const result = await analyzeScript(scriptText, model);
      
      const initialScenes: Scene[] = result.scenes.map((s, index) => ({
        id: index,
        narration: s.narration,
        visualDescription: s.visualDescription,
        imagePrompt: s.imagePrompt,
        textOverlay: undefined,
        isLoadingImage: false, 
        isLoadingTextOverlay: false,
        isRefining: false,
        imageUrl: undefined,
        statusMessage: undefined
      }));

      setScenes(initialScenes);
      setAppState(AppState.COMPLETE); 

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
      setAppState(AppState.ERROR);
    }
  }, []);

  const handleUpdatePrompt = (id: number, newPrompt: string) => {
    updateScene(id, { imagePrompt: newPrompt });
  };

  const handleRefinePrompt = async (id: number, currentPrompt: string) => {
    updateScene(id, { isRefining: true });
    try {
      const newPrompt = await refinePrompt(currentPrompt);
      updateScene(id, { imagePrompt: newPrompt, isRefining: false });
    } catch (e) {
      updateScene(id, { isRefining: false });
    }
  };

  const handleGenerateTextOverlay = async (id: number, narration: string) => {
    updateScene(id, { isLoadingTextOverlay: true });
    try {
      const overlay = await generateTextOverlay(narration);
      updateScene(id, { textOverlay: overlay, isLoadingTextOverlay: false });
    } catch (e) {
      console.error(e);
      updateScene(id, { isLoadingTextOverlay: false });
    }
  };

  const handleGenerateAllTextAssets = async () => {
    setIsGeneratingAllText(true);
    const pendingScenes = scenes.filter(s => !s.textOverlay);
    const BATCH_SIZE = 5;

    for (let i = 0; i < pendingScenes.length; i += BATCH_SIZE) {
      const batch = pendingScenes.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(scene => handleGenerateTextOverlay(scene.id, scene.narration)));
    }
    setIsGeneratingAllText(false);
  };

  // --- Smart Image Generation Logic ---

  const generateSingleImageWithRetry = async (id: number, prompt: string) => {
    let attempts = 0;
    const maxAttempts = 5; 

    while (attempts < maxAttempts) {
      try {
        updateScene(id, { isLoadingImage: true, error: undefined, statusMessage: attempts > 0 ? "Retrying..." : undefined });
        const imageUrl = await generateSceneImage(prompt);
        updateScene(id, { imageUrl, isLoadingImage: false, statusMessage: undefined });
        return; // Success
      } catch (err: any) {
        attempts++;
        const errMsg = err.message || JSON.stringify(err);
        
        // CHECK 1: Daily Quota Limit (HARD STOP)
        if (errMsg.includes("generate_requests_per_model_per_day")) {
          console.error(`Daily Quota Exceeded for scene ${id}.`);
          updateScene(id, { isLoadingImage: false, error: "Daily Quota Exceeded", statusMessage: "Daily Limit Reached" });
          return; // Do not retry
        }

        // CHECK 2: Rate Limit (WAIT AND RETRY)
        if (errMsg.includes("429") || errMsg.includes("quota")) {
          // Extract wait time
          const match = errMsg.match(/retry in ([\d\.]+)s/);
          let waitTimeMs = 30000; // Default 30s
          if (match && match[1]) {
            waitTimeMs = Math.ceil(parseFloat(match[1])) * 1000 + 1000; // Add 1s buffer
          }
          
          console.log(`Rate limit hit for scene ${id}. Waiting ${waitTimeMs}ms.`);
          
          // Countdown timer for UI
          const startTime = Date.now();
          const endTime = startTime + waitTimeMs;
          
          while (Date.now() < endTime) {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);
            updateScene(id, { statusMessage: `Rate limit hit. Retrying in ${remaining}s...` });
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          continue; // Retry loop
        }

        // CHECK 3: Model Overloaded (503) (WAIT AND RETRY)
        if (errMsg.includes("503") || errMsg.includes("overloaded") || errMsg.includes("UNAVAILABLE")) {
          const waitTimeMs = 5000 * attempts; // Linear backoff for overload
          console.log(`Model overloaded for scene ${id}. Waiting ${waitTimeMs}ms.`);
          
          const startTime = Date.now();
          const endTime = startTime + waitTimeMs;
          while (Date.now() < endTime) {
             const remaining = Math.ceil((endTime - Date.now()) / 1000);
             updateScene(id, { statusMessage: `Model busy (503). Retrying in ${remaining}s...` });
             await new Promise(resolve => setTimeout(resolve, 1000));
          }
          continue; // Retry loop
        }
        
        // If permission error
        if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
           setError("Permission denied. Select API Key.");
           setHasApiKey(false);
           updateScene(id, { isLoadingImage: false, error: "Auth Failed", statusMessage: undefined });
           return;
        }

        // Other errors
        console.error(`Error generating scene ${id}:`, err);
        updateScene(id, { isLoadingImage: false, error: "Failed", statusMessage: undefined });
        return;
      }
    }
    
    updateScene(id, { isLoadingImage: false, error: "Max Retries Exceeded", statusMessage: undefined });
  };

  const runConcurrentGeneration = async (scenesToGenerate: Scene[]) => {
    setIsGeneratingAll(true);
    
    // Concurrency Limit: 3
    const CONCURRENCY_LIMIT = 3;
    const queue = [...scenesToGenerate];
    const activePromises: Promise<void>[] = [];

    const processNext = async () => {
      if (queue.length === 0) return;
      const scene = queue.shift();
      if (!scene) return;

      const promise = generateSingleImageWithRetry(scene.id, scene.imagePrompt).finally(() => {
        // Remove self from active list
        activePromises.splice(activePromises.indexOf(promise), 1);
      });
      
      activePromises.push(promise);
      await promise; 
      
      if (queue.length > 0) {
        await processNext();
      }
    };

    // Start initial batch of workers
    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, queue.length); i++) {
      workers.push(processNext());
    }

    // Wait for all worker chains to complete
    await Promise.all(workers);
    setIsGeneratingAll(false);
  };

  const handleGenerateSingleImage = async (id: number, prompt: string) => {
    await generateSingleImageWithRetry(id, prompt);
  };

  const handleGenerateAll = async () => {
    const pendingScenes = scenes.filter(s => !s.imageUrl);
    await runConcurrentGeneration(pendingScenes);
  };

  const handleRegenerateFailed = async () => {
    const failedScenes = scenes.filter(s => s.error || (s.imageUrl && s.imageUrl.includes('text=Generation+Failed')));
    // Reset errors before starting
    failedScenes.forEach(s => updateScene(s.id, { error: undefined, statusMessage: "Queued..." }));
    await runConcurrentGeneration(failedScenes);
  };

  if (isCheckingKey) {
     return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans text-gray-500">Initializing...</div>;
  }

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-gray-200">
           <h1 className="text-2xl font-bold mb-3 text-gray-900">API Key Required</h1>
           <p className="text-gray-600 mb-8">Access to Gemini 3 Pro Image requires a paid project API key.</p>
           <button onClick={handleSelectKey} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-lg">
             Select API Key
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />

      <main className="flex-grow max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {scenes.length === 0 && (
          <div className="mb-8 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Storyboard Studio</h2>
            <p className="text-gray-600">
              Paste your script. We'll break it down into 30+ scenes. You can generate text assets and visuals on demand.
            </p>
          </div>
        )}

        {scenes.length === 0 && (
          <ScriptInput 
            onAnalyze={handleAnalysis} 
            isAnalyzing={appState === AppState.ANALYZING} 
          />
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
            {error}
          </div>
        )}

        {scenes.length > 0 && (
          <SceneDashboard 
            scenes={scenes}
            onGenerateImage={handleGenerateSingleImage}
            onRefinePrompt={handleRefinePrompt}
            onUpdatePrompt={handleUpdatePrompt}
            onGenerateAll={handleGenerateAll}
            onRegenerateFailed={handleRegenerateFailed}
            onGenerateTextOverlay={handleGenerateTextOverlay}
            onGenerateAllText={handleGenerateAllTextAssets}
            isGeneratingAll={isGeneratingAll}
            isGeneratingAllText={isGeneratingAllText}
          />
        )}
      </main>
    </div>
  );
};

export default App;