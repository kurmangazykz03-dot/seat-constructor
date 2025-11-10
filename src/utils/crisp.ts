// Набор вспомогательных функций для «пиксельно-чёткого» (pixel-perfect) рендера
// при масштабировании сцены Konva / canvas.

/**
 * Приводит координату к ближайшему «целому» пикселю с учётом текущего масштаба.
 * Используется для позиционирования элементов (x/y), чтобы убрать размытые границы.
 */
export const crisp = (n: number, scale: number) => Math.round(n * scale) / scale;

/**
 * Приводит размер к «чётному» значению с учётом масштаба.
 * Не даёт размеру схлопнуться в 0 при малых значениях и сильном масштабе.
 */
export const crispSize = (n: number, scale: number) => {
  const snapped = Math.round(n * scale) / scale;
  // не даём размеру «сжаться» до 0 при маленьких значениях
  return Math.max(1 / scale, snapped);
};

/**
 * Удобный helper: возвращает прямоугольник с координатами/размерами,
 * корректно привязанными к пикселю.
 */
export const crispRect = (x: number, y: number, w: number, h: number, scale: number) => ({
  x: crisp(x, scale),
  y: crisp(y, scale),
  width: crispSize(w, scale),
  height: crispSize(h, scale),
});

/**
 * То же самое, что crisp для пары координат (x, y).
 * Удобно для точек полигонов и центров фигур.
 */
export const crispPoint = (p: { x: number; y: number }, scale: number) => ({
  x: crisp(p.x, scale),
  y: crisp(p.y, scale),
});

/**
 * Смещает координату с учётом толщины линии, чтобы обводка попадала
 * ровно в 1 физический пиксель (особенно при нечётной толщине).
 */
export const crispStroke = (n: number, scale: number, strokeWidth = 1) => {
  // если толщина нечётная — добавляем 0.5px/scale для идеального 1px
  const half = (strokeWidth % 2 ? 0.5 : 0) / scale;
  return Math.round((n + half) * scale) / scale;
};

/**
 * Вариант для прямоугольника с обводкой:
 * смещает x/y и нормализует width/height так, чтобы stroke ложился
 * по пиксельной сетке и фигура не «плыла» при масштабе.
 */
export const crispStrokeRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  strokeWidth = 1
) => {
  const half = (strokeWidth % 2 ? 0.5 : 0) / scale;
  return {
    x: Math.round((x + half) * scale) / scale,
    y: Math.round((y + half) * scale) / scale,
    width: Math.max(1 / scale, Math.round(w * scale) / scale),
    height: Math.max(1 / scale, Math.round(h * scale) / scale),
  };
};
