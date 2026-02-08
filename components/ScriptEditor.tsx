import React, { useState, useRef, useEffect, useCallback } from 'react';
import { rewriteText } from '../services/geminiService';
import { ScriptBlock } from '../types';

interface ScriptEditorProps {
  script: string;
  onChange: (newScript: string) => void;
  onUpdateStoryboard: () => void;
  isUpdating: boolean;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ script, onChange, onUpdateStoryboard, isUpdating }) => {
  const [blocks, setBlocks] = useState<ScriptBlock[]>([]);
  const [rewritingBlockId, setRewritingBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [fullEditMode, setFullEditMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse script into blocks
  useEffect(() => {
    const paragraphs = script.split('\n\n').filter(p => p.trim());
    const newBlocks: ScriptBlock[] = paragraphs.map((text, i) => ({
      id: `block-${i}`,
      text: text.trim(),
      isEditing: false,
    }));
    setBlocks(newBlocks);
  }, [script]);

  // Sync blocks back to script
  const syncBlocksToScript = useCallback((updatedBlocks: ScriptBlock[]) => {
    const newScript = updatedBlocks.map(b => b.text).join('\n\n');
    onChange(newScript);
  }, [onChange]);

  const handleBlockTextChange = (blockId: string, newText: string) => {
    const updated = blocks.map(b => b.id === blockId ? { ...b, text: newText } : b);
    setBlocks(updated);
    syncBlocksToScript(updated);
  };

  const handleRewriteBlock = async (blockId: string, mode: 'funny' | 'concise' | 'detailed' | 'professional') => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    setRewritingBlockId(blockId);
    try {
      const rewritten = await rewriteText(block.text, mode);
      const updated = blocks.map(b => b.id === blockId ? { ...b, text: rewritten } : b);
      setBlocks(updated);
      syncBlocksToScript(updated);
    } catch (error) {
      console.error("Rewrite failed", error);
    } finally {
      setRewritingBlockId(null);
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    const updated = blocks.filter(b => b.id !== blockId);
    setBlocks(updated);
    syncBlocksToScript(updated);
  };

  const handleAddBlock = (afterId: string) => {
    const idx = blocks.findIndex(b => b.id === afterId);
    const newBlock: ScriptBlock = {
      id: `block-${Date.now()}`,
      text: '',
      isEditing: true,
    };
    const updated = [...blocks];
    updated.splice(idx + 1, 0, newBlock);
    setBlocks(updated);
    setActiveBlockId(newBlock.id);
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (direction === 'up' && idx > 0) {
      const updated = [...blocks];
      [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
      setBlocks(updated);
      syncBlocksToScript(updated);
    } else if (direction === 'down' && idx < blocks.length - 1) {
      const updated = [...blocks];
      [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
      setBlocks(updated);
      syncBlocksToScript(updated);
    }
  };

  const wordCount = script.split(/\s+/).filter(w => w.length > 0).length;

  const rewriteTools = [
    { mode: 'funny' as const, label: 'Funny', icon: '😄', color: '#a78bfa' },
    { mode: 'concise' as const, label: 'Shorten', icon: '✂️', color: '#3b82f6' },
    { mode: 'detailed' as const, label: 'Expand', icon: '📝', color: '#10b981' },
    { mode: 'professional' as const, label: 'Pro', icon: '💼', color: '#f59e0b' },
  ];

  return (
    <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f0f0f5', margin: '0 0 4px 0' }}>
            Edit Script
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Click any paragraph to edit. Use AI tools to rewrite sections.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-blue">{wordCount} words</span>
          <span className="badge badge-green">{blocks.length} paragraphs</span>
          <button
            className="btn-ghost"
            onClick={() => setFullEditMode(!fullEditMode)}
            style={{ fontSize: '12px' }}
          >
            {fullEditMode ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                Block View
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Full Edit
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {fullEditMode ? (
          /* Full text editor mode */
          <div style={{ padding: '24px' }}>
            <textarea
              ref={textareaRef}
              value={script}
              onChange={(e) => onChange(e.target.value)}
              className="textarea-dark"
              style={{
                minHeight: '500px',
                fontSize: '15px',
                lineHeight: '1.8',
                background: 'var(--bg-primary)',
              }}
              placeholder="Start writing your script..."
              spellCheck={false}
            />
          </div>
        ) : (
          /* Block editor mode */
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {blocks.map((block, index) => (
              <div
                key={block.id}
                className={`script-block ${activeBlockId === block.id ? 'editing' : ''}`}
                onClick={() => setActiveBlockId(block.id)}
                style={{ opacity: 1, animation: `fadeInUp 0.3s ease-out ${index * 0.03}s both` }}
              >
                {/* Block number */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <div style={{
                    minWidth: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#3b82f6',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>
                    {index + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {activeBlockId === block.id ? (
                      <textarea
                        value={block.text}
                        onChange={(e) => handleBlockTextChange(block.id, e.target.value)}
                        autoFocus
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          background: 'transparent',
                          border: 'none',
                          color: '#f0f0f5',
                          fontSize: '14px',
                          lineHeight: '1.7',
                          resize: 'vertical',
                          outline: 'none',
                          fontFamily: 'inherit',
                          padding: 0,
                        }}
                        onBlur={() => {
                          if (block.text.trim() === '') {
                            handleDeleteBlock(block.id);
                          }
                        }}
                      />
                    ) : (
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        lineHeight: '1.7',
                        color: '#d1d5db',
                        cursor: 'text',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {block.text || <span style={{ color: '#4b5563', fontStyle: 'italic' }}>Empty paragraph - click to edit</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Block Toolbar - shows on active */}
                {activeBlockId === block.id && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    flexWrap: 'wrap',
                  }}>
                    {/* AI Rewrite Tools */}
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '4px' }}>
                      AI:
                    </span>
                    {rewriteTools.map(tool => (
                      <button
                        key={tool.mode}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRewriteBlock(block.id, tool.mode);
                        }}
                        disabled={rewritingBlockId === block.id}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'var(--bg-elevated)',
                          color: tool.color,
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s',
                          opacity: rewritingBlockId === block.id ? 0.5 : 1,
                        }}
                      >
                        <span>{tool.icon}</span>
                        {tool.label}
                      </button>
                    ))}

                    {rewritingBlockId === block.id && (
                      <span style={{
                        fontSize: '11px',
                        color: '#a78bfa',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginLeft: '4px',
                      }}>
                        <div className="spinner-blue" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                        Rewriting...
                      </span>
                    )}

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Move / Delete controls */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveBlock(block.id, 'up'); }}
                      disabled={index === 0}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'transparent',
                        color: index === 0 ? '#374151' : '#6b7280',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveBlock(block.id, 'down'); }}
                      disabled={index === blocks.length - 1}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'transparent',
                        color: index === blocks.length - 1 ? '#374151' : '#6b7280',
                        cursor: index === blocks.length - 1 ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                      }}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddBlock(block.id); }}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'transparent',
                        color: '#10b981',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                      title="Add paragraph below"
                    >
                      +
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                      title="Delete paragraph"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Add new paragraph button */}
            <button
              onClick={() => {
                const newBlock: ScriptBlock = {
                  id: `block-${Date.now()}`,
                  text: '',
                  isEditing: true,
                };
                const updated = [...blocks, newBlock];
                setBlocks(updated);
                setActiveBlockId(newBlock.id);
              }}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '2px dashed rgba(255,255,255,0.08)',
                background: 'transparent',
                color: '#4b5563',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                e.currentTarget.style.color = '#3b82f6';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = '#4b5563';
              }}
            >
              + Add Paragraph
            </button>
          </div>
        )}

        {/* Footer Action */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {blocks.length} paragraphs / {wordCount} words
          </span>
          <button
            onClick={onUpdateStoryboard}
            disabled={isUpdating}
            className="btn-primary"
            style={{
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: '700',
            }}
          >
            {isUpdating ? (
              <>
                <div className="spinner" />
                Analyzing Script...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Generate Storyboard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptEditor;
