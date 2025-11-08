// src/components/editor/TopBar.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Undo, Redo, Save, Upload, Download, Trash2 ,FolderOpen, HelpCircle} from "lucide-react";
import logoUrl from "../../assets/icons/logo.png";

type TopBarProps = {
  onSave: () => void;
  onClear: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  onLoad?: () => void;
  onLoadLast?: () => void;
  onLoadFromFile?: () => void;

  /** открыть окно помощи */
  onHelpClick?: () => void;
};

const ghost =
  "inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition";
const ghostIcon =
  "inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition";
const ghostDisabled = "opacity-40 cursor-not-allowed hover:bg-white active:bg-white";
const primary =
  "inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors";
const danger =
  "inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 active:bg-red-100 transition";

function TopBar({
  onSave,
  onClear,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onLoad,
  onLoadLast,
  onLoadFromFile,
    onHelpClick,
}: TopBarProps) {
  const showOldLoad = !!onLoad && !onLoadLast && !onLoadFromFile;
  const showNewLoad = !!onLoadLast || !!onLoadFromFile;

  return (
    <div className="h-[60px] bg-white/95 backdrop-blur border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      {/* left */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoUrl} alt="YouTicket" className="h-6 w-auto" draggable={false} />
        </Link>

        <span className="hidden sm:inline-block text-xs font-medium px-2.5 py-1 rounded-md bg-gray-100 text-gray-600">
          Режим редактирования
        </span>
      </div>

      {/* right */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          title="Отменить (Ctrl+Z)"
          className={`${ghostIcon} ${!canUndo ? ghostDisabled : ""}`}
          disabled={!canUndo}
          aria-label="Отменить"
        >
          <Undo size={16} />
        </button>

        <button
          onClick={onRedo}
          title="Повторить (Ctrl+Y)"
          className={`${ghostIcon} ${!canRedo ? ghostDisabled : ""}`}
          disabled={!canRedo}
          aria-label="Повторить"
        >
          <Redo size={16} />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

       

        
        {showNewLoad && (
          <>
            {onLoadLast && (
              <button onClick={onLoadLast} title="Load Last" className={ghost}>
                <Upload size={16} className="shrink-0" />
                <span className="hidden sm:inline">Load</span>
              </button>
            )}
            {onLoadFromFile && (
              <button onClick={onLoadFromFile} title="Load from file" className={ghost}>
                <FolderOpen size={16} className="shrink-0" />
                <span className="hidden sm:inline">Импорт JSON</span>
              </button>
            )}
          </>
        )}

        <button onClick={onExport} title="Export JSON" className={ghost}>
          <Download size={16} className="shrink-0" />
          <span className="hidden sm:inline">Экспорт</span>
        </button>

        <button onClick={onClear} title="Clear" className={danger}>
          <Trash2 size={16} className="shrink-0" />
          <span className="hidden sm:inline">Очистить</span>
        </button>

        <button onClick={onSave} title="Save" className={primary}>
          <Save size={16} className="shrink-0" />
          <span>Сохранить</span>
        </button>
        {onHelpClick && (
    <button
      onClick={onHelpClick}
      title="Помощь"
      className={ghostIcon}
      aria-label="Help"
    >
      <HelpCircle size={16} />
    </button>
  )}
      </div>
    </div>
  );
}

export default TopBar;
