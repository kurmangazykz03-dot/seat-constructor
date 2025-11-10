// SeatComponent.tsx
import React from "react";
import { Circle, Group, Text } from "react-konva";
import { Seat } from "../../types/types";
import { crisp, crispSize } from "../../utils/crisp";

// Цвета по статусу для режима просмотра
const STATUS_COLORS: Record<string, string> = {
  available: "#22c55e", // Доступно
  occupied: "#ef4444", // Занято
  disabled: "#9ca3af", // Недоступно
};

interface SeatComponentProps {
  seat: Seat;
  isSelected: boolean; // выделено само место
  isRowSelected: boolean; // подсветка, если выделен ряд
  onClick: (id: string, e: any) => void; // клик по месту
  onDragEnd?: (e: any, seat: Seat) => void; // конец перетаскивания (редактор)
  offsetX?: number; // локальный сдвиг внутри зоны/ряда
  offsetY?: number;
  isViewerMode?: boolean; // true — только просмотр, без drag
  currentTool?: string; // инструмент (select / bend / ...)
  scale: number; // текущий масштаб Stage
}

const SeatComponent: React.FC<SeatComponentProps> = ({
  seat,
  isSelected,
  isRowSelected,
  onClick,
  onDragEnd,
  offsetX = 0,
  offsetY = 0,
  isViewerMode = false,
  currentTool = "select",
  scale,
}) => {
  // В режиме просмотра цвет берём из статуса; в редакторе — из fill
  const visualFill = isViewerMode
    ? (STATUS_COLORS[seat.status ?? "available"] ?? "#22c55e")
    : (seat.fill ?? "#1f2937");

  // Обводка: синяя — если выделено место, светло-синяя — если выделен ряд
  const strokeColor = isSelected ? "blue" : isRowSelected ? "#99CCFF" : "transparent";
  const strokeWidth = isSelected ? 2 : isRowSelected ? 1 : 0;

  // Координаты группы: локальные (x, y) минус смещение зоны/ряда
  const gx = Math.round(seat.x - offsetX);
  const gy = Math.round(seat.y - offsetY);

  const label = String(seat.label ?? "");
  const fontSize = Math.round(12);

  return (
    <Group
      x={gx}
      y={gy}
      // В viewer-режиме сиденья не перетаскиваются
      draggable={!isViewerMode && currentTool === "select"}
      onDragStart={(e) => (e.cancelBubble = true)} // не даём событию уйти выше
      onDragMove={(e) => (e.cancelBubble = true)}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        if (!isViewerMode && onDragEnd) {
          // Пересчитываем координаты обратно в «мировые»
          const newSeat = {
            ...seat,
            x: e.target.x() + offsetX,
            y: e.target.y() + offsetY,
          };
          onDragEnd(e, newSeat);
        }
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        onClick(seat.id, e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onClick(seat.id, e);
      }}
    >
      {/* Круг места, с учётом crisp для чётких границ на масштабе */}
      <Circle
        x={crisp(0, scale)}
        y={crisp(0, scale)}
        radius={crispSize(seat.radius ?? 12, scale)}
        fill={visualFill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeScaleEnabled={false}
        hitStrokeWidth={12} // зона попадания по обводке
      />

      {/* Текст (номер места) по центру круга */}
      <Text
        text={label}
        fontSize={fontSize}
        fill="white"
        x={crisp(0, scale)}
        y={crisp(0, scale)}
        // примитивный расчёт смещения по длине строки
        offsetX={Math.round((label.length * 6) / 2)}
        offsetY={Math.round(fontSize / 2)}
        listening={false} // клики не перехватываем текстом
      />
    </Group>
  );
};

export default SeatComponent;
