import { useCallback, useState } from "react";

/**
 * Простой хук-история состояний (undo/redo).
 *
 * Принцип работы:
 * - хранит массив history: T[] — цепочка состояний;
 * - index — указатель на текущее состояние в истории;
 * - setState добавляет новое состояние в историю
 *   (обрезая «будущее», если мы были не в конце);
 * - undo/redo двигают index назад/вперёд.
 */
export const useHistory = <T>(initialState: T) => {
  // Вся история состояний. Стартуем с одного элемента — initialState.
  const [history, setHistory] = useState<T[]>([initialState]);
  // Индекс текущего состояния в массиве history.
  const [index, setIndex] = useState(0);

  // Текущее состояние — просто history[index].
  const state = history[index];

  /**
   * Обёртка над setState:
   * - принимает либо готовое состояние, либо функцию (prev => next);
   * - если новое состояние совпадает с текущим (через JSON.stringify),
   *   оно не добавляется в историю;
   * - если мы были не в конце истории, «будущее» обрезается.
   */
  const setState = useCallback(
    (action: T | ((prevState: T) => T)) => {
      // 1. Получаем новое состояние: либо напрямую, либо через функцию.
      const newState =
        typeof action === "function" ? (action as (prevState: T) => T)(state) : action;

      // 2. Проверка на отсутствие изменений:
      //    если новое состояние по JSON совпадает с текущим — выходим.
      //    (Просто защита от лишних записей в историю.)
      if (JSON.stringify(newState) === JSON.stringify(state)) {
        return;
      }

      // 3. Обрезаем историю до текущего index:
      //    всё, что «правее» текущего состояния, выбрасываем.
      const newHistory = history.slice(0, index + 1);

      // 4. Добавляем новое состояние в конец истории.
      newHistory.push(newState);

      // 5. Обновляем историю и текущий индекс.
      setHistory(newHistory);
      setIndex(newHistory.length - 1);
    },
    [history, index, state]
  );

  /**
   * Шаг назад (undo):
   * - просто уменьшаем index, если он > 0.
   * - само состояние `state` обновится автоматически,
   *   когда React применит новый index.
   */
  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
    }
  }, [index]);

  /**
   * Шаг вперёд (redo):
   * - увеличиваем index, если он ещё не в конце массива history.
   */
  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex(index + 1);
    }
  }, [index, history.length]);

  // Флаги для кнопок/горячих клавиш.
  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  /**
   * Полная очистка истории:
   * - возвращаемся к initialState,
   * - история становится массивом из единственного элемента.
   */
  const clear = useCallback(() => {
    setHistory([initialState]);
    setIndex(0);
  }, [initialState]);

  return { state, setState, undo, redo, clear, canUndo, canRedo };
};
