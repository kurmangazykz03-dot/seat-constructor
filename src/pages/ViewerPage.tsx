import React, { useEffect, useState } from "react";
import { SeatmapState } from "./EditorPage";
import { Seat } from "../types/types";
import { SeatInfoPanel } from "../components/viewer/SeatInfoPanel";
import SeatmapViewerCanvas from "../components/viewer/SeatmapViewerCanvas";
import { AlertTriangle } from "lucide-react";
import { ViewerTopBar } from '../components/viewer/ViewerTopBar'

// Пустой Toolbar для Viewer
const ToolbarPlaceholder = () => (
  <div className="w-[60px] bg-gray-50 border-r border-gray-200 flex-shrink-0"></div>
);

function ViewerPage() {
  const [state, setState] = useState<SeatmapState | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem("seatmap_schema");
      if (savedStateJSON) {
        setState(JSON.parse(savedStateJSON));
      } else {
        setError(
          "Сохраненная схема не найдена. Сначала создайте и сохраните ее в редакторе."
        );
      }
    } catch (err) {
      setError("Не удалось загрузить схему. Данные могут быть повреждены.");
    }
  }, []);

  return (
     <div className="flex flex-col w-full h-screen bg-gray-100">
      <ViewerTopBar/>


      <div className="flex flex-1 overflow-hidden gap-3 p-4">
        {/* Пустой Toolbar слева */}
  <div></div>

        {/* Сцена */}
        <main className="flex-1 relative">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-600 p-8 text-center">
              <AlertTriangle size={48} className="mb-4" />
              <h2 className="text-xl font-semibold">Ошибка при загрузке</h2>
              <p>{error}</p>
            </div>
          ) : !state ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Загрузка схемы...</p>
            </div>
          ) : (
           <SeatmapViewerCanvas
  state={state}
  selectedSeatId={selectedSeat?.id || null}
  onSeatSelect={setSelectedSeat} // сюда передаем функцию, она будет принимать seat или null
  width={1436}
  height={752}
/>
          )}
        </main>

        {/* Панель деталей */}
        <div className="w-[320px]">
          <SeatInfoPanel seat={selectedSeat} />
        </div>
      </div>
    </div>
  );
}

export default ViewerPage;