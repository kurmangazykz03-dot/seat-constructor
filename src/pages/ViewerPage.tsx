// src/pages/ViewerPage.tsx
import { useEffect, useState } from "react";
import type { Row, Seat, Zone } from "../types/types";
import { SeatmapState } from "./EditorPage";

import { AlertTriangle } from "lucide-react";
import { SeatInfoPanel } from "../components/viewer/SeatInfoPanel";
import SeatmapViewerCanvas from "../components/viewer/SeatmapViewerCanvas";
import { ViewerTopBar } from "../components/viewer/ViewerTopBar";
import { useAutoScale } from "../hooks/useAutoScale";

// —— константы дизайн-рамки ——
const TOPBAR_H = 60;
const PAD = 16;           // p-4
const GAP = 12;           // gap-3
const LEFT_W = 60;
const MAIN_W = 1486;
const MAIN_H = 752;
const RIGHT_W = 320;

// ширина: left + main + right + 2*gaps + 2*padding
const DESIGN_W = LEFT_W + MAIN_W + RIGHT_W + (2 * GAP) + (2 * PAD);
// высота: topbar + main + 2*padding (по вертикали)
const DESIGN_H = TOPBAR_H + MAIN_H + (2 * PAD);

const ToolbarPlaceholder = () => (
  <div className="bg-gray-50 border-r border-gray-200 flex-shrink-0" style={{ width: LEFT_W }} />
);

function importFromV2(json: any): SeatmapState {
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
    transparent: Boolean(z.transparent ?? false),
    fillOpacity: z.fillOpacity != null ? Number(z.fillOpacity) : 1,
  }));

  const rows: Row[] = [];
  const seats: Seat[] = [];
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

  return {
    hallName: String(json.hallName ?? "Hall"),
    backgroundImage: json.backgroundImage ?? null,
    backgroundFit: json.backgroundFit ?? "contain",
    backgroundMode: json.backgroundMode ?? "auto",
    backgroundRect: json.backgroundRect ?? null,
    zones, rows, seats,
    stage: { scale: 1, x: 0, y: 0 },
  };
}

function ViewerPage() {
  const [state, setState] = useState<SeatmapState | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [error, setError] = useState<string | null>(null);

 const { ref: hostRef, scale } = useAutoScale(DESIGN_W, DESIGN_H, { min: 0.5, max: 1 });

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
      {/* Внешний контейнер, который мы измеряем */}
      <div ref={hostRef} className="w-full h-full overflow-auto">
        {/* Внутренняя «дизайн-рамка», которую масштабируем целиком */}
        <div
          style={{
            width: DESIGN_W,
            height: DESIGN_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="mx-auto"
        >
          {/* Весь контент внутри — с фиксированными размерами макета */}
          <div className="flex flex-col" style={{ width: DESIGN_W, height: DESIGN_H }}>
            <ViewerTopBar />

            <div
              className="flex overflow-hidden"
              style={{
                height: DESIGN_H - TOPBAR_H, // оставшаяся высота под контент
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
    </div>
  );
}

export default ViewerPage;
