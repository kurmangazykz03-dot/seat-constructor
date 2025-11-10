// src/components/editor/RowComponent.tsx
import type Konva from "konva";
import React, { useMemo, useRef } from "react";
import { Group, Rect } from "react-konva";
import { SeatmapState } from "../../pages/EditorPage";
import { Row, Seat } from "../../types/types";
import { crisp } from "../../utils/crisp";
import SeatComponent from "./SeatComponent";

interface RowComponentProps {
  row: Row; // сам ряд
  rowSeats: Seat[]; // места, принадлежащие этому ряду
  selectedIds: string[]; // текущий selection
  setState: (updater: (prevState: SeatmapState) => SeatmapState) => void;
  handleElementClick: (id: string, e: any) => void;
  currentTool: string; // текущий инструмент (select / bend / ...)
  isViewerMode?: boolean; // режим просмотра (без редактирования)
  onSeatDragEnd?: (seatAfterDrag: Seat) => void; // коллбек, когда перетаскивание места закончено
  scale: number; // масштаб Stage (для crisp)
}

const seatRadius = 12;
const HIT_PAD_X = 4; // дополнительная «подушка» по X для хитбокса ряда
const HIT_PAD_Y = 4; // дополнительная «подушка» по Y для хитбокса ряда

const RowComponent: React.FC<RowComponentProps> = ({
  row,
  rowSeats,
  selectedIds,
  setState,
  handleElementClick,
  currentTool,
  isViewerMode = false,
  onSeatDragEnd,
  scale,
}) => {
  const isRowSelected = selectedIds.includes(row.id);

  // Ряд можно таскать только в редакторе и только в режиме select
  const canDrag = !isViewerMode && currentTool === "select";

  // Запоминаем позицию группы в момент начала драга — чтобы посчитать dx/dy
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Вычисляем bounding-box ряда по его сиденьям
  const { bboxX, bboxY, bboxW, bboxH } = useMemo(() => {
    // Если в ряду пока нет мест — рисуем минимальный хитбокс по центру
    if (!rowSeats.length) {
      return {
        bboxX: -seatRadius - HIT_PAD_X,
        bboxY: -seatRadius - HIT_PAD_Y,
        bboxW: seatRadius * 2 + HIT_PAD_X * 2,
        bboxH: seatRadius * 2 + HIT_PAD_Y * 2,
      };
    }

    // Сначала считаем «абсолютные» координаты относительно сцены
    const minAbsX = Math.min(...rowSeats.map((s) => s.x - (s.radius ?? seatRadius)));
    const maxAbsX = Math.max(...rowSeats.map((s) => s.x + (s.radius ?? seatRadius)));
    const minAbsY = Math.min(...rowSeats.map((s) => s.y - (s.radius ?? seatRadius)));
    const maxAbsY = Math.max(...rowSeats.map((s) => s.y + (s.radius ?? seatRadius)));

    // Переводим в локальные координаты внутри группы ряда (центр в row.x / row.y)
    const minLocalX = minAbsX - row.x;
    const maxLocalX = maxAbsX - row.x;
    const minLocalY = minAbsY - row.y;
    const maxLocalY = maxAbsY - row.y;

    return {
      bboxX: minLocalX - HIT_PAD_X,
      bboxY: minLocalY - HIT_PAD_Y,
      bboxW: maxLocalX - minLocalX + HIT_PAD_X * 2,
      bboxH: maxLocalY - minLocalY + HIT_PAD_Y * 2,
    };
  }, [rowSeats, row.x, row.y]);

  return (
    <Group
      key={row.id}
      // К центру ряда применяем crisp, чтобы линии/текст попадали в пиксели сетки
      x={crisp(row.x, scale)}
      y={crisp(row.y, scale)}
      draggable={canDrag}
      // Гасим всплытие событий, чтобы клики/drag не уходили в зону
      onMouseDown={(e) => (e.cancelBubble = true)}
      onMouseUp={(e) => (e.cancelBubble = true)}
      onTap={(e) => (e.cancelBubble = true)}
      onDragStart={(e) => {
        e.cancelBubble = true;
        const node = e.target as Konva.Group;
        dragStartRef.current = { x: node.x(), y: node.y() };

        // Если сам ряд не был выделен — выделяем его при начале перетаскивания
        if (!isRowSelected) {
          handleElementClick(row.id, e as any);
        }
      }}
      onDragMove={(e) => {
        // Просто гасим всплытие, сам пересчёт делаем на onDragEnd
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target as Konva.Group;
        const start = dragStartRef.current ?? { x: row.x, y: row.y };
        const end = { x: node.x(), y: node.y() };
        const dx = end.x - start.x;
        const dy = end.y - start.y;

        // Смещаем и сам Row, и все его Seats на dx/dy
        setState((prev) => ({
          ...prev,
          rows: prev.rows.map((r) => (r.id === row.id ? { ...r, x: r.x + dx, y: r.y + dy } : r)),
          seats: prev.seats.map((s) =>
            s.rowId === row.id ? { ...s, x: s.x + dx, y: s.y + dy } : s
          ),
        }));

        dragStartRef.current = null;
      }}
    >
      {/* Прямоугольник-хитбокс по всему ряду: принимает клики/тапы по пустому месту между сиденьями */}
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

      {/* Рамка выделения ряда — показываем только если ряд выбран */}
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

      {/* Сами сиденья ряда */}
      {rowSeats.map((seat) => (
        <SeatComponent
          key={seat.id}
          seat={seat}
          isSelected={selectedIds.includes(seat.id)}
          isRowSelected={isRowSelected}
          onClick={handleElementClick}
          onDragEnd={(_e, seatAfterDrag) => onSeatDragEnd?.(seatAfterDrag)}
          offsetX={row.x} // сиденья внутри группы живут относительно row.x/row.y
          offsetY={row.y}
          isViewerMode={isViewerMode}
          currentTool={currentTool}
          scale={scale}
        />
      ))}
    </Group>
  );
};

export default RowComponent;
