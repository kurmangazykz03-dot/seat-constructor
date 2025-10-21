import { SeatmapState } from "../pages/EditorPage";

/**
 * Перемещает выделенные элементы на заданное смещение (dx, dy).
 * Возвращает новое, обновленное состояние.
 * @param state - Текущее состояние редактора.
 * @param selectedIds - Массив ID выделенных элементов.
 * @param dx - Смещение по оси X.
 * @param dy - Смещение по оси Y.
 */
export function moveSelectedElements(
  state: SeatmapState,
  selectedIds: string[],
  dx: number,
  dy: number
): SeatmapState {
  const selectedZones = state.zones.filter((z) => selectedIds.includes(z.id));
  const selectedRows = state.rows.filter((r) => selectedIds.includes(r.id));

  const zoneIdsToMove = new Set(selectedZones.map((z) => z.id));
  const rowIdsToMove = new Set(selectedRows.map((r) => r.id));

  state.rows.forEach((r) => {
    if (zoneIdsToMove.has(r.zoneId ?? "")) {
      rowIdsToMove.add(r.id);
    }
  });

  return {
    ...state,
    zones: state.zones.map((z) =>
      zoneIdsToMove.has(z.id) ? { ...z, x: z.x + dx, y: z.y + dy } : z
    ),
    rows: state.rows.map((r) => (rowIdsToMove.has(r.id) ? { ...r, x: r.x + dx, y: r.y + dy } : r)),
    seats: state.seats.map((s) => {
      const shouldMove = rowIdsToMove.has(s.rowId ?? "") || zoneIdsToMove.has(s.zoneId ?? "");
      return shouldMove ? { ...s, x: s.x + dx, y: s.y + dy } : s;
    }),
  };
}
