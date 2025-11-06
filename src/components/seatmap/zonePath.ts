const toRad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Клин, верх в пределах [0..w], устойчив к углам близким к 0°/180°. */
export function buildAngleWedgePathClamped(
  w: number,
  h: number,
  angleLeftDeg: number,
  angleRightDeg: number,
  minTop = 24                      // ⬅️ минимум ширины верха
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const safeCot = (a: number) => {
    const s = Math.sin(a);
    const c = Math.cos(a);
    return Math.abs(s) < 1e-6 ? (c >= 0 ? 1e12 : -1e12) : c / s;
  };

  let dxL = h * safeCot(toRad(angleLeftDeg));
  let dxR = h * safeCot(toRad(angleRightDeg));

  dxL = Math.max(0, Math.min(dxL, w - 1));
  dxR = Math.max(0, Math.min(dxR, w - 1));

  const maxSum = Math.max(0, w - minTop);
  const sum = dxL + dxR;
  if (sum > maxSum) {
    const k = maxSum / (sum || 1);
    dxL *= k; dxR *= k;
  }

  const TLx = dxL;
  const TRx = w - dxR;
  return `M 0 ${h} L ${w} ${h} L ${TRx} 0 L ${TLx} 0 Z`;
}

