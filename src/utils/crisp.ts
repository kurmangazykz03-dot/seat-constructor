export const crisp = (n: number, scale: number) =>
  Math.round(n * scale) / scale;

export const crispSize = (n: number, scale: number) => {
  const snapped = Math.round(n * scale) / scale;
  // не даём размеру «сжаться» до 0 при маленьких значениях
  return Math.max(1 / scale, snapped);
};

export const crispRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number
) => ({
  x: crisp(x, scale),
  y: crisp(y, scale),
  width: crispSize(w, scale),
  height: crispSize(h, scale),
});

export const crispPoint = (p: {x:number;y:number}, scale: number) => ({
  x: crisp(p.x, scale),
  y: crisp(p.y, scale),
});
export const crispStroke = (n: number, scale: number, strokeWidth = 1) => {
  // если толщина нечётная — добавляем 0.5px/scale для идеального 1px
  const half = (strokeWidth % 2 ? 0.5 : 0) / scale;
  return Math.round((n + half) * scale) / scale;
};

export const crispStrokeRect = (
  x: number, y: number, w: number, h: number, scale: number, strokeWidth = 1
) => {
  const half = (strokeWidth % 2 ? 0.5 : 0) / scale;
  return {
    x: Math.round((x + half) * scale) / scale,
    y: Math.round((y + half) * scale) / scale,
    width: Math.max(1 / scale, Math.round((w) * scale) / scale),
    height: Math.max(1 / scale, Math.round((h) * scale) / scale),
  };
};
