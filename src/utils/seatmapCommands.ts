// src/utils/seatmapCommands.ts
// Команды для работы со схемой зала:
// - выравнивание рядов внутри зон
// - выравнивание выделенных мест
// - равномерное распределение рядов по ширине зоны

import { SeatmapState } from "../pages/EditorPage";
import type { Row, Seat } from "../types/types";

// Направление выравнивания по горизонтали
export type AlignDirection = "left" | "center" | "right";

// Простой clamp для чисел
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Максимальное расстояние по Y, на котором место «прилипнет» к ближайшему ряду
const SNAP_Y_THRESHOLD = 14;

/**
 * Возвращает горизонтальные границы и центр ряда по его id.
 * Используется как вспомогательная функция для вычисления «ширины» ряда.
 */
function rowExtents(state: SeatmapState, rowId: string) {
  const seats = state.seats.filter((s) => s.rowId === rowId);
  if (seats.length === 0) {
    // Если в ряду нет мест — считаем, что ряд занимает небольшой отрезок вокруг своей точки x
    const row = state.rows.find((r) => r.id === rowId);
    const cx = row ? row.x : 0;
    return { minX: cx - 1, maxX: cx + 1, centerX: cx };
  }
  const xs = seats.map((s) => s.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  return { minX, maxX, centerX: (minX + maxX) / 2 };
}

/**
 * Пере-нумерует места в конкретном ряду слева направо.
 * Колонка colIndex обновляется всегда, label — по флагу updateLabel.
 */
function renumberSeatsInRow(seats: Seat[], rowId: string, updateLabel = false): Seat[] {
  const rowSeats = seats.filter((s) => s.rowId === rowId).sort((a, b) => a.x - b.x);
  return seats.map((s) => {
    if (s.rowId !== rowId) return s;
    const idx = rowSeats.findIndex((x) => x.id === s.id);
    const colIndex = idx + 1;
    return { ...s, colIndex, label: updateLabel ? String(colIndex) : s.label };
  });
}

/**
 * Находит ближайший по вертикали ряд к заданной координате y.
 * Возвращает сам ряд и модуль вертикального расстояния dy.
 */
function findClosestRow(rowsInZone: Row[], y: number): { row: Row | null; dy: number } {
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

/**
 * Выравнивание рядов (и их мест) в пределах зоны по левому краю, центру или правому краю.
 *
 * Как работает:
 * - в выбор включаются:
 *   - явно выбранные зоны,
 *   - явно выбранные ряды,
 *   - ряды, в которых были выбраны места;
 * - для каждого такого ряда считаем его диапазон (minX/maxX) и центр;
 * - сдвигаем весь ряд + его места так, чтобы край/центр совпали с границей/центром зоны;
 * - следим, чтобы после сдвига ряд с местами не «вылез» за пределы ширины зоны.
 */
export function alignRows(
  state: SeatmapState,
  selectedIds: string[],
  dir: AlignDirection
): SeatmapState {
  if (selectedIds.length === 0) return state;

  // id выбранных зон
  const selectedZones = state.zones.filter((z) => selectedIds.includes(z.id)).map((z) => z.id);

  // id выбранных рядов
  const selectedRows = new Set(
    state.rows.filter((r) => selectedIds.includes(r.id)).map((r) => r.id)
  );

  // Если были выбраны места — добавляем их ряды в выбор
  state.seats.forEach((s) => {
    if (selectedIds.includes(s.id) && s.rowId) selectedRows.add(s.rowId);
  });

  // Если ни зон, ни рядов не выбрано — ничего не делаем
  if (selectedZones.length === 0 && selectedRows.size === 0) return state;

  // Копируем массивы рядов и мест, чтобы не мутировать исходные
  const next: SeatmapState = { ...state, rows: [...state.rows], seats: [...state.seats] };

  // Группируем ряды по зонам, внутри которых будем выравнивать
  const rowsByZone = new Map<string, Row[]>();
  for (const r of state.rows) {
    if (selectedZones.includes(r.zoneId) || selectedRows.has(r.id)) {
      const arr = rowsByZone.get(r.zoneId) ?? [];
      arr.push(r);
      rowsByZone.set(r.zoneId, arr);
    }
  }

  // Обрабатываем каждую зону со своими рядами
  for (const [zoneId, rowsInZone] of rowsByZone) {
    const zone = state.zones.find((z) => z.id === zoneId);
    if (!zone) continue;

    for (const row of rowsInZone) {
      const seatsInRow = state.seats.filter((s) => s.rowId === row.id);
      if (seatsInRow.length === 0) continue;

      // Фактическая ширина ряда по местам
      const xs = seatsInRow.map((s) => s.x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const centerX = (minX + maxX) / 2;

      // «Рабочая» область в локальных координатах зоны
      const sectionLeft = 0;
      const sectionRight = zone.width;
      const sectionCenter = zone.width / 2;

      // Выбираем, от какого «якоря» выравнивать: левый край / центр / правый край
      let targetAnchor = centerX;
      if (dir === "left") targetAnchor = minX;
      if (dir === "right") targetAnchor = maxX;

      // Куда хотим этот якорь переместить (левый край/центр/правый край зоны)
      const targetRow =
        dir === "left" ? sectionLeft : dir === "right" ? sectionRight : sectionCenter;
      let dx = targetRow - targetAnchor;

      // Корректируем сдвиг, чтобы после выравнивания ряд не вылез за пределы ширины зоны
      const newMin = minX + dx;
      const newMax = maxX + dx;
      if (newMin < 0) dx += -newMin;
      if (newMax > zone.width) dx -= newMax - zone.width;
      if (dx === 0) continue;

      // Сдвигаем сам ряд
      const ri = next.rows.findIndex((r) => r.id === row.id);
      if (ri >= 0) next.rows[ri] = { ...next.rows[ri], x: next.rows[ri].x + dx };

      // И все его места
      for (let i = 0; i < next.seats.length; i++) {
        if (next.seats[i].rowId === row.id) {
          next.seats[i] = { ...next.seats[i], x: next.seats[i].x + dx };
        }
      }
    }
  }

  return next;
}

/**
 * Выравнивает ТОЛЬКО выбранные места по горизонтали.
 *
 * Особенности:
 * - сначала пытается «привязать» места к рядам (по rowId или по ближайшему ряду в зоне);
 * - затем группирует места по рядам (или специальной группе __noRow__);
 * - в каждой группе равняет места по левой/центральной/правой линии;
 * - следит, чтобы после сдвига места не выходили за пределы зоны;
 * - в конце для «затронутых» рядов обновляет colIndex (без изменения label).
 */
export function alignSeats(
  state: SeatmapState,
  selectedIds: string[],
  dir: AlignDirection
): SeatmapState {
  // Берём только те места, которые реально выбраны
  const selected = state.seats.filter((s) => selectedIds.includes(s.id));
  if (selected.length === 0) return state;

  // План изменений по координате X, Y и привязке к ряду
  const planX = new Map<string, number>();
  const planY = new Map<string, number>();
  const planRow = new Map<string, string>();
  const touchedRowIds = new Set<string>(); // ряды, в которых нужно будет пере-нумеровать места

  // Группируем выбранные места по зонам
  const byZone = new Map<string, Seat[]>();
  for (const s of selected) {
    const arr = byZone.get(s.zoneId) ?? [];
    arr.push(s);
    byZone.set(s.zoneId, arr);
  }

  // Обрабатываем каждую зону отдельно
  for (const [zoneId, seatsSel] of byZone) {
    const zone = state.zones.find((z) => z.id === zoneId);
    if (!zone) continue;

    const zoneRows = state.rows.filter((r) => r.zoneId === zoneId);

    // 1) Сначала привязка по вертикали к рядам (существующим или ближайшим)
    for (const s of seatsSel) {
      if (s.rowId) {
        // Место уже в ряду — просто выравниваем по Y ряда
        const row = state.rows.find((r) => r.id === s.rowId);
        if (row) {
          planRow.set(s.id, row.id);
          planY.set(s.id, row.y);
          touchedRowIds.add(row.id);
        }
      } else if (zoneRows.length) {
        // Место свободное — ищем ближайший ряд в пределах SNAP_Y_THRESHOLD
        const { row: nearest, dy } = findClosestRow(zoneRows, s.y);
        if (nearest && dy <= SNAP_Y_THRESHOLD) {
          planRow.set(s.id, nearest.id);
          planY.set(s.id, nearest.y);
          touchedRowIds.add(nearest.id);
        }
      }
    }

    // 2) Группируем места по рядам (либо "__noRow__", если ряд не определён)
    const groups = new Map<string, Seat[]>();
    for (const s of seatsSel) {
      const key = planRow.get(s.id) ?? s.rowId ?? "__noRow__";
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }

    // 3) Для каждой группы считаем новые X с учётом выбранного направления
    for (const [, group] of groups) {
      if (!group.length) continue;

      // Берём левую/правую границу и центр только по выбранным местам
      const lefts = group.map((s) => s.x - (s.radius ?? 0));
      const rights = group.map((s) => s.x + (s.radius ?? 0));
      const selLeft = Math.min(...lefts);
      const selRight = Math.max(...rights);
      const selCenter = (selLeft + selRight) / 2;

      // Предварительный план: все места ставим на одну вертикальную линию
      const proposed = new Map<string, number>();
      for (const s of group) {
        const r = s.radius ?? 0;
        let cx: number;
        if (dir === "left") cx = selLeft + r;
        else if (dir === "right") cx = selRight - r;
        else cx = selCenter;
        proposed.set(s.id, cx);
      }

      // Считаем общие границы после переноса, чтобы не уехать за пределы зоны
      let minNew = Infinity,
        maxNew = -Infinity;
      for (const s of group) {
        const r = s.radius ?? 0;
        const cx = proposed.get(s.id)!;
        minNew = Math.min(minNew, cx - r);
        maxNew = Math.max(maxNew, cx + r);
      }
      let shift = 0;
      if (minNew < 0) shift += -minNew;
      if (maxNew > zone.width) shift -= maxNew - zone.width;

      // Финальный X для каждого места с учётом безопасного сдвига
      for (const s of group) {
        const r = s.radius ?? 0;
        const nx = clamp(proposed.get(s.id)! + shift, r, zone.width - r);
        planX.set(s.id, nx);
      }
    }
  }

  // Если план пустой — возвращаем исходное состояние
  if (planX.size === 0 && planY.size === 0) return state;

  // Применяем план к местам
  let nextSeats = state.seats.map((s) => {
    if (!selectedIds.includes(s.id)) return s;
    const nx = planX.get(s.id) ?? s.x;
    const ny = planY.get(s.id) ?? s.y;
    const rid = planRow.get(s.id) ?? s.rowId ?? null;
    return { ...s, x: nx, y: ny, rowId: rid };
  });

  // Для всех затронутых рядов пересчитываем colIndex с сохранением исходных подписи (label)
  for (const rowId of touchedRowIds) {
    nextSeats = renumberSeatsInRow(nextSeats, rowId, /*updateLabel*/ false);
  }

  return { ...state, seats: nextSeats };
}

/**
 * Равномерно распределяет выбранные ряды по X внутри зоны.
 *
 * Как работает:
 * - в выбор рядов попадают:
 *   - явно выбранные ряды;
 *   - ряды, которым принадлежат выбранные места;
 * - если в зоне меньше 3 рядов — ничего не делаем (некому «равномерно» распределяться);
 * - в каждой зоне:
 *   - сортируем ряды по X;
 *   - крайние ряды остаются на месте;
 *   - промежуточные ряды равномерно растягиваются между первым и последним;
 *   - места внутри этих рядов сдвигаются на тот же dx, что и сам ряд.
 */
export function distributeRows(state: SeatmapState, selectedIds: string[]): SeatmapState {
  // Собираем id всех рядов, которые относятся к выбору
  const rowIds = new Set<string>();
  for (const id of selectedIds) {
    const r = state.rows.find((rr) => rr.id === id);
    if (r) rowIds.add(r.id);
    const s = state.seats.find((ss) => ss.id === id);
    if (s?.rowId) rowIds.add(s.rowId);
  }

  const rowsSel = state.rows.filter((r) => rowIds.has(r.id));
  if (rowsSel.length < 3) return state; // нужно минимум 3 ряда, чтобы был смысл «распределять»

  // Клонируем массивы для иммутабельности
  const next: SeatmapState = { ...state, rows: [...state.rows], seats: [...state.seats] };

  // Группируем выбранные ряды по зонам
  const byZone = new Map<string, Row[]>();
  for (const r of rowsSel) {
    const arr = byZone.get(r.zoneId) ?? [];
    arr.push(r);
    byZone.set(r.zoneId, arr);
  }

  // Для каждой зоны распределяем её выбранные ряды по X
  for (const [, rowsInZone] of byZone) {
    const sorted = [...rowsInZone].sort((a, b) => a.x - b.x);
    const first = sorted[0],
      last = sorted[sorted.length - 1];
    const span = last.x - first.x;
    if (span <= 0) continue;

    // Крайние ряды остаются на месте, внутренние — равномерно между ними
    for (let i = 1; i < sorted.length - 1; i++) {
      const r = sorted[i];
      const newX = first.x + (span * i) / (sorted.length - 1);
      const dx = newX - r.x;

      // Перемещаем ряд
      const ri = next.rows.findIndex((rr) => rr.id === r.id);
      if (ri >= 0) next.rows[ri] = { ...next.rows[ri], x: newX };

      // И все его места на тот же dx
      for (let si = 0; si < next.seats.length; si++) {
        if (next.seats[si].rowId === r.id) {
          next.seats[si] = { ...next.seats[si], x: next.seats[si].x + dx };
        }
      }
    }
  }

  return next;
}
