import { useEffect, useState } from "react";

import PropertiesPanel from "../components/editor/PropertiesPanel";
import SeatmapCanvas from "../components/editor/SeatMapCanvas";
import Toolbar from "../components/editor/ToolBar";
import TopBar from "../components/editor/TopBar";

import { useHistory } from "../hooks/useHistory";

import { Row, Seat, Zone } from "../types/types";
import { duplicateSelected } from "../utils/duplicate";
import { alignRows, alignSeats } from "../utils/seatmapCommands";

const LS_KEY = "seatmap_schema";

export interface SeatmapState {
  hallName: string;
  backgroundImage?: string | null;
  zones: Zone[];
  rows: Row[];
  seats: Seat[];
  stage: {
    scale: number;
    x: number;
    y: number;
  };
}

const INITIAL_STATE: SeatmapState = {
  hallName: "Зал 1",
  backgroundImage: null,
  zones: [],
  rows: [],
  seats: [],
  stage: {
    scale: 1,
    x: 0,
    y: 0,
  },
};

function EditorPage() {
  const { state, setState, undo, redo, clear, canUndo, canRedo } =
    useHistory<SeatmapState>(INITIAL_STATE);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentTool, setCurrentTool] = useState<
    "select" | "add-seat" | "add-row" | "add-zone" | "rotate"
  >("select");
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    try {
      const json = exportToV2(state);            // экспорт в формат v2
      localStorage.setItem(LS_KEY, JSON.stringify(json));
    } catch (e) {
      console.error("Автосейв не удался:", e);
    }
  }, [state]);

  const handleSave = () => {
    try {
      const json = exportToV2(state);
      localStorage.setItem(LS_KEY, JSON.stringify(json));
      alert("Схема (v2) сохранена в localStorage!");
    } catch (error) {
      console.error("Ошибка при сохранении:", error);
      alert("Не удалось сохранить схему.");
    }
  };

  const handleLoad = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return alert("Сохраненная схема не найдена.");
      const data = JSON.parse(raw);
      const prevStage = state.stage;
      const imported = importFromV2(data);
      setState(() => ({ ...imported, stage: prevStage }));
      alert("Схема (v2) загружена!");
    } catch (error) {
      console.error("Ошибка при загрузке:", error);
      alert("Не удалось загрузить схему. Данные могут быть повреждены.");
    }
  };

  const handleClear = () => {
    if (
      window.confirm(
        "Вы уверены, что хотите полностью очистить сцену? Это действие нельзя будет отменить."
      )
    ) {
      setState(() => ({
        hallName: "Зал 1",
        backgroundImage: null,
        zones: [],
        rows: [],
        seats: [],
        stage: { scale: 1, x: 0, y: 0 },
      }));
    }
  };
  function importFromV2(json: any): SeatmapState {
    const zones: Zone[] = (json.zones || []).map((z: any) => ({
      id: String(z.id),
      x: Number(z.x ?? 0),
      y: Number(z.y ?? 0),
      width: Number(z.width ?? 200),
      height: Number(z.height ?? 120),
      fill: String(z.color ?? z.fill ?? "#E5E7EB"),
      label: String(z.name ?? z.label ?? ""),
      color: z.color ?? undefined,
      rotation: Number(z.rotation ?? 0),
    }));

    const rows: Row[] = [];
    const seats: Seat[] = [];

    (json.zones || []).forEach((z: any) => {
      (z.rows || []).forEach((r: any, rIdx: number) => {
        const rowId = String(r.id);
        rows.push({
          id: rowId,
          zoneId: String(z.id),
          index: Number(rIdx),
          label: String(r.label ?? ""),
          x: Number(r.x ?? 0),
          y: Number(r.y ?? 0),
        });
        (r.seats || []).forEach((s: any, cIdx: number) => {
          seats.push({
            id: String(s.id),
            x: Number(s.x ?? 0),
            y: Number(s.y ?? 0),
            radius: Number(s.radius ?? 12),
            fill: String(s.fill ?? "#1f2937"),
            label: String(s.label ?? ""),
            zoneId: String(z.id),
            rowId: rowId,
            colIndex: Number(cIdx),
            status: (s.status as any) ?? "available",
            category: s.category ?? "standard",
          });
        });
      });
    });

    return {
      hallName: String(json.hallName ?? "Зал 1"),
      backgroundImage: json.backgroundImage ?? null,
      zones,
      rows,
      seats,
      stage: { scale: 1, x: 0, y: 0 },
    };
  }

  function exportToV2(s: SeatmapState) {
    return {
      version: 2,
      hallName: s.hallName,
      backgroundImage: s.backgroundImage ?? null,
      zones: s.zones.map((zone) => ({
        id: zone.id,
        name: zone.label,
        color: zone.color ?? zone.fill,
        rotation: zone.rotation ?? 0,
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        rows: s.rows
          .filter((row) => row.zoneId === zone.id)
          .map((row) => ({
            id: row.id,
            label: row.label,
            x: row.x,
            y: row.y,
            seats: s.seats
              .filter((seat) => seat.rowId === row.id)
              .sort((a, b) => (a.colIndex ?? 0) - (b.colIndex ?? 0))
              .map((seat) => ({
                id: seat.id,
                label: seat.label,
                x: seat.x,
                y: seat.y,
                fill: seat.fill,
                radius: seat.radius,
                status: seat.status ?? "available",
                category: seat.category ?? "standard",
              })),
          })),
      })),
    };
  }

  const handleExport = () => {
    const exportData = exportToV2(state);
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "seatmap_v2.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;

    setState((prev) => ({
      ...prev,

      seats: prev.seats.filter((s) => !selectedIds.includes(s.id)),

      rows: prev.rows.filter((r) => !selectedIds.includes(r.id)),

      zones: prev.zones.filter((z) => !selectedIds.includes(z.id)),
    }));

    setSelectedIds([]);
  };

  type AlignDirection = "left" | "center" | "right";

  const handleAlign = (dir: AlignDirection) => {
    if (selectedIds.length === 0) return;

    const hasZones = state.zones.some((z) => selectedIds.includes(z.id));
    const hasRows = state.rows.some((r) => selectedIds.includes(r.id));
    const hasSeats = state.seats.some((s) => selectedIds.includes(s.id));

    if (hasSeats) {
      setState((prev) => alignSeats(prev, selectedIds, dir));
      return;
    }
    if (hasRows || hasZones) {
      setState((prev) => alignRows(prev, selectedIds, dir));
    }
  };

  const handleUploadBackground = (dataUrl: string | null) => {
    setState((prev) => ({ ...prev, backgroundImage: dataUrl ?? null }));
  };

  const handleDuplicate = () => {
    const { next, newSelectedIds } = duplicateSelected(state, selectedIds, 24);
    setState(() => next);
    if (newSelectedIds.length) setSelectedIds(newSelectedIds);
  };

  return (
    <div className="flex flex-col w-full h-screen bg-gray-100">
      <TopBar
        onSave={handleSave}
        onLoad={handleLoad}
        onClear={handleClear}
        onExport={handleExport}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          onDuplicate={handleDuplicate}
          currentTool={currentTool}
          setCurrentTool={setCurrentTool}
          onDelete={handleDelete}
          onAlign={handleAlign}
          onUploadBackground={handleUploadBackground}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid((s) => !s)}
        />

        <main className="flex-1 bg-gray-50 p-4">
          <SeatmapCanvas
            seats={state.seats}
            rows={state.rows}
            zones={state.zones}
            setState={setState}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            currentTool={currentTool}
            backgroundImage={state.backgroundImage ?? null}
            showGrid={showGrid}
            setShowGrid={setShowGrid}
            onDuplicate={handleDuplicate}
          />
        </main>

        <PropertiesPanel selectedIds={selectedIds} state={state} setState={setState} />
      </div>
    </div>
  );
}

export default EditorPage;
