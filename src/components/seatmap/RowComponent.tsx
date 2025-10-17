import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { Row, Seat } from '../../types/types';
import SeatComponent from './SeatComponent';
import { SeatmapState } from '../../pages/EditorPage';

interface RowComponentProps {
  row: Row;
  rowSeats: Seat[];
  selectedIds: string[];
  setState: (updater: (prevState: SeatmapState) => SeatmapState) => void;
  handleElementClick: (id: string, e: any) => void;
  currentTool: string;
  isViewerMode?: boolean;
}

const seatSpacingX = 30;
const seatSpacingY = 30;
const seatRadius = 12;

const RowComponent: React.FC<RowComponentProps> = ({
  row,
  rowSeats,
  selectedIds,
  setState,
  handleElementClick,
  currentTool,
  isViewerMode = false,
}) => {
  const isRowSelected = selectedIds.includes(row.id);
  const padding = 8;

  // Безопасные min/max если мест нет
  const minX = rowSeats.length > 0 ? Math.min(...rowSeats.map(s => s.x)) : row.x - seatRadius;
  const maxX = rowSeats.length > 0 ? Math.max(...rowSeats.map(s => s.x)) : row.x + seatRadius;
  const minY = rowSeats.length > 0 ? Math.min(...rowSeats.map(s => s.y)) : row.y - seatRadius;
  const maxY = rowSeats.length > 0 ? Math.max(...rowSeats.map(s => s.y)) : row.y + seatRadius;

  // Обработчик перетаскивания отдельного места
 // RowComponent.tsx
const handleSeatDragEnd = (_e: any, seatAfterDrag: Seat) => {
  // seatAfterDrag.x / y — уже локальные для зоны координаты (НЕ надо добавлять row.x/y)
  const newX = seatAfterDrag.x;
  const newY = seatAfterDrag.y;

  // границы текущего ряда (локальные для зоны)
  const rowTop = row.y - seatSpacingY / 2;
  const rowBottom = row.y + seatSpacingY / 2;

  const newRowId = newY < rowTop || newY > rowBottom ? null : row.id;

  setState(prev => ({
    ...prev,
    seats: prev.seats.map(s =>
      s.id === seatAfterDrag.id ? { ...s, x: newX, y: newY, rowId: newRowId } : s
    ),
  }));
};


  // Перетаскивание ряда целиком (движение всех выбранных)
  const handleRowDragMove = (e: any) => {
    if (!isRowSelected) return;
    const dx = e.target.x() - row.x;
    const dy = e.target.y() - row.y;

    setState(prev => ({
      ...prev,
      rows: prev.rows.map(r =>
        selectedIds.includes(r.id) ? { ...r, x: r.x + dx, y: r.y + dy } : r
      ),
      seats: prev.seats.map(s =>
        selectedIds.includes(s.rowId ?? "") ? { ...s, x: s.x + dx, y: s.y + dy } : s
      )
    }));
  };

  // Позиции для фонового rect и метки (локальные координаты внутри Group)
  const localMinX = minX - row.x;
  const localMaxX = maxX - row.x;
  const localMinY = minY - row.y;
  const localMaxY = maxY - row.y;

  const bboxX = localMinX - seatRadius - padding;
  const bboxY = localMinY - seatRadius - padding;
  const bboxW = (localMaxX - localMinX) + seatRadius * 2 + padding * 2;
  const bboxH = (localMaxY - localMinY) + seatRadius * 2 + padding * 2;

  // Позиция метки слева, по центру по вертикали
  const labelWidth = Math.max(24, row.label.length * 8 + 12);
  const labelGap = 8;
  const labelX = bboxX - labelWidth - labelGap;
  const labelY = bboxY + bboxH / 2 - 10; // rect height 20 -> -10 для центрирования

  return (
    <Group
        key={row.id}
  x={row.x}
  y={row.y}
  draggable={!isViewerMode && isRowSelected && currentTool === "select"}
  onDragStart={(e) => {
    e.cancelBubble = true; // 🧠 не даём всплыть в зону
  }}
  onDragMove={(e) => {
    e.cancelBubble = true; // 🧠 блокируем всплытие
    handleRowDragMove(e);
  }}
  onDragEnd={(e) => {
    e.cancelBubble = true; // 🧠 чтобы зона не получила dragEnd
    e.target.position({ x: row.x, y: row.y }); // возвращаем визуально назад
  }}
    >
      {/* Прозрачный фон — ловит клики по пустой области ряда */}
      <Rect
        x={bboxX}
        y={bboxY}
        width={bboxW}
        height={bboxH}
        fill={'transparent'}
        listening={true}
        onMouseDown={(e: any) => {
          e.cancelBubble = true;
          if (!isViewerMode) handleElementClick(row.id, e);
        }}
        onTouchStart={(e: any) => {
          e.cancelBubble = true;
          if (!isViewerMode) handleElementClick(row.id, e);
        }}
      />

      {/* Рисуем рамку выделения поверх фона, но под сиденьями */}
      {isRowSelected && (
        <Rect
          x={bboxX}
          y={bboxY}
          width={bboxW}
          height={bboxH}
          stroke="blue"
          strokeWidth={2}
          dash={[6, 4]}
          listening={false}
        />
      )}

      {/* Метка ряда — теперь кликабельна */}
      <Rect
        x={labelX}
        y={labelY}
        width={labelWidth}
        height={20}
        fill={isRowSelected ? "#D0E8FF" : "white"}
        opacity={0.95}
        cornerRadius={4}
        listening={true}
        onClick={(e: any) => {
          e.cancelBubble = true;
          if (!isViewerMode) handleElementClick(row.id, e);
        }}
      />
      <Text
        text={row.label}
        x={labelX}
        y={labelY}
        width={labelWidth}
        height={20}
        align="center"
        verticalAlign="middle"
        fontSize={14}
        fill={isRowSelected ? "blue" : "black"}
        listening={true}
        onClick={(e: any) => {
          e.cancelBubble = true;
          if (!isViewerMode) handleElementClick(row.id, e);
        }}
      />

      {/* Сами сиденья — рендерим поверх фоновой зоны */}
      {rowSeats.map(seat => (
        <SeatComponent
          key={seat.id}
          seat={seat}
          isSelected={selectedIds.includes(seat.id)}
          isRowSelected={isRowSelected}
          onClick={handleElementClick}
          onDragEnd={handleSeatDragEnd}
          offsetX={row.x}
          offsetY={row.y}
          isViewerMode={isViewerMode}
        />
      ))}
    </Group>
  );
};

export default RowComponent;