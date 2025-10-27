// components/seatmap/zonePath.ts
export function buildBentRectPath(
  w: number,
  h: number,
  bt: number,
  br: number,
  bb: number,
  bl: number
) {
  // M 0,0  Q (w/2, bt) -> (w,0)
  // Q (w+br, h/2) -> (w,h)
  // Q (w/2, h+bb) -> (0,h)
  // Q (-bl, h/2) -> (0,0) Z
  return [
    `M 0 0`,
    `Q ${w / 2} ${bt} ${w} 0`,
    `Q ${w + br} ${h / 2} ${w} ${h}`,
    `Q ${w / 2} ${h + bb} 0 ${h}`,
    `Q ${-bl} ${h / 2} 0 0`,
    `Z`,
  ].join(" ");
}

export function hasBends(z: {
  bendTop?: number;
  bendRight?: number;
  bendBottom?: number;
  bendLeft?: number;
}) {
  return !!(z.bendTop || z.bendRight || z.bendBottom || z.bendLeft);
}
