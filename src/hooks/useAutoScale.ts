import { useEffect, useRef, useState } from "react";

export function useAutoScale(designW: number, designH: number, opts?: { min?: number; max?: number }) {
  const { min = 0.7, max = 1 } = opts || {};
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      const s = Math.min(width / designW, height / designH);
      // чуть «притупим» для чёткости, чтобы не было мутной дроби
      const rounded = Math.round(Math.max(min, Math.min(max, s || 1)) * 100) / 100;
      setScale(rounded);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [designW, designH, min, max]);

  return { ref, scale };
}
