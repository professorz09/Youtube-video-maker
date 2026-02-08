import React, { useState } from 'react';
import { Scene } from '../types';
import JSZip from 'jszip';

interface SceneDashboardProps {
  scenes: Scene[];
  onGenerateImage: (id: number, prompt: string) => void;
  onRefinePrompt: (id: number, currentPrompt: string) => void;
  onUpdatePrompt: (id: number, newPrompt: string) => void;
  onGenerateAll: () => void;
  onRegenerateFailed: () => void;
  onGenerateTextOverlay: (id: number, narration: string) => void;
  onGenerateAllText: () => void;
  isGeneratingAll: boolean;
  isGeneratingAllText: boolean;
}

const SceneDashboard: React.FC<SceneDashboardProps> = ({
  scenes,
  onGenerateImage,
  onRefinePrompt,
  onUpdatePrompt,
  onGenerateAll,
  onRegenerateFailed,
  onGenerateTextOverlay,
  onGenerateAllText,
  isGeneratingAll,
  isGeneratingAllText
}) => {
  const [isZipping, setIsZipping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isVoiceoverCopied, setIsVoiceoverCopied] = useState(false);
  const [expandedScene, setExpandedScene] = useState<number | null>(null);

  const fullVoiceover = scenes.map(s => s.narration).join('\n\n');

  const handleDownload = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyVoiceover = () => {
    navigator.clipboard.writeText(fullVoiceover);
    setIsVoiceoverCopied(true);
    setTimeout(() => setIsVoiceoverCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    const generatedScenes = scenes.filter(s => s.imageUrl && !s.imageUrl.includes("placehold.co"));
    if (generatedScenes.length === 0) { alert("No images generated yet!"); return; }

    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("storyboard_images");
      if (!folder) return;

      const promises = generatedScenes.map(async (scene, index) => {
        if (!scene.imageUrl) return;
        const response = await fetch(scene.imageUrl);
        const blob = await response.blob();
        folder.file(`scene_${(index + 1).toString().padStart(3, '0')}.png`, blob);
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `storyboard_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to zip", e);
    } finally {
      setIsZipping(false);
    }
  };

  const hasFailedImages = scenes.some(s => s.error);
  const completedCount = scenes.filter(s => s.imageUrl).length;
  const progressPct = scenes.length ? (completedCount / scenes.length) * 100 : 0;

  return (
    <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f0f0f5', margin: '0 0 4px 0' }}>
            Visual Storyboard
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            {scenes.length} scenes generated from your script
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-blue">{completedCount}/{scenes.length} images</span>
        </div>
      </div>

      {/* Progress Bar */}
      {scenes.length > 0 && (
        <div style={{
          width: '100%',
          height: '4px',
          background: 'var(--bg-card)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressPct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            borderRadius: '2px',
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}

      {/* Action Bar */}
      <div className="glass-card-sm" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
      }}>
        {hasFailedImages && (
          <button onClick={onRegenerateFailed} disabled={isGeneratingAll} className="btn-danger" style={{ fontSize: '12px', padding: '8px 14px' }}>
            Retry Failed
          </button>
        )}
        <button
          onClick={onGenerateAllText}
          disabled={isGeneratingAllText}
          className="btn-secondary"
          style={{ fontSize: '12px', padding: '8px 14px' }}
        >
          {isGeneratingAllText ? <div className="spinner-blue" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> : null}
          Gen All Text
        </button>
        <button
          onClick={onGenerateAll}
          disabled={isGeneratingAll || scenes.length === 0}
          className="btn-green"
          style={{ fontSize: '12px', padding: '8px 14px' }}
        >
          {isGeneratingAll ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> : null}
          Generate All Images
        </button>
        <button
          onClick={handleDownloadZip}
          disabled={isZipping || scenes.every(s => !s.imageUrl)}
          className="btn-secondary"
          style={{ fontSize: '12px', padding: '8px 14px' }}
        >
          {isZipping ? <div className="spinner-blue" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )}
          Download ZIP
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleCopyVoiceover}
          className="btn-ghost"
          style={{ fontSize: '12px' }}
        >
          {isVoiceoverCopied ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Script</>
          )}
        </button>
      </div>

      {/* Scene Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))',
        gap: '16px',
      }}>
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            className="scene-card"
            style={{
              animation: `fadeInUp 0.3s ease-out ${index * 0.03}s both`,
            }}
          >
            {/* Scene Image */}
            <div style={{
              aspectRatio: '16/9',
              background: 'var(--bg-secondary)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              {scene.imageUrl ? (
                <>
                  <img src={scene.imageUrl} alt={`Scene ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex',
                    gap: '4px',
                    opacity: 0.8,
                  }}>
                    <button
                      onClick={() => handleDownload(scene.imageUrl!, `scene-${index + 1}.png`)}
                      style={{
                        width: '30px', height: '30px', borderRadius: '8px',
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                        border: 'none', color: 'white', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                  </div>
                </>
              ) : scene.isLoadingImage ? (
                <div style={{ textAlign: 'center', color: '#3b82f6', padding: '16px' }}>
                  <div className="spinner-blue" style={{ margin: '0 auto 8px' }} />
                  <span style={{ fontSize: '12px', fontWeight: '600', display: 'block' }}>{scene.statusMessage || 'Generating...'}</span>
                </div>
              ) : scene.error ? (
                <div style={{ textAlign: 'center', color: '#ef4444', padding: '16px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>!</div>
                  <span style={{ fontSize: '11px', fontWeight: '600' }}>{scene.error}</span>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#4b5563', padding: '16px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <div style={{ fontSize: '11px', marginTop: '6px' }}>Ready to Generate</div>
                </div>
              )}

              {/* Scene Number Badge */}
              <div style={{
                position: 'absolute', top: '8px', left: '8px',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                color: 'white', fontWeight: '700', fontSize: '11px',
                padding: '3px 8px', borderRadius: '6px',
              }}>
                #{index + 1}
              </div>
            </div>

            {/* Scene Content */}
            <div style={{ padding: '16px' }}>
              {/* Narration */}
              <p style={{
                margin: '0 0 12px 0',
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#d1d5db',
              }}>
                "{scene.narration}"
              </p>

              {/* Text Overlay Preview */}
              {scene.textOverlay ? (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  marginBottom: '12px',
                  textAlign: 'center',
                }}>
                  {scene.textOverlay.heading && (
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase' }}>
                      {scene.textOverlay.heading}
                    </div>
                  )}
                  {scene.textOverlay.points?.map((p, i) => (
                    <div key={i} style={{ fontSize: '10px', color: '#9ca3af' }}>{p}</div>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => onGenerateTextOverlay(scene.id, scene.narration)}
                  disabled={scene.isLoadingTextOverlay}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: '#6b7280',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  {scene.isLoadingTextOverlay ? <div className="spinner-blue" style={{ width: '12px', height: '12px', borderWidth: '2px' }} /> : '+ Text Asset'}
                </button>
              )}

              {/* Expandable Prompt */}
              <div style={{ marginBottom: '12px' }}>
                <button
                  onClick={() => setExpandedScene(expandedScene === scene.id ? null : scene.id)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '6px',
                    color: '#6b7280',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Image Prompt</span>
                  <span style={{ transform: expandedScene === scene.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </span>
                </button>
                {expandedScene === scene.id && (
                  <div style={{ marginTop: '8px' }}>
                    <textarea
                      value={scene.imagePrompt}
                      onChange={(e) => onUpdatePrompt(scene.id, e.target.value)}
                      className="textarea-dark"
                      style={{ height: '80px', fontSize: '12px', lineHeight: '1.5' }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      <button
                        onClick={() => handleCopyPrompt(scene.id, scene.imagePrompt)}
                        className="btn-ghost"
                        style={{ fontSize: '10px', padding: '3px 8px' }}
                      >
                        {copiedId === scene.id ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={() => onRefinePrompt(scene.id, scene.imagePrompt)}
                        disabled={scene.isRefining}
                        className="btn-ghost"
                        style={{ fontSize: '10px', padding: '3px 8px', color: '#a78bfa' }}
                      >
                        {scene.isRefining ? 'Refining...' : 'AI Refine'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={() => onGenerateImage(scene.id, scene.imagePrompt)}
                disabled={scene.isLoadingImage}
                className={scene.error ? 'btn-danger' : scene.imageUrl ? 'btn-secondary' : 'btn-primary'}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: '12px',
                  padding: '8px 16px',
                  opacity: scene.isLoadingImage ? 0.5 : 1,
                }}
              >
                {scene.isLoadingImage ? (
                  <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                ) : null}
                {scene.imageUrl ? 'Regenerate' : (scene.error ? 'Retry' : 'Generate Image')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Voiceover Script Section */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f0f0f5', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Full Voiceover Script
          </h3>
          <button
            onClick={handleCopyVoiceover}
            className="btn-ghost"
            style={{ fontSize: '12px' }}
          >
            {isVoiceoverCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
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
            color: '#9ca3af',
            whiteSpace: 'pre-wrap',
          }}>
            {fullVoiceover}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SceneDashboard;
