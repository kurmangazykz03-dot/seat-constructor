import Konva from "konva";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

import { Row, Seat, Zone } from "../../types/types";
import DrawingZone from "../seatmap/DrawingZone";
import GridLayer from "../seatmap/GridLayer";
import { useKeyboardShortcuts } from "../seatmap/useKeyboardShortcuts";
import ZoneComponent from "../seatmap/ZoneComponent";
import ZoomControls from "../seatmap/ZoomControls";
import BackgroundImageLayer from "../seatmap/BackgroundImageLayer";
import { Image as KonvaImage, Layer, Stage, Transformer, Rect } from "react-konva";


import { SeatmapState } from "../../pages/EditorPage"; // Импортируем тип

function useHTMLImage(src: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.src = src;
    return () => {
      setImg(null);
    };
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
  showGrid: boolean; // 🆕
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>; // 🆕
  onDuplicate: () => void;
  backgroundFit?: 'contain' | 'cover' | 'stretch' | 'none';
 setBackgroundFit?: (fit: 'contain' | 'cover' | 'stretch' | 'none') => void;
  backgroundMode?: 'auto' | 'manual';
 backgroundRect?: { x: number; y: number; width: number; height: number };
setBackgroundMode?: (m: 'auto' | 'manual') => void;
setBackgroundRect?: (r: { x: number; y: number; width: number; height: number }) => void;
}
// Константы, которые можно вынести в отдельный config файл
const SEAT_RADIUS = 12;
const SEAT_SPACING_X = 30;
const SEAT_SPACING_Y = 30;
const GRID_SIZE = 30;
const CANVAS_WIDTH = 1486;
const CANVAS_HEIGHT = 752;
function containRect(imgW: number, imgH: number, boxW: number, boxH: number) {
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
  backgroundFit,

  setBackgroundFit,
backgroundMode,
backgroundRect,
setBackgroundMode,
setBackgroundRect,
}: SeatmapCanvasProps) {
  const [drawingZone, setDrawingZone] = useState<Zone | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });


  // ——— утилиты ———

// было: только clamp
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Зум к экранной точке (anchor = pointer) */
const zoomAtScreenPoint = (anchor: { x: number; y: number }, nextScaleRaw: number) => {
  const stage: Konva.Stage | null = stageRef.current;
  if (!stage) return;

  const oldScale = stage.scaleX();
  const nextScale = clamp(nextScaleRaw, 0.4, 3);

  const world = stage.getAbsoluteTransform().copy().invert().point(anchor);
  const newPos = { x: anchor.x - world.x * nextScale, y: anchor.y - world.y * nextScale };

  setScale(nextScale);
  setStagePos(newPos);
};

useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || (document.activeElement as any)?.isContentEditable) return;

    const center = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    const anchor = lastPointerRef.current ?? center;

    if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      zoomAtScreenPoint(anchor, scale * 1.1);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === '-') {
      e.preventDefault();
      zoomAtScreenPoint(anchor, scale / 1.1);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === '0') {
      e.preventDefault();
      zoomAtScreenPoint(center, 1);
    }
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [scale]);



/** конвертирует координату указателя в «мировые» координаты (без учёта scale/pos Stage) */
const toWorldPoint = (stage: Konva.Stage, p: { x: number; y: number }) =>
  stage.getAbsoluteTransform().copy().invert().point(p);

// ——— hand tool (Space) ———
const [isSpacePressed, setIsSpacePressed] = useState(false);
useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    const el = document.activeElement as HTMLElement | null;
    const editing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    if (editing) return;
    if (e.code === 'Space') { e.preventDefault(); setIsSpacePressed(true); }
  };
  const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(false); };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}, []);
useEffect(() => {
  const el = stageRef.current?.container();
  if (!el) return;
  el.style.cursor = isSpacePressed ? 'grab' : 'default';
}, [isSpacePressed]);
useEffect(() => {
  const el = stageRef.current?.container();
  if (!el) return;
  el.style.touchAction = 'none'; // отключает нативные pinch/scroll-жесты
}, []);


const [marquee, setMarquee] = useState<{ active: boolean; x: number; y: number; w: number; h: number }>({
  active: false, x: 0, y: 0, w: 0, h: 0
});
const dragStartRef = useRef<{ x: number; y: number } | null>(null);

const startMarquee = (p: { x: number; y: number }) => {
  dragStartRef.current = p;
  setMarquee({ active: true, x: p.x, y: p.y, w: 0, h: 0 });
};
const updateMarquee = (p: { x: number; y: number }) => {
  if (!dragStartRef.current) return;
  const dx = p.x - dragStartRef.current.x;
  const dy = p.y - dragStartRef.current.y;
  const x = dx < 0 ? p.x : dragStartRef.current.x;
  const y = dy < 0 ? p.y : dragStartRef.current.y;
  const w = Math.abs(dx);
  const h = Math.abs(dy);
  setMarquee(m => ({ ...m, x, y, w, h }));
};
const finishMarquee = (append: boolean) => {
  if (!marquee.active) return;

  // hit-test в "мировых" координатах
  const rx2 = marquee.x + marquee.w, ry2 = marquee.y + marquee.h;
  const selected: string[] = [];

  // зоны (AABB)
  for (const z of zones) {
    const zx1 = z.x, zy1 = z.y, zx2 = z.x + z.width, zy2 = z.y + z.height;
    const intersect = !(zx2 < marquee.x || zx1 > rx2 || zy2 < marquee.y || zy1 > ry2);
    if (intersect) selected.push(z.id);
  }

  // ряды — по экстентам сидений (или точка вокруг row.x,row.y, если пусто)
  const R = 12, PAD = 8;
  for (const r of rows) {
    const z = zones.find(zz => zz.id === r.zoneId);
    if (!z) continue;
    const rowSeats = seats.filter(s => s.rowId === r.id);
    let x1, x2, y1, y2;
    if (rowSeats.length) {
      const lefts  = rowSeats.map(s => z.x + s.x - (s.radius ?? R));
      const rights = rowSeats.map(s => z.x + s.x + (s.radius ?? R));
      x1 = Math.min(...lefts) - PAD;
      x2 = Math.max(...rights) + PAD;
      y1 = z.y + r.y - (R + PAD);
      y2 = z.y + r.y + (R + PAD);
    } else {
      x1 = z.x + r.x - (R + PAD);
      x2 = z.x + r.x + (R + PAD);
      y1 = z.y + r.y - (R + PAD);
      y2 = z.y + r.y + (R + PAD);
    }
    const intersect = !(x2 < marquee.x || x1 > rx2 || y2 < marquee.y || y1 > ry2);
    if (intersect) selected.push(r.id);
  }

  // сидения (по bbox круга)
  for (const s of seats) {
    const z = zones.find(zz => zz.id === s.zoneId);
    if (!z) continue;
    const r = s.radius ?? 12;
    const cx = z.x + s.x, cy = z.y + s.y;
    const x1 = cx - r, x2 = cx + r, y1 = cy - r, y2 = cy + r;
    const intersect = !(x2 < marquee.x || x1 > rx2 || y2 < marquee.y || y1 > ry2);
    if (intersect) selected.push(s.id);
  }

  setSelectedIds(prev => append ? Array.from(new Set([...prev, ...selected])) : selected);
  setMarquee({ active: false, x: 0, y: 0, w: 0, h: 0 });
  dragStartRef.current = null;
};

  const bgNodeRef = useRef<Konva.Image | null>(null);
const bgTrRef = useRef<Konva.Transformer | null>(null);
// где-то рядом с другими useRef/useState
const lastPointerRef = useRef<{ x: number; y: number } | null>(null);



// универсальный setter для кнопок (+/-)
const setScaleFromButtons = (nextScale: number) => {
  const anchor = lastPointerRef.current ?? { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
  zoomAtScreenPoint(anchor, nextScale);
};



const bgImg = useHTMLImage(backgroundImage);

useEffect(() => {
  if (backgroundMode === 'manual' && !backgroundRect && backgroundImage) {
    const img = new window.Image();
    img.onload = () => {
      const r = containRect(img.width, img.height, CANVAS_WIDTH, CANVAS_HEIGHT);
      setBackgroundRect?.({ x: r.x, y: r.y, width: r.width, height: r.height });
    };
    img.crossOrigin = 'anonymous';
    img.src = backgroundImage;
  }
}, [backgroundMode, backgroundRect, backgroundImage, setBackgroundRect]);


// когда ноды готовы — привязываем transformer
useEffect(() => {
  if (bgTrRef.current && bgNodeRef.current) {
    bgTrRef.current.nodes([bgNodeRef.current]);
    bgTrRef.current.getLayer()?.batchDraw();
  }
}, [backgroundMode, backgroundRect, bgImg]);

  useKeyboardShortcuts({
    selectedIds,
    setSelectedIds,
    state: { seats, rows, zones },
    setState,
    onDuplicate,
  });


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
   const stage: Konva.Stage = e.target.getStage();
  const isEmpty = e.target === stage;

  // ✅ тоже можно обновить — полезно, если нажали, не двигая мышь
  const p = stage.getPointerPosition();
  if (p) lastPointerRef.current = p;

  // select + пустота + не зажат Space → стартуем marquee
  if (currentTool === "select" && isEmpty && !isSpacePressed) {
    const p = stage.getPointerPosition();
    if (p) startMarquee(toWorldPoint(stage, p));
  }

  // add-zone — как у тебя было
  if (currentTool === "add-zone" && isEmpty) {
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const realPos = toWorldPoint(stage, pointer);

    const snappedX = Math.round(realPos.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(realPos.y / GRID_SIZE) * GRID_SIZE;

    const newZone: Zone = {
      id: "zone-temp",
      x: snappedX, y: snappedY,
      width: 0, height: 0,
      fill: "#FAFAFA",
      label: `Zone ${zones.length + 1}`,
      transparent: false,
      fillOpacity: 1,
    };
    setDrawingZone(newZone);
  }
};

const handleStageMouseMove = (e: any) => {
  const stage: Konva.Stage = e.target.getStage();
  const p = stage.getPointerPosition();
  if (!p) return;
   // ✅ записываем актуальную позицию курсора
  lastPointerRef.current = p;

  // тянем рамку
  if (marquee.active) {
    updateMarquee(toWorldPoint(stage, p));
    return;
  }

  // тянем прямоугольник зоны (режим add-zone)
  if (drawingZone) {
    const realPos = toWorldPoint(stage, p);
    const snappedX = Math.round(realPos.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(realPos.y / GRID_SIZE) * GRID_SIZE;
    setDrawingZone(prev => prev ? { ...prev, width: snappedX - prev.x, height: snappedY - prev.y } : null);
  }
};

const handleStageMouseUp = (e: any) => {
  const stage: Konva.Stage = e.target.getStage();

  // завершаем marquee
  if (marquee.active) {
    finishMarquee(!!e.evt.shiftKey);
    return;
  }

  // завершаем отрисовку зоны
  if (drawingZone) {
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
      x: startX, y: startY, width, height,
      fill: "#FAFAFA", label: `Zone ${zones.length + 1}`, rotation: 0,
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

    setState(prev => ({
      ...prev,
      zones: [...prev.zones, newZone],
      rows: [...prev.rows, ...allNewRows],
      seats: [...prev.seats, ...allNewSeats],
    }));
    setDrawingZone(null);
  }
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
const handleWheel = (e: any) => {
  e.evt.preventDefault();

  const stage: Konva.Stage | null = stageRef.current || e.target?.getStage?.();
  if (!stage) return;

  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  // запоминаем последний якорь для кнопок +/- и хоткеев
  lastPointerRef.current = pointer;

  const isZoomGesture = e.evt.ctrlKey || e.evt.metaKey || e.evt.altKey;

  if (isZoomGesture) {
    const scaleBy = 1.05;
    const direction = e.evt.deltaY < 0 ? 1 : -1; // вверх — приблизить
    const target = direction > 0 ? scale * scaleBy : scale / scaleBy;
    zoomAtScreenPoint(pointer, target);
  } else {
    // трекпад/колесо без модификаторов — пан
    setStagePos((pos) => ({
      x: pos.x - e.evt.deltaX,
      y: pos.y - e.evt.deltaY,
    }));
  }
};




  return (
    <div className='relative'>
      <Stage
  ref={stageRef}
  width={CANVAS_WIDTH}
  height={CANVAS_HEIGHT}
  scaleX={scale}
  scaleY={scale}
  x={stagePos.x}
  y={stagePos.y}
  draggable={isSpacePressed}
  onWheel={handleWheel}                     // ← вот это добавить
  onMouseDown={handleStageMouseDown}
  onMouseMove={handleStageMouseMove}
  onMouseUp={handleStageMouseUp}
  onDragStart={() => {
  const el = stageRef.current?.container();
  if (el) el.style.cursor = 'grabbing';
}}

onDragMove={(e) => setStagePos(e.target.position())}
onDragEnd={(e) => setStagePos(e.target.position())}



>


 
  {/* === ФОН САМЫЙ НИЖНИЙ === */}
  {backgroundImage && backgroundMode !== 'manual' && (
    backgroundRect && bgImg ? (
     <Layer listening={false}>
    <KonvaImage
      image={bgImg}
      x={backgroundRect.x}
      y={backgroundRect.y}
      width={backgroundRect.width}
      height={backgroundRect.height}
      opacity={0.95}
      listening={false}
      perfectDrawEnabled={false}
    />
  </Layer>
    ) : (
      <BackgroundImageLayer
        dataUrl={backgroundImage}
        canvasW={CANVAS_WIDTH}
        canvasH={CANVAS_HEIGHT}
        fit={backgroundFit ?? 'contain'}
        opacity={0.95}
        showCanvasBg={false}
      />
    )
  )}

  {backgroundImage && backgroundMode === 'manual' && bgImg && backgroundRect && (
    <Layer listening={!isSpacePressed}>
      <KonvaImage
        ref={bgNodeRef}
        image={bgImg}
        x={backgroundRect.x}
        y={backgroundRect.y}
        width={backgroundRect.width}
        height={backgroundRect.height}
        opacity={0.95}
        draggable={!isSpacePressed}  
        onDragEnd={(e) => {
          const node = e.target as unknown as Konva.Image;
          setBackgroundRect?.({
            x: node.x(), y: node.y(), width: node.width(), height: node.height(),
          });
        }}
        onTransformEnd={() => {
          const node = bgNodeRef.current!;
          const w = node.width() * node.scaleX();
          const h = node.height() * node.scaleY();
          const x = node.x();
          const y = node.y();
          node.scaleX(1); node.scaleY(1);
          setBackgroundRect?.({ x, y, width: w, height: h });
        }}
      />
      <Transformer
        ref={bgTrRef}
        nodes={bgNodeRef.current ? [bgNodeRef.current] : []}
        rotateEnabled={false}
        keepRatio
        enabledAnchors={[
          'top-left','top-center','top-right',
          'middle-left','middle-right',
          'bottom-left','bottom-center','bottom-right',
        ]}
        boundBoxFunc={(oldBox, nb) => (nb.width < 20 || nb.height < 20 ? oldBox : nb)}
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

       <Layer listening={false}>
  {marquee.active && (
    <Rect
      x={marquee.x}
      y={marquee.y}
      width={marquee.w}
      height={marquee.h}
      stroke="#3B82F6"
      strokeWidth={1}
      dash={[6, 4]}
      fill="rgba(59,130,246,0.06)"
    />
  )}
</Layer>

         
      </Stage>



      <ZoomControls scale={scale}
  setScale={setScaleFromButtons} />
    </div>
  );
}

export default SeatmapCanvas;
