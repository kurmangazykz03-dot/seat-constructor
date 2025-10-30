import React from 'react';
import { Seat } from '../../types/types';
import { Info } from 'lucide-react';

const STATUS_COLORS: { [key: string]: string } = {
  available: '#22c55e', 
  occupied: '#ef4444',  
  disabled: '#9ca3af',  
};

interface SeatInfoPanelProps {
  seat: Seat | null;
}

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></span>
    <span className="text-sm text-gray-700">{label}</span>
  </div>
);

export const SeatInfoPanel: React.FC<SeatInfoPanelProps> = ({ seat }) => {
  return (
    <aside className="w-[320px] bg-gray-50 border-l border-gray-200 p-6 flex-shrink-0 h-full overflow-y-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Seat Details</h2>

      {/* Легенда */}
      <div className="mb-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Legend</h3>
        <LegendItem color={STATUS_COLORS.available} label="Available" />
        <LegendItem color={STATUS_COLORS.occupied} label="Occupied" />
        <LegendItem color={STATUS_COLORS.disabled} label="Disabled" />
      </div>

      {seat ? (
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-700 mb-3">Selected Seat</h3>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Seat Number</label>
            <p className="text-lg font-bold text-gray-800">{seat.label}</p>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <p className="text-sm text-gray-700">{seat.category}</p>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <span
              className="inline-block text-sm font-semibold px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: STATUS_COLORS[seat.status] || '#22c55e' }}
            >
              {seat.status}
            </span>
          </div>


          
        </div>
      ) : (
        <div className="flex flex-col items-center text-center text-gray-500 mt-10">
          <Info size={40} className="mb-4" />
          <h3 className="font-semibold">Select a Seat</h3>
          <p className="text-sm">Click on any seat on the map to view its details.</p>
        </div>
      )}
    </aside>
  );
};