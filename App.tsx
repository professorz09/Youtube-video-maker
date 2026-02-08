import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import ScriptInput from './components/ScriptInput';
import SceneDashboard from './components/SceneDashboard';
import ScriptEditor from './components/ScriptEditor';
import AudioMaker from './components/AudioMaker';
import { Scene, AppState } from './types';
import { analyzeScript, generateSceneImage, refinePrompt, generateTextOverlay } from './services/geminiService';

type Step = 'input' | 'editor' | 'visuals' | 'audio';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingAllText, setIsGeneratingAllText] = useState(false);
  const [fullScript, setFullScript] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<Step>('input');

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

  const handleScriptReady = (scriptText: string) => {
    setFullScript(scriptText);
    setCurrentStep('editor');
  };

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
          if (match && match[1]) { waitTimeMs = Math.ceil(parseFloat(match[1])) * 1000 + 1000; }
          const endTime = Date.now() + waitTimeMs;
          while (Date.now() < endTime) {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);
            updateScene(id, { statusMessage: `Rate limit. Retrying in ${remaining}s...` });
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          continue;
        }
        if (errMsg.includes("503") || errMsg.includes("overloaded") || errMsg.includes("UNAVAILABLE")) {
          const waitTimeMs = 5000 * attempts;
          const endTime = Date.now() + waitTimeMs;
          while (Date.now() < endTime) {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);
            updateScene(id, { statusMessage: `Model busy. Retrying in ${remaining}s...` });
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

  // Loading state
  if (isCheckingKey) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-blue" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }} />
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Initializing...</p>
        </div>
      </div>
    );
  }

  // API key required
  if (!hasApiKey) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div className="bg-pattern" />
        <div className="glass-card" style={{ maxWidth: '420px', width: '100%', padding: '40px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#f0f0f5', marginBottom: '8px' }}>API Key Required</h1>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '28px' }}>Select your Gemini API key to get started.</p>
          <button onClick={handleSelectKey} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: '15px' }}>
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 'input' as const, label: 'Script', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    )},
    { id: 'editor' as const, label: 'Edit', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    )},
    { id: 'visuals' as const, label: 'Visuals', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
    )},
    { id: 'audio' as const, label: 'Audio', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    )},
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-pattern" />

      <Header currentStep={currentStep} />

      {/* Stepper Navigation */}
      <div style={{
        background: 'rgba(10, 10, 15, 0.7)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: '64px',
        zIndex: 40,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          height: '52px',
          gap: '4px',
          overflowX: 'auto',
        }}>
          {steps.map((step, index) => {
            const isActive = currentStep === step.id;
            const isPast = currentStepIndex > index;
            const isFuture = currentStepIndex < index;

            return (
              <React.Fragment key={step.id}>
                <button
                  className={`step-item ${isActive ? 'active' : ''} ${isPast ? 'completed' : ''} ${isFuture ? 'future' : ''}`}
                  onClick={() => {
                    if (!isFuture) setCurrentStep(step.id);
                  }}
                  style={{ border: 'none' }}
                >
                  {isPast ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : step.icon}
                  <span>{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <div style={{
                    width: '24px',
                    height: '1px',
                    background: isPast ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.08)',
                    flexShrink: 0,
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main style={{
        flex: 1,
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Step 1: Input */}
        {currentStep === 'input' && (
          <ScriptInput
            onAnalyze={(script) => handleScriptReady(script)}
            isAnalyzing={false}
          />
        )}

        {/* Step 2: Editor */}
        {currentStep === 'editor' && (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <ScriptEditor
              script={fullScript}
              onChange={setFullScript}
              onUpdateStoryboard={() => handleAnalyzeFromEditor(fullScript)}
              isUpdating={appState === AppState.ANALYZING}
            />
          </div>
        )}

        {/* Step 3: Visuals */}
        {currentStep === 'visuals' && (
          <div>
            {error && (
              <div style={{
                padding: '14px 18px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                color: '#f87171',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span style={{ fontSize: '18px' }}>!</span>
                {error}
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

            {/* Navigate to Audio */}
            {scenes.length > 0 && (
              <div style={{
                marginTop: '24px',
                display: 'flex',
                justifyContent: 'flex-end',
              }}>
                <button
                  onClick={() => setCurrentStep('audio')}
                  className="btn-green"
                  style={{ padding: '14px 28px', fontSize: '14px' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  </svg>
                  Generate Audio
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Audio */}
        {currentStep === 'audio' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <AudioMaker script={fullScript} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
