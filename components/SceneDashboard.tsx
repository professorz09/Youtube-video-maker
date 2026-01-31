import React, { useState } from 'react';
import { Scene } from '../types';
import { PhotoIcon, SparklesIcon, ArrowPathIcon, PaintBrushIcon, ArrowDownTrayIcon, PlusIcon, DocumentTextIcon, QueueListIcon, ArchiveBoxArrowDownIcon, ExclamationTriangleIcon, ClockIcon, ClipboardDocumentIcon } from '@heroicons/react/24/solid';
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
        
        // Convert Base64 or URL to Blob
        const response = await fetch(scene.imageUrl);
        const blob = await response.blob();
        
        // Pad numbers (e.g., scene_001.png) so they sort correctly
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-12">
      {/* Dashboard Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col sm:flex-row justify-between items-center sticky top-16 z-20 gap-4">
        <div className="flex items-center gap-4">
           <h2 className="text-lg font-bold text-gray-800">Storyboard Dashboard</h2>
           <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
             {scenes.length} Scenes
           </span>
        </div>
        
        <div className="flex items-center gap-3">
          {hasFailedImages && (
            <button
              onClick={onRegenerateFailed}
              disabled={isGeneratingAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-white shadow-sm transition-all bg-red-600 hover:bg-red-700 animate-pulse"
              title="Retry generating failed images"
            >
              <ExclamationTriangleIcon className="w-4 h-4" />
              Retry Failed
            </button>
          )}

          <button
            onClick={onGenerateAll}
            disabled={isGeneratingAll || scenes.length === 0}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-white shadow-sm transition-all
              ${isGeneratingAll ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
            `}
          >
            {isGeneratingAll ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaintBrushIcon className="w-4 h-4" />}
            Generate All
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping || scenes.every(s => !s.imageUrl)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm text-white shadow-sm transition-all
              ${isZipping || scenes.every(s => !s.imageUrl) ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-900'}
            `}
            title="Download all generated images as a .zip file"
          >
            {isZipping ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArchiveBoxArrowDownIcon className="w-4 h-4" />}
            {isZipping ? 'Zipping...' : 'Download ZIP'}
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-0 border-b border-gray-200 bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-[136px] sm:top-[88px] z-20">
        <div className="col-span-1 p-3 text-center border-r border-gray-200">#</div>
        <div className="col-span-4 p-3 border-r border-gray-200 flex justify-between items-center">
            <span>Script & Text Assets</span>
            <button 
              onClick={onGenerateAllText}
              disabled={isGeneratingAllText}
              className={`
                 text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1 normal-case font-bold border transition-all
                 ${isGeneratingAllText 
                   ? 'bg-gray-100 text-gray-400 border-gray-200' 
                   : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 shadow-sm'}
              `}
              title="Generate text cards for all scenes"
            >
               {isGeneratingAllText ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <QueueListIcon className="w-3 h-3" />}
               {isGeneratingAllText ? 'Generating...' : 'Create All Assets'}
            </button>
        </div>
        <div className="col-span-4 p-3 border-r border-gray-200">Prompt Studio</div>
        <div className="col-span-3 p-3">Visual Output (16:9)</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="grid grid-cols-12 gap-0 hover:bg-gray-50 transition-colors">
            
            {/* ID Column */}
            <div className="col-span-1 p-4 flex items-center justify-center font-mono text-gray-400 font-bold border-r border-gray-200">
              {index + 1}
            </div>

            {/* Column 1: Script & Text Visualization */}
            <div className="col-span-4 p-4 border-r border-gray-200 flex flex-col gap-4">
              <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Narration</span>
                <p className="text-sm text-gray-800 leading-relaxed font-medium">
                  "{scene.narration}"
                </p>
              </div>
              
              {/* Text Overlay Section */}
              <div className="mt-2">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Text Card Asset</span>
                 </div>
                 
                 {scene.textOverlay ? (
                   <>
                     {/* The Card: White, clean, high contrast, professional */}
                     <div className="bg-white border-4 border-black p-6 aspect-video shadow-md flex flex-col justify-center items-center text-center overflow-hidden transform transition-transform hover:scale-[1.02]">
                        {scene.textOverlay.heading && (
                          <div className="font-sans font-black text-black text-2xl uppercase leading-none mb-3 tracking-tighter">
                            {scene.textOverlay.heading}
                          </div>
                        )}
                        {scene.textOverlay.points && (
                          <div className="w-full text-center">
                            {scene.textOverlay.points.map((p, i) => (
                              <div key={i} className="font-hand text-black text-3xl font-bold leading-tight mb-1">
                                {p}
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                     <p className="text-[10px] text-gray-400 mt-2 text-center italic">
                       Ready for screenshot
                     </p>
                   </>
                 ) : (
                    <button 
                      onClick={() => onGenerateTextOverlay(scene.id, scene.narration)}
                      disabled={scene.isLoadingTextOverlay}
                      className="w-full aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-500 transition-all group"
                    >
                      {scene.isLoadingTextOverlay ? (
                        <>
                          <ArrowPathIcon className="w-6 h-6 animate-spin mb-2" />
                          <span className="text-xs font-bold">Designing...</span>
                        </>
                      ) : (
                        <>
                          <DocumentTextIcon className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold flex items-center gap-1">
                            <PlusIcon className="w-3 h-3" /> Create Text Asset
                          </span>
                        </>
                      )}
                    </button>
                 )}
              </div>
            </div>

            {/* Column 2: Prompt Studio */}
            <div className="col-span-4 p-4 border-r border-gray-200 flex flex-col h-full">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-bold text-gray-400 uppercase">Image Prompt</span>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => handleCopyPrompt(scene.id, scene.imagePrompt)}
                     className={`
                       text-xs flex items-center gap-1 font-bold px-2 py-1 rounded border transition-all
                       ${copiedId === scene.id 
                         ? 'bg-green-50 border-green-200 text-green-600' 
                         : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                     `}
                     title="Copy prompt to clipboard"
                   >
                     {copiedId === scene.id ? (
                        <span>Copied!</span>
                     ) : (
                        <>
                          <ClipboardDocumentIcon className="w-3 h-3" />
                          Copy
                        </>
                     )}
                   </button>
                   <button 
                     onClick={() => onRefinePrompt(scene.id, scene.imagePrompt)}
                     disabled={scene.isRefining}
                     className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 font-bold bg-purple-50 px-2 py-1 rounded hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-wait"
                     title="Use AI to rewrite and improve this prompt"
                   >
                     {scene.isRefining ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                     {scene.isRefining ? 'Rewriting...' : 'Auto-Rewrite'}
                   </button>
                 </div>
              </div>
              <textarea 
                value={scene.imagePrompt}
                onChange={(e) => onUpdatePrompt(scene.id, e.target.value)}
                className="w-full flex-grow text-xs p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:border-transparent font-mono text-gray-600 leading-relaxed resize-none bg-gray-50 min-h-[140px]"
              />
              <div className="mt-2 text-[10px] text-gray-400">
                Tip: If the image has a toolbar, add "NO UI" to the prompt.
              </div>
            </div>

            {/* Column 3: Visual Output */}
            <div className="col-span-3 p-4 flex flex-col items-center justify-start">
              <div className={`w-full aspect-video bg-white border-2 border-dashed rounded-lg overflow-hidden relative mb-3 group ${scene.error ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}>
                {scene.imageUrl ? (
                  <>
                    <img 
                      src={scene.imageUrl} 
                      alt="Generated" 
                      className="w-full h-full object-contain bg-white"
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDownload(scene.imageUrl!, `scene-${index + 1}.png`)}
                        className="bg-white p-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-100 text-blue-600"
                        title="Download Image"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : scene.isLoadingImage ? (
                  <div className="flex flex-col items-center justify-center h-full text-blue-500 bg-blue-50 p-4 text-center">
                    <ArrowPathIcon className="w-8 h-8 animate-spin mb-2" />
                    {scene.statusMessage ? (
                      <span className="text-xs font-bold text-amber-600 animate-pulse">{scene.statusMessage}</span>
                    ) : (
                      <span className="text-xs font-bold">Painting...</span>
                    )}
                  </div>
                ) : scene.error ? (
                  <div className="flex flex-col items-center justify-center h-full text-red-400">
                    <ExclamationTriangleIcon className="w-8 h-8 mb-2" />
                    <span className="text-xs font-bold">Failed</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                    <PhotoIcon className="w-10 h-10 mb-2" />
                    <span className="text-xs">No Image</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => onGenerateImage(scene.id, scene.imagePrompt)}
                  disabled={scene.isLoadingImage}
                  className={`flex-1 py-2 text-white text-xs font-bold rounded shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed ${scene.error ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {scene.imageUrl ? 'Regenerate' : (scene.error ? 'Retry' : 'Create Image')}
                </button>
                {scene.imageUrl && (
                   <button 
                    onClick={() => handleDownload(scene.imageUrl!, `scene-${index + 1}.png`)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300"
                    title="Download"
                   >
                     <ArrowDownTrayIcon className="w-4 h-4" />
                   </button>
                )}
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default SceneDashboard;