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

export function hasBends(z:{bendTop?:number;bendRight?:number;bendBottom?:number;bendLeft?:number}) {
  const EPS = 0.5; // пикселей достаточно
  const abs = (v?: number) => Math.abs(v ?? 0);
  return abs(z.bendTop) > EPS || abs(z.bendRight) > EPS || abs(z.bendBottom) > EPS || abs(z.bendLeft) > EPS;
}

