import React from "react";
import { SeatmapState } from "../../pages/EditorPage";


interface SeatmapViewerProps {
  state: SeatmapState;
  onSeatClick: (seatId: string) => void;
  selectedSeatId: string | null;
}

const SeatmapViewer: React.FC<SeatmapViewerProps> = ({ state, onSeatClick, selectedSeatId }) => {
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <SeatmapViewerCanvas
        state={state}
        selectedSeatId={selectedSeatId}
        onSeatClick={onSeatClick}
      />
    </div>
  );
};

export default SeatmapViewer;
