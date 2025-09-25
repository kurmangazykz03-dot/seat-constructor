import { Dispatch, SetStateAction } from "react";
import { Circle, Layer, Stage,Text } from "react-konva";
import React from 'react';
import { Seat } from '../../pages/EditorPage';

interface SeatmapCanvasProps {
  seats: Seat[];
  setSeats: Dispatch<SetStateAction<Seat[]>>;
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  currentTool: "select" | "add-seat" | "add-row" | "add-zone";
}

function SeatmapCanvas({
  seats,
  setSeats,
  selectedId,
  setSelectedId,
  currentTool,
}: SeatmapCanvasProps) {

  const handleStageClick=(e:any)=>{
    if(e.target===e.target.getStage()){
      if(currentTool==='add-seat'){
        const pointer=e.target.getPointerPosition();
        if(!pointer) return ;
        
        const newSeat: Seat={
          id: `seat-${Date.now()}`,
          x:pointer.x,
          y:pointer.y,
          radius:16,
          fill: `#33DEF1`,
          label: `A${seats.length + 1}`        
        }
        setSeats((prev) => [...prev, newSeat]);
      }
      setSelectedId(null);
    }
  }

  const handleDragMove= (id:string ,x:number,y:number)=>{
    setSeats((prev)=>prev.map((seat)=>(seat.id===id?{...seat,x,y}:seat)));
  }





  
  return (
     <div className="rounded-[16px] drop-shadow-[0_0_2px_rgba(0,0,0,0.1)] border border-[#e5e5e5]">
      <Stage width={990} height={750} onClick={handleStageClick}>
        <Layer>
          {seats.map((seat) => (
            <React.Fragment key={seat.id}>
              <Circle
                x={seat.x}
                y={seat.y}
                radius={seat.radius}
                fill={seat.fill}
                stroke={selectedId === seat.id ? "blue" : ""}
                strokeWidth={selectedId === seat.id ? 2 : 0}
                onClick={() => setSelectedId(seat.id)}
                onDragMove={(e) => handleDragMove(seat.id, e.target.x(), e.target.y())}
                draggable
              />
              <Text text={seat.label} x={seat.x - 8} y={seat.y + 20} fontSize={12} fill="black" />
            </React.Fragment>
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

export default SeatmapCanvas;
