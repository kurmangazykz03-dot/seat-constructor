// src/utils/seatSnap.ts
import { SeatmapState } from "../pages/EditorPage";
import { Row, Seat, Zone } from "../types/types";

export function findClosestRow(rowsInZone: Row[], y: number): { row: Row | null; dy: number } {
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

export function renumberSeatsInRow(seats: Seat[], rowId: string, updateLabel = false): Seat[] {
  const rowSeats = seats.filter((s) => s.rowId === rowId).sort((a, b) => a.x - b.x);
  return seats.map((s) => {
    if (s.rowId !== rowId) return s;
    const idx = rowSeats.findIndex((x) => x.id === s.id);
    const colIndex = idx + 1;
    return {
      ...s,
      colIndex,
      label: updateLabel ? String(colIndex) : s.label,
    };
  });
}

export function applySeatDrop(
  prev: SeatmapState,
  zone: Zone,
  seatId: string,
  droppedX: number,
  droppedY: number,
  snapThreshold = 12,
  renumberLabels = false
): SeatmapState {
  const zoneRows = prev.rows.filter((r) => r.zoneId === zone.id);
  const { row: closest, dy } = findClosestRow(zoneRows, droppedY);

  let nextSeats = prev.seats.map((s) => (s.id === seatId ? { ...s, x: droppedX, y: droppedY } : s));

  if (!closest || dy > snapThreshold) {
    nextSeats = nextSeats.map((s) => (s.id === seatId ? { ...s, rowId: null } : s));
    return { ...prev, seats: nextSeats };
  }

  nextSeats = nextSeats.map((s) =>
    s.id === seatId ? { ...s, y: closest!.y, rowId: closest!.id } : s
  );

  nextSeats = renumberSeatsInRow(nextSeats, closest.id, renumberLabels);
  return { ...prev, seats: nextSeats };
}
