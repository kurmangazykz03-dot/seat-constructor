// src/components/seatmap/zoneWarp.ts
import type { Zone, Row, Seat } from "../../types/types";

const toRad = (deg: number) => (deg * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lp = (A: { x: number; y: number }, B: { x: number; y: number }, t: number) => ({
  x: lerp(A.x, B.x, t),
  y: lerp(A.y, B.y, t),
});

function rayHitY(x0: number, y0: number, dx: number, dy: number, yLine: number) {
  const EPS = 1e-6;
  const t = Math.abs(dy) < EPS ? 1e9 : (yLine - y0) / dy;
  return { x: x0 + dx * t, y: yLine };
}

/** Варп для клиновой зоны (две нижние угловые ручки). */
export function warpPointLocal(x: number, y: number, z: Zone) {
  const w = z.width, h = z.height;
  // zoneWarp.ts
const aL = toRad(z.angleLeftDeg ?? 90);
const aR = toRad(z.angleRightDeg ?? 90);


  const BL = { x: 0, y: h };
  const BR = { x: w, y: h };

  const dirL = { x: Math.cos(aL),  y: -Math.sin(aL) };
  const dirR = { x: -Math.cos(aR), y: -Math.sin(aR) };

  const TL = rayHitY(BL.x, BL.y, dirL.x, dirL.y, 0);
  const TR = rayHitY(BR.x, BR.y, dirR.x, dirR.y, 0);

  const u = w ? x / w : 0; // 0..1 слева→вправо
  const v = h ? y / h : 0; // 0..1 сверху→вниз

  const top = lp(TL, TR, u);
  const bottom = lp(BL, BR, u);
  return lp(top, bottom, v);
}

export function applyBendToZoneContent(
  state: { rows: Row[]; seats: Seat[] },
  zone: Zone
) {
  const warp = (p: { x: number; y: number }) => warpPointLocal(p.x, p.y, zone);

  const rows = state.rows.map((r) =>
    r.zoneId === zone.id ? { ...r, ...warp({ x: r.x, y: r.y }) } : r
  );

  const seats = state.seats.map((s) =>
    s.zoneId === zone.id ? { ...s, ...warp({ x: s.x, y: s.y }) } : s
  );

  return { rows, seats };
}