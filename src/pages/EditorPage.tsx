import { useState } from "react";

// Компоненты UI
import PropertiesPanel from "../components/editor/PropertiesPanel";
import SeatmapCanvas from "../components/editor/SeatMapCanvas";
import Toolbar from "../components/editor/ToolBar";
import TopBar from "../components/editor/TopBar";

// Хук для Undo/Redo и типы данных
import { useHistory } from "../hooks/useHistory";

import { Row, Seat, Zone } from "../types/types";
import { alignRows, alignSeats, distributeRows } from '../utils/seatmapCommands';

const LS_KEY = "seatmap_schema";

// ------------------ Тип для всего состояния схемы ------------------
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

// ------------------ Начальное (пустое) состояние ------------------
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

// ======================= ОСНОВНОЙ КОМПОНЕНТ СТРАНИЦЫ =======================
function EditorPage() {
  // ------------------ УПРАВЛЕНИЕ ОСНОВНЫМ СОСТОЯНИЕМ (ДАННЫМИ) ------------------
  // Используем наш кастомный хук для управления состоянием схемы и историей изменений.
  // Все, что связано с местами, рядами и зонами, теперь живет здесь.
  const {
    state, // Текущее состояние (state.seats, state.rows, state.zones)
    setState, // Функция для обновления состояния (создает запись в истории)
    undo, // Функция отмены
    redo, // Функция возврата
    clear, // Функция полной очистки с сбросом истории
    canUndo, // Флаг, можно ли отменить действие
    canRedo, // Флаг, можно ли вернуть действие
  } = useHistory<SeatmapState>(INITIAL_STATE);

  // ------------------ УПРАВЛЕНИЕ UI-СОСТОЯНИЕМ ------------------
  // Эти состояния не требуют истории (undo/redo) и не сохраняются в JSON.
  // Они отвечают только за интерфейс в текущий момент времени.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [currentTool, setCurrentTool] = useState<
  "select" | "add-seat" | "add-row" | "add-zone" | "rotate"
>("select");



  // ======================= ФУНКЦИИ-ОБРАБОТЧИКИ ДЛЯ TOPBAR =======================

  // 💾 Сохранение текущего состояния в localStorage браузера
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

  // 📥 Загрузка состояния из localStorage
  const handleLoad = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return alert("Сохраненная схема не найдена.");
      const data = JSON.parse(raw);
      const prevStage = state.stage; // сохраняем текущие pan/zoom UI
      const imported = importFromV2(data);
      setState(() => ({ ...imported, stage: prevStage }));
      alert("Схема (v2) загружена!");
    } catch (error) {
      console.error("Ошибка при загрузке:", error);
      alert("Не удалось загрузить схему. Данные могут быть повреждены.");
    }
  };

  // 🗑️ Полная очистка холста и истории
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
      // stage — это UI, в JSON его не храним
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
                fill: seat.fill, // ✅ сохраняем цвет
                radius: seat.radius, // (опционально) сохраняем радиус
                status: seat.status ?? "available",
                category: seat.category ?? "standard",
              })),
          })),
      })),
    };
  }

  // ექსპორტი Экспорт схемы в JSON-файл
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


type AlignDirection = 'left' | 'center' | 'right';

// внутри EditorPage
const handleAlign = (dir: AlignDirection) => {
  if (selectedIds.length === 0) return;

  const hasZones = state.zones.some(z => selectedIds.includes(z.id));
  const hasRows  = state.rows.some(r => selectedIds.includes(r.id));
  const hasSeats = state.seats.some(s => selectedIds.includes(s.id));

  if (hasSeats) {
    setState(prev => alignSeats(prev, selectedIds, dir));
    return;
  }
  if (hasRows || hasZones) {
    setState(prev => alignRows(prev, selectedIds, dir));
  }
};



  // ======================= РЕНДЕР КОМПОНЕНТА =======================
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
  currentTool={currentTool}
  setCurrentTool={setCurrentTool}
  onDelete={handleDelete}
  onAlign={handleAlign}
/>




        <main className="flex-1 bg-gray-50 p-4">
          <SeatmapCanvas
            // Передаем все данные из нашего единого `state`
            seats={state.seats}
            rows={state.rows}
            zones={state.zones}
            // ❗ Самое важное: передаем единую функцию для обновления ВСЕГО состояния
            setState={setState}
            // UI-состояние передаем как и раньше
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            currentTool={currentTool}
          />
        </main>

        <PropertiesPanel
          selectedIds={selectedIds}
          state={state} // весь state сразу
          setState={setState} // метод обновления всего state
        />
      </div>
    </div>
  );
}

export default EditorPage;
