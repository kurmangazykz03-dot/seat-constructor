import React, { Dispatch, SetStateAction, useRef, useState } from "react";
import { Circle, Group, Layer, Rect, Stage, Text } from "react-konva";
import { Row, Seat, Zone } from "../../pages/EditorPage";

interface SeatmapCanvasProps {
  seats: Seat[];
  setSeats: Dispatch<SetStateAction<Seat[]>>;
  rows: Row[];
  setRows: Dispatch<SetStateAction<Row[]>>;
  zones: Zone[];
  setZones: Dispatch<SetStateAction<Zone[]>>;
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  currentTool: "select" | "add-seat" | "add-row" | "add-zone";
}

function SeatmapCanvas({
  seats,
  setSeats,
  rows,
  setRows,
  zones,
  setZones,
  selectedIds,
  setSelectedIds,
  currentTool,
}: SeatmapCanvasProps) {
  const [drawingZone, setDrawingZone] = useState<Zone | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const stageRef = useRef<any>(null);

  const seatRadius = 12;
  const seatSpacingX = 30;
  const seatSpacingY = 30;

  // Создание ряда с сиденьями
  const createRowWithSeats = (zoneId: string, rowIndex: number, cols: number, offsetX: number, offsetY: number) => {
    const rowId = `row-${Date.now()}-${rowIndex}`;
    const row: Row = {
      id: rowId,
      zoneId,
      index: rowIndex,
      label: `${rowIndex + 1}`,
      x: 0,
      y: offsetY + rowIndex * seatSpacingY + seatSpacingY / 2,
    };

    const newSeats: Seat[] = [];
    for (let c = 0; c < cols; c++) {
      newSeats.push({
        id: `seat-${Date.now()}-${c}`,
        x: offsetX + c * seatSpacingX + seatRadius,
        y: row.y,
        radius: seatRadius,
        fill: "#33DEF1",
        label: `${c + 1}`,
        category: "standard",
        status: "available",
        zoneId,
        rowId,
        colIndex: c + 1,
      });
    }
    return { row, seats: newSeats };
  };

  const handleStageMouseDown = (e: any) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (currentTool === "select" && e.target === stage) {
      setSelectedIds([]);
    }

    if (currentTool === "add-seat" && e.target === stage) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const newSeat: Seat = {
        id: `seat-${Date.now()}`,
        x: pointer.x,
        y: pointer.y,
        radius: seatRadius,
        fill: "#33DEF1",
        label: `S${seats.length + 1}`,
        category: "standard",
        status: "available",
      };
      setSeats(prev => [...prev, newSeat]);
      setSelectedIds([newSeat.id]);
      return;
    }

    if (currentTool === "add-zone" && e.target === stage) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const newZone: Zone = {
        id: "zone-temp",
        x: pointer.x,
        y: pointer.y,
        width: 0,
        height: 0,
        fill: "#FAFAFA",
        label: `Zone ${zones.length + 1}`,
      };
      setDrawingZone(newZone);
    }
  };

  const handleStageMouseMove = (e: any) => {
    if (!drawingZone) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    setDrawingZone({
      ...drawingZone,
      width: pointer.x - drawingZone.x,
      height: pointer.y - drawingZone.y,
    });
  };

  const handleStageMouseUp = () => {
    if (!drawingZone) return;

    const startX = drawingZone.width < 0 ? drawingZone.x + drawingZone.width : drawingZone.x;
    const startY = drawingZone.height < 0 ? drawingZone.y + drawingZone.height : drawingZone.y;
    const width = Math.abs(drawingZone.width);
    const height = Math.abs(drawingZone.height);

    if (currentTool === "add-zone") {
      if (width < seatSpacingX || height < seatSpacingY) {
        setDrawingZone(null);
        return;
      }

      const cols = Math.max(1, Math.floor(width / seatSpacingX));
      const rowsCount = Math.max(1, Math.floor(height / seatSpacingY));

      const newZone: Zone = {
        id: `zone-${Date.now()}`,
        x: startX,
        y: startY,
        width,
        height,
        fill: "#FAFAFA",
        label: `Zone ${zones.length + 1}`,
      };
      setZones(prev => [...prev, newZone]);

      const newRows: Row[] = [];
      const newSeats: Seat[] = [];
      const totalSeatsWidth = cols * seatSpacingX;
      const totalSeatsHeight = rowsCount * seatSpacingY;
      const offsetX = (width - totalSeatsWidth) / 2;
      const offsetY = (height - totalSeatsHeight) / 2;

      for (let r = 0; r < rowsCount; r++) {
        const { row, seats: rowSeats } = createRowWithSeats(newZone.id, r, cols, offsetX, offsetY);
        newRows.push(row);
        newSeats.push(...rowSeats);
      }

      setRows(prev => [...prev, ...newRows]);
      setSeats(prev => [...prev, ...newSeats]);
    }

    setDrawingZone(null);
  };

const handleZoneClick = (zone: Zone, e: any) => {
  e.cancelBubble = true;

if (currentTool === "add-row") {
  const zoneRows = rows.filter(r => r.zoneId === zone.id);
  const zoneSeats = seats.filter(s => s.zoneId === zone.id);
  const cols = zoneSeats.length > 0 ? Math.max(...zoneSeats.map(s => s.colIndex || 1)) : 5;

  const newRowIndex = zoneRows.length;
  const totalRowsHeight = (newRowIndex + 1) * seatSpacingY;
  const newZoneHeight = Math.max(zone.height, totalRowsHeight);

  const offsetY = (newZoneHeight - totalRowsHeight) / 2;
  const totalSeatsWidth = cols * seatSpacingX;
  const offsetX = (zone.width - totalSeatsWidth) / 2;

  // Пересчитываем Y существующих рядов
  setRows(prev =>
    prev.map(r =>
      r.zoneId === zone.id
        ? { ...r, y: offsetY + r.index * seatSpacingY + seatSpacingY / 2 }
        : r
    )
  );

  // Пересчитываем Y и X существующих сидений
  setSeats(prev =>
    prev.map(s =>
      s.zoneId === zone.id
        ? {
            ...s,
            y: offsetY + (s.rowId ? zoneRows.find(r => r.id === s.rowId)?.index ?? 0 : 0) * seatSpacingY + seatSpacingY / 2,
            x: offsetX + ((s.colIndex ?? 1) - 1) * seatSpacingX + seatRadius,
          }
        : s
    )
  );

  // Создаём новый ряд
  const { row: newRow, seats: newSeats } = createRowWithSeats(zone.id, newRowIndex, cols, offsetX, offsetY);

  setZones(prev =>
    prev.map(z => z.id === zone.id ? { ...z, height: newZoneHeight } : z)
  );
  setRows(prev => [...prev, newRow]);
  setSeats(prev => [...prev, ...newSeats]);
  return;
}

  if (e.evt.shiftKey) {
    setSelectedIds(prev =>
      prev.includes(zone.id) ? prev.filter(i => i !== zone.id) : [...prev, zone.id]
    );
  } else {
    setSelectedIds([zone.id]);
  }
};


  const handleElementClick = (id: string, e: any) => {
    e.cancelBubble = true;
    if (e.evt.shiftKey) {
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  };

  return (
    <div className="rounded-[16px] border border-[#e5e5e5]">
      <Stage
        ref={stageRef}
        width={1420}
        height={750}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        <Layer>
          {zones.map(zone => {
            const zoneSeats = seats.filter(s => s.zoneId === zone.id);
            const zoneRows = rows.filter(r => r.zoneId === zone.id);

            return (
              <Group
                key={zone.id}
                x={zone.x}
                y={zone.y}
                draggable
                onClick={e => handleZoneClick(zone, e)}
                onMouseEnter={() => setHoveredZoneId(zone.id)}
                onMouseLeave={() => setHoveredZoneId(null)}
                dragBoundFunc={pos => {
                  const stage = stageRef.current;
                  if (!stage) return pos;
                  return {
                    x: Math.max(0, Math.min(pos.x, stage.width() - zone.width)),
                    y: Math.max(0, Math.min(pos.y, stage.height() - zone.height)),
                  };
                }}
              >
                <Rect
                  x={0}
                  y={0}
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

                {zoneRows.map(row => {
                  const rowSeats = zoneSeats.filter(s => s.rowId === row.id);
                  const isRowSelected = selectedIds.includes(row.id);

                  return (
                    <Group
                      key={row.id}
                      x={row.x}
                      y={row.y}
                      draggable
                      onClick={e => handleElementClick(row.id, e)}
                      onDragEnd={e => {
                        const newX = e.target.x();
                        const newY = e.target.y();
                        setRows(prev =>
                          prev.map(r => (r.id === row.id ? { ...r, x: newX, y: newY } : r))
                        );
                      }}
                    >
                      <Rect
                        x={-50}
                        y={-8}
                        width={row.label.length * 8 + 12}
                        height={20}
                        fill={isRowSelected ? "#D0E8FF" : "white"}
                        opacity={0.7}
                        cornerRadius={4}
                      />
                      <Text
                        text={row.label}
                        x={-46}
                        y={-10}
                        fontSize={14}
                        fill={isRowSelected ? "blue" : "black"}
                      />

                      {rowSeats.map((seat, i) => (
                        <React.Fragment key={seat.id}>
                          <Circle
                            x={seat.x}
                            y={0}
                            radius={seat.radius}
                            fill={seat.fill}
                            stroke={selectedIds.includes(seat.id) || isRowSelected ? "blue" : ""}
                            strokeWidth={selectedIds.includes(seat.id) || isRowSelected ? 2 : 0}
                            onClick={e => handleElementClick(seat.id, e)}
                          />
                          <Text
                            text={seat.label}
                            x={seat.x}
                            y={0}
                            fontSize={12}
                            fill="white"
                            align="center"
                            verticalAlign="middle"
                            offsetX={seat.label.length * 3}
                            offsetY={6}
                            listening={false}
                          />
                        </React.Fragment>
                      ))}
                    </Group>
                  );
                })}
              </Group>
            );
          })}

          {drawingZone && (
            <Group>
              <Rect
                x={drawingZone.x}
                y={drawingZone.y}
                width={drawingZone.width}
                height={drawingZone.height}
                fill={drawingZone.fill}
                stroke="blue"
                dash={[4, 4]}
                fillOpacity={0.1}
              />
              {currentTool === "add-zone" && (
                <Text
                  text={`${Math.max(1, Math.floor(Math.abs(drawingZone.height) / seatSpacingY))} × ${Math.max(
                    1,
                    Math.floor(Math.abs(drawingZone.width) / seatSpacingX)
                  )}`}
                  x={drawingZone.x + drawingZone.width / 2}
                  y={drawingZone.y - 20}
                  fontSize={14}
                  fill="blue"
                  align="center"
                  offsetX={20}
                />
              )}
            </Group>
          )}
        </Layer>
      </Stage>
    </div>
  );
}

export default SeatmapCanvas;
