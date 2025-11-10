// src/components/seatmap/ZoneBendOverlay.tsx
import Konva from "konva";
import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Text as KText, Label, Path, Tag } from "react-konva";
import type { Zone } from "../../types/types";
import { crisp } from "../../utils/crisp";
import { buildAngleWedgePathClamped } from "./zonePath";

/**
 * Оверлей для редактирования "клина" зоны:
 * - рисует превью клиновой формы
 * - показывает две ручки (слева/справа), которыми задаются углы
 * - показывает HUD (углы, ширину верха, подсказку по хоткеям)
 */
type Props = {
  zone: Zone;
  // setZone: сейчас не используется, вся фиксация идёт через onCommit
  setZone: (updater: (z: Zone) => Zone) => void;
  onCommit?: (z: Zone) => void; // вызывается при отпускании ручки
  scale: number; // текущий zoom (для crisp-позиционирования)
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const roundTo = (v: number, step: number) => Math.round(v / step) * step;

// Ограничения для углов
const MIN_ANGLE = 10;
const MAX_ANGLE = 170;
const MIN_TOP_WIDTH = 24; // минимальная ширина верхней стороны клина
const DEFAULT_ANGLE = 90; // 90° → прямоугольник

// cot(угол) в градусах с защитой от деления на 0
const cot = (deg: number) => {
  const r = toRad(deg);
  const s = Math.sin(r),
    c = Math.cos(r);
  if (Math.abs(s) < 1e-6) return c >= 0 ? 1e12 : -1e12;
  return c / s;
};

// arccot в градусах с приведением к диапазону (0..180)
const acotDeg = (c: number) => {
  if (!Number.isFinite(c)) return 90;
  let a = Math.atan(1 / c) * (180 / Math.PI);
  if (c < 0) a += 180;
  if (a <= 0) a += 180;
  return a;
};

/**
 * Поджимает левый угол так, чтобы:
 * - он не выходил за [MIN_ANGLE..MAX_ANGLE]
 * - совместно с правым углом давал минимум MIN_TOP_WIDTH для верхней стороны.
 */
function coerceLeftAngle(
  tryLeft: number,
  aRight: number,
  W: number,
  H: number,
  minTop = MIN_TOP_WIDTH
) {
  // ограничиваем cot слева, исходя из требуемой минимальной высоты верха
  const boundCotLeft = (W - minTop) / H - cot(aRight);
  const boundAngle = acotDeg(boundCotLeft);
  const a = Math.max(tryLeft, boundAngle);
  return clamp(a, MIN_ANGLE, MAX_ANGLE);
}

/**
 * Аналогично для правого угла.
 */
function coerceRightAngle(
  tryRight: number,
  aLeft: number,
  W: number,
  H: number,
  minTop = MIN_TOP_WIDTH
) {
  const boundCotRight = (W - minTop) / H - cot(aLeft);
  const boundAngle = acotDeg(boundCotRight);
  const a = Math.max(tryRight, boundAngle);
  return clamp(a, MIN_ANGLE, MAX_ANGLE);
}

export default function ZoneBendOverlay({ zone, onCommit, scale }: Props) {
  const grpRef = useRef<Konva.Group>(null);

  // флажок: был ли уже хоть один drag — до первого drag клин можно не показывать
  const firstDragRef = useRef(false);

  const W = Math.max(1, zone.width);
  const H = Math.max(1, zone.height);

  // есть ли в зоне сохранённые углы
  const haveAngles = Number.isFinite(zone.angleLeftDeg) && Number.isFinite(zone.angleRightDeg);

  // локальные углы редактора (не пишем в zone до onCommit):
  // если углы есть → берём их; иначе стартуем с 90°.
  const [aL, setAL] = useState<number>(haveAngles ? (zone.angleLeftDeg as number) : DEFAULT_ANGLE);
  const [aR, setAR] = useState<number>(haveAngles ? (zone.angleRightDeg as number) : DEFAULT_ANGLE);

  // Если поменялся zone (другая зона или углы) — сбрасываем локальное состояние
  useEffect(() => {
    const have = Number.isFinite(zone.angleLeftDeg) && Number.isFinite(zone.angleRightDeg);
    setAL(have ? (zone.angleLeftDeg as number) : DEFAULT_ANGLE);
    setAR(have ? (zone.angleRightDeg as number) : DEFAULT_ANGLE);
    // при новой зоне считаем, что редактирование ещё не начиналось
    firstDragRef.current = false;
  }, [zone.id, zone.angleLeftDeg, zone.angleRightDeg]);

  // нижние углы прямоугольника зоны
  const BL = { x: 0, y: H };
  const BR = { x: W, y: H };

  // Перевод абсолютных координат в локальные координаты группы (зоны)
  const toLocal = (abs: Konva.Vector2d) => {
    const grp = grpRef.current;
    if (!grp) return { x: 0, y: 0 };
    const inv = grp.getAbsoluteTransform().copy().invert();
    return inv.point(abs);
  };

  // Перевод локальных координат в абсолютные
  const toAbs = (loc: Konva.Vector2d) => {
    const grp = grpRef.current;
    if (!grp) return loc;
    return grp.getAbsoluteTransform().point(loc);
  };

  // длина луча от нижнего угла до ручки (дистанция до ручки управления)
  const len = Math.max(60, Math.min(W, H) * 0.5);

  // Положение левой ручки по углу
  const leftHandlePos = (angleDeg: number) => ({
    x: crisp(BL.x + Math.cos(toRad(angleDeg)) * len, scale),
    y: crisp(BL.y - Math.sin(toRad(angleDeg)) * len, scale),
  });

  // Положение правой ручки по углу
  const rightHandlePos = (angleDeg: number) => ({
    x: crisp(BR.x - Math.cos(toRad(angleDeg)) * len, scale),
    y: crisp(BR.y - Math.sin(toRad(angleDeg)) * len, scale),
  });

  // Угол из нижнего левого угла до произвольной точки
  const angleFromLeftCorner = (p: { x: number; y: number }) => {
    const dx = p.x - BL.x;
    const dy = BL.y - p.y;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    return clamp(Math.round(deg), MIN_ANGLE, MAX_ANGLE);
  };

  // Угол из нижнего правого угла до произвольной точки
  const angleFromRightCorner = (p: { x: number; y: number }) => {
    const dx = BR.x - p.x;
    const dy = BR.y - p.y;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    return clamp(Math.round(deg), MIN_ANGLE, MAX_ANGLE);
  };

  // Текущая ширина верхней стороны клина (по формулам из геометрии)
  const topWidth = useMemo(() => {
    const TLx = H * cot(aL);
    const TRx = W - H * cot(aR);
    return Math.max(0, TRx - TLx);
  }, [aL, aR, W, H]);

  // Координаты верхних углов (TLx, TRx) и центр верха (cx) — для HUD
  const topCorners = useMemo(() => {
    const safe = (a: number) => {
      const s = Math.sin(toRad(a));
      return Math.abs(s) < 1e-6 ? (Math.cos(toRad(a)) >= 0 ? 1e12 : -1e12) : Math.cos(toRad(a)) / s;
    };
    let dxL = H * safe(aL);
    let dxR = H * safe(aR);
    dxL = clamp(dxL, 0, W - 1);
    dxR = clamp(dxR, 0, W - 1);

    // Если суммы смещений больше допустимого — пропорционально "ужимаем"
    if (dxL + dxR > W - 1) {
      const k = (W - 1) / (dxL + dxR);
      dxL *= k;
      dxR *= k;
    }

    const TLx = dxL;
    const TRx = W - dxR;
    return { TLx, TRx, cx: (TLx + TRx) / 2 };
  }, [aL, aR, W, H]);

  // Показывать ли превью-контур:
  // - если есть сохранённые углы, или уже был хотя бы один drag
  const showPath = firstDragRef.current || haveAngles;

  // Строка path для превью клина (устойчивая к "узкому верху")
  const pathStr = buildAngleWedgePathClamped(W, H, aL, aR);

  // Шаг привязки по углу:
  //  - Ctrl/Cmd → крупный шаг 5°
  //  - Alt → тонкий шаг 1°
  //  - иначе → 2°
  const getSnapStep = (evt: PointerEvent | MouseEvent | any) =>
    evt?.ctrlKey || evt?.metaKey ? 5 : evt?.altKey ? 1 : 2;

  // Режим симметрии: с зажатым Shift обе стороны становятся одинаковыми (L=R)
  const isSymmetry = (evt: PointerEvent | MouseEvent | any) => !!evt?.shiftKey;

  // Текстовое представление текущих значений (если нужно где-то ещё)
  const hudText = `L: ${aL}°   R: ${aR}°   Top: ${Math.round(topWidth)}px`;

  // Текущие позиции ручек
  const leftHandle = leftHandlePos(aL);
  const rightHandle = rightHandlePos(aR);

  return (
    <Group
      ref={grpRef}
      x={crisp(zone.x, scale)}
      y={crisp(zone.y, scale)}
      rotation={zone.rotation ?? 0}
      listening
    >
      {/* Превью-контур клина (пунктир) */}
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

      {/* HUD по углам и ширине верха */}
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

      {/* Подсказка по горячим клавишам — только пока углы не заданы и не было drag */}
      {!haveAngles && !firstDragRef.current && (
        <KText
          text={"Shift — симметрия · Ctrl/Cmd — шаг 5° · Alt — тонко"}
          x={crisp(W / 2, scale)}
          y={crisp(H + 20, scale)}
          fontSize={12}
          fill="#64748b"
          offsetX={180} // примерно центрируем по зоне
          listening={false}
        />
      )}

      {/* ЛЕВАЯ ручка (управление левым углом) */}
      <Circle
        x={leftHandle.x}
        y={leftHandle.y}
        radius={8}
        fill="#fff"
        stroke="#2563EB"
        strokeWidth={1.5}
        draggable
        // Ограничиваем drag так, чтобы ручка всегда оставалась на дуге вокруг BL
        dragBoundFunc={(abs) => {
          const p = toLocal(abs);
          const raw = angleFromLeftCorner(p);
          const loc = leftHandlePos(raw);
          return toAbs(loc);
        }}
        onDragMove={(e) => {
          const p = toLocal(e.target.getAbsolutePosition());
          const step = getSnapStep(e.evt);

          // Считаем новый угол по положению ручки
          let nextL = roundTo(angleFromLeftCorner(p), step);
          // Поджимаем, чтобы не нарушать минимальную ширину верха
          nextL = coerceLeftAngle(nextL, aR, W, H, MIN_TOP_WIDTH);

          if (isSymmetry(e.evt)) {
            // Симметрия: устанавливаем оба угла равными (с учётом ограничений)
            let nextR = coerceRightAngle(nextL, nextL, W, H, MIN_TOP_WIDTH);
            setAL(nextL);
            setAR(nextR);
          } else {
            setAL(nextL);
          }

          if (!firstDragRef.current) firstDragRef.current = true;

          // Подвязываем фактическую позицию ручки к дуге (убираем "дрожание")
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
          // Фиксируем изменения в zone через onCommit
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

      {/* ПРАВАЯ ручка (управление правым углом) */}
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
