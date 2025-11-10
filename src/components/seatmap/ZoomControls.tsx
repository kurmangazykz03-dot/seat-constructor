import React from "react";

interface ZoomControlsProps {
  // Текущий масштаб (например, 1 = 100%)
  scale: number;
  // Колбэк для изменения масштаба
  setScale: (newScale: number) => void;

  // Необязательный масштаб, который будет показываться в лейбле
  // (например, если внешний код хочет показывать другой "логический" zoom)
  labelScale?: number;

  // Минимально и максимально допустимый масштаб
  min?: number;
  max?: number;
}

// Ограничение значения в диапазоне [min, max]
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
// Округление числа до двух знаков после запятой
const round2 = (v: number) => Math.round(v * 100) / 100;

const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  setScale,
  labelScale,
  min = 0.3,
  max = 3,
}) => {
  // Какое значение масштаба показывать в лейбле:
  // либо переданное извне, либо текущий scale
  const show = labelScale ?? scale;

  // Уменьшить масштаб
  const dec = () => setScale(round2(clamp(scale - 0.1, min, max)));
  // Увеличить масштаб
  const inc = () => setScale(round2(clamp(scale + 0.1, min, max)));
  // Сбросить к 100% (не используется в UI, но оставлено на будущее)
  const reset = () => setScale(1);

  return (
    <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-white/95 border border-gray-200 shadow-md rounded-[8px] px-3 py-2">
      {/* Кнопка «уменьшить масштаб» */}
      <button
        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200 text-black"
        onClick={dec}
        aria-label="Zoom out"
      >
        –
      </button>

      {/* Текстовое отображение масштаба, например «100%» */}
      <span className="min-w-[56px] text-center text-gray-800 font-semibold">
        {Math.round(show * 100)}%
      </span>

      {/* Кнопка «увеличить масштаб» */}
      <button
        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200 text-black"
        onClick={inc}
        aria-label="Zoom in"
      >
        +
      </button>

      {/* Если понадобится, сюда можно добавить кнопку сброса:
      <button onClick={reset}>100%</button>
      */}
    </div>
  );
};

export default ZoomControls;
