import React, { useRef } from "react";

type AlignDirection = 'left' | 'center' | 'right';

interface ToolbarProps {
  currentTool: "select" | "add-seat" | "add-row" | "add-zone" | "rotate";
  setCurrentTool: (t: ToolbarProps["currentTool"]) => void;
  onDelete: () => void;
  onAlign: (dir: AlignDirection) => void;
  onDuplicate: () => void; // 🆕
  onUploadBackground?: (dataUrl: string | null) => void; // если уже есть
  showGrid?: boolean;
  onToggleGrid?: () => void;
}

function Toolbar({
  currentTool, setCurrentTool, onDelete, onAlign, onUploadBackground,showGrid,onToggleGrid,onDuplicate
}: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handlePickFile = () => fileRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUploadBackground((reader.result as string) ?? null);
      // сбросим value чтобы можно было выбрать тот же файл повторно
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-[80px] bg-white border-r border-[#E5E5E5]  flex flex-col items-center py-4 px-4 gap-4 shadow-sm">
      <div className="flex flex-col gap-4 items-center ">
         <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload background */}
      <div className="flex flex-col items-center gap-1">
        <button
          className="w-12 h-12 bg-[#e7e7eb] rounded-[12px] hover:bg-blue-400 cursor-pointer"
          onClick={handlePickFile}
          title="Upload background image"
        >
          <div className="flex items-center justify-center">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M4 17v2h16v-2M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
        <span className="text-black text-center text-xs">Upload<br/>background</span>
      </div>
{/* Grid toggle */}
<div className="flex flex-col items-center gap-1">
  <button
    className={`w-12 h-12 rounded-[12px] ${showGrid ? "bg-[#e7e7eb]" : "bg-blue-400"} hover:bg-blue-400 cursor-pointer`}
    onClick={onToggleGrid}
    title="Toggle grid"
  >
    <div className="flex items-center justify-center">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" strokeWidth="2"/>
      </svg>
    </div>
  </button>
  <span className="text-black text-center text-xs">Grid</span>
</div>

        <div className="flex flex-col items-center  gap-1">
          <button
            className={`w-12 h-12 rounded-[12px] ${currentTool === "add-row" ? "bg-blue-400" : "bg-[#e7e7eb]"} hover:bg-blue-400 cursor-pointer`}
            onClick={() => setCurrentTool("add-row")}
          >
            <div className="flex items-center justify-center ">
              <svg className="w-3 h-4">
                <use xlinkHref="#icon-row" />
              </svg>
            </div>
          </button>
          <span className="text-black ">
            Add <br /> Row
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            className={`w-12 h-12 ${currentTool === "add-seat" ? "bg-blue-400" : "bg-[#e7e7eb]"}  rounded-[12px] hover:bg-blue-400 cursor-pointer`}
            onClick={() => setCurrentTool("add-seat")}
          >
            <div className="flex items-center justify-center ">
              <svg className="w-3 h-4">
                <use xlinkHref="#icon-seats" />
              </svg>
            </div>
          </button>
          <span className="text-black ">
            Add <br /> Seat
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            className={`w-12 h-12 ${currentTool === "add-zone" ? "bg-blue-400" : "bg-[#e7e7eb]"}  rounded-[12px] hover:bg-blue-400 cursor-pointer`}
            onClick={() => setCurrentTool("add-zone")}
          >
            <div className="flex items-center justify-center ">
              <svg className="w-3 h-4 ">
                <use xlinkHref="#icon-zone" />
              </svg>
            </div>
          </button>
          <span className="text-black ">
            Add <br /> Zone
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            className={`w-12 h-12 ${currentTool === "select" ? "bg-blue-400" : "bg-[#e7e7eb]"}  rounded-[12px] hover:bg-blue-400 cursor-pointer`}
            onClick={() => setCurrentTool("select")}
          >
            <div className="flex items-center justify-center ">
              <svg className="w-3 h-4 ">
                <use xlinkHref="#icon-select" />
              </svg>
            </div>
          </button>
          <span className="text-black ">Select</span>
        </div>
        {/* Delete */}

        <div className="flex flex-col items-center gap-1">
          <button
            className="w-12 h-12 bg-[#e7e7eb] rounded-[12px] hover:bg-red-500 hover:text-white cursor-pointer"
            onClick={onDelete}
          >
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 text-black">
                <use xlinkHref="#icon-trash" />
              </svg>
            </div>
          </button>

          <span className="text-black text-center">Delete</span>
        </div>
        {/* Duplicate */}
<div className="flex flex-col items-center gap-1">
  <button
    className="w-12 h-12 bg-[#e7e7eb] rounded-[12px] hover:bg-blue-400 hover:text-white cursor-pointer"
    onClick={onDuplicate}
    title="Duplicate (Ctrl/⌘ + D)"
  >
    <div className="flex items-center justify-center">
      {/* иконка-двойник */}
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
        <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
        <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
      </svg>
    </div>
  </button>
  <span className="text-black text-center text-xs">Duplicate</span>
</div>
        {/* ROTATE */}
<div className="flex flex-col items-center gap-1">
  <button
    className={`w-12 h-12 rounded-[12px] ${currentTool === "rotate" ? "bg-blue-400" : "bg-[#e7e7eb]"} hover:bg-blue-400`}
    onClick={() => setCurrentTool("rotate")}
    title="Rotate zone"
  >
    <div className="flex items-center justify-center">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
        <path d="M21 12a9 9 0 1 1-3.1-6.8" stroke="currentColor" strokeWidth="2"/>
        <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2"/>
      </svg>
    </div>
  </button>
  <span className="text-xs">Rotate</span>
</div>
  {/* Единственный блок Align */}
     <button
  className="w-12 h-12 rounded-[12px] bg-[#e7e7eb] hover:bg-blue-400"
  onClick={(e) => onAlign('left', e.shiftKey || e.altKey)}
  title="Align left (Shift/Alt – только сиденья)"
>L</button>

<button
  className="w-12 h-12 rounded-[12px] bg-[#e7e7eb] hover:bg-blue-400"
  onClick={(e) => onAlign('center', e.shiftKey || e.altKey)}
  title="Align center (Shift/Alt – только сиденья)"
>C</button>

<button
  className="w-12 h-12 rounded-[12px] bg-[#e7e7eb] hover:bg-blue-400"
  onClick={(e) => onAlign('right', e.shiftKey || e.altKey)}
  title="Align right (Shift/Alt – только сиденья)"
>R</button>
      </div>
    </div>
  );
}

export default Toolbar;
