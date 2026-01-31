import React, { useState } from 'react';
import { SparklesIcon, BoltIcon, StarIcon } from '@heroicons/react/24/solid';

interface ScriptInputProps {
  onAnalyze: (script: string, model: string) => void;
  isAnalyzing: boolean;
}

const ScriptInput: React.FC<ScriptInputProps> = ({ onAnalyze, isAnalyzing }) => {
  const [text, setText] = useState('');
  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('flash');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      const modelId = selectedModel === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
      onAnalyze(text, modelId);
    }
  };

  const loadExample = () => {
    setText(`For most of modern history:
- Men drove.
- Women stayed home.
- Roads were designed, regulated, and controlled by men.

In this video, we ask: Are women actually worse drivers? Or is the system rigged? 
Let's look at the data comparing different demographics and safety records.`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 transition-all hover:shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">1. Enter your Script</h2>
        <button 
          onClick={loadExample}
          className="text-sm text-yellow-600 hover:text-yellow-700 font-medium underline decoration-dotted"
          type="button"
        >
          Load Example Script
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none font-sans text-gray-700 placeholder-gray-400"
          placeholder="Paste your YouTube video script here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isAnalyzing}
        />
        
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setSelectedModel('flash')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                selectedModel === 'flash' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BoltIcon className="w-4 h-4" />
              Gemini 3 Flash
            </button>
            <button
              type="button"
              onClick={() => setSelectedModel('pro')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                selectedModel === 'pro' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <StarIcon className="w-4 h-4" />
              Gemini 3 Pro
            </button>
          </div>

          <button
            type="submit"
            disabled={!text.trim() || isAnalyzing}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white shadow-sm transition-all w-full sm:w-auto justify-center
              ${!text.trim() || isAnalyzing 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-black hover:bg-gray-800 hover:scale-105 active:scale-95'}
            `}
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Analyzing...
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5 text-yellow-400" />
                Visualize Script
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScriptInput;