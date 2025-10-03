import { useState, useCallback } from 'react';

// Хук принимает начальное состояние и возвращает кортеж с текущим состоянием,
// функцией для его изменения, функциями undo/redo и флагами их доступности.
export const useHistory = <T>(initialState: T) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  // Текущее состояние всегда является элементом истории по текущему индексу
  const state = history[index];

  // Функция для установки нового состояния
  const setState = useCallback((action: T | ((prevState: T) => T)) => {
    const newState = typeof action === 'function' 
      ? (action as (prevState: T) => T)(state) 
      : action;
      
    // Если состояние не изменилось, ничего не делаем
    if (JSON.stringify(newState) === JSON.stringify(state)) {
      return;
    }

    // При новом действии "отрезаем" всю будущую историю (которую мы отменили)
    const newHistory = history.slice(0, index + 1);
    newHistory.push(newState);
    
    setHistory(newHistory);
    setIndex(newHistory.length - 1);
  }, [history, index, state]);

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
    }
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex(index + 1);
    }
  }, [index, history.length]);
  
  // Флаги для блокировки кнопок в UI
  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  // Функция для полного сброса истории
  const clear = useCallback(() => {
    setHistory([initialState]);
    setIndex(0);
  }, [initialState]);


  return { state, setState, undo, redo, clear, canUndo, canRedo };
};