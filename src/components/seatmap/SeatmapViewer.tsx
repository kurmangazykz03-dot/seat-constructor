import React from "react";
import { SeatmapState } from "../../pages/EditorPage";
import SeatmapViewerCanvas from "../viewer/SeatmapViewerCanvas";

interface SeatmapViewerProps {
  state: SeatmapState;
  // Колбэк наверх: сообщаем ID выбранного места
  onSeatSelect: (seatId: string) => void;
  // Текущее выбранное место (по ID)
  selectedSeatId: string | null;
}

const SeatmapViewer: React.FC<SeatmapViewerProps> = ({ state, onSeatSelect, selectedSeatId }) => {
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <SeatmapViewerCanvas
        state={state}
        selectedSeatId={selectedSeatId}
        // Canvas отдаёт целый объект seat, а наружу ты хочешь только ID
        onSeatSelect={(seat) => onSeatSelect(seat?.id ?? "")}
        width={1436}
        height={752}
      />
    </div>
  );
};

export default SeatmapViewer;
