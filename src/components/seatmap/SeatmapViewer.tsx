// src/components/viewer/SeatmapViewer.tsx
import React from "react";
import { SeatmapState } from "../../pages/EditorPage";
import SeatmapViewerCanvas from '../viewer/SeatmapViewerCanvas';

interface SeatmapViewerProps {
  state: SeatmapState;
  onSeatSelect: (seatId: string) => void;     
  selectedSeatId: string | null;
}

const SeatmapViewer: React.FC<SeatmapViewerProps> = ({
  state,
  onSeatSelect,
  selectedSeatId,
}) => {
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <SeatmapViewerCanvas
        state={state}
        selectedSeatId={selectedSeatId}
        onSeatSelect={(seat) => onSeatSelect(seat?.id ?? "")} 
        width={1436}
        height={752}
      />
    </div>
  );
};

export default SeatmapViewer;
