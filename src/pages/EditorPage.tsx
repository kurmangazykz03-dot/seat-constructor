import { useState } from "react";

// Компоненты UI
import PropertiesPanel from "../components/editor/PropertiesPanel";
import SeatmapCanvas from "../components/editor/SeatMapCanvas";
import Toolbar from "../components/editor/ToolBar";
import TopBar from "../components/editor/TopBar";

// Хук для Undo/Redo и типы данных
import { useHistory } from "../hooks/useHistory";

import { Row, Seat, Zone } from "../types/types";

// ------------------ Тип для всего состояния схемы ------------------
export interface SeatmapState {
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
  const [currentTool, setCurrentTool] = useState<"select" | "add-seat" | "add-row" | "add-zone">(
    "select"
  );

  // ======================= ФУНКЦИИ-ОБРАБОТЧИКИ ДЛЯ TOPBAR =======================

  // 💾 Сохранение текущего состояния в localStorage браузера
  const handleSave = () => {
    try {
      localStorage.setItem("seatmap_schema", JSON.stringify(state));
      alert("Схема успешно сохранена в локальное хранилище!");
    } catch (error) {
      console.error("Ошибка при сохранении:", error);
      alert("Не удалось сохранить схему.");
    }
  };

  // 📥 Загрузка состояния из localStorage
  const handleLoad = () => {
    try {
      const savedStateJSON = localStorage.getItem("seatmap_schema");
      if (savedStateJSON) {
        const parsedState: SeatmapState = JSON.parse(savedStateJSON);

        // ✅ Важно: сохраняем позицию stage
        setState((prev) => ({
          ...parsedState,
          stage: {
            ...parsedState.stage, // <-- не теряем x/y/scale
          },
        }));

        alert("Схема загружена!");
      } else {
        alert("Сохраненная схема не найдена.");
      }
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
      clear(); // Используем `clear` из хука useHistory
    }
  };

  // ექსპორტი Экспорт схемы в JSON-файл
  const handleExport = () => {
    // Формируем красивую вложенную структуру для экспорта, как вы и просили
    const exportData = {
      version: 1,
      hallName: "Экспортированный зал",
      zones: state.zones.map((zone) => ({
        id: zone.id,
        name: zone.label,
        ...zone, // Добавляем остальные свойства зоны (x, y, width, etc.)
        rows: state.rows
          .filter((row) => row.zoneId === zone.id)
          .map((row) => ({
            id: row.id,
            label: row.label,
            ...row, // Добавляем остальные свойства ряда
            seats: state.seats
              .filter((seat) => seat.rowId === row.id)
              .map((seat) => ({
                id: seat.id,
                label: seat.label,
                ...seat, // Добавляем остальные свойства места
              })),
          })),
      })),
    };

    const jsonString = JSON.stringify(exportData, null, 2); // `null, 2` для красивого форматирования
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "seatmap-schema.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Очищаем память
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
