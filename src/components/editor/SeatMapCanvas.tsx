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
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  currentTool: "select" | "add-seat" | "add-row" | "add-zone";
}

function SeatmapCanvas({
  seats,
  setSeats,
  rows,
  setRows,
  zones,
  setZones,
  selectedId,
  setSelectedId,
  currentTool,
}: SeatmapCanvasProps) {
  const [drawingZone, setDrawingZone] = useState<Zone | null>(null);
  const stageRef = useRef<any>(null);

  const seatRadius = 12;
  const seatSpacingX = 30;
  const seatSpacingY = 30;

  const handleStageMouseDown = (e: any) => {
    const stage = e.target.getStage();

    // --- одиночное место ---
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

      setSeats((prev) => [...prev, newSeat]);
      setSelectedId(newSeat.id);
      return;
    }

    // --- начало зоны или ряда ---
    if ((currentTool === "add-zone" || currentTool === "add-row") && e.target === stage) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const newZone: Zone = {
        id: "zone-temp",
        x: pointer.x,
        y: pointer.y,
        width: 0,
        height: 0,
        fill: "#FAFAFA",
        label: currentTool === "add-zone" ? `Zone ${zones.length + 1}` : "Row block",
      };

      setDrawingZone(newZone);
      return;
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

    // --- add-row ---
    if (currentTool === "add-row") {
 if (width < seatSpacingX || height < seatSpacingY) {
    setDrawingZone(null);
    return; // слишком маленькая зона — не создаем row
  }

  const cols = Math.max(1, Math.floor(width / seatSpacingX));
  const rowsCount = Math.max(1, Math.floor(height / seatSpacingY));

  const newZone: Zone = {
    id: `zone-${Date.now()}`,
    x: startX,
    y: startY,
    width: width ,
    height: height ,
    fill: "#FAFAFA",
    label: `Zone ${zones.length + 1}`,
  };

  setZones((prev) => [...prev, newZone]);

      const newRows: Row[] = [];
      const newSeats: Seat[] = [];
      let seatCounter = 0;

      for (let r = 0; r < rowsCount; r++) {
        const rowId = `row-${Date.now()}-${r}`;
        newRows.push({
          id: rowId,
          zoneId: newZone.id,
          index: r,
          label: `Row ${r+1}`,
          x: 0,
          y: r * seatSpacingY + 20,
        });

        for (let c = 0; c < cols; c++) {
          newSeats.push({
            id: `seat-${Date.now()}-${seatCounter++}`,
            x: c * seatSpacingX + seatRadius,
            y: r * seatSpacingY + seatRadius,
            radius: seatRadius,
            fill: "#33DEF1",
            label: `${c + 1}`,
            category: "standard",
            status: "available",
            zoneId: newZone.id,
            rowId,
            colIndex: c + 1,
          });
        }
      }

      setRows((prev) => [...prev, ...newRows]);
      setSeats((prev) => [...prev, ...newSeats]);
    }

    // --- add-zone ---
    if (currentTool === "add-zone") {
      if (width > 5 && height > 5) {
        const newZone: Zone = {
          ...drawingZone,
          id: `zone-${Date.now()}`,
          width,
          height,
        };
        setZones((prev) => [...prev, newZone]);
      }
    }

    setDrawingZone(null);
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
          {/* Zones */}
          {zones.map((zone) => {
            const zoneSeats = seats.filter((s) => s.zoneId === zone.id);
            const zoneRows = rows.filter((r) => r.zoneId === zone.id);

            return (
              <Group
                key={zone.id}
                x={zone.x}
                y={zone.y}
                draggable
                dragBoundFunc={(pos) => {
                  const stage = stageRef.current;
                  if (!stage) return pos;
                  return {
                    x: Math.max(0, Math.min(pos.x, stage.width() - zone.width)),
                    y: Math.max(0, Math.min(pos.y, stage.height() - zone.height)),
                  };
                }}
                onClick={() => setSelectedId(zone.id)}
              >
                {/* сама зона */}
                <Rect
                  x={0}
                  y={0}
                  width={zone.width}
                  height={zone.height}
                  fill={zone.fill}

                  strokeWidth={1}
                  fillOpacity={0.2}
                />

                {/* подпись зоны */}
                <Rect
                  x={0}
                  y={-20}
                  width={zone.label.length * 8 + 10}
                  height={18}
                  fill="white"
                  opacity={0.7}
                  cornerRadius={4}
                />
                <Text text={zone.label} x={80} y={-18} fontSize={14} fill="black" />

                {/* ряды зоны */}
                {zoneRows.map((row) => {
                  const rowSeats = zoneSeats.filter((s) => s.rowId === row.id);
                  return (
                    <Group
                      key={row.id}
                      x={row.x}
                      y={row.y}
                      draggable
                      dragBoundFunc={(pos) => {
                        const stage = stageRef.current;
                        if (!stage) return pos;
                        return {
                          x: Math.max(0, Math.min(pos.x, stage.width() - 200)),
                          y: Math.max(0, Math.min(pos.y, stage.height() - 40)),
                        };
                      }}
                      onClick={() => setSelectedId(row.id)}
                      onDragEnd={(e) => {
                        const newX = e.target.x();
                        const newY = e.target.y();
                        setRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, x: newX, y: newY } : r))
                        );
                      }}
                    >
                      {/* подпись ряда */}
                      {/* подпись ряда */}
<Rect
  x={-50} // чуть левее
  y={-8} // чуть выше
  width={row.label.length * 8 + 12} // ширина под длину текста
  height={20} // высота фона
  fill="white"
  opacity={0.7}
  cornerRadius={4}
/>
<Text
  text={row.label}
  x={-46
  } // чуть сдвинуто вправо, чтобы текст был внутри Rect
  y={-10} // чуть ниже Rect, чтобы текст не был срезан
  fontSize={14}
  fill={selectedId === row.id ? "blue" : "black"}
/>
                      {/* сиденья ряда */}
                      {rowSeats.map((seat, i) => (
                        <React.Fragment key={seat.id}>
                          <Circle
                            x={i * seatSpacingX + seatRadius}
                            y={0}
                            radius={seat.radius}
                            fill={seat.fill}
                            stroke={selectedId === seat.id ? "blue" : ""}
                            strokeWidth={selectedId === seat.id ? 2 : 0}
                            onClick={() => setSelectedId(seat.id)}
                          />
                          <Text
                            text={seat.label}
                            x={i * seatSpacingX + seatRadius}
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

          {/* Preview */}
          {drawingZone && (
            <Rect
              x={drawingZone.x}
              y={drawingZone.y}
              width={drawingZone.width}
              height={drawingZone.height}
              fill={drawingZone.fill}
              stroke="blue"
              dash={[4, 4]}
            />
          )}

          {/* Одиночные сиденья вне зон */}
          {seats
            .filter((s) => !s.zoneId)
            .map((seat) => {
              const isSelectedSeat = selectedId === seat.id;
              return (
                <React.Fragment key={seat.id}>
                  <Circle
                    x={seat.x}
                    y={seat.y}
                    radius={seat.radius}
                    fill={seat.fill}
                    stroke={isSelectedSeat ? "blue" : ""}
                    strokeWidth={isSelectedSeat ? 2 : 0}
                    onClick={() => setSelectedId(seat.id)}
                    draggable
                  />
                  <Text
                    text={seat.label}
                    x={seat.x}
                    y={seat.y}
                    fontSize={12}
                    fill="white"
                    align="center"
                    verticalAlign="middle"
                    offsetX={seat.label.length * 3}
                    offsetY={6}
                    listening={false}
                  />
                </React.Fragment>
              );
            })}
        </Layer>
      </Stage>
    </div>
  );
}

export default SeatmapCanvas;
