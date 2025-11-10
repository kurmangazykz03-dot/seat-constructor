import { useRef, useState, type ChangeEvent } from "react";

import PropertiesPanel from "../components/editor/PropertiesPanel";
import SeatmapCanvas from "../components/editor/SeatMapCanvas";
import Toolbar from "../components/editor/ToolBar";
import TopBar from "../components/editor/TopBar";

import { useHistory } from "../hooks/useHistory";

import { Row, Seat, ShapeObject, TextObject, Zone } from "../types/types";

import TemplatesPanel from "../components/editor/TemplatesPanel";
import { useAutoScale } from "../hooks/useAutoScale";
import { duplicateSelected } from "../utils/duplicate";
import { alignRows, alignSeats } from "../utils/seatmapCommands";

import HelpDrawer from "../components/editor/HelpDrawer";

/**
 * Ключ localStorage, под которым хранится последняя сохранённая схема.
 */
const LS_KEY = "seatmap_schema";

/**
 * Константы дизайна редактора:
 * размеры TopBar, ToolBar, правой панели и центра-канваса.
 * Эти значения используются и для автоскейла, и для контейнеров.
 */
const DESIGN = {
  TOPBAR_H: 60,
  TOOLBAR_W: 80,
  PROPS_W: 320,
  CANVAS_W: 1486,
  CANVAS_H: 752,
  GAP: 16,
};

/**
 * Полная «рабочая» ширина/высота области редактирования,
 * которую затем подгоняем под окно через useAutoScale.
 */
const WORK_W = DESIGN.TOOLBAR_W + DESIGN.GAP + DESIGN.CANVAS_W + DESIGN.GAP + DESIGN.PROPS_W;
const WORK_H = DESIGN.TOPBAR_H + DESIGN.GAP + DESIGN.CANVAS_H + DESIGN.GAP; // 844

/**
 * Глобальное состояние схемы зала.
 *
 * Используется:
 *  - в редакторе (EditorPage)
 *  - в канвасе (SeatmapCanvas)
 *  - в панелях свойств/шаблонов.
 */
export interface SeatmapState {
  /** Название зала / площадки */
  hallName: string;

  /** Фоновое изображение схемы (dataURL) */
  backgroundImage?: string | null;

  /** Зоны (прямоугольные блоки зала) */
  zones: Zone[];

  /** Ряды внутри зон */
  rows: Row[];

  /** Места (внутри ряда или свободные) */
  seats: Seat[];

  /** Свободные текстовые подписи */
  texts: TextObject[];

  /** Положение и масштаб сцены (используется для зума/панорамирования) */
  stage: {
    scale: number;
    x: number;
    y: number;
  };

  /** Режим вписывания фоновой картинки */
  backgroundFit?: "contain" | "cover" | "stretch" | "none";

  /** Режим работы с фоном: auto — вписываем, manual — трансформируем вручную */
  backgroundMode?: "auto" | "manual";

  /** Геометрия фонового изображения в manual-режиме */
  backgroundRect?: { x: number; y: number; width: number; height: number } | null;

  /** Дополнительные шейпы (прямоугольники, эллипсы, полигоны) */
  shapes: ShapeObject[];
}

/**
 * Начальное состояние пустой схемы.
 * Используется при первом запуске и при полной очистке.
 */
const INITIAL_STATE: SeatmapState = {
  hallName: "Зал 1",
  backgroundImage: null,
  zones: [],
  rows: [],
  seats: [],
  texts: [],
  stage: {
    scale: 1,
    x: 0,
    y: 0,
  },
  backgroundFit: "contain",
  backgroundMode: "auto",
  backgroundRect: null,
  shapes: [],
};

/**
 * Главная страница редактора схем.
 *
 * Отвечает за:
 *  - создание и хранение состояния SeatmapState (через useHistory для undo/redo);
 *  - подключения TopBar, Toolbar, SeatmapCanvas и правой панели (Properties / Templates);
 *  - операции сохранения/загрузки/экспорта JSON;
 *  - глобальные команды (выравнивание, дублирование, удаление и т.д.).
 */
function EditorPage() {
  /**
   * useHistory оборачивает состояние схемы и добавляет стек undo/redo.
   *  state      — актуальное состояние;
   *  setState   — обновление с сохранением в историю;
   *  undo/redo  — шаг назад/вперёд;
   *  canUndo/Redo — флаги доступности.
   */
  const { state, setState, undo, redo, clear, canUndo, canRedo } =
    useHistory<SeatmapState>(INITIAL_STATE);

  /** ID всех выделенных объектов (зоны, ряды, места, тексты, шейпы) */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /** Текущий активный инструмент на тулбаре */
  const [currentTool, setCurrentTool] = useState<
    | "select"
    | "add-seat"
    | "add-row"
    | "add-zone"
    | "rotate"
    | "add-text"
    | "add-rect"
    | "add-ellipse"
    | "add-polygon"
    | "bend"
  >("select");

  /** Состояние открытия справочного дровера «Помощь» */
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  /**
   * Когда активен курсор и нет выделения — справа вместо Properties
   * показываем панель шаблонов.
   */
  const shouldShowTemplates = currentTool === "select" && selectedIds.length === 0;

  /** Флаг отображения сетки на канвасе */
  const [showGrid, setShowGrid] = useState(true);

  /**
   * useAutoScale масштабирует внутрь окна всю «рабочую область» (WORK_W/WORK_H).
   * scaleRootRef вешается на корневой контейнер редактора.
   */
  const { ref: scaleRootRef, scale } = useAutoScale(WORK_W, WORK_H, { min: 0.5, max: 1 });

  /** Скрытый инпут для загрузки JSON с диска */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Сохранение текущей схемы в localStorage в формате v2.
   * Используется кнопкой Save в TopBar.
   */
  const handleSave = () => {
    try {
      const json = exportToV2(state);
      localStorage.setItem(LS_KEY, JSON.stringify(json));
      alert("Схема (v2) сохранена в localStorage!");
    } catch (error) {
      console.error("Ошибка при сохранении:", error);
      alert("Не удалось сохранить схему.");
    }
  };

  /**
   * Загрузить последнюю сохранённую схему из localStorage.
   * Масштаб и позиция сцены (stage) сохраняются.
   */
  const handleLoadLast = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return alert("Сохраненная схема не найдена.");
      const data = JSON.parse(raw);
      const prevStage = state.stage;
      const imported = importFromV2(data);
      setState(() => ({ ...imported, stage: prevStage }));
      alert("Схема (v2) загружена из localStorage!");
    } catch (error) {
      console.error("Ошибка при загрузке:", error);
      alert("Не удалось загрузить схему. Данные могут быть повреждены.");
    }
  };

  /** Открыть диалог выбора JSON-файла для импорта схемы. */
  const handleLoadFromFile = () => {
    fileInputRef.current?.click();
  };

  /**
   * Обработка выбранного пользователем JSON-файла:
   *  - читаем содержимое;
   *  - сохраняем «как есть» в localStorage;
   *  - конвертируем в внутренний формат (importFromV2) и применяем в редакторе
   *    с сохранением текущих zoom/pan.
   */
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const obj = JSON.parse(text); // без валидации, как просили

      // Записываем «как есть» в LS, чтобы Viewer/Editor подхватили
      localStorage.setItem(LS_KEY, JSON.stringify(obj));

      // Применяем, сохранив текущие zoom/pan
      const prevStage = state.stage;
      const imported = importFromV2(obj);
      setState(() => ({ ...imported, stage: prevStage }));

      alert("JSON импортирован из файла и записан в localStorage.");
    } catch (err: any) {
      alert("Ошибка JSON: " + (err?.message || String(err)));
    } finally {
      e.target.value = ""; // разрешить повторно выбрать тот же файл
    }
  };

  /**
   * Полная очистка сцены (с подтверждением).
   * Сбрасывает все сущности и возвращает схему в INITIAL_STATE.
   */
  const handleClear = () => {
    if (
      window.confirm(
        "Вы уверены, что хотите полностью очистить сцену? Это действие нельзя будет отменить."
      )
    ) {
      setState(() => ({
        hallName: "Зал 1",
        backgroundImage: null,
        zones: [],
        rows: [],
        seats: [],
        texts: [],
        shapes: [],
        stage: { scale: 1, x: 0, y: 0 },
        backgroundFit: "contain",
        backgroundMode: "auto",
        backgroundRect: null,
      }));
    }
  };

  /**
   * Импорт схемы из формата v2 (JSON → внутренний SeatmapState).
   * Здесь происходит:
   *  - миграция углов клина (angleLeft/RightDeg);
   *  - разворачивание вложенных структур (зона → ряды → места)
   *    в плоские массивы rows / seats;
   *  - подхват свободных мест, текстов и шейпов.
   */
  function importFromV2(json: any): SeatmapState {
    // helper для чтения угла клина зоны
    const readAngle = (v: any) => {
      const a = Number(v);
      if (!Number.isFinite(a) || a <= 0) return 90; // 0/NaN -> прямоугольник
      return Math.max(10, Math.min(170, a)); // кламп
    };

    // Зоны
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
      angleLeftDeg: readAngle(z.angleLeftDeg),
      angleRightDeg: readAngle(z.angleRightDeg),

      seatSpacingX: Number(z.seatSpacingX ?? 30),
      seatSpacingY: Number(z.seatSpacingY ?? 30),
      rowLabelSide:
        z.rowLabelSide === "right" || z.rowLabelSide === "left" ? z.rowLabelSide : "left",
    }));

    const rows: Row[] = [];
    const seats: Seat[] = [];

    // Разворачиваем rows / seats по всем зонам
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

    // 🆕 Подхватываем свободные сиденья (если есть отдельный блок freeSeats)
    if (Array.isArray(json.freeSeats)) {
      json.freeSeats.forEach((s: any) => {
        seats.push({
          id: String(s.id ?? crypto.randomUUID()),
          x: Number(s.x ?? 0),
          y: Number(s.y ?? 0),
          radius: Number(s.radius ?? 12),
          fill: String(s.fill ?? "#1f2937"),
          label: String(s.label ?? ""),
          zoneId: null, // вне зоны
          rowId: null, // вне ряда
          colIndex: null,
          status: (s.status as any) ?? "available",
          category: s.category ?? "standard",
        });
      });
    }

    // Текстовые объекты
    const texts: TextObject[] = (json.texts || []).map((t: any) => ({
      id: String(t.id ?? crypto.randomUUID()),
      text: String(t.text ?? "Text"),
      x: Number(t.x ?? 0),
      y: Number(t.y ?? 0),
      fontSize: Number(t.fontSize ?? 18),
      rotation: Number(t.rotation ?? 0),
      fill: t.fill ?? "#111827",
      fontFamily: t.fontFamily ?? undefined,
    }));

    // Шейпы
    const shapes: ShapeObject[] = (json.shapes || []).map((s: any) => ({
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
    }));

    return {
      hallName: String(json.hallName ?? "Зал 1"),
      backgroundImage: json.backgroundImage ?? null,
      zones,
      rows,
      seats,
      texts,
      shapes,
      stage: { scale: 1, x: 0, y: 0 },
      backgroundFit: json.backgroundFit ?? "contain",
      backgroundMode: json.backgroundMode ?? "auto",
      backgroundRect: json.backgroundRect ?? null,
    };
  }

  /**
   * Экспорт текущего состояния схемы в формат v2.
   * Структура:
   *  - hallName / background*;
   *  - zones (внутри — rows, внутри row — seats);
   *  - texts, shapes, freeSeats.
   */
  function exportToV2(s: SeatmapState) {
    return {
      version: 2,
      hallName: s.hallName,
      backgroundImage: s.backgroundImage ?? null,
      backgroundFit: s.backgroundFit ?? "contain",
      backgroundMode: s.backgroundMode ?? "auto",
      backgroundRect: s.backgroundRect ?? null,

      zones: s.zones.map((zone) => ({
        id: zone.id,
        name: zone.label,
        color: zone.color ?? zone.fill,
        rotation: zone.rotation ?? 0,
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        transparent: !!zone.transparent,
        fillOpacity: zone.fillOpacity ?? 1,
        seatSpacingX: zone.seatSpacingX ?? 30,
        seatSpacingY: zone.seatSpacingY ?? 30,

        // ⬇️ экспортируем настройки клина
        angleLeftDeg: zone.angleLeftDeg ?? 90,
        angleRightDeg: zone.angleRightDeg ?? 90,

        rowLabelSide: zone.rowLabelSide ?? "left",
        rows: s.rows
          .filter((row) => row.zoneId === zone.id)
          .map((row) => ({
            id: row.id,
            label: row.label,
            x: row.x,
            y: row.y,
            seats: s.seats
              .filter((seat) => seat.rowId === row.id)
              .sort((a, b) => (a.colIndex ?? 0) - (b.colIndex ?? 0))
              .map((seat) => ({
                id: seat.id,
                label: seat.label,
                x: seat.x,
                y: seat.y,
                fill: seat.fill,
                radius: seat.radius,
                status: seat.status ?? "available",
                category: seat.category ?? "standard",
              })),
          })),
      })),

      texts: (s.texts || []).map((t) => ({
        id: t.id,
        text: t.text,
        x: t.x,
        y: t.y,
        fontSize: t.fontSize,
        rotation: t.rotation ?? 0,
        fill: t.fill ?? "#111827",
        fontFamily: t.fontFamily ?? null,
      })),

      shapes: (s.shapes || []).map((sh) => ({
        id: sh.id,
        kind: sh.kind,
        x: sh.x,
        y: sh.y,
        width: sh.width,
        height: sh.height,
        fill: sh.fill ?? "#ffffff",
        stroke: sh.stroke ?? "#111827",
        strokeWidth: sh.strokeWidth ?? 1,
        opacity: sh.opacity ?? 1,
        rotation: sh.rotation ?? 0,
        flipX: !!sh.flipX,
        flipY: !!sh.flipY,
        points: sh.points?.map((p) => ({ x: p.x, y: p.y })) ?? null,
      })),

      // 🆕 свободные сиденья (вне зон/рядов)
      freeSeats: (s.seats || [])
        .filter((seat) => !seat.zoneId || !seat.rowId)
        .map((seat) => ({
          id: seat.id,
          label: seat.label,
          x: seat.x,
          y: seat.y,
          fill: seat.fill,
          radius: seat.radius,
          status: seat.status ?? "available",
          category: seat.category ?? "standard",
        })),
    };
  }

  /**
   * Экспорт схемы в файл `seatmap_v2.json`.
   * Используется кнопкой Export в TopBar.
   */
  const handleExport = () => {
    const exportData = exportToV2(state);
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "seatmap_v2.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Удаление выделенных объектов:
   *  - если ничего не выделено и есть фон — удаляем только фон;
   *  - если выделены зоны — каскадно удаляем связанные ряды и места;
   *  - если выделены ряды — удаляем только их и места в этих рядах;
   *  - если выделены места, тексты или шейпы — удаляем только их.
   */
  const handleDelete = () => {
    // Особый случай: нет выделения, но есть фон → очищаем фон
    if (selectedIds.length === 0) {
      if (state.backgroundImage) {
        setState((prev) => ({
          ...prev,
          backgroundImage: null,
          backgroundRect: null,
          backgroundMode: "auto",
        }));
      }
      return;
    }

    setState((prev) => {
      const sel = new Set(selectedIds);

      // Какие зоны удаляем
      const delZoneIds = new Set(prev.zones.filter((z) => sel.has(z.id)).map((z) => z.id));

      // Ряды, выделенные напрямую
      const delRowsDirect = prev.rows.filter((r) => sel.has(r.id)).map((r) => r.id);
      // Ряды, которые принадлежат удаляемым зонам
      const delRowsFromZones = prev.rows.filter((r) => delZoneIds.has(r.zoneId)).map((r) => r.id);
      const delRowIds = new Set([...delRowsDirect, ...delRowsFromZones]);

      // Места, выделенные напрямую
      const delSeatsDirect = prev.seats.filter((s) => sel.has(s.id)).map((s) => s.id);
      // Места из удаляемых рядов
      const delSeatsFromRows = prev.seats
        .filter((s) => s.rowId && delRowIds.has(s.rowId))
        .map((s) => s.id);
      // Места из удаляемых зон
      const delSeatsFromZones = prev.seats
        .filter((s) => s.zoneId && delZoneIds.has(s.zoneId))
        .map((s) => s.id);
      const delSeatIds = new Set([...delSeatsDirect, ...delSeatsFromRows, ...delSeatsFromZones]);

      // Тексты и шейпы
      const prevTexts = prev.texts ?? [];
      const prevShapes = prev.shapes ?? [];
      const delTextIds = new Set(prevTexts.filter((t) => sel.has(t.id)).map((t) => t.id));
      const delShapeIds = new Set(prevShapes.filter((sh) => sel.has(sh.id)).map((sh) => sh.id));

      return {
        ...prev,
        zones: prev.zones.filter((z) => !delZoneIds.has(z.id)),
        rows: prev.rows.filter((r) => !delRowIds.has(r.id)),
        seats: prev.seats.filter((s) => !delSeatIds.has(s.id)),
        texts: prevTexts.filter((t) => !delTextIds.has(t.id)),
        shapes: prevShapes.filter((sh) => !delShapeIds.has(sh.id)),
      };
    });

    // Сбрасываем выделение после удаления
    setSelectedIds([]);
  };

  /** Допустимые направления выравнивания объектов. */
  type AlignDirection = "left" | "center" | "right";

  /**
   * Выравнивание выделенных объектов:
   *  - для мест — alignSeats (внутри их контекста);
   *  - для зон/рядов — alignRows.
   */
  const handleAlign = (dir: AlignDirection) => {
    if (selectedIds.length === 0) return;

    const hasZones = state.zones.some((z) => selectedIds.includes(z.id));
    const hasRows = state.rows.some((r) => selectedIds.includes(r.id));
    const hasSeats = state.seats.some((s) => selectedIds.includes(s.id));

    if (hasSeats) {
      setState((prev) => alignSeats(prev, selectedIds, dir));
      return;
    }
    if (hasRows || hasZones) {
      setState((prev) => alignRows(prev, selectedIds, dir));
    }
  };

  /**
   * Обновление фонового изображения (после загрузки пользователем).
   * В manual-режиме сбрасываем backgroundRect, чтобы пересчитать рамку.
   */
  const handleUploadBackground = (dataUrl: string | null) => {
    setState((prev) => ({
      ...prev,
      backgroundImage: dataUrl ?? null,
      ...(prev.backgroundMode === "manual" ? { backgroundRect: null } : {}),
    }));
  };

  /**
   * Дублирование выделенных объектов (зоны/ряды/места/тексты/шейпы).
   * Реальная логика в util-функции duplicateSelected.
   */
  const handleDuplicate = () => {
    const { next, newSelectedIds } = duplicateSelected(state, selectedIds, 24);
    setState(() => next);
    if (newSelectedIds.length) setSelectedIds(newSelectedIds);
  };

  return (
    <div className="w-screen h-screen bg-gray-100 overflow-auto">
      {/* Корневой контейнер, к которому привязан авто-скейл */}
      <div ref={scaleRootRef} className="w-full h-full relative">
        <div
          className="absolute left-1/2 top-0"
          style={{
            width: WORK_W,
            height: WORK_H,
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {/* Дровер «Помощь» с быстрым стартом и описанием инструментов */}
          {isHelpOpen && <HelpDrawer isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />}

          {/* Верхняя панель управления (логотип, undo/redo, load/import/export/clear/save, помощь) */}
          <div style={{ height: DESIGN.TOPBAR_H }}>
            <TopBar
              onSave={handleSave}
              onLoadLast={handleLoadLast}
              onLoadFromFile={handleLoadFromFile}
              onClear={handleClear}
              onExport={handleExport}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              onHelpClick={() => setIsHelpOpen(true)}
            />
            {/* Скрытый input для импорта seatmap_v2.json */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Основная рабочая область: слева тулбар, по центру канвас, справа свойства/шаблоны */}
          <div
            className="mt-4 flex"
            style={{
              gap: DESIGN.GAP,
              height: DESIGN.CANVAS_H,
            }}
          >
            {/* Вертикальный Toolbar с инструментами рисования и сервисными кнопками */}
            <div style={{ width: DESIGN.TOOLBAR_W, height: DESIGN.CANVAS_H }}>
              <Toolbar
                onDuplicate={handleDuplicate}
                currentTool={currentTool}
                setCurrentTool={setCurrentTool}
                onDelete={handleDelete}
                onAlign={handleAlign}
                onUploadBackground={handleUploadBackground}
                showGrid={showGrid}
                onToggleGrid={() => setShowGrid((s) => !s)}
                backgroundMode={state.backgroundMode ?? "auto"}
                setBackgroundMode={(m) => setState((prev) => ({ ...prev, backgroundMode: m }))}
                backgroundFit={state.backgroundFit ?? "contain"}
                setBackgroundFit={(fit) => setState((prev) => ({ ...prev, backgroundFit: fit }))}
              />
            </div>

            {/* Канвас с зоной редактирования и сеткой */}
            <div
              className="rounded-[16px] border border-[#e5e5e5] bg-white"
              style={{ width: DESIGN.CANVAS_W, height: DESIGN.CANVAS_H }}
            >
              <SeatmapCanvas
                seats={state.seats}
                rows={state.rows}
                zones={state.zones}
                texts={state.texts}
                shapes={state.shapes}
                setState={setState}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                currentTool={currentTool}
                showGrid={showGrid}
                setShowGrid={setShowGrid}
                onDuplicate={handleDuplicate}
                backgroundFit={state.backgroundFit}
                setBackgroundFit={(fit) => setState((prev) => ({ ...prev, backgroundFit: fit }))}
                backgroundMode={state.backgroundMode}
                backgroundRect={state.backgroundRect ?? undefined}
                setBackgroundMode={(m) => setState((prev) => ({ ...prev, backgroundMode: m }))}
                setBackgroundRect={(r) => setState((prev) => ({ ...prev, backgroundRect: r }))}
                backgroundImage={state.backgroundImage}
                setBackgroundImage={(v) => setState((prev) => ({ ...prev, backgroundImage: v }))}
              />
            </div>

            {/* Правая панель: либо Properties выбранных объектов, либо список готовых шаблонов */}
            <div style={{ width: DESIGN.PROPS_W, height: DESIGN.CANVAS_H }}>
              {shouldShowTemplates ? (
                <TemplatesPanel />
              ) : (
                <PropertiesPanel selectedIds={selectedIds} state={state} setState={setState} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorPage;
