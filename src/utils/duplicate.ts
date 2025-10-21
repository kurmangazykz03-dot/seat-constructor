// src/utils/duplicate.ts
import type { SeatmapState } from "../pages/EditorPage";
import type { Row, Seat, Zone } from "../types/types";

const newId = () => `id-${crypto.randomUUID()}`;

export function duplicateSelected(
  state: SeatmapState,
  selectedIds: string[],
  offset = 24
): { next: SeatmapState; newSelectedIds: string[] } {
  const zonesById = new Map(state.zones.map(z => [z.id, z]));
  const rowsById  = new Map(state.rows.map(r => [r.id, r]));

  const selectedZones = state.zones.filter(z => selectedIds.includes(z.id));
  const selectedRows  = state.rows.filter(r => selectedIds.includes(r.id));
  const selectedSeats = state.seats.filter(s => selectedIds.includes(s.id));


  if (selectedZones.length > 0) {
    const newZones: Zone[] = [];
    const newRows: Row[]   = [];
    const newSeats: Seat[] = [];
    const newSel: string[] = [];

    for (const z of selectedZones) {
      const nzId = newId();
      newZones.push({
        ...z,
        id: nzId,
        x: z.x + offset,
        y: z.y + offset,
      });
      newSel.push(nzId);


      const rowsInZone = state.rows.filter(r => r.zoneId === z.id);
      const rowIdMap = new Map<string, string>();

      for (const r of rowsInZone) {
        const nrId = newId();
        rowIdMap.set(r.id, nrId);
        newRows.push({
          ...r,
          id: nrId,
          zoneId: nzId,

        });
      }


      const seatsInZone = state.seats.filter(s => s.zoneId === z.id);
      for (const s of seatsInZone) {
        newSeats.push({
          ...s,
          id: newId(),
          zoneId: nzId,
          rowId: s.rowId ? rowIdMap.get(s.rowId) ?? null : null,

        });
      }
    }

    const next: SeatmapState = {
      ...state,
      zones: [...state.zones, ...newZones],
      rows:  [...state.rows,  ...newRows],
      seats: [...state.seats, ...newSeats],
    };
    return { next, newSelectedIds: newSel };
  }


  if (selectedRows.length > 0) {
    const newRows: Row[]   = [];
    const newSeats: Seat[] = [];
    const newSel: string[] = [];

    for (const r of selectedRows) {
      const nrId = newId();
      newRows.push({
        ...r,
        id: nrId,
        x: r.x + offset, 
        y: r.y + offset,
      });
      newSel.push(nrId);

      const seatsInRow = state.seats.filter(s => s.rowId === r.id);
      for (const s of seatsInRow) {
        newSeats.push({
          ...s,
          id: newId(),
          rowId: nrId,
          x: s.x + offset,
          y: s.y + offset,
        });
      }
    }

    const next: SeatmapState = {
      ...state,
      rows:  [...state.rows,  ...newRows],
      seats: [...state.seats, ...newSeats],
    };
    return { next, newSelectedIds: newSel };
  }


  if (selectedSeats.length > 0) {
    const newSeats: Seat[] = [];
    const newSel: string[] = [];
    for (const s of selectedSeats) {
      const nsId = newId();
      newSeats.push({
        ...s,
        id: nsId,
        x: s.x + offset,
        y: s.y + offset,
      });
      newSel.push(nsId);
    }
    const next: SeatmapState = { ...state, seats: [...state.seats, ...newSeats] };
    return { next, newSelectedIds: newSel };
  }


  return { next: state, newSelectedIds: [] };
}
