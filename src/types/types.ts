export type ShapeKind = "rect" | "ellipse" | "polygon";

export interface ShapePoint { x: number; y: number; }

export interface ShapeObject {
  id: string;
  kind: ShapeKind;
  x: number; y: number;
  width: number; height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  // только для polygon — локальные точки в bbox (0..width, 0..height)
  points?: ShapePoint[];
}

export interface Row {
  id: string;
  zoneId: string | null;
  index: number;
  label: string;
  x: number;
  y: number;
}
export interface Seat {
  id: string;
  x: number;
  y: number;
  radius: number;
  fill?: string;
  label: string;
  zoneId: string | null;
  rowId: string | null;
  colIndex: number | null;
  status?: "available" | "occupied" | "disabled";
  category?: string;
}
// types/types.ts
export type Zone = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  fill?: string;
  rotation?: number;
  transparent?: boolean;
  fillOpacity?: number;

  // новые поля для bend-инструмента
  bendTop?: number;
  bendRight?: number;
  bendBottom?: number;
  bendLeft?: number;
  seatSpacingX?: number; // px, по умолчанию 30
  seatSpacingY?: number; // px, по умолчанию 30

  rowLabelSide?: 'left' | 'right'; // default: 'left
};


// src/types/types.ts
// src/types/types.ts
export interface TextObject {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  rotation?: number;
  fill?: string;
  fontFamily?: string;
}

