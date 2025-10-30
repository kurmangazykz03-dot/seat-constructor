import React, { useEffect, useMemo, useRef, useState } from "react";

type AlignDirection = "left" | "center" | "right";
type Tool =
  | "select"
  | "add-seat"
  | "add-row"
  | "add-zone"
  | "rotate"
  | "add-text"
  | "add-rect"
  | "add-ellipse"
  | "add-polygon"
  | "bend";

interface ToolbarProps {
  currentTool: Tool;
  setCurrentTool: (t: Tool) => void;
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

/* -------------------------------- Icons ---------------------------------- */
const IconSelect = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M7 3l13 7-7 2-2 7-4-16z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
const IconRect = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <rect x="5" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconEllipse = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <ellipse cx="12" cy="12" rx="7" ry="5" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconPolygon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M6 8l6-3 6 3-2 7H8L6 8z" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconText = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M5 6h14M12 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconSeat = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
    <rect x="7" y="13" width="10" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconZone = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconRow = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconRotate = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 12a8 8 0 1 1-4.7-7.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconBend = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M5 7c2-3 12-3 14 0v10c-2 3-12 3-14 0V7z" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconDuplicate = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <rect x="8" y="8" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
    <rect x="4" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.6" />
  </svg>
);
const IconDelete = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconAlign = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M12 4v16M6 8h12M4 12h16M6 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconGrid = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M4 4h16v16H4zM4 12h16M12 4v16" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconUpload = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M4 17v2h16v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 3v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconBg = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M7 15l3-3 3 4 2-2 3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="9" cy="9" r="1.5" fill="currentColor" />
  </svg>
);

/* ------------------------------ primitives ------------------------------- */
function Button({
  active, disabled, title, onClick, children,
}: {
  active?: boolean; disabled?: boolean; title?: string; onClick?: () => void; children: React.ReactNode;
}) {
  const base = "group relative w-12 h-12 rounded-xl border inline-flex items-center justify-center transition-colors";
  const idle = "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100";
  const act  = "border-blue-300 bg-blue-50 text-blue-600 ring-2 ring-blue-200";
  const dis  = "opacity-40 cursor-not-allowed";
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`${base} ${disabled ? dis : active ? act : idle}`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] tracking-wide text-gray-400 font-medium select-none">{children}</div>;
}

/* ------------------------------ group model ------------------------------ */
type GroupId = "select" | "draw" | "zones" | "transform";

const GROUP_ITEMS: Record<GroupId, { id: Tool; title: string; icon: React.FC }[]> = {
  select: [
    { id: "select", title: "Select (V)", icon: IconSelect },
  ],
  draw: [
    { id: "add-rect",    title: "Rectangle (M)", icon: IconRect },
    { id: "add-ellipse", title: "Ellipse (E)",   icon: IconEllipse },
    { id: "add-polygon", title: "Polygon (P)",   icon: IconPolygon },
    { id: "add-text",    title: "Text (T)",      icon: IconText },
  ],
  zones: [
    { id: "add-zone", title: "Add Zone (Z)", icon: IconZone },
    { id: "add-row",  title: "Add Row (R)",  icon: IconRow },
    { id: "add-seat", title: "Seat (S)",     icon: IconSeat }, 
  ],
  transform: [
    { id: "rotate", title: "Rotate (O)", icon: IconRotate },
    { id: "bend",   title: "Bend (B)",   icon: IconBend },
  ],
};

function groupOf(tool: Tool): GroupId {
  if (tool === "select") return "select";
  if (["add-rect","add-ellipse","add-polygon","add-text"].includes(tool)) return "draw"; 
  if (["add-zone","add-row","add-seat"].includes(tool)) return "zones";                  
  return "transform";
}

/* ------------------------------ Group button ----------------------------- */
function GroupButton({
  groupId, currentTool, lastUsed, setLastUsed, onPick, label,isOpen, onToggle,     
}: {
  groupId: GroupId;
  currentTool: Tool;
  lastUsed: Partial<Record<GroupId, Tool>>;
  setLastUsed: React.Dispatch<React.SetStateAction<Partial<Record<GroupId, Tool>>>>;
  onPick: (t: Tool) => void;
  label: string;
   isOpen: boolean;                              
  onToggle: () => void;     
}) {
  const [open, setOpen] = useState(false);
  const items = GROUP_ITEMS[groupId];
  const activeInGroup = items.some(i => i.id === currentTool);
  const last = lastUsed[groupId] ?? items[0].id;
  const LastIcon = (items.find(i => i.id === last) ?? items[0]).icon;

  const single = items.length === 1; 

  const pick = (t: Tool) => {
    onPick(t);
    setLastUsed(prev => ({ ...prev, [groupId]: t }));
    setOpen(false);
  };
return (
    <div className="flex flex-col items-center gap-1 relative">
      <SectionLabel>{label}</SectionLabel>
      <Button
        title={(items.find(i => i.id === last) ?? items[0]).title}
        active={activeInGroup}
        onClick={() => {
          if (single) pick(items[0].id);
          else onToggle();                        
        }}
      >
        <LastIcon />
      </Button>

      {!single && isOpen && (
        <div
          role="menu"
          aria-label={`${label} palette`}
          className="absolute left-16 top-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex flex-col gap-2"
        >
          {items.map(({ id, title, icon: Icon }) => (
            <Button
              key={id}
              title={title}
              active={currentTool === id}
              onClick={() => pick(id)}            
            >
              <Icon />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}


/* -------------------------------- Toolbar -------------------------------- */
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
  const [lastUsed, setLastUsed] = useState<Partial<Record<GroupId, Tool>>>({
    [groupOf(currentTool)]: currentTool,
  });

  useEffect(() => {
    setLastUsed(prev => ({ ...prev, [groupOf(currentTool)]: currentTool }));
  }, [currentTool]);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const pickFile = () => fileRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !onUploadBackground) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUploadBackground(reader.result as string);
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsDataURL(f);
  };
// 1) Добавляем состояние открытой группы
const [openGroup, setOpenGroup] = useState<GroupId | null>(null);

// 2) Когда выбираем инструмент — закрываем палитру
const handlePick = (t: Tool, groupId: GroupId) => {
  setCurrentTool(t);
  setLastUsed(prev => ({ ...prev, [groupId]: t }));
  setOpenGroup(null);
};

  return (
    <aside className="w-[72px] bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-4">
      {/* Groups */}
      <GroupButton
  groupId="select"
  label="SELECT"
  currentTool={currentTool}
  lastUsed={lastUsed}
  setLastUsed={setLastUsed}
  onPick={(t) => handlePick(t, "select")}
  isOpen={openGroup === "select"}
  onToggle={() => setOpenGroup(g => g === "select" ? null : "select")}
/>

<GroupButton
  groupId="draw"
  label="DRAW"
  currentTool={currentTool}
  lastUsed={lastUsed}
  setLastUsed={setLastUsed}
  onPick={(t) => handlePick(t, "draw")}
  isOpen={openGroup === "draw"}
  onToggle={() => setOpenGroup(g => g === "draw" ? null : "draw")}
/>

<GroupButton
  groupId="zones"
  label="ZONES"
  currentTool={currentTool}
  lastUsed={lastUsed}
  setLastUsed={setLastUsed}
  onPick={(t) => handlePick(t, "zones")}
  isOpen={openGroup === "zones"}
  onToggle={() => setOpenGroup(g => g === "zones" ? null : "zones")}
/>

<GroupButton
  groupId="transform"
  label="TRANSFORM"
  currentTool={currentTool}
  lastUsed={lastUsed}
  setLastUsed={setLastUsed}
  onPick={(t) => handlePick(t, "transform")}
  isOpen={openGroup === "transform"}
  onToggle={() => setOpenGroup(g => g === "transform" ? null : "transform")}
/>

      <div className="w-8 h-px bg-gray-200 my-1" />

      {/* Edit */}
      <div className="flex flex-col items-center gap-2">
        <Button title="Duplicate (Ctrl/⌘+D)" onClick={onDuplicate}><IconDuplicate /></Button>
        <Button title="Delete (Del)" onClick={onDelete}><IconDelete /></Button>

        <div className="relative">
          <Button title="Align (L/C/R)" onClick={() => setAlignOpen(v => !v)}><IconAlign /></Button>
          {alignOpen && (
            <div className="absolute left-16 top-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex gap-2">
              <Button title="Align Left" onClick={() => onAlign("left")}><IconAlign /></Button>
              <Button title="Align Center" onClick={() => onAlign("center")}><IconAlign /></Button>
              <Button title="Align Right" onClick={() => onAlign("right")}><IconAlign /></Button>
            </div>
          )}
        </div>
      </div>

      <div className="w-8 h-px bg-gray-200 my-1" />

      {/* View / BG */}
      <div className="flex flex-col items-center gap-2">
        <Button title="Toggle grid" active={!!showGrid} onClick={onToggleGrid} disabled={!onToggleGrid}><IconGrid /></Button>
        <Button title="Upload image" onClick={pickFile}><IconUpload /></Button>
        <Button
          title={backgroundMode === "manual" ? "Background: manual" : "Background: auto"}
          active={backgroundMode === "manual"}
          onClick={() => setBackgroundMode(backgroundMode === "manual" ? "auto" : "manual")}
        >
          <IconBg />
        </Button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
    </aside>
  );
}
