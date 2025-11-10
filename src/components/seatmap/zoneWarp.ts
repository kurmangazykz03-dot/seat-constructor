// src/components/seatmap/zoneWarp.ts
import type { Row, Seat, Zone } from "../../types/types";

// Градусы → радианы
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Линейная интерполяция
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Линейная интерполяция по отрезку AB
const lp = (A: { x: number; y: number }, B: { x: number; y: number }, t: number) => ({
  x: lerp(A.x, B.x, t),
  y: lerp(A.y, B.y, t),
});

/**
 * Пересечение луча с горизонтальной линией y = yLine
 *
 * @param x0,y0 — начальная точка луча
 * @param dx,dy — направление луча
 * @param yLine — вертикальная координата линии
 */
function rayHitY(x0: number, y0: number, dx: number, dy: number, yLine: number) {
  const EPS = 1e-6;
  // t = параметр по лучу (x = x0 + dx * t, y = y0 + dy * t)
  // если dy почти 0 — считаем t огромным, чтобы "не ломаться"
  const t = Math.abs(dy) < EPS ? 1e9 : (yLine - y0) / dy;
  return { x: x0 + dx * t, y: yLine };
}

/**
 * Преобразует локальную точку (x, y) внутри прямоугольной зоны
 * в координаты "изогнутой" (клиновой) зоны по углам angleLeftDeg/angleRightDeg.
 *
 * ВАЖНО: x и y — локальные координаты внутри зоны [0..width] × [0..height].
 */
export function warpPointLocal(x: number, y: number, z: Zone) {
  const w = z.width,
    h = z.height;

  // Углы в радианах; по умолчанию 90° (прямоугольник без изгиба)
  const aL = toRad(z.angleLeftDeg ?? 90);
  const aR = toRad(z.angleRightDeg ?? 90);

  // Нижние точки прямоугольника: левый/правый низ
  const BL = { x: 0, y: h };
  const BR = { x: w, y: h };

  // Направления лучей из нижних углов по заданным углам
  const dirL = { x: Math.cos(aL), y: -Math.sin(aL) };
  const dirR = { x: -Math.cos(aR), y: -Math.sin(aR) };

  // Ищем, где эти лучи пересекут верхнюю горизонтальную линию y = 0
  const TL = rayHitY(BL.x, BL.y, dirL.x, dirL.y, 0);
  const TR = rayHitY(BR.x, BR.y, dirR.x, dirR.y, 0);

  // Нормализованные координаты внутри прямоугольника:
  // u — вдоль ширины [0..1], v — вдоль высоты [0..1]
  const u = w ? x / w : 0;
  const v = h ? y / h : 0;

  // Берём точку на верхнем ребре (между TL и TR) и на нижнем (между BL и BR)
  const top = lp(TL, TR, u);
  const bottom = lp(BL, BR, u);

  // А затем интерполируем между верхом и низом по v
  return lp(top, bottom, v);
}

/**
 * Применяет "изгиб" (bend) к содержимому зоны:
 * пересчитывает координаты всех рядов и мест внутри указанной зоны.
 *
 * ОЖИДАНИЕ: x/y рядов и мест — ЛОКАЛЬНЫЕ координаты внутри зоны (0..width / 0..height).
 */
export function applyBendToZoneContent(state: { rows: Row[]; seats: Seat[] }, zone: Zone) {
  // Обёртка: warp(p) → новая точка в клиновой геометрии
  const warp = (p: { x: number; y: number }) => warpPointLocal(p.x, p.y, zone);

  // Для рядов: если row.zoneId === zone.id — применяем warp к (x, y)
  const rows = state.rows.map((r) =>
    r.zoneId === zone.id ? { ...r, ...warp({ x: r.x, y: r.y }) } : r
  );

  // Для мест: аналогично — двигаем только те, что принадлежат зоне
  const seats = state.seats.map((s) =>
    s.zoneId === zone.id ? { ...s, ...warp({ x: s.x, y: s.y }) } : s
  );

  return { rows, seats };
}
