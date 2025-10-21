import Konva from "konva";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Layer, Stage, Transformer,Image as KonvaImage } from "react-konva";
import { Row, Seat, Zone } from "../../types/types";
import DrawingZone from "../seatmap/DrawingZone";
import GridLayer from "../seatmap/GridLayer";
import { useKeyboardShortcuts } from "../seatmap/useKeyboardShortcuts";
import ZoneComponent from "../seatmap/ZoneComponent";
import ZoomControls from "../seatmap/ZoomControls";

import { SeatmapState } from "../../pages/EditorPage"; // Импортируем тип

function useHTMLImage(src: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.src = src;
    return () => { setImg(null); };
  }, [src]);
  return img;
}
interface SeatmapCanvasProps {
  seats: Seat[];
  rows: Row[];
  zones: Zone[];
  setState: (updater: (prevState: SeatmapState) => SeatmapState) => void;

  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  currentTool: "select" | "add-seat" | "add-row" | "add-zone" | "rotate";
  backgroundImage: string | null;
   // 🆕
   showGrid: boolean;                          // 🆕
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>; // 🆕
  onDuplicate: () => void;
}
// Константы, которые можно вынести в отдельный config файл
const SEAT_RADIUS = 12;
const SEAT_SPACING_X = 30;
const SEAT_SPACING_Y = 30;
const GRID_SIZE = 30;
const CANVAS_WIDTH = 1436;
const CANVAS_HEIGHT = 752;
function containRect(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
) {
  if (imgW === 0 || imgH === 0) {
    return { x: 0, y: 0, width: boxW, height: boxH };
  }
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  const x = (boxW - width) / 2;
  const y = (boxH - height) / 2;
  return { x, y, width, height };
}

function SeatmapCanvas({
  seats,
  rows,
  zones,
  setState,
  selectedIds,
  setSelectedIds,
  currentTool,
  backgroundImage,
  onDuplicate,
    showGrid,            
}: SeatmapCanvasProps) {
  const [drawingZone, setDrawingZone] = useState<Zone | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });


const bgImg = useHTMLImage(backgroundImage);
const fitted = bgImg
  ? containRect(bgImg.width, bgImg.height, CANVAS_WIDTH, CANVAS_HEIGHT)
  : null;
  useKeyboardShortcuts({
    selectedIds,
    setSelectedIds,
    state: { seats, rows, zones }, 
    setState,
    onDuplicate
  });
  const handleSetScale = (newScale: number) => {
    if (!stageRef.current) return;
    const containerCenter = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
    };
    const stageCenter = {
      x: (containerCenter.x - stagePos.x) / scale,
      y: (containerCenter.y - stagePos.y) / scale,
    };
    const newPos = {
      x: containerCenter.x - stageCenter.x * newScale,
      y: containerCenter.y - stageCenter.y * newScale,
    };

    setScale(newScale);
    setStagePos(newPos);
  };

  const createRowWithSeats = (
      zoneId: string,
  rowIndex: number,
  cols: number,
  offsetX: number,
  offsetY: number
  ) => {
    const rowId = `row-${crypto.randomUUID()}`;
    const y = offsetY + rowIndex * SEAT_SPACING_Y + SEAT_SPACING_Y / 2;
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
      x: offsetX + c * SEAT_SPACING_X + SEAT_RADIUS,
      y,
      radius: SEAT_RADIUS,
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

  const handleStageMouseDown = (e: any) => {
    if (currentTool === "select" && e.target === e.target.getStage()) {
      setSelectedIds([]);
    }
    if (currentTool === "add-zone" && e.target === e.target.getStage()) {
      const stage = e.target.getStage();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const transform = stage.getAbsoluteTransform().copy().invert();
      const realPos = transform.point(pointer);

      const snappedX = Math.round(realPos.x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(realPos.y / GRID_SIZE) * GRID_SIZE;

      const newZone: Zone = {
        id: "zone-temp",
        x: snappedX,
        y: snappedY,
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
    if (!pointer || !drawingZone) return;

    const transform = stage.getAbsoluteTransform().copy().invert();
    const realPos = transform.point(pointer);

    const snappedX = Math.round(realPos.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(realPos.y / GRID_SIZE) * GRID_SIZE;

    setDrawingZone((prev) =>
      prev
        ? {
            ...prev,
            width: snappedX - prev.x,
            height: snappedY - prev.y,
          }
        : null
    );
  };

  const handleStageMouseUp = () => {
    if (!drawingZone) return;

    const startX = drawingZone.width < 0 ? drawingZone.x + drawingZone.width : drawingZone.x;
    const startY = drawingZone.height < 0 ? drawingZone.y + drawingZone.height : drawingZone.y;
    const width = Math.abs(drawingZone.width);
    const height = Math.abs(drawingZone.height);

    if (width < SEAT_SPACING_X || height < SEAT_SPACING_Y) {
      setDrawingZone(null);
      return;
    }

    const cols = Math.max(1, Math.floor(width / SEAT_SPACING_X));
    const rowsCount = Math.max(1, Math.floor(height / SEAT_SPACING_Y));

    const newZone: Zone = {
      id: `zone-${crypto.randomUUID()}`,
      x: startX,
      y: startY,
      width,
      height,
      fill: "#FAFAFA",
      label: `Zone ${zones.length + 1}`,
      rotation: 0, 
    };

    const offsetX = (width - cols * SEAT_SPACING_X) / 2;
    const offsetY = (height - rowsCount * SEAT_SPACING_Y) / 2;

    const allNewRows: Row[] = [];
    const allNewSeats: Seat[] = [];

    for (let r = 0; r < rowsCount; r++) {
      const { row, seats: rowSeats } = createRowWithSeats(newZone.id, r, cols, offsetX, offsetY);
      allNewRows.push(row);
      allNewSeats.push(...rowSeats);
    }

    setState((prevState) => ({
      ...prevState,
      zones: [...prevState.zones, newZone],
      rows: [...prevState.rows, ...allNewRows],
      seats: [...prevState.seats, ...allNewSeats],
    }));

    setDrawingZone(null);
  };

  const handleElementClick = (id: string, e: any) => {
    e.cancelBubble = true;
    if (e.evt.shiftKey) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    } else {
      setSelectedIds([id]);
    }
  };
  const zoneRefs = useRef<Record<string, Konva.Group | null>>({});

 

  return (
    <div className="rounded-[16px] border border-[#e5e5e5]">
      <Stage
        ref={stageRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        draggable={currentTool === "select"}
       
      >
         {bgImg && (
  <Layer listening={false}>
    <KonvaImage
      image={bgImg}
      x={fitted!.x}
      y={fitted!.y}
      width={fitted!.width}
      height={fitted!.height}
      opacity={0.95}          
    />
  </Layer>
)}


        <Layer>
          {zones.map((zone) => (
            <ZoneComponent
              key={zone.id}
              zone={zone}
              seats={seats}
              rows={rows}
              isSelected={selectedIds.includes(zone.id)}
              onClick={(e: any) => handleElementClick(zone.id, e)}
              setGroupRef={(node) => {
                zoneRefs.current[zone.id] = node;
              }}
              selectedIds={selectedIds}
              currentTool={currentTool}
              hoveredZoneId={hoveredZoneId}
              setState={setState}
              setSelectedIds={setSelectedIds}
              setHoveredZoneId={setHoveredZoneId}
              handleElementClick={handleElementClick}
              isViewerMode={false}
            />
          ))}

          {currentTool === "rotate" &&
            selectedIds.length === 1 &&
            (() => {
              const selectedId = selectedIds[0];
              const node = zoneRefs.current[selectedId];
              if (!node) return null;

              return (
                <Transformer
                  nodes={[node]}
                  rotateEnabled={true}
                  enabledAnchors={[]} 
                  onTransformEnd={() => {
                    const rotation = node.rotation();
                    setState((prev) => ({
                      ...prev,
                      zones: prev.zones.map((z) => (z.id === selectedId ? { ...z, rotation } : z)),
                    }));
                  }}
                />
              );
            })()}

          <DrawingZone
            drawingZone={drawingZone}
            seatSpacingX={SEAT_SPACING_X}
            seatSpacingY={SEAT_SPACING_Y}
          />
        </Layer>
         <GridLayer
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          gridSize={GRID_SIZE}
          showGrid={showGrid}
          scale={scale}
          stagePos={stagePos}
        />
      </Stage>
      <ZoomControls scale={scale} setScale={handleSetScale} />
    </div>
  );
}

export default SeatmapCanvas;
