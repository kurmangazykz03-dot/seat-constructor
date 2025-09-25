import { Circle, Layer, Stage } from "react-konva";

function SeatmapCanvas() {
  return (
    <div className=" rounded-[16px] drop-shadow-[0_0_2px_rgba(0,0,0,0.1)] border border-[#e5e5e5]  ">
      <Stage width={990} height={750}>
        <Layer>

          <Circle x={300} y={150} radius={16} fill="#33DEF1" />
        </Layer>
      </Stage>
    </div>
  );
}

export default SeatmapCanvas;
