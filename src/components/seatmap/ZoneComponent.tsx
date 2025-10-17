// ZoneComponent.tsx
import React, { useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';
import { Zone, Row, Seat } from '../../types/types';
import RowComponent from './RowComponent';
import SeatComponent from './SeatComponent';
import { SeatmapState } from '../../pages/EditorPage';
import Konva from "konva";



interface ZoneComponentProps {
  zone: Zone;
  seats: Seat[]; // seats.x/y => локальные (относительно зоны)
  rows: Row[];   // rows.x/y => локальные (относительно зоны)
  selectedIds: string[];
  currentTool: string;
  hoveredZoneId: string | null;
  setState: (updater: (prevState: SeatmapState) => SeatmapState) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setHoveredZoneId: React.Dispatch<React.SetStateAction<string | null>>;
  handleElementClick: (id: string, e: any) => void;
  setGroupRef?: (node: Konva.Group | null) => void;
  isViewerMode?: boolean;
}


const seatRadius = 12;
const seatSpacingX = 30;
const seatSpacingY = 30;

// ЛОКАЛЬНАЯ версия
const createRowWithSeats = (
  zoneId: string,
  rowIndex: number,
  cols: number,
  offsetX: number, // ← смещение внутри зоны
  offsetY: number  // ← смещение внутри зоны
) => {
  const rowId = `row-${crypto.randomUUID()}`;
  const y = offsetY + rowIndex * seatSpacingY + seatSpacingY / 2;
  const row: Row = {
    id: rowId,
    zoneId,
    index: rowIndex,
    label: `${rowIndex + 1}`,
    x: offsetX,   // локально!
    y,            // локально!
  };
  const newSeats: Seat[] = Array.from({ length: cols }, (_, c) => ({
    id: `seat-${crypto.randomUUID()}`,
    x: offsetX + c * seatSpacingX + seatRadius,
y,
    radius: seatRadius,
    fill: "#22C55E",
    label: `${c + 1}`,
    category: "standard",
    status: "available",
    zoneId,
    rowId,
    colIndex: c + 1,
  }));
  return { row, seats: newSeats };
};


const ZoneComponent: React.FC<ZoneComponentProps> = ({
  zone,
  seats,
  rows,
  selectedIds,
  currentTool,
  hoveredZoneId,
  isViewerMode = false,
  setState,
  setSelectedIds,
  setHoveredZoneId,
  handleElementClick,
  setGroupRef
}) => {
  // Интерпретируем state как локальные координаты.
  const zoneSeats = seats.filter((s) => s.zoneId === zone.id);
  const zoneRows = rows.filter((r) => r.zoneId === zone.id);
  const seatsWithoutRow = zoneSeats.filter((s) => !s.rowId);

  const handleZoneClick = (e: any) => {
    e.cancelBubble = true;

    // add-seat: pointer абсолютный — пересчитываем в локальные (pointer - zone)
    if (currentTool === 'add-seat') {
const stage = e.target.getStage();
const pointer = stage.getPointerPosition();
if (!pointer || !groupRef.current) return;

// pointer (глобальные) → ЛОКАЛЬНЫЕ координаты группы зоны (корректно при rotation)
const transform = groupRef.current.getAbsoluteTransform().copy().invert();
const { x: localX, y: localY } = transform.point(pointer);

// ищем родительский ряд в локальных координатах
const parentRow = rows.find(
  r =>
    r.zoneId === zone.id &&
    localY >= r.y - seatSpacingY / 2 &&
    localY <= r.y + seatSpacingY / 2
);

// считаем номер для лейбла и colIndex в рамках ряда/зоны
const countInRow = parentRow
  ? seats.filter(s => s.rowId === parentRow.id).length
  : zoneSeats.length;

const newSeat: Seat = {
  id: `seat-${crypto.randomUUID()}`,
  x: localX,
  y: parentRow ? parentRow.y : localY,
  radius: seatRadius,
  fill: '#22C55E',
  label: `${countInRow + 1}`,
  category: 'standard',
  status: 'available',
  zoneId: zone.id,
  rowId: parentRow ? parentRow.id : null,
  colIndex: parentRow ? countInRow + 1 : null,
};

setState(prev => ({ ...prev, seats: [...prev.seats, newSeat] }));
setSelectedIds([newSeat.id]);
return;

}

    // add-row: создаём row и seats в локальных координатах
    if (currentTool === 'add-row') {
      const cols = zoneSeats.length > 0 ? Math.max(...zoneSeats.map((s) => s.colIndex || 1)) : 5;
      const newRowIndex = zoneRows.length;

      // локальная позиция ряда — под текущим зоной
      const localY = zone.height + seatSpacingY / 2;

      const { row: newRow, seats: newSeats } = createRowWithSeats(zone.id, newRowIndex, cols, 0, 0);


      const adjustedRow: Row = {
        ...newRow,
        y: localY,
        index: newRowIndex,
        label: `${newRowIndex + 1}`,
      };

      // newSeats уже локальные; нужно только выставить y = localY
      const adjustedSeats: Seat[] = newSeats.map(s => ({ ...s, y: localY }));

      setState(prev => ({
        ...prev,
        zones: prev.zones.map(z => z.id === zone.id ? { ...z, height: z.height + seatSpacingY } : z),
        rows: [...prev.rows, adjustedRow],
        seats: [...prev.seats, ...adjustedSeats],
      }));

      return;
    }

    // Выделение
    if (e.evt.shiftKey) {
      setSelectedIds(prev => prev.includes(zone.id) ? prev.filter(i => i !== zone.id) : [...prev, zone.id]);
    } else {
      setSelectedIds([zone.id]);
    }
  };

  const handleZoneClickLocal = (e: any) => {
    if (isViewerMode) {
      e.cancelBubble = true;
      return;
    }
    handleZoneClick(e);
  };

  // Перетаскивание места: e.target.x/y — локальные координаты внутри группы (relative to zone)
  const handleSeatDragEnd = (e: any, seat: Seat) => {
  const newX = e.target.x();
  const newY = e.target.y();

  setState(prev => ({
    ...prev,
    seats: prev.seats.map(s =>
      s.id === seat.id ? { ...s, x: newX, y: newY } : s
    ),
  }));
};

  // Перетаскивание зоны: обновляем только координаты зоны (не трогаем rows/seats!)
  const handleZoneDragEnd = (e: any) => {
    e.cancelBubble = true;
    const node = e.target as any;
    const newX = node.x();
    const newY = node.y();

    setState(prev => ({
      ...prev,
      zones: prev.zones.map(z => z.id === zone.id ? { ...z, x: newX, y: newY } : z),
    }));
  };
const groupRef = useRef<Konva.Group | null>(null);
const handleGroupRef = (node: Konva.Group | null) => {
  groupRef.current = node;
  setGroupRef?.(node);
};
  return (
    <Group
  ref={handleGroupRef}
  x={zone.x}
  y={zone.y}
  rotation={zone.rotation ?? 0}

      onMouseEnter={() => setHoveredZoneId(zone.id)}
      onMouseLeave={() => setHoveredZoneId(null)}
      draggable={!isViewerMode}
      onClick={handleZoneClickLocal}
      onDragEnd={handleZoneDragEnd}
      
    >
      <Rect
        width={zone.width}
        height={zone.height}
        fill={zone.fill}
        stroke={selectedIds.includes(zone.id) ? "blue" : hoveredZoneId === zone.id && currentTool === "add-row" ? "orange" : ""}
        strokeWidth={selectedIds.includes(zone.id) || hoveredZoneId === zone.id ? 2 : 0}
        fillOpacity={0.2}
      />
      <Text text={zone.label} x={zone.width / 2} y={-18} fontSize={14} fill="black" align="center" offsetX={(zone.label.length * 7) / 2} />

      {/* Места без ряда — координаты локальные, передаём как есть */}
      {seatsWithoutRow.map(seat => (
        <SeatComponent
          key={seat.id}
          seat={seat}
          isSelected={selectedIds.includes(seat.id)}
          isRowSelected={false}
          onClick={handleElementClick}
          onDragEnd={handleSeatDragEnd}
          isViewerMode={isViewerMode}
        />
      ))}

      {/* Ряды — row.x/y локальные, rowSeats — локальные */}
      {zoneRows.map(row => (
        <RowComponent
          key={row.id}
          row={row}
          rowSeats={zoneSeats.filter(s => s.rowId === row.id)}
          selectedIds={selectedIds}
          setState={setState}
          handleElementClick={handleElementClick}
          currentTool={currentTool}
          isViewerMode={isViewerMode}
        />
      ))}
    </Group>
  );
};

export default ZoneComponent;
