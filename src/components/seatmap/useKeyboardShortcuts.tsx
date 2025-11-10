// src/components/seatmap/useKeyboardShortcuts.ts
import { useEffect } from "react";
import type { Row, Seat, ShapeObject, TextObject, Zone } from "../../types/types";

type EntitiesState = {
  seats: Seat[];
  rows: Row[];
  zones: Zone[];
  texts?: TextObject[];
  shapes?: ShapeObject[];
};

interface UseKeyboardShortcutsProps {
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  state: EntitiesState;
  setState: (updater: (prev: any) => any) => void; // допускаем расширенный стейт
  onDuplicate?: () => void;
}

// Проверяем, вводит ли пользователь текст (input/textarea/contentEditable)
const isEditable = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (t as HTMLElement).isContentEditable
  );
};

// Форматы для сидений в буфере обмена:

// 1) seat, который лежит внутри ряда/зоны (локальные координаты)
type ClipboardSeat =
  | (Seat & { __mode?: "local" })
  // 2) seat, который скопирован как "свободный" объект в мировых координатах
  | ({ id: string } & {
      x: number;
      y: number;
      zoneId: null;
      rowId: null;
      radius?: number;
      fill?: string;
      label?: string;
      status?: string;
      category?: string;
      __mode: "world";
    });

type ClipboardRow = Row & { seats?: ClipboardSeat[] };
type ClipboardZone = Zone & { rows?: ClipboardRow[] };

// Структура, которую кладём в localStorage в виде JSON
type SeatmapClipboard = {
  zones: ClipboardZone[];
  rows: ClipboardRow[]; // ряды без зон (зоны не скопированы)
  seats: ClipboardSeat[]; // одиночные «свободные» места (world)
  texts?: TextObject[];
  shapes?: ShapeObject[];
};

export const useKeyboardShortcuts = ({
  selectedIds,
  setSelectedIds,
  state,
  setState,
  onDuplicate,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // если фокус в вводимом поле — выходим (кроме спец. случая ниже)
      if (isEditable(e.target) || e.defaultPrevented) return;

      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      const isEditing =
        tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable;

      const isDeleteKey = e.key === "Delete" || e.key === "Backspace";

      // Разрешаем Delete/Backspace удалять выделенные объекты даже если фокус в инпуте.
      // Все остальные хоткеи блокируем, если пользователь в режиме ввода.
      if (isEditing && !(isDeleteKey && selectedIds.length > 0)) {
        return;
      }

      // ===== Duplicate (Ctrl/⌘ + D) =====
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        if (onDuplicate) {
          e.preventDefault();
          onDuplicate();
          return;
        }
      }

      const { seats, rows, zones } = state;
      const texts = state.texts ?? [];
      const shapes = state.shapes ?? [];

      // ===== Delete / Backspace (каскадное удаление) =====
      if (selectedIds.length > 0 && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();

        setState((prev: EntitiesState) => {
          const sel = new Set(selectedIds);

          // Удаляем зоны:
          const delZones = new Set(prev.zones.filter((z) => sel.has(z.id)).map((z) => z.id));

          // Ряды, выбранные напрямую:
          const delRowsDirect = new Set(prev.rows.filter((r) => sel.has(r.id)).map((r) => r.id));

          // Ряды, принадлежащие удаляемым зонам:
          const delRowsFromZones = new Set(
            prev.rows.filter((r) => delZones.has(r.zoneId)).map((r) => r.id)
          );

          // Все удаляемые ряды:
          const delRows = new Set([...delRowsDirect, ...delRowsFromZones]);

          // Места из удаляемых рядов:
          const delSeatsFromRows = new Set(
            prev.seats.filter((s) => s.rowId && delRows.has(s.rowId)).map((s) => s.id)
          );
          // Места, выделенные напрямую:
          const delSeatsDirect = new Set(prev.seats.filter((s) => sel.has(s.id)).map((s) => s.id));
          // Все удаляемые места:
          const delSeats = new Set([...delSeatsFromRows, ...delSeatsDirect]);

          // Тексты и шейпы:
          const prevTexts = prev.texts ?? [];
          const prevShapes = prev.shapes ?? [];
          const delTextIds = new Set(prevTexts.filter((t) => sel.has(t.id)).map((t) => t.id));
          const delShapeIds = new Set(prevShapes.filter((sh) => sel.has(sh.id)).map((sh) => sh.id));

          return {
            ...prev,
            zones: prev.zones.filter((z) => !delZones.has(z.id)),
            rows: prev.rows.filter((r) => !delRows.has(r.id)),
            seats: prev.seats.filter((s) => !delSeats.has(s.id)),
            texts: prevTexts.filter((t) => !delTextIds.has(t.id)),
            shapes: prevShapes.filter((sh) => !delShapeIds.has(sh.id)),
          };
        });

        // после удаления — снимаем выделение
        setSelectedIds([]);
        return;
      }

      // ===== Сдвиг стрелками (←↑→↓) + Shift = ×10 =====
      const arrows = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);
      if (arrows.has(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;

        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;

        // Разделяем выделение по типам id
        const selSeatIds = new Set(selectedIds.filter((id) => id.startsWith("seat-")));
        const selRowIds = new Set(selectedIds.filter((id) => id.startsWith("row-")));
        const selZoneIds = new Set(selectedIds.filter((id) => id.startsWith("zone-")));
        const selTextIds = new Set(selectedIds.filter((id) => id.startsWith("text-")));
        const selShapeIds = new Set(selectedIds.filter((id) => id.startsWith("shape-")));

        setState((prev: EntitiesState) => {
          // Зоны двигаем целиком
          const zones = prev.zones.map((z) =>
            selZoneIds.has(z.id) ? { ...z, x: z.x + dx, y: z.y + dy } : z
          );

          // Ряды двигаем, если выделены
          const rows = prev.rows.map((r) =>
            selRowIds.has(r.id) ? { ...r, x: r.x + dx, y: r.y + dy } : r
          );

          // Тексты и шейпы живут в мировых координатах → просто сдвигаем
          const texts = (prev.texts ?? []).map((t) =>
            selTextIds.has(t.id) ? { ...t, x: t.x + dx, y: t.y + dy } : t
          );
          const shapes = (prev.shapes ?? []).map((sh) =>
            selShapeIds.has(sh.id) ? { ...sh, x: sh.x + dx, y: sh.y + dy } : sh
          );

          // Сиденья:
          //  - если сиденье выделено напрямую — двигаем
          //  - если выбран ряд — двигаем его сиденья
          //  - если выбрана зона, а ряд не выбран — тоже двигаем (через зону)
          const seats = prev.seats.map((s) => {
            if (selSeatIds.has(s.id)) return { ...s, x: s.x + dx, y: s.y + dy };

            const rowSel = s.rowId ? selRowIds.has(s.rowId) : false;
            const zoneSel = (() => {
              const r = s.rowId ? prev.rows.find((rr) => rr.id === s.rowId) : null;
              return r ? selZoneIds.has(r.zoneId) : false;
            })();

            if (rowSel || (zoneSel && !rowSel)) {
              return { ...s, x: s.x + dx, y: s.y + dy };
            }

            return s;
          });

          return { ...prev, zones, rows, seats, texts, shapes };
        });

        return;
      }

      // ===== Copy (Ctrl/⌘ + C) =====
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();

        const sel = new Set(selectedIds);

        // выделенные сущности
        const zonesSel = zones.filter((z) => sel.has(z.id));
        const rowsSelDirect = rows.filter((r) => sel.has(r.id));
        const seatsSelDirect = seats.filter((s) => sel.has(s.id));

        const textsSel = texts.filter((t) => sel.has(t.id));
        const shapesSel = shapes.filter((sh) => sel.has(sh.id));

        // Ряды из выбранных зон
        const rowsFromZones = rows.filter((r) => zonesSel.some((z) => z.id === r.zoneId));

        // Места из выбранных зон и выбранных рядов
        const seatsFromZones = seats.filter((s) => zonesSel.some((z) => z.id === s.zoneId));
        const seatsFromRows = seats.filter((s) => rowsSelDirect.some((r) => r.id === s.rowId));

        // Итоговые ряды для копирования:
        // - все ряды из зон
        // - плюс те, которые выбраны напрямую, но не входят в зоны
        const rowIdsInZones = new Set(rowsFromZones.map((r) => r.id));
        const rowsToCopy = [
          ...rowsFromZones,
          ...rowsSelDirect.filter((r) => !rowIdsInZones.has(r.id)),
        ];

        // Места, попавшие через зоны или ряды (чтобы не дублировать)
        const seatIdsInRowsOrZones = new Set([
          ...seatsFromZones.map((s) => s.id),
          ...seatsFromRows.map((s) => s.id),
        ]);

        // Свободные (standalone) места — выбраны отдельно, но не попали через ряды/зоны
        const freeSeats = seatsSelDirect.filter((s) => !seatIdsInRowsOrZones.has(s.id));

        // -------- Собираем структуру буфера обмена --------

        // 1) Зоны с их рядами и местами (локальные coords для rows/seats)
        const clipZones: ClipboardZone[] = zonesSel.map((z) => ({
          ...z,
          rows: rows
            .filter((r) => r.zoneId === z.id)
            .map((r) => ({
              ...r,
              seats: seats
                .filter((s) => s.rowId === r.id)
                .map((s) => ({ ...s, __mode: "local" }) as ClipboardSeat),
            })),
        }));

        // 2) Ряды без зон — с их местами
        const clipRows: ClipboardRow[] = rowsToCopy
          .filter((r) => !zonesSel.some((z) => z.id === r.zoneId)) // исключаем те, что уже в clipZones
          .map((r) => ({
            ...r,
            seats: seats
              .filter((s) => s.rowId === r.id)
              .map((s) => ({ ...s, __mode: "local" }) as ClipboardSeat),
          }));

        // 3) Свободные сиденья — переводим в мировые координаты и обнуляем зону/ряд
        const clipSeats: ClipboardSeat[] = freeSeats.map((s) => {
          const z = s.zoneId ? zones.find((zz) => zz.id === s.zoneId) : null;
          const xw = (z ? z.x : 0) + s.x;
          const yw = (z ? z.y : 0) + s.y;

          return {
            id: s.id,
            x: xw,
            y: yw,
            zoneId: null,
            rowId: null,
            radius: s.radius,
            fill: s.fill,
            label: s.label,
            status: s.status,
            category: s.category,
            __mode: "world",
          };
        });

        const clipboard: SeatmapClipboard = {
          zones: clipZones,
          rows: clipRows,
          seats: clipSeats,
          texts: textsSel,
          shapes: shapesSel,
        };

        // Сохраняем всё в localStorage (вместо системного clipboard)
        localStorage.setItem("seatmap_clipboard", JSON.stringify(clipboard));
        return;
      }

      // ===== Paste (Ctrl/⌘ + V) =====
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();

        const data = localStorage.getItem("seatmap_clipboard");
        if (!data) return;

        const parsed = JSON.parse(data) as SeatmapClipboard;
        const offset = 40; // смещение вставленной копии, чтобы было видно

        const newSeats: Seat[] = [];
        const newRows: Row[] = [];
        const newZones: Zone[] = [];
        const newTexts: TextObject[] = [];
        const newShapes: ShapeObject[] = [];
        const newSelected: string[] = [];

        // карты старыйId → новыйId для зон/рядов
        const zoneIdMap = new Map<string, string>();
        const rowIdMap = new Map<string, string>();

        // 1) Вставляем зоны:
        //    - саму зону сдвигаем (x+offset, y+offset)
        //    - ряды/места оставляем в тех же локальных координатах
        (parsed.zones || []).forEach((z) => {
          const oldZoneId = z.id;
          const newZoneId = `zone-${crypto.randomUUID()}`;
          zoneIdMap.set(oldZoneId, newZoneId);

          newZones.push({
            ...z,
            id: newZoneId,
            x: z.x + offset,
            y: z.y + offset,
            // удаляем вложенные rows у копии зоны (они пойдут отдельным массивом)
            rows: undefined as any,
          });
          newSelected.push(newZoneId);

          (z.rows || []).forEach((r) => {
            const oldRowId = r.id;
            const newRowId = `row-${crypto.randomUUID()}`;
            rowIdMap.set(oldRowId, newRowId);

            newRows.push({
              ...r,
              id: newRowId,
              zoneId: newZoneId,
              seats: undefined as any,
            });

            (r.seats || []).forEach((s) => {
              newSeats.push({
                ...s,
                id: `seat-${crypto.randomUUID()}`,
                zoneId: newZoneId,
                rowId: newRowId,
              } as Seat);
            });
          });
        });

        // 2) Вставляем ряды, чьи зоны НЕ копировались секцией выше
        (parsed.rows || []).forEach((r) => {
          // если его зона уже скопирована как целая зона — этот ряд пропускаем
          if (zoneIdMap.has(r.zoneId)) return;

          const newRowId = `row-${crypto.randomUUID()}`;
          rowIdMap.set(r.id, newRowId);

          newRows.push({
            ...r,
            id: newRowId,
            x: r.x + offset,
            y: r.y + offset,
            seats: undefined as any,
          });
          newSelected.push(newRowId);

          (r.seats || []).forEach((s) => {
            newSeats.push({
              ...s,
              id: `seat-${crypto.randomUUID()}`,
              rowId: newRowId,
              x: s.x + offset,
              y: s.y + offset,
            } as Seat);
          });
        });

        // 3) Свободные места (world): просто вставляем с оффсетом и без родителей
        (parsed.seats || []).forEach((s) => {
          const nsId = `seat-${crypto.randomUUID()}`;
          const xw = (s as any).x ?? 0;
          const yw = (s as any).y ?? 0;

          newSeats.push({
            ...s,
            id: nsId,
            x: xw + offset,
            y: yw + offset,
            zoneId: null,
            rowId: null,
          } as Seat);
          newSelected.push(nsId);
        });

        // 4) Тексты и фигуры: просто смещаем в мировых координатах
        (parsed.texts || []).forEach((t) => {
          const nid = `text-${crypto.randomUUID()}`;
          newTexts.push({ ...t, id: nid, x: t.x + offset, y: t.y + offset });
          newSelected.push(nid);
        });

        (parsed.shapes || []).forEach((sh) => {
          const nid = `shape-${crypto.randomUUID()}`;
          newShapes.push({ ...sh, id: nid, x: sh.x + offset, y: sh.y + offset });
          newSelected.push(nid);
        });

        // Применяем к редактору
        setState((prev: any) => ({
          ...prev,
          seats: [...prev.seats, ...newSeats],
          rows: [...prev.rows, ...newRows],
          zones: [...prev.zones, ...newZones],
          texts: [...(prev.texts ?? []), ...newTexts],
          shapes: [...(prev.shapes ?? []), ...newShapes],
        }));

        // Выделяем только что вставленные объекты
        if (newSelected.length) setSelectedIds(newSelected);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, state, setState, setSelectedIds, onDuplicate]);
};
