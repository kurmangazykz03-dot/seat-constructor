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
export interface Zone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  label: string;
  color?: string;
  rotation?: number;
  transparent?: boolean;
  fillOpacity?: number;
}
