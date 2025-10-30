// src/utils/duplicate.ts
import { SeatmapState } from "../pages/EditorPage";
import type { Row, Seat, Zone, TextObject, ShapeObject } from "../types/types";

export function duplicateSelected(
  state: SeatmapState,
  selectedIds: string[],
  dx = 24,
  dy = 24
) {
  const idSet = new Set(selectedIds);

  // 1) Кто реально выбран
  const selZones = state.zones.filter(z => idSet.has(z.id));
  const selRowsDirect = state.rows.filter(r => idSet.has(r.id));
  const selSeatsDirect = state.seats.filter(s => idSet.has(s.id));
  const selTexts = (state.texts || []).filter(t => idSet.has(t.id));
  const selShapes = (state.shapes || []).filter(s => idSet.has(s.id));

  // 2) Расширяем выбор: если выбрана зона — берём все её ряды и места.
  const rowsFromZones = state.rows.filter(r => selZones.some(z => z.id === r.zoneId));
  const seatsFromZones = state.seats.filter(s => selZones.some(z => z.id === s.zoneId));

  // если выбран ряд — берём все его места
  const seatsFromRows = state.seats.filter(s => selRowsDirect.some(r => r.id === s.rowId));

  // 3) Объединяем (уникально)
  const byId = <T extends {id:string}>(arr: T[]) => {
    const m = new Map<string, T>();
    arr.forEach(x => m.set(x.id, x));
    return Array.from(m.values());
  };

  const rowsToCopy = byId([...selRowsDirect, ...rowsFromZones]);
  const seatsToCopy = byId([...selSeatsDirect, ...seatsFromZones, ...seatsFromRows]);

  // 4) Карты новых id
  const newZoneId = new Map<string, string>();
  const newRowId  = new Map<string, string>();
  const newSeatId = new Map<string, string>();

  selZones.forEach(z => newZoneId.set(z.id, `zone-${crypto.randomUUID()}`));
  rowsToCopy.forEach(r => newRowId.set(r.id, `row-${crypto.randomUUID()}`));
  seatsToCopy.forEach(s => newSeatId.set(s.id, `seat-${crypto.randomUUID()}`));
  const newTextId  = new Map<string, string>();
  const newShapeId = new Map<string, string>();
  selTexts.forEach(t => newTextId.set(t.id, `text-${crypto.randomUUID()}`));
  selShapes.forEach(s => newShapeId.set(s.id, `shape-${crypto.randomUUID()}`));

  // 5) Клоны зон: смещаем ТОЛЬКО зоны
  const clonedZones: Zone[] = selZones.map(z => ({
    ...z,
    id: newZoneId.get(z.id)!,
    x: z.x + dx,
    y: z.y + dy,
  }));

  // 6) Клоны рядов:
  // если родительская зона тоже копируется — ряд остаётся со старыми локальными x/y (зона уже сдвинута),
  // иначе смещаем ряд сам.
  const clonedRows: Row[] = rowsToCopy.map(r => {
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
  // если дублируется зона — местам dx/dy НЕ добавляем;
  // если дублируется только ряд — добавляем dx/dy;
  // если дублируется только само место — тоже добавляем dx/dy.
  const clonedSeats: Seat[] = seatsToCopy.map(s => {
    const zoneCloned = newZoneId.has(s.zoneId ?? "");
    const rowCloned  = newRowId.has(s.rowId ?? "");
    const shift = zoneCloned ? 0 : (rowCloned ? 1 : 1);

    return {
      ...s,
      id: newSeatId.get(s.id)!,
      zoneId: zoneCloned ? newZoneId.get(s.zoneId!)! : s.zoneId,
      rowId:  rowCloned  ? newRowId.get(s.rowId!)!   : s.rowId,
      x: s.x + (shift ? dx : 0),
      y: s.y + (shift ? dy : 0),
    };
  });

  // 8) Тексты/фигуры живут в координатах сцены — просто смещаем
  const clonedTexts: TextObject[] = (selTexts || []).map(t => ({
    ...t, id: newTextId.get(t.id)!, x: t.x + dx, y: t.y + dy,
  }));

  const clonedShapes: ShapeObject[] = (selShapes || []).map(sh => ({
    ...sh, id: newShapeId.get(sh.id)!, x: sh.x + dx, y: sh.y + dy,
  }));

  // 9) Собираем новое состояние
  const next: SeatmapState = {
    ...state,
    zones:  [...state.zones,  ...clonedZones],
    rows:   [...state.rows,   ...clonedRows],
    seats:  [...state.seats,  ...clonedSeats],
    texts:  [...(state.texts || []),  ...clonedTexts],
    shapes: [...(state.shapes || []), ...clonedShapes],
  };

  // 10) Новый selection — все новые id
  const newSelectedIds = [
    ...clonedZones.map(z => z.id),
    ...clonedRows.map(r => r.id),
    ...clonedSeats.map(s => s.id),
    ...clonedTexts.map(t => t.id),
    ...clonedShapes.map(s => s.id),
  ];

  return { next, newSelectedIds };
}
