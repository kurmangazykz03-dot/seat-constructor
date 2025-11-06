import { useEffect, useRef, useState } from "react"; // ← добавили useRef


import { SeatmapState } from "./EditorPage";

import { AlertTriangle } from "lucide-react";
import { SeatInfoPanel } from "../components/viewer/SeatInfoPanel";
import SeatmapViewerCanvas from "../components/viewer/SeatmapViewerCanvas";
import { ViewerTopBar } from "../components/viewer/ViewerTopBar";
import { useAutoScale } from "../hooks/useAutoScale";
import type { Row, Seat, Zone, TextObject, ShapeObject } from "../types/types";

// —— константы дизайн-рамки ——
const TOPBAR_H = 60;
const PAD = 16;
const GAP = 12;
const LEFT_W = 60;
const MAIN_W = 1486;
const MAIN_H = 752;
const RIGHT_W = 320;

const DESIGN_W = LEFT_W + MAIN_W + RIGHT_W + 2 * GAP + 2 * PAD;

const DESIGN_H = TOPBAR_H + MAIN_H + 2 * PAD;

const ToolbarPlaceholder = () => (
  <div className="bg-gray-50 border-r border-gray-200 flex-shrink-0" style={{ width: LEFT_W }} />
);

function importFromV2(json: any): SeatmapState {
 // helper
const readAngle = (v: any) => {
  const a = Number(v);
  if (!Number.isFinite(a) || a <= 0) return 90;   // 0/NaN -> прямоугольник
  return Math.max(10, Math.min(170, a));          // кламп
};

const zones: Zone[] = (json.zones || []).map((z: any) => ({
  id: String(z.id),
  x: Number(z.x ?? 0),
  y: Number(z.y ?? 0),
  width: Number(z.width ?? 200),
  height: Number(z.height ?? 120),
  fill: String(z.color ?? z.fill ?? "#E5E7EB"),
  label: String(z.name ?? z.label ?? ""),
  color: z.color ?? undefined,
  rotation: Number(z.rotation ?? 0),
  transparent: !!z.transparent,
  fillOpacity: z.fillOpacity != null ? Number(z.fillOpacity) : 1,

  // ⬇️ КЛИН (миграция 0/NaN -> 90°)
  angleLeftDeg:  readAngle(z.angleLeftDeg),
  angleRightDeg: readAngle(z.angleRightDeg),

  seatSpacingX: Number(z.seatSpacingX ?? 30),
  seatSpacingY: Number(z.seatSpacingY ?? 30),
  rowLabelSide: z.rowLabelSide === "right" || z.rowLabelSide === "left" ? z.rowLabelSide : "left",
}));


  const rows: Row[] = [];
  const seats: Seat[] = [];

  // вложенные ряды/места
  (json.zones || []).forEach((z: any) => {
    (z.rows || []).forEach((r: any, rIdx: number) => {
      const rowId = String(r.id);
      rows.push({
        id: rowId,
        zoneId: String(z.id),
        index: Number(rIdx),
        label: String(r.label ?? ""),
        x: Number(r.x ?? 0),
        y: Number(r.y ?? 0),
      });

      (r.seats || []).forEach((s: any, cIdx: number) => {
        seats.push({
          id: String(s.id),
          x: Number(s.x ?? 0),
          y: Number(s.y ?? 0),
          radius: Number(s.radius ?? 12),
          fill: String(s.fill ?? "#1f2937"),
          label: String(s.label ?? ""),
          zoneId: String(z.id),
          rowId,
          colIndex: Number(cIdx),
          status: (s.status as any) ?? "available",
          category: s.category ?? "standard",
        });
      });
    });
  });

  // свободные места (если приходят отдельно)
  if (Array.isArray(json.freeSeats)) {
    json.freeSeats.forEach((s: any) => {
      seats.push({
        id: String(s.id ?? crypto.randomUUID()),
        x: Number(s.x ?? 0),
        y: Number(s.y ?? 0),
        radius: Number(s.radius ?? 12),
        fill: String(s.fill ?? "#1f2937"),
        label: String(s.label ?? ""),
        zoneId: null,
        rowId: null,
        colIndex: null,
        status: (s.status as any) ?? "available",
        category: s.category ?? "standard",
      });
    });
  }

  const texts: TextObject[] = Array.isArray(json.texts)
    ? json.texts.map((t: any) => ({
        id: String(t.id ?? crypto.randomUUID()),
        text: String(t.text ?? "Text"),
        x: Number(t.x ?? 0),
        y: Number(t.y ?? 0),
        fontSize: Number(t.fontSize ?? 18),
        rotation: Number(t.rotation ?? 0),
        fill: t.fill ?? "#111827",
        fontFamily: t.fontFamily ?? undefined,
      }))
    : [];

  const shapes: ShapeObject[] = Array.isArray(json.shapes)
    ? json.shapes.map((s: any) => ({
        id: String(s.id ?? crypto.randomUUID()),
        kind: (s.kind as any) ?? "rect",
        x: Number(s.x ?? 0),
        y: Number(s.y ?? 0),
        width: Number(s.width ?? 100),
        height: Number(s.height ?? 60),
        fill: s.fill ?? "#ffffff",
        stroke: s.stroke ?? "#111827",
        strokeWidth: Number(s.strokeWidth ?? 1),
        opacity: s.opacity != null ? Number(s.opacity) : 1,
        rotation: Number(s.rotation ?? 0),
        flipX: !!s.flipX,
        flipY: !!s.flipY,
        points: Array.isArray(s.points)
          ? s.points.map((p: any) => ({ x: Number(p.x ?? 0), y: Number(p.y ?? 0) }))
          : undefined,
      }))
    : [];

  return {
    hallName: String(json.hallName ?? "Hall"),
    backgroundImage: json.backgroundImage ?? null,
    backgroundFit: json.backgroundFit ?? "contain",
    backgroundMode: json.backgroundMode ?? "auto",
    backgroundRect: json.backgroundRect ?? null,
    zones,
    rows,
    seats,
    texts,
    shapes,
    stage: { scale: 1, x: 0, y: 0 },
  };
}


function ViewerPage() {
  const [state, setState] = useState<SeatmapState | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { ref: hostRef, scale: layoutScale } = useAutoScale(DESIGN_W, DESIGN_H, {
    min: 0.5,
    max: 1,
  });
const fileRef = useRef<HTMLInputElement | null>(null);

const handleOpenFilePicker = () => fileRef.current?.click();

const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const text = await f.text();
    const obj = JSON.parse(text);
    // (опц.) положим "как есть" в localStorage, чтобы Viewer мог обновиться по F5
    localStorage.setItem("seatmap_schema", JSON.stringify(obj));

    // применяем
    const flatState: SeatmapState = importFromV2(obj);
    setState(flatState);
    setSelectedSeat(null);
    setError(null);
  } catch (err: any) {
    setError("Не удалось импортировать JSON: " + (err?.message || String(err)));
  } finally {
    if (e.target) e.target.value = "";
  }
};

  useEffect(() => {
    try {
      const saved = localStorage.getItem("seatmap_schema");
      if (!saved) {
        setError("Сохраненная схема не найдена. Сначала создайте и сохраните её в редакторе.");
        return;
      }
      const data = JSON.parse(saved);
      const isV2 = data?.version === 2 || Array.isArray(data?.zones);
      const flatState: SeatmapState = isV2 ? importFromV2(data) : data;
      setState(flatState);
    } catch {
      setError("Не удалось загрузить схему. Данные могут быть повреждены.");
    }
  }, []);

  return (
    <div className="w-full h-screen bg-gray-100">
      <div ref={hostRef} className="w-full h-full overflow-auto">
        <div
          style={{
            width: DESIGN_W,
            height: DESIGN_H,
            transform: `scale(${layoutScale})`,
            transformOrigin: "top left",
          }}
          className="mx-auto"
        >
          <div className="flex flex-col" style={{ width: DESIGN_W, height: DESIGN_H }}>
            <ViewerTopBar onImportJson={handleOpenFilePicker} />


            <div
              className="flex overflow-hidden"
              style={{
                height: DESIGN_H - TOPBAR_H,
                padding: PAD,
                gap: GAP,
              }}
            >
              <ToolbarPlaceholder />

              <main
                className="relative bg-white border border-gray-200 rounded-[12px] overflow-hidden"
                style={{ width: MAIN_W, height: MAIN_H }}
              >
                {error ? (
                  <div className="flex flex-col items-center justify-center h-full text-red-600 p-8 text-center">
                    <AlertTriangle size={48} className="mb-4" />
                    <h2 className="text-xl font-semibold">Ошибка при загрузке</h2>
                    <p>{error}</p>
                  </div>
                ) : !state ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>Загрузка схемы...</p>
                  </div>
                ) : (
                  <SeatmapViewerCanvas
                    state={state}
                    selectedSeatId={selectedSeat?.id || null}
                    onSeatSelect={setSelectedSeat}
                    width={MAIN_W}
                    height={MAIN_H}
                  />
                )}
              </main>

              <div className="flex-shrink-0" style={{ width: RIGHT_W, height: MAIN_H }}>
                <SeatInfoPanel seat={selectedSeat} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <input
  ref={fileRef}
  type="file"
  accept="application/json"
  onChange={handleFileChange}
  className="hidden"
/>
    </div>
  );
}

export default ViewerPage;
