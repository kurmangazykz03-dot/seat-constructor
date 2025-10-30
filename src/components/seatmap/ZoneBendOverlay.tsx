// src/components/seatmap/ZoneBendOverlay.tsx
import React, { useMemo, useRef, useState } from "react";
import { Group, Path, Circle } from "react-konva";
import Konva from "konva";
import { Zone } from "../../types/types";
import { buildBentRectPath } from "./zonePath";
import { crisp } from "../../utils/crisp"
type Edge = "top" | "right" | "bottom" | "left";

type Props = {
  zone: Zone;
  setZone: (updater: (z: Zone) => Zone) => void;
  gridSize?: number;
  onCommit?: (z: Zone) => void;
   scale: number; 
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const snap = (n: number, step?: number) => (step ? Math.round(n / step) * step : n);

export default function ZoneBendOverlay({ zone, setZone, gridSize, onCommit,scale }: Props) {
  const [drag, setDrag] = useState<{
    edge: Edge | null;
    start: { x: number; y: number };     // старт в ЛОКАЛЬНЫХ координатах
    base: { bt: number; br: number; bb: number; bl: number }; // bend-значения на момент старта
  } | null>(null);

  const gs = gridSize ?? 1;
  const grpRef = useRef<Konva.Group>(null);

  const W = Math.max(1, zone.width);
  const H = Math.max(1, zone.height);
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
    const el = stage?.container();
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
    { key: "top" as const,    x: W / 2,  y: bt,        drag: updateTop },
    { key: "right" as const,  x: W + br, y: H / 2,     drag: updateRight },
    { key: "bottom" as const, x: W / 2,  y: H + bb,    drag: updateBottom },
    { key: "left" as const,   x: -bl,    y: H / 2,     drag: updateLeft },
  ];

  return (
    <Group ref={grpRef} x={zone.x}     // ← было zone.x
      y={zone.y}  rotation={zone.rotation ?? 0} listening>
      {/* Контур зоны по той же кривой, что и в ZoneComponent */}
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

      {/* Ручки */}
      {handles.map((handle) => (
        <Circle
          key={handle.key}
          x={crisp(handle.x, scale)}
  y={crisp(handle.y, scale)}
          radius={8}
          fill="#ffffff"
          stroke="#2563EB"
          strokeWidth={1.5}
          draggable
          strokeScaleEnabled={false}
          dragBoundFunc={(abs) => {
    // ограничиваем и СНАПИМ в ЛОКАЛЬНЫХ координатах, возвращаем в абсолютные
    const p = toLocal(abs);
    let nx = p.x, ny = p.y;

    switch (handle.key) {
      case "top":
      case "bottom": {
        nx = W / 2;
        // снап до клампа
        const sNy = snap(ny, gs);
        ny = clamp(sNy, -maxTopBottom, H + maxTopBottom);
        break;
      }
      case "left":
      case "right": {
        ny = H / 2;
        const sNx = snap(nx, gs);
        nx = clamp(sNx, -maxLeftRight, W + maxLeftRight);
        break;
      }
    }
    return toAbs({ x: nx, y: ny });
  }}
          onDragStart={(e) => {
            setCursor(e, "grabbing");
            const p = toLocal(e.target.getAbsolutePosition());
            setDrag({
              edge: handle.key,
              start: { x: p.x, y: p.y },
              base: { bt, br, bb, bl },
            });
          }}
            onDragMove={(e) => {
    const p = toLocal(e.target.getAbsolutePosition());

    // сразу считаем dx/dy от старта, но применяем СНАП к целевому значению бенда
    setZone((z) => {
      if (!drag) return z;

      // «сырые» сдвиги
      const dx = p.x - drag.start.x;
      const dy = p.y - drag.start.y;

      // кандидаты
      let nt = drag.base.bt;
      let nr = drag.base.br;
      let nb = drag.base.bb;
      let nl = drag.base.bl;

      switch (drag.edge) {
        case "top": {
          const raw = drag.base.bt + dy;
          nt = clamp(snap(raw, gs), -maxTopBottom, maxTopBottom);
          break;
        }
        case "bottom": {
          const raw = drag.base.bb + dy;
          nb = clamp(snap(raw, gs), -maxTopBottom, maxTopBottom);
          break;
        }
        case "right": {
          const raw = drag.base.br + dx;
          nr = clamp(snap(raw, gs), -maxLeftRight, maxLeftRight);
          break;
        }
        case "left": {
          const raw = drag.base.bl - dx; // влево — «+»
          nl = clamp(snap(raw, gs), -maxLeftRight, maxLeftRight);
          break;
        }
      }
      return { ...z, bendTop: nt, bendRight: nr, bendBottom: nb, bendLeft: nl };
    });
  }}

  onDragEnd={(e) => {
    setCursor(e, "grab");
    const p = toLocal(e.target.getAbsolutePosition());

    let newZone = zone;
    switch (handle.key) {
      case "top":
        newZone = { ...zone, bendTop:    clamp(snap(p.y,     gs), -maxTopBottom, maxTopBottom) };
        break;
      case "bottom":
        newZone = { ...zone, bendBottom: clamp(snap(p.y - H, gs), -maxTopBottom, maxTopBottom) };
        break;
      case "right":
        newZone = { ...zone, bendRight:  clamp(snap(p.x - W, gs), -maxLeftRight, maxLeftRight) };
        break;
      case "left":
        newZone = { ...zone, bendLeft:   clamp(snap(-p.x,    gs), -maxLeftRight, maxLeftRight) };
        break;
    }

    setZone(() => newZone);
    setDrag(null);
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
