// src/components/editor/RowComponent.tsx
import React from "react";
import { Group, Rect, Text } from "react-konva";
import { SeatmapState } from "../../pages/EditorPage";
import { Row, Seat } from "../../types/types";
import SeatComponent from "./SeatComponent";

interface RowComponentProps {
  row: Row;
  rowSeats: Seat[];
  selectedIds: string[];
  setState: (updater: (prevState: SeatmapState) => SeatmapState) => void;
  handleElementClick: (id: string, e: any) => void;
  currentTool: string;
  isViewerMode?: boolean;

  onSeatDragEnd?: (seatAfterDrag: Seat) => void;
}

const seatRadius = 12;

const RowComponent: React.FC<RowComponentProps> = ({
  row,
  rowSeats,
  selectedIds,
  setState,
  handleElementClick,
  currentTool,
  isViewerMode = false,
  onSeatDragEnd,
}) => {
  const isRowSelected = selectedIds.includes(row.id);
  const padding = 8;

  const minX = rowSeats.length > 0 ? Math.min(...rowSeats.map((s) => s.x)) : row.x - seatRadius;
  const maxX = rowSeats.length > 0 ? Math.max(...rowSeats.map((s) => s.x)) : row.x + seatRadius;
  const minY = rowSeats.length > 0 ? Math.min(...rowSeats.map((s) => s.y)) : row.y - seatRadius;
  const maxY = rowSeats.length > 0 ? Math.max(...rowSeats.map((s) => s.y)) : row.y + seatRadius;

  const handleRowDragMove = (e: any) => {
    if (!isRowSelected) return;
    const dx = e.target.x() - row.x;
    const dy = e.target.y() - row.y;

    setState((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        selectedIds.includes(r.id) ? { ...r, x: r.x + dx, y: r.y + dy } : r
      ),
      seats: prev.seats.map((s) =>
        selectedIds.includes(s.rowId ?? "") ? { ...s, x: s.x + dx, y: s.y + dy } : s
      ),
    }));
  };

  const localMinX = minX - row.x;
  const localMaxX = maxX - row.x;
  const localMinY = minY - row.y;
  const localMaxY = maxY - row.y;

  const bboxX = localMinX - seatRadius - padding;
  const bboxY = localMinY - seatRadius - padding;
  const bboxW = localMaxX - localMinX + seatRadius * 2 + padding * 2;
  const bboxH = localMaxY - localMinY + seatRadius * 2 + padding * 2;

  const labelWidth = Math.max(24, row.label.length * 8 + 12);
  const labelGap = 8;
  const labelX = bboxX - labelWidth - labelGap;
  const labelY = bboxY + bboxH / 2 - 10;

  return (
    <Group
      key={row.id}
      x={row.x}
      y={row.y}
      draggable={!isViewerMode && isRowSelected && currentTool === "select"}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      // src/components/editor/RowComponent.tsx

      // ...
      onDragMove={(e) => {
        e.cancelBubble = true;

        const dx = e.target.x() - row.x;
        const dy = e.target.y() - row.y;

        setState((prev) => ({
          ...prev,
          rows: prev.rows.map((r) =>
            selectedIds.includes(r.id) ? { ...r, x: r.x + dx, y: r.y + dy } : r
          ),
          seats: prev.seats.map((s) =>
            selectedIds.includes(s.rowId ?? "") ? { ...s, x: s.x + dx, y: s.y + dy } : s
          ),
        }));

        e.target.position({ x: row.x, y: row.y });
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        e.target.position({ x: row.x, y: row.y });
      }}
    >
      <Rect
        x={bboxX}
        y={bboxY}
        width={bboxW}
        height={bboxH}
        fill={"transparent"}
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

     {isRowSelected && (
  <Rect
    x={bboxX}
    y={bboxY}
    width={bboxW}
    height={bboxH}
    stroke="blue"
    strokeWidth={2}
    dash={[6, 4]}
    strokeScaleEnabled={false}
    listening={false}
  />
)}

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
        hitStrokeWidth={12}
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
        />
      ))}
    </Group>
  );
};

export default RowComponent;
