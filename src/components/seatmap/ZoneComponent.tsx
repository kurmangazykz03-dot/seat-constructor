// components/seatmap/ZoneComponent.tsx
import Konva from "konva";
import React, { useMemo, useRef } from "react";
import { Group, Rect, Text, Path } from "react-konva";

import { SeatmapState } from "../../pages/EditorPage";
import { Row, Seat, Zone } from "../../types/types";

import { applySeatDrop } from "../../utils/seatSnap";
import RowComponent from "./RowComponent";
import SeatComponent from "./SeatComponent";
// import ZoneBendOverlay from "./ZoneBendOverlay"; // не используется здесь — можно удалить импорт
import { buildBentRectPath, hasBends } from "./zonePath";
import { warpPointLocal } from "./zoneWarp";

import type { KonvaEventObject } from "konva/lib/Node";

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

  handleElementClick: (
    id: string,
    e: KonvaEventObject<MouseEvent | TouchEvent>
  ) => void;
  setGroupRef?: (node: Konva.Group | null) => void;
  isViewerMode?: boolean;
  isSelected?: boolean;
}

const seatRadius = 12;

const createRowWithSeats = (
  zoneId: string,
  rowIndex: number,
  cols: number,
  offsetX: number,
  offsetY: number,
  stepX: number,
  stepY: number
) => {
  const rowId = `row-${crypto.randomUUID()}`;
  const y = offsetY + rowIndex * stepY + stepY / 2;

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
    x: offsetX + c * stepX + seatRadius,
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
  isSelected: isSelectedProp,
}) => {
  const ROW_LABEL_W = 28; // ширина колонки, px
  const ROW_LABEL_GAP = 6; // зазор от зоны
  const rowLabelSide = zone.rowLabelSide ?? "left";
  const fontSizeRow = 14;

  // ✅ шаги зоны — ВНУТРИ компонента
  const stepX = zone.seatSpacingX ?? 30;
  const stepY = zone.seatSpacingY ?? 30;

  const zoneSeats = (seats ?? []).filter((s) => s.zoneId === zone.id);
  const zoneRows = (rows ?? []).filter((r) => r.zoneId === zone.id);
  const seatsWithoutRow = zoneSeats.filter((s) => !s.rowId);

  const groupRef = useRef<Konva.Group | null>(null);

  // если сверху пришёл флаг — используем его; иначе вычисляем по selectedIds
  const isSelected = isSelectedProp ?? selectedIds.includes(zone.id);

  const handleGroupRef = (node: Konva.Group | null) => {
    groupRef.current = node;
    setGroupRef?.(node);
  };

  const warpIf = (p: { x: number; y: number }) =>
    currentTool === "bend" ? warpPointLocal(p.x, p.y, zone) : p;

  const rowsRender = useMemo(
    () => zoneRows.map((r) => ({ ...r, ...warpIf({ x: r.x, y: r.y }) })),
    [zoneRows, zone, currentTool]
  );

  const seatsRender = useMemo(
    () => zoneSeats.map((s) => ({ ...s, ...warpIf({ x: s.x, y: s.y }) })),
    [zoneSeats, zone, currentTool]
  );

  const seatsWithoutRowRender = useMemo(
    () => seatsRender.filter((s) => !s.rowId),
    [seatsRender]
  );

  const handleZoneClick = (e: any) => {
    e.cancelBubble = true;

    if (currentTool === "add-seat") {
      const stage = e.target.getStage();
      const pointer = stage.getPointerPosition();
      if (!pointer || !groupRef.current) return;

      const transform = groupRef.current.getAbsoluteTransform().copy().invert();
      const { x: localX, y: localY } = transform.point(pointer);

      // ✅ вместо несуществующей seatSpacingY — используем stepY
      const parentRow = rows.find(
        (r) =>
          r.zoneId === zone.id &&
          localY >= r.y - stepY / 2 &&
          localY <= r.y + stepY / 2
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

      setState((prev) => ({
        ...prev,
        seats: [...prev.seats, newSeat],
      }));
      setSelectedIds([newSeat.id]);
      return;
    }

    if (currentTool === "add-row") {
      // определяем кол-во колонок в зоне (максимальный colIndex), fallback = 5
      const cols =
        zoneSeats.length > 0
          ? Math.max(...zoneSeats.map((s) => s.colIndex || 1))
          : 5;

      const newRowIndex = zoneRows.length;

      // выравниваем offsetX: берём x первого ряда (если есть), иначе центрируем в зоне
      const existingOffsetX =
        zoneRows.length > 0
          ? zoneRows[0].x
          : Math.max(0, (zone.width - cols * stepX) / 2);

      // новый ряд появляется под текущим «дном» зоны
      const localY = zone.height + stepY / 2;

      // ✅ передаём stepX/stepY в фабрику
      const { row: newRow, seats: newSeats } = createRowWithSeats(
        zone.id,
        newRowIndex,
        cols,
        existingOffsetX,
        0,
        stepX,
        stepY
      );

      const adjustedRow: Row = {
        ...newRow,
        y: localY,
        index: newRowIndex,
        label: `${newRowIndex + 1}`,
      };

      const adjustedSeats: Seat[] = newSeats.map((s) => ({
        ...s,
        y: localY,
      }));

      setState((prev) => ({
        ...prev,
        zones: prev.zones.map((z) =>
          z.id === zone.id ? { ...z, height: z.height + stepY } : z
        ),
        rows: [...prev.rows, adjustedRow],
        seats: [...prev.seats, ...adjustedSeats],
      }));
      return;
    }

    // обычное выделение
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
      zones: prev.zones.map((z) =>
        z.id === zone.id ? { ...z, x: newX, y: newY } : z
      ),
    }));
  };

  const onSeatDragEnd = (seatAfterDrag: Seat) => {
    setState((prev) => {
      const z = prev.zones.find((zz) => zz.id === zone.id);
      if (!z) return prev;
      return applySeatDrop(
        prev,
        z,
        seatAfterDrag.id,
        seatAfterDrag.x,
        seatAfterDrag.y,
        seatRadius,
        false
      );
    });
  };

  const strokeColor =
    isSelected
      ? "#3B82F6"
      : hoveredZoneId === zone.id && currentTool === "add-row"
      ? "orange"
      : "#CBD5E1";

  const strokeWidth = isSelected || hoveredZoneId === zone.id ? 2 : 1;

  const bendPath =
    hasBends(zone) || currentTool === "bend"
      ? buildBentRectPath(
          zone.width,
          zone.height,
          zone.bendTop ?? 0,
          zone.bendRight ?? 0,
          zone.bendBottom ?? 0,
          zone.bendLeft ?? 0
        )
      : null;

  return (
    <Group
      ref={handleGroupRef}
      x={zone.x}
      y={zone.y}
      rotation={zone.rotation ?? 0}
      onMouseEnter={() => setHoveredZoneId(zone.id)}
      onMouseLeave={() => setHoveredZoneId(null)}
      draggable={currentTool === "select" && isSelected && !isViewerMode}
      onClick={handleZoneClickLocal}
      onDragEnd={handleZoneDragEnd}
    >
      {bendPath ? (
        <Path
          data={bendPath}
          fill={zone.fill}
          fillEnabled={!zone.transparent}
          fillOpacity={zone.transparent ? 0 : zone.fillOpacity ?? 1}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          hitStrokeWidth={12}
          strokeScaleEnabled={false}
        />
      ) : (
        <Rect
          width={zone.width}
          height={zone.height}
          fill={zone.fill}
          fillEnabled={!zone.transparent}
          fillOpacity={zone.transparent ? 0 : zone.fillOpacity ?? 1}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          hitStrokeWidth={12}
          strokeScaleEnabled={false}
        />
      )}

      <Text
        text={zone.label}
        x={zone.width / 2}
        y={-18}
        fontSize={14}
        fill="black"
        align="center"
        offsetX={(zone.label.length * 7) / 2}
      />

      {/* НОВОЕ: колонка номеров рядов */}
      {rowsRender.length > 0 && (
        <Group
          x={
            rowLabelSide === "left"
              ? -ROW_LABEL_W - ROW_LABEL_GAP
              : zone.width + ROW_LABEL_GAP
          }
          y={0}
          listening={currentTool === "select" && !isViewerMode}
        >
          {/* фон колонки */}
          <Rect
            x={0}
            y={0}
            width={ROW_LABEL_W}
            height={zone.height}
            fill="#ffffff"
            stroke="#CBD5E1"
            strokeWidth={1}
          />

          {/* сами ярлыки рядов — берём label из row */}
          {rowsRender
            .slice() // если потребуется сортировка по y
            .sort((a, b) => a.y - b.y)
            .map((r) => (
              <Text
                key={`row-label-${r.id}`}
                x={0}
                width={ROW_LABEL_W}
                y={Math.round(r.y - fontSizeRow / 2)}
                height={fontSizeRow}
                text={String(r.label ?? "")}
                align="center"
                fontSize={fontSizeRow}
                fill="#0f172a"
                listening
                onClick={(e) => handleElementClick(r.id, e)}
              />
            ))}
        </Group>
      )}

      {seatsWithoutRowRender.map((seat) => (
        <SeatComponent
          key={seat.id}
          seat={seat}
          isSelected={selectedIds.includes(seat.id)}
          onClick={handleElementClick}
          isViewerMode={isViewerMode || currentTool === "bend"} // во время Bend — запрет на drag
          onDragEnd={(_e, s) => onSeatDragEnd(s)}
        />
      ))}

      {rowsRender.map((row) => (
        <RowComponent
          key={row.id}
          row={row}
          rowSeats={seatsRender.filter((s) => s.rowId === row.id)}
          selectedIds={selectedIds}
          setState={setState}
          handleElementClick={handleElementClick}
          currentTool={currentTool}
          isViewerMode={isViewerMode || currentTool === "bend"}
          onSeatDragEnd={onSeatDragEnd}
        />
      ))}
    </Group>
  );
};

export default ZoneComponent;
