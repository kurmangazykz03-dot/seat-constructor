// src/utils/seatmapCommands.ts
import { SeatmapState } from '../pages/EditorPage';
import type { Row, Seat } from '../types/types';

export type AlignDirection = 'left' | 'center' | 'right';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const SNAP_Y_THRESHOLD = 14; // для автопривязки сиденья к ряду по Y
const ALIGN_SOFT_MAX_STEP = 20; // px — максимум, на который можно сдвинуться за одно выравнивание
const ALIGN_SNAP_EPS     = 6;   // px — если ближе этого порога к цели, то дотягиваем точно

// ===== helpers =====
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
// ====================

/** ВЫРАВНИВАНИЕ РЯДОВ (и их сидений) внутри своих зон по left/center/right. */
export function alignRows(state: SeatmapState, selectedIds: string[], dir: AlignDirection): SeatmapState {
  if (selectedIds.length === 0) return state;

  // какие ряды трогаем: выбранные ряды, ряды зон, где выбрана зона, либо ряды сидений
  const selectedZones = state.zones.filter(z => selectedIds.includes(z.id)).map(z => z.id);
  const selectedRows  = new Set(state.rows.filter(r => selectedIds.includes(r.id)).map(r => r.id));
  state.seats.forEach(s => {
    if (selectedIds.includes(s.id) && s.rowId) selectedRows.add(s.rowId);
  });
  if (selectedZones.length === 0 && selectedRows.size === 0) return state;

  const next: SeatmapState = { ...state, rows: [...state.rows], seats: [...state.seats] };

  // сгруппируем ряды по зоне
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

      // безопасно в границах зоны
      const newMin = minX + dx;
      const newMax = maxX + dx;
      if (newMin < 0)             dx += -newMin;
      if (newMax > zone.width)    dx -= (newMax - zone.width);
      if (dx === 0) continue;

      // сдвигаем ряд (коорд. row.x) и все его сиденья по X
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

/** ВЫРАВНИВАНИЕ СИДЕНИЙ — по своему ряду. Сиденья без rowId — автопривязка к ближайшему ряду по Y (порог SNAP_Y_THRESHOLD). */
export function alignSeats(state: SeatmapState, selectedIds: string[], dir: AlignDirection): SeatmapState {
  const selected = state.seats.filter(s => selectedIds.includes(s.id));
  if (selected.length === 0) return state;

  const plan = new Map<string, number>();
  const touchedRowIds = new Set<string>();

  // сгруппировать выбранные по зоне
  const byZone = new Map<string, Seat[]>();
  for (const s of selected) {
    const arr = byZone.get(s.zoneId) ?? [];
    arr.push(s);
    byZone.set(s.zoneId, arr);
  }

  for (const [zoneId, seatsInZoneSelected] of byZone) {
    const zone = state.zones.find(z => z.id === zoneId);
    if (!zone) continue;

    const zoneRows = state.rows.filter(r => r.zoneId === zoneId);

    // автопривязка без rowId
    const autoAttached: Record<string,string> = {}; // seatId -> rowId
    for (const s of seatsInZoneSelected) {
      if (s.rowId) continue;
      const { row: closest, dy } = findClosestRow(zoneRows, s.y);
      if (closest && dy <= SNAP_Y_THRESHOLD) {
        autoAttached[s.id] = closest.id;
        touchedRowIds.add(closest.id);
      }
    }

    // группы по rowId
    const groups = new Map<string, Seat[]>();
    for (const s of seatsInZoneSelected) {
      const rowId = s.rowId ?? autoAttached[s.id] ?? null;
      const key = rowId ?? '__no-row__';
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }

    for (const [key, group] of groups) {
      if (key === '__no-row__' || group.length === 0) continue;
      const rowId = key;
      const row = state.rows.find(r => r.id === rowId);
      if (!row) continue;

      const { minX: rowMin, maxX: rowMax, centerX: rowCenter } = rowExtents(state, rowId);

      const xs = group.map(s => s.x);
      const selMin = Math.min(...xs);
      const selMax = Math.max(...xs);
      const selCenter = (selMin + selMax) / 2;

      const anchor = dir === 'left' ? selMin : dir === 'right' ? selMax : selCenter;
const target = dir === 'left' ? rowMin : dir === 'right' ? rowMax : rowCenter;

// 1) "мягкий" шаг — двигаемся не дальше cap, но если уже почти дошли — дотягиваем
const fullDx = target - anchor;
let dx = fullDx;
const abs = Math.abs(fullDx);

if (abs <= ALIGN_SNAP_EPS) {
  // почти на месте — дотягиваем до цели
  dx = fullDx;
} else if (abs > ALIGN_SOFT_MAX_STEP) {
  // ограничиваем максимум шага
  dx = (fullDx / abs) * ALIGN_SOFT_MAX_STEP;
}

// 2) затем стандартная проверка границ зоны
const maxRadius = Math.max(...group.map(s => s.radius ?? 0));
const newMin = selMin + dx;
const newMax = selMax + dx;
if (newMin < maxRadius)              dx += (maxRadius - newMin);
if (newMax > zone.width - maxRadius) dx -= (newMax - (zone.width - maxRadius));

if (dx === 0) continue;

      

      if (dx !== 0) {
        for (const s of group) {
          const r = s.radius ?? 0;
          plan.set(s.id, clamp(s.x + dx, r, zone.width - r));
        }
      }

      touchedRowIds.add(rowId);
    }
  }

  if (plan.size === 0 && touchedRowIds.size === 0) return state;

  // применяем plan + выставляем Y на row.y, если сиденье в ряду (или автопривязано)
  let nextSeats = state.seats.map(s => {
    if (!plan.has(s.id)) return s;

    const newX = plan.get(s.id)!;
    // реальный/авто rowId
    const rowId = s.rowId ?? (() => {
      const zoneRows = state.rows.filter(r => r.zoneId === s.zoneId);
      const { row: closest, dy } = findClosestRow(zoneRows, s.y);
      return closest && dy <= SNAP_Y_THRESHOLD ? closest.id : null;
    })();

    if (rowId) {
      const row = state.rows.find(r => r.id === rowId)!;
      return { ...s, x: newX, y: row.y, rowId };
    }
    return { ...s, x: newX };
  });

  // перенумеровка
  for (const rowId of touchedRowIds) {
    nextSeats = renumberSeatsInRow(nextSeats, rowId, false);
  }

  return { ...state, seats: nextSeats };
}

/** РАВНОМЕРНО РАСПРЕДЕЛИТЬ РЯДЫ по X между крайними (двигает и сиденья ряда). */
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

  // по зонам
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
