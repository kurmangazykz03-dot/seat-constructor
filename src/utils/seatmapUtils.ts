import { SeatmapState } from "../pages/EditorPage";

/**
 * Перемещает выделенные элементы на заданное смещение (dx, dy).
 *
 * Логика:
 * - Если выделена зона — двигаем саму зону, все её ряды и все места этих рядов.
 * - Если выделен ряд — двигаем ряд и все его места.
 * - Свободные места (без зоны/ряда), а также текст/фигуры здесь не трогаем.
 *
 * Возвращает новое (иммутабельное) состояние.
 *
 * @param state        Текущее состояние редактора.
 * @param selectedIds  Массив ID выделенных элементов (зоны/ряды/места и т.д.).
 * @param dx           Смещение по оси X.
 * @param dy           Смещение по оси Y.
 */
export function moveSelectedElements(
  state: SeatmapState,
  selectedIds: string[],
  dx: number,
  dy: number
): SeatmapState {
  // 1. Находим выделенные зоны и ряды по списку selectedIds.
  const selectedZones = state.zones.filter((z) => selectedIds.includes(z.id));
  const selectedRows = state.rows.filter((r) => selectedIds.includes(r.id));

  // Множество ID зон и рядов, которые надо двигать.
  const zoneIdsToMove = new Set(selectedZones.map((z) => z.id));
  const rowIdsToMove = new Set(selectedRows.map((r) => r.id));

  // 2. Если выбрана зона — нужно также двигать все её ряды.
  //    Поэтому добавляем в rowIdsToMove все ряды, у которых zoneId входит в zoneIdsToMove.
  state.rows.forEach((r) => {
    if (zoneIdsToMove.has(r.zoneId ?? "")) {
      rowIdsToMove.add(r.id);
    }
  });

  // 3. Собираем новое состояние.
  //    Зоны, ряды и места обновляем иммутабельно, всё остальное оставляем как есть.
  return {
    ...state,

    // Двигаем только те зоны, которые выделены (zoneIdsToMove).
    zones: state.zones.map((z) =>
      zoneIdsToMove.has(z.id) ? { ...z, x: z.x + dx, y: z.y + dy } : z
    ),

    // Двигаем ряды, которые:
    //  - непосредственно выделены, ИЛИ
    //  - принадлежат выделенным зонам (см. rowIdsToMove).
    rows: state.rows.map((r) => (rowIdsToMove.has(r.id) ? { ...r, x: r.x + dx, y: r.y + dy } : r)),

    // Для мест смотрим:
    //  - если их rowId входит в rowIdsToMove — сдвигаем вместе с рядом;
    //  - если их zoneId входит в zoneIdsToMove — тоже двигаем (на случай, если есть места без ряда, но в зоне).
    seats: state.seats.map((s) => {
      const shouldMove = rowIdsToMove.has(s.rowId ?? "") || zoneIdsToMove.has(s.zoneId ?? "");
      return shouldMove ? { ...s, x: s.x + dx, y: s.y + dy } : s;
    }),
  };
}
