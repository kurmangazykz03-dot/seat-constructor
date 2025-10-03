import React from 'react';
import { Seat, Zone, Row } from "../../types/types";
import { SeatmapState } from '../../pages/EditorPage';

// Расширенный интерфейс Seat (предполагаем, что в types/types.ts он будет выглядеть так)
// type Seat = { id: string; rowId?: string; label: string; status: 'available' | 'occupied' | 'disabled'; fill: string; category: 'Standard' | 'VIP' | 'Discount' | string; };

interface PropertiesPanelProps {
  selectedIds: string[];
  state: SeatmapState;
  setState: (updater: (prev: SeatmapState) => SeatmapState) => void;
}

// Утилитарный компонент для Input
const PropertyInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, className = '', ...props }) => (
  <div className="mb-2">
    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
    <input
      {...props}
      className={`w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 bg-white focus:ring-blue-500 focus:border-blue-500 transition-colors ${className}`}
    />
  </div>
);

// Утилитарный компонент для Select
const PropertySelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, className = '', children, ...props }) => (
  <div className="mb-2">
    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
    <select
      {...props}
      className={`w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 bg-white appearance-none focus:ring-blue-500 focus:border-blue-500 transition-colors ${className}`}
    >
      {children}
    </select>
  </div>
);


function PropertiesPanel({ selectedIds, state, setState }: PropertiesPanelProps) {
  const { seats, rows, zones } = state;

  const CATEGORIES = ["Standard", "VIP", "Discount"];
  const COLOR_OPTIONS = ["#22c55e", "#ef4444", "#9ca3af", "#eab308"];

  // --- Обновление одного сиденья ---
  const updateSeat = (field: keyof Seat, value: string | number, seatId?: string) => {
    setState(prev => ({
      ...prev,
      seats: prev.seats.map(s => {
        // 1. Обновление по явному seatId
        if (seatId && s.id === seatId) return { ...s, [field]: value };
        // 2. Обновление индивидуально выбранных сидений
        if (!seatId && selectedIds.includes(s.id)) return { ...s, [field]: value };
        return s;
      })
    }));
  };

  // --- Групповое обновление всех сидений выбранных рядов (Статус, Цвет или Категория) ---
  const updateRowSeats = (field: keyof Seat, value: string | number) => {
    const selectedRowIds = rows.filter(r => selectedIds.includes(r.id)).map(r => r.id);
    setState(prev => ({
      ...prev,
      seats: prev.seats.map(s => (s.rowId && selectedRowIds.includes(s.rowId) ? { ...s, [field]: value } : s))
    }));
  };

  // --- Обновление ряда ---
  const updateRow = (field: keyof Row, value: string | number) => {
    setState(prev => ({
      ...prev,
      rows: prev.rows.map(r => selectedIds.includes(r.id) ? { ...r, [field]: value } : r)
    }));
  };

  // --- Обновление зоны ---
  const updateZone = (field: keyof Zone, value: string | number) => {
    setState(prev => ({
      ...prev,
      zones: prev.zones.map(z => selectedIds.includes(z.id) ? { ...z, [field]: value } : z)
    }));
  };

  // Определяем выбранные объекты
  const selectedZones = zones.filter(z => selectedIds.includes(z.id));
  const selectedRows = rows.filter(r => selectedIds.includes(r.id));
  const selectedIndividualSeats = seats.filter(s => selectedIds.includes(s.id) && !selectedRows.some(r => r.id === s.rowId));

  if (selectedIds.length === 0) {
    return (
      <div className="w-[320px] bg-gray-50 border-l border-gray-200 p-6 shadow-lg h-full overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Properties</h2>
        <p className="text-sm text-gray-500">Select an object in the diagram to edit its properties.</p>
      </div>
    );
  }

  return (
    <div className="w-[320px] bg-gray-50 border-l border-gray-200 p-6 shadow-lg h-full overflow-y-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Properties</h2>

      {/* Zones */}
      {selectedZones.map(zone => (
        <div key={zone.id} className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-blue-700 mb-3">Zone: {zone.label}</h3>
          
          <PropertyInput
            label="Zone Name"
            type="text"
            value={zone.label}
            onChange={e => updateZone("label", e.target.value)}
          />
        </div>
      ))}

      {/* Rows */}
      {selectedRows.map(row => {
        const rowSeats = seats.filter(seat => seat.rowId === row.id);

        return (
          <div key={row.id} className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-green-700 mb-3">Row: {row.label}</h3>
            
            <PropertyInput
              label="Label"
              type="text"
              value={row.label}
              onChange={e => updateRow("label", e.target.value)}
            />

            <div className="flex gap-4">
              <PropertyInput
                label="X Position"
                type="number"
                value={row.x}
                onChange={e => updateRow("x", Number(e.target.value))}
              />
              <PropertyInput
                label="Y Position"
                type="number"
                value={row.y}
                onChange={e => updateRow("y", Number(e.target.value))}
              />
            </div>

            {/* Seats in row */}
            {rowSeats.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Seat Management</h4>

                {/* Group Seat Actions */}
                <div className="bg-blue-50 p-3 rounded-lg mb-4 flex flex-col gap-3">
                    <label className="text-sm font-bold text-gray-700">Apply to ALL Seats:</label>
                    
                    {/* Group Status */}
                    <PropertySelect
                        label="Set Status"
                        onChange={e => updateRowSeats("status", e.target.value)}
                        className="!p-1 !text-sm"
                    >
                        <option value="">-- Change Status --</option>
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="disabled">Disabled</option>
                    </PropertySelect>

                    {/* Group Category (NEW) */}
                    <PropertySelect
                        label="Set Category"
                        onChange={e => updateRowSeats("category", e.target.value)}
                        className="!p-1 !text-sm"
                    >
                        <option value="">-- Change Category --</option>
                        {CATEGORIES.map(cat => (
                           <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </PropertySelect>

                    {/* Group Color */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Set Color</label>
                        <div className="flex gap-2">
                            {COLOR_OPTIONS.map(color => (
                                <button
                                    key={color}
                                    style={{ backgroundColor: color }}
                                    className="w-8 h-8 rounded-lg shadow-md transition-transform hover:scale-105"
                                    onClick={() => updateRowSeats("fill", color)}
                                    title={`Set all seats to ${color}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Individual Seat Editing within Row */}
                <div className="max-h-[200px] overflow-y-auto pr-2">
                  <h5 className="text-xs font-semibold text-gray-600 mb-2">Individual Seat Status:</h5>
                  {rowSeats.map(seat => (
                    <div key={seat.id} className="flex items-center justify-between gap-2 mb-2 p-1 border-b border-gray-100 last:border-b-0">
                      <span className="w-8 text-sm font-medium text-gray-600">{seat.label}</span>
                      
                      {/* Individual Category Select */}
                      <select
                        value={seat.category || "Standard"} // Используем Standard по умолчанию, если пусто
                        onChange={e => updateSeat("category", e.target.value, seat.id)}
                        className="text-xs border border-gray-300 rounded-md p-1 bg-white"
                      >
                         {CATEGORIES.map(cat => (
                           <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      
                      {/* Individual Color Buttons */}
                      <div className="flex gap-1">
                        {COLOR_OPTIONS.map(color => (
                          <button
                            key={color}
                            style={{ backgroundColor: color }}
                            className={`w-5 h-5 rounded-full shadow-inner transition-transform hover:scale-110 ${seat.fill === color ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                            onClick={() => updateSeat("fill", color, seat.id)}
                            title={`Set color to ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Individual seats (not part of selected rows) */}
      {selectedIndividualSeats.map(seat => (
        <div key={seat.id} className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-purple-700 mb-3">Seat: {seat.label} (Selected)</h3>
          
          <PropertyInput
            label="Seat Label"
            type="text"
            value={seat.label}
            onChange={e => updateSeat("label", e.target.value, seat.id)}
          />
          
          {/* Individual Status */}
          <PropertySelect
            label="Status"
            value={seat.status}
            onChange={e => updateSeat("status", e.target.value, seat.id)}
          >
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="disabled">Disabled</option>
          </PropertySelect>

          {/* Individual Category */}
          <PropertySelect
            label="Category"
            value={seat.category || "Standard"}
            onChange={e => updateSeat("category", e.target.value, seat.id)}
          >
            {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
            ))}
          </PropertySelect>
          
          <div className="flex gap-2 mt-3">
            <label className="text-xs font-medium text-gray-700">Color:</label>
            {COLOR_OPTIONS.map(color => (
              <button
                key={color}
                style={{ backgroundColor: color }}
                className={`w-6 h-6 rounded-full shadow-inner transition-transform hover:scale-110 ${seat.fill === color ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
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