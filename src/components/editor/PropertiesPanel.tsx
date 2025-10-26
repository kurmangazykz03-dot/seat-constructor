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
const RADIUS_MIN = 6;
const RADIUS_MAX = 30;

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">{children}</div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-2">
    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition ${props.className ?? ""}`}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, ...props }) => (
  <select
    {...props}
    className={`w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white appearance-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition ${props.className ?? ""}`}
  >
    {children}
  </select>
);

export default function PropertiesPanel({ selectedIds, state, setState }: PropertiesPanelProps) {
  const { seats, rows, zones } = state;

  const [rotDraft, setRotDraft] = React.useState<Record<string, string>>({});

  const selectedZones = zones.filter((z) => selectedIds.includes(z.id));
  const selectedRows  = rows.filter((r) => selectedIds.includes(r.id));
  const selectedSeats = seats.filter((s) => selectedIds.includes(s.id));

  const selectedSeatIdSet = React.useMemo(
    () => new Set(selectedSeats.map((s) => s.id)),
    [selectedSeats]
  );
 

  // ——— helpers ———
  const updateZone = (zoneId: string, patch: Partial<Zone>) => {
    setState((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === zoneId ? { ...z, ...patch } : z)),
    }));
  };
const updateAllSeatsOfSelectedZones = (patch: Partial<Seat>) => {
  const zoneIds = new Set(selectedZones.map((z) => z.id));
  if (zoneIds.size === 0) return;
  setState(prev => ({
    ...prev,
    seats: prev.seats.map(s =>
      s.zoneId && zoneIds.has(s.zoneId) ? { ...s, ...patch } : s
    ),
  }));
};

  const distributeRowSeats = (rowId: string) => {
    setState(prev => {
      const seatsInRow = prev.seats.filter(s => s.rowId === rowId);
      if (seatsInRow.length < 2) return prev;

      const sorted = [...seatsInRow].sort((a,b) => a.x - b.x);
      const minX = sorted[0].x;
      const maxX = sorted[sorted.length - 1].x;
      const step = (maxX - minX) / (sorted.length - 1);
      const idxMap = new Map(sorted.map((s, i) => [s.id, i]));
      const rowY = prev.rows.find(r => r.id === rowId)?.y;

      return {
        ...prev,
        seats: prev.seats.map(s => {
          if (s.rowId !== rowId) return s;
          const i = idxMap.get(s.id);
          if (i == null) return s;
          return { ...s, x: Math.round(minX + step * i), y: rowY ?? s.y };
        }),
      };
    });
  };

  const renumberRowSeats = (rowId: string) => {
    setState(prev => {
      const sorted = prev.seats.filter(s => s.rowId === rowId).sort((a,b) => a.x - b.x);
      if (sorted.length === 0) return prev;

      const idxMap = new Map(sorted.map((s, i) => [s.id, i + 1]));
      return {
        ...prev,
        seats: prev.seats.map(s => {
          const num = idxMap.get(s.id);
          return num ? { ...s, colIndex: num, label: String(num) } : s;
        }),
      };
    });
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

  const updateSelectedSeatsBulk = (patch: Partial<Seat>) => {
    if (selectedSeatIdSet.size === 0) return;
    setState((prev) => ({
      ...prev,
      seats: prev.seats.map((s) => (selectedSeatIdSet.has(s.id) ? { ...s, ...patch } : s)),
    }));
  };



  // ——— empty state (после всех хуков) ———
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

  return (
    <div className="w-[320px] bg-gray-50 border-l border-gray-200 p-6 shadow-lg h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Properties</h2>
        <div className="text-xs text-gray-500">
          {selectedZones.length > 0 && <span className="mr-2">Zones: {selectedZones.length}</span>}
          {selectedRows.length > 0 && <span className="mr-2">Rows: {selectedRows.length}</span>}
          {selectedSeats.length > 0 && <span>Seats: {selectedSeats.length}</span>}
        </div>
      </div>

      {/* === Bulk editor for seats (multi-select) — добавлен RADIUS === */}
      {selectedSeats.length > 1 && (
        
        <Panel>
          <h3 className="text-sm font-semibold text-purple-700 mb-3">Bulk edit — Seats</h3>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Status">
              <Select
                defaultValue=""
                onChange={(e) =>
                  e.currentTarget.value &&
                  updateSelectedSeatsBulk({ status: e.currentTarget.value as Seat["status"] })
                }
              >
                <option value="">— keep —</option>
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
                onChange={(e) =>
                  e.currentTarget.value &&
                  updateSelectedSeatsBulk({ category: e.currentTarget.value })
                }
              >
                <option value="">— keep —</option>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label={`Radius (min ${RADIUS_MIN}, max ${RADIUS_MAX})`}>
              <TextInput
                type="number"
                inputMode="numeric"
                min={RADIUS_MIN}
                max={RADIUS_MAX}
                step={1}
                placeholder="e.g. 12"
                onKeyDown={(e) => {
     if (e.key !== "Enter") return;
     const v = Math.round(Number((e.currentTarget as HTMLInputElement).value));
     if (!Number.isFinite(v)) return;
     const r = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, v));
     updateSelectedSeatsBulk({ radius: r });
     (e.currentTarget as HTMLInputElement).value = "";
   }}
                onBlur={(e) => {
                  const v = Math.round(Number(e.currentTarget.value));
                  if (!Number.isFinite(v)) return;
                  const r = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, v));
                  updateSelectedSeatsBulk({ radius: r });
                  e.currentTarget.value = "";
                }}
              />
            </Field>
          </div>



          <Field label="Color">
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  style={{ backgroundColor: c }}
                  className="w-7 h-7 rounded-lg shadow-sm hover:scale-105 transition"
                  onClick={() => updateSelectedSeatsBulk({ fill: c })}
                  title={c}
                />
              ))}
            </div>
          </Field>
        </Panel>
      )}

      {/* === Bulk for seats in selected zones — НОВОЕ === */}
    {selectedZones.length > 0 && (
  <Panel>
    <h3 className="text-sm font-semibold text-blue-700 mb-3">
      Apply to all seats in selected zones
    </h3>

    <div className="grid grid-cols-2 gap-2">
      <Field label="Status">
        <Select defaultValue="" onChange={(e) => {
          if (!e.currentTarget.value) return;
          updateAllSeatsOfSelectedZones({ status: e.currentTarget.value as Seat["status"] });
        }}>
          <option value="">— keep —</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>

      <Field label="Category">
        <Select defaultValue="" onChange={(e) => {
          if (!e.currentTarget.value) return;
          updateAllSeatsOfSelectedZones({ category: e.currentTarget.value });
        }}>
          <option value="">— keep —</option>
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
    </div>

    <div className="mt-2 grid grid-cols-2 gap-2">
     <Field label={`Radius`}>
  <TextInput
    type="number"
    min={RADIUS_MIN}
    max={RADIUS_MAX}
    step={1}
    placeholder="— keep —"
    onKeyDown={(e) => {
      if (e.key !== "Enter") return;
      const n = Number((e.currentTarget as HTMLInputElement).value);
      if (Number.isFinite(n)) updateAllSeatsOfSelectedZones({ radius: Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, Math.round(n))) });
      (e.currentTarget as HTMLInputElement).value = "";
    }}
    onBlur={(e) => {
      const n = Number(e.currentTarget.value);
      if (Number.isFinite(n)) updateAllSeatsOfSelectedZones({ radius: Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, Math.round(n))) });
      e.currentTarget.value = "";
    }}
  />
</Field>


      <Field label="Color">
        <div className="flex gap-2">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c}
              style={{ backgroundColor: c }}
              className="w-7 h-7 rounded-lg shadow-sm hover:scale-105 transition"
              onClick={() => updateAllSeatsOfSelectedZones({ fill: c })}
              title={c}
            />
          ))}
        </div>
      </Field>
    </div>
  </Panel>
)}


      {/* === Zones === */}
      {selectedZones.map((zone) => (
        <Panel key={zone.id}>
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
                inputMode="numeric"
                step={1}
                value={Math.round(zone.x)}
                onChange={(e) => updateZone(zone.id, { x: Number(e.target.value) || 0 })}
                onBlur={(e) => {
                  if (e.currentTarget.value === "") updateZone(zone.id, { x: zone.x });
                }}
              />
            </Field>
            <Field label="Y">
              <TextInput
                type="number"
                inputMode="numeric"
                step={1}
                value={Math.round(zone.y)}
                onChange={(e) => updateZone(zone.id, { y: Number(e.target.value) || 0 })}
                onBlur={(e) => {
                  if (e.currentTarget.value === "") updateZone(zone.id, { y: zone.y });
                }}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Width">
              <TextInput
                type="number"
                inputMode="numeric"
                min={10}
                step={1}
                value={Math.round(zone.width)}
                onChange={(e) =>
                  updateZone(zone.id, { width: Math.max(10, Number(e.target.value) || 0) })
                }
                onBlur={(e) => {
                  const n = Math.max(10, Number(e.currentTarget.value) || 0);
                  updateZone(zone.id, { width: n });
                }}
              />
            </Field>
            <Field label="Height">
              <TextInput
                type="number"
                inputMode="numeric"
                min={10}
                step={1}
                value={Math.round(zone.height)}
                onChange={(e) =>
                  updateZone(zone.id, { height: Math.max(10, Number(e.target.value) || 0) })
                }
                onBlur={(e) => {
                  const n = Math.max(10, Number(e.currentTarget.value) || 0);
                  updateZone(zone.id, { height: n });
                }}
              />
            </Field>
          </div>

          <Field label="Rotation (°)">
            <TextInput
              type="text"
              inputMode="numeric"
              value={rotDraft[zone.id] ?? String(zone.rotation ?? 0)}
              onChange={(e) => setRotDraft((prev) => ({ ...prev, [zone.id]: e.target.value }))}
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
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
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

          {/* Background / opacity */}
          <Field label="Фон зоны">
            <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <div className="relative h-4 w-4 rounded border overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `
                        linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                        linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                        linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
                      `,
                      backgroundSize: "8px 8px",
                      backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                      backgroundColor: "#fff",
                    }}
                  />
                  {!zone.transparent && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: zone.color ?? zone.fill ?? "#ffffff",
                        opacity: zone.fillOpacity ?? 1,
                      }}
                    />
                  )}
                </div>
                <span className="text-xs text-gray-700">
                  {zone.transparent ? "Прозрачный" : "Заливка"}
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={zone.transparent ? "true" : "false"}
                onClick={() => updateZone(zone.id, { transparent: !zone.transparent })}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-out
                  ${zone.transparent ? "bg-emerald-500" : "bg-gray-300"}
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`}
                title="Переключить прозрачный фон"
              >
                <span
                  className={`pointer-events-none absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow ring-1 ring-gray-300 transition-all duration-300 ease-out
                    ${zone.transparent ? "left-4" : "left-1"}`}
                />
              </button>
            </div>
          </Field>

          {!zone.transparent && (
            <Field label={`Opacity: ${Math.round((zone.fillOpacity ?? 1) * 100)}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((zone.fillOpacity ?? 1) * 100)}
                onChange={(e) =>
                  updateZone(zone.id, { fillOpacity: Math.round(Number(e.target.value)) / 100 })
                }
                className="w-full accent-blue-600"
              />
            </Field>
          )}
        </Panel>
      ))}

      {/* === Rows === */}
      {selectedRows.map((row) => {
        const rowSeats = seats.filter((s) => s.rowId === row.id);
        return (
          <Panel key={row.id}>
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
                  inputMode="numeric"
                  step={1}
                  value={Math.round(row.x)}
                  onChange={(e) => updateRowAndSeats(row.id, { x: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Y">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  step={1}
                  value={Math.round(row.y)}
                  onChange={(e) => updateRowAndSeats(row.id, { y: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>

            {rowSeats.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => distributeRowSeats(row.id)}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border"
                  >
                    Distribute horizontally
                  </button>
                  <button
                    onClick={() => renumberRowSeats(row.id)}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border"
                  >
                    Renumber seats
                  </button>
                </div>

                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                  Apply to all seats in row
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Status">
                    <Select
                      defaultValue=""
                      onChange={(e) =>
                        e.currentTarget.value &&
                        updateAllSeatsOfSelectedRows({
                          status: e.currentTarget.value as Seat["status"],
                        })
                      }
                    >
                      <option value="">— keep —</option>
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
                      onChange={(e) =>
                        e.currentTarget.value &&
                        updateAllSeatsOfSelectedRows({ category: e.currentTarget.value })
                      }
                    >
                      <option value="">— keep —</option>
                      {CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label={`Radius (min ${RADIUS_MIN}, max ${RADIUS_MAX})`}>
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      min={RADIUS_MIN}
                      max={RADIUS_MAX}
                      step={1}
                      placeholder="e.g. 12"
                      onBlur={(e) => {
                        const v = Math.round(Number(e.currentTarget.value));
                        if (!Number.isFinite(v)) return;
                        const r = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, v));
                        updateAllSeatsOfSelectedRows({ radius: r });
                        e.currentTarget.value = "";
                      }}
                    />
                  </Field>
                </div>

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
          </Panel>
        );
      })}

      {/* === Seats === */}
      {selectedSeats.map((seat) => {
        const row = seat.rowId ? rows.find((r) => r.id === seat.rowId) : undefined;
        return (
          <Panel key={seat.id}>
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
                  inputMode="numeric"
                  step={1}
                  value={Math.round(seat.x)}
                  onChange={(e) => updateSeat(seat.id, { x: Number(e.target.value) || 0 })}
                />
              </Field>

              <Field label="Y">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  step={1}
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

            <div className="grid grid-cols-2 gap-2">
              <Field label="Status">
                <Select
                  value={seat.status}
                  onChange={(e) =>
                    updateSeat(seat.id, { status: e.target.value as Seat["status"] })
                  }
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
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label={`Radius (min ${RADIUS_MIN}, max ${RADIUS_MAX})`}>
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min={RADIUS_MIN}
                  max={RADIUS_MAX}
                  step={1}
                  value={Math.round(seat.radius)}
                  onChange={(e) => {
                    const v = Math.round(Number(e.target.value));
                    const r = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, Number.isFinite(v) ? v : seat.radius));
                    updateSeat(seat.id, { radius: r });
                  }}
                />
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
          </Panel>
        );
      })}
    </div>
  );
}
