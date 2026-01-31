import React from 'react';
import { PaintBrushIcon } from '@heroicons/react/24/solid';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white transform rotate-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <PaintBrushIcon className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">
            Paint<span className="text-blue-600">Visualizer</span>
          </h1>
        </div>
        <div className="text-sm font-bold text-gray-500 font-hand text-lg rotate-1">
          Make it MS Paint Style!
        </div>
      </div>
    </header>
  );
};

export default Header;