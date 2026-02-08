import React, { useState, useRef } from 'react';
import { 
  SparklesIcon, 
  ArrowPathIcon, 
  ChatBubbleBottomCenterTextIcon, 
  ScissorsIcon,
  FaceSmileIcon,
  BriefcaseIcon,
  PlayCircleIcon
} from '@heroicons/react/24/solid';
import { rewriteText } from '../services/geminiService';

interface ScriptEditorProps {
  script: string;
  onChange: (newScript: string) => void;
  onUpdateStoryboard: () => void;
  isUpdating: boolean;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ script, onChange, onUpdateStoryboard, isUpdating }) => {
  const [isRewriting, setIsRewriting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleRewrite = async (mode: 'funny' | 'concise' | 'detailed' | 'professional') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      alert("Please select a sentence or paragraph to rewrite.");
      return;
    }

    const selectedText = script.substring(start, end);
    setIsRewriting(true);

    try {
      const rewritten = await rewriteText(selectedText, mode);
      const newScript = script.substring(0, start) + rewritten + script.substring(end);
      onChange(newScript);
    } catch (error) {
      console.error("Rewrite failed", error);
      alert("Failed to rewrite text. Try again.");
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] gap-4">
      
      {/* Header / Info */}
      <div className="flex justify-between items-end px-2">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Review & Edit Script</h2>
           <p className="text-gray-500 text-sm">Select text to use AI rewrite tools.</p>
        </div>
        <div className="text-sm font-mono text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
          {script.split(/\s+/).filter(w => w.length > 0).length} words
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col flex-grow relative">
        
        {/* Sticky Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 p-3 flex flex-wrap gap-2 items-center sticky top-0 z-10">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">AI Tools</span>
          
          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          <button
            onClick={() => handleRewrite('funny')}
            disabled={isRewriting}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-50 hover:border-purple-200 transition-all shadow-sm active:scale-95"
            title="Make selection funnier"
          >
            <FaceSmileIcon className="w-4 h-4" />
            Make Funny
          </button>

          <button
            onClick={() => handleRewrite('concise')}
            disabled={isRewriting}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm active:scale-95"
            title="Shorten selection"
          >
            <ScissorsIcon className="w-4 h-4" />
            Shorten
          </button>

          <button
            onClick={() => handleRewrite('detailed')}
            disabled={isRewriting}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-green-700 rounded-lg text-xs font-bold hover:bg-green-50 hover:border-green-200 transition-all shadow-sm active:scale-95"
            title="Expand selection"
          >
            <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
            Expand
          </button>

          <button
            onClick={() => handleRewrite('professional')}
            disabled={isRewriting}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 hover:border-gray-300 transition-all shadow-sm active:scale-95"
            title="Make selection professional"
          >
            <BriefcaseIcon className="w-4 h-4" />
            Professional
          </button>

          {isRewriting && (
            <span className="text-xs font-bold text-purple-600 flex items-center gap-2 ml-auto bg-purple-50 px-3 py-1 rounded-full animate-pulse border border-purple-100">
              <SparklesIcon className="w-4 h-4" /> Rewriting...
            </span>
          )}
        </div>

        {/* Text Area (Document style) */}
        <div className="flex-grow relative bg-gray-50 overflow-hidden flex justify-center">
           <div className="w-full h-full max-w-3xl bg-white shadow-sm my-0 sm:my-4 sm:mx-4 overflow-hidden border-x sm:border border-gray-200">
            <textarea
              ref={textareaRef}
              value={script}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-full p-8 sm:p-12 resize-none focus:outline-none text-gray-800 font-serif text-lg leading-relaxed selection:bg-purple-100 selection:text-purple-900"
              placeholder="Start writing..."
              spellCheck={false}
            />
           </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-white border-t border-gray-200 flex justify-end items-center z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            onClick={onUpdateStoryboard}
            disabled={isUpdating}
            className={`
              flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all
              ${isUpdating 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-black hover:bg-gray-800 hover:scale-105 active:scale-95 shadow-gray-400'}
            `}
          >
            {isUpdating ? (
              <>
                <ArrowPathIcon className="w-6 h-6 animate-spin" />
                Analyzing Script...
              </>
            ) : (
              <>
                <PlayCircleIcon className="w-6 h-6 text-yellow-400" />
                Generate Visual Storyboard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptEditor;