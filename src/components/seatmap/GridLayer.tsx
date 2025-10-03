import React from 'react';
import { Layer, Line } from 'react-konva';

interface GridLayerProps {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
}

const GridLayer: React.FC<GridLayerProps> = ({ width, height, gridSize, showGrid }) => {
  if (!showGrid) {
    return null;
  }
  
  const lines = [];
  // Вертикальные линии
  for (let i = 0; i < Math.ceil(width / gridSize); i++) {
    lines.push(<Line key={`v-${i}`} points={[i * gridSize, 0, i * gridSize, height]} stroke="#cbd5e1" strokeWidth={0.5} />);
  }
  // Горизонтальные линии
  for (let i = 0; i < Math.ceil(height / gridSize); i++) {
    lines.push(<Line key={`h-${i}`} points={[0, i * gridSize, width, i * gridSize]} stroke="#cbd5e1" strokeWidth={0.5} />);
  }

  return <Layer listening={false}>{lines}</Layer>;
};

export default GridLayer;