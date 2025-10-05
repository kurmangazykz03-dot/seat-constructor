import React from 'react';
import { Layer, Line } from 'react-konva';

interface GridLayerProps {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  // Новые пропсы для динамического рендеринга
  scale: number;
  stagePos: { x: number; y: number };
}

const GridLayer: React.FC<GridLayerProps> = ({
  width,
  height,
  gridSize,
  showGrid,
  scale,
  stagePos,
}) => {
  if (!showGrid) {
    return null;
  }

  const lines = [];

  // 1. Вычисляем видимую область холста в "мировых" координатах
  const viewRect = {
    x1: -stagePos.x / scale,
    y1: -stagePos.y / scale,
    x2: (-stagePos.x + width) / scale,
    y2: (-stagePos.y + height) / scale,
  };

  // 2. Находим, с какой координаты начинать рисовать линии, чтобы они попали в экран
  const startX = Math.floor(viewRect.x1 / gridSize) * gridSize;
  const endX = Math.ceil(viewRect.x2 / gridSize) * gridSize;
  const startY = Math.floor(viewRect.y1 / gridSize) * gridSize;
  const endY = Math.ceil(viewRect.y2 / gridSize) * gridSize;
  
  // 3. Рисуем только видимые линии
  
  // Вертикальные линии
  for (let i = startX; i < endX; i += gridSize) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i, viewRect.y1, i, viewRect.y2]}
        stroke="#cbd5e1"
        // Делаем линии тоньше при приближении и толще при отдалении
        strokeWidth={0.5 / scale} 
      />
    );
  }

  // Горизонтальные линии
  for (let i = startY; i < endY; i += gridSize) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[viewRect.x1, i, viewRect.x2, i]}
        stroke="#cbd5e1"
        strokeWidth={0.5 / scale}
      />
    );
  }

  return <Layer listening={false}>{lines}</Layer>;
};

export default GridLayer;