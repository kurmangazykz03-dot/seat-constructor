import { useEffect, useRef, useState } from "react";

/**
 * Хук, который автоматически масштабирует "дизайн-рамку"
 * под доступное место контейнера.
 *
 * Идея:
 * - у тебя есть макет фиксированного размера designW x designH
 * - есть обёртка (div), которая может быть любой ширины/высоты
 * - мы следим за размером обёртки через ResizeObserver
 * - считаем scale = min(wrapperWidth / designW, wrapperHeight / designH)
 * - клампим scale в пределах [min, max] и чуть округляем.
 *
 * Возвращаем:
 * - ref — его вешаешь на контейнер
 * - scale — множитель, которым масштабируешь внутренний контент (через CSS transform: scale)
 */
export function useAutoScale(
  designW: number,
  designH: number,
  opts?: { min?: number; max?: number }
) {
  // Ограничения масштаба по умолчанию:
  // нельзя уменьшать меньше 0.7 и увеличивать больше 1
  const { min = 0.7, max = 1 } = opts || {};

  // ref на DOM-элемент, размер которого будем отслеживать
  const ref = useRef<HTMLDivElement | null>(null);

  // Текущее значение scale (по умолчанию 1)
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!ref.current) return;

    // ResizeObserver следит за изменением размеров элемента
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;

      // Базовый масштаб: насколько можно ужать макет,
      // чтобы целиком влез по ширине и высоте
      const s = Math.min(width / designW, height / designH);

      // Клампим масштаб в [min, max], подстраховываемся на случай NaN (s || 1),
      // затем округляем до двух знаков после запятой,
      // чтобы не дёргать React по микроизменениям.
      const clamped = Math.max(min, Math.min(max, s || 1));
      const rounded = Math.round(clamped * 100) / 100;

      setScale(rounded);
    });

    // Начинаем наблюдение за ref-элементом
    ro.observe(ref.current);

    // При размонтировании/смене ref — отписываемся
    return () => ro.disconnect();
  }, [designW, designH, min, max]);

  // ref — вешаешь на контейнер
  // scale — используешь в стиле: transform: `scale(${scale})`
  return { ref, scale };
}
