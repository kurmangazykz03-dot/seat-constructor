// src/components/editor/PropertiesPanel.tsx
import React from "react";
import type { SeatmapState } from "../../pages/EditorPage";
import type { Row, Seat, Zone, TextObject, ShapeObject } from "../../types/types";

/* --------------------------- constants & helpers -------------------------- */
type ShapePreset = {
  key: string;
  label: string;
  fill?: string;         // undefined = no fill
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;      // 0..1
};

const SHAPE_PRESETS: ShapePreset[] = [
  { key: "light",       label: "Light",       fill: "#ffffff", stroke: "#1f2937", strokeWidth: 1, opacity: 1 },
  { key: "dark",        label: "Dark",        fill: "#111827", stroke: "#ffffff", strokeWidth: 1, opacity: 1 },
  { key: "accent",      label: "Accent",      fill: "#eab308", stroke: "#1f2937", strokeWidth: 1, opacity: 1 },
  { key: "muted",       label: "Muted",       fill: "#e5e7eb", stroke: "#6b7280", strokeWidth: 1, opacity: 1 },
  { key: "outline",     label: "Outline",     fill: undefined, stroke: "#1f2937", strokeWidth: 2, opacity: 1 },
  { key: "transparent", label: "Transparent", fill: undefined, stroke: undefined, strokeWidth: 0, opacity: 0.25 },
];

// Небольшой визуальный свотч пресета
const PresetSwatch: React.FC<{ preset: ShapePreset }> = ({ preset }) => {
  const borderW = Math.max(1, preset.strokeWidth ?? 1);
  return (
    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
      <span
        className="h-4 w-4 rounded-full"
        style={{
          background: preset.fill ?? "transparent",
          border: `${borderW}px solid ${preset.stroke ?? "#e5e7eb"}`,
        }}
        title={`${preset.label}`}
      />
      <span className="text-[11px] text-gray-700">{preset.label}</span>
    </span>
  );
};

const CATEGORY_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "vip", label: "VIP" },
  { value: "discount", label: "Discount" },
] as const;

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "disabled", label: "Disabled" },
] as const;

const COLOR_OPTIONS = ["#22c55e", "#ef4444", "#9ca3af", "#eab308"];
const SNAP_Y_THRESHOLD = 12;
const RADIUS_MIN = 6;
const RADIUS_MAX = 30;
const DEFAULT_RADIUS = 12;
const DEFAULT_SPACING_X = 30;
const DEFAULT_SPACING_Y = 30;

const STATUS_COLOR = {
  available: "#22c55e",
  occupied: "#ef4444",
  disabled: "#9ca3af",
} as const;

const CATEGORY_COLOR: Record<string, string> = {
  standard: "#22c55e",
  vip: "#eab308",
  discount: "#22c55e",
};

function colorFor(status: Seat["status"], category?: string) {
  if (status === "occupied") return STATUS_COLOR.occupied;
  if (status === "disabled") return STATUS_COLOR.disabled;
  if (category && CATEGORY_COLOR[category]) return CATEGORY_COLOR[category];
  return STATUS_COLOR.available;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const toInt = (v: string | number, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};

/* --------------------------------- UI bits -------------------------------- */

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">{children}</div>
);

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <div className="mb-2">
    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
  </div>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition ${props.className ?? ""}`}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, ...props }) => (
  <select
    {...props}
    className={`w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white appearance-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition ${props.className ?? ""}`}
  >
    {children}
  </select>
);

// компактный number с «±»
const StepperNumber: React.FC<{
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  onBlur?: () => void;
}> = ({ value, min = -1e9, max = 1e9, step = 1, onChange, onBlur }) => {
  const dec = () => onChange(clamp(value - step, min, max));
  const inc = () => onChange(clamp(value + step, min, max));
  return (
    <div className="flex items-stretch">
      <button type="button" onClick={dec} className="px-2 border border-gray-300 rounded-l-lg text-gray-600 hover:bg-gray-50">
        –
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clamp(toInt(e.target.value, value), min, max))}
        onBlur={onBlur}
        className="w-full border-t border-b border-gray-300 px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
      />
      <button type="button" onClick={inc} className="px-2 border border-gray-300 rounded-r-lg text-gray-600 hover:bg-gray-50">
        +
      </button>
    </div>
  );
};

/* -------------------------------- component -------------------------------- */

interface PropertiesPanelProps {
  selectedIds: string[];
  state: SeatmapState;
  setState: (updater: (prev: SeatmapState) => SeatmapState) => void;
}

export default function PropertiesPanel({ selectedIds, state, setState }: PropertiesPanelProps) {
  const { seats, rows, zones } = state;

  const [rotDraft, setRotDraft] = React.useState<Record<string, string>>({});
  const [autoReflow, setAutoReflow] = React.useState<boolean>(() => {
    const raw = localStorage.getItem("seatmap_auto_reflow_spacing");
    return raw ? raw === "1" : true;
  });

  React.useEffect(() => {
    localStorage.setItem("seatmap_auto_reflow_spacing", autoReflow ? "1" : "0");
  }, [autoReflow]);

  const selectedZones = React.useMemo(() => zones.filter((z) => selectedIds.includes(z.id)), [zones, selectedIds]);
  const selectedRows = React.useMemo(() => rows.filter((r) => selectedIds.includes(r.id)), [rows, selectedIds]);
  const selectedSeats = React.useMemo(() => seats.filter((s) => selectedIds.includes(s.id)), [seats, selectedIds]);
  const selectedTexts = React.useMemo(() => state.texts.filter((t) => selectedIds.includes(t.id)), [state.texts, selectedIds]);
  const selectedShapes = React.useMemo(() => (state.shapes || []).filter((sh) => selectedIds.includes(sh.id)), [state.shapes, selectedIds]);

  const selectedSeatIdSet = React.useMemo(() => new Set(selectedSeats.map((s) => s.id)), [selectedSeats]);

  /* ---------------------------- state update helpers ---------------------------- */

  const updateZone = (zoneId: string, patch: Partial<Zone>, opts?: { maybeReflowBySpacing?: boolean }) => {
    setState((prev) => {
      const nextZones = prev.zones.map((z) => (z.id === zoneId ? { ...z, ...patch } : z));
      let next: SeatmapState = { ...prev, zones: nextZones };

      // автоперекладка при изменении seatSpacingX/Y — если включено
      const changedSpacing = "seatSpacingX" in (patch as any) || "seatSpacingY" in (patch as any);
      if (autoReflow && opts?.maybeReflowBySpacing && changedSpacing) {
        next = reflowZoneBySpacingState(next, zoneId);
      }
      return next;
    });
  };

  const updateRowAndSeats = (rowId: string, patch: Partial<Row> & { x?: number; y?: number }) => {
    setState((prev) => {
      const row = prev.rows.find((r) => r.id === rowId);
      if (!row) return prev;
      const dx = patch.x != null ? patch.x - row.x : 0;
      const dy = patch.y != null ? patch.y - row.y : 0;
      return {
        ...prev,
        rows: prev.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
        seats: prev.seats.map((s) => (s.rowId === rowId ? { ...s, x: s.x + dx, y: s.y + dy } : s)),
      };
    });
  };

  const updateSeat = (seatId: string, patch: Partial<Seat>) => {
    setState((prev) => ({
      ...prev,
      seats: prev.seats.map((s) => {
        if (s.id !== seatId) return s;
        const next = { ...s, ...patch };
        if ("status" in patch || "category" in patch) {
          next.fill = colorFor(next.status as Seat["status"], next.category as string);
        }
        return next;
      }),
    }));
  };

  const updateSelectedSeatsBulk = (patch: Partial<Seat>) => {
    if (selectedSeatIdSet.size === 0) return;
    setState((prev) => ({
      ...prev,
      seats: prev.seats.map((s) => {
        if (!selectedSeatIdSet.has(s.id)) return s;
        const next = { ...s, ...patch };
        if ("status" in patch || "category" in patch) {
          next.fill = colorFor((next.status ?? s.status) as Seat["status"], (next.category ?? s.category) as string);
        }
        return next;
      }),
    }));
  };

  const updateAllSeatsOfSelectedRows = (patch: Partial<Seat>) => {
    const rowIds = new Set(selectedRows.map((r) => r.id));
    if (rowIds.size === 0) return;
    setState((prev) => ({
      ...prev,
      seats: prev.seats.map((s) => {
        if (!s.rowId || !rowIds.has(s.rowId)) return s;
        const next = { ...s, ...patch };
        if ("status" in patch || "category" in patch) {
          next.fill = colorFor((next.status ?? s.status) as Seat["status"], (next.category ?? s.category) as string);
        }
        return next;
      }),
    }));
  };

  const updateAllSeatsOfSelectedZones = (patch: Partial<Seat>) => {
    const zoneIds = new Set(selectedZones.map((z) => z.id));
    if (zoneIds.size === 0) return;
    setState((prev) => ({
      ...prev,
      seats: prev.seats.map((s) => {
        if (!s.zoneId || !zoneIds.has(s.zoneId)) return s;
        const next = { ...s, ...patch };
        if ("status" in patch || "category" in patch) {
          next.fill = colorFor((next.status ?? s.status) as Seat["status"], (next.category ?? s.category) as string);
        }
        return next;
      }),
    }));
  };

  const updateText = (textId: string, patch: Partial<TextObject>) => {
    setState((prev) => ({
      ...prev,
      texts: prev.texts.map((t) => (t.id === textId ? { ...t, ...patch } : t)),
    }));
  };

  const updateShape = (shapeId: string, patch: Partial<ShapeObject>) => {
    setState((prev) => ({
      ...prev,
      shapes: prev.shapes.map((s) => (s.id === shapeId ? { ...s, ...patch } : s)),
    }));
  };

  const updateSelectedShapesBulk = (patch: Partial<ShapeObject>) => {
    const ids = new Set(selectedShapes.map((s) => s.id));
    if (!ids.size) return;
    setState((prev) => ({
      ...prev,
      shapes: prev.shapes.map((s) => (ids.has(s.id) ? { ...s, ...patch } : s)),
    }));
  };

  // пропорциональный ресайз полигона при изменении width/height
  const resizePolygon = (sh: ShapeObject, nextW: number, nextH: number) => {
    if (sh.kind !== "polygon" || !sh.points || sh.width === 0 || sh.height === 0) return sh;
    const sx = nextW / sh.width;
    const sy = nextH / sh.height;
    return { ...sh, width: nextW, height: nextH, points: sh.points.map((p) => ({ x: p.x * sx, y: p.y * sy })) };
  };

  /* ------------------------------- reflow utils ------------------------------ */

  const reflowZoneBySpacingState = (curr: SeatmapState, zoneId: string): SeatmapState => {
    const z = curr.zones.find((zz) => zz.id === zoneId);
    if (!z) return curr;

    const sx = Math.max(4, Math.round(z.seatSpacingX ?? DEFAULT_SPACING_X));
    const sy = Math.max(4, Math.round(z.seatSpacingY ?? DEFAULT_SPACING_Y));

    const rowsInZone = [...curr.rows].filter((r) => r.zoneId === zoneId).sort((a, b) => a.y - b.y);
    if (!rowsInZone.length) return curr;

    const rowsNext = curr.rows.map((r) => ({ ...r }));
    const seatsNext = curr.seats.map((s) => ({ ...s }));

    const totalH = (rowsInZone.length - 1) * sy;
    const baseY = totalH <= z.height ? (z.height - totalH) / 2 : 0;

    rowsInZone.forEach((r, i) => {
      const newY = Math.round(baseY + i * sy);
      const ri = rowsNext.findIndex((rr) => rr.id === r.id);
      if (ri >= 0) rowsNext[ri].y = newY;

      const rs = seatsNext.filter((s) => s.rowId === r.id).sort((a, b) => a.x - b.x);
      const n = rs.length;
      if (n > 0) {
        const totalW = (n - 1) * sx;
        const baseX = totalW <= z.width ? (z.width - totalW) / 2 : 0;
        rs.forEach((s, j) => {
          const si = seatsNext.findIndex((ss) => ss.id === s.id);
          if (si >= 0) {
            seatsNext[si].x = Math.round(baseX + j * sx);
            seatsNext[si].y = newY;
          }
        });
      }
    });

    return { ...curr, rows: rowsNext, seats: seatsNext };
  };

  const reflowZone = (zoneId: string) => {
    setState((prev) => {
      const z = prev.zones.find((zz) => zz.id === zoneId);
      if (!z) return prev;

      const rowsInZone = [...prev.rows].filter((r) => r.zoneId === zoneId).sort((a, b) => a.y - b.y);
      if (rowsInZone.length === 0) return prev;

      const rowsNext = prev.rows.map((r) => ({ ...r }));
      const seatsNext = prev.seats.map((s) => ({ ...s }));

      // радиусы по рядам
      const rowMaxR: Record<string, number> = {};
      for (const r of rowsInZone) {
        const rs = seatsNext.filter((s) => s.rowId === r.id);
        rowMaxR[r.id] = rs.length ? Math.max(...rs.map((s) => s.radius ?? DEFAULT_RADIUS)) : DEFAULT_RADIUS;
      }

      // по Y (ряды)
      const rowsCount = rowsInZone.length;
      const padY = Math.min(Math.max(...rowsInZone.map((r) => rowMaxR[r.id])), z.height / 2);
      const usableH = Math.max(0, z.height - 2 * padY);
      const stepY = rowsCount > 1 ? usableH / (rowsCount - 1) : 0;

      rowsInZone.forEach((r, i) => {
        const newY = rowsCount > 1 ? padY + stepY * i : z.height / 2;
        const idx = rowsNext.findIndex((rr) => rr.id === r.id);
        if (idx >= 0) rowsNext[idx].y = Math.round(newY);
      });

      // по X (места)
      for (const r of rowsInZone) {
        const rs = seatsNext.filter((s) => s.rowId === r.id).sort((a, b) => a.x - b.x);
        if (rs.length === 0) continue;
        const rPadX = Math.min(Math.max(...rs.map((s) => s.radius ?? DEFAULT_RADIUS)), z.width / 2);
        const cols = rs.length;
        const usableW = Math.max(0, z.width - 2 * rPadX);
        const stepX = cols > 1 ? usableW / (cols - 1) : 0;
        rs.forEach((s, i) => {
          const nx = cols > 1 ? rPadX + stepX * i : z.width / 2;
          const si = seatsNext.findIndex((ss) => ss.id === s.id);
          if (si >= 0) seatsNext[si].x = Math.round(nx);
        });
      }

      return { ...prev, rows: rowsNext, seats: seatsNext };
    });
  };

  const reflowZoneBySpacing = (zoneId: string) => setState((prev) => reflowZoneBySpacingState(prev, zoneId));

  // добавить колонку мест в зону
  const addColumnToZone = (zoneId: string, side: "left" | "right") => {
    setState((prev) => {
      const zone = prev.zones.find((z) => z.id === zoneId);
      if (!zone) return prev;
      const STEP_X = Math.max(4, Math.round(zone.seatSpacingX ?? DEFAULT_SPACING_X));

      let rowsNext = [...prev.rows];
      let seatsNext = [...prev.seats];
      const zoneRows = rowsNext.filter((r) => r.zoneId === zoneId);

      // сдвиг вправо, если добавляем слева и выходим за 0
      if (side === "left") {
        let requiredShift = 0;
        for (const r of zoneRows) {
          const rowSeats = seatsNext.filter((s) => s.rowId === r.id);
          const rRad = rowSeats[0]?.radius ?? DEFAULT_RADIUS;
          const baseMin = rowSeats.length ? Math.min(...rowSeats.map((s) => s.x)) : r.x + rRad;
          const proposed = rowSeats.length ? baseMin - STEP_X : r.x + rRad;
          requiredShift = Math.max(requiredShift, Math.max(0, rRad - proposed));
        }
        if (requiredShift > 0) {
          rowsNext = rowsNext.map((rr) => (rr.zoneId === zoneId ? { ...rr, x: rr.x + requiredShift } : rr));
          seatsNext = seatsNext.map((s) => (s.zoneId === zoneId ? { ...s, x: s.x + requiredShift } : s));
        }
      }

      const newSeats: Seat[] = [];
      for (const r of zoneRows) {
        const rowSeats = seatsNext.filter((s) => s.rowId === r.id);
        const base = rowSeats[0];
        const rRad = base?.radius ?? DEFAULT_RADIUS;

        let newX: number;
        if (rowSeats.length === 0) newX = r.x + rRad;
        else if (side === "right") newX = Math.max(...rowSeats.map((s) => s.x)) + STEP_X;
        else newX = Math.min(...rowSeats.map((s) => s.x)) - STEP_X;

        newSeats.push({
          id: `seat-${crypto.randomUUID()}`,
          x: newX,
          y: r.y,
          radius: rRad,
          fill: base?.fill ?? "#22c55e",
          label: "",
          category: base?.category ?? "standard",
          status: base?.status ?? "available",
          zoneId,
          rowId: r.id,
          colIndex: 0,
        });
      }

      seatsNext = seatsNext.concat(newSeats);

      // расширить ширину зоны, если нужно
      const seatsInZone = seatsNext.filter((s) => s.zoneId === zoneId);
      const needWidth = seatsInZone.length
        ? Math.max(...seatsInZone.map((s) => s.x + (s.radius ?? DEFAULT_RADIUS)))
        : zone.width;
      const zonesNext = prev.zones.map((z) => (z.id === zoneId ? { ...z, width: Math.max(z.width, needWidth) } : z));

      // перенумерация
      for (const r of zoneRows) {
        const rs = seatsNext.filter((s) => s.rowId === r.id).sort((a, b) => a.x - b.x);
        rs.forEach((s, i) => {
          s.colIndex = i + 1;
          s.label = String(i + 1);
        });
      }

      return { ...prev, rows: rowsNext, seats: seatsNext, zones: zonesNext };
    });
  };

  const renumberZoneSeats = (zoneId: string, dir: "ltr" | "rtl") => {
    setState((prev) => {
      const rowsInZone = prev.rows.filter((r) => r.zoneId === zoneId);
      if (!rowsInZone.length) return prev;
      const seatsNext = prev.seats.map((s) => ({ ...s }));

      for (const r of rowsInZone) {
        const rs = seatsNext.filter((s) => s.rowId === r.id).sort((a, b) => a.x - b.x);
        const n = rs.length;
        if (!n) continue;
        if (dir === "ltr") rs.forEach((s, i) => ((s.colIndex = i + 1), (s.label = String(i + 1))));
        else rs.forEach((s, i) => ((s.colIndex = n - i), (s.label = String(n - i))));
      }
      return { ...prev, seats: seatsNext };
    });
  };

  const renumberRowSeatsDir = (rowId: string, dir: "ltr" | "rtl") => {
    setState((prev) => {
      const rs = prev.seats.filter((s) => s.rowId === rowId).sort((a, b) => a.x - b.x);
      const n = rs.length;
      if (!n) return prev;
      const id2num = new Map<string, number>();
      if (dir === "ltr") rs.forEach((s, i) => id2num.set(s.id, i + 1));
      else rs.forEach((s, i) => id2num.set(s.id, n - i));
      return {
        ...prev,
        seats: prev.seats.map((s) => {
          const num = id2num.get(s.id);
          return num ? { ...s, colIndex: num, label: String(num) } : s;
        }),
      };
    });
  };

  const distributeRowSeats = (rowId: string) => {
    setState((prev) => {
      const seatsInRow = prev.seats.filter((s) => s.rowId === rowId);
      if (seatsInRow.length < 2) return prev;
      const sorted = [...seatsInRow].sort((a, b) => a.x - b.x);
      const minX = sorted[0].x;
      const maxX = sorted[sorted.length - 1].x;
      const step = (maxX - minX) / (sorted.length - 1);
      const idxMap = new Map(sorted.map((s, i) => [s.id, i]));
      const rowY = prev.rows.find((r) => r.id === rowId)?.y;
      return {
        ...prev,
        seats: prev.seats.map((s) => {
          if (s.rowId !== rowId) return s;
          const i = idxMap.get(s.id);
          if (i == null) return s;
          return { ...s, x: Math.round(minX + step * i), y: rowY ?? s.y };
        }),
      };
    });
  };
  const applyShapePresetBulk = (p: ShapePreset) => {
  updateSelectedShapesBulk({
    fill: p.fill,
    stroke: p.stroke,
    strokeWidth: p.strokeWidth,
    opacity: p.opacity,
  });
};

// для одного шейпа
const applyShapePresetOne = (shapeId: string, p: ShapePreset) => {
  updateShape(shapeId, {
    fill: p.fill,
    stroke: p.stroke,
    strokeWidth: p.strokeWidth,
    opacity: p.opacity,
  });
};

  /* -------------------------------- empty state ------------------------------- */

  if (selectedIds.length === 0) {
    return (
      <div className="w-[320px] bg-gray-50 border-l border-gray-200 p-6 shadow-lg h-full overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Properties</h2>
        <p className="text-sm text-gray-500">Выберите зону, ряд, место, текст или шейп для редактирования.</p>
      </div>
    );
  }

  /* --------------------------------- header --------------------------------- */

  const CountChip = ({ label }: { label: string }) => (
    <span className="px-2 py-1 text-[11px] rounded-md bg-white border border-gray-200 text-gray-600">{label}</span>
  );

  /* ---------------------------------- render -------------------------------- */

  return (
    <div className="w-[320px] bg-gray-50 border-l border-gray-200 p-6 shadow-lg h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-gray-900">Properties</h2>
        <div className="flex gap-1 flex-wrap">
          {selectedZones.length > 0 && <CountChip label={`Zones: ${selectedZones.length}`} />}
          {selectedRows.length > 0 && <CountChip label={`Rows: ${selectedRows.length}`} />}
          {selectedSeats.length > 0 && <CountChip label={`Seats: ${selectedSeats.length}`} />}
          {selectedTexts.length > 0 && <CountChip label={`Text: ${selectedTexts.length}`} />}
          {selectedShapes.length > 0 && <CountChip label={`Shapes: ${selectedShapes.length}`} />}
        </div>
      </div>

      <Panel>
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600">Auto reflow by spacing</div>
          <button
            type="button"
            role="switch"
            aria-checked={autoReflow ? "true" : "false"}
            onClick={() => setAutoReflow((v) => !v)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-300 ${
              autoReflow ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow ring-1 ring-gray-300 transition-all ${
                autoReflow ? "left-4" : "left-1"
              }`}
            />
          </button>
        </div>
      </Panel>

      {/* ------------------------------- SHAPES -------------------------------- */}
      {selectedShapes.length > 1 && (
        
        <Panel>
          <h3 className="text-sm font-semibold text-amber-700 mb-3">Bulk edit — Shapes</h3>
          <Field label="Presets">
      <div className="grid grid-cols-2 gap-2">
        {SHAPE_PRESETS.map(p => (
          <button key={p.key} type="button" onClick={() => applyShapePresetBulk(p)}>
            <PresetSwatch preset={p} />
          </button>
        ))}
      </div>
    </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Fill">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  defaultValue="#ffffff"
                  onChange={(e) => updateSelectedShapesBulk({ fill: e.target.value })}
                  className="w-10 h-10 rounded-lg border"
                />
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      style={{ backgroundColor: c }}
                      className="w-6 h-6 rounded-full border"
                      onClick={() => updateSelectedShapesBulk({ fill: c })}
                    />
                  ))}
                </div>
              </div>
            </Field>
            <Field label="Stroke">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  defaultValue="#111827"
                  onChange={(e) => updateSelectedShapesBulk({ stroke: e.target.value })}
                  className="w-10 h-10 rounded-lg border"
                />
              </div>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Stroke width">
              <StepperNumber value={1} min={0} step={1} onChange={(v) => updateSelectedShapesBulk({ strokeWidth: v })} />
            </Field>
            <Field label="Opacity">
              <input
                type="range"
                min={0}
                max={100}
                defaultValue={100}
                onChange={(e) => updateSelectedShapesBulk({ opacity: toInt(e.target.value, 100) / 100 })}
                className="w-full accent-blue-600"
              />
            </Field>
          </div>
        </Panel>
      )}

      {selectedShapes.map((sh) => (
        <Panel key={sh.id}>
          <h3 className="text-base font-semibold text-amber-700 mb-3">Shape: {sh.kind}</h3>
           {/* ⬇️ Preset для одного шейпа */}
  <Field label="Preset">
    <div className="flex flex-wrap gap-2">
      {SHAPE_PRESETS.map(p => (
        <button key={p.key} type="button" onClick={() => applyShapePresetOne(sh.id, p)}>
          <PresetSwatch preset={p} />
        </button>
      ))}
    </div>
  </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="X">
              <StepperNumber value={Math.round(sh.x)} step={1} onChange={(v) => updateShape(sh.id, { x: v })} />
            </Field>
            <Field label="Y">
              <StepperNumber value={Math.round(sh.y)} step={1} onChange={(v) => updateShape(sh.id, { y: v })} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Width">
              <StepperNumber
                value={Math.round(sh.width)}
                min={2}
                step={1}
                onChange={(v) => {
                  if (sh.kind === "polygon") updateShape(sh.id, resizePolygon(sh, v, sh.height));
                  else updateShape(sh.id, { width: v });
                }}
              />
            </Field>
            <Field label="Height">
              <StepperNumber
                value={Math.round(sh.height)}
                min={2}
                step={1}
                onChange={(v) => {
                  if (sh.kind === "polygon") updateShape(sh.id, resizePolygon(sh, sh.width, v));
                  else updateShape(sh.id, { height: v });
                }}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Fill">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={sh.fill ?? "#ffffff"}
                  onChange={(e) => updateShape(sh.id, { fill: e.target.value })}
                  className="w-10 h-10 rounded-lg border"
                />
              </div>
            </Field>
            <Field label="Stroke">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={sh.stroke ?? "#111827"}
                  onChange={(e) => updateShape(sh.id, { stroke: e.target.value })}
                  className="w-10 h-10 rounded-lg border"
                />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Stroke width">
              <StepperNumber
                value={Math.round(sh.strokeWidth ?? 1)}
                min={0}
                step={1}
                onChange={(v) => updateShape(sh.id, { strokeWidth: v })}
              />
            </Field>
            <Field label={`Opacity: ${Math.round((sh.opacity ?? 1) * 100)}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((sh.opacity ?? 1) * 100)}
                onChange={(e) => updateShape(sh.id, { opacity: toInt(e.target.value, 100) / 100 })}
                className="w-full accent-blue-600"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Rotation (°)">
              <StepperNumber
                value={Math.round(sh.rotation ?? 0)}
                step={1}
                onChange={(v) => updateShape(sh.id, { rotation: v })}
              />
            </Field>
            <Field label="Flip">
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 text-xs bg-gray-100 rounded border" onClick={() => updateShape(sh.id, { flipX: !sh.flipX })}>
                  Mirror X
                </button>
                <button className="px-2 py-1 text-xs bg-gray-100 rounded border" onClick={() => updateShape(sh.id, { flipY: !sh.flipY })}>
                  Mirror Y
                </button>
              </div>
            </Field>
          </div>

          {sh.kind === "polygon" && <p className="text-xs text-gray-500 mt-2">Точки полигона — в будущем обновлении.</p>}
        </Panel>
      ))}

      {/* -------------------------------- TEXTS -------------------------------- */}
      {selectedTexts.map((t) => (
        <Panel key={t.id}>
          <h3 className="text-base font-semibold text-indigo-700 mb-3">Text</h3>

          <Field label="Text">
            <TextInput type="text" value={t.text} placeholder="Введите текст" onChange={(e) => updateText(t.id, { text: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Font size">
              <StepperNumber
                value={Math.round(t.fontSize)}
                min={8}
                max={256}
                step={1}
                onChange={(v) => updateText(t.id, { fontSize: clamp(v, 8, 256) })}
              />
            </Field>
            <Field label="Font family" hint="Напр.: Inter, Roboto, Arial">
              <TextInput
                type="text"
                value={t.fontFamily ?? ""}
                onChange={(e) => updateText(t.id, { fontFamily: e.target.value || undefined })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Rotation (°)">
              <StepperNumber value={Math.round(t.rotation ?? 0)} step={1} onChange={(v) => updateText(t.id, { rotation: v })} />
            </Field>
            <Field label="Fill">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={t.fill ?? "#111827"}
                  onChange={(e) => updateText(t.id, { fill: e.target.value })}
                  className="w-10 h-10 rounded-lg border"
                />
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border ${t.fill === c ? "ring-2 ring-blue-500" : ""}`}
                      onClick={() => updateText(t.id, { fill: c })}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </Field>
          </div>
        </Panel>
      ))}

      {/* -------------------------------- ZONES -------------------------------- */}
      {selectedZones.length > 0 && (
        <Panel>
          <h3 className="text-sm font-semibold text-blue-700 mb-3">Apply to all seats in selected zones</h3>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Status">
              <Select defaultValue="" onChange={(e) => e.currentTarget.value && updateAllSeatsOfSelectedZones({ status: e.currentTarget.value as Seat["status"] })}>
                <option value="">— keep —</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select defaultValue="" onChange={(e) => e.currentTarget.value && updateAllSeatsOfSelectedZones({ category: e.currentTarget.value })}>
                <option value="">— keep —</option>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Field label="Radius">
              <StepperNumber value={12} min={RADIUS_MIN} max={RADIUS_MAX} step={1} onChange={(v) => updateAllSeatsOfSelectedZones({ radius: v })} />
            </Field>
            <Field label="Color">
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    style={{ backgroundColor: c }}
                    className="w-7 h-7 rounded-lg shadow-sm hover:scale-105 transition"
                    onClick={() => updateAllSeatsOfSelectedZones({ fill: c })}
                    title={c}
                  />
                ))}
              </div>
            </Field>
          </div>
        </Panel>
      )}

      {selectedZones.map((zone) => (
        <Panel key={zone.id}>
          <h3 className="text-base font-semibold text-blue-700 mb-3">Zone: {zone.label}</h3>
          
 <Field label="Row labels side">
   <div className="flex gap-2">
     <button
       className={`px-3 py-1.5 text-sm rounded-lg border ${ (zone.rowLabelSide ?? 'left') === 'left' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white' }`}
       onClick={() => updateZone(zone.id, { rowLabelSide: 'left' })}
     >
       Left
     </button>
     <button
       className={`px-3 py-1.5 text-sm rounded-lg border ${ (zone.rowLabelSide ?? 'left') === 'right' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white' }`}
       onClick={() => updateZone(zone.id, { rowLabelSide: 'right' })}
     >
       Right
     </button>
   </div>
 </Field>


          <Field label="Zone Label">
            <TextInput type="text" value={zone.label} onChange={(e) => updateZone(zone.id, { label: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="X">
              <StepperNumber value={Math.round(zone.x)} step={1} onChange={(v) => updateZone(zone.id, { x: v })} />
            </Field>
            <Field label="Y">
              <StepperNumber value={Math.round(zone.y)} step={1} onChange={(v) => updateZone(zone.id, { y: v })} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Width">
              <StepperNumber
                value={Math.round(zone.width)}
                min={10}
                step={1}
                onChange={(v) => updateZone(zone.id, { width: Math.max(10, v) })}
                onBlur={() => reflowZoneBySpacing(zone.id)}
              />
            </Field>
            <Field label="Height">
              <StepperNumber
                value={Math.round(zone.height)}
                min={10}
                step={1}
                onChange={(v) => updateZone(zone.id, { height: Math.max(10, v) })}
                onBlur={() => reflowZone(zone.id)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => addColumnToZone(zone.id, "left")} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border">
              + Column Left
            </button>
            <button onClick={() => addColumnToZone(zone.id, "right")} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border">
              + Column Right
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-600">Seat numbering:</span>
            <button onClick={() => renumberZoneSeats(zone.id, "ltr")} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg border">
              L→R
            </button>
            <button onClick={() => renumberZoneSeats(zone.id, "rtl")} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg border">
              R→L
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <Field label="Seat spacing X (px)">
              <StepperNumber
                value={Math.round(zone.seatSpacingX ?? DEFAULT_SPACING_X)}
                min={4}
                step={1}
                onChange={(v) => updateZone(zone.id, { seatSpacingX: Math.max(4, v) }, { maybeReflowBySpacing: true })}
              />
            </Field>
            <Field label="Seat spacing Y (px)">
              <StepperNumber
                value={Math.round(zone.seatSpacingY ?? DEFAULT_SPACING_Y)}
                min={4}
                step={1}
                onChange={(v) => updateZone(zone.id, { seatSpacingY: Math.max(4, v) }, { maybeReflowBySpacing: true })}
              />
            </Field>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => reflowZoneBySpacing(zone.id)} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border">
              Apply (by spacing)
            </button>
            <button onClick={() => reflowZone(zone.id)} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border">
              Distribute seats to fit
            </button>
          </div>

          <Field label="Rotation (°)">
            <TextInput
              type="text"
              inputMode="numeric"
              value={rotDraft[zone.id] ?? String(zone.rotation ?? 0)}
              onChange={(e) => setRotDraft((prev) => ({ ...prev, [zone.id]: e.target.value }))}
              onBlur={() => {
                const raw = rotDraft[zone.id] ?? String(zone.rotation ?? 0);
                const n = Number(raw.trim());
                const finalVal = Number.isFinite(n) ? Math.round(n) : (zone.rotation ?? 0);
                updateZone(zone.id, { rotation: finalVal });
                setRotDraft((prev) => {
                  const copy = { ...prev };
                  delete copy[zone.id];
                  return copy;
                });
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              placeholder="e.g. -45"
            />
          </Field>

          <Field label="Фон зоны">
            <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <div className="relative h-4 w-4 rounded border overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `
                        linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                        linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                        linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
                      `,
                      backgroundSize: "8px 8px",
                      backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                      backgroundColor: "#fff",
                    }}
                  />
                  {!zone.transparent && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: zone.color ?? zone.fill ?? "#ffffff",
                        opacity: zone.fillOpacity ?? 1,
                      }}
                    />
                  )}
                </div>
                <span className="text-xs text-gray-700">{zone.transparent ? "Прозрачный" : "Заливка"}</span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={zone.transparent ? "true" : "false"}
                onClick={() => updateZone(zone.id, { transparent: !zone.transparent })}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-300 ${
                  zone.transparent ? "bg-emerald-500" : "bg-gray-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`}
                title="Переключить прозрачный фон"
              >
                <span
                  className={`pointer-events-none absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow ring-1 ring-gray-300 transition-all ${
                    zone.transparent ? "left-4" : "left-1"
                  }`}
                />
              </button>
            </div>
          </Field>

          {!zone.transparent && (
            <Field label={`Opacity: ${Math.round((zone.fillOpacity ?? 1) * 100)}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((zone.fillOpacity ?? 1) * 100)}
                onChange={(e) => updateZone(zone.id, { fillOpacity: toInt(e.target.value, 100) / 100 })}
                className="w-full accent-blue-600"
              />
            </Field>
          )}
        </Panel>
      ))}

      {/* -------------------------------- ROWS --------------------------------- */}
      {selectedRows.map((row) => {
        const rowSeats = seats.filter((s) => s.rowId === row.id);
        return (
          <Panel key={row.id}>
            <h3 className="text-base font-semibold text-green-700 mb-3">Row: {row.label}</h3>

            <Field label="Row Label">
              <TextInput
                type="text"
                value={row.label}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    rows: prev.rows.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)),
                  }))
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="X">
                <StepperNumber value={Math.round(row.x)} step={1} onChange={(v) => updateRowAndSeats(row.id, { x: v })} />
              </Field>
              <Field label="Y">
                <StepperNumber value={Math.round(row.y)} step={1} onChange={(v) => updateRowAndSeats(row.id, { y: v })} />
              </Field>
            </div>

            {rowSeats.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => distributeRowSeats(row.id)} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border">
                    Distribute horizontally
                  </button>
                  <button onClick={() => renumberRowSeatsDir(row.id, "ltr")} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border">
                    Number L→R
                  </button>
                </div>
                <div className="mt-2">
                  <button onClick={() => renumberRowSeatsDir(row.id, "rtl")} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border">
                    Number R→L
                  </button>
                </div>

                <h4 className="text-sm font-semibold text-gray-800 mb-3 mt-4">Apply to all seats in row</h4>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Status">
                    <Select defaultValue="" onChange={(e) => e.currentTarget.value && updateAllSeatsOfSelectedRows({ status: e.currentTarget.value as Seat["status"] })}>
                      <option value="">— keep —</option>
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Category">
                    <Select defaultValue="" onChange={(e) => e.currentTarget.value && updateAllSeatsOfSelectedRows({ category: e.currentTarget.value })}>
                      <option value="">— keep —</option>
                      {CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label={`Radius (min ${RADIUS_MIN}, max ${RADIUS_MAX})`}>
                    <StepperNumber value={12} min={RADIUS_MIN} max={RADIUS_MAX} step={1} onChange={(v) => updateAllSeatsOfSelectedRows({ radius: v })} />
                  </Field>
                </div>

                <Field label="Color">
                  <div className="flex gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        style={{ backgroundColor: c }}
                        className="w-7 h-7 rounded-lg shadow-sm hover:scale-105 transition"
                        onClick={() => updateAllSeatsOfSelectedRows({ fill: c })}
                        title={c}
                      />
                    ))}
                  </div>
                </Field>
              </div>
            )}
          </Panel>
        );
      })}

      {/* -------------------------------- SEATS -------------------------------- */}
      {selectedSeats.length > 1 && (
        <Panel>
          <h3 className="text-sm font-semibold text-purple-700 mb-3">Bulk edit — Seats</h3>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Status">
              <Select defaultValue="" onChange={(e) => e.currentTarget.value && updateSelectedSeatsBulk({ status: e.currentTarget.value as Seat["status"] })}>
                <option value="">— keep —</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select defaultValue="" onChange={(e) => e.currentTarget.value && updateSelectedSeatsBulk({ category: e.currentTarget.value })}>
                <option value="">— keep —</option>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label={`Radius (min ${RADIUS_MIN}, max ${RADIUS_MAX})`}>
              <StepperNumber value={12} min={RADIUS_MIN} max={RADIUS_MAX} step={1} onChange={(v) => updateSelectedSeatsBulk({ radius: v })} />
            </Field>
          </div>

          <Field label="Color">
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  style={{ backgroundColor: c }}
                  className="w-7 h-7 rounded-lg shadow-sm hover:scale-105 transition"
                  onClick={() => updateSelectedSeatsBulk({ fill: c })}
                  title={c}
                />
              ))}
            </div>
          </Field>
        </Panel>
      )}

      {selectedSeats.map((seat) => {
        const row = seat.rowId ? rows.find((r) => r.id === seat.rowId) : undefined;
        return (
          <Panel key={seat.id}>
            <h3 className="text-base font-semibold text-purple-700 mb-3">Seat: {seat.label}</h3>

            <Field label="Seat Label">
              <TextInput type="text" value={seat.label} onChange={(e) => updateSeat(seat.id, { label: e.target.value })} />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="X">
                <StepperNumber value={Math.round(seat.x)} step={1} onChange={(v) => updateSeat(seat.id, { x: v })} />
              </Field>
              <Field label="Y">
                <StepperNumber
                  value={Math.round(seat.y)}
                  step={1}
                  onChange={(v) => {
                    const ny = v;
                    if (row) {
                      const dy = Math.abs(ny - row.y);
                      if (dy <= SNAP_Y_THRESHOLD) updateSeat(seat.id, { y: row.y });
                      else updateSeat(seat.id, { y: ny, rowId: null });
                    } else {
                      updateSeat(seat.id, { y: ny });
                    }
                  }}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Status">
                <Select value={seat.status} onChange={(e) => updateSeat(seat.id, { status: e.target.value as Seat["status"] })}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Category">
                <Select value={(seat.category as string) || "standard"} onChange={(e) => updateSeat(seat.id, { category: e.target.value })}>
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label={`Radius (min ${RADIUS_MIN}, max ${RADIUS_MAX})`}>
                <StepperNumber
                  value={Math.round(seat.radius)}
                  min={RADIUS_MIN}
                  max={RADIUS_MAX}
                  step={1}
                  onChange={(v) => updateSeat(seat.id, { radius: clamp(v, RADIUS_MIN, RADIUS_MAX) })}
                />
              </Field>
              <Field label="Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={seat.fill}
                    onChange={(e) => updateSeat(seat.id, { fill: e.target.value })}
                    className="w-10 h-10 rounded-lg border"
                  />
                  <div className="flex gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full shadow-inner transition-transform hover:scale-110 ${
                          seat.fill === c ? "ring-2 ring-offset-1 ring-blue-500" : ""
                        }`}
                        onClick={() => updateSeat(seat.id, { fill: c })}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </Field>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
