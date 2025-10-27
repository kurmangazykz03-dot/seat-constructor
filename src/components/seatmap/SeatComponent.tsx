import React from "react";
import { Circle, Group, Text } from "react-konva";
import { Seat } from "../../types/types";

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
}) => {
  // В Viewer берём цвет из статуса, в Editor — из seat.fill
  const visualFill = isViewerMode
    ? (STATUS_COLORS[seat.status ?? "available"] ?? "#22c55e")
    : (seat.fill ?? "#1f2937");
  const strokeColor = isSelected ? "blue" : isRowSelected ? "#99CCFF" : "transparent";
  const strokeWidth = isSelected ? 2 : isRowSelected ? 1 : 0;

  const x = Math.round(seat.x - offsetX);
  const y = Math.round(seat.y - offsetY);
  const label = String(seat.label ?? "");

  return (
    <Group
      x={x}
      y={y}
      draggable={!isViewerMode && currentTool === "select"}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
      }}
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
      onClick={(e) => {
        e.cancelBubble = true;
        onClick(seat.id, e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onClick(seat.id, e);
      }}
    >
      <Circle
        radius={seat.radius ?? 12}
        fill={visualFill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeScaleEnabled={false}
      />

      <Text
  text={label}
  fontSize={12}
  fill="white"
  x={0}
  y={0}
  offsetX={Math.round((label.length * 6) / 2)}
  offsetY={6}
  listening={false}
/>
    </Group>
  );
};

export default SeatComponent;
