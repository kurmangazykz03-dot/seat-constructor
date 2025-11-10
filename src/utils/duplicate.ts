// src/utils/duplicate.ts
// Утилита для дублирования выбранных объектов схемы:
// зон, рядов, мест, текстов и фигур. Используется в редакторе при команде "Duplicate".

import { SeatmapState } from "../pages/EditorPage";
import type { Row, Seat, ShapeObject, TextObject, Zone } from "../types/types";

/**
 * Дублирует текущий выбор:
 * - если выбрана зона — копируются сама зона, её ряды и места;
 * - если выбран ряд — копируется ряд и все его места;
 * - если выбраны отдельные места/тексты/фигуры — копируются только они;
 *
 * dx, dy — смещение клонов относительно оригинала (по умолчанию 24px, 24px).
 *
 * Возвращает:
 * - next: новое состояние схемы
 * - newSelectedIds: массив новых id, которые нужно выделить после копирования
 */
export function duplicateSelected(state: SeatmapState, selectedIds: string[], dx = 24, dy = 24) {
  const idSet = new Set(selectedIds);

  // 1) Кто реально выбран пользователем (по id)
  const selZones = state.zones.filter((z) => idSet.has(z.id));
  const selRowsDirect = state.rows.filter((r) => idSet.has(r.id));
  const selSeatsDirect = state.seats.filter((s) => idSet.has(s.id));
  const selTexts = (state.texts || []).filter((t) => idSet.has(t.id));
  const selShapes = (state.shapes || []).filter((s) => idSet.has(s.id));

  // 2) Расширяем выбор:
  //    - если выбрана зона — берём все её ряды и места
  const rowsFromZones = state.rows.filter((r) => selZones.some((z) => z.id === r.zoneId));
  const seatsFromZones = state.seats.filter((s) => selZones.some((z) => z.id === s.zoneId));

  //    - если выбран ряд — берём все его места
  const seatsFromRows = state.seats.filter((s) => selRowsDirect.some((r) => r.id === s.rowId));

  // 3) Объединяем коллекции и убираем дубли по id
  const byId = <T extends { id: string }>(arr: T[]) => {
    const m = new Map<string, T>();
    arr.forEach((x) => m.set(x.id, x));
    return Array.from(m.values());
  };

  const rowsToCopy = byId([...selRowsDirect, ...rowsFromZones]);
  const seatsToCopy = byId([...selSeatsDirect, ...seatsFromZones, ...seatsFromRows]);

  // 4) Готовим карты новых id для клонов
  const newZoneId = new Map<string, string>();
  const newRowId = new Map<string, string>();
  const newSeatId = new Map<string, string>();

  selZones.forEach((z) => newZoneId.set(z.id, `zone-${crypto.randomUUID()}`));
  rowsToCopy.forEach((r) => newRowId.set(r.id, `row-${crypto.randomUUID()}`));
  seatsToCopy.forEach((s) => newSeatId.set(s.id, `seat-${crypto.randomUUID()}`));

  const newTextId = new Map<string, string>();
  const newShapeId = new Map<string, string>();

  selTexts.forEach((t) => newTextId.set(t.id, `text-${crypto.randomUUID()}`));
  selShapes.forEach((s) => newShapeId.set(s.id, `shape-${crypto.randomUUID()}`));

  // 5) Клоны зон: z.x/z.y смещаем, всё остальное оставляем как есть
  const clonedZones: Zone[] = selZones.map((z) => ({
    ...z,
    id: newZoneId.get(z.id)!,
    x: z.x + dx,
    y: z.y + dy,
  }));

  // 6) Клоны рядов:
  //    - если родительская зона тоже копируется, ряд остаётся в тех же локальных координатах
  //      (зона уже сдвинута на dx/dy);
  //    - если зона не копируется — сдвигаем сам ряд на dx/dy.
  const clonedRows: Row[] = rowsToCopy.map((r) => {
    const zoneCloned = newZoneId.has(r.zoneId);
    return {
      ...r,
      id: newRowId.get(r.id)!,
      zoneId: zoneCloned ? newZoneId.get(r.zoneId)! : r.zoneId,
      x: r.x + (zoneCloned ? 0 : dx),
      y: r.y + (zoneCloned ? 0 : dy),
    };
  });

  // 7) Клоны мест:
  //    - если дублируется зона — места остаются в тех же локальных координатах (зона уже сдвинута);
  //    - если дублируется только ряд — сдвигаем места на dx/dy;
  //    - если дублируется только само место — также сдвигаем на dx/dy.
  const clonedSeats: Seat[] = seatsToCopy.map((s) => {
    const zoneCloned = newZoneId.has(s.zoneId ?? "");
    const rowCloned = newRowId.has(s.rowId ?? "");
    const shift = zoneCloned ? 0 : rowCloned ? 1 : 1; // фактически "есть ли смещение"

    return {
      ...s,
      id: newSeatId.get(s.id)!,
      zoneId: zoneCloned ? newZoneId.get(s.zoneId!)! : s.zoneId,
      rowId: rowCloned ? newRowId.get(s.rowId!)! : s.rowId,
      x: s.x + (shift ? dx : 0),
      y: s.y + (shift ? dy : 0),
    };
  });

  // 8) Тексты и фигуры живут в глобальных координатах сцены — просто смещаем и меняем id
  const clonedTexts: TextObject[] = (selTexts || []).map((t) => ({
    ...t,
    id: newTextId.get(t.id)!,
    x: t.x + dx,
    y: t.y + dy,
  }));

  const clonedShapes: ShapeObject[] = (selShapes || []).map((sh) => ({
    ...sh,
    id: newShapeId.get(sh.id)!,
    x: sh.x + dx,
    y: sh.y + dy,
  }));

  // 9) Собираем новое состояние со старыми + клонированными объектами
  const next: SeatmapState = {
    ...state,
    zones: [...state.zones, ...clonedZones],
    rows: [...state.rows, ...clonedRows],
    seats: [...state.seats, ...clonedSeats],
    texts: [...(state.texts || []), ...clonedTexts],
    shapes: [...(state.shapes || []), ...clonedShapes],
  };

  // 10) Новый selection — все новые id, чтобы пользователь сразу видел клоны
  const newSelectedIds = [
    ...clonedZones.map((z) => z.id),
    ...clonedRows.map((r) => r.id),
    ...clonedSeats.map((s) => s.id),
    ...clonedTexts.map((t) => t.id),
    ...clonedShapes.map((s) => s.id),
  ];

  return { next, newSelectedIds };
}
