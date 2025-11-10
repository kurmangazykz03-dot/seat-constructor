import React from "react";
import { Group, Rect, Text } from "react-konva";
import { Zone } from "../../types/types";

interface DrawingZoneProps {
  // Текущая «рисуемая» зона (прямоугольник, который тянем мышкой)
  drawingZone: Zone | null;
  // Шаг по X между местами (для расчёта количества колонок)
  seatSpacingX: number;
  // Шаг по Y между рядами (для расчёта количества рядов)
  seatSpacingY: number;
}

const DrawingZone: React.FC<DrawingZoneProps> = ({ drawingZone, seatSpacingX, seatSpacingY }) => {
  // Если сейчас никакая зона не рисуется — ничего не отображаем
  if (!drawingZone) return null;

  // Здесь мы показываем полупрозрачный прямоугольник
  // + надпись вида "ряды × места" по текущему размеру
  return (
    <Group>
      {/* Прямоугольник рисуемой зоны */}
      <Rect
        x={drawingZone.x}
        y={drawingZone.y}
        width={drawingZone.width}
        height={drawingZone.height}
        fill={drawingZone.fill}
        stroke="blue"
        dash={[4, 4]} // пунктирная рамка
        fillOpacity={0.1} // лёгкая заливка, чтобы не мешала обзору
      />

      {/* Подпись: количество рядов × количество мест в ряду
          Расчёт идёт по текущему размеру зоны и шагам seatSpacingX/seatSpacingY */}
      <Text
        text={`${Math.max(1, Math.floor(Math.abs(drawingZone.height) / seatSpacingY))} × ${Math.max(
          1,
          Math.floor(Math.abs(drawingZone.width) / seatSpacingX)
        )}`}
        x={drawingZone.x + drawingZone.width / 2}
        y={drawingZone.y - 20} // текст чуть выше зоны
        fontSize={14}
        fill="blue"
        offsetX={20} // небольшой сдвиг для выравнивания
      />
    </Group>
  );
};

export default DrawingZone;
