import React from 'react';
import { Circle, Text, Group } from 'react-konva';
import { Seat } from '../../types/types';

interface SeatComponentProps {
  seat: Seat;
  isSelected: boolean;
  isRowSelected: boolean;
  onClick: (id: string, e: any) => void;
  onDragEnd?: (e: any, seat: Seat) => void;
  offsetX?: number;
  offsetY?: number;
  isViewerMode?: boolean;
  currentTool?: string;
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
  currentTool = 'select',
}) => {
  const strokeColor = isSelected
    ? 'blue'
    : isRowSelected
    ? '#99CCFF'
    : 'transparent';
  const strokeWidth = isSelected ? 2 : isRowSelected ? 1 : 0;

  const x = Math.round(seat.x - offsetX);
  const y = Math.round(seat.y - offsetY);

  return (
    <Group
      x={x}
      y={y}
      draggable={!isViewerMode && currentTool === 'select'}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        if (!isViewerMode && onDragEnd) {
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
      <Circle
        radius={seat.radius}
        fill={seat.fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        perfectDrawEnabled={true} 
      />

      <Text
        text={seat.label}
        fontSize={12} 
        fill="white"
        x={0}
        y={0}
        offsetX={Math.round((seat.label.length * 6) / 2)} 
        offsetY={6} 
        listening={false}
      />
    </Group>
  );
};

export default SeatComponent;