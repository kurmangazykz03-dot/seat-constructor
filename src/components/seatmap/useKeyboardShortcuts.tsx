// src/components/seatmap/useKeyboardShortcuts.ts
import { useEffect } from "react";

import type { Row, Seat, Zone } from "../../types/types";

type EntitiesState = { seats: Seat[]; rows: Row[]; zones: Zone[] };
 interface UseKeyboardShortcutsProps {
   selectedIds: string[];
   setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
   state: EntitiesState;
   setState: (updater: (prev: any) => any) => void; // допускаем любой расширенный стейт
   onDuplicate?: () => void;
 }

export const useKeyboardShortcuts = ({
  selectedIds,
  setSelectedIds,
  state,
  setState,
  onDuplicate,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable) {
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

      // ===== Delete / Backspace =====
      if (selectedIds.length > 0 && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          seats: prev.seats.filter((s) => !selectedIds.includes(s.id)),
          rows: prev.rows.filter((r) => !selectedIds.includes(r.id)),
          zones: prev.zones.filter((z) => !selectedIds.includes(z.id)),
        }));
        setSelectedIds([]);
        return;
      }
      // ===== Nudge arrows (←↑→↓) + Shift=×10 =====
const arrows = new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"]);
if (arrows.has(e.key)) {
  e.preventDefault();
  const step = e.shiftKey ? 10 : 1;
  const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
  const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;

  const selSeatIds = new Set(selectedIds.filter(id => id.startsWith("seat-")));
  const selRowIds  = new Set(selectedIds.filter(id => id.startsWith("row-")));
  const selZoneIds = new Set(selectedIds.filter(id => id.startsWith("zone-")));

  setState((prev) => {
    // двигаем зоны
    const zones = prev.zones.map(z =>
      selZoneIds.has(z.id) ? { ...z, x: z.x + dx, y: z.y + dy } : z
    );

    // ряды: двигаем сами ряды...
    const rows = prev.rows.map(r =>
      selRowIds.has(r.id) ? { ...r, x: r.x + dx, y: r.y + dy } : r
    );

    // ...и сиденья тех рядов, которые выбраны (если сами сиденья не выделены отдельно)
    const moveRowSeat = (s: Seat) =>
      selRowIds.has(s.rowId ?? "") && !selSeatIds.has(s.id);

    // сиденья: двигаем выделенные + «подчинённые» рядам/зонам
    const seats = prev.seats.map(s => {
      if (selSeatIds.has(s.id)) return { ...s, x: s.x + dx, y: s.y + dy };

      // если выбрана зона — двигаем все её ряды/сиденья (если сами не выделены)
      const zoneSelected = selZoneIds.has(prev.rows.find(r => r.id === s.rowId)?.zoneId ?? "");
      if (zoneSelected && !selSeatIds.has(s.id) && !selRowIds.has(s.rowId ?? "")) {
        return { ...s, x: s.x + dx, y: s.y + dy };
      }

      if (moveRowSeat(s)) return { ...s, x: s.x + dx, y: s.y + dy };
      return s;
    });

    return { ...prev, zones, rows, seats };
  });

  return;
}


      // ===== Copy (Ctrl/⌘ + C) =====
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();

        const copiedSeats = seats.filter((s) => selectedIds.includes(s.id));

        const copiedRows = rows
          .filter((r) => selectedIds.includes(r.id))
          .map((r) => ({
            ...r,
            seats: seats.filter((s) => s.rowId === r.id),
          }));

        const copiedZones = zones
          .filter((z) => selectedIds.includes(z.id))
          .map((z) => ({
            ...z,
            rows: rows
              .filter((r) => r.zoneId === z.id)
              .map((r) => ({
                ...r,
                seats: seats.filter((s) => s.rowId === r.id),
              })),
          }));

        const clipboard = { seats: copiedSeats, rows: copiedRows, zones: copiedZones };
        localStorage.setItem("seatmap_clipboard", JSON.stringify(clipboard));
        return;
      }

      // ===== Paste (Ctrl/⌘ + V) =====
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        const data = localStorage.getItem("seatmap_clipboard");
        if (!data) return;

        const parsed = JSON.parse(data);
        const offset = 40;

        const newSeats: Seat[] = [];
        const newRows: Row[] = [];
        const newZones: Zone[] = [];
        const newSelected: string[] = [];

        // 1) зоны целиком
        (parsed.zones || []).forEach((z: Zone & { rows?: (Row & { seats?: Seat[] })[] }) => {
          const newZoneId = `zone-${crypto.randomUUID()}`;
          newZones.push({
            ...z,
            id: newZoneId,
            x: z.x + offset,
            y: z.y + offset,

            rows: undefined,
          });
          newSelected.push(newZoneId);

          // скопировать ряды зоны
          (z.rows || []).forEach((r) => {
            const newRowId = `row-${crypto.randomUUID()}`;
            newRows.push({
              ...r,
              id: newRowId,
              zoneId: newZoneId,
              x: r.x + offset,
              y: r.y + offset,
              seats: undefined,
            });

            // скопировать места ряда
            (r.seats || []).forEach((s: Seat) => {
              newSeats.push({
                ...s,
                id: `seat-${crypto.randomUUID()}`,
                rowId: newRowId,
                zoneId: newZoneId,
                x: s.x + offset,
                y: s.y + offset,
              });
            });
          });
        });

        // 2) одиночные ряды (без зон)
        (parsed.rows || []).forEach((r: Row & { seats?: Seat[] }) => {
          const newRowId = `row-${crypto.randomUUID()}`;
          newRows.push({
            ...r,
            id: newRowId,
            x: r.x + offset,
            y: r.y + offset,
            seats: undefined,
          });
          newSelected.push(newRowId);

          (r.seats || []).forEach((s: Seat) => {
            newSeats.push({
              ...s,
              id: `seat-${crypto.randomUUID()}`,
              rowId: newRowId,
              x: s.x + offset,
              y: s.y + offset,
            });
          });
        });

        // 3) одиночные места
        (parsed.seats || []).forEach((s: Seat) => {
          const nsId = `seat-${crypto.randomUUID()}`;
          newSeats.push({
            ...s,
            id: nsId,
            x: s.x + offset,
            y: s.y + offset,
          });
          newSelected.push(nsId);
        });

        setState((prev) => ({
          ...prev,
          seats: [...prev.seats, ...newSeats],
          rows: [...prev.rows, ...newRows],
          zones: [...prev.zones, ...newZones],
        }));

        if (newSelected.length) setSelectedIds(newSelected);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, state, setState, setSelectedIds, onDuplicate]);
};
