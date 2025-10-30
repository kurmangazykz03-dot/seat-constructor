import React, { useEffect, useMemo, useRef, useState } from "react";

import { SeatmapState } from "../../pages/EditorPage";
import BackgroundImageLayer from "../seatmap/BackgroundImageLayer";
import ZoneComponent from "../seatmap/ZoneComponent";
import ZoomControls from "../seatmap/ZoomControls";

import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  Ellipse,
  Group,
  Image as KonvaImage,
  Text as KonvaText,
  Layer,
  Line,
  Rect,
  Stage,
} from "react-konva";
import useImage from "use-image";
import SeatComponent from '../seatmap/SeatComponent'

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
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // сиденье выделяем только одно — из пропса selectedSeatId
  const selectedIds = useMemo(() => (selectedSeatId ? [selectedSeatId] : []), [selectedSeatId]);

  // клик из ZoneComponent приходит с id места/ряда/зоны — нам нужен seat
  const handleElementClick = (id: string) => {
    const seat = state.seats.find((s) => s.id === id) || null;
    onSeatSelect(seat);
  };

  // фон (если в v2 сохранён backgroundImage)
  const [img] = useImage(state.backgroundImage || "", "anonymous");
  const stageRef = useRef<Konva.Stage | null>(null); // было any → сделаем точнее
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const zoomAtScreenPoint = (anchor: { x: number; y: number }, nextScaleRaw: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const nextScale = clamp(nextScaleRaw, 0.4, 3);
    const world = stage.getAbsoluteTransform().copy().invert().point(anchor);
    const newPos = { x: anchor.x - world.x * nextScale, y: anchor.y - world.y * nextScale };
    setScale(nextScale);
    setPosition(newPos);
  };

  // хоткей Space
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const editing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (editing) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpacePressed(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const el = stageRef.current?.container();
    if (!el) return;
    el.style.touchAction = "none";
    el.style.cursor = isSpacePressed ? "grab" : "default";
  }, [isSpacePressed]);

  // колесо/тачпад
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current || e.target.getStage?.();
    if (!stage) return;
    const p = stage.getPointerPosition();
    if (!p) return;
    lastPointerRef.current = p;

    const mode = e.evt.deltaMode; // 0 px, 1 line, 2 page
    const line = 40,
      page = 800;
    const dx = mode === 1 ? e.evt.deltaX * line : mode === 2 ? e.evt.deltaX * page : e.evt.deltaX;
    const dy = mode === 1 ? e.evt.deltaY * line : mode === 2 ? e.evt.deltaY * page : e.evt.deltaY;

    const isZoom = e.evt.ctrlKey || e.evt.metaKey || e.evt.altKey; // pinch на тачпаде → ctrlKey=true
    if (isZoom) {
      const scaleBy = 1.05;
      const dir = dy < 0 ? 1 : -1;
      const target = dir > 0 ? scale * scaleBy : scale / scaleBy;
      zoomAtScreenPoint(p, target);
    } else {
      setPosition((pos) => ({ x: pos.x - dx, y: pos.y - dy }));
    }
  };

  // кнопки зума — зум к последней точке/центру
  const handleSetScale = (newScale: number) => {
    const anchor = lastPointerRef.current ?? { x: width / 2, y: height / 2 };
    zoomAtScreenPoint(anchor, newScale);
  };

  return (
    <div>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={isSpacePressed}
        dragDistance={2}
        onWheel={handleWheel}
        onMouseMove={(e) => {
          const p = e.target.getStage()?.getPointerPosition();
          if (p) lastPointerRef.current = p;
        }}
        onDragStart={(e) => {
          if (e.target === e.target.getStage()) {
            const el = stageRef.current?.container();
            if (el) el.style.cursor = "grabbing";
          }
        }}
        onDragMove={() => {
          const st = stageRef.current;
          if (st) setPosition(st.position());
        }}
        onDragEnd={() => {
          const st = stageRef.current;
          if (st) setPosition(st.position());
          const el = st?.container();
          if (el) el.style.cursor = isSpacePressed ? "grab" : "default";
        }}
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
            fit={state.backgroundFit ?? "contain"}
            opacity={0.95}
          />
        ) : null}
        {/* SHAPES under zones */}
        <Layer listening={false}>
          {state.shapes?.map((sh) => {
            const w = sh.width ?? 0;
            const h = sh.height ?? 0;
            const cx = (sh.x ?? 0) + w / 2;
            const cy = (sh.y ?? 0) + h / 2;

            return (
              <Group
                key={sh.id}
                x={cx}
                y={cy}
                rotation={sh.rotation ?? 0}
                scaleX={sh.flipX ? -1 : 1}
                scaleY={sh.flipY ? -1 : 1}
                opacity={sh.opacity ?? 1}
                listening={false}
              >
                {sh.kind === "rect" && (
                  <Rect
                    x={-w / 2}
                    y={-h / 2}
                    width={w}
                    height={h}
                    fill={sh.fill ?? "#ffffff"}
                    stroke={sh.stroke ?? "#111827"}
                    strokeWidth={sh.strokeWidth ?? 1}
                    listening={false}
                  />
                )}

                {sh.kind === "ellipse" && (
                  <Ellipse
                    x={0}
                    y={0}
                    radiusX={w / 2}
                    radiusY={h / 2}
                    fill={sh.fill ?? "#ffffff"}
                    stroke={sh.stroke ?? "#111827"}
                    strokeWidth={sh.strokeWidth ?? 1}
                    listening={false}
                  />
                )}

                {sh.kind === "polygon" && sh.points && (
                  <Line
                    // точки считаем относительными к шейпу (как в редакторе)
                    points={sh.points.flatMap((p) => [p.x - w / 2, p.y - h / 2])}
                    closed
                    fill={sh.fill ?? "#ffffff"}
                    stroke={sh.stroke ?? "#111827"}
                    strokeWidth={sh.strokeWidth ?? 1}
                    listening={false}
                  />
                )}
              </Group>
            );
          })}
        </Layer>

        <Layer listening>
          {state.zones.map((zone) => (
            <ZoneComponent
              key={zone.id}
              zone={zone}
              seats={state.seats}
              rows={state.rows}
              setState={() => {
                /* readonly */
              }}
              selectedIds={selectedIds}
              setSelectedIds={() => {}}
              currentTool="select"
              handleElementClick={(_id: string) => handleElementClick(_id)}
              hoveredZoneId={null}
              setHoveredZoneId={() => {}}
              isViewerMode={true}
              isSelected={selectedIds.includes(zone.id)}
              setGroupRef={() => {}}
              scale={scale}
            />
          ))}
        </Layer>
        {/* TEXTS over everything */}
        <Layer listening={false}>
          {state.texts?.map((t) => (
            <KonvaText
              key={t.id}
              x={t.x}
              y={t.y}
              text={t.text ?? ""}
              fontSize={t.fontSize ?? 18}
              fill={t.fill ?? "#111827"}
              rotation={t.rotation ?? 0}
              listening={false}
            />
          ))}
        </Layer>

        <Layer listening>
  {state.seats
    .filter((s) => !s.zoneId) // только свободные
    .map((s) => (
      <SeatComponent
        key={s.id}
        seat={s}
        isSelected={selectedSeatId === s.id}
        isRowSelected={false}
        onClick={(_id) => onSeatSelect(state.seats.find(ss => ss.id === _id) ?? null)}
        onDragEnd={() => { /* viewer read-only */ }}
        offsetX={0}
        offsetY={0}
        isViewerMode={true}
        currentTool={"select" as const}
        scale={scale}
      />
    ))}
</Layer>

      </Stage>

      <ZoomControls scale={scale} setScale={handleSetScale} />
    </div>
  );
};

export default SeatmapViewerCanvas;
