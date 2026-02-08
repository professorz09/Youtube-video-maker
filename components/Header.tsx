import React from 'react';

interface HeaderProps {
  currentStep: string;
}

const Header: React.FC<HeaderProps> = ({ currentStep }) => {
  return (
    <header style={{
      background: 'rgba(10, 10, 15, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: '800',
              margin: 0,
              letterSpacing: '-0.5px',
            }}>
              <span style={{ color: '#f0f0f5' }}>Video</span>
              <span className="gradient-text">Forge</span>
              <span style={{ color: '#6b7280', fontWeight: 500, fontSize: '13px', marginLeft: '6px' }}>AI</span>
            </h1>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span className="badge badge-purple">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Gemini + ElevenLabs
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
