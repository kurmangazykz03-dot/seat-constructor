import PropertiesPanel from "../components/editor/PropertiesPanel";
import SeatmapCanvas from "../components/editor/SeatMapCanvas";
import Toolbar from "../components/editor/ToolBar";
import TopBar from "../components/editor/TopBar";

function EditorPage() {
  return (
    <div className="flex flex-col w-full h-screen">
      {/* Верхняя панель */}
      <TopBar />

      <div className="flex flex-1">
        {/* Левая панель инструментов */}
        <Toolbar />

        {/* Центр */}
        <div className="flex-1 bg-gray-50 p-6 ">
          <SeatmapCanvas />
        </div>
        {/* Правая панель свойств */}
        <PropertiesPanel />
      </div>
    </div>
  );
}

export default EditorPage;
