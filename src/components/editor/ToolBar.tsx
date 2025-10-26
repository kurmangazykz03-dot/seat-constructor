import React, { useMemo, useRef, useState } from "react";

type AlignDirection = "left" | "center" | "right";

interface ToolbarProps {
  currentTool: "select" | "add-seat" | "add-row" | "add-zone" | "rotate";
  setCurrentTool: (t: ToolbarProps["currentTool"]) => void;
  onDelete: () => void;
  onAlign: (dir: AlignDirection) => void;
  onDuplicate: () => void;
  onUploadBackground?: (dataUrl: string | null) => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;

  backgroundMode: "auto" | "manual";
  setBackgroundMode: (m: "auto" | "manual") => void;
  backgroundFit: "contain" | "cover" | "stretch" | "none";
  setBackgroundFit: (fit: "contain" | "cover" | "stretch" | "none") => void;
}

function ToolButton({
  active, disabled, onClick, title, children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const base =
    "group relative w-12 h-12 rounded-xl border transition-colors inline-flex items-center justify-center";
  const idle =
    "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100";
  const act =
    "border-blue-300 bg-blue-50 text-blue-600 ring-2 ring-blue-200";
  const dis = "opacity-40 cursor-not-allowed";
  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${disabled ? dis : active ? act : idle}`}
      aria-label={title}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-8 h-px bg-gray-200 my-2" />;
}

export default function Toolbar({
  currentTool,
  setCurrentTool,
  onDelete,
  onAlign,
  onDuplicate,
  onUploadBackground,
  showGrid,
  onToggleGrid,
  backgroundMode,
  setBackgroundMode,
  backgroundFit,
  setBackgroundFit,
}: ToolbarProps) {
  const [alignOpen, setAlignOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const setTool = (t: ToolbarProps["currentTool"]) => () => setCurrentTool(t);

  useMemo(() => {
    switch (currentTool) {
      case "select": return "Select";
      case "add-zone": return "Zone";
      case "add-row": return "Row";
      case "add-seat": return "Seat";
      case "rotate": return "Rotate";
      default: return "";
    }
  }, [currentTool]);

  const handlePickFile = () => fileRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadBackground) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUploadBackground(reader.result as string);
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  return (
    <aside className="w-[64px] bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-2">
      {/* Primary */}
      <ToolButton title="Select (V)" active={currentTool === "select"} onClick={setTool("select")}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <path d="M7 3l13 7-7 2-2 7-4-16z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </ToolButton>

      <ToolButton title="Zone (Z)" active={currentTool === "add-zone"} onClick={setTool("add-zone")}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        </svg>
      </ToolButton>

      <ToolButton title="Row (R)" active={currentTool === "add-row"} onClick={setTool("add-row")}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </ToolButton>

      <ToolButton title="Seat (S)" active={currentTool === "add-seat"} onClick={setTool("add-seat")}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
          <rect x="7" y="13" width="10" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
        </svg>
      </ToolButton>

      <ToolButton title="Rotate (O)" active={currentTool === "rotate"} onClick={setTool("rotate")}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 12a8 8 0 1 1-4.7-7.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </ToolButton>

      <Divider />

      {/* Edit */}
      <ToolButton title="Duplicate (Ctrl/⌘+D)" onClick={onDuplicate}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <rect x="8" y="8" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
          <rect x="4" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        </svg>
      </ToolButton>

      <ToolButton title="Delete (Del)" onClick={onDelete}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </ToolButton>

      <div className="relative">
        <ToolButton title="Align (L/C/R)" onClick={() => setAlignOpen(v => !v)}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <path d="M12 4v16M6 8h12M4 12h16M6 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </ToolButton>

        {alignOpen && (
          <div className="absolute left-14 top-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex gap-2">
            <ToolButton title="Align Left" onClick={() => onAlign("left")}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                <path d="M4 4v16M4 8h12M4 12h16M4 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </ToolButton>
            <ToolButton title="Align Center" onClick={() => onAlign("center")}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                <path d="M12 4v16M6 8h12M4 12h16M6 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </ToolButton>
            <ToolButton title="Align Right" onClick={() => onAlign("right")}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                <path d="M20 4v16M8 8h12M4 12h16M12 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </ToolButton>
          </div>
        )}
      </div>

      <Divider />

      {/* Upload / Background */}
      <ToolButton title="Upload image" onClick={handlePickFile}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <path d="M4 17v2h16v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 3v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </ToolButton>

      <ToolButton
        title={backgroundMode === 'manual' ? 'Background: manual' : 'Background: auto'}
        active={backgroundMode === 'manual'}
        onClick={() => setBackgroundMode(backgroundMode === 'manual' ? 'auto' : 'manual')}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M7 15l3-3 3 4 2-2 3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="9" r="1.5" fill="currentColor" />
        </svg>
      </ToolButton>

      <Divider />

      {/* View */}
      <ToolButton title="Toggle grid" active={!!showGrid} onClick={onToggleGrid} disabled={!onToggleGrid}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <path d="M4 4h16v16H4zM4 12h16M12 4v16" stroke="currentColor" strokeWidth="2" />
        </svg>
      </ToolButton>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
    </aside>
  );
}
