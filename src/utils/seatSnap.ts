// src/utils/seatSnap.ts
// Утилиты для "привязки" места к ряду и перенумерации мест внутри ряда.

import { SeatmapState } from "../pages/EditorPage";
import { Row, Seat, Zone } from "../types/types";

/**
 * Находит ближайший ряд по вертикали для заданной координаты Y.
 *
 * @param rowsInZone - список рядов внутри одной зоны.
 * @param y - координата Y, относительно которой ищем ближайший ряд.
 * @returns ближайший ряд и вертикальное расстояние до него.
 */
export function findClosestRow(rowsInZone: Row[], y: number): { row: Row | null; dy: number } {
  if (!rowsInZone.length) return { row: null, dy: Infinity };

  let best: Row = rowsInZone[0];
  let bestDy = Math.abs(y - best.y);

  // Перебираем остальные ряды и ищем тот, у которого минимальный |y - row.y|
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

/**
 * Перенумеровывает места внутри одного ряда по их X-координате.
 * Индекс (colIndex) идёт от 1 слева направо.
 *
 * @param seats - все места схемы.
 * @param rowId - id ряда, в котором нужно обновить colIndex.
 * @param updateLabel - если true, то также переписывает текстовую метку (label).
 * @returns новый массив мест с обновлёнными colIndex (и, при необходимости, label).
 */
export function renumberSeatsInRow(seats: Seat[], rowId: string, updateLabel = false): Seat[] {
  // Сначала получаем места только этого ряда и сортируем их по X
  const rowSeats = seats.filter((s) => s.rowId === rowId).sort((a, b) => a.x - b.x);

  // Затем пробегаем по всем местам и тем, что принадлежат этому ряду,
  // присваиваем colIndex по позиции в отсортированном списке
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

/**
 * Применяет "дроп" (перетаскивание) места в пределах зоны:
 * - Передвигает место к новым координатам (droppedX, droppedY),
 * - При необходимости "прищёлкивает" его к ближайшему ряду,
 * - Может перенумеровать места в этом ряду.
 *
 * @param prev - предыдущее состояние схемы.
 * @param zone - зона, в рамках которой выполняется дроп.
 * @param seatId - id перетаскиваемого места.
 * @param droppedX - конечная X-координата дропа (в координатах зоны).
 * @param droppedY - конечная Y-координата дропа (в координатах зоны).
 * @param snapThreshold - максимальное расстояние по Y до ряда, при котором срабатывает "привязка".
 * @param renumberLabels - если true, после привязки обновляет label всех мест ряда по их порядку.
 * @returns новое состояние схемы после перемещения/привязки места.
 */
export function applySeatDrop(
  prev: SeatmapState,
  zone: Zone,
  seatId: string,
  droppedX: number,
  droppedY: number,
  snapThreshold = 12,
  renumberLabels = false
): SeatmapState {
  // Все ряды внутри данной зоны
  const zoneRows = prev.rows.filter((r) => r.zoneId === zone.id);

  // Ищем ближайший ряд по вертикали к месту, куда "уронили" сиденье
  const { row: closest, dy } = findClosestRow(zoneRows, droppedY);

  // Для начала просто обновляем координаты выбранного места
  let nextSeats = prev.seats.map((s) => (s.id === seatId ? { ...s, x: droppedX, y: droppedY } : s));

  // Если ряда поблизости нет или он слишком далеко — отвязываем место от ряда
  if (!closest || dy > snapThreshold) {
    nextSeats = nextSeats.map((s) => (s.id === seatId ? { ...s, rowId: null } : s));
    return { ...prev, seats: nextSeats };
  }

  // Иначе "прищёлкиваем" место по Y к найденному ряду и привязываем к нему
  nextSeats = nextSeats.map((s) =>
    s.id === seatId ? { ...s, y: closest!.y, rowId: closest!.id } : s
  );

  // Перенумеровываем места ряда, чтобы colIndex шёл по порядку слева направо
  nextSeats = renumberSeatsInRow(nextSeats, closest.id, renumberLabels);

  return { ...prev, seats: nextSeats };
}
