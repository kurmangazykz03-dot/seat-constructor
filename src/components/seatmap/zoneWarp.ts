// src/components/seatmap/zoneWarp.ts
import { Row, Seat, Zone } from "../../types/types";

type V = { x: number; y: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const qbez = (p0: V, p1: V, p2: V, t: number): V => {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
};

export function warpPointLocal(x: number, y: number, z: Zone): V {
  const w = z.width, h = z.height;
  const bt = z.bendTop ?? 0, br = z.bendRight ?? 0, bb = z.bendBottom ?? 0, bl = z.bendLeft ?? 0;

  const u = w ? x / w : 0;
  const v = h ? y / h : 0;

  const T = qbez({ x: 0, y: 0 }, { x: w / 2, y: bt },    { x: w, y: 0 }, u);
  const B = qbez({ x: 0, y: h }, { x: w / 2, y: h + bb },{ x: w, y: h }, u);
  const Ptb = { x: lerp(T.x, B.x, v), y: lerp(T.y, B.y, v) };

  const L = qbez({ x: 0, y: 0 }, { x: -bl,   y: h / 2 }, { x: 0, y: h }, v);
  const R = qbez({ x: w, y: 0 }, { x: w + br, y: h / 2 }, { x: w, y: h }, v);
  const Plr = { x: lerp(L.x, R.x, u), y: lerp(L.y, R.y, u) };

  return {
    x: Ptb.x + (Plr.x - lerp(0, w, u)),
    y: Plr.y + (Ptb.y - lerp(0, h, v)),
  };
}

export function applyBendToZoneContent(
  state: { rows: Row[]; seats: Seat[] },
  zone: Zone
) {
  const warp = (p: V) => warpPointLocal(p.x, p.y, zone);

  const rows = state.rows.map((r) =>
    r.zoneId === zone.id ? { ...r, ...warp({ x: r.x, y: r.y }) } : r
  );

  const seats = state.seats.map((s) =>
    s.zoneId === zone.id ? { ...s, ...warp({ x: s.x, y: s.y }) } : s
  );

  return { rows, seats };
}
