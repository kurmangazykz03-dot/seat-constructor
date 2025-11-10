import React from "react";
import { Layer, Line } from "react-konva";

interface GridLayerProps {
  width: number; // ширина видимой области (в пикселях экрана)
  height: number; // высота видимой области
  gridSize: number; // шаг сетки в мировых координатах
  showGrid: boolean; // флаг: показывать ли сетку
  scale: number; // текущий масштаб Stage
  stagePos: { x: number; y: number }; // позиция Stage (смещение сцены)
}

const GridLayer: React.FC<GridLayerProps> = ({
  width,
  height,
  gridSize,
  showGrid,
  scale,
  stagePos,
}) => {
  // Если сетка отключена — ничего не рендерим
  if (!showGrid) return null;

  const lines = [];

  // Дополнительный «запас» за пределы экрана,
  // чтобы линии сетки не обрывались прямо у края
  const padding = 2000;

  // Переводим экранный прямоугольник в мировые координаты
  // с учётом позиции Stage и масштаба
  const viewRect = {
    x1: (-stagePos.x - padding) / scale,
    y1: (-stagePos.y - padding) / scale,
    x2: (-stagePos.x + width + padding) / scale,
    y2: (-stagePos.y + height + padding) / scale,
  };

  // Находим ближайшие линии сетки, которые попадают в видимую область
  const startX = Math.floor(viewRect.x1 / gridSize) * gridSize;
  const endX = Math.ceil(viewRect.x2 / gridSize) * gridSize;
  const startY = Math.floor(viewRect.y1 / gridSize) * gridSize;
  const endY = Math.ceil(viewRect.y2 / gridSize) * gridSize;

  // Вертикальные линии сетки
  for (let x = startX; x <= endX; x += gridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, viewRect.y1, x, viewRect.y2]}
        stroke="#cbd5e1"
        // делим толщину на scale, чтобы линия оставалась
        // ~0.5px визуально при любом зуме
        strokeWidth={0.5 / scale}
      />
    );
  }

  // Горизонтальные линии сетки
  for (let y = startY; y <= endY; y += gridSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[viewRect.x1, y, viewRect.x2, y]}
        stroke="#cbd5e1"
        strokeWidth={0.5 / scale}
      />
    );
  }

  // Отдельный слой только для сетки, без обработки событий
  return <Layer listening={false}>{lines}</Layer>;
};

export default GridLayer;
