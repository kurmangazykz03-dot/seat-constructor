import React, { useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import ZoneComponent from "../seatmap/ZoneComponent";
import ZoomControls from "../seatmap/ZoomControls";
import { SeatmapState } from "../../pages/EditorPage";

interface ViewerCanvasProps {
  state: SeatmapState;
  onSeatSelect: (seat: any) => void;
  selectedSeatId: string | null;
  width: number;
  height: number;
}

const SeatmapViewerCanvas: React.FC<ViewerCanvasProps> = ({
  state,
  onSeatSelect,
  selectedSeatId,
  width,
  height,
}) => {
  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Центрированный зум
  const handleSetScale = (newScale: number) => {
    const containerCenter = { x: width / 2, y: height / 2 };
    const stageCenter = {
      x: (containerCenter.x - position.x) / scale,
      y: (containerCenter.y - position.y) / scale,
    };
    const newPos = {
      x: containerCenter.x - stageCenter.x * newScale,
      y: containerCenter.y - stageCenter.y * newScale,
    };
    setScale(newScale);
    setPosition(newPos);
  };

  const handleElementClick = (id: string) => {
    const seat = state.seats.find((s) => s.id === id);
    if (seat) onSeatSelect(seat);
  };

  return (
    <div className="rounded-[16px] border border-[#e5e5e5] bg-white">
      <Stage
  width={width - 4}
  height={height - 4}
  draggable
  scaleX={scale}
  scaleY={scale}
  x={position.x}
  y={position.y}
  ref={stageRef}
  onMouseDown={(e) => {
    // Если кликнули по пустому месту (не по группе/сиду)
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      onSeatSelect(null); // снимаем выделение
    }
  }}
>
        <Layer>
          {state.zones.map((zone) => (
            <ZoneComponent
              key={zone.id}
              zone={zone}
              seats={state.seats}
              rows={state.rows}
              setState={() => {}}
              selectedIds={selectedSeatId ? [selectedSeatId] : []}
              setSelectedIds={() => {}}
              currentTool="select"
              handleElementClick={handleElementClick}
              hoveredZoneId={null}
              setHoveredZoneId={() => {}}
              isViewerMode={true}
            />
          ))}
        </Layer>
      </Stage>

      {/* Кнопки зума */}
       <div className="absolute top-[-80px] left-[-100px] z-50">
    <ZoomControls scale={scale} setScale={handleSetScale} />
  </div>
    </div>
  );
};

export default SeatmapViewerCanvas;