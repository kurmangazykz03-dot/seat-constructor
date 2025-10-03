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
	category: "standard" | "vip";
	status: "available" | "occupied" | "disabled";
	zoneId: string | null;
	rowId: string | null;   // ✅ сиденье может быть в ряду или без
	colIndex: number | null; // ✅ порядковый номер в ряду или null
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
}