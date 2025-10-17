import React from "react";

type AlignDirection = 'left' | 'center' | 'right';



interface ToolbarProps {
  currentTool: "select" | "add-seat" | "add-row" | "add-zone" | "rotate";
  setCurrentTool: (t: ToolbarProps["currentTool"]) => void;
  onDelete: () => void;
  onAlign: (dir: AlignDirection) => void;  // ← один обработчик
}

function Toolbar({
  currentTool, setCurrentTool, onDelete, onAlign,
}: ToolbarProps) {
  return (
    <div className="w-[80px] bg-white border-r border-[#E5E5E5]  flex flex-col items-center py-4 px-4 gap-4 shadow-sm">
      <div className="flex flex-col gap-4 items-center ">
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
      <div className="flex flex-col items-center gap-1">
        <button className="w-12 h-12 rounded-[12px] bg-[#e7e7eb] hover:bg-blue-400"
                onClick={() => onAlign('left')}
                title="Align left">L</button>
        <button className="w-12 h-12 rounded-[12px] bg-[#e7e7eb] hover:bg-blue-400"
                onClick={() => onAlign('center')}
                title="Align center">C</button>
        <button className="w-12 h-12 rounded-[12px] bg-[#e7e7eb] hover:bg-blue-400"
                onClick={() => onAlign('right')}
                title="Align right">R</button>
        <span className="text-[10px] mt-1 opacity-70">Align</span>
      </div>
      </div>
    </div>
  );
}

export default Toolbar;
