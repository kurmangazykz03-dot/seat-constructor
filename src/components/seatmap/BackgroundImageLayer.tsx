// src/components/seatmap/BackgroundImageLayer.tsx
import Konva from "konva"; // ← нужен для Filters.Blur
import React, { useMemo } from "react";
import { Image as KonvaImage, Layer, Rect } from "react-konva";
import useImage from "use-image";

// режимы встройки изображения в канвас
type Fit = "contain" | "cover" | "stretch" | "none";

interface BackgroundImageLayerProps {
  dataUrl: string; // dataURL или URL фонового изображения
  canvasW: number; // ширина канваса (в пикселях сцены)
  canvasH: number; // высота канваса
  fit?: Fit; // режим вписывания картинки
  opacity?: number; // прозрачность фоновой картинки
  blur?: number; // радиус блюра (0 — без размытия)
  scale?: number; // дополнительный масштаб фоновой картинки
  showCanvasBg?: boolean; // рисовать ли белый фон под картинкой
}

/**
 * Расчёт прямоугольника, в который нужно вписать / обрезать изображение
 * в зависимости от режима fit.
 */
function fitRect(imgW: number, imgH: number, boxW: number, boxH: number, mode: Fit) {
  if (mode === "stretch") return { w: boxW, h: boxH, x: 0, y: 0 }; // растянуть во всю область
  if (mode === "none") return { w: imgW, h: imgH, x: 0, y: 0 }; // оставить родной размер

  const rImg = imgW / imgH;
  const rBox = boxW / boxH;

  // "contain" — полностью влезть в коробку, с пустыми полями
  if (mode === "contain") {
    if (rImg > rBox) {
      const w = boxW;
      const h = w / rImg;
      return { w, h, x: 0, y: (boxH - h) / 2 };
    } else {
      const h = boxH;
      const w = h * rImg;
      return { w, h, x: (boxW - w) / 2, y: 0 };
    }
  }

  // "cover" — покрыть всю область, часть изображения может выйти за края
  if (rImg > rBox) {
    const h = boxH;
    const w = h * rImg;
    return { w, h, x: (boxW - w) / 2, y: 0 };
  } else {
    const w = boxW;
    const h = w / rImg;
    return { w, h, x: 0, y: (boxH - h) / 2 };
  }
}

const BackgroundImageLayer: React.FC<BackgroundImageLayerProps> = ({
  dataUrl,
  canvasW,
  canvasH,
  fit = "contain",
  opacity = 0.25,
  blur = 0,
  scale = 1,
  showCanvasBg = false,
}) => {
  // грузим картинку по dataUrl (hook возвращает HTMLImageElement)
  const [img] = useImage(dataUrl, "anonymous");

  // рассчитываем итоговый прямоугольник для отрисовки с учётом fit и scale
  const rect = useMemo(() => {
    if (!img) return { w: canvasW, h: canvasH, x: 0, y: 0 };

    // базовый прямоугольник по режиму fit
    const base = fitRect(img.width, img.height, canvasW, canvasH, fit);

    // доп. масштабирование относительно центра base
    const sw = base.w * scale;
    const sh = base.h * scale;
    const cx = base.x + base.w / 2;
    const cy = base.y + base.h / 2;
    const sx = cx - sw / 2;
    const sy = cy - sh / 2;

    return { w: sw, h: sh, x: sx, y: sy };
  }, [img, canvasW, canvasH, fit, scale]);

  return (
    <Layer listening={false}>
      {/* опциональный белый фон под картинкой (чтобы не просвечивал серый stage) */}
      {showCanvasBg && <Rect x={0} y={0} width={canvasW} height={canvasH} fill="#ffffff" />}

      {/* сама фонова картинка */}
      {img && (
        <KonvaImage
          image={img}
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={rect.h}
          opacity={opacity}
          // если blur > 0 — подключаем фильтр размытия
          filters={blur > 0 ? [Konva.Filters.Blur] : undefined}
          blurRadius={blur}
        />
      )}
    </Layer>
  );
};

export default BackgroundImageLayer;
