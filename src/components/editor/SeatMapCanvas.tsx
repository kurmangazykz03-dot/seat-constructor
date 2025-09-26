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

  // 🔹 Ссылка на Stage
  const stageRef = useRef<any>(null);

  const handleStageMouseDown = (e: any) => {
  const stage = e.target.getStage();

  // 👉 Если select tool и клик по пустому месту → снять выделение
  if (currentTool === "select" && e.target === stage) {
    setSelectedId(null);
    return;
  }

  // 👉 Добавление зоны
  if (currentTool === "add-zone" && e.target === stage) {
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const newZone: Zone = {
      id: `zone-${Date.now()}`,
      x: pointer.x,
      y: pointer.y,
      width: 0,
      height: 0,
      fill: "rgba(0, 128, 255, 0.2)",
      label: `Zone ${zones.length + 1}`,
    };

    setDrawingZone(newZone);
    return;
  }

  // 👉 Добавление места
  if (currentTool === "add-seat" && e.target === stage) {
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const newSeat: Seat = {
      id: `seat-${Date.now()}`,
      x: pointer.x,
      y: pointer.y,
      radius: 16,
      fill: "#33DEF1",
      label: `A${seats.length + 1}`,
      category: "standard",
      status: "available",
    };

    setSeats((prev) => [...prev, newSeat]);
    setSelectedId(newSeat.id);
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
    if (drawingZone) {
      setZones((prev) => [...prev, drawingZone]);
      setDrawingZone(null);
    }
  };

  const handleDragMove = (id: string, x: number, y: number) => {
    setSeats((prev) =>
      prev.map((seat) => (seat.id === id ? { ...seat, x, y } : seat))
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
            <Rect
              key={zone.id}
              x={zone.x}
              y={zone.y}
              width={zone.width}
              height={zone.height}
              fill={zone.fill}
              stroke={selectedId === zone.id ? "blue" : "black"}
              strokeWidth={selectedId === zone.id ? 2 : 1}
              onClick={() => setSelectedId(zone.id)}
              draggable
            />
          ))}

          {/* Preview while drawing */}
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
                x={seat.x - 8}
                y={seat.y + 20}
                fontSize={12}
                fill="black"
              />
            </React.Fragment>
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

export default SeatmapCanvas;
