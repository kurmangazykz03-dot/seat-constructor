// src/components/editor/HelpDrawer.tsx
import React from "react";
import { X } from "lucide-react";

type HelpTopic = {
  id: string;
  title: string;
  contentHtml: string;
};

type HelpDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

/** Мок-данные. В будущем этот массив прилетит с сервера. */
const MOCK_TOPICS: HelpTopic[] = [
  {
    id: "quick-start",
    title: "Быстрый старт",
    contentHtml: `
      <ol class="list-decimal pl-4 space-y-1 text-sm text-gray-700">
        <li>Откройте главную страницу и выберите <b>Редактировать</b> или <b>Просмотр</b>.</li>
        <li>В редакторе верхняя панель (TopBar): <code>Undo</code>/<code>Redo</code>, <code>Load</code>, <code>Import JSON</code>, <code>Export</code>, <code>Clear</code>, <code>Save</code>.</li>
        <li>Основные режимы инструментов (Toolbar):
          <ul class="list-disc pl-4 mt-1 space-y-0.5">
            <li><b>Select</b> — выбор/перетаскивание.</li>
            <li><b>Add Zone</b> — нарисовать зону (прямоугольник).</li>
            <li><b>Add Seat</b> — добавить одиночное место вне зон.</li>
            <li><b>Add Text</b> — добавить подпись.</li>
            <li><b>Add Rect / Ellipse / Polygon</b> — базовые шейпы.</li>
            <li><b>Rotate</b> — режим поворота выбранного объекта.</li>
            <li><b>Bend</b> — редактирование клиновидных зон (углы слева/справа).</li>
          </ul>
        </li>
      </ol>

      <div class="mt-4 border border-gray-200 rounded-lg overflow-hidden">
        <div class="bg-gray-50 border-b border-gray-100 px-3 py-2 text-[11px] text-gray-500">
          Пример панели инструментов
        </div>
        <div class="h-40 flex items-center justify-center text-[11px] text-gray-400">
          Здесь можно разместить иллюстрацию с подсветкой Toolbar / TopBar.
        </div>
      </div>
    `,
  },
  {
    id: "hotkeys",
    title: "Горячие клавиши и навигация",
    contentHtml: `
      <ul class="list-disc pl-4 space-y-0.5 text-sm text-gray-700">
        <li><b>Пробел</b> — временная «рука» (панорамирование сцены). Двигайте мышью при зажатом Space.</li>
        <li><b>Ctrl/Cmd +</b> и <b>Ctrl/Cmd −</b> — масштаб сцены (зум).</li>
        <li><b>Ctrl/Cmd 0</b> — сброс масштаба к 100%.</li>
        <li><b>Delete / Backspace</b> — удалить выделенное; если на сцене ничего не выделено и включён фон — удалить фон.</li>
        <li><b>Shift + клик</b> — добавлять/снимать объект из выделения.</li>
        <li><b>Alt/Meta/Ctrl + клик</b> по объекту — выбрать родительскую зону элемента.</li>
        <li><b>Колёсико</b>: обычная прокрутка — перемещение сцены; с Ctrl/Alt/Meta — масштаб.</li>
        <li><b>← / → / ↑ / ↓</b> — сдвиг выделенных объектов на 1 px.</li>
        <li><b>Shift + ←/→/↑/↓</b> — быстрый сдвиг на 10 px.</li>
      </ul>
    `,
  },
  {
    id: "grid-snapping",
    title: "Сетка и снаппинг",
    contentHtml: `
      <ul class="list-disc pl-4 space-y-0.5 text-sm text-gray-700">
        <li>Сетка 30×30. Переключение <b>Show grid</b> — в Toolbar.</li>
        <li><b>Add Zone</b> / шейпы рисуются с привязкой к сетке.</li>
        <li><b>Add Seat</b>: удерживайте <b>Alt</b>, чтобы привязаться к сетке во время клика.</li>
        <li><b>Polygon</b>: по умолчанию точки ставятся на сетку; удерживайте <b>Alt</b>, чтобы отключить снап только для текущего клика.</li>
        <li>Перетаскивание свободных мест снапится при отпускании (координаты округляются к центрам клеток).</li>
      </ul>
    `,
  },
  {
    id: "background",
    title: "Работа с фоном",
    contentHtml: `
      <ul class="list-disc pl-4 space-y-0.5 text-sm text-gray-700">
        <li><b>Upload background</b> — через Toolbar.</li>
        <li><b>Auto</b>: фон сам вписывается (режимы <code>contain / cover / stretch / none</code> — параметр Fit).</li>
        <li><b>Manual</b>: фон выделяется, его можно двигать/растягивать трансформером; <b>Delete</b> — убрать фон.</li>
      </ul>
    `,
  },
  {
    id: "zones-seats",
    title: "Создание и правка зон и мест",
    contentHtml: `
      <p class="text-sm text-gray-800 font-semibold mb-1">Зона (Add Zone)</p>
      <ul class="list-disc pl-4 space-y-0.5 text-sm text-gray-700 mb-3">
        <li>Выберите <b>Add Zone</b> и протяните прямоугольник. Размеры привязываются к сетке.</li>
        <li>Редактируйте свойства в <b>Properties</b>:
          <ul class="list-disc pl-5 mt-1 space-y-0.5">
            <li><b>Label</b> (имя), <b>X/Y/Width/Height</b>, <b>Rotation</b>.</li>
            <li><b>Seat spacing X/Y</b> — шаги по горизонтали/вертикали.</li>
            <li><b>Apply (by spacing)</b> — расставит ряды/места сеткой по интервалам.</li>
            <li><b>Distribute seats to fit</b> — растянет текущие ряды/места по ширине/высоте зоны.</li>
            <li><b>+ Column Left/Right</b> — добавить колонку мест ко всем рядам зоны.</li>
            <li><b>Seat numbering L→R / R→L</b> — перенумерация мест в рядах.</li>
            <li><b>Row labels side: Left/Right</b> — где рисовать метки рядов.</li>
            <li><b>Appearance</b>: прозрачность фона зоны или заливка с непрозрачностью.</li>
          </ul>
        </li>
      </ul>

      <p class="text-sm text-gray-800 font-semibold mb-1">Ряды и места</p>
      <ul class="list-disc pl-4 space-y-0.5 text-sm text-gray-700 mb-3">
        <li>Выделите ряд → в <b>Properties</b> можно менять <b>X/Y</b>, распределять места по ширине (<b>Distribute</b>) и перенумеровывать.</li>
        <li>Выделите одно место → правьте <b>Label, X, Y, Status, Category, Radius, Color</b>.</li>
        <li>Групповая правка мест: выделите несколько (рамкой или Shift-кликом) → раздел <b>Bulk edit — Seats</b>.</li>
      </ul>

      <p class="text-sm text-gray-800 font-semibold mb-1">Текст и шейпы</p>
      <ul class="list-disc pl-4 space-y-0.5 text-sm text-gray-700 mb-3">
        <li><b>Text</b>: правьте текст/цвет/размер/поворот.</li>
        <li><b>Shapes</b> (Rect/Ellipse/Polygon): геометрия, обводка/заливка/непрозрачность/поворот/зеркалирование; есть пресеты.</li>
      </ul>

      <p class="text-sm text-gray-800 font-semibold mb-1">Bend (клин зоны)</p>
      <ul class="list-disc pl-4 space-y-0.5 text-sm text-gray-700">
        <li>Включите <b>Bend</b>, выделите зону, тяните нижние угловые ручки.</li>
        <li>Углы: <code>angleLeftDeg</code> / <code>angleRightDeg</code> (кламп 10–170°, значения ≤ 0 превращаются в 90°).</li>
        <li><b>Shift</b> — симметрия; <b>Ctrl/Cmd</b> — шаг 5°; <b>Alt</b> — тонкий шаг.</li>
        <li>Геометрия зоны меняется клином, контент не «тянется», но визуально согласуется.</li>
      </ul>
    `,
  },
  {
    id: "selection-align",
    title: "Выделение, выравнивание, дублирование, удаление",
    contentHtml: `
      <ul class="list-disc pl-4 space-y-0.5 text-sm text-gray-700">
        <li>Прямоугольная рамка (в режиме <b>Select</b> по пустому месту) — выделяет только места.</li>
        <li><b>Align</b> (Toolbar): выравнивает выделенные зоны/ряды/места по <b>Left/Center/Right</b> (для мест — внутри их контекста).</li>
        <li><b>Duplicate</b> (Toolbar): делает копии выделенных объектов со смещением.</li>
        <li><b>Delete</b> — удалить выделенные объекты. Для зон каскадно удаляются ряды и места.</li>
      </ul>
    `,
  },
  {
    id: "save-load",
    title: "Сохранение, загрузка, экспорт",
    contentHtml: `
      <ul class="list-disc pl-4 space-y-0.5 text-sm text-gray-700">
        <li><b>Save</b> — сохраняет текущую схему в <code>localStorage</code> (ключ <code>seatmap_schema</code>) в формате v2.</li>
        <li><b>Load</b> — читает из <code>localStorage</code> и загружает в редактор.</li>
        <li><b>Import JSON</b> — выберите <code>.json</code> (формат v2).</li>
        <li><b>Export</b> — скачивает <code>seatmap_v2.json</code> (тот же формат v2).</li>
      </ul>
    `,
  },
];

const HelpDrawer: React.FC<HelpDrawerProps> = ({ isOpen, onClose }) => {
  const [topics, setTopics] = React.useState<HelpTopic[]>([]);
  const [activeTopicId, setActiveTopicId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ESC закрывает
  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Загрузка контента при первом открытии
  React.useEffect(() => {
    if (!isOpen) return;
    if (topics.length > 0) return;

    setIsLoading(true);
    setError(null);

    // ⚠️ сюда потом можно подвесить реальный fetch:
    //
    // fetch("/api/editor-help")
    //   .then((r) => {
    //     if (!r.ok) throw new Error("HTTP " + r.status);
    //     return r.json();
    //   })
    //   .then((json: { topics: HelpTopic[] }) => {
    //     setTopics(json.topics);
    //     setActiveTopicId(json.topics[0]?.id ?? null);
    //   })
    //   .catch((e) => {
    //     console.error("Failed to load help", e);
    //     setTopics(MOCK_TOPICS);
    //     setActiveTopicId(MOCK_TOPICS[0].id);
    //     setError("Не удалось загрузить онлайн-справку. Показана локальная версия.");
    //   })
    //   .finally(() => setIsLoading(false));
    //
    // Пока сервера нет — используем мок:
    setTimeout(() => {
      setTopics(MOCK_TOPICS);
      setActiveTopicId(MOCK_TOPICS[0].id);
      setIsLoading(false);
    }, 150);
  }, [isOpen, topics.length]);

  if (!isOpen) return null;

  const activeTopic =
    topics.find((t) => t.id === activeTopicId) || topics[0] || null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* полупрозрачный фон */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />

      {/* сам drawer */}
      <div
        className="relative z-50 h-full w-full max-w-5xl bg-white shadow-xl border-l border-gray-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">
              Помощь
            </span>
            <span className="text-[11px] text-gray-500">
              Краткий гид по редактору схем
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs"
          >
            Закрыть
          </button>
        </div>

        {/* тело: слева список, справа контент */}
        <div className="flex flex-1 min-h-0">
          {/* список разделов */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 px-3 py-3 overflow-y-auto">
            {topics.map((topic) => {
              const isActive = topic.id === activeTopic?.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setActiveTopicId(topic.id)}
                  className={`w-full text-left mb-2 last:mb-0 px-3 py-2 rounded-lg text-xs border ${
                    isActive
                      ? "bg-white border-blue-200 text-blue-700 shadow-sm"
                      : "bg-white border-gray-200 text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  {topic.title}
                </button>
              );
            })}
          </div>

          {/* контент раздела */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {isLoading && (
              <div className="text-xs text-gray-400 mb-2">
                Загрузка контента...
              </div>
            )}
            {error && (
              <div className="text-[11px] text-red-500 mb-3">{error}</div>
            )}

            {activeTopic && (
              <>
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                  {activeTopic.title}
                </h2>
                <div
                  className="text-sm text-gray-700 leading-relaxed space-y-2"
                  dangerouslySetInnerHTML={{
                    __html: activeTopic.contentHtml,
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpDrawer;
