import React from 'react';
import { Circle, Text } from 'react-konva';
import { Seat } from  '../../types/types';

interface SeatComponentProps {
  seat: Seat;
  isSelected: boolean;
  isRowSelected: boolean;
  onClick: (id: string, e: any) => void;
  onDragEnd: (e: any, seat: Seat) => void;
  offsetX?: number; // Смещение для сидений в ряду
  offsetY?: number; // Смещение для сидений в ряду
}

const SeatComponent: React.FC<SeatComponentProps> = ({
  seat,
  isSelected,
  isRowSelected,
  onClick,
  onDragEnd,
  offsetX = 0,
  offsetY = 0,
}) => {
  return (
    <React.Fragment>
      <Circle
        x={seat.x - offsetX}
        y={seat.y - offsetY}
        radius={seat.radius}
        fill={seat.fill}
        stroke={isSelected || isRowSelected ? "blue" : ""}
        strokeWidth={isSelected || isRowSelected ? 2 : 0}
        draggable
        onClick={(e) => onClick(seat.id, e)}
        onDragEnd={(e) => onDragEnd(e, seat)}
      />
      <Text
        text={seat.label}
        x={seat.x - offsetX}
        y={seat.y - offsetY}
        fontSize={12}
        fill="white"
        offsetX={seat.label.length * 3}
        offsetY={6}
        listening={false}
      />
    </React.Fragment>
  );
};

export default SeatComponent;