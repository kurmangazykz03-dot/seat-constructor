// Верхняя панель редактора (логотип, режим, undo/redo, импорт/экспорт, очистка, сохранение, помощь)

import { Download, FolderOpen, HelpCircle, Redo, Save, Trash2, Undo, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import logoUrl from "../../assets/icons/logo.png";

/**
 * Пропсы TopBar:
 *  - колбэки команд (save / clear / export / undo / redo / load...),
 *  - флаги доступности undo/redo,
 *  - обработчик открытия справки.
 */
type TopBarProps = {
  /** Сохранить текущую схему (в localStorage или на сервере — решает родитель) */
  onSave: () => void;
  /** Полностью очистить сцену */
  onClear: () => void;
  /** Экспорт схемы в JSON */
  onExport: () => void;
  /** Шаг «отменить» (undo) */
  onUndo: () => void;
  /** Шаг «повторить» (redo) */
  onRedo: () => void;
  /** Можно ли сейчас сделать undo */
  canUndo: boolean;
  /** Можно ли сейчас сделать redo */
  canRedo: boolean;

  /** Старый способ загрузки (оставлен для совместимости, опционален) */
  onLoad?: () => void;
  /** Загрузить последнюю схему из localStorage */
  onLoadLast?: () => void;
  /** Импорт схемы из JSON-файла */
  onLoadFromFile?: () => void;

  /** Открыть окно помощи / документации редактора */
  onHelpClick?: () => void;
};

/** Общие классы для кнопок-«призраков» (серый контур) */
const ghost =
  "inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition";

/** Кнопка-иконка квадратная (без текста) */
const ghostIcon =
  "inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition";

/** Модификатор для неактивных кнопок (disabled) */
const ghostDisabled = "opacity-40 cursor-not-allowed hover:bg-white active:bg-white";

/** Основная (primary) синяя кнопка — используется для «Сохранить» */
const primary =
  "inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors";

/** «Опасная» (danger) кнопка — очистка сцены */
const danger =
  "inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 active:bg-red-100 transition";

/**
 * TopBar — верхняя панель управления редактором.
 *
 * Отвечает за:
 *  - навигацию «назад на главную» (логотип),
 *  - индикацию режима (Редактирование),
 *  - кнопки undo/redo,
 *  - загрузку сохранённой схемы и импорт JSON,
 *  - экспорт, очистку и сохранение,
 *  - вызов справки (Help).
 */
function TopBar({
  onSave,
  onClear,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onLoad,
  onLoadLast,
  onLoadFromFile,
  onHelpClick,
}: TopBarProps) {
  /**
   * Режимы отображения кнопок загрузки:
   *  - showOldLoad — старый одиночный onLoad;
   *  - showNewLoad — разделённые «Load» и «Импорт JSON».
   *
   * Сейчас используется только showNewLoad (старый оставлен на всякий случай).
   */
  const showOldLoad = !!onLoad && !onLoadLast && !onLoadFromFile;
  const showNewLoad = !!onLoadLast || !!onLoadFromFile;

  return (
    <div className="h-[60px] bg-white/95 backdrop-blur border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      {/* Левая часть: логотип и бейдж «Режим редактирования» */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoUrl} alt="YouTicket" className="h-6 w-auto" draggable={false} />
        </Link>

        <span className="hidden sm:inline-block text-xs font-medium px-2.5 py-1 rounded-md bg-gray-100 text-gray-600">
          Режим редактирования
        </span>
      </div>

      {/* Правая часть: команды редактора */}
      <div className="flex items-center gap-2">
        {/* Undo */}
        <button
          onClick={onUndo}
          title="Отменить (Ctrl+Z)"
          className={`${ghostIcon} ${!canUndo ? ghostDisabled : ""}`}
          disabled={!canUndo}
          aria-label="Отменить"
        >
          <Undo size={16} />
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          title="Повторить (Ctrl+Y)"
          className={`${ghostIcon} ${!canRedo ? ghostDisabled : ""}`}
          disabled={!canRedo}
          aria-label="Повторить"
        >
          <Redo size={16} />
        </button>

        {/* Вертикальный разделитель блоков кнопок */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Блок загрузки схемы (последняя из LS + импорт JSON) */}
        {showNewLoad && (
          <>
            {onLoadLast && (
              <button onClick={onLoadLast} title="Load Last" className={ghost}>
                <Upload size={16} className="shrink-0" />
                <span className="hidden sm:inline">Load</span>
              </button>
            )}
            {onLoadFromFile && (
              <button onClick={onLoadFromFile} title="Load from file" className={ghost}>
                <FolderOpen size={16} className="shrink-0" />
                <span className="hidden sm:inline">Импорт JSON</span>
              </button>
            )}
          </>
        )}

        {/* Экспорт в JSON-файл */}
        <button onClick={onExport} title="Export JSON" className={ghost}>
          <Download size={16} className="shrink-0" />
          <span className="hidden sm:inline">Экспорт</span>
        </button>

        {/* Очистка сцены */}
        <button onClick={onClear} title="Clear" className={danger}>
          <Trash2 size={16} className="shrink-0" />
          <span className="hidden sm:inline">Очистить</span>
        </button>

        {/* Сохранение схемы */}
        <button onClick={onSave} title="Save" className={primary}>
          <Save size={16} className="shrink-0" />
          <span>Сохранить</span>
        </button>

        {/* Кнопка вызова справки (если передан обработчик) */}
        {onHelpClick && (
          <button onClick={onHelpClick} title="Помощь" className={ghostIcon} aria-label="Help">
            <HelpCircle size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default TopBar;
