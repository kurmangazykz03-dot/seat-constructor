// src/components/viewer/SeatmapViewerCanvas.tsx
import React, { useMemo, useRef, useState } from "react";

import { SeatmapState } from "../../pages/EditorPage";
import BackgroundImageLayer from "../seatmap/BackgroundImageLayer";
import ZoneComponent from "../seatmap/ZoneComponent";
import ZoomControls from "../seatmap/ZoomControls";

import { Layer, Stage, Image as KonvaImage } from "react-konva";
import useImage from 'use-image'

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

const [img] = useImage(state.backgroundImage || "", "anonymous");
  // Подготавливаем selectedIds: в viewer выделяем только кресло
  const selectedIds = useMemo(() => (selectedSeatId ? [selectedSeatId] : []), [selectedSeatId]);

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
          const clickedOnEmpty = e.target === e.target.getStage();
          if (clickedOnEmpty) onSeatSelect(null);
        }}
      >
      {state.backgroundImage && state.backgroundRect ? (
  <Layer listening={false}>
    {img && (
      <KonvaImage
        image={img}
        x={state.backgroundRect.x}
        y={state.backgroundRect.y}
        width={state.backgroundRect.width}
        height={state.backgroundRect.height}
        opacity={0.95}
        listening={false}
      />
    )}
  </Layer>
) : state.backgroundImage ? (
  <BackgroundImageLayer
    dataUrl={state.backgroundImage}
    canvasW={width}
    canvasH={height}
    fit={state.backgroundFit ?? 'contain'}
    /* scale убран, если не используешь */
    opacity={0.95}
  />
) : null}


        <Layer listening>
          {state.zones.map((zone) => (
            <ZoneComponent
              key={zone.id}
              zone={zone}
              seats={state.seats}
              rows={state.rows}
              setState={() => {
                /* viewer readonly */
              }}
              selectedIds={selectedIds}
              setSelectedIds={() => {
                /* viewer: noop */
              }}
              currentTool="select"
              handleElementClick={(_id: string) => handleElementClick(_id)}
              hoveredZoneId={null}
              setHoveredZoneId={() => {}}
              isViewerMode={true}
              isSelected={false}
            />
          ))}
        </Layer>
      </Stage>

         <div className="fixed top-4 left-0 z-50 pointer-events-none">
    <div className="pointer-events-auto">
      <ZoomControls scale={scale} setScale={handleSetScale} />
    </div>
  </div>


    </div>
  );
};

export default SeatmapViewerCanvas;
