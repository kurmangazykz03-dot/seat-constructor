import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import {
  Circle,
  Ellipse,
  Group,
  Image as KonvaImage,
  Text as KonvaText,
  Layer,
  Line,
  Rect,
  Stage,
  Transformer,
} from "react-konva";
import { Row, Seat, ShapeObject, TextObject, Zone } from "../../types/types";
import BackgroundImageLayer from "../seatmap/BackgroundImageLayer";
import DrawingZone from "../seatmap/DrawingZone";
import GridLayer from "../seatmap/GridLayer";
import SeatComponent from "../seatmap/SeatComponent";
import { useKeyboardShortcuts } from "../seatmap/useKeyboardShortcuts";
import ZoneBendOverlay from "../seatmap/ZoneBendOverlay";
import ZoneComponent from "../seatmap/ZoneComponent";
import { applyBendToZoneContent } from "../seatmap/zoneWarp";
import ZoomControls from "../seatmap/ZoomControls";

import { SeatmapState } from "../../pages/EditorPage";

import { crisp, crispRect, crispSize } from "../../utils/crisp";

(Konva as any).pixelRatio = Math.max(window.devicePixelRatio || 1, 1);

function fitZoneWidthToContent(zone: Zone, rows: Row[], seats: Seat[], pad = 16) {
  const rowsZ = rows.filter((r) => r.zoneId === zone.id);
  const seatsZ = seats.filter((s) => s.zoneId === zone.id);
  if (!rowsZ.length && !seatsZ.length) return zone;

  let minX = Infinity;
  let maxX = -Infinity;

  for (const s of seatsZ) {
    const rad = s.radius ?? 12;
    minX = Math.min(minX, s.x - rad);
    maxX = Math.max(maxX, s.x + rad);
  }

  if (!Number.isFinite(minX)) {
    for (const r of rowsZ) {
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x);
    }
  }

  if (!Number.isFinite(minX)) return zone;

  const shiftX = Math.min(0, Math.floor(minX - pad));

  const leftEdge = Math.min(0, Math.floor(minX - pad));

  const rightEdge = Math.ceil(maxX + pad);

  const neededWidth = rightEdge - leftEdge;

  return {
    ...zone,
    x: zone.x + leftEdge,
    width: Math.max(zone.width, neededWidth),
  };
}

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
function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  const ax2 = a.x + a.width,
    ay2 = a.y + a.height;
  const bx2 = b.x + b.width,
    by2 = b.y + b.height;
  return !(ax2 < b.x || a.x > bx2 || ay2 < b.y || a.y > by2);
}
const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = a.x - b.x,
    dy = a.y - b.y;
  return dx * dx + dy * dy;
};
const NEAR_R2 = 10 * 10;

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
  setBackgroundImage?: (v: string | null) => void;
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
  setBackgroundImage,
}: SeatmapCanvasProps) {
  const [drawingZone, setDrawingZone] = useState<Zone | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const shapeRefs = useRef<Record<string, Konva.Group | null>>({});
  const [shapeDraft, setShapeDraft] = useState<ShapeObject | null>(null);
  const [polyDraft, setPolyDraft] = useState<{
    id: string;
    points: { x: number; y: number }[];
    hoverFirst?: boolean;
  } | null>(null);

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
      if (e.key === "Backspace") {
        e.preventDefault();
        setPolyDraft((prev) => {
          if (!prev) return null;
          const pts = prev.points.slice(0, -1);
          return pts.length ? { ...prev, points: pts } : null;
        });
      }
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
    const uniq = pts.filter((p, i) => i === 0 || dist2(p, pts[i - 1]) > 0);
    if (uniq.length < 3) {
      setPolyDraft(null);
      return;
    }

    const minX = Math.min(...uniq.map((p) => p.x));
    const minY = Math.min(...uniq.map((p) => p.y));
    const maxX = Math.max(...uniq.map((p) => p.x));
    const maxY = Math.max(...uniq.map((p) => p.y));
    const width = maxX - minX;
    const height = maxY - minY;
    if (width < 2 || height < 2) {
      setPolyDraft(null);
      return;
    }
    const localPts = uniq.map((p) => ({ x: p.x - minX, y: p.y - minY }));

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
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (document.activeElement as any)?.isContentEditable
      )
        return;

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

  const toWorldPoint = (stage: Konva.Stage, p: { x: number; y: number }) =>
    stage.getAbsoluteTransform().copy().invert().point(p);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const editing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
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
    el.style.cursor = isSpacePressed
      ? "grab"
      : crosshairModes.includes(currentTool)
        ? "crosshair"
        : "default";
  }, [isSpacePressed, currentTool]);

  useEffect(() => {
    const el = stageRef.current?.container();
    if (!el) return;
    el.style.touchAction = "none";
  }, []);

  const [marquee, setMarquee] = useState<{
    active: boolean;
    x: number;
    y: number;
    w: number;
    h: number;
  }>({
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
  // finishMarquee: выбираем ТОЛЬКО сиденья
  const finishMarquee = (append: boolean) => {
    if (!marquee.active) return;
    const rx2 = marquee.x + marquee.w,
      ry2 = marquee.y + marquee.h;
    const selected: string[] = [];

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

    const uniq = Array.from(new Set(selected));
    setSelectedIds((prev) => (append ? Array.from(new Set([...prev, ...uniq])) : uniq));
    setMarquee({ active: false, x: 0, y: 0, w: 0, h: 0 });
    dragStartRef.current = null;
  };

  const bgNodeRef = useRef<Konva.Image | null>(null);
  const bgTrRef = useRef<Konva.Transformer | null>(null);
  const [bgSelected, setBgSelected] = useState(false);
  useEffect(() => {
    const onDel = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (document.activeElement as any)?.isContentEditable
      )
        return;

      const isDel = e.key === "Delete" || e.key === "Backspace";
      if (!isDel) return;

      // ✅ можно удалять:
      //   1) если фон выделен (manual)
      //   2) или если фон есть, инструмент select и ничего не выделено (auto)
      const canDeleteBg =
        bgSelected || (!!backgroundImage && currentTool === "select" && selectedIds.length === 0);

      if (!canDeleteBg) return;

      e.preventDefault();
      setBackgroundImage?.(null);
      setBackgroundRect?.({ x: 0, y: 0, width: 0, height: 0 });
      setBackgroundMode?.("auto");
      setBgSelected(false);
    };

    window.addEventListener("keydown", onDel);
    return () => window.removeEventListener("keydown", onDel);
  }, [
    bgSelected,
    backgroundImage,
    currentTool,
    selectedIds.length,
    setState,
    setBackgroundRect,
    setBackgroundMode,
  ]);

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

  useKeyboardShortcuts({
    selectedIds,
    setSelectedIds,
    state: { seats, rows, zones, texts, shapes },
    setState,
    onDuplicate,
  });

  const createRowWithSeats = (
    zoneId: string,
    rowIndex: number,
    cols: number,
    offsetX: number,
    offsetY: number,
    stepX: number,
    stepY: number
  ) => {
    const rowId = `row-${crypto.randomUUID()}`;
    const y = offsetY + rowIndex * stepY + stepY / 2;
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
      x: offsetX + c * stepX + SEAT_RADIUS,
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
  const snapCenter = (v: number) => Math.floor(v / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const isEmpty =
      e.target === stage || e.target?.name?.() === "zone-bg" || e.target?.name?.() === "zone-ui"; // 👈 добавили
    if (isEmpty) setBgSelected(false);
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
      const w = toWorldPoint(stage, p);
      const useSnap = e.evt.altKey; // Alt — включить снап
      const x = useSnap ? snapCenter(w.x) : Math.round(w.x);
      const y = useSnap ? snapCenter(w.y) : Math.round(w.y);

      const newSeat: Seat = {
        id: `seat-${crypto.randomUUID()}`,
        x,
        y,
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

      // Alt — без снапа; иначе снап к сетке
      const px = e.evt.altKey ? w.x : Math.round(w.x / GRID_SIZE) * GRID_SIZE;
      const py = e.evt.altKey ? w.y : Math.round(w.y / GRID_SIZE) * GRID_SIZE;

      setPolyDraft((prev) => {
        if (!prev) return { id: `poly-temp`, points: [{ x: px, y: py }], hoverFirst: false };

        const last = prev.points[prev.points.length - 1];
        // защита от «той же точки»
        if (last && dist2(last, { x: px, y: py }) < 1) return prev;

        // клик по первой точке — замыкаем, если точек >= 3
        if (prev.points.length >= 3 && dist2(prev.points[0], { x: px, y: py }) <= NEAR_R2) {
          finishPolygon();
          return null;
        }

        return { ...prev, points: [...prev.points, { x: px, y: py }], hoverFirst: false };
      });
      return;
    }
  };

  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
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
      const ex = Math.round(realPos.x / GRID_SIZE) * GRID_SIZE;
      const ey = Math.round(realPos.y / GRID_SIZE) * GRID_SIZE;
      setDrawingZone((prev) => {
        if (!prev) return null;
        const r = normRect(prev.x, prev.y, ex, ey); // ← всегда top-left + положительные width/height
        return { ...prev, x: r.x, y: r.y, width: r.width, height: r.height };
      });
    }

    if (shapeDraft) {
      const w = toWorldPoint(stage, p);
      const ex = Math.round(w.x / GRID_SIZE) * GRID_SIZE;
      const ey = Math.round(w.y / GRID_SIZE) * GRID_SIZE;
      const r = normRect(shapeDraft.x, shapeDraft.y, ex, ey);
      setShapeDraft((sd) => (sd ? { ...sd, ...r } : null));
    }
    if (polyDraft) {
      const w = toWorldPoint(stage, p);
      const px = w.x,
        py = w.y; // для резинки не снапаем — выглядит живее

      // показываем ховер по первой точке
      const showHover =
        polyDraft.points.length >= 3 && dist2(polyDraft.points[0], { x: px, y: py }) <= NEAR_R2;

      setPolyDraft((prev) => (prev ? { ...prev, hoverFirst: showHover } : null));
      return;
    }
  };

  const handleStageMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    const stage: Konva.Stage = e.target.getStage();

    if (marquee.active) {
      finishMarquee(!!e.evt.shiftKey);
      return;
    }

    if (drawingZone) {
      const { x: startX, y: startY, width, height } = drawingZone; // уже нормализовано

      if (width < SEAT_SPACING_X || height < SEAT_SPACING_Y) {
        setDrawingZone(null);
        return;
      }

      const newZone: Zone = {
        id: `zone-${crypto.randomUUID()}`,
        x: startX,
        y: startY,
        width,
        height,
        fill: "#FAFAFA",
        label: `Zone ${zones.length + 1}`,
        rotation: 0,
        seatSpacingX: SEAT_SPACING_X,
        seatSpacingY: SEAT_SPACING_Y,
        rowLabelSide: "left",
      };

      const stepX = newZone.seatSpacingX ?? SEAT_SPACING_X;
      const stepY = newZone.seatSpacingY ?? SEAT_SPACING_Y;

      const cols = Math.max(1, Math.floor(width / stepX));
      const rowsCount = Math.max(1, Math.floor(height / stepY));
      const offsetX = (width - cols * stepX) / 2;
      const offsetY = (height - rowsCount * stepY) / 2;

      const allNewRows: Row[] = [];
      const allNewSeats: Seat[] = [];

      for (let r = 0; r < rowsCount; r++) {
        const { row, seats: rowSeats } = createRowWithSeats(
          newZone.id,
          r,
          cols,
          offsetX,
          offsetY,
          stepX,
          stepY
        );
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

  const parentZoneIdOf = (id: string) => {
    const r = rows.find((r) => r.id === id);
    if (r) return r.zoneId;
    const s = seats.find((s) => s.id === id);
    return s?.zoneId ?? null;
  };

  const handleElementClick = (id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (currentTool === "add-seat" || currentTool === "add-text") return;
    e.cancelBubble = true;

    if (e.evt.altKey || e.evt.ctrlKey || e.evt.metaKey) {
      const zid = parentZoneIdOf(id);
      if (zid) setSelectedIds([zid]);
      return;
    }

    if (e.evt.shiftKey) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    } else {
      setSelectedIds([id]);
    }
  };

  const zoneRefs = useRef<Record<string, Konva.Group | null>>({});
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage: Konva.Stage | null = stageRef.current || e.target?.getStage?.();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    lastPointerRef.current = pointer;

    const mode = e.evt.deltaMode;
    const line = 40,
      page = 800;
    const dx = mode === 1 ? e.evt.deltaX * line : mode === 2 ? e.evt.deltaX * page : e.evt.deltaX;
    const dy = mode === 1 ? e.evt.deltaY * line : mode === 2 ? e.evt.deltaY * page : e.evt.deltaY;

    const isZoomGesture = e.evt.ctrlKey || e.evt.metaKey || e.evt.altKey;
    if (isZoomGesture) {
      const scaleBy = 1.05;
      const direction = dy < 0 ? 1 : -1;
      const target = direction > 0 ? scale * scaleBy : scale / scaleBy;
      zoomAtScreenPoint(pointer, target);
    } else {
      setStagePos((pos) => ({ x: pos.x - dx, y: pos.y - dy }));
    }
  };

  const canInteractZones = currentTool !== "add-seat";
  useEffect(() => {
    if (currentTool !== "bend") return;
    const hasZoneSelected = selectedIds.some((id) => zones.some((z) => z.id === id));
    if (!hasZoneSelected && zones.length > 0) {
      setSelectedIds([zones[0].id]);
    }
  }, [currentTool, zones, selectedIds, setSelectedIds]);

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
        onDragStart={(e: KonvaEventObject<MouseEvent>) => {
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

        {backgroundImage && backgroundMode === "manual" && bgImg && backgroundRect ? (
          <Layer
            listening={currentTool === "select" && !isSpacePressed}
            children={[
              <KonvaImage
                key="bg"
                ref={bgNodeRef}
                image={bgImg}
                x={backgroundRect.x}
                y={backgroundRect.y}
                width={backgroundRect.width}
                height={backgroundRect.height}
                opacity={0.95}
                draggable={currentTool === "select" && !isSpacePressed}
                onClick={(e) => {
                  e.cancelBubble = true;
                  setBgSelected(true);
                }}
                onDragStart={() => setBgSelected(true)}
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
              />,
              <Transformer
                key="bgTr"
                ref={bgTrRef}
                nodes={bgSelected && bgNodeRef.current ? [bgNodeRef.current] : []} // ← только при выделении
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
              />,
            ]}
          />
        ) : null}

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

        <Layer
          listening={canInteractZones}
          children={[
            ...zones.map((zone) => (
              <ZoneComponent
                key={zone.id}
                zone={zone}
                seats={seats}
                rows={rows}
                isSelected={selectedIds.includes(zone.id)}
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
                scale={scale}
              />
            )),
            <DrawingZone
              key="drawing-zone"
              drawingZone={drawingZone}
              seatSpacingX={SEAT_SPACING_X}
              seatSpacingY={SEAT_SPACING_Y}
            />,
          ]}
        />

        {/* SHAPES */}
        <Layer
          listening={currentTool === "select" && !isSpacePressed}
          children={[
            ...shapes.map((sh) => {
              const cx = sh.x + sh.width / 2;
              const cy = sh.y + sh.height / 2;

              // снэп центра группы — чтобы вся фигура ложилась на пиксели
              const cxS = crisp(cx, scale);
              const cyS = crisp(cy, scale);

              const scaleX = sh.flipX ? -1 : 1;
              const scaleY = sh.flipY ? -1 : 1;

              return (
                <Group
                  key={sh.id}
                  ref={(node) => {
                    shapeRefs.current[sh.id] = node;
                  }}
                  x={cxS}
                  y={cyS}
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
                  {sh.kind === "rect" &&
                    (() => {
                      const r = crispRect(0, 0, sh.width, sh.height, scale);
                      return (
                        <Rect
                          x={r.x}
                          y={r.y}
                          width={r.width}
                          height={r.height}
                          fill={sh.fill ?? "#fff"}
                          stroke={sh.stroke ?? "#111827"}
                          strokeWidth={sh.strokeWidth ?? 1}
                          strokeScaleEnabled={false}
                        />
                      );
                    })()}
                  {sh.kind === "ellipse" && (
                    <Ellipse
                      x={crisp(sh.width / 2, scale)}
                      y={crisp(sh.height / 2, scale)}
                      radiusX={crispSize(sh.width / 2, scale)}
                      radiusY={crispSize(sh.height / 2, scale)}
                      fill={sh.fill ?? "#fff"}
                      stroke={sh.stroke ?? "#111827"}
                      strokeWidth={sh.strokeWidth ?? 1}
                      strokeScaleEnabled={false}
                    />
                  )}
                  {sh.kind === "polygon" && (
                    <Line
                      x={0}
                      y={0}
                      points={(sh.points ?? []).flatMap((p) => [
                        crisp(p.x, scale),
                        crisp(p.y, scale),
                      ])}
                      closed
                      fill={sh.fill ?? "#fff"}
                      stroke={sh.stroke ?? "#111827"}
                      strokeWidth={sh.strokeWidth ?? 1}
                      lineJoin="round"
                      strokeScaleEnabled={false}
                    />
                  )}
                </Group>
              );
            }),

            shapeDraft ? (
              <Group
                key="shape-draft"
                x={crisp(shapeDraft.x + shapeDraft.width / 2, scale)}
                y={crisp(shapeDraft.y + shapeDraft.height / 2, scale)}
                offsetX={shapeDraft.width / 2}
                offsetY={shapeDraft.height / 2}
                opacity={0.7}
                listening={false}
              >
                {shapeDraft.kind === "rect" ? (
                  <Rect
                    x={0}
                    y={0}
                    width={crispSize(shapeDraft.width, scale)}
                    height={crispSize(shapeDraft.height, scale)}
                    fill="rgba(0,0,0,0.03)"
                    stroke="#3B82F6"
                    dash={[6, 4]}
                    strokeScaleEnabled={false}
                  />
                ) : (
                  <Ellipse
                    x={crisp(shapeDraft.width / 2, scale)}
                    y={crisp(shapeDraft.height / 2, scale)}
                    radiusX={crispSize(shapeDraft.width / 2, scale)}
                    radiusY={crispSize(shapeDraft.height / 2, scale)}
                    fill="rgba(0,0,0,0.03)"
                    stroke="#3B82F6"
                    dash={[6, 4]}
                    strokeScaleEnabled={false}
                  />
                )}
              </Group>
            ) : null,
          ]}
        />
        {/* POLYGON DRAFT OVERLAY */}
        {currentTool === "add-polygon" && polyDraft ? (
          <Layer listening>
            {/* линия-резинка: существующие точки + курсор */}
            <Line
              x={0}
              y={0}
              points={[
                ...polyDraft.points.flatMap((p) => [p.x, p.y]),
                ...(lastPointerRef.current && stageRef.current
                  ? (() => {
                      const w = stageRef
                        .current!.getAbsoluteTransform()
                        .copy()
                        .invert()
                        .point(lastPointerRef.current!);
                      return [w.x, w.y];
                    })()
                  : []),
              ]}
              closed={false}
              stroke="#3B82F6"
              dash={[6, 4]}
              strokeWidth={1}
              lineJoin="round"
              listening={false}
            />

            {/* «магнит» на первой точке для замыкания */}
            {polyDraft.points.length > 0 && (
              <Circle
                x={polyDraft.points[0].x}
                y={polyDraft.points[0].y}
                radius={polyDraft.hoverFirst ? 7 : 5}
                fill={polyDraft.hoverFirst ? "#10B981" : "#111827"}
                opacity={polyDraft.hoverFirst ? 0.8 : 0.6}
                stroke="#FFFFFF"
                strokeWidth={1}
                onClick={() => {
                  if (polyDraft.points.length >= 3) finishPolygon();
                }}
              />
            )}

            {/* маленькие узлы уже поставленных точек */}
            {polyDraft.points.map((p, i) => (
              <Circle
                key={i}
                x={p.x}
                y={p.y}
                radius={3}
                fill="#111827"
                opacity={0.6}
                listening={false}
              />
            ))}
          </Layer>
        ) : null}

        {/* Свободные сиденья (вне зон) */}
        <Layer listening={currentTool === "select" && !isSpacePressed}>
          {seats
            .filter((s) => !s.zoneId)
            .map((s) => (
              <SeatComponent
                key={s.id}
                seat={s}
                isSelected={selectedIds.includes(s.id)}
                isRowSelected={false}
                onClick={handleElementClick}
                onDragEnd={(_e, seatAfterDrag) => {
                  // по желанию: оставляем снап ПОСЛЕ перетаскивания
                  const nx = Math.round(seatAfterDrag.x / GRID_SIZE) * GRID_SIZE;
                  const ny = Math.round(seatAfterDrag.y / GRID_SIZE) * GRID_SIZE;
                  setState((prev) => ({
                    ...prev,
                    seats: prev.seats.map((ss) => (ss.id === s.id ? { ...ss, x: nx, y: ny } : ss)),
                  }));
                }}
                offsetX={0}
                offsetY={0}
                isViewerMode={false}
                currentTool={currentTool}
                scale={scale}
              />
            ))}
        </Layer>

        {/* Тексты */}
        <Layer
          listening={currentTool === "select" && !isSpacePressed}
          children={[
            ...texts.map((t) => (
              <KonvaText
                key={t.id}
                ref={(node) => {
                  textRefs.current[t.id] = node;
                }}
                x={t.x}
 y={t.y}
                text={t.text}
                fontSize={Math.round(t.fontSize ?? 18)} // целый размер
                fill={t.fill ?? "#111827"}
                rotation={t.rotation ?? 0}
                draggable={currentTool === "select" && !isSpacePressed}
                onClick={(e) => handleElementClick(t.id, e)}
                 onDragStart={(e) => (e.cancelBubble = true)}
  onDragMove={(e) => (e.cancelBubble = true)}
  onDragEnd={(e) => {
    e.cancelBubble = true;
    const { x, y } = e.target.position(); // БЕЗ снапа
    setState((prev) => ({
      ...prev,
      texts: (prev.texts || []).map((tt) =>
        tt.id === t.id ? { ...tt, x, y } : tt
      ),
    }));
  }}
              />
            )),
          ]}
        />

        {/* Rotate transformer */}
        {currentTool === "rotate" && selectedIds.length === 1
          ? (() => {
              const selectedId = selectedIds[0];
              const zoneNode = zoneRefs.current[selectedId];
              const textNode = textRefs.current[selectedId];
              const shapeNode = shapeRefs.current[selectedId];
              const node = zoneNode ?? textNode ?? shapeNode;
              return node ? (
                <Layer
                  children={[
                    <Transformer
                      key="rot"
                      nodes={[node]}
                      rotateEnabled
                      enabledAnchors={[]}
                      onTransformEnd={() => {
                        const rotation = node.rotation();
                        setState((prev) => ({
                          ...prev,
                          zones: prev.zones.map((z) =>
                            z.id === selectedId ? { ...z, rotation } : z
                          ),
                          texts: prev.texts.map((t) =>
                            t.id === selectedId ? { ...t, rotation } : t
                          ),
                          shapes: prev.shapes.map((s) =>
                            s.id === selectedId ? { ...s, rotation } : s
                          ),
                        }));
                      }}
                    />,
                  ]}
                />
              ) : null;
            })()
          : null}

        {/* 🆕 Bend overlay — редактирование изгибов выбранной зоны */}
        {currentTool === "bend" && selectedIds.length === 1
          ? (() => {
              const z = zones.find((zz) => zz.id === selectedIds[0]);
              return z ? (
                <Layer
                  children={[
                    <ZoneBendOverlay
                      scale={scale}
                      key={`bend-${z.id}-${z.angleLeftDeg ?? 'na'}-${z.angleRightDeg ?? 'na'}`}
                      zone={z}
                      setZone={(updater) =>
                        setState((prev) => ({
                          ...prev,
                          zones: prev.zones.map((one) => (one.id === z.id ? updater(one) : one)),
                        }))
                      }
                      onCommit={(zoneAfter) => {
  setState(prev => ({
    ...prev,
    zones: prev.zones.map(z =>
      z.id === zoneAfter.id
        ? {
            ...z,
            angleLeftDeg:  zoneAfter.angleLeftDeg,   // только углы!
            angleRightDeg: zoneAfter.angleRightDeg,
          }
        : z
    ),
  }));
}}
                    />,
                  ]}
                />
              ) : null;
            })()
          : null}
        {/* Выделение (рамка) для text/shape/zone в режиме select */}
        {currentTool === "select" && selectedIds.length > 0
          ? (() => {
              // соберём конва-ноды по выбранным id: shape -> text -> zone
              const nodes = selectedIds
                .map((id) => shapeRefs.current[id] || textRefs.current[id] || zoneRefs.current[id])
                .filter(Boolean);

              return nodes.length ? (
                <Layer
                  listening={false}
                  children={[
                    <Transformer
                      key="select-tr"
                      nodes={nodes}
                      // без ручек — только рамка
                      enabledAnchors={[]}
                      rotateEnabled={false}
                      borderStroke="#3B82F6"
                      borderDash={[6, 4]}
                      padding={4}
                    />,
                  ]}
                />
              ) : null;
            })()
          : null}

        {/* Рамка выделения */}
        <Layer
          listening={false}
          children={[
            marquee.active ? (
              <Rect
                key="marquee"
                x={marquee.x}
                y={marquee.y}
                width={marquee.w}
                height={marquee.h}
                stroke="#3B82F6"
                strokeWidth={1}
                dash={[6, 4]}
                fill="rgba(59,130,246,0.06)"
              />
            ) : null,
          ]}
        />
      </Stage>

      <ZoomControls scale={scale} setScale={setScaleFromButtons} />
    </div>
  );
}

export default SeatmapCanvas;
