const toRad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Клин, верх в пределах [0..w], устойчив к углам близким к 0°/180°. */
export function buildAngleWedgePathClamped(
  w: number,
  h: number,
  angleLeftDeg: number,
  angleRightDeg: number
) {
  const aL = toRad(angleLeftDeg);
  const aR = toRad(angleRightDeg);

  const safeCot = (a: number) => {
    const s = Math.sin(a);
    if (Math.abs(s) < 1e-6) return 1e6 * Math.sign(Math.cos(a) || 1);
    return Math.cos(a) / s;
  };

  let dxL = h * safeCot(aL);
  let dxR = h * safeCot(aR);

  dxL = clamp(dxL, 0, w - 1);
  dxR = clamp(dxR, 0, w - 1);

  if (dxL + dxR > w - 1) {
    const k = (w - 1) / (dxL + dxR);
    dxL *= k;
    dxR *= k;
  }

  const TLx = dxL;
  const TRx = w - dxR;

  return `M 0 ${h} L ${w} ${h} L ${TRx} 0 L ${TLx} 0 Z`;
}
