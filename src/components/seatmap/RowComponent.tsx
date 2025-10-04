import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { Row, Seat } from  '../../types/types';
import SeatComponent from './SeatComponent';
import { SeatmapState } from '../../pages/EditorPage';

interface RowComponentProps {
  row: Row;
  rowSeats: Seat[];
  selectedIds: string[];
  setState: (updater: (prevState: SeatmapState) => SeatmapState) => void;
  handleElementClick: (id: string, e: any) => void;
  currentTool: string;
  isViewerMode?: boolean; // << НОВЫЙ ПРОПС
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

  const minX = Math.min(...rowSeats.map((s) => s.x));
  const maxX = Math.max(...rowSeats.map((s) => s.x));
  const minY = Math.min(...rowSeats.map((s) => s.y));
  const maxY = Math.max(...rowSeats.map((s) => s.y));
  const padding = 10;

  // Перетаскивание отдельного места
  const handleSeatDragEnd = (e: any, seat: Seat) => {
    const newX = e.target.x() + row.x;
    const newY = e.target.y() + row.y;

    const rowTop = row.y - seatSpacingY / 2;
    const rowBottom = row.y + seatSpacingY / 2;

    const newRowId = (newY < rowTop || newY > rowBottom) ? null : row.id;

    setState(prev => ({
      ...prev,
      seats: prev.seats.map(s =>
        s.id === seat.id ? { ...s, x: newX, y: newY, rowId: newRowId } : s
      )
    }));
  };

  // Перетаскивание ряда целиком
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

  return (
    <Group
      key={row.id}
      x={row.x}
      y={row.y}


      onDragMove={handleRowDragMove}
      onDragEnd={(e) => {
        e.target.position({ x: row.x, y: row.y });
      }}
      draggable={!isViewerMode && isRowSelected && currentTool === "select"} // << ИЗМЕНЕНО
      onClick={(e) => !isViewerMode && handleElementClick(row.id, e)} // << ИЗМЕНЕНО
    >
      {isRowSelected && rowSeats.length > 0 && (
        <Rect
          x={minX - row.x - seatRadius - padding}
          y={minY - row.y - seatRadius - padding}
          width={maxX - minX + seatRadius * 2 + padding * 2}
          height={maxY - minY + seatRadius * 2 + padding * 2}
          stroke="blue"
          strokeWidth={2}
          dash={[6, 4]}
          listening={false}
        />
      )}

      <Rect x={-50} y={-10} width={row.label.length * 8 + 12} height={20} fill={isRowSelected ? "#D0E8FF" : "white"} opacity={0.7} cornerRadius={4} />
      <Text text={row.label} x={-46} y={-10} fontSize={14} fill={isRowSelected ? "blue" : "black"} />

      {rowSeats.map((seat) => (
        <SeatComponent
          key={seat.id}
          seat={seat}
          isSelected={selectedIds.includes(seat.id)}
          isRowSelected={isRowSelected}
          onClick={handleElementClick}
          onDragEnd={handleSeatDragEnd}
          offsetX={row.x}
          offsetY={row.y}
          isViewerMode={isViewerMode} // << ПЕРЕДАЕМ ДАЛЬШЕ
        />
      ))}
      
    </Group>
  );
};

export default RowComponent;
