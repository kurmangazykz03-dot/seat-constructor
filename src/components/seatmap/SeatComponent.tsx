// SeatComponent.tsx
import React from "react";
import { Circle, Group, Text } from "react-konva";
import { Seat } from "../../types/types";
import { crisp, crispSize } from "../../utils/crisp";

const STATUS_COLORS: Record<string, string> = {
  available: "#22c55e",
  occupied: "#ef4444",
  disabled: "#9ca3af",
};

interface SeatComponentProps {
  seat: Seat;
  isSelected: boolean;
  isRowSelected: boolean;
  onClick: (id: string, e: any) => void;
  onDragEnd?: (e: any, seat: Seat) => void;
  offsetX?: number;
  offsetY?: number;
  isViewerMode?: boolean;
  currentTool?: string;
  scale: number;
}

const SeatComponent: React.FC<SeatComponentProps> = ({
  seat,
  isSelected,
  isRowSelected,
  onClick,
  onDragEnd,
  offsetX = 0,
  offsetY = 0,
  isViewerMode = false,
  currentTool = "select",
  scale,
}) => {
  const visualFill = isViewerMode
    ? (STATUS_COLORS[seat.status ?? "available"] ?? "#22c55e")
    : (seat.fill ?? "#1f2937");

  const strokeColor = isSelected ? "blue" : isRowSelected ? "#99CCFF" : "transparent";
  const strokeWidth = isSelected ? 2 : isRowSelected ? 1 : 0;


  const gx = Math.round(seat.x - offsetX);
  const gy = Math.round(seat.y - offsetY);
  const label = String(seat.label ?? "");
  const fontSize = Math.round(12);

  return (
    <Group
      x={gx}
      y={gy}
      draggable={!isViewerMode && currentTool === "select"}
      onDragStart={(e) => (e.cancelBubble = true)}
      onDragMove={(e) => (e.cancelBubble = true)}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        if (!isViewerMode && onDragEnd) {
          const newSeat = {
            ...seat,
            x: e.target.x() + offsetX,
            y: e.target.y() + offsetY,
          };
          onDragEnd(e, newSeat);
        }
      }}
      onClick={(e) => { e.cancelBubble = true; onClick(seat.id, e); }}
      onTap={(e) => { e.cancelBubble = true; onClick(seat.id, e); }}
    >
      <Circle
        x={crisp(0, scale)}
        y={crisp(0, scale)}
        radius={crispSize(seat.radius ?? 12, scale)}
        fill={visualFill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeScaleEnabled={false}
        hitStrokeWidth={12}
      />

      <Text
        text={label}
        fontSize={fontSize}
        fill="white"
        x={crisp(0, scale)}
        y={crisp(0, scale)}
        offsetX={Math.round((label.length * 6) / 2)}
        offsetY={Math.round(fontSize / 2)}
        listening={false}
      />
    </Group>
  );
};

export default SeatComponent;
