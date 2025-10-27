// src/utils/duplicate.ts
import { SeatmapState } from "../pages/EditorPage";

export function duplicateSelected(state: SeatmapState, selectedIds: string[], dx = 24, dy = 24) {
  const idSet = new Set(selectedIds);

  const newSeats = state.seats
    .filter(s => idSet.has(s.id))
    .map(s => ({ ...s, id: `seat-${crypto.randomUUID()}`, x: s.x + dx, y: s.y + dy }));

  const newRows = state.rows
    .filter(r => idSet.has(r.id))
    .map(r => ({ ...r, id: `row-${crypto.randomUUID()}`, x: r.x + dx, y: r.y + dy }));

  const newZones = state.zones
    .filter(z => idSet.has(z.id))
    .map(z => ({ ...z, id: `zone-${crypto.randomUUID()}`, x: z.x + dx, y: z.y + dy }));

  const newTexts = (state.texts || [])
    .filter(t => idSet.has(t.id))
    .map(t => ({ ...t, id: `text-${crypto.randomUUID()}`, x: t.x + dx, y: t.y + dy }));

  const newShapes = (state.shapes || [])
    .filter(sh => idSet.has(sh.id))
    .map(sh => ({
      ...sh,
      id: `shape-${crypto.randomUUID()}`,
      x: sh.x + dx,
      y: sh.y + dy,
      // points — локальные, не сдвигаем
    }));

  const next = {
    ...state,
    seats:  [...state.seats,  ...newSeats],
    rows:   [...state.rows,   ...newRows],
    zones:  [...state.zones,  ...newZones],
    texts:  [...(state.texts || []),  ...newTexts],
    shapes: [...(state.shapes || []), ...newShapes],
  };

  const newSelectedIds = [
    ...newSeats.map(x => x.id),
    ...newRows.map(x => x.id),
    ...newZones.map(x => x.id),
    ...newTexts.map(x => x.id),
    ...newShapes.map(x => x.id),
  ];

  return { next, newSelectedIds };
}
