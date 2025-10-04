import React from 'react';
import { Circle, Text } from 'react-konva';
import { Seat } from '../../types/types';

interface SeatComponentProps {
  seat: Seat;
  isSelected: boolean;
  isRowSelected?: boolean; // Сделаем опциональным
  onClick: (id: string, e: any) => void;
  onDragEnd?: (e: any, seat: Seat) => void; // Сделаем опциональным
  offsetX?: number;
  offsetY?: number;
  isViewerMode?: boolean; // << НОВЫЙ ПРОПС
}

const SeatComponent: React.FC<SeatComponentProps> = ({
  seat,
  isSelected,
  onClick,
  onDragEnd,
  isRowSelected = false, // Значение по умолчанию
  offsetX = 0,
  offsetY = 0,
  isViewerMode = false, // Значение по умолчанию
}) => {
  const strokeColor = isSelected ? '#3b82f6' : (isRowSelected && !isViewerMode ? 'blue' : '');
  const strokeWidth = isSelected ? 2.5 : (isRowSelected && !isViewerMode ? 2 : 0);

  return (
    <React.Fragment>
      <Circle
        x={seat.x - offsetX}
        y={seat.y - offsetY}
        radius={seat.radius}
        fill={seat.fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        draggable={!isViewerMode} // << ИЗМЕНЕНО: Отключаем перетаскивание
        onClick={(e) => onClick(seat.id, e)}
        onTap={(e) => onClick(seat.id, e)} // для мобильных
        onDragEnd={(e) => !isViewerMode && onDragEnd?.(e, seat)} // << ИЗМЕНЕНО: Вызываем только в режиме редактора
        // Эффекты для режима просмотра
        scaleX={isSelected && isViewerMode ? 1.2 : 1}
        scaleY={isSelected && isViewerMode ? 1.2 : 1}
        shadowColor="#000000"
        shadowBlur={isSelected && isViewerMode ? 8 : 4}
        shadowOpacity={0.3}
        perfectDrawEnabled={false}
      />
      <Text
        text={seat.label}
        x={seat.x - offsetX}
        y={seat.y - offsetY}
        fontSize={10}
        fill="white"
        offsetX={seat.label.length * 5 / 2}
        offsetY={5}
        listening={false}
      />
    </React.Fragment>
  );
};

export default SeatComponent;