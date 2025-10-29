// src/components/editor/TopBar.tsx
import React from 'react';
import { Link } from "react-router-dom";
import { Undo, Redo, Save, Upload, Download, Trash2 } from 'lucide-react';

// ✅ добавь импорт, если хранишь как файл
// помести svg/png в /src/assets/youticket-logo.svg (или .png)
import logoUrl from "../../assets/icons/logo.png";

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

const ghost = "inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition";
const ghostIcon = "inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition";
const ghostDisabled = "opacity-40 cursor-not-allowed hover:bg-white active:bg-white";

// 🔴 Акцент бренда (YouTicket): #ef4444 — можно подстроить при желании (#f43f5e, #dc2626)
const primary = "inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ef4444] text-white hover:bg-[#dc2626] active:bg-[#b91c1c] transition";
const danger = "inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 active:bg-red-100 transition";

function TopBar({
  onSave, onLoad, onClear, onExport, onUndo, onRedo, canUndo, canRedo
}: TopBarProps) {
  return (
    <div className="h-[60px] bg-white/95 backdrop-blur border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      {/* left */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          {/* логотип */}
          <img
            src={logoUrl}
            alt="YouTicket"
            className="h-6 w-auto"
            draggable={false}
          />
         
        </Link>

        <span className="hidden sm:inline-block text-xs font-medium px-2.5 py-1 rounded-md bg-gray-100 text-gray-600">
          Editing mode
        </span>
      </div>

      {/* right */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
          className={`${ghostIcon} ${!canUndo ? ghostDisabled : ""}`}
          disabled={!canUndo}
          aria-label="Undo"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
          className={`${ghostIcon} ${!canRedo ? ghostDisabled : ""}`}
          disabled={!canRedo}
          aria-label="Redo"
        >
          <Redo size={16} />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button onClick={onLoad} title="Load" className={ghost}>
          <Upload size={16} className="shrink-0" />
          <span className="hidden sm:inline">Load</span>
        </button>

        <button onClick={onExport} title="Export JSON" className={ghost}>
          <Download size={16} className="shrink-0" />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button onClick={onClear} title="Clear" className={danger}>
          <Trash2 size={16} className="shrink-0" />
          <span className="hidden sm:inline">Clear</span>
        </button>

        {/* primary в бренд-цвете */}
        <button onClick={onSave} title="Save" className={primary}>
          <Save size={16} className="shrink-0" />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
}

export default TopBar;
