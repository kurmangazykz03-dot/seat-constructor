// src/components/editor/RowComponent.tsx
import React, { useRef, useMemo } from "react";
import { Group, Rect } from "react-konva";
import type Konva from "konva";
import { SeatmapState } from "../../pages/EditorPage";
import { Row, Seat } from "../../types/types";
import SeatComponent from "./SeatComponent";
import { crisp, crispSize } from "../../utils/crisp";


interface RowComponentProps {
  row: Row;
  rowSeats: Seat[];
  selectedIds: string[];
  setState: (updater: (prevState: SeatmapState) => SeatmapState) => void;
  handleElementClick: (id: string, e: any) => void;
  currentTool: string;
  isViewerMode?: boolean;
  onSeatDragEnd?: (seatAfterDrag: Seat) => void;
  scale:number
}

const seatRadius = 12;
const HIT_PAD_X = 4;
const HIT_PAD_Y = 4;

const RowComponent: React.FC<RowComponentProps> = ({
  row,
  rowSeats,
  selectedIds,
  setState,
  handleElementClick,
  currentTool,
  isViewerMode = false,
  onSeatDragEnd,
  scale
}) => {
  const isRowSelected = selectedIds.includes(row.id);

  const canDrag = !isViewerMode && currentTool === "select";

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);


  const { bboxX, bboxY, bboxW, bboxH } = useMemo(() => {
    if (!rowSeats.length) {
      return {
        bboxX: -seatRadius - HIT_PAD_X,
        bboxY: -seatRadius - HIT_PAD_Y,
        bboxW: seatRadius * 2 + HIT_PAD_X * 2,
        bboxH: seatRadius * 2 + HIT_PAD_Y * 2,
      };
    }
    const minAbsX = Math.min(...rowSeats.map((s) => s.x - (s.radius ?? seatRadius)));
    const maxAbsX = Math.max(...rowSeats.map((s) => s.x + (s.radius ?? seatRadius)));
    const minAbsY = Math.min(...rowSeats.map((s) => s.y - (s.radius ?? seatRadius)));
    const maxAbsY = Math.max(...rowSeats.map((s) => s.y + (s.radius ?? seatRadius)));

    const minLocalX = minAbsX - row.x;
    const maxLocalX = maxAbsX - row.x;
    const minLocalY = minAbsY - row.y;
    const maxLocalY = maxAbsY - row.y;

    return {
      bboxX: minLocalX - HIT_PAD_X,
      bboxY: minLocalY - HIT_PAD_Y,
      bboxW: (maxLocalX - minLocalX) + HIT_PAD_X * 2,
      bboxH: (maxLocalY - minLocalY) + HIT_PAD_Y * 2,
    };
  }, [rowSeats, row.x, row.y]);

  return (
    <Group
      key={row.id}
      x={crisp(row.x, scale)}   // ← было row.x
  y={crisp(row.y, scale)}   // ← было row.y
      draggable={canDrag}
      // гасим всплытие, чтобы зона не перехватывала
      onMouseDown={(e) => (e.cancelBubble = true)}
      onMouseUp={(e) => (e.cancelBubble = true)}
      onTap={(e) => (e.cancelBubble = true)}
      onDragStart={(e) => {
        e.cancelBubble = true;
        const node = e.target as Konva.Group;
        dragStartRef.current = { x: node.x(), y: node.y() };


        if (!isRowSelected) {
          handleElementClick(row.id, e as any);
        }
      }}
      onDragMove={(e) => {

        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target as Konva.Group;
        const start = dragStartRef.current ?? { x: row.x, y: row.y };
        const end = { x: node.x(), y: node.y() };
        const dx = end.x - start.x;
        const dy = end.y - start.y;


        setState((prev) => ({
          ...prev,
          rows: prev.rows.map((r) =>
            r.id === row.id ? { ...r, x: r.x + dx, y: r.y + dy } : r
          ),
          seats: prev.seats.map((s) =>
            s.rowId === row.id ? { ...s, x: s.x + dx, y: s.y + dy } : s
          ),
        }));

        dragStartRef.current = null;
      }}
    >

      <Rect
        x={bboxX}
        y={bboxY}
        width={bboxW}
        height={bboxH}
        fillEnabled={false}
        strokeEnabled={false}
      
        hitStrokeWidth={12}
        onMouseDown={(e) => {
          e.cancelBubble = true;
          if (!isViewerMode) handleElementClick(row.id, e);
        }}
        onTouchStart={(e) => {
          e.cancelBubble = true;
          if (!isViewerMode) handleElementClick(row.id, e);
        }}
      />

      {/* Рамка выделения — только при выбранном ряду */}
      {isRowSelected && (
        <Rect
          x={bboxX}
          y={bboxY}
          width={bboxW}
          height={bboxH}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[6, 4]}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}

      {/* Сиденья ряда */}
      {rowSeats.map((seat) => (
        <SeatComponent
           key={seat.id}
          seat={seat}
          isSelected={selectedIds.includes(seat.id)}
          isRowSelected={isRowSelected}
          onClick={handleElementClick}
          onDragEnd={(_e, seatAfterDrag) => onSeatDragEnd?.(seatAfterDrag)}
          offsetX={row.x}
          offsetY={row.y}
          isViewerMode={isViewerMode}
          currentTool={currentTool}
          scale={scale}          // ← передаём сюда
        />
      ))}
    </Group>
  );
};

export default RowComponent;
