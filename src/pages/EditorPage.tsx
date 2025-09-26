import { useState } from "react";
import PropertiesPanel from "../components/editor/PropertiesPanel";
import SeatmapCanvas from "../components/editor/SeatMapCanvas";
import Toolbar from "../components/editor/ToolBar";
import TopBar from "../components/editor/TopBar";

export interface Seat {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  fill: string;
  category: 'standard'|'vip';
  status:'available'|'disabled'|'occupied';

}
export interface Zone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  label: string;
}


function EditorPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<"select" | "add-seat" | "add-row" | "add-zone">(
    "select"
  );

const [seats, setSeats] = useState<Seat[]>([
  { id: "seat-1", x: 100, y: 100, radius: 16, fill: "#22c55e", label: "A1", category: "standard", status: "available" },
  { id: "seat-2", x: 200, y: 150, radius: 16, fill: "#22c55e", label: "A2", category: "vip", status: "occupied" },
]);
const [zones, setZones] = useState<Zone[]>([]);



  return (
    <div className="flex flex-col w-full h-screen">
      {/* Верхняя панель */}
      <TopBar />

      <div className="flex flex-1">
        {/* Левая панель инструментов */}
        <Toolbar currentTool={currentTool} setCurrentTool={setCurrentTool} />

        {/* Центр */}
        <div className="flex-1 bg-gray-50 p-6 ">
          <SeatmapCanvas
  seats={seats}
  setSeats={setSeats}
  zones={zones}
  setZones={setZones}
  selectedId={selectedId}
  setSelectedId={setSelectedId}
  currentTool={currentTool}
/>

        </div>
        {/* Правая панель свойств */}
        <PropertiesPanel
  selectedId={selectedId}
  seats={seats}
  setSeats={setSeats}
  zones={zones}
  setZones={setZones}
/>

      </div>
    </div>
  );
}

export default EditorPage;
