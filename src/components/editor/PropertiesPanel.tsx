// src/components/editor/PropertiesPanel.tsx
import {
  BadgeInfo,
  Box as BoxIcon,
  FlipHorizontal,
  FlipVertical,
  PaintBucket,
  Rows3,
  Ruler,
  Shapes as ShapesIcon,
  Shuffle as ShuffleIcon,
  Type as TypeIcon,
} from "lucide-react";
import React from "react";
import type { SeatmapState } from "../../pages/EditorPage";
import type { Row, Seat, ShapeObject, TextObject, Zone } from "../../types/types";

/* --------------------------- constants & helpers -------------------------- */
type ShapePreset = {
  key: string;
  label: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
};

const SHAPE_PRESETS: ShapePreset[] = [
  { key: "light", label: "Светлый", fill: "#ffffff", stroke: "#1f2937", strokeWidth: 1, opacity: 1 },
  { key: "dark", label: "Тёмный", fill: "#111827", stroke: "#ffffff", strokeWidth: 1, opacity: 1 },
  {
    key: "accent",
    label: "Акцент",
    fill: "#eab308",
    stroke: "#1f2937",
    strokeWidth: 1,
    opacity: 1,
  },
  { key: "muted", label: "Приглушённый", fill: "#e5e7eb", stroke: "#6b7280", strokeWidth: 1, opacity: 1 },
  {
    key: "outline",
    label: "Контур",
    fill: undefined,
    stroke: "#1f2937",
    strokeWidth: 2,
    opacity: 1,
  },
  {
    key: "transparent",
    label: "Прозрачный",
    fill: undefined,
    stroke: undefined,
    strokeWidth: 0,
    opacity: 0.25,
  },
];

const CATEGORY_OPTIONS = [
  { value: "standard", label: "Стандарт" },
  { value: "vip", label: "VIP" },
  { value: "discount", label: "Льготный" },
] as const;

const STATUS_OPTIONS = [
  { value: "available", label: "Доступно" },
  { value: "occupied", label: "Занято" },
  { value: "disabled", label: "Недоступно" },
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
const toNum = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* --------------------------------- UI bits -------------------------------- */

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">{children}</div>
);

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint?: string;
  className?: string;
}> = ({ icon, title, hint, className, children }) => (
  <div className={className ?? ""}>
    <div className="flex items-center gap-2 mb-2">
      <span className="text-gray-600">{icon}</span>
      <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      {hint ? (
        <span className="ml-1 text-gray-400" title={hint}>
          <BadgeInfo size={14} />
        </span>
      ) : null}
    </div>
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({
  label,
  children,
  hint,
}) => (
  <div className="mb-2">
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {label}
      {hint ? (
        <span className="inline-block align-middle ml-1 text-gray-400" title={hint}>
          <BadgeInfo size={12} />
        </span>
      ) : null}
    </label>
    {children}
  </div>
);

const stopHotkeys: React.KeyboardEventHandler<HTMLElement> = (e) => {
  const k = e.key;
  if (
    k === "Delete" ||
    k === "Backspace" ||
    (k.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) ||
    (k.toLowerCase() === "y" && (e.ctrlKey || e.metaKey))
  ) {
    e.stopPropagation();
  }
};

// TextInput
const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  onKeyDown,
  ...props
}) => (
  <input
    {...props}
    onKeyDown={(e) => {
      stopHotkeys(e);
      onKeyDown?.(e);
    }}
    className={`w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition ${props.className ?? ""}`}
  />
);

// Select
const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  children,
  onKeyDown,
  ...props
}) => (
  <select
    {...props}
    onKeyDown={(e) => {
      stopHotkeys(e);
      onKeyDown?.(e);
    }}
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
      <button
        type="button"
        onClick={dec}
        className="px-2 border border-gray-300 rounded-l-lg text-gray-600 hover:bg-gray-50"
      >
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
        className="w-full border-t border-b border-gray-300 px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-center text-black"
        onKeyDown={(e) => {
          stopHotkeys(e);
        }}
      />
      <button
        type="button"
        onClick={inc}
        className="px-2 border border-gray-300 rounded-r-lg text-gray-600 hover:bg-gray-50"
      >
        +
      </button>
    </div>
  );
};

function sanitizeRotation<T extends { rotation?: number }>(patch: T): T {
  if ("rotation" in patch) return { ...patch, rotation: toNum(patch.rotation, 0) };
  return patch;
}

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
        title={preset.label}
      />
      <span className="text-[11px] text-gray-700">{preset.label}</span>
    </span>
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

  const selectedZones = React.useMemo(
    () => zones.filter((z) => selectedIds.includes(z.id)),
    [zones, selectedIds]
  );
  const selectedRows = React.useMemo(
    () => rows.filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds]
  );
  const selectedSeats = React.useMemo(
    () => seats.filter((s) => selectedIds.includes(s.id)),
    [seats, selectedIds]
  );
  const selectedTexts = React.useMemo(
    () => state.texts.filter((t) => selectedIds.includes(t.id)),
    [state.texts, selectedIds]
  );
  const selectedShapes = React.useMemo(
    () => (state.shapes || []).filter((sh) => selectedIds.includes(sh.id)),
    [state.shapes, selectedIds]
  );
  const selectedSeatIdSet = React.useMemo(
    () => new Set(selectedSeats.map((s) => s.id)),
    [selectedSeats]
  );

  /* ---------------------------- state update helpers ---------------------------- */

  const selectedZoneIds = React.useMemo(() => selectedZones.map((z) => z.id), [selectedZones]);

  const rowLabelSideAgg: "left" | "right" | "mixed" = React.useMemo(() => {
    if (!selectedZones.length) return "left";
    const left = selectedZones.some((z) => (z.rowLabelSide ?? "left") === "left");
    const right = selectedZones.some((z) => (z.rowLabelSide ?? "left") === "right");
    return left && right ? "mixed" : left ? "left" : "right";
  }, [selectedZones]);

  const setZonesRowLabelSide = (side: "left" | "right") => {
    setState((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        selectedZoneIds.includes(z.id) ? { ...z, rowLabelSide: side } : z
      ),
    }));
  };
  const flipZonesRowLabelSide = () => {
    setState((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        selectedZoneIds.includes(z.id)
          ? { ...z, rowLabelSide: z.rowLabelSide === "right" ? "left" : "right" }
          : z
      ),
    }));
  };

  const updateZone = (
    zoneId: string,
    rawPatch: Partial<Zone>,
    opts?: { maybeReflowBySpacing?: boolean }
  ) => {
    const patch = sanitizeRotation(rawPatch);
    setState((prev) => {
      const nextZones = prev.zones.map((z) => (z.id === zoneId ? { ...z, ...patch } : z));
      let next: SeatmapState = { ...prev, zones: nextZones };
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
          next.fill = colorFor(
            (next.status ?? s.status) as Seat["status"],
            (next.category ?? s.category) as string
          );
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
          next.fill = colorFor(
            (next.status ?? s.status) as Seat["status"],
            (next.category ?? s.category) as string
          );
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
          next.fill = colorFor(
            (next.status ?? s.status) as Seat["status"],
            (next.category ?? s.category) as string
          );
        }
        return next;
      }),
    }));
  };

  const updateText = (textId: string, rawPatch: Partial<TextObject>) => {
    const patch = sanitizeRotation(rawPatch);
    setState((prev) => ({
      ...prev,
      texts: prev.texts.map((t) => (t.id === textId ? { ...t, ...patch } : t)),
    }));
  };

  const updateShape = (shapeId: string, rawPatch: Partial<ShapeObject>) => {
    const patch = sanitizeRotation(rawPatch);
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

  const resizePolygon = (sh: ShapeObject, nextW: number, nextH: number) => {
    if (sh.kind !== "polygon" || !sh.points || sh.width === 0 || sh.height === 0) return sh;
    const sx = nextW / sh.width;
    const sy = nextH / sh.height;
    return {
      ...sh,
      width: nextW,
      height: nextH,
      points: sh.points.map((p) => ({ x: p.x * sx, y: p.y * sy })),
    };
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

      const rowsInZone = [...prev.rows]
        .filter((r) => r.zoneId === zoneId)
        .sort((a, b) => a.y - b.y);
      if (rowsInZone.length === 0) return prev;

      const rowsNext = prev.rows.map((r) => ({ ...r }));
      const seatsNext = prev.seats.map((s) => ({ ...s }));

      const rowMaxR: Record<string, number> = {};
      for (const r of rowsInZone) {
        const rs = seatsNext.filter((s) => s.rowId === r.id);
        rowMaxR[r.id] = rs.length
          ? Math.max(...rs.map((s) => s.radius ?? DEFAULT_RADIUS))
          : DEFAULT_RADIUS;
      }

      const rowsCount = rowsInZone.length;
      const padY = Math.min(Math.max(...rowsInZone.map((r) => rowMaxR[r.id])), z.height / 2);
      const usableH = Math.max(0, z.height - 2 * padY);
      const stepY = rowsCount > 1 ? usableH / (rowsCount - 1) : 0;

      rowsInZone.forEach((r, i) => {
        const newY = rowsCount > 1 ? padY + stepY * i : z.height / 2;
        const idx = rowsNext.findIndex((rr) => rr.id === r.id);
        if (idx >= 0) rowsNext[idx].y = Math.round(newY);
      });

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

  const reflowZoneBySpacing = (zoneId: string) =>
    setState((prev) => reflowZoneBySpacingState(prev, zoneId));

  const addColumnToZone = (zoneId: string, side: "left" | "right") => {
    setState((prev) => {
      const zone = prev.zones.find((z) => z.id === zoneId);
      if (!zone) return prev;
      const STEP_X = Math.max(4, Math.round(zone.seatSpacingX ?? DEFAULT_SPACING_X));

      let rowsNext = [...prev.rows];
      let seatsNext = [...prev.seats];
      const zoneRows = rowsNext.filter((r) => r.zoneId === zoneId);

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
          rowsNext = rowsNext.map((rr) =>
            rr.zoneId === zoneId ? { ...rr, x: rr.x + requiredShift } : rr
          );
          seatsNext = seatsNext.map((s) =>
            s.zoneId === zoneId ? { ...s, x: s.x + requiredShift } : s
          );
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

      const seatsInZone = seatsNext.filter((s) => s.zoneId === zoneId);
      const needWidth = seatsInZone.length
        ? Math.max(...seatsInZone.map((s) => s.x + (s.radius ?? DEFAULT_RADIUS)))
        : zone.width;
      const zonesNext = prev.zones.map((z) =>
        z.id === zoneId ? { ...z, width: Math.max(z.width, needWidth) } : z
      );

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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Свойства</h2>
        <p className="text-sm text-gray-500">
          Выберите зону, ряд, место, текст или шейп для редактирования.
        </p>
      </div>
    );
  }

  const CountChip = ({ label }: { label: string }) => (
    <span className="px-2 py-1 text-[11px] rounded-md bg-white border border-gray-200 text-gray-600">
      {label}
    </span>
  );

  return (
    <div className="w-[320px] bg-gray-50 border-l border-gray-200 p-6 shadow-lg h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-gray-900">Свойства</h2>
        <div className="flex gap-1 flex-wrap">
          {selectedZones.length > 0 && <CountChip label={`Зоны: ${selectedZones.length}`} />}
          {selectedRows.length > 0 && <CountChip label={`Ряды: ${selectedRows.length}`} />}
          {selectedSeats.length > 0 && <CountChip label={`Места: ${selectedSeats.length}`} />}
          {selectedTexts.length > 0 && <CountChip label={`Текст: ${selectedTexts.length}`} />}
          {selectedShapes.length > 0 && <CountChip label={`Фигуры: ${selectedShapes.length}`} />}
        </div>
      </div>

      {/* ------------------------------- SHAPES -------------------------------- */}
      {selectedShapes.length > 1 && (
        <Panel>
          <Section icon={<ShapesIcon size={16} />} title="Массовое редактирование — Фигуры" />
          <Field label="Пресеты" hint="Быстро применяет набор заливки / обводки / прозрачности">
            <div className="grid grid-cols-2 gap-2">
              {SHAPE_PRESETS.map((p) => (
                <button key={p.key} type="button" onClick={() => applyShapePresetBulk(p)}>
                  <PresetSwatch preset={p} />
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Заливка">
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
            <Field label="Обводка">
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
            <Field label="Толщина обводки">
              <StepperNumber
                value={1}
                min={0}
                step={1}
                onChange={(v) => updateSelectedShapesBulk({ strokeWidth: v })}
              />
            </Field>
            <Field label="Прозрачность">
              <input
                type="range"
                min={0}
                max={100}
                defaultValue={100}
                onChange={(e) =>
                  updateSelectedShapesBulk({ opacity: toInt(e.target.value, 100) / 100 })
                }
                className="w-full accent-blue-600"
              />
            </Field>
          </div>
        </Panel>
      )}

      {selectedShapes.map((sh) => (
        <Panel key={sh.id}>
          <Section icon={<BoxIcon size={16} />} title={`Фигура: ${sh.kind}`} />
          <Field label="Пресет">
            <div className="flex flex-wrap gap-2">
              {SHAPE_PRESETS.map((p) => (
                <button key={p.key} type="button" onClick={() => applyShapePresetOne(sh.id, p)}>
                  <PresetSwatch preset={p} />
                </button>
              ))}
            </div>
          </Field>

          <Section
            icon={<Ruler size={14} />}
            title="Геометрия"
            className="mt-3"
            hint="Позиция и размер шейпа"
          >
            <div className="grid grid-cols-2 gap-2">
              <Field label="X">
                <StepperNumber
                  value={Math.round(sh.x)}
                  step={1}
                  onChange={(v) => updateShape(sh.id, { x: v })}
                />
              </Field>
              <Field label="Y">
                <StepperNumber
                  value={Math.round(sh.y)}
                  step={1}
                  onChange={(v) => updateShape(sh.id, { y: v })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ширина">
                <StepperNumber
                  value={Math.round(sh.width)}
                  min={2}
                  step={1}
                  onChange={(v) =>
                    sh.kind === "polygon"
                      ? updateShape(sh.id, resizePolygon(sh, v, sh.height))
                      : updateShape(sh.id, { width: v })
                  }
                />
              </Field>
              <Field label="Высота">
                <StepperNumber
                  value={Math.round(sh.height)}
                  min={2}
                  step={1}
                  onChange={(v) =>
                    sh.kind === "polygon"
                      ? updateShape(sh.id, resizePolygon(sh, sh.width, v))
                      : updateShape(sh.id, { height: v })
                  }
                />
              </Field>
            </div>
          </Section>

          <Section icon={<PaintBucket size={14} />} title="Внешний вид" className="mt-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Заливка">
                <input
                  type="color"
                  value={sh.fill ?? "#ffffff"}
                  onChange={(e) => updateShape(sh.id, { fill: e.target.value })}
                  className="w-10 h-10 rounded-lg border"
                />
              </Field>
              <Field label="Обводка">
                <input
                  type="color"
                  value={sh.stroke ?? "#111827"}
                  onChange={(e) => updateShape(sh.id, { stroke: e.target.value })}
                  className="w-10 h-10 rounded-lg border"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Толщина обводки">
                <StepperNumber
                  value={Math.round(sh.strokeWidth ?? 1)}
                  min={0}
                  step={1}
                  onChange={(v) => updateShape(sh.id, { strokeWidth: v })}
                />
              </Field>
              <Field label={`Прозрачность: ${Math.round((sh.opacity ?? 1) * 100)}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((sh.opacity ?? 1) * 100)}
                  onChange={(e) =>
                    updateShape(sh.id, { opacity: toInt(e.target.value, 100) / 100 })
                  }
                  className="w-full accent-blue-600"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Поворот (°)">
                <StepperNumber
                  value={Math.round(sh.rotation ?? 0)}
                  step={1}
                  onChange={(v) => updateShape(sh.id, { rotation: v })}
                />
              </Field>
            </div>
            <Field label="Отразить">
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 text-xs bg-gray-100 rounded border inline-flex items-center gap-1 text-blue-600 border-gray-200"
                  onClick={() => updateShape(sh.id, { flipX: !sh.flipX })}
                  title="Зеркально по X"
                >
                  <FlipHorizontal size={14} /> По X
                </button>
                <button
                  className="px-2 py-1 text-xs bg-gray-100 rounded border inline-flex items-center gap-1 text-blue-600 border-gray-200"
                  onClick={() => updateShape(sh.id, { flipY: !sh.flipY })}
                  title="Зеркально по Y"
                >
                  <FlipVertical size={14} /> По Y
                </button>
              </div>
            </Field>
          </Section>
        </Panel>
      ))}

      {/* -------------------------------- TEXTS -------------------------------- */}
      {selectedTexts.map((t) => (
        <Panel key={t.id}>
          <Section icon={<TypeIcon size={16} />} title="Текст" />
          <Field label="Текст">
            <TextInput
              type="text"
              value={t.text}
              placeholder="Введите текст"
              onChange={(e) => updateText(t.id, { text: e.target.value })}
            />
          </Field>
          <Section icon={<Ruler size={14} />} title="Геометрия" className="mt-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Размер шрифта">
                <StepperNumber
                  value={Math.round(t.fontSize)}
                  min={8}
                  max={256}
                  step={1}
                  onChange={(v) => updateText(t.id, { fontSize: clamp(v, 8, 256) })}
                />
              </Field>
              <Field label="Поворот (°)">
                <StepperNumber
                  value={Math.round(t.rotation ?? 0)}
                  step={1}
                  onChange={(v) => updateText(t.id, { rotation: v })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Цвет">
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
                        className={`w-6 h-6 rounded-full border ${
                          t.fill === c ? "ring-2 ring-blue-500" : ""
                        }`}
                        onClick={() => updateText(t.id, { fill: c })}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </Field>
            </div>
          </Section>
        </Panel>
      ))}

      {/* -------------------------------- ZONES -------------------------------- */}
      {selectedZones.map((zone) => (
        <Panel key={zone.id}>
          <Section icon={<Rows3 size={16} />} title={`Зона: ${zone.label}`} />
          <Section title="Сторона меток рядов" hint="С какой стороны показывать метки рядов">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                aria-pressed={(zone.rowLabelSide ?? "left") === "left"}
                disabled={(zone.rowLabelSide ?? "left") === "left"}
                className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                  (zone.rowLabelSide ?? "left") === "left"
                    ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm cursor-default"
                    : "bg-white border-gray-300 text-gray-800 hover:bg-gray-50"
                }`}
                onClick={() => updateZone(zone.id, { rowLabelSide: "left" })}
                title="Подписи рядов слева"
              >
                Слева
              </button>
              <button
                type="button"
                aria-pressed={(zone.rowLabelSide ?? "left") === "right"}
                disabled={(zone.rowLabelSide ?? "left") === "right"}
                className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                  (zone.rowLabelSide ?? "left") === "right"
                    ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm cursor-default"
                    : "bg-white border-gray-300 text-gray-800 hover:bg-gray-50"
                }`}
                onClick={() => updateZone(zone.id, { rowLabelSide: "right" })}
                title="Подписи рядов справа"
              >
                Справа
              </button>
            </div>
          </Section>

          <Section icon={<TypeIcon size={14} />} title="Подпись">
            <Field label="Название зоны">
              <TextInput
                type="text"
                value={zone.label}
                onChange={(e) => updateZone(zone.id, { label: e.target.value })}
              />
            </Field>
          </Section>

          <Section
            icon={<Ruler size={14} />}
            title="Геометрия"
            hint="Позиция и размер зоны"
            className="mt-2"
          >
            <div className="grid grid-cols-2 gap-2">
              <Field label="X">
                <StepperNumber
                  value={Math.round(zone.x)}
                  step={1}
                  onChange={(v) => updateZone(zone.id, { x: v })}
                />
              </Field>
              <Field label="Y">
                <StepperNumber
                  value={Math.round(zone.y)}
                  step={1}
                  onChange={(v) => updateZone(zone.id, { y: v })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ширина">
                <StepperNumber
                  value={Math.round(zone.width)}
                  min={10}
                  step={1}
                  onChange={(v) => updateZone(zone.id, { width: Math.max(10, v) })}
                  onBlur={() => reflowZoneBySpacing(zone.id)}
                />
              </Field>
              <Field label="Высота">
                <StepperNumber
                  value={Math.round(zone.height)}
                  min={10}
                  step={1}
                  onChange={(v) => updateZone(zone.id, { height: Math.max(10, v) })}
                  onBlur={() => reflowZoneBySpacing(zone.id)}
                />
              </Field>
            </div>
            <Field label="Поворот (°)">
              <TextInput
                type="text"
                inputMode="numeric"
                value={rotDraft[zone.id] ?? String(zone.rotation ?? 0)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^-?\d{0,4}$/.test(v)) {
                    setRotDraft((prev) => ({ ...prev, [zone.id]: v }));
                  }
                }}
                onBlur={() => {
                  const raw = rotDraft[zone.id];
                  const n = toNum(raw === "" ? 0 : raw);
                  updateZone(zone.id, { rotation: n });
                  setRotDraft((prev) => {
                    const copy = { ...prev };
                    delete copy[zone.id];
                    return copy;
                  });
                }}
                onKeyDown={(e) => {
                  stopHotkeys(e);
                  if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setRotDraft((prev) => {
                      const copy = { ...prev };
                      delete copy[zone.id];
                      return copy;
                    });
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                }}
                placeholder="например, -45"
              />
            </Field>
          </Section>

          <Section
            icon={<Rows3 size={14} />}
            title="Раскладка мест"
            hint="Шаг сетки и нумерация"
            className="mt-3"
          >
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => addColumnToZone(zone.id, "left")}
                className="text-blue-700 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-100 inline-flex items-center gap-2"
                title="Добавить колонку слева"
              >
                <ShuffleIcon size={14} /> + Колонка слева
              </button>
              <button
                onClick={() => addColumnToZone(zone.id, "right")}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border text-blue-700 border-gray-100 inline-flex items-center gap-2"
                title="Добавить колонку справа"
              >
                <ShuffleIcon size={14} /> + Колонка справа
              </button>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-600">Нумерация мест:</span>
              <button
                onClick={() => renumberZoneSeats(zone.id, "ltr")}
                className="text-black px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg border"
              >
                L→R
              </button>
              <button
                onClick={() => renumberZoneSeats(zone.id, "rtl")}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg border text-black"
              >
                R→L
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <Field label="Шаг по X (px)" hint="Горизонтальный шаг между местами">
                <StepperNumber
                  value={Math.round(zone.seatSpacingX ?? DEFAULT_SPACING_X)}
                  min={4}
                  step={1}
                  onChange={(v) =>
                    updateZone(
                      zone.id,
                      { seatSpacingX: Math.max(4, v) },
                      { maybeReflowBySpacing: true }
                    )
                  }
                />
              </Field>
              <Field label="Шаг по Y (px)" hint="Вертикальный шаг между рядами">
                <StepperNumber
                  value={Math.round(zone.seatSpacingY ?? DEFAULT_SPACING_Y)}
                  min={4}
                  step={1}
                  onChange={(v) =>
                    updateZone(
                      zone.id,
                      { seatSpacingY: Math.max(4, v) },
                      { maybeReflowBySpacing: true }
                    )
                  }
                />
              </Field>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => reflowZoneBySpacing(zone.id)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border text-blue-600 border-gray-200"
              >
                Применить по шагам
              </button>
              <button
                onClick={() => reflowZone(zone.id)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border text-blue-600 border-gray-200"
              >
                Растянуть места по зоне
              </button>
            </div>
          </Section>

          <Section
            icon={<PaintBucket size={14} />}
            title="Внешний вид"
            className="mt-3"
            hint="Фон зоны и прозрачность"
          >
            <Field label="Фон зоны">
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <div className="relative h-4 w-4 rounded border overflow-hidden">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
                        backgroundSize: "8px 8px",
                        backgroundPosition: "0 0,0 4px,4px -4px,-4px 0px",
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
                  <span className="text-xs text-gray-700">
                    {zone.transparent ? "Прозрачный" : "Заливка"}
                  </span>
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
              <Field label={`Прозрачность: ${Math.round((zone.fillOpacity ?? 1) * 100)}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((zone.fillOpacity ?? 1) * 100)}
                  onChange={(e) =>
                    updateZone(zone.id, { fillOpacity: toInt(e.target.value, 100) / 100 })
                  }
                  className="w-full accent-blue-600"
                />
              </Field>
            )}
          </Section>
        </Panel>
      ))}

      {/* -------------------------------- ROWS --------------------------------- */}
      {selectedRows.map((row) => {
        const rowSeats = seats.filter((s) => s.rowId === row.id);
        return (
          <Panel key={row.id}>
            <Section icon={<Rows3 size={16} />} title={`Ряд: ${row.label}`} />
            <Section icon={<TypeIcon size={14} />} title="Подпись">
              <Field label="Название ряда">
                <TextInput
                  type="text"
                  value={row.label}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      rows: prev.rows.map((r) =>
                        r.id === row.id ? { ...r, label: e.target.value } : r
                      ),
                    }))
                  }
                />
              </Field>
            </Section>

            <Section icon={<Ruler size={14} />} title="Геометрия" className="mt-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="X">
                  <StepperNumber
                    value={Math.round(row.x)}
                    step={1}
                    onChange={(v) => updateRowAndSeats(row.id, { x: v })}
                  />
                </Field>
                <Field label="Y">
                  <StepperNumber
                    value={Math.round(row.y)}
                    step={1}
                    onChange={(v) => updateRowAndSeats(row.id, { y: v })}
                  />
                </Field>
              </div>
            </Section>

            {rowSeats.length > 0 && (
              <Section
                icon={<Rows3 size={14} />}
                title="Места в ряду"
                className="mt-3"
                hint="Распределение и нумерация"
              >
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => distributeRowSeats(row.id)}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border text-blue-600 border-gray-200"
                  >
                    Равномерно по ширине
                  </button>
                  <button
                    onClick={() => renumberRowSeatsDir(row.id, "ltr")}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border text-blue-600 border-gray-200"
                  >
                    Нумерация L→R
                  </button>
                </div>
                <div className="mt-2">
                  <button
                    onClick={() => renumberRowSeatsDir(row.id, "rtl")}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border text-blue-600 border-gray-200"
                  >
                    Нумерация R→L
                  </button>
                </div>

                <h4 className="text-sm font-semibold text-gray-800 mb-3 mt-4">
                  Применить ко всем местам в ряду
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Статус">
                    <Select
                      defaultValue=""
                      onChange={(e) =>
                        e.currentTarget.value &&
                        updateAllSeatsOfSelectedRows({
                          status: e.currentTarget.value as Seat["status"],
                        })
                      }
                    >
                      <option value="">— оставить —</option>
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Категория">
                    <Select
                      defaultValue=""
                      onChange={(e) =>
                        e.currentTarget.value &&
                        updateAllSeatsOfSelectedRows({ category: e.currentTarget.value })
                      }
                    >
                      <option value="">— оставить —</option>
                      {CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label={`Радиус (мин. ${RADIUS_MIN}, макс. ${RADIUS_MAX})`}>
                    <StepperNumber
                      value={12}
                      min={RADIUS_MIN}
                      max={RADIUS_MAX}
                      step={1}
                      onChange={(v) => updateAllSeatsOfSelectedRows({ radius: v })}
                    />
                  </Field>
                </div>

                <Field label="Цвет">
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
              </Section>
            )}
          </Panel>
        );
      })}

      {/* -------------------------------- SEATS -------------------------------- */}
      {selectedSeats.length > 1 && (
        <Panel>
          <Section icon={<Rows3 size={16} />} title="Массовое редактирование — Места" />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Статус">
              <Select
                defaultValue=""
                onChange={(e) =>
                  e.currentTarget.value &&
                  updateSelectedSeatsBulk({ status: e.currentTarget.value as Seat["status"] })
                }
              >
                <option value="">— оставить —</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Категория">
              <Select
                defaultValue=""
                onChange={(e) =>
                  e.currentTarget.value &&
                  updateSelectedSeatsBulk({ category: e.currentTarget.value })
                }
              >
                <option value="">— оставить —</option>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label={`Радиус (мин. ${RADIUS_MIN}, макс. ${RADIUS_MAX})`}>
              <StepperNumber
                value={12}
                min={RADIUS_MIN}
                max={RADIUS_MAX}
                step={1}
                onChange={(v) => updateSelectedSeatsBulk({ radius: v })}
              />
            </Field>
          </div>

          <Field label="Цвет">
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
            <Section icon={<Rows3 size={16} />} title={`Место: ${seat.label}`} />
            <Field label="Подпись места">
              <TextInput
                type="text"
                value={seat.label}
                onChange={(e) => updateSeat(seat.id, { label: e.target.value })}
              />
            </Field>

            <Section icon={<Ruler size={14} />} title="Геометрия" className="mt-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="X">
                  <StepperNumber
                    value={Math.round(seat.x)}
                    step={1}
                    onChange={(v) => updateSeat(seat.id, { x: v })}
                  />
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
            </Section>

            <Section icon={<PaintBucket size={14} />} title="Внешний вид" className="mt-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Статус">
                  <Select
                    value={seat.status}
                    onChange={(e) =>
                      updateSeat(seat.id, { status: e.target.value as Seat["status"] })
                    }
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Категория">
                  <Select
                    value={(seat.category as string) || "standard"}
                    onChange={(e) => updateSeat(seat.id, { category: e.target.value })}
                  >
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label={`Радиус (мин. ${RADIUS_MIN}, макс. ${RADIUS_MAX})`}>
                  <StepperNumber
                    value={Math.round(seat.radius)}
                    min={RADIUS_MIN}
                    max={RADIUS_MAX}
                    step={1}
                    onChange={(v) =>
                      updateSeat(seat.id, { radius: clamp(v, RADIUS_MIN, RADIUS_MAX) })
                    }
                  />
                </Field>
                <Field label="Цвет">
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
            </Section>
          </Panel>
        );
      })}
    </div>
  );
}
