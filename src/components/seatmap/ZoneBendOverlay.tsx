// src/components/seatmap/ZoneBendOverlay.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";

import { Group, Path, Circle, Label, Tag, Text as KText } from "react-konva";
import Konva from "konva";
import type { Zone } from "../../types/types";
import { crisp } from "../../utils/crisp";
import { buildAngleWedgePathClamped } from "./zonePath";

type Props = {
  zone: Zone;
  setZone: (updater: (z: Zone) => Zone) => void; // не трогаем до onCommit
  onCommit?: (z: Zone) => void;
  scale: number;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const roundTo = (v: number, step: number) => Math.round(v / step) * step;

const MIN_ANGLE = 10;
const MAX_ANGLE = 170;
const MIN_TOP_WIDTH = 24;
const DEFAULT_ANGLE = 90; // ← стартуем из прямоугольника

const cot = (deg: number) => {
  const r = toRad(deg);
  const s = Math.sin(r), c = Math.cos(r);
  if (Math.abs(s) < 1e-6) return c >= 0 ? 1e12 : -1e12;
  return c / s;
};
const acotDeg = (c: number) => {
  if (!Number.isFinite(c)) return 90;
  let a = Math.atan(1 / c) * (180 / Math.PI);
  if (c < 0) a += 180;
  if (a <= 0) a += 180;
  return a;
};

function coerceLeftAngle(tryLeft: number, aRight: number, W: number, H: number, minTop = MIN_TOP_WIDTH) {
  const boundCotLeft = (W - minTop) / H - cot(aRight);
  const boundAngle = acotDeg(boundCotLeft);
  const a = Math.max(tryLeft, boundAngle);
  return clamp(a, MIN_ANGLE, MAX_ANGLE);
}
function coerceRightAngle(tryRight: number, aLeft: number, W: number, H: number, minTop = MIN_TOP_WIDTH) {
  const boundCotRight = (W - minTop) / H - cot(aLeft);
  const boundAngle = acotDeg(boundCotRight);
  const a = Math.max(tryRight, boundAngle);
  return clamp(a, MIN_ANGLE, MAX_ANGLE);
}

export default function ZoneBendOverlay({ zone, onCommit, scale }: Props) {
  const grpRef = useRef<Konva.Group>(null);
  const firstDragRef = useRef(false);

  const W = Math.max(1, zone.width);
  const H = Math.max(1, zone.height);

  const haveAngles =
    Number.isFinite(zone.angleLeftDeg) && Number.isFinite(zone.angleRightDeg);

  // локальные углы — если нет в зоне, стартуем с 90° (прямоугольник)
  const [aL, setAL] = useState<number>(haveAngles ? (zone.angleLeftDeg as number) : DEFAULT_ANGLE);
  const [aR, setAR] = useState<number>(haveAngles ? (zone.angleRightDeg as number) : DEFAULT_ANGLE);

  useEffect(() => {
  const have =
    Number.isFinite(zone.angleLeftDeg) && Number.isFinite(zone.angleRightDeg);
  setAL(have ? (zone.angleLeftDeg as number) : DEFAULT_ANGLE);
  setAR(have ? (zone.angleRightDeg as number) : DEFAULT_ANGLE);
  // при новой зоне начинаем «с нуля», подсказочный клин появится только если углы есть
  firstDragRef.current = false;
}, [zone.id, zone.angleLeftDeg, zone.angleRightDeg]);

  const BL = { x: 0, y: H };
  const BR = { x: W, y: H };

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

  const len = Math.max(60, Math.min(W, H) * 0.5);

  const leftHandlePos = (angleDeg: number) => ({
    x: crisp(BL.x + Math.cos(toRad(angleDeg)) * len, scale),
    y: crisp(BL.y - Math.sin(toRad(angleDeg)) * len, scale),
  });
  const rightHandlePos = (angleDeg: number) => ({
    x: crisp(BR.x - Math.cos(toRad(angleDeg)) * len, scale),
    y: crisp(BR.y - Math.sin(toRad(angleDeg)) * len, scale),
  });

  const angleFromLeftCorner = (p: { x: number; y: number }) => {
    const dx = p.x - BL.x;
    const dy = BL.y - p.y;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    return clamp(Math.round(deg), MIN_ANGLE, MAX_ANGLE);
  };
  const angleFromRightCorner = (p: { x: number; y: number }) => {
    const dx = BR.x - p.x;
    const dy = BR.y - p.y;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    return clamp(Math.round(deg), MIN_ANGLE, MAX_ANGLE);
  };

  const topWidth = useMemo(() => {
    const TLx = H * cot(aL);
    const TRx = W - H * cot(aR);
    return Math.max(0, TRx - TLx);
  }, [aL, aR, W, H]);
  // после topWidth добавь:
const topCorners = useMemo(() => {
  const safe = (a:number) => {
    const s = Math.sin(toRad(a));
    return Math.abs(s) < 1e-6 ? (Math.cos(toRad(a)) >= 0 ? 1e12 : -1e12) : Math.cos(toRad(a))/s;
  };
  let dxL = H * safe(aL);
  let dxR = H * safe(aR);
  dxL = clamp(dxL, 0, W - 1);
  dxR = clamp(dxR, 0, W - 1);
  if (dxL + dxR > W - 1) {
    const k = (W - 1) / (dxL + dxR);
    dxL *= k; dxR *= k;
  }
  const TLx = dxL;
  const TRx = W - dxR;
  return { TLx, TRx, cx: (TLx + TRx) / 2 };
}, [aL, aR, W, H]);


  const showPath = firstDragRef.current || haveAngles;
const pathStr = buildAngleWedgePathClamped(W, H, aL, aR);


  const getSnapStep = (evt: PointerEvent | MouseEvent | any) =>
    (evt?.ctrlKey || evt?.metaKey) ? 5 : (evt?.altKey ? 1 : 2);
  const isSymmetry = (evt: PointerEvent | MouseEvent | any) => !!evt?.shiftKey;

  const hudText = `L: ${aL}°   R: ${aR}°   Top: ${Math.round(topWidth)}px`;

  // ——— текущее положение ручек: до первого драга — ПРЯМО в нижних углах ———
 const leftHandle  = leftHandlePos(aL);
const rightHandle = rightHandlePos(aR);
  return (
    <Group
      ref={grpRef}
      x={crisp(zone.x, scale)}
      y={crisp(zone.y, scale)}
      rotation={zone.rotation ?? 0}
      listening
    >
      {/* превью-контур клина показываем только после начала редактирования */}
      {showPath && (
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
      )}


      {/* HUD */}

<Label x={leftHandle.x} y={leftHandle.y - 18} listening={false}>
  <Tag fill="rgba(15,23,42,0.9)" cornerRadius={8} />
  <KText text={`L: ${aL}°`} fontSize={12} fill="#fff" padding={6} />
</Label>


<Label x={rightHandle.x} y={rightHandle.y - 18} listening={false}>
  <Tag fill="rgba(15,23,42,0.9)" cornerRadius={8} />
  <KText text={`R: ${aR}°`} fontSize={12} fill="#fff" padding={6} />
</Label>


<Label x={crisp(topCorners.cx, scale)} y={crisp(-22, scale)} listening={false}>
  <Tag fill="rgba(15,23,42,0.9)" cornerRadius={8} />
  <KText text={`Top: ${Math.round(topWidth)}px`} fontSize={12} fill="#fff" padding={6} />
</Label>


{(!haveAngles && !firstDragRef.current) && (
  <KText
    text={"Shift — симметрия · Ctrl/Cmd — шаг 5° · Alt — тонко"}
    x={crisp(W/2, scale)}
    y={crisp(H + 20, scale)}
    fontSize={12}
    fill="#64748b"
    offsetX={180}           // чтобы примерно центрировать
    listening={false}
  />
)}


      {/* ЛЕВАЯ ручка */}
      <Circle
        x={leftHandle.x}
        y={leftHandle.y}
        radius={8}
        fill="#fff"
        stroke="#2563EB"
        strokeWidth={1.5}
        draggable
        dragBoundFunc={(abs) => {
          const p = toLocal(abs);
          const raw = angleFromLeftCorner(p);
          // держим на дуге
          const loc = leftHandlePos(raw);
          return toAbs(loc);
        }}
        onDragMove={(e) => {
          const p = toLocal(e.target.getAbsolutePosition());
          const step = getSnapStep(e.evt);
          let nextL = roundTo(angleFromLeftCorner(p), step);
          nextL = coerceLeftAngle(nextL, aR, W, H, MIN_TOP_WIDTH);

          if (isSymmetry(e.evt)) {
            let nextR = coerceRightAngle(nextL, nextL, W, H, MIN_TOP_WIDTH);
            setAL(nextL);
            setAR(nextR);
          } else {
            setAL(nextL);
          }

          if (!firstDragRef.current) firstDragRef.current = true;
          // зафиксируем позицию ручки по дуге (убирает дрожание)
          const loc = leftHandlePos(isSymmetry(e.evt) ? aL : nextL);
          e.target.setAbsolutePosition(toAbs(loc));
        }}
        onDragStart={(e) => {
          const st = e.target.getStage()?.container();
          if (st) st.style.cursor = "grabbing";
        }}
        onDragEnd={(e) => {
          const st = e.target.getStage()?.container();
          if (st) st.style.cursor = "grab";
          onCommit?.({ ...zone, angleLeftDeg: aL, angleRightDeg: aR });
        }}
        onMouseEnter={(e) => {
          const st = e.target.getStage()?.container();
          if (st) st.style.cursor = "grab";
        }}
        onMouseLeave={(e) => {
          const st = e.target.getStage()?.container();
          if (st) st.style.cursor = "default";
        }}
      />

      {/* ПРАВАЯ ручка */}
      <Circle
        x={rightHandle.x}
        y={rightHandle.y}
        radius={8}
        fill="#fff"
        stroke="#2563EB"
        strokeWidth={1.5}
        draggable
        dragBoundFunc={(abs) => {
          const p = toLocal(abs);
          const raw = angleFromRightCorner(p);
          const loc = rightHandlePos(raw);
          return toAbs(loc);
        }}
        onDragMove={(e) => {
          const p = toLocal(e.target.getAbsolutePosition());
          const step = getSnapStep(e.evt);
          let nextR = roundTo(angleFromRightCorner(p), step);
          nextR = coerceRightAngle(nextR, aL, W, H, MIN_TOP_WIDTH);

          if (isSymmetry(e.evt)) {
            let nextL = coerceLeftAngle(nextR, nextR, W, H, MIN_TOP_WIDTH);
            setAR(nextR);
            setAL(nextL);
          } else {
            setAR(nextR);
          }

          if (!firstDragRef.current) firstDragRef.current = true;
          const loc = rightHandlePos(isSymmetry(e.evt) ? aR : nextR);
          e.target.setAbsolutePosition(toAbs(loc));
        }}
        onDragStart={(e) => {
          const st = e.target.getStage()?.container();
          if (st) st.style.cursor = "grabbing";
        }}
        onDragEnd={(e) => {
          const st = e.target.getStage()?.container();
          if (st) st.style.cursor = "grab";
          onCommit?.({ ...zone, angleLeftDeg: aL, angleRightDeg: aR });
        }}
        onMouseEnter={(e) => {
          const st = e.target.getStage()?.container();
          if (st) st.style.cursor = "grab";
        }}
        onMouseLeave={(e) => {
          const st = e.target.getStage()?.container();
          if (st) st.style.cursor = "default";
        }}
      />
    </Group>
  );
}
