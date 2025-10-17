
export type AlignDirection = 'left' | 'center' | 'right';


// — возьми эти типы из твоего общего types-файла, если он уже есть;
//   либо оставь локально как ниже (минимально достаточные поля):
type Zone = { id: string; width: number; height: number; x: number; y: number; rotation?: number };
type Row  = { id: string; zoneId: string; x: number; y: number; label?: string };
type Seat = { id: string; zoneId: string; rowId: string | null; x: number; y: number; radius?: number };

type State = {
  zones: Zone[];
  rows: Row[];
  seats: Seat[];
  // остальные поля состояния нам здесь не нужны
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function indexMaps(state: State) {
  const seatIndex = new Map<string, number>();
  state.seats.forEach((s, i) => seatIndex.set(s.id, i));

  const rowIndex = new Map<string, number>();
  state.rows.forEach((r, i) => rowIndex.set(r.id, i));

  return { seatIndex, rowIndex };
}

/** Align ROWS — выравниваем ряды как блоки внутри своей зоны */
export function alignRows(state: State, selectedIds: string[], dir: AlignDirection): State {
  if (selectedIds.length === 0) return state;

  const { seatIndex, rowIndex } = indexMaps(state);

  // Собираем целевые ряды
  const selectedZones = state.zones.filter(z => selectedIds.includes(z.id));
  const selectedRows  = state.rows.filter(r => selectedIds.includes(r.id));
  const selectedSeats = state.seats.filter(s => selectedIds.includes(s.id));

  const rowsByZone = new Map<string, Row[]>();

  if (selectedZones.length > 0) {
    for (const z of selectedZones) {
      const rowsInZone = state.rows.filter(r => r.zoneId === z.id);
      if (rowsInZone.length) rowsByZone.set(z.id, rowsInZone);
    }
  } else if (selectedRows.length > 0) {
    for (const r of selectedRows) {
      const arr = rowsByZone.get(r.zoneId) ?? [];
      arr.push(r);
      rowsByZone.set(r.zoneId, arr);
    }
  } else if (selectedSeats.length > 0) {
    const rowIds = new Set(selectedSeats.map(s => s.rowId).filter(Boolean) as string[]);
    for (const rowId of rowIds) {
      const r = state.rows.find(rr => rr.id === rowId);
      if (!r) continue;
      const arr = rowsByZone.get(r.zoneId) ?? [];
      if (!arr.some(x => x.id === r.id)) arr.push(r);
      rowsByZone.set(r.zoneId, arr);
    }
  } else {
    return state;
  }

  if (rowsByZone.size === 0) return state;

  const next = { ...state, rows: [...state.rows], seats: [...state.seats] };

  for (const [zoneId, rowsInZone] of rowsByZone) {
    const zone = state.zones.find(z => z.id === zoneId);
    if (!zone) continue;

    const sectionLeft   = 0;
    const sectionRight  = zone.width;
    const sectionCenter = zone.width / 2;

    for (const row of rowsInZone) {
      const seatsInRow = state.seats.filter(s => s.rowId === row.id);
      if (seatsInRow.length === 0) continue;

      // внутри цикла по rowsInZone
const minX = Math.min(...seatsInRow.map(s => s.x));
const maxX = Math.max(...seatsInRow.map(s => s.x));
const centerX = (minX + maxX) / 2;

let dx = 0;
if (dir === 'left')   dx = sectionLeft - minX;
if (dir === 'right')  dx = sectionRight - maxX;
if (dir === 'center') dx = sectionCenter - centerX;

if (dx === 0) continue;

// --- безопасная поправка, чтобы рамка ряда осталась в зоне:
let safeDx = dx;
const newMin = minX + dx;
const newMax = maxX + dx;
if (newMin < sectionLeft)  safeDx += (sectionLeft - newMin);
if (newMax > sectionRight) safeDx -= (newMax - sectionRight);

// применяем safeDx вместо dx
const ri = rowIndex.get(row.id);
if (ri != null) next.rows[ri] = { ...next.rows[ri], x: next.rows[ri].x + safeDx };

for (const s of seatsInRow) {
  const si = seatIndex.get(s.id);
  if (si != null) next.seats[si] = { ...next.seats[si], x: next.seats[si].x + safeDx };
}

    }
  }

  return next;
}

/** Align SEATS — выравниваем ТОЛЬКО выбранные сиденья, не схлопывая их в одну точку */export function alignSeats(state: State, selectedIds: string[], dir: AlignDirection): State {
  const chosen = state.seats.filter(s => selectedIds.includes(s.id));
  if (chosen.length < 2) return state;

  const plan = new Map<string, number>();

  // 1) группируем выбранные по zoneId
  const byZone = new Map<string, Seat[]>();
  for (const s of chosen) {
    const arr = byZone.get(s.zoneId) ?? [];
    arr.push(s);
    byZone.set(s.zoneId, arr);
  }

  for (const [zoneId, seatsInZoneSelected] of byZone) {
    const zone = state.zones.find(z => z.id === zoneId);
    if (!zone) continue;

    // 2) общий targetX для зоны — по всем выбранным в этой зоне
    const xs = seatsInZoneSelected.map(s => s.x);
    const globalMin = Math.min(...xs);
    const globalMax = Math.max(...xs);
    const globalCenter = (globalMin + globalMax) / 2;
    const targetX =
      dir === 'left'   ? globalMin :
      dir === 'right'  ? globalMax :
                         globalCenter;

    // 3) внутри зоны — группы по rowId (включая 'no-row')
    const groups = new Map<string, Seat[]>();
    for (const s of seatsInZoneSelected) {
      const key = s.rowId ?? 'no-row';
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }

    // 4) для каждой группы считаем якорь и сдвигаем выбранные сиденья к общему targetX
    for (const [, group] of groups) {
      if (group.length === 0) continue;

      const gxs = group.map(s => s.x);
      const minG = Math.min(...gxs);
      const maxG = Math.max(...gxs);
      const centerG = (minG + maxG) / 2;

      // Опорная точка группы (левый/центр/правый край группы)
      const anchor =
        dir === 'left'   ? minG :
        dir === 'right'  ? maxG :
                           centerG;

      let dx = targetX - anchor;

      // ограничение по границам секции с учётом радиусов
      const maxRadius = Math.max(...group.map(s => s.radius ?? 0));
      const newMin = minG + dx;
      const newMax = maxG + dx;
      if (newMin < maxRadius)              dx += (maxRadius - newMin);
      if (newMax > zone.width - maxRadius) dx -= (newMax - (zone.width - maxRadius));

      if (dx === 0) continue;

      for (const s of group) {
        const radius = s.radius ?? 0;
        const low  = radius;
        const high = zone.width - radius;
        plan.set(s.id, Math.max(low, Math.min(high, s.x + dx)));
      }
    }
  }

  if (plan.size === 0) return state;
  const nextSeats = state.seats.map(s => plan.has(s.id) ? { ...s, x: plan.get(s.id)! } : s);
  return { ...state, seats: nextSeats };
}

/** Distribute ROWS — равномерно распределяем ряды по X между крайними (внутри зоны) */
export function distributeRows(state: State, selectedIds: string[]): State {
  // рядов должно быть ≥3
  const rowIds = new Set<string>();
  for (const id of selectedIds) {
    const r = state.rows.find(rr => rr.id === id);
    if (r) rowIds.add(r.id);
    const s = state.seats.find(ss => ss.id === id);
    if (s?.rowId) rowIds.add(s.rowId);
  }
  const rowsSel = state.rows.filter(r => rowIds.has(r.id));
  if (rowsSel.length < 3) return state;

  const { rowIndex } = indexMaps(state);
  const next = { ...state, rows: [...state.rows], seats: [...state.seats] };

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

      const ri = rowIndex.get(r.id);
      if (ri != null) next.rows[ri] = { ...next.rows[ri], x: newX };

      for (let si = 0; si < next.seats.length; si++) {
        if (next.seats[si].rowId === r.id) {
          next.seats[si] = { ...next.seats[si], x: next.seats[si].x + dx };
        }
      }
    }
  }

  return next;
}
