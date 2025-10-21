import React from "react";
import { Group, Rect, Text } from "react-konva";
import { Zone } from "../../types/types";

interface DrawingZoneProps {
  drawingZone: Zone | null;
  seatSpacingX: number;
  seatSpacingY: number;
}

const DrawingZone: React.FC<DrawingZoneProps> = ({ drawingZone, seatSpacingX, seatSpacingY }) => {
  if (!drawingZone) return null;

  return (
    <Group>
      <Rect
        x={drawingZone.x}
        y={drawingZone.y}
        width={drawingZone.width}
        height={drawingZone.height}
        fill={drawingZone.fill}
        stroke="blue"
        dash={[4, 4]}
        fillOpacity={0.1}
      />
      <Text
        text={`${Math.max(1, Math.floor(Math.abs(drawingZone.height) / seatSpacingY))} × ${Math.max(1, Math.floor(Math.abs(drawingZone.width) / seatSpacingX))}`}
        x={drawingZone.x + drawingZone.width / 2}
        y={drawingZone.y - 20}
        fontSize={14}
        fill="blue"
        offsetX={20}
      />
    </Group>
  );
};

export default DrawingZone;
