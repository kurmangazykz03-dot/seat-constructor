import React from 'react';
import { Link } from "react-router-dom";
import { Undo, Redo } from 'lucide-react'; // Пример иконок, можно использовать любые

interface TopBarProps {
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function TopBar({ onSave, onLoad, onClear, onExport, onUndo, onRedo, canUndo, canRedo }: TopBarProps) {
  // Стили для неактивных кнопок
  const disabledStyle = "bg-gray-200 text-gray-400 cursor-not-allowed hover:bg-gray-200";
  const buttonBaseStyle = "px-4 py-2 text-sm font-medium text-black rounded-[8px] transition-colors";

  return (
    <div className="h-[60px] bg-white border-b border-[#e5e5e5] flex items-center justify-between px-6 py-3 shadow-sm">
      <Link to={"/"} className="text-[#171717] text-[20px] font-bold">
        Seat Constructor
      </Link>

      <div className="flex items-center gap-2">
        {/* Undo/Redo Buttons */}
        <button 
          onClick={onUndo} 
          disabled={!canUndo}
          className={`${buttonBaseStyle} ${!canUndo ? disabledStyle : 'bg-[#F5F5F5] hover:bg-gray-200'}`}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={16} />
        </button>
        <button 
          onClick={onRedo} 
          disabled={!canRedo}
          className={`${buttonBaseStyle} ${!canRedo ? disabledStyle : 'bg-[#F5F5F5] hover:bg-gray-200'}`}
           title="Redo (Ctrl+Y)"
        >
          <Redo size={16} />
        </button>
        
        <div className="w-[1px] h-6 bg-gray-200 mx-2"></div> {/* Разделитель */}

        {/* Action Buttons */}
        <button onClick={onSave} className="px-4 py-2 text-sm font-medium bg-[#525252] text-white rounded-[8px] hover:bg-black transition-colors">
          Save
        </button>
        <button onClick={onLoad} className={`${buttonBaseStyle} bg-[#F5F5F5] hover:bg-gray-200`}>
          Load
        </button>
        <button onClick={onClear} className={`${buttonBaseStyle} bg-[#F5F5F5] hover:bg-red-100 text-red-600`}>
          Clear
        </button>
        <button onClick={onExport} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-[8px] hover:bg-blue-700 transition-colors">
          Export JSON
        </button>
      </div>
    </div>
  );
}

export default TopBar;