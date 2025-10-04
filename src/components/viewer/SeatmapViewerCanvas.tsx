import React from 'react';
import { Stage, Layer } from 'react-konva';

import ZoneComponent from '../seatmap/ZoneComponent'; 
import { SeatmapState } from '../../pages/EditorPage';
import { Seat } from '../../types/types';


// Используем тот же 
// ZoneComponent!

interface ViewerCanvasProps {
  state: SeatmapState;
  onSeatSelect: (seat: Seat) => void;
  selectedSeatId: string | null;
}

export const SeatmapViewerCanvas: React.FC<ViewerCanvasProps> = ({ state, onSeatSelect, selectedSeatId }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const checkSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const handleElementClick = (id: string) => {
    const seat = state.seats.find(s => s.id === id);
    if (seat) {
      onSeatSelect(seat);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full">
      <Stage width={size.width} height={size.height} draggable>
        <Layer>
          {state.zones.map(zone => (
            <ZoneComponent
              key={zone.id}
              zone={zone}
              seats={state.seats}
              rows={state.rows}
              setState={() => {}} // Пустышка, т.к. не меняем состояние
              selectedIds={selectedSeatId ? [selectedSeatId] : []}
              setSelectedIds={() => {}} // Пустышка
              currentTool="select"
              handleElementClick={handleElementClick}
              hoveredZoneId={null}
              setHoveredZoneId={() => {}} // Пустышка
              isViewerMode={true} // << ГЛАВНОЕ: ВКЛЮЧАЕМ РЕЖИМ ПРОСМОТРА
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};