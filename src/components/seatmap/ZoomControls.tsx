import React from 'react';

interface ZoomControlsProps {
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ scale, setScale }) => {
  return (
    <div className="w-[156px] h-[50px] absolute top-22 left-30 flex items-center space-x-2 bg-white border border-gray-200 shadow-md rounded-[8px] px-3 py-2">
      <button
        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200 text-black"
        onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.3))}
      >–</button>
      <span className="text-gray-700 font-bold">{Math.round(scale * 100)}%</span>
      <button
        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200 text-black"
        onClick={() => setScale((prev) => Math.min(prev + 0.1, 3))}
      > +</button>
    </div>
  );
};

export default ZoomControls;