// src/components/viewer/SeatmapViewerCanvas.tsx
import React, { useRef, useState, useMemo } from "react";
import { Stage, Layer } from "react-konva";
import ZoneComponent from "../seatmap/ZoneComponent";
import ZoomControls from "../seatmap/ZoomControls";
import { SeatmapState } from "../../pages/EditorPage";
import BackgroundImageLayer from '../seatmap/BackgroundImageLayer'


interface ViewerCanvasProps {
  state: SeatmapState;
  onSeatSelect: (seat: any | null) => void;
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

  // ⚙️ принимаем (id, e?) — Zone/Seat/Row отдают (id, e)
  const handleElementClick = (id: string) => {
    const seat = state.seats.find((s) => s.id === id) || null;
    onSeatSelect(seat);
  };

  // Подготавливаем selectedIds: в viewer выделяем только кресло
  const selectedIds = useMemo(
    () => (selectedSeatId ? [selectedSeatId] : []),
    [selectedSeatId]
  );

  return (
    <div className="relative rounded-[16px] border border-[#e5e5e5] bg-white">
      <Stage
        width={width}
        height={height}
        draggable
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        ref={stageRef}
        onMouseDown={(e) => {
          // клик по пустому месту снимет выделение
          const clickedOnEmpty = e.target === e.target.getStage();
          if (clickedOnEmpty) onSeatSelect(null);
        }}
      >
        {/* Фон (если задали) — РЕНДЕРИМ НИЖЕ ВСЕГО */}
        {!!state.backgroundImage && (
          <BackgroundImageLayer
            dataUrl={state.backgroundImage}
            canvasW={width}
            canvasH={height}
            // «contain» — чтобы влезало целиком и не мешало сетке
            fit="contain"
            opacity={0.25}
          />
        )}

        {/* Основной слой */}
        <Layer listening>
          {state.zones.map((zone) => (
            <ZoneComponent
              key={zone.id}
              zone={zone}
              seats={state.seats}
              rows={state.rows}
              setState={() => { /* viewer readonly */ }}
              selectedIds={selectedIds}
              setSelectedIds={() => { /* viewer: noop */ }}
              currentTool="select"
              handleElementClick={(_id: string) => handleElementClick(_id)} // ⚙️
              hoveredZoneId={null}
              setHoveredZoneId={() => {}}
              isViewerMode={true}
              isSelected={false}
            />
          ))}
        </Layer>
      </Stage>

      {/* Кнопки зума — прижмём в правый-низ */}
      <div className="absolute right-3 bottom-3 z-10">
        <ZoomControls scale={scale} setScale={handleSetScale} />
      </div>
    </div>
  );
};

export default SeatmapViewerCanvas;
