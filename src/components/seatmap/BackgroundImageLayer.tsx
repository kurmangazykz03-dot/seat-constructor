// src/components/seatmap/BackgroundImageLayer.tsx
import React, { useMemo } from "react";
import { Image as KonvaImage, Layer, Rect } from "react-konva";
import useImage from "use-image";
import Konva from "konva"; // ← для Filters.Blur

type Fit = "contain" | "cover" | "stretch" | "none";

interface BackgroundImageLayerProps {
  dataUrl: string;
  canvasW: number;
  canvasH: number;
  fit?: Fit;
  opacity?: number;
  blur?: number;
  scale?: number;          
  showCanvasBg?: boolean;  
}

function fitRect(imgW: number, imgH: number, boxW: number, boxH: number, mode: Fit) {
  if (mode === "stretch") return { w: boxW, h: boxH, x: 0, y: 0 };
  if (mode === "none")    return { w: imgW, h: imgH, x: 0, y: 0 };

  const rImg = imgW / imgH;
  const rBox = boxW / boxH;

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
  const [img] = useImage(dataUrl, "anonymous");

  const rect = useMemo(() => {
    if (!img) return { w: canvasW, h: canvasH, x: 0, y: 0 };

    const base = fitRect(img.width, img.height, canvasW, canvasH, fit);
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
      {showCanvasBg && (
        <Rect x={0} y={0} width={canvasW} height={canvasH} fill="#ffffff" />
      )}
      {img && (
        <KonvaImage
          image={img}
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={rect.h}
          opacity={opacity}
          filters={blur > 0 ? [Konva.Filters.Blur] : undefined}
          blurRadius={blur}
        />
      )}
    </Layer>
  );
};

export default BackgroundImageLayer;
