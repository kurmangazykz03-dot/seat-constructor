import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { Zone, Row, Seat } from '../../types/types';
import RowComponent from './RowComponent';
import SeatComponent from './SeatComponent';
import { SeatmapState } from '../../pages/EditorPage';


interface ZoneComponentProps {
  zone: Zone;
  seats: Seat[];
  rows: Row[];
  selectedIds: string[];
  currentTool: string;
  hoveredZoneId: string | null;
  setState: (updater: (prevState: SeatmapState) => SeatmapState) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setHoveredZoneId: React.Dispatch<React.SetStateAction<string | null>>;
  handleElementClick: (id: string, e: any) => void;
  isViewerMode?: boolean;
}


const seatRadius = 12;
const seatSpacingX = 30;
const seatSpacingY = 30;

// Вспомогательная функция, можно вынести в utils.ts
const createRowWithSeats = (zoneId: string, rowIndex: number, cols: number) => {
  const rowId = `row-${crypto.randomUUID()}`;
  const row: Row = { id: rowId, zoneId, index: rowIndex, label: `${rowIndex + 1}`, x: 0, y: rowIndex * seatSpacingY + seatSpacingY / 2 };
  const newSeats: Seat[] = Array.from({ length: cols }, (_, c) => ({
    id: `seat-${crypto.randomUUID()}`,
    x: c * seatSpacingX + seatRadius,
    y: row.y,
    radius: seatRadius,
    fill: "#33DEF1",
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
}) => {
  const zoneSeats = seats.filter((s) => s.zoneId === zone.id);
  const zoneRows = rows.filter((r) => r.zoneId === zone.id);
  const seatsWithoutRow = zoneSeats.filter((s) => !s.rowId);

  const handleZoneClick = (e: any) => {
    e.cancelBubble = true;

    // Добавление места
    if (currentTool === 'add-seat') {
      const stage = e.target.getStage();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const localX = pointer.x - zone.x;
      const localY = pointer.y - zone.y;
      
      const parentRow = rows.find(r => r.zoneId === zone.id && localY >= r.y - seatSpacingY / 2 && localY <= r.y + seatSpacingY / 2);

      const newSeat: Seat = {
        id: `seat-${crypto.randomUUID()}`,
        x: localX,
        y: localY,
        radius: seatRadius,
        fill: '#33DEF1',
        label: `${seats.length + 1}`,
        category: 'standard',
        status: 'available',
        zoneId: zone.id,
        rowId: parentRow ? parentRow.id : null,
        colIndex: parentRow ? (seats.filter(s => s.rowId === parentRow.id).length || 0) + 1 : null,
      };

      setState(prev => ({
  ...prev,
  seats: [...prev.seats, newSeat]
}));
setSelectedIds([newSeat.id]);

      return;
    }
    
    // Добавление ряда
    if (currentTool === 'add-row') {
      const cols = zoneSeats.length > 0 ? Math.max(...zoneSeats.map((s) => s.colIndex || 1)) : 5;
      const newRowIndex = zoneRows.length;
      const newY = zone.height + seatSpacingY / 2;
      
      const { row: newRow, seats: newSeats } = createRowWithSeats(zone.id, newRowIndex, cols);
      
      const adjustedRow = { ...newRow, y: newY };
      const adjustedSeats = newSeats.map(s => ({ ...s, y: newY }));

      setState(prev => ({
  ...prev,
  zones: prev.zones.map(z => z.id === zone.id ? { ...z, height: z.height + seatSpacingY } : z),
  rows: [...prev.rows, adjustedRow],
  seats: [...prev.seats, ...adjustedSeats],
}));

      return;
    }

    // Выделение зоны
    if (e.evt.shiftKey) {
      setSelectedIds(prev => prev.includes(zone.id) ? prev.filter(i => i !== zone.id) : [...prev, zone.id]);
    } else {
      setSelectedIds([zone.id]);
    }
  };
  const handleZoneClickLocal = (e: any) => {
    if (isViewerMode) { // << ИЗМЕНЕНО: В режиме просмотра ничего не делаем
      e.cancelBubble = true;
      return;
    }
    handleZoneClick(e); // Вызываем старую логику только в редакторе
  };

  const handleSeatDragEnd = (e: any, seat: Seat) => {
    const newX = e.target.x();
    const newY = e.target.y();
    setState(prev => ({
  ...prev,
  seats: prev.seats.map(s => s.id === seat.id ? {...s, x: newX, y: newY} : s)
}));

  };


  return (
    <Group
      key={zone.id}
      x={zone.x}
      y={zone.y}


      onMouseEnter={() => setHoveredZoneId(zone.id)}
      onMouseLeave={() => setHoveredZoneId(null)}
      draggable={!isViewerMode} // << ИЗМЕНЕНО
      onClick={handleZoneClickLocal} // << ИЗМЕНЕНО
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
      
      {/* Места без ряда */}
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
      
      {/* Ряды с местами */}
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