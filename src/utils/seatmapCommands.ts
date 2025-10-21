// src/utils/seatmapCommands.ts
import { SeatmapState } from '../pages/EditorPage';
import type { Row, Seat } from '../types/types';

export type AlignDirection = 'left' | 'center' | 'right';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const SNAP_Y_THRESHOLD = 14; 
function rowExtents(state: SeatmapState, rowId: string) {
  const seats = state.seats.filter(s => s.rowId === rowId);
  if (seats.length === 0) {
    const row = state.rows.find(r => r.id === rowId);
    const cx = row ? row.x : 0;
    return { minX: cx - 1, maxX: cx + 1, centerX: cx };
  }
  const xs = seats.map(s => s.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  return { minX, maxX, centerX: (minX + maxX) / 2 };
}

function renumberSeatsInRow(seats: Seat[], rowId: string, updateLabel = false): Seat[] {
  const rowSeats = seats.filter(s => s.rowId === rowId).sort((a, b) => a.x - b.x);
  return seats.map(s => {
    if (s.rowId !== rowId) return s;
    const idx = rowSeats.findIndex(x => x.id === s.id);
    const colIndex = idx + 1;
    return { ...s, colIndex, label: updateLabel ? String(colIndex) : s.label };
  });
}

function findClosestRow(rowsInZone: Row[], y: number): { row: Row | null; dy: number } {
  if (!rowsInZone.length) return { row: null, dy: Infinity };
  let best: Row = rowsInZone[0];
  let bestDy = Math.abs(y - best.y);
  for (let i = 1; i < rowsInZone.length; i++) {
    const cand = rowsInZone[i];
    const d = Math.abs(y - cand.y);
    if (d < bestDy) { best = cand; bestDy = d; }
  }
  return { row: best, dy: bestDy };
}

export function alignRows(state: SeatmapState, selectedIds: string[], dir: AlignDirection): SeatmapState {
  if (selectedIds.length === 0) return state;
  const selectedZones = state.zones.filter(z => selectedIds.includes(z.id)).map(z => z.id);
  const selectedRows  = new Set(state.rows.filter(r => selectedIds.includes(r.id)).map(r => r.id));
  state.seats.forEach(s => {
    if (selectedIds.includes(s.id) && s.rowId) selectedRows.add(s.rowId);
  });
  if (selectedZones.length === 0 && selectedRows.size === 0) return state;

  const next: SeatmapState = { ...state, rows: [...state.rows], seats: [...state.seats] };

  const rowsByZone = new Map<string, Row[]>();
  for (const r of state.rows) {
    if (selectedZones.includes(r.zoneId) || selectedRows.has(r.id)) {
      const arr = rowsByZone.get(r.zoneId) ?? [];
      arr.push(r);
      rowsByZone.set(r.zoneId, arr);
    }
  }

  for (const [zoneId, rowsInZone] of rowsByZone) {
    const zone = state.zones.find(z => z.id === zoneId);
    if (!zone) continue;

    for (const row of rowsInZone) {
      const seatsInRow = state.seats.filter(s => s.rowId === row.id);
      if (seatsInRow.length === 0) continue;

      const xs = seatsInRow.map(s => s.x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const centerX = (minX + maxX) / 2;

      const sectionLeft   = 0;
      const sectionRight  = zone.width;
      const sectionCenter = zone.width / 2;

      let targetAnchor = centerX;
      if (dir === 'left')   targetAnchor = minX;
      if (dir === 'right')  targetAnchor = maxX;

      const targetRow = dir === 'left' ? sectionLeft : dir === 'right' ? sectionRight : sectionCenter;
      let dx = targetRow - targetAnchor;

      const newMin = minX + dx;
      const newMax = maxX + dx;
      if (newMin < 0)             dx += -newMin;
      if (newMax > zone.width)    dx -= (newMax - zone.width);
      if (dx === 0) continue;

      const ri = next.rows.findIndex(r => r.id === row.id);
      if (ri >= 0) next.rows[ri] = { ...next.rows[ri], x: next.rows[ri].x + dx };
      for (let i = 0; i < next.seats.length; i++) {
        if (next.seats[i].rowId === row.id) {
          next.seats[i] = { ...next.seats[i], x: next.seats[i].x + dx };
        }
      }
    }
  }

  return next;
}


export function alignSeats(
  state: SeatmapState,
  selectedIds: string[],
  dir: AlignDirection
): SeatmapState {
  const selected = state.seats.filter(s => selectedIds.includes(s.id));
  if (selected.length === 0) return state;

  const planX   = new Map<string, number>();
  const planY   = new Map<string, number>();
  const planRow = new Map<string, string>();
  const touchedRowIds = new Set<string>();


  const byZone = new Map<string, Seat[]>();
  for (const s of selected) {
    const arr = byZone.get(s.zoneId) ?? [];
    arr.push(s);
    byZone.set(s.zoneId, arr);
  }

  for (const [zoneId, seatsSel] of byZone) {
    const zone = state.zones.find(z => z.id === zoneId);
    if (!zone) continue;

    const zoneRows = state.rows.filter(r => r.zoneId === zoneId);

    for (const s of seatsSel) {
      if (s.rowId) {
        const row = state.rows.find(r => r.id === s.rowId);
        if (row) {
          planRow.set(s.id, row.id);
          planY.set(s.id, row.y);
          touchedRowIds.add(row.id);
        }
      } else if (zoneRows.length) {
        const { row: nearest, dy } = findClosestRow(zoneRows, s.y);
        if (nearest && dy <= SNAP_Y_THRESHOLD) {
          planRow.set(s.id, nearest.id);
          planY.set(s.id, nearest.y);
          touchedRowIds.add(nearest.id);
        }
      }
    }


    const groups = new Map<string, Seat[]>();
    for (const s of seatsSel) {
      const key = planRow.get(s.id) ?? s.rowId ?? '__noRow__';
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }


    for (const [, group] of groups) {
      if (!group.length) continue;


      const lefts  = group.map(s => s.x - (s.radius ?? 0));
      const rights = group.map(s => s.x + (s.radius ?? 0));
      const selLeft   = Math.min(...lefts);
      const selRight  = Math.max(...rights);
      const selCenter = (selLeft + selRight) / 2;

      // Предлагаемые центры по общей оси: все на одну линию
      const proposed = new Map<string, number>();
      for (const s of group) {
        const r = s.radius ?? 0;
        let cx: number;
        if (dir === 'left')       cx = selLeft + r;
        else if (dir === 'right') cx = selRight - r;
        else                      cx = selCenter;
        proposed.set(s.id, cx);
      }


      let minNew = Infinity, maxNew = -Infinity;
      for (const s of group) {
        const r  = s.radius ?? 0;
        const cx = proposed.get(s.id)!;
        minNew = Math.min(minNew,  cx - r);
        maxNew = Math.max(maxNew,  cx + r);
      }
      let shift = 0;
      if (minNew < 0)             shift += -minNew;
      if (maxNew > zone.width)    shift -= (maxNew - zone.width);


      for (const s of group) {
        const r  = s.radius ?? 0;
        const nx = clamp(proposed.get(s.id)! + shift, r, zone.width - r);
        planX.set(s.id, nx);
      }
    }
  }


  if (planX.size === 0 && planY.size === 0) return state;


  let nextSeats = state.seats.map(s => {
    if (!selectedIds.includes(s.id)) return s;
    const nx  = planX.get(s.id) ?? s.x;
    const ny  = planY.get(s.id) ?? s.y;
    const rid = planRow.get(s.id) ?? s.rowId ?? null;
    return { ...s, x: nx, y: ny, rowId: rid };
  });

  for (const rowId of touchedRowIds) {
    nextSeats = renumberSeatsInRow(nextSeats, rowId, /*updateLabel*/ false);
  }

  return { ...state, seats: nextSeats };
}



export function distributeRows(state: SeatmapState, selectedIds: string[]): SeatmapState {
  const rowIds = new Set<string>();
  for (const id of selectedIds) {
    const r = state.rows.find(rr => rr.id === id);
    if (r) rowIds.add(r.id);
    const s = state.seats.find(ss => ss.id === id);
    if (s?.rowId) rowIds.add(s.rowId);
  }
  const rowsSel = state.rows.filter(r => rowIds.has(r.id));
  if (rowsSel.length < 3) return state;

  const next: SeatmapState = { ...state, rows: [...state.rows], seats: [...state.seats] };


  const byZone = new Map<string, Row[]>();
  for (const r of rowsSel) {
    const arr = byZone.get(r.zoneId) ?? [];
    arr.push(r);
    byZone.set(r.zoneId, arr);
  }

  for (const [, rowsInZone] of byZone) {
    const sorted = [...rowsInZone].sort((a, b) => a.x - b.x);
    const first = sorted[0], last = sorted[sorted.length - 1];
    const span = last.x - first.x;
    if (span <= 0) continue;

    for (let i = 1; i < sorted.length - 1; i++) {
      const r = sorted[i];
      const newX = first.x + (span * i) / (sorted.length - 1);
      const dx = newX - r.x;

      const ri = next.rows.findIndex(rr => rr.id === r.id);
      if (ri >= 0) next.rows[ri] = { ...next.rows[ri], x: newX };

      for (let si = 0; si < next.seats.length; si++) {
        if (next.seats[si].rowId === r.id) {
          next.seats[si] = { ...next.seats[si], x: next.seats[si].x + dx };
        }
      }
    }
  }

  return next;
}
