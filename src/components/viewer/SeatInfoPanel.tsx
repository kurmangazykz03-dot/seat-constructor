import { Info } from "lucide-react";
import React from "react";
import { Seat } from "../../types/types";

// Цвета для разных статусов места
const STATUS_COLORS: { [key: string]: string } = {
  available: "#22c55e", // Доступно
  occupied: "#ef4444", // Занято
  disabled: "#9ca3af", // Недоступно
};

interface SeatInfoPanelProps {
  // Текущее выбранное место; если null — ничего не выбрано
  seat: Seat | null;
}

// Элемент легенды (кружок + подпись)
const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></span>
    <span className="text-sm text-gray-700">{label}</span>
  </div>
);

// Боковая панель с информацией о месте
export const SeatInfoPanel: React.FC<SeatInfoPanelProps> = ({ seat }) => {
  return (
    <aside className="w-[320px] bg-gray-50 border-l border-gray-200 p-6 flex-shrink-0 h-full overflow-y-auto">
      {/* Заголовок панели */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Информация о месте</h2>

      {/* Легенда по цветам статусов */}
      <div className="mb-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Легенда</h3>
        <LegendItem color={STATUS_COLORS.available} label="Доступно" />
        <LegendItem color={STATUS_COLORS.occupied} label="Занято" />
        <LegendItem color={STATUS_COLORS.disabled} label="Недоступно" />
      </div>

      {/* Если место выбрано — показываем его данные */}
      {seat ? (
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-700 mb-3">Выбранное место</h3>

          {/* Номер места */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Номер места</label>
            <p className="text-lg font-bold text-gray-800">{seat.label}</p>
          </div>

          {/* Категория (тип места: стандарт, VIP и т.д.) */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Категория</label>
            <p className="text-sm text-gray-700">{seat.category}</p>
          </div>

          {/* Статус места с цветной «плашкой» */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
            <span
              className="inline-block text-sm font-semibold px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: STATUS_COLORS[seat.status] || "#22c55e" }}
            >
              {seat.status === "available"
                ? "Доступно"
                : seat.status === "occupied"
                  ? "Занято"
                  : seat.status === "disabled"
                    ? "Недоступно"
                    : seat.status}
            </span>
          </div>
        </div>
      ) : (
        // Если ничего не выбрано — показываем подсказку
        <div className="flex flex-col items-center text-center text-gray-500 mt-10">
          <Info size={40} className="mb-4" />
          <h3 className="font-semibold">Выберите место</h3>
          <p className="text-sm">
            Нажмите на любое место на схеме, чтобы увидеть его характеристики.
          </p>
        </div>
      )}
    </aside>
  );
};
