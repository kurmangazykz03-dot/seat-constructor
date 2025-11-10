// Вертикальная панель инструментов редактора схемы.
// Отвечает за выбор текущего инструмента рисования/редактирования,
// действия над выделением (дублировать, удалить, выравнивание),
// а также за управление сеткой и фоном.

import React, { useEffect, useRef, useState } from "react";

type AlignDirection = "left" | "center" | "right";

/**
 * Набор инструментов, которые может активировать пользователь.
 * Значение хранится в EditorPage и влияет на поведение холста.
 */
type Tool =
  | "select"
  | "add-seat"
  | "add-row"
  | "add-zone"
  | "rotate"
  | "add-text"
  | "add-rect"
  | "add-ellipse"
  | "add-polygon"
  | "bend";

/**
 * Пропсы панели инструментов:
 *  - currentTool/setCurrentTool — текущий режим редактирования;
 *  - onDelete/onDuplicate — действия над выделенными объектами;
 *  - onAlign — выравнивание выделения;
 *  - onUploadBackground — загрузка фонового изображения;
 *  - showGrid/onToggleGrid — переключение сетки;
 *  - backgroundMode/backgroundFit — режим/способ отображения фона.
 */
interface ToolbarProps {
  /** Текущий выбранный инструмент */
  currentTool: Tool;
  /** Сменить текущий инструмент */
  setCurrentTool: (t: Tool) => void;

  /** Удалить выделенные объекты (или фон, если ничего не выделено) */
  onDelete: () => void;
  /** Выравнять выбранные объекты по заданному направлению */
  onAlign: (dir: AlignDirection) => void;
  /** Дублировать выделенные объекты */
  onDuplicate: () => void;

  /** Загрузить/изменить фоновое изображение (dataUrl) */
  onUploadBackground?: (dataUrl: string | null) => void;

  /** Показана ли сетка на холсте */
  showGrid?: boolean;
  /** Переключить отображение сетки */
  onToggleGrid?: () => void;

  /** Режим работы с фоном: авто-вписывание или ручное позиционирование */
  backgroundMode: "auto" | "manual";
  /** Изменить режим фона */
  setBackgroundMode: (m: "auto" | "manual") => void;
  /** Способ вписывания фонового изображения в канвас */
  backgroundFit: "contain" | "cover" | "stretch" | "none";
  /** Изменить способ вписывания фона */
  setBackgroundFit: (fit: "contain" | "cover" | "stretch" | "none") => void;
}

/* -------------------------------- Icons ---------------------------------- */
/**
 * Набор простых SVG-иконок для кнопок тулбара.
 * Держим их в этом файле, чтобы не тащить сторонние библиотеки.
 */
const IconSelect = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path
      d="M7 3l13 7-7 2-2 7-4-16z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);
const IconRect = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <rect x="5" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconEllipse = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <ellipse cx="12" cy="12" rx="7" ry="5" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconPolygon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M6 8l6-3 6 3-2 7H8L6 8z" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconText = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M5 6h14M12 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconSeat = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
    <rect x="7" y="13" width="10" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconZone = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconRow = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconRotate = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M20 12a8 8 0 1 1-4.7-7.3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
const IconBend = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M5 7c2-3 12-3 14 0v10c-2 3-12 3-14 0V7z" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconDuplicate = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <rect x="8" y="8" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
    <rect
      x="4"
      y="4"
      width="10"
      height="10"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      opacity="0.6"
    />
  </svg>
);
const IconDelete = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path
      d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
const IconAlign = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path
      d="M12 4v16M6 8h12M4 12h16M6 16h12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
const IconGrid = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M4 4h16v16H4zM4 12h16M12 4v16" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const IconUpload = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M4 17v2h16v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M12 3v10m0 0l-4-4m4 4l4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
const IconBg = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M7 15l3-3 3 4 2-2 3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="9" cy="9" r="1.5" fill="currentColor" />
  </svg>
);

/* ------------------------------ primitives ------------------------------- */

/**
 * Универсальная компактная кнопка тулбара.
 *
 * Используется для всех иконок, поддерживает:
 *  - состояние active (подсветка выбранного инструмента),
 *  - disabled (например, когда нет колбэка),
 *  - title / aria-label для подсказок.
 */
function Button({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const base =
    "group relative w-12 h-12 rounded-xl border inline-flex items-center justify-center transition-colors";
  const idle = "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100";
  const act = "border-blue-300 bg-blue-50 text-blue-600 ring-2 ring-blue-200";
  const dis = "opacity-40 cursor-not-allowed";
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`${base} ${disabled ? dis : active ? act : idle}`}
    >
      {children}
    </button>
  );
}

/** Подпись над группой инструментов (SELECT / DRAW / ZONES / TRANSFORM) */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] tracking-wide text-gray-400 font-medium select-none">
      {children}
    </div>
  );
}

/* ------------------------------ group model ------------------------------ */

/**
 * Логические группы инструментов тулбара.
 *
 *  - select — выбор / перемещение;
 *  - draw   — фигуры и текст;
 *  - zones  — зоны, ряды, места;
 *  - transform — поворот и «клин».
 */
type GroupId = "select" | "draw" | "zones" | "transform";

/**
 * Описание всех кнопок внутри каждой группы:
 *  - id    — Tool (для смены режима),
 *  - title — тултип,
 *  - icon  — SVG-компонент.
 */
const GROUP_ITEMS: Record<GroupId, { id: Tool; title: string; icon: React.FC }[]> = {
  select: [{ id: "select", title: "Выбор (V)", icon: IconSelect }],
  draw: [
    { id: "add-rect", title: "Прямоугольник (M)", icon: IconRect },
    { id: "add-ellipse", title: "Эллипс (E)", icon: IconEllipse },
    { id: "add-polygon", title: "Многоугольник (P)", icon: IconPolygon },
    { id: "add-text", title: "Текст (T)", icon: IconText },
  ],
  zones: [
    { id: "add-zone", title: "Добавить зону (Z)", icon: IconZone },
    { id: "add-row", title: "Добавить ряд (R)", icon: IconRow },
    { id: "add-seat", title: "Место (S)", icon: IconSeat },
  ],
  transform: [
    { id: "rotate", title: "Поворот (O)", icon: IconRotate },
    { id: "bend", title: "Клин зоны (B)", icon: IconBend },
  ],
};

/**
 * Утилита: по Tool возвращает, к какой группе он относится.
 * Используется для подсветки нужной группы и запоминания «последнего инструмента» в группе.
 */
function groupOf(tool: Tool): GroupId {
  if (tool === "select") return "select";
  if (["add-rect", "add-ellipse", "add-polygon", "add-text"].includes(tool)) return "draw";
  if (["add-zone", "add-row", "add-seat"].includes(tool)) return "zones";
  return "transform";
}

/* ------------------------------ Group button ----------------------------- */

/**
 * GroupButton — кнопка-группа на тулбаре.
 *
 * Показ:
 *  - основная кнопка — отображает «последний использованный» инструмент группы;
 *  - при клике по группе с несколькими инструментами — всплывает палитра кнопок (popover).
 *
 * Пропсы:
 *  - groupId      — идентификатор группы (select/draw/...);
 *  - currentTool  — текущий инструмент редактора;
 *  - lastUsed     — карта «группа → последний выбранный Tool»;
 *  - onPick       — вызывается при выборе конкретного инструмента;
 *  - isOpen/onToggle — управляют состоянием поповера.
 */
function GroupButton({
  groupId,
  currentTool,
  lastUsed,
  setLastUsed,
  onPick,
  label,
  isOpen,
  onToggle,
}: {
  groupId: GroupId;
  currentTool: Tool;
  lastUsed: Partial<Record<GroupId, Tool>>;
  setLastUsed: React.Dispatch<React.SetStateAction<Partial<Record<GroupId, Tool>>>>;
  onPick: (t: Tool) => void;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const items = GROUP_ITEMS[groupId];
  const activeInGroup = items.some((i) => i.id === currentTool);
  // последний выбранный инструмент в группе (по умолчанию — первый)
  const last = lastUsed[groupId] ?? items[0].id;
  const LastIcon = (items.find((i) => i.id === last) ?? items[0]).icon;

  const single = items.length === 1;

  /** Выбрать инструмент внутри группы и запомнить его как «последний» */
  const pick = (t: Tool) => {
    onPick(t);
    setLastUsed((prev) => ({ ...prev, [groupId]: t }));
  };

  return (
    <div className="flex flex-col items-center gap-1 relative">
      <SectionLabel>{label}</SectionLabel>
      <Button
        title={(items.find((i) => i.id === last) ?? items[0]).title}
        active={activeInGroup}
        onClick={() => {
          // если в группе только один инструмент — сразу выбираем его,
          // иначе открываем/закрываем палитру инструментов группы
          if (single) pick(items[0].id);
          else onToggle();
        }}
      >
        <LastIcon />
      </Button>

      {/* Поповер с инструментами группы (если их несколько) */}
      {!single && isOpen && (
        <div
          role="menu"
          aria-label={`${label} palette`}
          className="absolute left-16 top-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex flex-col gap-2"
        >
          {items.map(({ id, title, icon: Icon }) => (
            <Button key={id} title={title} active={currentTool === id} onClick={() => pick(id)}>
              <Icon />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Toolbar -------------------------------- */

/**
 * Toolbar — левый вертикальный блок инструментов редактора.
 *
 * Использует:
 *  - состояние текущего инструмента (currentTool) из EditorPage;
 *  - колбэки, которые прокидываются в канвас/редьюсер (onDelete, onAlign, onDuplicate и т.д.);
 *  - флаги сетки и режимы работы с фоном.
 *
 * Визуально делится на три блока:
 *  1) Группы инструментов (выбор, рисование, зоны, трансформация);
 *  2) Команды редактирования (дубликат, удаление, выравнивание);
 *  3) Настройки вида (сетка, фон, режим фона).
 */
export default function Toolbar({
  currentTool,
  setCurrentTool,
  onDelete,
  onAlign,
  onDuplicate,
  onUploadBackground,
  showGrid,
  onToggleGrid,
  backgroundMode,
  setBackgroundMode,
  backgroundFit, // сейчас не используется, но оставляем для совместимости
  setBackgroundFit, // аналогично
}: ToolbarProps) {
  /** Открыт ли поповер выравнивания (L/C/R) */
  const [alignOpen, setAlignOpen] = useState(false);

  /**
   * Карта «группа → последний использованный Tool».
   * Нужна для того, чтобы, например, при повторном клике по DRAW показывать
   * последнюю фигуру, а не всегда первую.
   */
  const [lastUsed, setLastUsed] = useState<Partial<Record<GroupId, Tool>>>({
    [groupOf(currentTool)]: currentTool,
  });

  /** При смене инструмента обновляем lastUsed для его группы */
  useEffect(() => {
    setLastUsed((prev) => ({ ...prev, [groupOf(currentTool)]: currentTool }));
  }, [currentTool]);

  /** ref на скрытый <input type="file"> для загрузки фонового изображения */
  const fileRef = useRef<HTMLInputElement | null>(null);

  /** Открыть диалог выбора файла */
  const pickFile = () => fileRef.current?.click();

  /** Обработка выбранного изображения и передача его наверх в виде dataUrl */
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !onUploadBackground) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUploadBackground(reader.result as string);
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsDataURL(f);
  };

  /** Какая группа инструментов сейчас раскрыта (для поповера) */
  const [openGroup, setOpenGroup] = useState<GroupId | null>(null);

  /** Выбрать инструмент в группе и закрыть её поповер */
  const handlePick = (t: Tool, groupId: GroupId) => {
    setCurrentTool(t);
    setLastUsed((prev) => ({ ...prev, [groupId]: t }));
    setOpenGroup(null);
  };

  return (
    <aside className="w-[72px] bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-4">
      {/* Группы инструментов (SELECT / DRAW / ZONES / TRANSFORM) */}
      <GroupButton
        groupId="select"
        label="ВЫБОР"
        currentTool={currentTool}
        lastUsed={lastUsed}
        setLastUsed={setLastUsed}
        onPick={(t) => handlePick(t, "select")}
        isOpen={openGroup === "select"}
        onToggle={() => setOpenGroup((g) => (g === "select" ? null : "select"))}
      />

      <GroupButton
        groupId="draw"
        label="РИСОВАТЬ"
        currentTool={currentTool}
        lastUsed={lastUsed}
        setLastUsed={setLastUsed}
        onPick={(t) => handlePick(t, "draw")}
        isOpen={openGroup === "draw"}
        onToggle={() => setOpenGroup((g) => (g === "draw" ? null : "draw"))}
      />

      <GroupButton
        groupId="zones"
        label="ЗОНЫ"
        currentTool={currentTool}
        lastUsed={lastUsed}
        setLastUsed={setLastUsed}
        onPick={(t) => handlePick(t, "zones")}
        isOpen={openGroup === "zones"}
        onToggle={() => setOpenGroup((g) => (g === "zones" ? null : "zones"))}
      />

      <GroupButton
        groupId="transform"
        label="ТРАНСФОРМ"
        currentTool={currentTool}
        lastUsed={lastUsed}
        setLastUsed={setLastUsed}
        onPick={(t) => handlePick(t, "transform")}
        isOpen={openGroup === "transform"}
        onToggle={() => setOpenGroup((g) => (g === "transform" ? null : "transform"))}
      />

      {/* Разделитель между выбором инструмента и командами редактирования */}
      <div className="w-8 h-px bg-gray-200 my-1" />

      {/* Блок команд редактирования выделения */}
      <div className="flex flex-col items-center gap-2">
        {/* Дублировать выделение */}
        <Button title="Дублировать (Ctrl/⌘+D)" onClick={onDuplicate}>
          <IconDuplicate />
        </Button>

        {/* Удалить выделение (или фон) */}
        <Button title="Удалить (Del)" onClick={onDelete}>
          <IconDelete />
        </Button>

        {/* Выравнивание L/C/R во всплывающем меню */}
        <div className="relative">
          <Button title="Выравнивание (L/C/R)" onClick={() => setAlignOpen((v) => !v)}>
            <IconAlign />
          </Button>
          {alignOpen && (
            <div className="absolute left-16 top-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex gap-2">
              <Button title="Выровнять по левому краю" onClick={() => onAlign("left")}>
                <IconAlign />
              </Button>
              <Button title="Выровнять по центру" onClick={() => onAlign("center")}>
                <IconAlign />
              </Button>
              <Button title="Выровнять по правому краю" onClick={() => onAlign("right")}>
                <IconAlign />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Разделитель между командами и настройками вида */}
      <div className="w-8 h-px bg-gray-200 my-1" />

      {/* Настройки вида / фона */}
      <div className="flex flex-col items-center gap-2">
        {/* Переключатель отображения сетки */}
        <Button
          title="Показать/скрыть сетку"
          active={!!showGrid}
          onClick={onToggleGrid}
          disabled={!onToggleGrid}
        >
          <IconGrid />
        </Button>

        {/* Загрузка фонового изображения */}
        <Button title="Загрузить фон" onClick={pickFile}>
          <IconUpload />
        </Button>

        {/* Переключатель режима работы с фоном: auto ↔ manual */}
        <Button
          title={backgroundMode === "manual" ? "Фон: вручную" : "Фон: автоматически"}
          active={backgroundMode === "manual"}
          onClick={() => setBackgroundMode(backgroundMode === "manual" ? "auto" : "manual")}
        >
          <IconBg />
        </Button>
      </div>

      {/* Скрытый input для выбора картинок (используется в pickFile/onFile) */}
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
    </aside>
  );
}
