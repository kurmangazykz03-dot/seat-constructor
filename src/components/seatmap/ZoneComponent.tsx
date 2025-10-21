// ZoneComponent.tsx
import Konva from "konva";
import React, { useRef } from "react";
import { Group, Rect, Text } from "react-konva";
import { SeatmapState } from "../../pages/EditorPage";
import { Row, Seat, Zone } from "../../types/types";
import { applySeatDrop } from "../../utils/seatSnap";
import RowComponent from "./RowComponent";
import SeatComponent from "./SeatComponent";

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
  setGroupRef?: (node: Konva.Group | null) => void;
  isViewerMode?: boolean;
  isSelected?: boolean;
}

const seatRadius = 12;
const seatSpacingX = 30;
const seatSpacingY = 30;

const createRowWithSeats = (
  zoneId: string,
  rowIndex: number,
  cols: number,
  offsetX: number,
  offsetY: number
) => {
  const rowId = `row-${crypto.randomUUID()}`;
  const y = offsetY + rowIndex * seatSpacingY + seatSpacingY / 2;
  const row: Row = {
    id: rowId,
    zoneId,
    index: rowIndex,
    label: `${rowIndex + 1}`,
    x: offsetX,
    y,
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
  setGroupRef,
}) => {
  const zoneSeats = (seats ?? []).filter((s) => s.zoneId === zone.id);
  const zoneRows = (rows ?? []).filter((r) => r.zoneId === zone.id);
  const seatsWithoutRow = zoneSeats.filter((s) => !s.rowId);

  const handleZoneClick = (e: any) => {
    e.cancelBubble = true;

    if (currentTool === "add-seat") {
      const stage = e.target.getStage();
      const pointer = stage.getPointerPosition();
      if (!pointer || !groupRef.current) return;

      const transform = groupRef.current.getAbsoluteTransform().copy().invert();
      const { x: localX, y: localY } = transform.point(pointer);

      const parentRow = rows.find(
        (r) =>
          r.zoneId === zone.id &&
          localY >= r.y - seatSpacingY / 2 &&
          localY <= r.y + seatSpacingY / 2
      );

      const countInRow = parentRow
        ? seats.filter((s) => s.rowId === parentRow.id).length
        : zoneSeats.length;

      const newSeat: Seat = {
        id: `seat-${crypto.randomUUID()}`,
        x: localX,
        y: parentRow ? parentRow.y : localY,
        radius: seatRadius,
        fill: "#22C55E",
        label: `${countInRow + 1}`,
        category: "standard",
        status: "available",
        zoneId: zone.id,
        rowId: parentRow ? parentRow.id : null,
        colIndex: parentRow ? countInRow + 1 : null,
      };

      setState((prev) => ({ ...prev, seats: [...prev.seats, newSeat] }));
      setSelectedIds([newSeat.id]);
      return;
    }

    // add-row: создаём row и seats в локальных координатах
    if (currentTool === "add-row") {
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
      const adjustedSeats: Seat[] = newSeats.map((s) => ({ ...s, y: localY }));

      setState((prev) => ({
        ...prev,
        zones: prev.zones.map((z) =>
          z.id === zone.id ? { ...z, height: z.height + seatSpacingY } : z
        ),
        rows: [...prev.rows, adjustedRow],
        seats: [...prev.seats, ...adjustedSeats],
      }));

      return;
    }

    // Выделение
    if (e.evt.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(zone.id) ? prev.filter((i) => i !== zone.id) : [...prev, zone.id]
      );
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

  const handleZoneDragEnd = (e: any) => {
    e.cancelBubble = true;
    const node = e.target as any;
    const newX = node.x();
    const newY = node.y();

    setState((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === zone.id ? { ...z, x: newX, y: newY } : z)),
    }));
  };
  const groupRef = useRef<Konva.Group | null>(null);
  const handleGroupRef = (node: Konva.Group | null) => {
    groupRef.current = node;
    setGroupRef?.(node);
  };
  const onSeatDragEnd = (seatAfterDrag: Seat) => {
    setState((prev) => {
      const z = prev.zones.find((zz) => zz.id === zone.id);
      if (!z) return prev;
      return applySeatDrop(prev, z, seatAfterDrag.id, seatAfterDrag.x, seatAfterDrag.y, 12, false);
    });
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
        stroke={
          selectedIds.includes(zone.id)
            ? "blue"
            : hoveredZoneId === zone.id && currentTool === "add-row"
              ? "orange"
              : ""
        }
        strokeWidth={selectedIds.includes(zone.id) || hoveredZoneId === zone.id ? 2 : 0}
        fillOpacity={0.2}
      />
      <Text
        text={zone.label}
        x={zone.width / 2}
        y={-18}
        fontSize={14}
        fill="black"
        align="center"
        offsetX={(zone.label.length * 7) / 2}
      />

      {seatsWithoutRow.map((seat) => (
        <SeatComponent
          key={seat.id}
          seat={seat}
          isSelected={selectedIds.includes(seat.id)}
          isRowSelected={false}
          onClick={handleElementClick}
          onDragEnd={(_e, s) => onSeatDragEnd(s)}
          isViewerMode={isViewerMode}
        />
      ))}

      {zoneRows.map((row) => (
        <RowComponent
          key={row.id}
          row={row}
          rowSeats={zoneSeats.filter((s) => s.rowId === row.id)}
          selectedIds={selectedIds}
          setState={setState}
          handleElementClick={handleElementClick}
          currentTool={currentTool}
          isViewerMode={isViewerMode}
          onSeatDragEnd={onSeatDragEnd}
        />
      ))}
    </Group>
  );
};

export default ZoneComponent;
