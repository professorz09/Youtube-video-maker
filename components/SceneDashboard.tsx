import React, { useState } from 'react';
import { Scene } from '../types';
import { PhotoIcon, SparklesIcon, ArrowPathIcon, PaintBrushIcon, ArrowDownTrayIcon, PlusIcon, DocumentTextIcon, QueueListIcon, ArchiveBoxArrowDownIcon, ExclamationTriangleIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/solid';
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
  
  // Calculate full voiceover from scenes
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
    
    if (generatedScenes.length === 0) {
      alert("No images generated yet!");
      return;
    }

    setIsZipping(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder("storyboard_images");

      if (!folder) return;

      const promises = generatedScenes.map(async (scene, index) => {
        if (!scene.imageUrl) return;
        const response = await fetch(scene.imageUrl);
        const blob = await response.blob();
        const fileName = `scene_${(index + 1).toString().padStart(3, '0')}.png`;
        folder.file(fileName, blob);
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `storyboard_complete_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (e) {
      console.error("Failed to zip files", e);
      alert("Failed to create zip file. See console.");
    } finally {
      setIsZipping(false);
    }
  };

  const hasFailedImages = scenes.some(s => s.error || (s.imageUrl && s.imageUrl.includes('text=Generation+Failed')));

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-12">
      
      {/* Dashboard Toolbar */}
      <div className="bg-white border-b border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center sticky top-[128px] z-20 gap-4 shadow-sm">
        <div className="flex items-center gap-4">
           <h2 className="text-2xl font-black text-gray-900 tracking-tight">Generated Scenes</h2>
           <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
             {scenes.length} Frames
           </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {hasFailedImages && (
            <button
              onClick={onRegenerateFailed}
              disabled={isGeneratingAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm text-white shadow-sm transition-all bg-red-600 hover:bg-red-700 active:scale-95"
            >
              <ExclamationTriangleIcon className="w-4 h-4" />
              Retry Failed
            </button>
          )}

          <button
            onClick={onGenerateAllText}
            disabled={isGeneratingAllText}
             className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all border
              ${isGeneratingAllText ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300 shadow-sm'}
            `}
          >
             {isGeneratingAllText ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <QueueListIcon className="w-4 h-4" />}
             Gen All Text
          </button>

          <button
            onClick={onGenerateAll}
            disabled={isGeneratingAll || scenes.length === 0}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-white shadow-md transition-all active:scale-95
              ${isGeneratingAll ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
            `}
          >
            {isGeneratingAll ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaintBrushIcon className="w-4 h-4" />}
            Generate All Images
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping || scenes.every(s => !s.imageUrl)}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-white shadow-md transition-all active:scale-95
              ${isZipping || scenes.every(s => !s.imageUrl) ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}
            `}
          >
            {isZipping ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArchiveBoxArrowDownIcon className="w-4 h-4" />}
            Download ZIP
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="bg-gray-50 p-4 sm:p-6 space-y-6">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col lg:flex-row">
            
            {/* Header / ID (Mobile only) */}
            <div className="lg:hidden p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center font-bold text-gray-500">
               <span>Scene #{index + 1}</span>
            </div>

            {/* Left Column: ID & Script */}
            <div className="lg:w-1/4 p-6 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col gap-4">
               <div className="hidden lg:flex items-center gap-2 mb-2">
                 <span className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded">#{index + 1}</span>
                 <span className="text-xs font-bold text-gray-400 uppercase">Narration</span>
               </div>
               
               <p className="text-lg text-gray-800 leading-relaxed font-serif">
                  "{scene.narration}"
               </p>

               {/* Text Asset Mini-Card */}
               <div className="mt-auto pt-4">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Text Overlay Asset</span>
                  </div>
                   {scene.textOverlay ? (
                     <div className="bg-white border-2 border-black p-3 aspect-video shadow-sm flex flex-col justify-center items-center text-center overflow-hidden transform scale-95 origin-left">
                        {scene.textOverlay.heading && (
                          <div className="font-sans font-black text-black text-xs uppercase leading-none mb-1">
                            {scene.textOverlay.heading}
                          </div>
                        )}
                        {scene.textOverlay.points && (
                          <div className="w-full text-center">
                            {scene.textOverlay.points.map((p, i) => (
                              <div key={i} className="font-hand text-black text-sm font-bold leading-tight">
                                {p}
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                   ) : (
                      <button 
                        onClick={() => onGenerateTextOverlay(scene.id, scene.narration)}
                        disabled={scene.isLoadingTextOverlay}
                        className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 transition-all"
                      >
                        {scene.isLoadingTextOverlay ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PlusIcon className="w-5 h-5" />}
                        <span className="text-[10px] font-bold mt-1">Create Text Asset</span>
                      </button>
                   )}
               </div>
            </div>

            {/* Middle Column: Prompt Studio */}
            <div className="lg:w-1/4 p-6 border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50/50">
               <div className="flex justify-between items-center mb-3">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Image Prompt</span>
                 <div className="flex gap-1">
                   <button 
                     onClick={() => handleCopyPrompt(scene.id, scene.imagePrompt)}
                     className="p-1.5 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                     title="Copy"
                   >
                     {copiedId === scene.id ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                   </button>
                   <button 
                     onClick={() => onRefinePrompt(scene.id, scene.imagePrompt)}
                     disabled={scene.isRefining}
                     className="p-1.5 hover:bg-purple-100 text-purple-600 rounded transition-colors disabled:opacity-50"
                     title="AI Rewrite"
                   >
                     {scene.isRefining ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                   </button>
                 </div>
               </div>
               <textarea 
                  value={scene.imagePrompt}
                  onChange={(e) => onUpdatePrompt(scene.id, e.target.value)}
                  className="w-full h-40 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none bg-white text-gray-700 leading-relaxed"
                />
            </div>

            {/* Right Column: Visual Output */}
            <div className="lg:w-1/2 p-6 flex flex-col items-center justify-center bg-gray-100/30">
                <div className={`w-full aspect-video bg-white border-2 border-dashed rounded-lg overflow-hidden relative mb-4 group shadow-sm ${scene.error ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}>
                  {scene.imageUrl ? (
                    <>
                      <img 
                        src={scene.imageUrl} 
                        alt="Generated" 
                        className="w-full h-full object-contain bg-white"
                      />
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDownload(scene.imageUrl!, `scene-${index + 1}.png`)}
                          className="bg-white p-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-100 text-blue-600 transition-transform hover:scale-110"
                          title="Download Image"
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  ) : scene.isLoadingImage ? (
                    <div className="flex flex-col items-center justify-center h-full text-blue-500 bg-blue-50 p-4 text-center">
                      <ArrowPathIcon className="w-8 h-8 animate-spin mb-3" />
                      {scene.statusMessage ? (
                        <span className="text-sm font-bold text-amber-600 animate-pulse">{scene.statusMessage}</span>
                      ) : (
                        <span className="text-sm font-bold">Painting...</span>
                      )}
                    </div>
                  ) : scene.error ? (
                    <div className="flex flex-col items-center justify-center h-full text-red-400">
                      <ExclamationTriangleIcon className="w-10 h-10 mb-2" />
                      <span className="text-sm font-bold">Failed</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300">
                      <PhotoIcon className="w-12 h-12 mb-2" />
                      <span className="text-sm font-medium">Ready to Generate</span>
                    </div>
                  )}
                </div>

                <div className="w-full flex justify-end">
                   <button
                    onClick={() => onGenerateImage(scene.id, scene.imagePrompt)}
                    disabled={scene.isLoadingImage}
                    className={`
                      px-6 py-2 rounded-lg font-bold text-sm text-white shadow-sm transition-all transform active:scale-95
                      ${scene.error 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : scene.imageUrl ? 'bg-gray-800 hover:bg-gray-900' : 'bg-blue-600 hover:bg-blue-700'}
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {scene.imageUrl ? 'Regenerate' : (scene.error ? 'Retry' : 'Generate Image')}
                  </button>
                </div>
            </div>

          </div>
        ))}
      </div>
      
      {/* Footer Script View */}
       <div className="bg-white border-t border-gray-200 p-8 flex flex-col md:flex-row gap-6 justify-between items-start">
         <div className="flex items-start gap-3">
             <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
               <DocumentTextIcon className="w-6 h-6" />
             </div>
             <div>
               <h3 className="text-lg font-bold text-gray-900">Full Voiceover Script</h3>
               <p className="text-sm text-gray-500">Copy this for your narration.</p>
             </div>
         </div>
         <div className="w-full md:w-2/3 flex flex-col items-end gap-2">
            <textarea 
               readOnly
               value={fullVoiceover}
               className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium resize-none focus:outline-none"
            />
            <button
              onClick={handleCopyVoiceover}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all border ${
                isVoiceoverCopied 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {isVoiceoverCopied ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
              {isVoiceoverCopied ? 'Copied!' : 'Copy Script'}
            </button>
         </div>
       </div>

    </div>
  );
};

export default SceneDashboard;