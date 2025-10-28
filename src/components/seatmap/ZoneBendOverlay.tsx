// src/components/seatmap/ZoneBendOverlay.tsx
import React, { useMemo, useRef } from "react";
import { Group, Path, Circle } from "react-konva";
import Konva from "konva";
import { Zone } from "../../types/types";
import { buildBentRectPath } from "./zonePath";

type Props = {
  zone: Zone;
  setZone: (updater: (z: Zone) => Zone) => void;
  gridSize?: number;
  onCommit?: (z: Zone) => void;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const snap = (n: number, step?: number) => (step ? Math.round(n / step) * step : n);

export default function ZoneBendOverlay({ zone, setZone, gridSize, onCommit }: Props) {
  const gs = gridSize ?? 1;
  const grpRef = useRef<Konva.Group>(null);

  const W = zone.width;
  const H = zone.height;

  const bt = zone.bendTop ?? 0;
  const br = zone.bendRight ?? 0;
  const bb = zone.bendBottom ?? 0;
  const bl = zone.bendLeft ?? 0;

const maxTopBottom = Math.max(20, Math.floor(H * 0.9));
 const maxLeftRight = Math.max(20, Math.floor(W * 0.9));

  const pathStr = useMemo(
    () => buildBentRectPath(W, H, bt, br, bb, bl),
    [W, H, bt, br, bb, bl]
  );

  const toLocal = (abs: Konva.Vector2d) => {
    const grp = grpRef.current;
    if (!grp) return { x: 0, y: 0 };
    const inv = grp.getAbsoluteTransform().copy().invert();
    return inv.point(abs);
  };
  const toAbs = (loc: Konva.Vector2d) => {
   const grp = grpRef.current;
    if (!grp) return loc;
    return grp.getAbsoluteTransform().point(loc);
  };

  const setCursor = (e: any, cursor: string) => {
    const stage: Konva.Stage | null = e.target.getStage();
    if (!stage) return;
    const el = stage.container();
    if (el) el.style.cursor = cursor;
  };

  // обновления со снапом
  const updateTop = (abs: Konva.Vector2d) => {
    const p = toLocal(abs);
    setZone((z) => ({ ...z, bendTop: clamp(snap(p.y, gs), -maxTopBottom, maxTopBottom) }));
  };
  const updateBottom = (abs: Konva.Vector2d) => {
    const p = toLocal(abs);
    setZone((z) => ({ ...z, bendBottom: clamp(snap(p.y - H, gs), -maxTopBottom, maxTopBottom) }));
  };
  const updateRight = (abs: Konva.Vector2d) => {
    const p = toLocal(abs);
    setZone((z) => ({ ...z, bendRight: clamp(snap(p.x - W, gs), -maxLeftRight, maxLeftRight) }));
  };
  const updateLeft = (abs: Konva.Vector2d) => {
    const p = toLocal(abs);
    setZone((z) => ({ ...z, bendLeft: clamp(snap(-p.x, gs), -maxLeftRight, maxLeftRight) }));
  };

  const handles = [
    { key: "top",    x: W / 2,  y: bt,        drag: updateTop },
    { key: "right",  x: W + br, y: H / 2,     drag: updateRight },
    { key: "bottom", x: W / 2,  y: H + bb,    drag: updateBottom },
    { key: "left",   x: -bl,    y: H / 2,     drag: updateLeft },
  ] as const;

  return (
    <Group ref={grpRef} x={zone.x} y={zone.y} rotation={zone.rotation ?? 0} listening>
      <Path
        data={pathStr}
        listening={false}
        stroke="#3B82F6"
        strokeWidth={1.5}
        dashEnabled
        dash={[8, 6]}
        fillEnabled={false}
        perfectDrawEnabled={false}
        hitStrokeWidth={10}
        strokeScaleEnabled={false}
      />

      {handles.map((handle) => (
        <Circle
          key={handle.key}
          x={handle.x}
          y={handle.y}
          radius={8}
          fill="#ffffff"
          stroke="#2563EB"
          strokeWidth={1.5}
          draggable
          strokeScaleEnabled={false}
             dragBoundFunc={(abs) => {
           // Работаем в ЛОКАЛЬНЫХ координатах группы, затем обратно в абсолютные
            const p = toLocal(abs);
            let nx = p.x, ny = p.y;
            switch (handle.key) {
              case "top":
              case "bottom":
                nx = W / 2;
                ny = snap(clamp(ny, -maxTopBottom, H + maxTopBottom), gs);
                break;
              case "left":
              case "right":
                ny = H / 2;
                nx = snap(clamp(nx, -maxLeftRight, W + maxLeftRight), gs);
                break;
            }
           return toAbs({ x: nx, y: ny });
          }}
         onDragStart={(e) => setCursor(e, "grabbing")}
          onDragMove={(e) => handle.drag(e.target.getAbsolutePosition())}
          onDragEnd={(e) => {
            setCursor(e, "grab");
            const p = toLocal(e.target.getAbsolutePosition());

            let newZone = zone;
            switch (handle.key) {
              case "top":
                 newZone = { ...zone, bendTop: clamp(snap(p.y, gs), -maxTopBottom, maxTopBottom) };
                break;
              case "bottom":
                newZone = { ...zone, bendBottom: clamp(snap(p.y - H, gs), -maxTopBottom, maxTopBottom) };
                break;
              case "right":
                newZone = { ...zone, bendRight: clamp(snap(p.x - W, gs), -maxLeftRight, maxLeftRight) };
                break;
              case "left":
newZone = { ...zone, bendLeft: clamp(snap(-p.x, gs), -maxLeftRight, maxLeftRight) };
                break;
            }
            setZone(() => newZone);
            onCommit?.(newZone);
          }}
          onMouseEnter={(e) => setCursor(e, "grab")}
          onMouseLeave={(e) => setCursor(e, "default")}
          shadowBlur={2}
        />
      ))}
    </Group>
  );
}
