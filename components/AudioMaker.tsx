import React, { useState, useRef, useEffect } from 'react';
import { getVoices, generateSpeechStream, ElevenLabsVoice } from '../services/elevenlabsService';

interface AudioMakerProps {
  script: string;
}

const AudioMaker: React.FC<AudioMakerProps> = ({ script }) => {
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('elevenlabs_api_key') || ''; } catch { return ''; }
  });
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [speed, setSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewVoiceId, setPreviewVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (apiKey && isApiKeySet) {
      loadVoices();
    }
  }, [apiKey, isApiKeySet]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    setError(null);
    try {
      const voiceList = await getVoices(apiKey);
      setVoices(voiceList);
      if (voiceList.length > 0 && !selectedVoice) {
        setSelectedVoice(voiceList[0].voice_id);
        setSelectedVoiceName(voiceList[0].name);
      }
    } catch (err: any) {
      setError('Invalid API key or failed to load voices. Please check your key.');
      setIsApiKeySet(false);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleSetApiKey = () => {
    if (apiKey.trim()) {
      try { localStorage.setItem('elevenlabs_api_key', apiKey.trim()); } catch {}
      setIsApiKeySet(true);
    }
  };

  const handleGenerate = async () => {
    if (!script.trim() || !selectedVoice) return;

    setIsGenerating(true);
    setError(null);

    try {
      const url = await generateSpeechStream(apiKey, script, selectedVoice, stability, similarityBoost, speed);
      setAudioUrl(url);
    } catch (err: any) {
      setError(err.message || 'Failed to generate audio');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voiceover_${new Date().toISOString().slice(0, 10)}.mp3`;
    a.click();
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePreviewVoice = (voice: ElevenLabsVoice) => {
    if (voice.preview_url) {
      setPreviewVoiceId(voice.voice_id);
      if (previewAudioRef.current) {
        previewAudioRef.current.src = voice.preview_url;
        previewAudioRef.current.play();
        previewAudioRef.current.onended = () => setPreviewVoiceId(null);
      }
    }
  };

  // API Key Entry Screen
  if (!isApiKeySet) {
    return (
      <div className="animate-fadeInUp" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(16, 185, 129, 0.15)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#f0f0f5', margin: '0 0 8px 0' }}>
            Audio Maker
          </h2>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
            Connect your ElevenLabs account to generate AI voiceovers
          </p>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#f0f0f5', marginBottom: '8px' }}>
            ElevenLabs API Key
          </label>
          <input
            type="password"
            className="input-dark"
            placeholder="Enter your ElevenLabs API key..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetApiKey()}
          />
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '8px 0 20px 0' }}>
            Get your API key from elevenlabs.io/settings. Your key is stored locally in your browser.
          </p>

          <button
            onClick={handleSetApiKey}
            disabled={!apiKey.trim()}
            className="btn-green"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '14px 24px',
              fontSize: '15px',
              opacity: !apiKey.trim() ? 0.5 : 1,
              cursor: !apiKey.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
            Connect ElevenLabs
          </button>
        </div>
      </div>
    );
  }

  // Main Audio Maker UI
  return (
    <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <audio ref={previewAudioRef} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f0f0f5', margin: '0 0 4px 0' }}>
            Audio Maker
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Generate AI voiceover for your script using ElevenLabs
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-green">ElevenLabs Connected</span>
          <button
            className="btn-ghost"
            onClick={() => { setIsApiKeySet(false); setAudioUrl(null); }}
            style={{ fontSize: '11px', color: '#ef4444' }}
          >
            Disconnect
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        {/* Voice Selection */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f0f0f5', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Select Voice
            {isLoadingVoices && <div className="spinner-blue" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />}
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '10px',
            maxHeight: '300px',
            overflowY: 'auto',
            paddingRight: '4px',
          }}>
            {voices.map(voice => (
              <div
                key={voice.voice_id}
                className={`voice-card ${selectedVoice === voice.voice_id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedVoice(voice.voice_id);
                  setSelectedVoiceName(voice.name);
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#f0f0f5', marginBottom: '4px' }}>
                      {voice.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      {voice.labels?.accent || voice.labels?.gender || voice.category || 'Voice'}
                    </div>
                  </div>
                  {voice.preview_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewVoice(voice);
                      }}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: previewVoiceId === voice.voice_id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {previewVoiceId === voice.voice_id ? (
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '14px' }}>
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="waveform-bar" style={{ height: '8px' }} />
                          ))}
                        </div>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Voice Settings */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f0f0f5', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Voice Settings
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Stability */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>Stability</label>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#f0f0f5' }}>{Math.round(stability * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={stability}
                onChange={(e) => setStability(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#4b5563', marginTop: '4px' }}>
                <span>Variable</span>
                <span>Stable</span>
              </div>
            </div>

            {/* Similarity */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>Clarity + Similarity</label>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#f0f0f5' }}>{Math.round(similarityBoost * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={similarityBoost}
                onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#8b5cf6' }}
              />
            </div>

            {/* Speed */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>Speed</label>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#f0f0f5' }}>{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#4b5563', marginTop: '4px' }}>
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Script Preview */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f0f0f5', margin: '0 0 12px 0' }}>
          Script to Convert
        </h3>
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: '10px',
          padding: '16px',
          maxHeight: '200px',
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            lineHeight: '1.7',
            color: '#d1d5db',
            whiteSpace: 'pre-wrap',
          }}>
            {script || 'No script available. Go back and create a script first.'}
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            {script.split(/\s+/).filter(w => w.length > 0).length} words
          </span>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            Voice: {selectedVoiceName || 'None selected'}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '10px',
          color: '#f87171',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !script.trim() || !selectedVoice}
        className="btn-green"
        style={{
          width: '100%',
          justifyContent: 'center',
          padding: '16px 24px',
          fontSize: '15px',
          fontWeight: '700',
          borderRadius: '14px',
          opacity: (isGenerating || !script.trim() || !selectedVoice) ? 0.5 : 1,
          cursor: (isGenerating || !script.trim() || !selectedVoice) ? 'not-allowed' : 'pointer',
        }}
      >
        {isGenerating ? (
          <>
            <div className="spinner" />
            Generating Audio...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            Generate Voiceover
          </>
        )}
      </button>

      {/* Audio Player */}
      {audioUrl && (
        <div className="glass-card animate-fadeInUp" style={{ padding: '24px' }}>
          <audio ref={audioRef} src={audioUrl} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"/>
                  <rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )}
            </button>

            {/* Progress + Time */}
            <div style={{ flex: 1 }}>
              <div
                className="audio-progress"
                onClick={handleSeek}
                style={{ marginBottom: '8px' }}
              >
                <div
                  className="audio-progress-fill"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Waveform Visual */}
          {isPlaying && (
            <div style={{
              display: 'flex',
              gap: '3px',
              alignItems: 'center',
              justifyContent: 'center',
              height: '24px',
              marginBottom: '16px',
            }}>
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="waveform-bar"
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    opacity: 0.6 + Math.random() * 0.4,
                  }}
                />
              ))}
            </div>
          )}

          {/* Download */}
          <button
            onClick={handleDownload}
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Audio
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioMaker;
