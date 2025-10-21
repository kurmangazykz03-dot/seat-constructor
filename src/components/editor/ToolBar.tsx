// src/components/editor/ToolBar.tsx
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
}

function ToolButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const base = "w-12 h-12 rounded-[12px] flex items-center justify-center transition-colors";
  const activeCls = "bg-blue-500 text-white";
  const idleCls = "bg-[#e7e7eb] hover:bg-blue-400 hover:text-white";
  const disabledCls = "bg-gray-200 text-gray-400 cursor-not-allowed";

  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${disabled ? disabledCls : active ? activeCls : idleCls}`}
    >
      {children}
    </button>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-gray-500 tracking-wide uppercase mt-3 mb-1">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="w-10 h-px bg-gray-200 my-2" />;
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
}: ToolbarProps) {
  const [compact, setCompact] = useState(true);
  const [alignOpen, setAlignOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const setTool = (t: ToolbarProps["currentTool"]) => () => setCurrentTool(t);

  const toolLabel = useMemo(() => {
    switch (currentTool) {
      case "select":
        return "Select";
      case "add-zone":
        return "Zone";
      case "add-row":
        return "Row";
      case "add-seat":
        return "Seat";
      case "rotate":
        return "Rotate";
      default:
        return "";
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
    <aside
      className={`${
        compact ? "w-[80px]" : "w-[100px]"
      } bg-white border-r border-[#E5E5E5] flex flex-col items-center py-4 px-4 gap-2 shadow-sm`}
    >
      <GroupTitle>Primary</GroupTitle>
      <div className="flex flex-col items-center gap-2">
        <ToolButton
          title="Select (V)"
          active={currentTool === "select"}
          onClick={setTool("select")}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none">
            <path
              d="M7 3l13 7-7 2-2 7-4-16z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </ToolButton>

        <ToolButton
          title="Zone (Z)"
          active={currentTool === "add-zone"}
          onClick={setTool("add-zone")}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none">
            <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
          </svg>
        </ToolButton>

        <ToolButton title="Row (R)" active={currentTool === "add-row"} onClick={setTool("add-row")}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </ToolButton>

        <ToolButton
          title="Seat (S)"
          active={currentTool === "add-seat"}
          onClick={setTool("add-seat")}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none">
            <use xlinkHref="#icon-seats" />
          </svg>
        </ToolButton>

        <ToolButton
          title="Rotate (O)"
          active={currentTool === "rotate"}
          onClick={setTool("rotate")}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none">
            <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M20 12a8 8 0 1 1-4.7-7.3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </ToolButton>
      </div>

      <Divider />

      <GroupTitle>Edit</GroupTitle>
      <div className="flex flex-col items-center gap-2">
        <ToolButton title="Duplicate (Ctrl/⌘ + D)" onClick={onDuplicate}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none">
            <rect x="8" y="8" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
            <rect
              x="4"
              y="4"
              width="10"
              height="10"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.6"
            />
          </svg>
        </ToolButton>

        <ToolButton title="Delete (Del/Backspace)" onClick={onDelete}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none">
            <path
              d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </ToolButton>

        <div className="relative">
          <ToolButton title="Align (L / C / R)" onClick={() => setAlignOpen((v) => !v)}>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none">
              <path
                d="M12 4v16M6 8h12M4 12h16M6 16h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </ToolButton>
          {alignOpen && (
            <div className="absolute left-16 top-0 z-20 bg-white border border-gray-200 rounded-xl shadow-md p-2 flex gap-2">
              <ToolButton title="Align Left" onClick={() => onAlign("left")}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none">
                  <path
                    d="M4 4v16M4 8h12M4 12h16M4 16h8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </ToolButton>
              <ToolButton title="Align Center" onClick={() => onAlign("center")}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none">
                  <path
                    d="M12 4v16M6 8h12M4 12h16M6 16h12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </ToolButton>
              <ToolButton title="Align Right" onClick={() => onAlign("right")}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none">
                  <path
                    d="M20 4v16M8 8h12M4 12h16M12 16h8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </ToolButton>
            </div>
          )}
        </div>
      </div>

      <Divider />

      <GroupTitle>Upload</GroupTitle>
      <div className="flex flex-col items-center gap-2">
        <ToolButton title="Upload image" onClick={handlePickFile}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none">
            <path d="M4 17v2h16v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M12 3v10m0 0l-4-4m4 4l4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </ToolButton>
      </div>
      <GroupTitle>View</GroupTitle>
      <div className="flex flex-col items-center gap-2">
        <ToolButton
          title="Toggle grid"
          active={!!showGrid}
          onClick={onToggleGrid}
          disabled={!onToggleGrid}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <path d="M4 4h16v16H4zM4 12h16M12 4v16" stroke="currentColor" strokeWidth="2" />
          </svg>
        </ToolButton>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </aside>
  );
}
