import React from 'react';
import { Layer, Line } from 'react-konva';

interface GridLayerProps {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
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
  if (!showGrid) return null;

  const lines = [];


  const padding = 2000; 


  const viewRect = {
    x1: (-stagePos.x - padding) / scale,
    y1: (-stagePos.y - padding) / scale,
    x2: (-stagePos.x + width + padding) / scale,
    y2: (-stagePos.y + height + padding) / scale,
  };


  const startX = Math.floor(viewRect.x1 / gridSize) * gridSize;
  const endX = Math.ceil(viewRect.x2 / gridSize) * gridSize;
  const startY = Math.floor(viewRect.y1 / gridSize) * gridSize;
  const endY = Math.ceil(viewRect.y2 / gridSize) * gridSize;


  for (let x = startX; x <= endX; x += gridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, viewRect.y1, x, viewRect.y2]}
        stroke="#cbd5e1"
        strokeWidth={0.5 / scale}
      />
    );
  }


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

  return <Layer listening={false}>{lines}</Layer>;
};

export default GridLayer;
