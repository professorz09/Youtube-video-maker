import React, { useState } from 'react';
import { generateScriptFromTopic } from '../services/geminiService';

interface ScriptInputProps {
  onAnalyze: (script: string, model: string) => void;
  isAnalyzing: boolean;
}

type InputMode = 'topic' | 'paste';

const ScriptInput: React.FC<ScriptInputProps> = ({ onAnalyze, isAnalyzing }) => {
  const [mode, setMode] = useState<InputMode>('topic');
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('1 min');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const modelId = 'gemini-3-flash-preview';

    if (mode === 'paste') {
      if (text.trim()) onAnalyze(text, modelId);
    } else {
      if (topic.trim()) {
        setIsGeneratingScript(true);
        try {
          const generatedScript = await generateScriptFromTopic(topic, duration);
          onAnalyze(generatedScript, modelId);
        } catch (error) {
          console.error("Script generation failed", error);
          alert("Failed to generate script. Please try again.");
        } finally {
          setIsGeneratingScript(false);
        }
      }
    }
  };

  const loadExample = () => {
    setMode('paste');
    setText(`For most of modern history:
- Men drove.
- Women stayed home.
- Roads were designed, regulated, and controlled by men.

In this video, we ask: Are women actually worse drivers? Or is the system rigged?
Let's look at the data comparing different demographics and safety records.`);
  };

  const isLoading = isAnalyzing || isGeneratingScript;
  const isDisabled = isLoading || (mode === 'paste' ? !text.trim() : !topic.trim());

  const durations = [
    { label: 'Short', value: '1 min', desc: '~1 min', icon: '⚡' },
    { label: 'Medium', value: '8-12 min', desc: '~10 min', icon: '📹' },
    { label: 'Long', value: '15 min', desc: '~15 min', icon: '🎬' },
  ];

  return (
    <div className="animate-fadeInUp" style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#a78bfa',
          marginBottom: '16px',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          AI-Powered Video Pipeline
        </div>
        <h2 style={{
          fontSize: '36px',
          fontWeight: '900',
          color: '#f0f0f5',
          margin: '0 0 8px 0',
          letterSpacing: '-1px',
          lineHeight: 1.1,
        }}>
          Start Creating
        </h2>
        <p style={{
          fontSize: '16px',
          color: '#9ca3af',
          margin: 0,
          lineHeight: 1.5,
        }}>
          Enter a topic or paste your script to get started
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="tab-group" style={{ marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setMode('topic')}
          className={`tab-item ${mode === 'topic' ? 'active' : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          Generate from Topic
        </button>
        <button
          type="button"
          onClick={() => setMode('paste')}
          className={`tab-item ${mode === 'paste' ? 'active' : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Paste Script
        </button>
      </div>

      {/* Content Card */}
      <div className="glass-card" style={{ padding: '32px' }}>
        <form onSubmit={handleSubmit}>
          {mode === 'topic' ? (
            <div className="animate-fadeIn">
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '700',
                color: '#f0f0f5',
                marginBottom: '8px',
              }}>
                What's your video about?
              </label>
              <input
                type="text"
                className="input-dark"
                placeholder="e.g., Why cats always land on their feet..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isLoading}
                style={{ fontSize: '16px', marginBottom: '24px' }}
              />

              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '700',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px',
              }}>
                Target Duration
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                marginBottom: '8px',
              }}>
                {durations.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDuration(opt.value)}
                    style={{
                      padding: '14px 12px',
                      borderRadius: '12px',
                      border: duration === opt.value
                        ? '2px solid #3b82f6'
                        : '1px solid rgba(255,255,255,0.08)',
                      background: duration === opt.value
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{opt.icon}</div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: duration === opt.value ? '#3b82f6' : '#f0f0f5',
                    }}>
                      {opt.label}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      marginTop: '2px',
                    }}>
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#f0f0f5',
                }}>
                  Your Script
                </label>
                <button
                  type="button"
                  onClick={loadExample}
                  className="btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  Try Example
                </button>
              </div>
              <textarea
                className="textarea-dark"
                placeholder="Paste your YouTube video script here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isLoading}
                style={{ height: '220px' }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '6px',
              }}>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                  {text.split(/\s+/).filter(w => w.length > 0).length} words
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isDisabled}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '16px 24px',
              fontSize: '15px',
              fontWeight: '700',
              marginTop: '24px',
              justifyContent: 'center',
              borderRadius: '14px',
              opacity: isDisabled ? 0.5 : 1,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <div className="spinner" />
                <span>{isGeneratingScript ? 'Writing Script...' : 'Processing...'}</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                {mode === 'topic' ? 'Generate Script' : 'Continue to Editor'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ScriptInput;
