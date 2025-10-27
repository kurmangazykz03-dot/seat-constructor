import Konva from "konva";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { applyBendToZoneContent } from "../seatmap/zoneWarp";
import {
  Image as KonvaImage,
  Layer,
  Stage,
  Transformer,
  Rect,
  Circle,
  Line,
  Ellipse,
  Group,
  Text as KonvaText,
} from "react-konva";
import { Row, Seat, Zone, TextObject, ShapeObject } from "../../types/types";
import BackgroundImageLayer from "../seatmap/BackgroundImageLayer";
import DrawingZone from "../seatmap/DrawingZone";
import GridLayer from "../seatmap/GridLayer";
import { useKeyboardShortcuts } from "../seatmap/useKeyboardShortcuts";
import ZoneComponent from "../seatmap/ZoneComponent";
import ZoomControls from "../seatmap/ZoomControls";
import ZoneBendOverlay from "../seatmap/ZoneBendOverlay";

import { SeatmapState } from "../../pages/EditorPage";

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
  currentTool:
    | "select"
    | "add-seat"
    | "add-row"
    | "add-zone"
    | "rotate"
    | "add-text"
    | "add-rect"
    | "add-ellipse"
    | "add-polygon"
    | "bend"; // 🆕
  backgroundImage: string | null;

  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  onDuplicate: () => void;
  backgroundFit?: "contain" | "cover" | "stretch" | "none";
  setBackgroundFit?: (fit: "contain" | "cover" | "stretch" | "none") => void;
  backgroundMode?: "auto" | "manual";
  backgroundRect?: { x: number; y: number; width: number; height: number };
  setBackgroundMode?: (m: "auto" | "manual") => void;
  setBackgroundRect?: (r: { x: number; y: number; width: number; height: number }) => void;
  texts: TextObject[];
  shapes: ShapeObject[];
}

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
  texts,
  shapes,
}: SeatmapCanvasProps) {
  const [drawingZone, setDrawingZone] = useState<Zone | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const shapeRefs = useRef<Record<string, Konva.Group | null>>({});
  const [shapeDraft, setShapeDraft] = useState<ShapeObject | null>(null);
  const [polyDraft, setPolyDraft] = useState<{ id: string; points: { x: number; y: number }[] } | null>(null);

  const normRect = (x1: number, y1: number, x2: number, y2: number) => {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    return { x, y, width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
  };

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const zoomAtScreenPoint = (anchor: { x: number; y: number }, nextScaleRaw: number) => {
    const stage: Konva.Stage | null = stageRef.current;
    if (!stage) return;
    const nextScale = clamp(nextScaleRaw, 0.4, 3);
    const world = stage.getAbsoluteTransform().copy().invert().point(anchor);
    const newPos = { x: anchor.x - world.x * nextScale, y: anchor.y - world.y * nextScale };
    setScale(nextScale);
    setStagePos(newPos);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!polyDraft) return;
      if (e.key === "Escape") setPolyDraft(null);
      if (e.key === "Enter") finishPolygon();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [polyDraft]);

  const finishPolygon = () => {
    if (!polyDraft || polyDraft.points.length < 3) {
      setPolyDraft(null);
      return;
    }
    const pts = polyDraft.points;
    const minX = Math.min(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxX = Math.max(...pts.map((p) => p.x));
    const maxY = Math.max(...pts.map((p) => p.y));
    const width = maxX - minX;
    const height = maxY - minY;
    const localPts = pts.map((p) => ({ x: p.x - minX, y: p.y - minY }));

    const newShape: ShapeObject = {
      id: `shape-${crypto.randomUUID()}`,
      kind: "polygon",
      x: minX,
      y: minY,
      width,
      height,
      points: localPts,
      fill: "#ffffff",
      stroke: "#111827",
      strokeWidth: 1,
      opacity: 1,
      rotation: 0,
      flipX: false,
      flipY: false,
    };
    setState((prev) => ({ ...prev, shapes: [...prev.shapes, newShape] }));
    setSelectedIds([newShape.id]);
    setPolyDraft(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || (document.activeElement as any)?.isContentEditable) return;

      const center = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
      const anchor = lastPointerRef.current ?? center;

      if ((e.metaKey || e.ctrlKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        zoomAtScreenPoint(anchor, scale * 1.1);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        zoomAtScreenPoint(anchor, scale / 1.1);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        zoomAtScreenPoint(center, 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scale]);

  const toWorldPoint = (stage: Konva.Stage, p: { x: number; y: number }) => stage.getAbsoluteTransform().copy().invert().point(p);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const editing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (editing) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpacePressed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const el = stageRef.current?.container();
    if (!el) return;
    const crosshairModes = ["add-seat", "add-rect", "add-ellipse", "add-polygon", "add-text"];
    el.style.cursor = isSpacePressed ? "grab" : crosshairModes.includes(currentTool) ? "crosshair" : "default";
  }, [isSpacePressed, currentTool]);

  useEffect(() => {
    const el = stageRef.current?.container();
    if (!el) return;
    el.style.touchAction = "none";
  }, []);

  const [marquee, setMarquee] = useState<{ active: boolean; x: number; y: number; w: number; h: number }>({
    active: false,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
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
    setMarquee((m) => ({ ...m, x, y, w, h }));
  };
  const finishMarquee = (append: boolean) => {
    if (!marquee.active) return;
    const rx2 = marquee.x + marquee.w,
      ry2 = marquee.y + marquee.h;
    const selected: string[] = [];

    for (const z of zones) {
      const zx1 = z.x,
        zy1 = z.y,
        zx2 = z.x + z.width,
        zy2 = z.y + z.height;
      const intersect = !(zx2 < marquee.x || zx1 > rx2 || zy2 < marquee.y || zy1 > ry2);
      if (intersect) selected.push(z.id);
    }

    const R = 12,
      PAD = 8;
    for (const r of rows) {
      const z = zones.find((zz) => zz.id === r.zoneId);
      if (!z) continue;
      const rowSeats = seats.filter((s) => s.rowId === r.id);
      let x1, x2, y1, y2;
      if (rowSeats.length) {
        const lefts = rowSeats.map((s) => z.x + s.x - (s.radius ?? R));
        const rights = rowSeats.map((s) => z.x + s.x + (s.radius ?? R));
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

    for (const s of seats) {
      const r = s.radius ?? 12;
      const z = s.zoneId ? zones.find((zz) => zz.id === s.zoneId) : null;
      const cx = z ? z.x + s.x : s.x;
      const cy = z ? z.y + s.y : s.y;
      const x1 = cx - r,
        x2 = cx + r,
        y1 = cy - r,
        y2 = cy + r;
      const intersect = !(x2 < marquee.x || x1 > rx2 || y2 < marquee.y || y1 > ry2);
      if (intersect) selected.push(s.id);
    }
    for (const sh of shapes) {
      const x1 = sh.x,
        y1 = sh.y,
        x2 = sh.x + sh.width,
        y2 = sh.y + sh.height;
      const intersect = !(x2 < marquee.x || x1 > rx2 || y2 < marquee.y || y1 > ry2);
      if (intersect) selected.push(sh.id);
    }

    setSelectedIds((prev) => (append ? Array.from(new Set([...prev, ...selected])) : selected));
    setMarquee({ active: false, x: 0, y: 0, w: 0, h: 0 });
    dragStartRef.current = null;
  };

  const bgNodeRef = useRef<Konva.Image | null>(null);
  const bgTrRef = useRef<Konva.Transformer | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const setScaleFromButtons = (nextScale: number) => {
    const anchor = lastPointerRef.current ?? { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    zoomAtScreenPoint(anchor, nextScale);
  };

  const bgImg = useHTMLImage(backgroundImage);

  useEffect(() => {
    if (backgroundMode === "manual" && !backgroundRect && backgroundImage) {
      const img = new window.Image();
      img.onload = () => {
        const r = containRect(img.width, img.height, CANVAS_WIDTH, CANVAS_HEIGHT);
        setBackgroundRect?.({ x: r.x, y: r.y, width: r.width, height: r.height });
      };
      img.crossOrigin = "anonymous";
      img.src = backgroundImage;
    }
  }, [backgroundMode, backgroundRect, backgroundImage, setBackgroundRect]);

  useEffect(() => {
    if (bgTrRef.current && bgNodeRef.current) {
      bgTrRef.current.nodes([bgNodeRef.current]);
      bgTrRef.current.getLayer()?.batchDraw();
    }
  }, [backgroundMode, backgroundRect, bgImg]);

  useEffect(() => {
    const el = stageRef.current?.container();
    if (!el) return;
    el.style.cursor = isSpacePressed ? "grab" : currentTool === "add-seat" ? "crosshair" : "default";
  }, [isSpacePressed, currentTool]);

  useKeyboardShortcuts({
    selectedIds,
    setSelectedIds,
    state: { seats, rows, zones },
    setState,
    onDuplicate,
  });

  const createRowWithSeats = (zoneId: string, rowIndex: number, cols: number, offsetX: number, offsetY: number) => {
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

    const p = stage.getPointerPosition();
    if (p) lastPointerRef.current = p;

    if (currentTool === "select" && isEmpty && !isSpacePressed) {
      const p = stage.getPointerPosition();
      if (p) startMarquee(toWorldPoint(stage, p));
    }

    if (currentTool === "add-seat") {
      if (isSpacePressed) return;
      const p = stage.getPointerPosition();
      if (!p) return;
      const world = toWorldPoint(stage, p);
      const snappedX = Math.round(world.x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(world.y / GRID_SIZE) * GRID_SIZE;

      const newSeat: Seat = {
        id: `seat-${crypto.randomUUID()}`,
        x: snappedX,
        y: snappedY,
        radius: SEAT_RADIUS,
        fill: "#22C55E",
        label: "1",
        status: "available",
        category: "standard",
        zoneId: null,
        rowId: null,
        colIndex: 1,
      };
      setState((prev) => ({ ...prev, seats: [...prev.seats, newSeat] }));
      setSelectedIds([newSeat.id]);
      return;
    }

    if (currentTool === "add-zone" && isEmpty) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const realPos = toWorldPoint(stage, pointer);

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
        transparent: false,
        fillOpacity: 1,
      };
      setDrawingZone(newZone);
    }

    if (currentTool === "add-text") {
      const p = stage.getPointerPosition();
      if (!p) return;
      const world = toWorldPoint(stage, p);
      const snappedX = Math.round(world.x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(world.y / GRID_SIZE) * GRID_SIZE;

      const newText: TextObject = {
        id: `text-${crypto.randomUUID()}`,
        text: "Text",
        x: snappedX,
        y: snappedY,
        fontSize: 18,
        rotation: 0,
        fill: "#111827",
      };
      setState((prev) => ({ ...prev, texts: [...prev.texts, newText] }));
      setSelectedIds([newText.id]);
      return;
    }

    if (currentTool === "add-rect" || currentTool === "add-ellipse") {
      if (isSpacePressed) return;
      const p = stage.getPointerPosition();
      if (!p) return;
      const w = toWorldPoint(stage, p);
      const sx = Math.round(w.x / GRID_SIZE) * GRID_SIZE;
      const sy = Math.round(w.y / GRID_SIZE) * GRID_SIZE;
      setShapeDraft({
        id: "shape-temp",
        kind: currentTool === "add-rect" ? "rect" : "ellipse",
        x: sx,
        y: sy,
        width: 0,
        height: 0,
        fill: "#ffffff",
        stroke: "#111827",
        strokeWidth: 1,
        opacity: 1,
        rotation: 0,
        flipX: false,
        flipY: false,
      });
      return;
    }

    if (currentTool === "add-polygon") {
      if (isSpacePressed) return;
      const p = stage.getPointerPosition();
      if (!p) return;
      const w = toWorldPoint(stage, p);
      const px = Math.round(w.x / GRID_SIZE) * GRID_SIZE;
      const py = Math.round(w.y / GRID_SIZE) * GRID_SIZE;

      setPolyDraft((prev) => {
        if (!prev) return { id: `poly-temp`, points: [{ x: px, y: py }] };
        return { ...prev, points: [...prev.points, { x: px, y: py }] };
      });
      return;
    }
  };

  const handleStageMouseMove = (e: any) => {
    const stage: Konva.Stage = e.target.getStage();
    const p = stage.getPointerPosition();
    if (!p) return;
    lastPointerRef.current = p;

    if (marquee.active) {
      updateMarquee(toWorldPoint(stage, p));
      return;
    }

    if (drawingZone) {
      const realPos = toWorldPoint(stage, p);
      const snappedX = Math.round(realPos.x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(realPos.y / GRID_SIZE) * GRID_SIZE;
      setDrawingZone((prev) => (prev ? { ...prev, width: snappedX - prev.x, height: snappedY - prev.y } : null));
    }

    if (shapeDraft) {
      const w = toWorldPoint(stage, p);
      const ex = Math.round(w.x / GRID_SIZE) * GRID_SIZE;
      const ey = Math.round(w.y / GRID_SIZE) * GRID_SIZE;
      const r = normRect(shapeDraft.x, shapeDraft.y, ex, ey);
      setShapeDraft((sd) => (sd ? { ...sd, ...r } : null));
    }
  };

  const handleStageMouseUp = (e: any) => {
    const stage: Konva.Stage = e.target.getStage();

    if (marquee.active) {
      finishMarquee(!!e.evt.shiftKey);
      return;
    }

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
        x: startX,
        y: startY,
        width,
        height,
        fill: "#FAFAFA",
        label: `Zone ${zones.length + 1}`,
        rotation: 0,
        bendTop: 0,
        bendRight: 0,
        bendBottom: 0,
        bendLeft: 0,
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

      setState((prev) => ({
        ...prev,
        zones: [...prev.zones, newZone],
        rows: [...prev.rows, ...allNewRows],
        seats: [...prev.seats, ...allNewSeats],
      }));
      setDrawingZone(null);
    }

    if (shapeDraft) {
      const { x, y, width, height, kind } = shapeDraft;
      if (width >= 2 && height >= 2) {
        const newShape: ShapeObject = {
          id: `shape-${crypto.randomUUID()}`,
          kind,
          x,
          y,
          width,
          height,
          fill: shapeDraft.fill,
          stroke: shapeDraft.stroke,
          strokeWidth: shapeDraft.strokeWidth,
          opacity: 1,
          rotation: 0,
          flipX: false,
          flipY: false,
        };
        setState((prev) => ({ ...prev, shapes: [...prev.shapes, newShape] }));
        setSelectedIds([newShape.id]);
      }
      setShapeDraft(null);
      return;
    }
  };

  const textRefs = useRef<Record<string, Konva.Text | null>>({});
  const handleElementClick = (id: string, e: any) => {
    if (currentTool === "add-seat" || currentTool === "add-text") return;
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
    lastPointerRef.current = pointer;

    const isZoomGesture = e.evt.ctrlKey || e.evt.metaKey || e.evt.altKey;
    if (isZoomGesture) {
      const scaleBy = 1.05;
      const direction = e.evt.deltaY < 0 ? 1 : -1;
      const target = direction > 0 ? scale * scaleBy : scale / scaleBy;
      zoomAtScreenPoint(pointer, target);
    } else {
      setStagePos((pos) => ({
        x: pos.x - e.evt.deltaX,
        y: pos.y - e.evt.deltaY,
      }));
    }
  };

  return (
    <div className="relative">
      <Stage
        ref={stageRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={isSpacePressed}
        dragDistance={2}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onDragStart={(e) => {
          const stage = stageRef.current;
          if (!stage || e.target !== stage) return;
          const el = stage.container();
          if (el) el.style.cursor = "grabbing";
        }}
        onDragMove={() => {
          const stage = stageRef.current;
          if (!stage) return;
          setStagePos(stage.position());
        }}
        onDragEnd={() => {
          const stage = stageRef.current;
          if (!stage) return;
          setStagePos(stage.position());
          const el = stage.container();
          if (el) el.style.cursor = isSpacePressed ? "grab" : "default";
        }}
        onDblClick={() => {
          if (currentTool === "add-polygon") finishPolygon();
        }}
      >
        {/* Фон */}
        {backgroundImage &&
          backgroundMode !== "manual" &&
          (backgroundRect && bgImg ? (
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
              fit={backgroundFit ?? "contain"}
              opacity={0.95}
              showCanvasBg={false}
            />
          ))}

        {backgroundImage && backgroundMode === "manual" && bgImg && backgroundRect && (
          <Layer listening={currentTool === "select" && !isSpacePressed}>
            <KonvaImage
              ref={bgNodeRef}
              image={bgImg}
              x={backgroundRect.x}
              y={backgroundRect.y}
              width={backgroundRect.width}
              height={backgroundRect.height}
              opacity={0.95}
              draggable={currentTool === "select" && !isSpacePressed}
              onDragEnd={(e) => {
                const node = e.target as unknown as Konva.Image;
                setBackgroundRect?.({
                  x: node.x(),
                  y: node.y(),
                  width: node.width(),
                  height: node.height(),
                });
              }}
              onTransformEnd={() => {
                const node = bgNodeRef.current!;
                const w = node.width() * node.scaleX();
                const h = node.height() * node.scaleY();
                const x = node.x();
                const y = node.y();
                node.scaleX(1);
                node.scaleY(1);
                setBackgroundRect?.({ x, y, width: w, height: h });
              }}
            />
            <Transformer
              ref={bgTrRef}
              nodes={bgNodeRef.current ? [bgNodeRef.current] : []}
              rotateEnabled={false}
              keepRatio
              enabledAnchors={[
                "top-left",
                "top-center",
                "top-right",
                "middle-left",
                "middle-right",
                "bottom-left",
                "bottom-center",
                "bottom-right",
              ]}
              boundBoxFunc={(oldBox, nb) => (nb.width < 20 || nb.height < 20 ? oldBox : nb)}
            />
          </Layer>
        )}

        {/* Сетка */}
        <GridLayer
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          gridSize={GRID_SIZE}
          showGrid={showGrid}
          scale={scale}
          stagePos={stagePos}
        />

        {/* Зоны */}
        <Layer listening={currentTool !== "add-seat" && currentTool !== "bend"}>
          {zones.map((zone) => (
            <ZoneComponent
  key={zone.id}
  zone={zone}
  seats={seats}
  rows={rows}
  isSelected={selectedIds.includes(zone.id)}
  // ⛔ onClick={(e: any) => handleElementClick(zone.id, e)}  <-- убрать
  setGroupRef={(node) => { zoneRefs.current[zone.id] = node; }}
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

          <DrawingZone drawingZone={drawingZone} seatSpacingX={SEAT_SPACING_X} seatSpacingY={SEAT_SPACING_Y} />
        </Layer>

        {/* SHAPES */}
        <Layer listening={currentTool === "select" && !isSpacePressed}>
          {shapes.map((sh) => {
            const cx = sh.x + sh.width / 2;
            const cy = sh.y + sh.height / 2;
            const scaleX = sh.flipX ? -1 : 1;
            const scaleY = sh.flipY ? -1 : 1;

            return (
              <Group
                key={sh.id}
                ref={(node) => {
                  shapeRefs.current[sh.id] = node;
                }}
                x={cx}
                y={cy}
                offsetX={sh.width / 2}
                offsetY={sh.height / 2}
                rotation={sh.rotation ?? 0}
                scaleX={scaleX}
                scaleY={scaleY}
                opacity={sh.opacity ?? 1}
                draggable={currentTool === "select" && !isSpacePressed}
                onClick={(e) => handleElementClick(sh.id, e)}
                onDragEnd={(e) => {
                  const nx = e.target.x() - sh.width / 2;
                  const ny = e.target.y() - sh.height / 2;
                  const sx = Math.round(nx / GRID_SIZE) * GRID_SIZE;
                  const sy = Math.round(ny / GRID_SIZE) * GRID_SIZE;
                  setState((prev) => ({
                    ...prev,
                    shapes: prev.shapes.map((s) => (s.id === sh.id ? { ...s, x: sx, y: sy } : s)),
                  }));
                }}
              >
                {sh.kind === "rect" && (
                  <Rect x={0} y={0} width={sh.width} height={sh.height} fill={sh.fill ?? "#fff"} stroke={sh.stroke ?? "#111827"} strokeWidth={sh.strokeWidth ?? 1} />
                )}
                {sh.kind === "ellipse" && (
                  <Ellipse
                    x={sh.width / 2}
                    y={sh.height / 2}
                    radiusX={sh.width / 2}
                    radiusY={sh.height / 2}
                    fill={sh.fill ?? "#fff"}
                    stroke={sh.stroke ?? "#111827"}
                    strokeWidth={sh.strokeWidth ?? 1}
                  />
                )}
                {sh.kind === "polygon" && (
                  <Line x={0} y={0} points={(sh.points ?? []).flatMap((p) => [p.x, p.y])} closed fill={sh.fill ?? "#fff"} stroke={sh.stroke ?? "#111827"} strokeWidth={sh.strokeWidth ?? 1} lineJoin="round" />
                )}
              </Group>
            );
          })}

          {/* Драфт шейпов */}
          {shapeDraft && (
            <Group x={shapeDraft.x + shapeDraft.width / 2} y={shapeDraft.y + shapeDraft.height / 2} offsetX={shapeDraft.width / 2} offsetY={shapeDraft.height / 2} opacity={0.7} listening={false}>
              {shapeDraft.kind === "rect" ? (
                <Rect x={0} y={0} width={shapeDraft.width} height={shapeDraft.height} fill="rgba(0,0,0,0.03)" stroke="#3B82F6" dash={[6, 4]} />
              ) : (
                <Ellipse x={shapeDraft.width / 2} y={shapeDraft.height / 2} radiusX={shapeDraft.width / 2} radiusY={shapeDraft.height / 2} fill="rgba(0,0,0,0.03)" stroke="#3B82F6" dash={[6, 4]} />
              )}
            </Group>
          )}

          {polyDraft && <Line points={polyDraft.points.flatMap((p) => [p.x, p.y])} stroke="#3B82F6" strokeWidth={1} dash={[6, 4]} closed={false} listening={false} />}
        </Layer>

        {/* Свободные сиденья (вне зон) */}
        <Layer listening={currentTool === "select" && !isSpacePressed}>
          {seats
            .filter((s) => !s.zoneId)
            .map((s) => (
              <Circle
                key={s.id}
                x={s.x}
                y={s.y}
                radius={s.radius ?? SEAT_RADIUS}
                fill={s.fill}
                stroke="#0F172A"
                strokeWidth={0.5}
                opacity={1}
                draggable={currentTool === "select" && !isSpacePressed}
                onClick={(e) => handleElementClick(s.id, e)}
                onDragEnd={(e) => {
                  const nx = Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE;
                  const ny = Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE;
                  setState((prev) => ({
                    ...prev,
                    seats: prev.seats.map((ss) => (ss.id === s.id ? { ...ss, x: nx, y: ny } : ss)),
                  }));
                }}
              />
            ))}
        </Layer>

        {/* Тексты */}
        <Layer listening={currentTool === "select" && !isSpacePressed}>
          {texts.map((t) => (
            <KonvaText
              key={t.id}
              ref={(node) => {
                textRefs.current[t.id] = node as unknown as Konva.Text;
              }}
              x={t.x}
              y={t.y}
              text={t.text}
              fontSize={t.fontSize}
              rotation={t.rotation ?? 0}
              fill={t.fill ?? "#111827"}
              fontFamily={t.fontFamily}
              draggable={currentTool === "select" && !isSpacePressed}
              onClick={(e) => handleElementClick(t.id, e)}
              onDragEnd={(e) => {
                const nx = Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE;
                const ny = Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE;
                setState((prev) => ({
                  ...prev,
                  texts: prev.texts.map((tt) => (tt.id === t.id ? { ...tt, x: nx, y: ny } : tt)),
                }));
              }}
              listening
            />
          ))}
        </Layer>

        {/* Rotate transformer */}
        {currentTool === "rotate" &&
          selectedIds.length === 1 &&
          (() => {
            const selectedId = selectedIds[0];
            const zoneNode = zoneRefs.current[selectedId];
            const textNode = textRefs.current[selectedId];
            const shapeNode = shapeRefs.current[selectedId];
            const node = zoneNode ?? textNode ?? shapeNode;
            if (!node) return null;
            return (
              <Layer>
                <Transformer
                  nodes={[node]}
                  rotateEnabled
                  enabledAnchors={[]}
                  onTransformEnd={() => {
                    const rotation = node.rotation();
                    setState((prev) => ({
                      ...prev,
                      zones: prev.zones.map((z) => (z.id === selectedId ? { ...z, rotation } : z)),
                      texts: prev.texts.map((t) => (t.id === selectedId ? { ...t, rotation } : t)),
                      shapes: prev.shapes.map((s) => (s.id === selectedId ? { ...s, rotation } : s)),
                    }));
                  }}
                />
              </Layer>
            );
          })()}

        {/* 🆕 Bend overlay — редактирование изгибов выбранной зоны */}
       {currentTool === "bend" && selectedIds.length === 1 && (() => {
  const z = zones.find((zz) => zz.id === selectedIds[0]);
  if (!z) return null;
  return (
    <Layer>
      <ZoneBendOverlay
        zone={z}
  gridSize={GRID_SIZE}
        setZone={(updater) =>
          setState((prev) => ({
            ...prev,
            zones: prev.zones.map((one) => (one.id === z.id ? updater(one) : one)),
          }))
        }
        onCommit={(zoneAfter) => {
          setState((prev) => {
            const { rows, seats } = applyBendToZoneContent(prev, zoneAfter);
            return { ...prev, rows, seats };
          });
        }}
      />
    </Layer>
  );
})()}

        {/* Рамка выделения */}
        <Layer listening={false}>
          {marquee.active && (
            <Rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} stroke="#3B82F6" strokeWidth={1} dash={[6, 4]} fill="rgba(59,130,246,0.06)" />
          )}
        </Layer>
      </Stage>

      <ZoomControls scale={scale} setScale={setScaleFromButtons} />
    </div>
  );
}

export default SeatmapCanvas;
