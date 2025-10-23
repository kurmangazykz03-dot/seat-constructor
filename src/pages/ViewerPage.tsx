// src/pages/ViewerPage.tsx
import { useEffect, useState } from "react";
import type { Row, Seat, Zone } from "../types/types";
import { SeatmapState } from "./EditorPage";

import { AlertTriangle } from "lucide-react";
import { SeatInfoPanel } from "../components/viewer/SeatInfoPanel";
import SeatmapViewerCanvas from "../components/viewer/SeatmapViewerCanvas";
import { ViewerTopBar } from "../components/viewer/ViewerTopBar";

const ToolbarPlaceholder = () => (
  <div className="w-[60px] bg-gray-50 border-r border-gray-200 flex-shrink-0"></div>
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
    // ⛔️ УБРАТЬ отсюда background* — они не относятся к zone
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

  // ✅ Фоновые поля — в корень state
  return {
    hallName: String(json.hallName ?? "Hall"),
    backgroundImage: json.backgroundImage ?? null,
    backgroundFit: json.backgroundFit ?? "contain",
    backgroundMode: json.backgroundMode ?? "auto",
    backgroundRect: json.backgroundRect ?? null,
    // если хочешь поддержать масштаб, добавь при экспорте/импорте:
    // backgroundScale: Number(json.backgroundScale ?? 1),

    zones,
    rows,
    seats,
    stage: { scale: 1, x: 0, y: 0 },
  };
}


function ViewerPage() {
  const [state, setState] = useState<SeatmapState | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-col w-full h-screen bg-gray-100">
      <ViewerTopBar />

      <div className="flex flex-1 overflow-hidden gap-3 p-4">
        <ToolbarPlaceholder />

        <main className="flex-1 relative">
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
              width={1486}
              height={752}
            />
          )}
        </main>

        <div className="w-[320px]">
          <SeatInfoPanel seat={selectedSeat} />
        </div>
      </div>
    </div>
  );
}

export default ViewerPage;
