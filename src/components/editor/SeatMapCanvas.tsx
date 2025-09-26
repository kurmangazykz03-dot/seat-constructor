import { Dispatch, SetStateAction, useState, useRef } from "react";
import { Circle, Layer, Stage, Text, Rect } from "react-konva";
import React from "react";
import { Seat, Zone } from "../../pages/EditorPage";

interface SeatmapCanvasProps {
  seats: Seat[];
  setSeats: Dispatch<SetStateAction<Seat[]>>;
  zones: Zone[];
  setZones: Dispatch<SetStateAction<Zone[]>>;
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  currentTool: "select" | "add-seat" | "add-row" | "add-zone";
}

function SeatmapCanvas({
  seats,
  setSeats,
  zones,
  setZones,
  selectedId,
  setSelectedId,
  currentTool,
}: SeatmapCanvasProps) {
  const [drawingZone, setDrawingZone] = useState<Zone | null>(null);

  const stageRef = useRef<any>(null);

  const seatRadius = 12;
  const seatSpacingX = 30; // ширина ячейки
  const seatSpacingY = 30; // высота ячейки

 // генерация номеров мест
const getNextSeatLabel = (existingSeats: Seat[]) => {
  const seatNumbers = existingSeats
    .map((s) => parseInt(s.label))
    .filter((n) => !isNaN(n));

  const nextNumber =
    seatNumbers.length > 0 ? Math.max(...seatNumbers) + 1 : 1;
  return `${nextNumber}`; // только цифры
};


  const handleStageMouseDown = (e: any) => {
    const stage = e.target.getStage();

    // Добавление одного сиденья
    if (currentTool === "add-seat" && e.target === stage) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const newSeat: Seat = {
        id: `seat-${Date.now()}`,
        x: pointer.x,
        y: pointer.y,
        radius: 16,
        fill: "#33DEF1",
        label: getNextSeatLabel(seats),
        category: "standard",
        status: "available",
      };

      setSeats((prev) => [...prev, newSeat]);
      setSelectedId(newSeat.id);
      return;
    }

    // Снятие выделения
    if (currentTool === "select" && e.target === stage) {
      setSelectedId(null);
      return;
    }

    // Добавление зоны
    if (
      (currentTool === "add-zone" || currentTool === "add-row") &&
      e.target === stage
    ) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const newZone: Zone = {
        id: `zone-${Date.now()}`,
        x: pointer.x,
        y: pointer.y,
        width: 0,
        height: 0,
        fill: "rgba(0, 128, 255, 0.2)",
        label:
          currentTool === "add-zone"
            ? `Zone ${zones.length + 1}`
            : "Row x Col",
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

    // --- Если инструмент = add-row ---
    if (currentTool === "add-row") {
      const cols = Math.max(
        1,
        Math.floor(Math.abs(drawingZone.width) / seatSpacingX)
      );
      const rows = Math.max(
        1,
        Math.floor(Math.abs(drawingZone.height) / seatSpacingY)
      );

      const startX = drawingZone.width < 0 ? drawingZone.x + drawingZone.width : drawingZone.x;
      const startY = drawingZone.height < 0 ? drawingZone.y + drawingZone.height : drawingZone.y;

      const newSeats: Seat[] = [];
      let counter = 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const label = getNextSeatLabel([...seats, ...newSeats]);
          newSeats.push({
            id: `seat-${Date.now()}-${counter++}`,
            x: startX + c * seatSpacingX + seatRadius,
            y: startY + r * seatSpacingY + seatRadius,
            radius: seatRadius,
            fill: "#33DEF1",
            label,
            category: "standard",
            status: "available",
          });
        }
      }

      setSeats((prev) => [...prev, ...newSeats]);
      setDrawingZone(null);
      return;
    }

    // --- Если инструмент = add-zone ---
    if (currentTool === "add-zone") {
      if (
        Math.abs(drawingZone.width) > 5 &&
        Math.abs(drawingZone.height) > 5
      ) {
        setZones((prev) => [...prev, drawingZone]);
      }
      setDrawingZone(null);
    }
  };

  const handleDragMove = (id: string, x: number, y: number) => {
    setSeats((prev) =>
      prev.map((seat) => (seat.id === id ? { ...seat, x, y } : seat))
    );
  };

  const handleZoneDragMove = (id: string, x: number, y: number) => {
    setZones((prev) =>
      prev.map((zone) => (zone.id === id ? { ...zone, x, y } : zone))
    );
  };

  return (
    <div className="rounded-[16px] border border-[#e5e5e5] drop-shadow-[0_0_2px_rgba(0,0,0,0.1)]">
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
          {zones.map((zone) => (
            <React.Fragment key={zone.id}>
              <Rect
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                fill={zone.fill}
                stroke={selectedId === zone.id ? "blue" : "black"}
                strokeWidth={selectedId === zone.id ? 2 : 1}
                onClick={() => setSelectedId(zone.id)}
                onDragMove={(e) =>
                  handleZoneDragMove(zone.id, e.target.x(), e.target.y())
                }
                draggable
              />
              <Text
                text={zone.label}
                x={zone.x + 4}
                y={zone.y + 4}
                fontSize={14}
                fill="black"
              />
            </React.Fragment>
          ))}

          {/* Preview while drawing */}
          {drawingZone && (
            <>
              <Rect
                x={drawingZone.x}
                y={drawingZone.y}
                width={drawingZone.width}
                height={drawingZone.height}
                fill={drawingZone.fill}
                stroke="blue"
                dash={[4, 4]}
              />
              {currentTool === "add-row" && (
                <Text
                  text={`${Math.max(
                    1,
                    Math.floor(Math.abs(drawingZone.height) / seatSpacingY)
                  )} × ${Math.max(
                    1,
                    Math.floor(Math.abs(drawingZone.width) / seatSpacingX)
                  )}`}
                  x={
                    drawingZone.x +
                    drawingZone.width / 2 -
                    20
                  }
                  y={
                    drawingZone.y +
                    drawingZone.height / 2 -
                    10
                  }
                  fontSize={16}
                  fill="black"
                />
              )}
            </>
          )}

          {/* Seats */}
          {seats.map((seat) => (
  <React.Fragment key={seat.id}>
    <Circle
      x={seat.x}
      y={seat.y}
      radius={seat.radius}
      fill={seat.fill}
      stroke={selectedId === seat.id ? "blue" : ""}
      strokeWidth={selectedId === seat.id ? 2 : 0}
      onClick={() => setSelectedId(seat.id)}
      onDragMove={(e) =>
        handleDragMove(seat.id, e.target.x(), e.target.y())
      }
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
      offsetX={seat.label.length * 3} // центрируем текст
      offsetY={6}
      listening={false}   // 👈 вот это ключ
    />
  </React.Fragment>
))}

        </Layer>
      </Stage>
    </div>
  );
}

export default SeatmapCanvas; 