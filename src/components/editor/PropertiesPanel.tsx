import { Dispatch, SetStateAction } from "react";
import { Seat, Zone, Row } from "../../pages/EditorPage";

interface PropertiesPanelProps {
  selectedIds: string[];
  seats: Seat[];
  setSeats: Dispatch<SetStateAction<Seat[]>>;
  zones: Zone[];
  setZones: Dispatch<SetStateAction<Zone[]>>;
  rows: Row[];
  setRows: Dispatch<SetStateAction<Row[]>>;
}



function PropertiesPanel({
  selectedIds,
  seats,
  setSeats,
  zones,
  setZones,
  rows,
  setRows,
}: PropertiesPanelProps) {
  const updateRowPosition = (rowId: string, newX: number, newY: number) => {
  // получаем старую позицию ряда
  const oldRow = rows.find(r => r.id === rowId);
  if (!oldRow) return;

  const dx = newX - oldRow.x;
  const dy = newY - oldRow.y;

  // обновляем ряд
  setRows(prev =>
    prev.map(r => (r.id === rowId ? { ...r, x: newX, y: newY } : r))
  );

  // обновляем все сиденья в этом ряду
  setSeats(prev =>
    prev.map(s =>
      s.rowId === rowId ? { ...s, x: s.x + dx, y: s.y + dy } : s
    )
  );
};

  // Определяем выбранные объекты
  const selectedZones = zones.filter(zone => selectedIds.includes(zone.id));
  const selectedRows = rows.filter(row => selectedIds.includes(row.id));
  const selectedSeats = seats.filter(seat => selectedIds.includes(seat.id));

  // --- Обновление одного сиденья ---
  const updateSeat = (field: keyof Seat, value: string | number, seatId?: string) => {
    setSeats(prev =>
      prev.map(seat => {
        if (seatId && seat.id !== seatId) return seat;
        if (!seatId && selectedRows.length > 0 && !selectedRows.some(r => r.id === seat.rowId)) return seat;
        if (!seatId && selectedRows.length === 0 && !selectedSeats.includes(seat)) return seat;
        return { ...seat, [field]: value };
      })
    );
  };

  // --- Групповое обновление всех сидений выбранных рядов ---
  const updateRowSeats = (field: keyof Seat, value: string | number) => {
    const selectedRowIds = selectedRows.map(r => r.id);
    setSeats(prev =>
      prev.map(seat => (seat.rowId && selectedRowIds.includes(seat.rowId) ? { ...seat, [field]: value } : seat))
    );
  };

  // --- Обновление ряда ---
  const updateRow = (field: keyof Row, value: string | number) => {
    setRows(prev =>
      prev.map(row => (selectedRows.some(r => r.id === row.id) ? { ...row, [field]: value } : row))
    );
  };

  // --- Обновление зоны ---
  const updateZone = (field: keyof Zone, value: string) => {
    setZones(prev =>
      prev.map(zone => (selectedZones.some(z => z.id === zone.id) ? { ...zone, [field]: value } : zone))
    );
  };

  if (selectedIds.length === 0) {
    return (
      <div className="w-[320px] bg-white border-l border-[#e5e5e5] p-6 shadow-sm">
        <h2 className="font-bold mb-4 text-black">Properties</h2>
        <p className="text-sm text-gray-500">Select an object in the diagram</p>
      </div>
    );
  }

  return (
    <div className="w-[320px] bg-white border-l border-[#e5e5e5] p-6 shadow-sm">
      <h2 className="font-bold mb-4 text-black">Properties</h2>

      {/* Zones */}
      {selectedZones.length > 0 &&
        selectedZones.map(zone => (
          <div key={zone.id} className="mb-6 px-4 py-3 bg-[#FAFAFA] rounded-[12px]">
            <div className="text-[#404040] mb-2 text-sm">Selected: Zone {zone.label}</div>
            <label className="block text-sm text-[#404040] mb-1">Zone Name</label>
            <input
              type="text"
              value={zone.label}
              onChange={e => updateZone("label", e.target.value)}
              className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
            />
          </div>
        ))}

      {/* Rows */}
      {selectedRows.length > 0 &&
        selectedRows.map(row => {
          const rowSeats = seats.filter(seat => seat.rowId === row.id);
          return (
            <div key={row.id} className="text-black mb-6 px-4 py-3 bg-[#FAFAFA] rounded-[12px]">
              <div className="text-[#404040] mb-2 text-sm">Selected: Row {row.label}</div>
              <label className="block text-sm text-[#404040] mb-1">Label</label>
              <input
                type="text"
                value={row.label}
                onChange={e => updateRow("label", e.target.value)}
                className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
              />

             
            <div className="flex gap-2 mt-2">
  <div>
    <label className="block text-sm text-[#404040]">X</label>
    <input
      type="number"
      value={row.x}
      onChange={e => updateRowPosition(row.id, Number(e.target.value), row.y)}
      className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-1 text-sm text-black bg-white"
    />
  </div>
  <div>
    <label className="block text-sm text-[#404040]">Y</label>
    <input
      type="number"
      value={row.y}
      onChange={e => updateRowPosition(row.id, row.x, Number(e.target.value))}
      className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-1 text-sm text-black bg-white"
    />
  </div>
</div>


              {/* Групповое управление сиденьями */}
              {rowSeats.length > 0 && (
                <div className="mt-4">
                  <div className="text-black font-bold text-sm mb-2">Seats in this row</div>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {rowSeats.map(seat => (
                      <div key={seat.id} className="flex items-center gap-2">
                        <span className="text-sm w-6">{seat.label}</span>
                        <select
                          value={seat.status}
                          onChange={e => updateSeat("status", e.target.value, seat.id)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="available">Available</option>
                          <option value="occupied">Occupied</option>
                          <option value="disabled">Disabled</option>
                        </select>
                        {["#22c55e", "#ef4444", "#9ca3af", "#eab308"].map(color => (
                          <button
                            key={color}
                            className="w-5 h-5 rounded border"
                            style={{ backgroundColor: color }}
                            onClick={() => updateSeat("fill", color, seat.id)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <label className="text-sm">Set all seats:</label>
                    <select
                      onChange={e => updateRowSeats("status", e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="">-- Status --</option>
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>

                  <div className="flex gap-2 mt-1">
                    {["#22c55e", "#ef4444", "#9ca3af", "#eab308"].map(color => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: color }}
                        onClick={() => updateRowSeats("fill", color)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

      {/* Individual seats selected outside rows */}
      {selectedSeats.length > 0 && selectedSeats.map(seat => (
        <div key={seat.id} className="mb-6 px-4 py-3 bg-[#FAFAFA] rounded-[12px]">
          <div className="text-[#404040] mb-2 text-sm">Selected: Seat {seat.label}</div>
          <label className="block text-sm text-[#404040] mb-1">Label</label>
          <input
            type="text"
            value={seat.label}
            onChange={e => updateSeat("label", e.target.value, seat.id)}
            className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
          />
          <label className="block text-sm text-[#404040] mb-1 mt-2">Status</label>
          <select
            value={seat.status}
            onChange={e => updateSeat("status", e.target.value, seat.id)}
            className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
          >
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="disabled">Disabled</option>
          </select>
          <div className="flex gap-2 mt-2">
            {["#22c55e", "#ef4444", "#9ca3af", "#eab308"].map(color => (
              <button
                key={color}
                className="w-6 h-6 rounded border"
                style={{ backgroundColor: color }}
                onClick={() => updateSeat("fill", color, seat.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PropertiesPanel;