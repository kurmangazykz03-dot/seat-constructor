// ---------- Типы ----------


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
	 fill?: string; // <-- вот это нужно!
	label: string;
	zoneId: string | null;
	rowId: string | null;   // ✅ сиденье может быть в ряду или без
	colIndex: number | null; // ✅ порядковый номер в ряду или null
	  status?: 'available' | 'occupied' | 'disabled';
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
fillOpacity?: number; // 0..1
}