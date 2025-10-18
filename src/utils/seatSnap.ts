// src/utils/seatSnap.ts
import { Seat, Row, Zone } from "../types/types";
import { SeatmapState } from "../pages/EditorPage";

/** Найти ближайший ряд внутри зоны по оси Y (в локальных координатах зоны) */
export function findClosestRow(
  rowsInZone: Row[],
  y: number
): { row: Row | null; dy: number } {
  if (!rowsInZone.length) return { row: null, dy: Infinity };
  let best: Row = rowsInZone[0];
  let bestDy = Math.abs(y - best.y);
  for (let i = 1; i < rowsInZone.length; i++) {
    const cand = rowsInZone[i];
    const d = Math.abs(y - cand.y);
    if (d < bestDy) {
      best = cand;
      bestDy = d;
    }
  }
  return { row: best, dy: bestDy };
}

/** Пересчитать colIndex (и при желании label) для сидений в одном ряду слева-направо */
export function renumberSeatsInRow(
  seats: Seat[],
  rowId: string,
  updateLabel = false
): Seat[] {
  const rowSeats = seats.filter(s => s.rowId === rowId).sort((a, b) => a.x - b.x);
  return seats.map(s => {
    if (s.rowId !== rowId) return s;
    const idx = rowSeats.findIndex(x => x.id === s.id);
    const colIndex = idx + 1;
    return {
      ...s,
      colIndex,
      label: updateLabel ? String(colIndex) : s.label,
    };
  });
}

/**
 * Применить дроп сиденья в зоне:
 * - решаем, “влипает” ли в ближайший ряд по порогу;
 * - если да — фиксируем y=row.y, rowId=row.id, пересчитываем порядок;
 * - если нет — rowId=null (вне ряда).
 */
export function applySeatDrop(
  prev: SeatmapState,
  zone: Zone,
  seatId: string,
  droppedX: number,
  droppedY: number,
  snapThreshold = 12,      // px: можно вынести в настройки
  renumberLabels = false   // true если хотим обновлять label автонумерацией
): SeatmapState {
  const zoneRows = prev.rows.filter(r => r.zoneId === zone.id);
  const { row: closest, dy } = findClosestRow(zoneRows, droppedY);

  // 1) сиденье сдвигаем по X/Y (локальные координаты уже даны)
  let nextSeats = prev.seats.map(s =>
    s.id === seatId ? { ...s, x: droppedX, y: droppedY } : s
  );

  // 2) если нет рядов или далеко — снимаем привязку
  if (!closest || dy > snapThreshold) {
    nextSeats = nextSeats.map(s => (s.id === seatId ? { ...s, rowId: null } : s));
    return { ...prev, seats: nextSeats };
  }

  // 3) прилипли к ряду: y=row.y, rowId=row.id
  nextSeats = nextSeats.map(s =>
    s.id === seatId ? { ...s, y: closest!.y, rowId: closest!.id } : s
  );

  // 4) пересчитываем порядок в этом ряду
  nextSeats = renumberSeatsInRow(nextSeats, closest.id, renumberLabels);
  return { ...prev, seats: nextSeats };
}
