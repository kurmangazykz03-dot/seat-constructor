import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Circle, Group, Layer, Rect, Stage, Text } from "react-konva";
import { Row, Seat, Zone } from "../../pages/EditorPage";

interface SeatmapCanvasProps {
  seats: Seat[];
  setSeats: Dispatch<SetStateAction<Seat[]>>;
  rows: Row[];
  setRows: Dispatch<SetStateAction<Row[]>>;
  zones: Zone[];
  setZones: Dispatch<SetStateAction<Zone[]>>;
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  currentTool: "select" | "add-seat" | "add-row" | "add-zone";
}

function SeatmapCanvas({
  seats,
  setSeats,
  rows,
  setRows,
  zones,
  setZones,
  selectedIds,
  setSelectedIds,
  currentTool,
}: SeatmapCanvasProps) {
  const [drawingZone, setDrawingZone] = useState<Zone | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  


 useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const activeEl = document.activeElement;
    const isInput =
      activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");

    if (isInput) return; // игнорируем Delete/Backspace если в input

    // 🗑 УДАЛЕНИЕ
    if (selectedIds.length > 0 && (e.key === "Delete" || e.key === "Backspace")) {
      setSeats(prev => prev.filter(s => !selectedIds.includes(s.id)));
      setRows(prev => prev.filter(r => !selectedIds.includes(r.id)));
      setZones(prev => prev.filter(z => !selectedIds.includes(z.id)));
      setSelectedIds([]);
      return;
    }

    // 📋 КОПИРОВАНИЕ (Ctrl+C / Cmd+C)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      const copiedSeats = seats.filter(s => selectedIds.includes(s.id));
      const copiedRows = rows
        .filter(r => selectedIds.includes(r.id))
        .map(r => ({ ...r, seats: seats.filter(s => s.rowId === r.id) }));
      const copiedZones = zones
        .filter(z => selectedIds.includes(z.id))
        .map(z => ({
          ...z,
          rows: rows
            .filter(r => r.zoneId === z.id)
            .map(r => ({ ...r, seats: seats.filter(s => s.rowId === r.id) })),
        }));

      const clipboard = { seats: copiedSeats, rows: copiedRows, zones: copiedZones };
      localStorage.setItem("seatmap_clipboard", JSON.stringify(clipboard));
      return;
    }

    // 📥 ВСТАВКА (Ctrl+V / Cmd+V)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
      const data = localStorage.getItem("seatmap_clipboard");
      if (!data) return;

      const parsed = JSON.parse(data);
      const offset = 40;

      const newSeats: Seat[] = [];
      const newRows: Row[] = [];
      const newZones: Zone[] = [];

      (parsed.seats || []).forEach((s: Seat) => {
        newSeats.push({ ...s, id: `seat-${crypto.randomUUID()}`, x: s.x + offset, y: s.y + offset });
      });

      (parsed.rows || []).forEach((r: Row) => {
        const newRowId = `row-${crypto.randomUUID()}`;
        const rowSeats: Seat[] = (r.seats || []).map((s: Seat) => ({
          ...s,
          id: `seat-${crypto.randomUUID()}`,
          rowId: newRowId,
          x: s.x + offset,
          y: s.y + offset,
        }));
        newSeats.push(...rowSeats);
        newRows.push({ ...r, id: newRowId, x: r.x + offset, y: r.y + offset });
      });

      (parsed.zones || []).forEach((z: Zone) => {
        const newZoneId = `zone-${crypto.randomUUID()}`;
        const zoneRows: Row[] = (z.rows || []).map((r: Row) => {
          const newRowId = `row-${crypto.randomUUID()}`;
          const rowSeats: Seat[] = (r.seats || []).map((s: Seat) => ({
            ...s,
            id: `seat-${crypto.randomUUID()}`,
            rowId: newRowId,
            zoneId: newZoneId,
            x: s.x + offset,
            y: s.y + offset,
          }));
          newSeats.push(...rowSeats);
          return { ...r, id: newRowId, zoneId: newZoneId, x: r.x + offset, y: r.y + offset };
        });
        newRows.push(...zoneRows);
        newZones.push({ ...z, id: newZoneId, rows: zoneRows, x: z.x + offset, y: z.y + offset });
      });

      setSeats(prev => [...prev, ...newSeats]);
      setRows(prev => [...prev, ...newRows]);
      setZones(prev => [...prev, ...newZones]);
      setSelectedIds([...newSeats.map(s => s.id), ...newRows.map(r => r.id), ...newZones.map(z => z.id)]);
      return;
    }

  
  };


  window.addEventListener("keydown", handleKeyDown);
  

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  
  };
}, [selectedIds, seats, rows, zones, setSeats, setRows, setZones, setSelectedIds, scale, stageRef]);


  const seatRadius = 12;
  const seatSpacingX = 30;
  const seatSpacingY = 30;
  

  // создание ряда с сиденьями
 const createRowWithSeats = (
  zoneId: string,
  rowIndex: number,
  cols: number,
  offsetX: number,
  offsetY: number
) => {
  const rowId = `row-${crypto.randomUUID()}`;
  const row: Row = {
    id: rowId,
    zoneId,
    index: rowIndex,
    label: `${rowIndex + 1}`,
    x: 0,
    y: rowIndex * seatSpacingY + seatSpacingY / 2,
  };

  const newSeats: Seat[] = [];
  for (let c = 0; c < cols; c++) {
    newSeats.push({
      id: `seat-${crypto.randomUUID()}`, // ✅ уникальный id
      x: c * seatSpacingX + seatRadius,
      y: row.y,
      radius: seatRadius,
      fill: "#33DEF1",
      label: `${c + 1}`, // тут можно одинаковые числа
      category: "standard",
      status: "available",
      zoneId,
      rowId,
      colIndex: c + 1,
    });
  }
  return { row, seats: newSeats };
};


  const handleStageMouseDown = (e: any) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (currentTool === "select" && e.target === stage) {
      setSelectedIds([]);
    }

    if (currentTool === "add-seat" && e.target === stage) {
      // клик по пустому месту ничего не делает
      return;
    }

    if (currentTool === "add-zone" && e.target === stage) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const newZone: Zone = {
        id: "zone-temp",
        x: pointer.x,
        y: pointer.y,
        width: 0,
        height: 0,
        fill: "#FAFAFA",
        label: `Zone ${zones.length + 1}`,
      };
      setDrawingZone(newZone);
    }
  };

  const handleStageMouseMove = (e: any) => {
    if (!drawingZone) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    setDrawingZone({
      ...drawingZone,
      width: pointer.x - drawingZone.x,
      height: pointer.y - drawingZone.y,
    });
  };

  const handleStageMouseUp = () => {
    if (!drawingZone) return;

    const startX =
      drawingZone.width < 0 ? drawingZone.x + drawingZone.width : drawingZone.x;
    const startY =
      drawingZone.height < 0 ? drawingZone.y + drawingZone.height : drawingZone.y;
    const width = Math.abs(drawingZone.width);
    const height = Math.abs(drawingZone.height);

    if (currentTool === "add-zone") {
      if (width < seatSpacingX || height < seatSpacingY) {
        setDrawingZone(null);
        return;
      }

      const cols = Math.max(1, Math.floor(width / seatSpacingX));
      const rowsCount = Math.max(1, Math.floor(height / seatSpacingY));

      const newZone: Zone = {
  id: `zone-${crypto.randomUUID()}`, // ✅ уникальный id
  x: startX,
  y: startY,
  width,
  height,
  fill: "#FAFAFA",
  label: `Zone ${zones.length + 1}`,
};

      setZones((prev) => [...prev, newZone]);

      const newRows: Row[] = [];
      const newSeats: Seat[] = [];
      const totalSeatsWidth = cols * seatSpacingX;
      const totalSeatsHeight = rowsCount * seatSpacingY;
      const offsetX = (width - totalSeatsWidth) / 2;
      const offsetY = (height - totalSeatsHeight) / 2;

      for (let r = 0; r < rowsCount; r++) {
        const { row, seats: rowSeats } = createRowWithSeats(
          newZone.id,
          r,
          cols,
          offsetX,
          offsetY
        );
        newRows.push(row);
        newSeats.push(...rowSeats);
      }

      setRows((prev) => [...prev, ...newRows]);
      setSeats((prev) => [...prev, ...newSeats]);
    }

    setDrawingZone(null);
  };

const handleZoneClick = (zone: Zone, e: any) => {
  e.cancelBubble = true;

  // 👉 добавляем сиденье в зоне
 if (currentTool === "add-seat") {
  const stage = e.target.getStage();
  if (!stage) return;
  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  const localX = pointer.x - zone.x;
  const localY = pointer.y - zone.y;

  // проверяем — сиденье в ряду?
  const parentRow = rows.find(
    (r) =>
      r.zoneId === zone.id &&
      localY >= r.y - seatSpacingY / 2 &&
      localY <= r.y + seatSpacingY / 2
  );

  const newSeat: Seat = {
    id: `seat-${crypto.randomUUID()}`,
    x: localX,
    y: localY,
    radius: seatRadius,
    fill: "#33DEF1",
    label: `${seats.length + 1}`,
    category: "standard",
    status: "available",
    zoneId: zone.id,
    rowId: parentRow ? parentRow.id : null, // ✅ если есть ряд → привязываем
    colIndex: parentRow
      ? (seats.filter((s) => s.rowId === parentRow.id).length || 0) + 1
      : null,
  };

  setSeats((prev) => [...prev, newSeat]);
  setSelectedIds([newSeat.id]);
  return;
}


  // 👉 добавляем ряд
  if (currentTool === "add-row") {
    const zoneRows = rows.filter((r) => r.zoneId === zone.id);
    const zoneSeats = seats.filter((s) => s.zoneId === zone.id);

    const cols =
      zoneSeats.length > 0
        ? Math.max(...zoneSeats.map((s) => s.colIndex || 1))
        : 5;

    const newRowIndex = zoneRows.length;

    // новый ряд добавляем "снизу"
    const newY = zone.height + seatSpacingY / 2;
    const offsetX = (zone.width - cols * seatSpacingX) / 2;

    const { row: newRow, seats: newSeats } = createRowWithSeats(
      zone.id,
      newRowIndex,
      cols,
      offsetX,
      0 // мы используем newY для реального Y
    );

    // поправляем координату ряда (чтобы реально встал вниз зоны)
    const adjustedRow = { ...newRow, y: newY };
    const adjustedSeats = newSeats.map((s, i) => ({
      ...s,
      y: newY,
      x: offsetX + i * seatSpacingX + seatRadius,
    }));

    // увеличиваем зону по высоте
    setZones((prev) =>
      prev.map((z) =>
        z.id === zone.id ? { ...z, height: z.height + seatSpacingY } : z
      )
    );
    setRows((prev) => [...prev, adjustedRow]);
    setSeats((prev) => [...prev, ...adjustedSeats]);
    return;
  }

  // 👉 выделение зоны
  if (e.evt.shiftKey) {
    setSelectedIds((prev) =>
      prev.includes(zone.id)
        ? prev.filter((i) => i !== zone.id)
        : [...prev, zone.id]
    );
  } else {
    setSelectedIds([zone.id]);
  }
};


  const handleElementClick = (id: string, e: any) => {
    e.cancelBubble = true;
    if (e.evt.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  };

  return (
    <div className="rounded-[16px] border border-[#e5e5e5]">
      
      <Stage
  ref={stageRef}
  width={1420}
  height={750}
  scaleX={scale}
  scaleY={scale}
  x={stagePos.x}
  y={stagePos.y}
  onMouseDown={handleStageMouseDown}
  onMouseMove={handleStageMouseMove}
  onMouseUp={handleStageMouseUp}
  draggable={currentTool === "select"}
>

        <Layer>
          
          {zones.map((zone) => {
            const zoneSeats = seats.filter((s) => s.zoneId === zone.id);
            const zoneRows = rows.filter((r) => r.zoneId === zone.id);

            return (
              <Group
                key={zone.id}
                x={zone.x}
                y={zone.y}
                draggable
                onClick={(e) => handleZoneClick(zone, e)}
                onMouseEnter={() => setHoveredZoneId(zone.id)}
                onMouseLeave={() => setHoveredZoneId(null)}
              >
                <Rect
                  x={0}
                  y={0}
                  width={zone.width}
                  height={zone.height}
                  fill={zone.fill}
                  stroke={
                    selectedIds.includes(zone.id)
                      ? "blue"
                      : hoveredZoneId === zone.id &&
                        currentTool === "add-row"
                      ? "orange"
                      : ""
                  }
                  strokeWidth={
                    selectedIds.includes(zone.id) || hoveredZoneId === zone.id
                      ? 2
                      : 0
                  }
                  fillOpacity={0.2}
                />

                <Text
                  text={zone.label}
                  x={zone.width / 2}
                  y={-18}
                  fontSize={14}
                  fill="black"
                  align="center"
                  offsetX={(zone.label.length * 7) / 2}
                />

                {/* сиденья без ряда */}
                {zoneSeats
                  .filter((s) => !s.rowId)
                  .map((seat) => (
                    <React.Fragment key={seat.id}>
                      <Circle
                        x={seat.x}
                        y={seat.y}
                        radius={seat.radius}
                        fill={seat.fill}
                        stroke={selectedIds.includes(seat.id) ? "blue" : ""}
                        strokeWidth={
                          selectedIds.includes(seat.id) ? 2 : 0
                        }
                        draggable
                        onClick={(e) => handleElementClick(seat.id, e)}
                        onDragEnd={(e) => {
                          const newX = e.target.x();
                          const newY = e.target.y();
                          setSeats((prev) =>
                            prev.map((s) =>
                              s.id === seat.id
                                ? { ...s, x: newX, y: newY }
                                : s
                            )
                          );
                        }}
                      />
                      <Text
                        text={seat.label}
                        x={seat.x}
                        y={seat.y}
                        fontSize={12}
                        fill="white"
                        offsetX={seat.label.length * 3}
                        offsetY={6}
                        listening={false}
                      />
                    </React.Fragment>
                  ))}

                {/* ряды с сиденьями */}
         {zoneRows.map((row) => {
  const rowSeats = zoneSeats.filter((s) => s.rowId === row.id);
  const isRowSelected = selectedIds.includes(row.id);

  // границы ряда (для рамки)
  const minX = Math.min(...rowSeats.map((s) => s.x));
  const maxX = Math.max(...rowSeats.map((s) => s.x));
  const minY = Math.min(...rowSeats.map((s) => s.y));
  const maxY = Math.max(...rowSeats.map((s) => s.y));
  const padding = 10;

  return (
    <Group
      key={row.id}
      x={row.x}
      y={row.y}
     draggable={isRowSelected && currentTool === "select"}
      onClick={(e) => handleElementClick(row.id, e)}
      onDragMove={(e) => {
        if (!isRowSelected) return;

        const dx = e.target.x() - row.x;
        const dy = e.target.y() - row.y;

        // двигаем ВСЕ выделенные ряды
        setRows((prev) =>
          prev.map((r) =>
            selectedIds.includes(r.id)
              ? { ...r, x: r.x + dx, y: r.y + dy }
              : r
          )
        );

        // двигаем сиденья всех выделенных рядов
        setSeats((prev) =>
          prev.map((s) =>
            selectedIds.includes(s.rowId ?? "")
              ? { ...s, x: s.x + dx, y: s.y + dy }
              : s
          )
        );
      }}
      onDragEnd={(e) => {
        e.target.position({ x: row.x, y: row.y }); // сбрасываем, чтобы не было двойного смещения
      }}
    >
      {/* Рамка выделенного ряда */}
      {isRowSelected && rowSeats.length > 0 && (
        <Rect
          x={minX - row.x - seatRadius - padding}
          y={minY - row.y - seatRadius - padding}
          width={maxX - minX + seatRadius * 2 + padding * 2}
          height={maxY - minY + seatRadius * 2 + padding * 2}
          stroke="blue"
          strokeWidth={2}
          dash={[6, 4]}
          listening={false}
        />
      )}

      {/* Лейбл ряда */}
      <Rect
        x={-50}
        y={-10}
        width={row.label.length * 8 + 12}
        height={20}
        fill={isRowSelected ? "#D0E8FF" : "white"}
        opacity={0.7}
        cornerRadius={4}
      />
      <Text
        text={row.label}
        x={-46}
        y={-10}
        fontSize={14}
        fill={isRowSelected ? "blue" : "black"}
      />

      {/* Сиденья ряда */}
      {rowSeats.map((seat) => (
  <React.Fragment key={seat.id}>
    <Circle
      x={seat.x - row.x}
      y={seat.y - row.y}
      radius={seat.radius}
      fill={seat.fill}
      stroke={
        selectedIds.includes(seat.id) || isRowSelected ? "blue" : ""
      }
      strokeWidth={
        selectedIds.includes(seat.id) || isRowSelected ? 2 : 0
      }
      draggable
      onClick={(e) => handleElementClick(seat.id, e)}
      onDragEnd={(e) => {
        const newX = e.target.x() + row.x;
        const newY = e.target.y() + row.y;

        // 🔹 границы ряда
        const rowLeft = row.x - seatSpacingX / 2;
        const rowRight = row.x + rowSeats.length * seatSpacingX;
        const rowTop = row.y - seatSpacingY / 2;
        const rowBottom = row.y + seatSpacingY / 2;

        let newRowId: string | null = row.id;

        // 🔹 если ушло за рамку ряда → сиденье больше не в ряду
        if (
          newX < rowLeft ||
          newX > rowRight ||
          newY < rowTop ||
          newY > rowBottom
        ) {
          newRowId = null;
        }

        setSeats((prev) =>
          prev.map((s) =>
            s.id === seat.id
              ? { ...s, x: newX, y: newY, rowId: newRowId }
              : s
          )
        );
      }}
    />
    <Text
      text={seat.label}
      x={seat.x - row.x}
      y={seat.y - row.y}
      fontSize={12}
      fill="white"
      offsetX={seat.label.length * 3}
      offsetY={6}
      listening={false}
    />
  </React.Fragment>
))}

    </Group>
  );
})}


              </Group>
            );
          })}

          {/* временная зона при рисовании */}
          {drawingZone && (
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
              {currentTool === "add-zone" && (
                <Text
                  text={`${Math.max(
                    1,
                    Math.floor(
                      Math.abs(drawingZone.height) / seatSpacingY
                    )
                  )} × ${Math.max(
                    1,
                    Math.floor(
                      Math.abs(drawingZone.width) / seatSpacingX
                    )
                  )}`}
                  x={drawingZone.x + drawingZone.width / 2}
                  y={drawingZone.y - 20}
                  fontSize={14}
                  fill="blue"
                  offsetX={20}
                />
              )}
            </Group>
          )}
        </Layer>
        
       
      </Stage>
      <div className="w-[156px] h-[50px] absolute top-22 left-30 flex items-center space-x-2 bg-white border border-gray-200 shadow-md rounded-[8px] px-3 py-2">
    
    <button
      className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200 text-black"
      onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.3))}
    >
      –
    </button>
    <span className="text-gray-700 font-bold">{Math.round(scale * 100)}%</span>
    <button
      className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200 text-black"
      onClick={() => setScale((prev) => Math.min(prev + 0.1, 3))}
    >
      +
    </button>
  </div>
    </div>
  );
}

export default SeatmapCanvas;
