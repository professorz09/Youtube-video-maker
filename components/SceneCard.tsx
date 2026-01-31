import React from 'react';
import { Scene } from '../types';
import { PhotoIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface SceneCardProps {
  scene: Scene;
  index: number;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, index }) => {
  const hasTextOverlay = scene.textOverlay && (scene.textOverlay.heading || (scene.textOverlay.points && scene.textOverlay.points.length > 0));

  return (
    <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm mb-8 transition-all hover:border-blue-400 hover:shadow-md">
      
      {/* Top: Narration */}
      <div className="mb-4">
        <h3 className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-1">Script</h3>
        <p className="text-gray-900 text-lg leading-relaxed font-medium bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
          "{scene.narration}"
        </p>
      </div>

      {/* Main Visual Area */}
      <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-96">
        
        {/* Left: Generated Image (MS Paint Style) */}
        <div className={`
          relative bg-gray-100 rounded-lg border-2 border-black overflow-hidden flex items-center justify-center
          ${hasTextOverlay ? 'lg:w-3/5' : 'w-full'}
        `}>
          {scene.imageUrl ? (
            <img 
              src={scene.imageUrl} 
              alt={`Scene ${index + 1}`} 
              className="w-full h-full object-contain bg-white"
            />
          ) : scene.isLoadingImage ? (
            <div className="flex flex-col items-center text-gray-400 animate-pulse">
              <div className="bg-blue-100 p-3 rounded-full mb-3">
                <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <span className="font-hand text-xl text-gray-600 font-bold">Painting...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-gray-300">
               <PhotoIcon className="w-12 h-12 mb-2" />
               <span className="text-sm">Waiting</span>
            </div>
          )}
          
          {/* Scene Number Badge */}
          <div className="absolute top-2 left-2 bg-blue-600 text-white font-bold w-8 h-8 flex items-center justify-center rounded-md border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10 font-sans">
            {index + 1}
          </div>
        </div>

        {/* Right: Hand-Drawn Text Section (If TextOverlay exists) */}
        {hasTextOverlay && (
          <div className="lg:w-2/5 bg-[#fffef0] border-2 border-black rounded-lg p-6 relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] flex flex-col justify-center transform rotate-1">
             {/* Tape effect */}
             <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-16 h-8 bg-yellow-200 opacity-80 rotate-2"></div>

             <div className="font-hand text-gray-800">
                {scene.textOverlay?.heading && (
                  <h3 className="text-2xl font-bold text-red-600 mb-4 uppercase tracking-wide transform -rotate-1">
                    {scene.textOverlay.heading}
                  </h3>
                )}
                
                {scene.textOverlay?.points && (
                  <ul className="space-y-3">
                    {scene.textOverlay.points.map((point, i) => (
                      <li key={i} className="flex items-start text-xl leading-snug">
                        <span className="mr-2 text-black font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
             </div>
          </div>
        )}
      </div>

      {/* Footer: Description */}
      <div className="mt-3 text-right">
        <span className="text-xs text-gray-400 font-mono">Prompt: {scene.visualDescription.substring(0, 60)}...</span>
      </div>

    </div>
  );
};

export default SceneCard;