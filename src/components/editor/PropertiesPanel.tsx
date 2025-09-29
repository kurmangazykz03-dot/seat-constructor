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

  const updateSeat = (field: keyof Seat, value: string) => {
    if (!selectedSeat) return;
    setSeats((prev) =>
      prev.map((seat) =>
        seat.id === selectedSeat.id ? { ...seat, [field]: value } : seat
      )
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
        {selectedSeat && (
  <>
    <div className="text-[#404040] mb-2 text-sm">
      Selected: Seat {selectedSeat.label}
    </div>

    {/* Label */}
    <div className="mb-4">
      <label className="block text-sm text-[#404040]">Label</label>
      <input
        type="text"
        value={selectedSeat.label}
        onChange={(e) => updateSeat("label", e.target.value)}
        className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
      />
    </div>

    {/* Category */}
    <div className="mb-4">
      <label className="block text-sm text-[#404040]">Category</label>
      <select
        value={selectedSeat.category}
        onChange={(e) =>
          updateSeat("category", e.target.value as "standard" | "vip")
        }
        className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
      >
        <option value="standard">Standard</option>
        <option value="vip">VIP</option>
      </select>
    </div>

    {/* Status */}
    <div className="mb-4">
      <label className="block text-sm text-[#404040]">Status</label>
      <select
        value={selectedSeat.status}
        onChange={(e) =>
          updateSeat(
            "status",
            e.target.value as "available" | "occupied" | "disabled"
          )
        }
        className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
      >
        <option value="available">Available</option>
        <option value="occupied">Occupied</option>
        <option value="disabled">Disabled</option>
      </select>
    </div>

    {/* Color */}
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
            aria-label="color"
          />
        ))}
      </div>
    </div>
  </>
)}

       {selectedRow && (
  <>
    <div className="text-[#404040] mb-2 text-sm">
      Selected: Row {selectedRow.label}
    </div>

    {/* Label */}
    <div className="mb-4">
      <label className="block text-sm text-[#404040]">Label</label>
      <input
        type="text"
        value={selectedRow.label}
        onChange={(e) => updateRow("label", e.target.value)}
        className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
      />
    </div>

    {/* X Position */}
    <div className="mb-4">
      <label className="block text-sm text-[#404040]">X Position</label>
      <input
        type="number"
        value={selectedRow.x}
        onChange={(e) => updateRow("x", Number(e.target.value))}
        className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
      />
    </div>

    {/* Y Position */}
    <div className="mb-4">
      <label className="block text-sm text-[#404040]">Y Position</label>
      <input
        type="number"
        value={selectedRow.y}
        onChange={(e) => updateRow("y", Number(e.target.value))}
        className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
      />
    </div>

    {/* Category */}
    <div className="mb-4">
      <label className="block text-sm text-[#404040]">Category</label>
      <select
        value={selectedRow.category ?? "standard"}
        onChange={(e) =>
          updateRow("category", e.target.value as "standard" | "vip")
        }
        className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
      >
        <option value="standard">Standard</option>
        <option value="vip">VIP</option>
      </select>
    </div>

    {/* Status */}
    <div className="mb-4">
      <label className="block text-sm text-[#404040]">Status</label>
      <select
        value={selectedRow.status ?? "available"}
        onChange={(e) =>
          updateRow(
            "status",
            e.target.value as "available" | "occupied" | "disabled"
          )
        }
        className="mt-1 block w-full border border-[#D4D4D4] rounded-[8px] p-2 text-sm text-black bg-white"
      >
        <option value="available">Available</option>
        <option value="occupied">Occupied</option>
        <option value="disabled">Disabled</option>
      </select>
    </div>

    {/* Color */}
    <div className="mb-4">
      <label className="block text-sm text-[#404040] mb-2">Color</label>
      <div className="flex gap-2">
        {["#22c55e", "#ef4444", "#9ca3af", "#eab308"].map((color) => (
          <button
            key={color}
            type="button"
            className={`w-8 h-8 border border-gray-300 rounded-md ${
              selectedRow.fill === color ? "ring-2 ring-black" : ""
            }`}
            style={{ backgroundColor: color }}
            onClick={() => updateRow("fill", color)}
            aria-label="color"
          />
        ))}
      </div>
    </div>
  </>
)}

        {selectedZone && (
          <>
            <div className="text-[#404040] mb-2 text-sm">
              Selected: Zone {selectedZone.label}
            </div>
            {/* Zone Name */}
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