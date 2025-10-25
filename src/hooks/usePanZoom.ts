// src/hooks/usePanZoom.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type Konva from "konva";

type Pos = { x: number; y: number };

export function usePanZoom(opts?: {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
}) {
  const { minScale = 0.3, maxScale = 4, initialScale = 1 } = opts || {};
  const stageRef = useRef<Konva.Stage | null>(null);

  const [scale, setScale] = useState<number>(initialScale);
  const [position, setPosition] = useState<Pos>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Space = hand tool
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const editing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (editing) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === "Escape") {
        // просто пробрасываем наверх — тут ничего
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

  // Ctrl/⌘ + колесо = зум к курсору
  const onWheel = useCallback((e: any) => {
    const stage = stageRef.current ?? e.target?.getStage?.();
    if (!stage) return;
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const needZoom = e.evt.ctrlKey || (isMac && e.evt.metaKey);
    if (!needZoom) return;

    e.evt.preventDefault();

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScaleRaw = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const newScale = Math.max(minScale, Math.min(maxScale, newScaleRaw));

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setScale(newScale);
    setPosition(newPos);
  }, [scale, position.x, position.y, minScale, maxScale]);

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
