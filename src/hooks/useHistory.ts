import { useCallback, useState } from "react";

export const useHistory = <T>(initialState: T) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const state = history[index];

  const setState = useCallback(
    (action: T | ((prevState: T) => T)) => {
      const newState =
        typeof action === "function" ? (action as (prevState: T) => T)(state) : action;

      if (JSON.stringify(newState) === JSON.stringify(state)) {
        return;
      }

      const newHistory = history.slice(0, index + 1);
      newHistory.push(newState);

      setHistory(newHistory);
      setIndex(newHistory.length - 1);
    },
    [history, index, state]
  );

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

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  const clear = useCallback(() => {
    setHistory([initialState]);
    setIndex(0);
  }, [initialState]);

  return { state, setState, undo, redo, clear, canUndo, canRedo };
};
