import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import ScriptInput from './components/ScriptInput';
import SceneDashboard from './components/SceneDashboard';
import ScriptEditor from './components/ScriptEditor';
import { Scene, AppState } from './types';
import { analyzeScript, generateSceneImage, refinePrompt, generateTextOverlay } from './services/geminiService';
import { 
  CheckCircleIcon, 
  PencilSquareIcon, 
  Squares2X2Icon, 
  ChevronRightIcon 
} from '@heroicons/react/24/solid';

type Step = 'input' | 'editor' | 'visuals';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingAllText, setIsGeneratingAllText] = useState(false);
  
  // State for Flow
  const [fullScript, setFullScript] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<Step>('input');

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

  // 1. Handle Input (Paste or Generate) -> Go to Editor
  const handleScriptReady = (scriptText: string) => {
    setFullScript(scriptText);
    setCurrentStep('editor');
    // We don't analyze yet, we let user refine in Editor first
  };

  // 2. Handle Analyze (From Editor) -> Go to Visuals
  const handleAnalyzeFromEditor = useCallback(async (scriptText: string, model: string = 'gemini-3-flash-preview') => {
    setFullScript(scriptText);
    setAppState(AppState.ANALYZING);
    setError(null);
    setScenes([]);
    setCurrentStep('visuals');

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
      // Stay on visuals page to show error or allow retry
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

  const generateSingleImageWithRetry = async (id: number, prompt: string) => {
    let attempts = 0;
    const maxAttempts = 5; 

    while (attempts < maxAttempts) {
      try {
        updateScene(id, { isLoadingImage: true, error: undefined, statusMessage: attempts > 0 ? "Retrying..." : undefined });
        const imageUrl = await generateSceneImage(prompt);
        updateScene(id, { imageUrl, isLoadingImage: false, statusMessage: undefined });
        return; 
      } catch (err: any) {
        attempts++;
        const errMsg = err.message || JSON.stringify(err);
        
        if (errMsg.includes("generate_requests_per_model_per_day")) {
          updateScene(id, { isLoadingImage: false, error: "Daily Quota Exceeded", statusMessage: "Daily Limit Reached" });
          return;
        }

        if (errMsg.includes("429") || errMsg.includes("quota")) {
          const match = errMsg.match(/retry in ([\d\.]+)s/);
          let waitTimeMs = 30000;
          if (match && match[1]) {
            waitTimeMs = Math.ceil(parseFloat(match[1])) * 1000 + 1000;
          }
          const endTime = Date.now() + waitTimeMs;
          while (Date.now() < endTime) {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);
            updateScene(id, { statusMessage: `Rate limit hit. Retrying in ${remaining}s...` });
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          continue;
        }

        if (errMsg.includes("503") || errMsg.includes("overloaded") || errMsg.includes("UNAVAILABLE")) {
          const waitTimeMs = 5000 * attempts;
          const endTime = Date.now() + waitTimeMs;
          while (Date.now() < endTime) {
             const remaining = Math.ceil((endTime - Date.now()) / 1000);
             updateScene(id, { statusMessage: `Model busy (503). Retrying in ${remaining}s...` });
             await new Promise(resolve => setTimeout(resolve, 1000));
          }
          continue;
        }
        
        if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
           setError("Permission denied. Select API Key.");
           setHasApiKey(false);
           updateScene(id, { isLoadingImage: false, error: "Auth Failed", statusMessage: undefined });
           return;
        }

        console.error(`Error generating scene ${id}:`, err);
        updateScene(id, { isLoadingImage: false, error: "Failed", statusMessage: undefined });
        return;
      }
    }
    updateScene(id, { isLoadingImage: false, error: "Max Retries Exceeded", statusMessage: undefined });
  };

  const runConcurrentGeneration = async (scenesToGenerate: Scene[]) => {
    setIsGeneratingAll(true);
    const CONCURRENCY_LIMIT = 3;
    const queue = [...scenesToGenerate];
    const activePromises: Promise<void>[] = [];

    const processNext = async () => {
      if (queue.length === 0) return;
      const scene = queue.shift();
      if (!scene) return;

      const promise = generateSingleImageWithRetry(scene.id, scene.imagePrompt).finally(() => {
        activePromises.splice(activePromises.indexOf(promise), 1);
      });
      activePromises.push(promise);
      await promise; 
      if (queue.length > 0) await processNext();
    };

    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, queue.length); i++) {
      workers.push(processNext());
    }
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

  const steps = [
    { id: 'input', label: '1. Topic or Script' },
    { id: 'editor', label: '2. Refine Script' },
    { id: 'visuals', label: '3. Visual Storyboard' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-gray-800">
      <Header />

      {/* STEPPER NAVIGATION */}
      <div className="bg-white border-b border-gray-200 sticky top-[64px] z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isPast = steps.findIndex(s => s.id === currentStep) > index;
              const isFuture = steps.findIndex(s => s.id === currentStep) < index;
              
              return (
                <div 
                  key={step.id} 
                  className={`flex items-center ${isFuture ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => {
                    if (!isFuture) setCurrentStep(step.id as Step);
                  }}
                >
                  <div className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
                    ${isActive ? 'bg-black text-white shadow-md transform scale-105' : ''}
                    ${isPast ? 'text-green-600 hover:bg-green-50' : ''}
                    ${isFuture ? 'text-gray-400' : ''}
                    ${!isActive && !isFuture && !isPast ? 'text-gray-600' : ''}
                  `}>
                    {isPast ? <CheckCircleIcon className="w-5 h-5" /> : null}
                    <span>{step.label}</span>
                  </div>
                  
                  {index < steps.length - 1 && (
                     <div className="w-8 h-px bg-gray-300 mx-2 hidden sm:block"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <main className="flex-grow w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* STEP 1: INPUT */}
        {currentStep === 'input' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
            <div className="text-center mb-8">
               <h2 className="text-3xl font-black text-gray-900 mb-2">Let's Start Creating</h2>
               <p className="text-lg text-gray-600">Enter a topic to generate a script, or paste your own.</p>
            </div>
            <ScriptInput 
              onAnalyze={(script) => handleScriptReady(script)} 
              isAnalyzing={false} // No longer analyzing here, just passing data
            />
          </div>
        )}

        {/* STEP 2: EDITOR */}
        {currentStep === 'editor' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
             <ScriptEditor 
                script={fullScript}
                onChange={setFullScript}
                onUpdateStoryboard={() => handleAnalyzeFromEditor(fullScript)}
                isUpdating={appState === AppState.ANALYZING}
              />
          </div>
        )}

        {/* STEP 3: VISUALS */}
        {currentStep === 'visuals' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
                <div className="font-bold">Error:</div> {error}
              </div>
            )}
            
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
          </div>
        )}

      </main>
    </div>
  );
};

export default App;