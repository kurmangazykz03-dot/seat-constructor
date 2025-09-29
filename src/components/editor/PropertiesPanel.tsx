import { Dispatch, SetStateAction } from "react";
import { Seat, Zone, Row } from "../../pages/EditorPage";

interface PropertiesPanelProps {
  selectedId: string | null;
  seats: Seat[];
  setSeats: Dispatch<SetStateAction<Seat[]>>;
  zones: Zone[];
  setZones: Dispatch<SetStateAction<Zone[]>>;
  rows: Row[];
  setRows: Dispatch<SetStateAction<Row[]>>;
}

function PropertiesPanel({
  selectedId,
  seats,
  setSeats,
  zones,
  setZones,
  rows,
  setRows,
}: PropertiesPanelProps) {
  const selectedSeat = seats.find((seat) => seat.id === selectedId);
  const selectedZone = zones.find((zone) => zone.id === selectedId);
  const selectedRow = rows.find((row) => row.id === selectedId);

  const rowSeats = selectedRow
    ? seats.filter((seat) => seat.rowId === selectedRow.id)
    : [];

  // --- Обновление сидений ---
  const updateSeat = (field: keyof Seat, value: string | number, seatId?: string) => {
    setSeats((prev) =>
      prev.map((seat) => {
        if (seatId && seat.id !== seatId) return seat;
        if (!seatId && selectedRow && seat.rowId !== selectedRow.id) return seat;
        if (!seatId && !selectedRow && seat.id !== selectedSeat?.id) return seat;
        return { ...seat, [field]: value };
      })
    );
  };

  // --- Групповое обновление для ряда ---
  const updateRowSeats = (field: keyof Seat, value: string | number) => {
    if (!selectedRow) return;
    setSeats((prev) =>
      prev.map((seat) => (seat.rowId === selectedRow.id ? { ...seat, [field]: value } : seat))
    );
  };

  const updateZone = (field: keyof Zone, value: string) => {
    if (!selectedZone) return;
    setZones((prev) =>
      prev.map((zone) =>
        zone.id === selectedZone.id ? { ...zone, [field]: value } : zone
      )
    );
  };

  const updateRow = (field: keyof Row, value: string | number) => {
    if (!selectedRow) return;
    setRows((prev) =>
      prev.map((row) =>
        row.id === selectedRow.id ? { ...row, [field]: value } : row
      )
    );
  };

  if (!selectedSeat && !selectedZone && !selectedRow) {
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
      <div className="px-6 py-4 bg-[#FAFAFA] rounded-[12px]">
        {/* Seat */}
        {selectedSeat && (
          <>
            <div className="text-[#404040] mb-2 text-sm">
              Selected: Seat {selectedSeat.label}
            </div>
            <div className="mb-4">
              <label className="block text-sm text-[#404040]">Label</label>
              <input
                type="text"
                value={selectedSeat.label}
                onChange={(e) => updateSeat("label", e.target.value)}
                className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-[#404040]">Status</label>
              <select
                value={selectedSeat.status}
                onChange={(e) => updateSeat("status", e.target.value)}
                className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-[#404040] mb-2">Color</label>
              <div className="flex gap-2">
                {["#22c55e", "#ef4444", "#9ca3af", "#eab308"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 border border-gray-300 rounded-md ${
                      selectedSeat.fill === color ? "ring-2 ring-black" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateSeat("fill", color)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Row */}
        {selectedRow && (
          <>
            <div className="text-[#404040] mb-2 text-sm">
              Selected: Row {selectedRow.label}
            </div>

            <div className="mb-4">
              <label className="block text-sm text-[#404040]">Label</label>
              <input
                type="text"
                value={selectedRow.label}
                onChange={(e) => updateRow("label", e.target.value)}
                className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-[#404040]">X Position</label>
              <input
                type="number"
                value={selectedRow.x}
                onChange={(e) => updateRow("x", Number(e.target.value))}
                className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-[#404040]">Y Position</label>
              <input
                type="number"
                value={selectedRow.y}
                onChange={(e) => updateRow("y", Number(e.target.value))}
                className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
              />
            </div>

            {/* Групповое управление сиденьями ряда */}
            {rowSeats.length > 0 && (
              <>
                <div className="text-black mb-2 font-bold text-sm">Group Control</div>
                <div className="text-black mb-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm w-20">Status</label>
                    <select
                      onChange={(e) => updateRowSeats("status", e.target.value)}
                      className="text-black border border-gray-300 rounded px-2 py-1 text-sm"
                      value="" // просто для placeholder
                    >
                      <option value="">-- set all --</option>
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm w-20">Color</label>
                    {["#22c55e", "#ef4444", "#9ca3af", "#eab308"].map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: color }}
                        onClick={() => updateRowSeats("fill", color)}
                      />
                    ))}
                  </div>
                </div>

                {/* Индивидуальные сиденья */}
                <div className="mb-4">
                  <label className="block text-sm text-[#404040] mb-2">Seats in this row</label>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {rowSeats.map((seat) => (
                      <div key={seat.id} className="flex items-center gap-2">
                        <span className="text-sm w-6">{seat.label}</span>
                        <select
                          value={seat.status}
                          onChange={(e) => updateSeat("status", e.target.value, seat.id)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="available">Available</option>
                          <option value="occupied">Occupied</option>
                          <option value="disabled">Disabled</option>
                        </select>
                        {["#22c55e", "#ef4444", "#9ca3af", "#eab308"].map((color) => (
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
                </div>
              </>
            )}
          </>
        )}

        {/* Zone */}
        {selectedZone && (
          <>
            <div className="text-[#404040] mb-2 text-sm">
              Selected: Zone {selectedZone.label}
            </div>
            <div className="mb-4">
              <label className="block text-sm text-[#404040]">Zone Name</label>
              <input
                type="text"
                value={selectedZone.label}
                onChange={(e) => updateZone("label", e.target.value)}
                className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PropertiesPanel;