import React from 'react';
import { Scene } from '../types';

interface SceneCardProps {
  scene: Scene;
  index: number;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, index }) => {
  const hasTextOverlay = scene.textOverlay && (scene.textOverlay.heading || (scene.textOverlay.points && scene.textOverlay.points.length > 0));

  return (
    <div className="scene-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          background: 'rgba(59, 130, 246, 0.15)',
          color: '#3b82f6',
          fontWeight: '700',
          fontSize: '12px',
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {index + 1}
        </div>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: '#d1d5db', flex: 1 }}>
          "{scene.narration}"
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Image */}
        <div style={{
          aspectRatio: '16/9',
          background: 'var(--bg-secondary)',
          borderRadius: '10px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${scene.error ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.06)'}`,
        }}>
          {scene.imageUrl ? (
            <img src={scene.imageUrl} alt={`Scene ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : scene.isLoadingImage ? (
            <div style={{ textAlign: 'center', color: '#3b82f6' }}>
              <div className="spinner-blue" style={{ margin: '0 auto 8px' }} />
              <span style={{ fontSize: '12px', fontWeight: '600' }}>{scene.statusMessage || 'Generating...'}</span>
            </div>
          ) : scene.error ? (
            <div style={{ textAlign: 'center', color: '#ef4444' }}>
              <span style={{ fontSize: '24px' }}>!</span>
              <div style={{ fontSize: '11px', fontWeight: '600' }}>Failed</div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#4b5563' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Ready</div>
            </div>
          )}
        </div>

        {/* Text Overlay */}
        {hasTextOverlay && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '8px',
            padding: '10px',
            textAlign: 'center',
          }}>
            {scene.textOverlay?.heading && (
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', marginBottom: '4px' }}>
                {scene.textOverlay.heading}
              </div>
            )}
            {scene.textOverlay?.points?.map((p, i) => (
              <div key={i} style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600' }}>{p}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneCard;
