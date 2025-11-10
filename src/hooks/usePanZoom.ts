// src/hooks/usePanZoom.ts
import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";

type Pos = { x: number; y: number };

/**
 * Хук для панорамирования и зума Konva-Stage.
 *
 * Управляет:
 * - масштабом (scale)
 * - позицией (position.x / position.y)
 * - состоянием "нажата ли клавиша пробела" (isSpacePressed),
 *   чтобы в компоненте переключать курсор и режим перетаскивания.
 *
 * Использование:
 * const { stageRef, scale, position, setPosition, isSpacePressed, onWheel } = usePanZoom();
 * <Stage
 *   ref={stageRef}
 *   scaleX={scale}
 *   scaleY={scale}
 *   x={position.x}
 *   y={position.y}
 *   onWheel={onWheel}
 * />
 */
export function usePanZoom(opts?: { minScale?: number; maxScale?: number; initialScale?: number }) {
  // Границы и стартовый масштаб
  const { minScale = 0.3, maxScale = 4, initialScale = 1 } = opts || {};

  // ref на Konva.Stage (передаётся в <Stage ref={stageRef} />)
  const stageRef = useRef<Konva.Stage | null>(null);

  // Текущий масштаб
  const [scale, setScale] = useState<number>(initialScale);
  // Позиция (смещение) сцены
  const [position, setPosition] = useState<Pos>({ x: 0, y: 0 });
  // Зажат ли пробел (используем как "режим руки" / pan-mode)
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Глобальные обработчики клавиатуры — отслеживаем пробел для режима "рука"
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const editing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      // Если фокус в инпуте/textarea — не перехватываем пробел
      if (editing) return;

      if (e.code === "Space") {
        // Не даём странице скроллиться пробелом
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === "Escape") {
        // Здесь можно сбрасывать выделение/режимы при необходимости
        // (пока специально оставлено пустым)
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpacePressed(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  /**
   * Обработчик колесика мыши для зума.
   * Вызывать в <Stage onWheel={onWheel} />.
   *
   * Логика:
   * - Зум только при зажатом Ctrl (или Cmd на Mac), иначе не мешаем обычному скроллу.
   * - Масштабируем относительно точки под курсором.
   */
  const onWheel = useCallback(
    (e: any) => {
      const stage = stageRef.current ?? e.target?.getStage?.();
      if (!stage) return;

      const isMac = navigator.platform.toUpperCase().includes("MAC");
      // Зум включается только при Ctrl (PC) или Meta/Cmd (Mac)
      const needZoom = e.evt.ctrlKey || (isMac && e.evt.metaKey);
      if (!needZoom) return;

      // Отключаем стандартный зум браузера/скролл
      e.evt.preventDefault();

      const oldScale = scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Коэффициент изменения масштаба
      const scaleBy = 1.05;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScaleRaw = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      // Клампим масштаб в заданных пределах
      const newScale = Math.max(minScale, Math.min(maxScale, newScaleRaw));

      // Координаты точки в "мировых" координатах до масштабирования
      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      };

      // Новая позиция сцены, чтобы точка под курсором "осталась на месте"
      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      setScale(newScale);
      setPosition(newPos);
    },
    [scale, position.x, position.y, minScale, maxScale]
  );

  return {
    stageRef,
    scale,
    setScale,
    position,
    setPosition,
    isSpacePressed,
    onWheel,
  };
}
