import { useEffect } from 'react';
import { Seat, Row, Zone } from '../../types/types';
import { SeatmapState } from '../../pages/EditorPage';

interface UseKeyboardShortcutsProps {
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  state: SeatmapState;
  setState: (updater: (prevState: SeatmapState) => SeatmapState) => void;
}

export const useKeyboardShortcuts = ({
  selectedIds,
  setSelectedIds,
  state,
  setState,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
      if (isInput) return;

      const { seats, rows, zones } = state;

      // 🗑 УДАЛЕНИЕ
      if (selectedIds.length > 0 && (e.key === "Delete" || e.key === "Backspace")) {
        setState(prev => ({
          ...prev,
          seats: prev.seats.filter(s => !selectedIds.includes(s.id)),
          rows: prev.rows.filter(r => !selectedIds.includes(r.id)),
          zones: prev.zones.filter(z => !selectedIds.includes(z.id)),
        }));
        setSelectedIds([]);
        return;
      }

      // 📋 КОПИРОВАНИЕ
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        const copiedSeats = seats.filter(s => selectedIds.includes(s.id));
        const copiedRows = rows
          .filter(r => selectedIds.includes(r.id))
          .map(r => ({ ...r, seats: seats.filter(s => s.rowId === r.id) }));
        const copiedZones = zones
          .filter(z => selectedIds.includes(z.id))
          .map(z => ({
            ...z,
            rows: rows
              .filter(r => r.zoneId === z.id)
              .map(r => ({ ...r, seats: seats.filter(s => s.rowId === r.id) })),
          }));

        const clipboard = { seats: copiedSeats, rows: copiedRows, zones: copiedZones };
        localStorage.setItem("seatmap_clipboard", JSON.stringify(clipboard));
        return;
      }

      // 📥 ВСТАВКА
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        const data = localStorage.getItem("seatmap_clipboard");
        if (!data) return;

        const parsed = JSON.parse(data);
        const offset = 40;
        const newSeats: Seat[] = [];
        const newRows: Row[] = [];
        const newZones: Zone[] = [];

        (parsed.zones || []).forEach((z: any) => {
          const newZoneId = `zone-${crypto.randomUUID()}`;
          const zoneRows: Row[] = (z.rows || []).map((r: any) => {
            const newRowId = `row-${crypto.randomUUID()}`;
            const rowSeats: Seat[] = (r.seats || []).map((s: Seat) => ({
              ...s,
              id: `seat-${crypto.randomUUID()}`,
              rowId: newRowId,
              zoneId: newZoneId,
              x: s.x + offset,
              y: s.y + offset,
            }));
            newSeats.push(...rowSeats);
            return { ...r, id: newRowId, zoneId: newZoneId, x: r.x + offset, y: r.y + offset };
          });
          newRows.push(...zoneRows);
          newZones.push({ ...z, id: newZoneId, rows: [], x: z.x + offset, y: z.y + offset });
        });

        (parsed.rows || []).forEach((r: any) => {
          const newRowId = `row-${crypto.randomUUID()}`;
          const rowSeats: Seat[] = (r.seats || []).map((s: Seat) => ({
            ...s,
            id: `seat-${crypto.randomUUID()}`,
            rowId: newRowId,
            x: s.x + offset,
            y: s.y + offset,
          }));
          newSeats.push(...rowSeats);
          newRows.push({ ...r, id: newRowId, seats: [], x: r.x + offset, y: r.y + offset });
        });

        (parsed.seats || []).forEach((s: Seat) => {
          newSeats.push({ ...s, id: `seat-${crypto.randomUUID()}`, x: s.x + offset, y: s.y + offset });
        });

        setState(prev => ({
          ...prev,
          seats: [...prev.seats, ...newSeats],
          rows: [...prev.rows, ...newRows],
          zones: [...prev.zones, ...newZones],
        }));

        setSelectedIds([...newSeats.map(s => s.id), ...newRows.map(r => r.id), ...newZones.map(z => z.id)]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, state, setState, setSelectedIds]);
};
