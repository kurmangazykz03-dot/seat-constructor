import React from 'react';
import { Seat } from '../../types/types';
import { Info } from 'lucide-react';

// Утилитарные функции для стилизации
const getSeatStatusClass = (status: string) => {
    const classMap: { [key: string]: string } = {
    occupied: 'bg-red-500',
    disabled: 'bg-gray-400',
    available: 'bg-green-500',
  };
  return classMap[status] || 'bg-green-500';
}

export const SeatInfoPanel: React.FC<{ seat: Seat | null }> = ({ seat }) => (
  <aside className="w-[320px] bg-white border-l border-gray-200 p-6 flex-shrink-0">
    <h2 className="text-xl font-semibold text-gray-900 mb-6">Seat Information</h2>
    {seat ? (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Seat Number</label>
          <p className="text-lg font-bold text-gray-800">{seat.label}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Category</label>
          <p className="text-md text-gray-700">{seat.category}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Status</label>
          <p className={`text-md font-semibold capitalize px-3 py-1 inline-block rounded-full text-white ${getSeatStatusClass(seat.status)}`}>
            {seat.status}
          </p>
        </div>
         <div>
          <label className="text-xs font-medium text-gray-500">Seat ID</label>
          <p className="text-xs text-gray-400 break-words">{seat.id}</p>
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