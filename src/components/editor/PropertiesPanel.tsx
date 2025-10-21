// src/components/editor/PropertiesPanel.tsx
import React from "react";
import type { SeatmapState } from "../../pages/EditorPage";
import type { Row, Seat, Zone } from "../../types/types";

interface PropertiesPanelProps {
  selectedIds: string[];
  state: SeatmapState;
  setState: (updater: (prev: SeatmapState) => SeatmapState) => void;
}

const CATEGORY_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "vip", label: "VIP" },
  { value: "discount", label: "Discount" },
] as const;

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "disabled", label: "Disabled" },
] as const;

const COLOR_OPTIONS = ["#22c55e", "#ef4444", "#9ca3af", "#eab308"];
const SNAP_Y_THRESHOLD = 12;

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-2">
    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 bg-white focus:ring-blue-500 focus:border-blue-500 transition-colors ${props.className ?? ""}`}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  children,
  ...props
}) => (
  <select
    {...props}
    className={`w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 bg-white appearance-none focus:ring-blue-500 focus:border-blue-500 transition-colors ${props.className ?? ""}`}
  >
    {children}
  </select>
);
export default function PropertiesPanel({ selectedIds, state, setState }: PropertiesPanelProps) {
  const { seats, rows, zones } = state;

  const selectedZones = zones.filter((z) => selectedIds.includes(z.id));
  const selectedRows = rows.filter((r) => selectedIds.includes(r.id));
  const selectedSeats = seats.filter((s) => selectedIds.includes(s.id));

  const updateZone = (zoneId: string, patch: Partial<Zone>) => {
    setState((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === zoneId ? { ...z, ...patch } : z)),
    }));
  };

  const updateRowAndSeats = (rowId: string, patch: Partial<Row> & { x?: number; y?: number }) => {
    setState((prev) => {
      const row = prev.rows.find((r) => r.id === rowId);
      if (!row) return prev;
      const dx = patch.x != null ? patch.x - row.x : 0;
      const dy = patch.y != null ? patch.y - row.y : 0;

      return {
        ...prev,
        rows: prev.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
        seats: prev.seats.map((s) => (s.rowId === rowId ? { ...s, x: s.x + dx, y: s.y + dy } : s)),
      };
    });
  };

  const updateSeat = (seatId: string, patch: Partial<Seat>) => {
    setState((prev) => ({
      ...prev,
      seats: prev.seats.map((s) => (s.id === seatId ? { ...s, ...patch } : s)),
    }));
  };

  const updateAllSeatsOfSelectedRows = (patch: Partial<Seat>) => {
    const rowIds = new Set(selectedRows.map((r) => r.id));
    if (rowIds.size === 0) return;
    setState((prev) => ({
      ...prev,
      seats: prev.seats.map((s) => (s.rowId && rowIds.has(s.rowId) ? { ...s, ...patch } : s)),
    }));
  };

  if (selectedIds.length === 0) {
    return (
      <div className="w-[320px] bg-gray-50 border-l border-gray-200 p-6 shadow-lg h-full overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Properties</h2>
        <p className="text-sm text-gray-500">
          Выберите зону, ряд или место, чтобы редактировать свойства.
        </p>
      </div>
    );
  }
  const [rotDraft, setRotDraft] = React.useState<Record<string, string>>({});

  return (
    <div className="w-[320px] bg-gray-50 border-l border-gray-200 p-6 shadow-lg h-full overflow-y-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Properties</h2>

      {selectedZones.map((zone) => (
        <div
          key={zone.id}
          className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <h3 className="text-base font-semibold text-blue-700 mb-3">Zone: {zone.label}</h3>

          <Field label="Zone Label">
            <TextInput
              type="text"
              value={zone.label}
              onChange={(e) => updateZone(zone.id, { label: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="X">
              <TextInput
                type="number"
                value={Math.round(zone.x)}
                onChange={(e) => updateZone(zone.id, { x: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Y">
              <TextInput
                type="number"
                value={Math.round(zone.y)}
                onChange={(e) => updateZone(zone.id, { y: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Width">
              <TextInput
                type="number"
                value={Math.round(zone.width)}
                onChange={(e) => {
                  const w = Math.max(10, Number(e.target.value) || 0);
                  updateZone(zone.id, { width: w });
                }}
              />
            </Field>
            <Field label="Height">
              <TextInput
                type="number"
                value={Math.round(zone.height)}
                onChange={(e) => {
                  const h = Math.max(10, Number(e.target.value) || 0);
                  updateZone(zone.id, { height: h });
                }}
              />
            </Field>
          </div>

          <Field label="Rotation (°)">
            <TextInput
              type="text"
              inputMode="numeric"
              value={rotDraft[zone.id] ?? String(zone.rotation ?? 0)}
              onChange={(e) => {
                setRotDraft((prev) => ({ ...prev, [zone.id]: e.target.value }));
              }}
              onBlur={() => {
                const raw = rotDraft[zone.id] ?? String(zone.rotation ?? 0);
                const n = Number(raw.trim());

                const finalVal = Number.isFinite(n) ? Math.round(n) : (zone.rotation ?? 0);

                updateZone(zone.id, { rotation: finalVal });
                setRotDraft((prev) => {
                  const copy = { ...prev };
                  delete copy[zone.id];
                  return copy;
                });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
              }}
              placeholder="e.g. -45"
            />
          </Field>

          <Field label="Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={zone.color ?? zone.fill ?? "#ffffff"}
                onChange={(e) =>
                  updateZone(zone.id, { color: e.target.value, fill: e.target.value })
                }
                className="w-10 h-10 rounded-lg border"
              />
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    className={`w-6 h-6 rounded-full border ${c === (zone.color ?? zone.fill) ? "ring-2 ring-blue-500" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => updateZone(zone.id, { color: c, fill: c })}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </Field>
        </div>
      ))}

      {selectedRows.map((row) => {
        const rowSeats = seats.filter((s) => s.rowId === row.id);

        return (
          <div
            key={row.id}
            className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100"
          >
            <h3 className="text-base font-semibold text-green-700 mb-3">Row: {row.label}</h3>

            <Field label="Row Label">
              <TextInput
                type="text"
                value={row.label}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    rows: prev.rows.map((r) =>
                      r.id === row.id ? { ...r, label: e.target.value } : r
                    ),
                  }))
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="X">
                <TextInput
                  type="number"
                  value={Math.round(row.x)}
                  onChange={(e) => updateRowAndSeats(row.id, { x: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Y">
                <TextInput
                  type="number"
                  value={Math.round(row.y)}
                  onChange={(e) => updateRowAndSeats(row.id, { y: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>

            {rowSeats.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                  Apply to all seats in row
                </h4>

                <Field label="Status">
                  <Select
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value as Seat["status"] | "";
                      if (val) updateAllSeatsOfSelectedRows({ status: val });
                    }}
                  >
                    <option value="">— Change status —</option>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Category">
                  <Select
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value as Seat["category"] | "";
                      if (val) updateAllSeatsOfSelectedRows({ category: val });
                    }}
                  >
                    <option value="">— Change category —</option>
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Color">
                  <div className="flex gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        style={{ backgroundColor: c }}
                        className="w-7 h-7 rounded-lg shadow-sm hover:scale-105 transition"
                        onClick={() => updateAllSeatsOfSelectedRows({ fill: c })}
                        title={c}
                      />
                    ))}
                  </div>
                </Field>
              </div>
            )}
          </div>
        );
      })}

      {selectedSeats.map((seat) => {
        const row = seat.rowId ? rows.find((r) => r.id === seat.rowId) : undefined;
        return (
          <div
            key={seat.id}
            className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100"
          >
            <h3 className="text-base font-semibold text-purple-700 mb-3">Seat: {seat.label}</h3>

            <Field label="Seat Label">
              <TextInput
                type="text"
                value={seat.label}
                onChange={(e) => updateSeat(seat.id, { label: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="X">
                <TextInput
                  type="number"
                  value={Math.round(seat.x)}
                  onChange={(e) => updateSeat(seat.id, { x: Number(e.target.value) || 0 })}
                />
              </Field>

              <Field label="Y">
                <TextInput
                  type="number"
                  value={Math.round(seat.y)}
                  onChange={(e) => {
                    const ny = Number(e.target.value) || 0;

                    if (row) {
                      const dy = Math.abs(ny - row.y);
                      if (dy <= SNAP_Y_THRESHOLD) {
                        updateSeat(seat.id, { y: row.y });
                      } else {
                        updateSeat(seat.id, { y: ny, rowId: null });
                      }
                    } else {
                      updateSeat(seat.id, { y: ny });
                    }
                  }}
                />
              </Field>
            </div>

            <Field label="Status">
              <Select
                value={seat.status}
                onChange={(e) => updateSeat(seat.id, { status: e.target.value as Seat["status"] })}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Category">
              <Select
                value={(seat.category as string) || "standard"}
                onChange={(e) => updateSeat(seat.id, { category: e.target.value })}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={seat.fill}
                  onChange={(e) => updateSeat(seat.id, { fill: e.target.value })}
                  className="w-10 h-10 rounded-lg border"
                />
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full shadow-inner transition-transform hover:scale-110 ${
                        seat.fill === c ? "ring-2 ring-offset-1 ring-blue-500" : ""
                      }`}
                      onClick={() => updateSeat(seat.id, { fill: c })}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </Field>
          </div>
        );
      })}
    </div>
  );
}
