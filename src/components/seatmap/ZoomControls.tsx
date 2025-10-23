import React from "react";

interface ZoomControlsProps {
  scale: number;
  setScale: (newScale: number) => void;
  /** необязательный: что показывать в лейбле (например, outerScale * scale) */
  labelScale?: number;
  /** границы масштаба */
  min?: number;
  max?: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  setScale,
  labelScale,
  min = 0.3,
  max = 3,
}) => {
  const show = labelScale ?? scale;

  const dec = () => setScale(round2(clamp(scale - 0.1, min, max)));
  const inc = () => setScale(round2(clamp(scale + 0.1, min, max)));
  const reset = () => setScale(1);

  return (
    <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-white/95 border border-gray-200 shadow-md rounded-[8px] px-3 py-2">
      <button
        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200 text-black"
        onClick={dec}
        aria-label="Zoom out"
      >
        –
      </button>
      <span className="min-w-[56px] text-center text-gray-800 font-semibold">
        {Math.round(show * 100)}%
      </span>
      <button
        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200 text-black"
        onClick={inc}
        aria-label="Zoom in"
      >
        +
      </button>

     
    </div>
  );
};

export default ZoomControls;
