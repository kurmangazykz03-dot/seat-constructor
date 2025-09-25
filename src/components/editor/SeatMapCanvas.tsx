import { Dispatch, SetStateAction, useState } from "react";
import { Circle, Layer, Stage } from "react-konva";

interface Seat {
  id: string;
  x: number;
  y: number;
  fill: string;
  radius: number;
}
interface SeatmapCanvasProps {
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
}

function SeatmapCanvas({ selectedId, setSelectedId }: SeatmapCanvasProps) {
  const [seats, setSeats] = useState<Seat[]>([
    { id: "seat-1", x: 100, y: 100, radius: 16, fill: "#33DEF1" },
    { id: "seat-2", x: 200, y: 150, radius: 16, fill: "#33def1" },
  ]);

  const handleDragMove = (id: string, x: number, y: number) => {
    setSeats((prev) => prev.map((seat) => (seat.id === id ? { ...seat, x, y } : seat)));
  };
  return (
    <div className=" rounded-[16px] drop-shadow-[0_0_2px_rgba(0,0,0,0.1)] border border-[#e5e5e5]  ">
      <Stage width={990} height={750}>
        <Layer>
          {seats.map((seat) => (
            <Circle
              key={seat.id}
              x={seat.x}
              y={seat.y}
              radius={seat.radius}
              fill={seat.fill}
              stroke={selectedId === seat.id ? "blue" : ""}
              strokeWidth={selectedId === seat.id ? 2 : 0}
              onClick={() => setSelectedId(seat.id)}
              onDragMove={(e) => handleDragMove(seat.id, e.target.x(), e.target.y())}
              draggable
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

export default SeatmapCanvas;
