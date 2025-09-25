import Toolbar from '../components/editor/ToolBar'
import TopBar from "../components/editor/TopBar";

function EditorPage() {
  return (
    <div className="flex flex-col w-full h-screen">
      {/* Верхняя панель */}
      <TopBar />

      <div className="flex flex-1">
        {/* Левая панель инструментов */}
        <Toolbar/>

        {/* Холст */}
        <div className="flex-1 bg-gray-50 flex items-center justify-center">
          {/* <SeatmapCanvas /> */}
          <div className="text-black">Center</div>
        </div>
        <div>Right</div>

        {/* Правая панель свойств */}
        {/* <PropertiesPanel /> */}
      </div>
    </div>
  );
}

export default EditorPage;
