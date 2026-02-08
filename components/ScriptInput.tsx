import React, { useState } from 'react';
import { SparklesIcon, BoltIcon, StarIcon, DocumentTextIcon, PencilSquareIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { generateScriptFromTopic } from '../services/geminiService';

interface ScriptInputProps {
  onAnalyze: (script: string, model: string) => void;
  isAnalyzing: boolean;
}

type InputMode = 'paste' | 'topic';

const ScriptInput: React.FC<ScriptInputProps> = ({ onAnalyze, isAnalyzing }) => {
  const [mode, setMode] = useState<InputMode>('topic'); // Default to topic for easier entry
  const [text, setText] = useState('');
  
  // Topic Mode State
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('1 min');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Model selection removed from here to simplify. We can default to Pro or manage it globally if needed. 
  // Let's hardcode 'flash' for script gen and 'pro' for script analysis implicitly or keep simple selection.
  // We'll pass a default model for now.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const modelId = 'gemini-3-flash-preview'; // Default for analysis

    if (mode === 'paste') {
      if (text.trim()) {
        onAnalyze(text, modelId);
      }
    } else {
      if (topic.trim()) {
        setIsGeneratingScript(true);
        try {
          const generatedScript = await generateScriptFromTopic(topic, duration);
          // Pass generated script to parent
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

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all">
      
      {/* Tabs */}
      <div className="grid grid-cols-2 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setMode('topic')}
          className={`py-6 text-base font-bold flex items-center justify-center gap-3 transition-all ${
            mode === 'topic' 
              ? 'bg-white text-purple-600 border-b-4 border-purple-600' 
              : 'bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
        >
          <PencilSquareIcon className="w-6 h-6" />
          Generate Script from Topic
        </button>
        <button
          type="button"
          onClick={() => setMode('paste')}
          className={`py-6 text-base font-bold flex items-center justify-center gap-3 transition-all ${
            mode === 'paste' 
              ? 'bg-white text-blue-600 border-b-4 border-blue-600' 
              : 'bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
        >
          <DocumentTextIcon className="w-6 h-6" />
          Paste Existing Script
        </button>
      </div>

      <div className="p-8 sm:p-10">
        <form onSubmit={handleSubmit}>
          {mode === 'paste' ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Script Content</label>
                  <button 
                    onClick={loadExample}
                    className="text-xs text-blue-500 hover:text-blue-700 font-bold hover:underline"
                    type="button"
                  >
                    Try Example
                  </button>
               </div>
              <textarea
                className="w-full h-64 p-6 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 resize-none font-sans text-lg text-gray-800 placeholder-gray-300 transition-all leading-relaxed shadow-inner"
                placeholder="Paste your YouTube video script here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isLoading}
              />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-8">
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-2">What is your video about?</label>
                <input
                  type="text"
                  className="w-full p-5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-50 focus:border-purple-400 font-sans text-xl text-gray-900 placeholder-gray-300 shadow-sm transition-all"
                  placeholder="e.g. The history of coffee, Why cats are liquid..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Target Duration</label>
                <div className="grid grid-cols-3 gap-4">
                  {['1 min', '8-12 min', '15 min'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDuration(opt)}
                      className={`py-4 px-6 rounded-xl font-bold text-center border-2 transition-all transform active:scale-95 ${
                        duration === opt
                          ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-md'
                          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-10">
            <button
              type="submit"
              disabled={isDisabled}
              className={`
                w-full flex items-center justify-center gap-3 py-5 rounded-xl font-black text-lg text-white shadow-lg transition-all transform
                ${isDisabled 
                  ? 'bg-gray-200 cursor-not-allowed' 
                  : mode === 'topic' ? 'bg-purple-600 hover:bg-purple-700 hover:scale-[1.02] active:scale-[0.98] shadow-purple-200' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] shadow-blue-200'}
              `}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-6 w-6 border-4 border-white border-t-transparent rounded-full"></div>
                  <span>{isGeneratingScript ? 'Writing Script...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  {mode === 'topic' ? <SparklesIcon className="w-6 h-6 text-yellow-300" /> : <ArrowRightIcon className="w-6 h-6" />}
                  {mode === 'topic' ? 'Generate Script & Continue' : 'Continue to Editor'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScriptInput;