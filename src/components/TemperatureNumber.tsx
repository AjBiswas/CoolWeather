import { useEffect, useRef } from "react";

interface TemperatureNumberProps {
  value: string;
  width: number;
  height: number;
}

const FONT_FAMILY = `"Bebas Neue", "Arial Narrow", sans-serif`;

let bebasNeueLoadPromise: Promise<void> | null = null;

// Canvas text only picks up a web font once it has actually finished loading -
// referencing it in CSS elsewhere in the app isn't enough for fillText().
function ensureBebasNeueLoaded(): Promise<void> {
  if (bebasNeueLoadPromise) {
    return bebasNeueLoadPromise;
  }
  const fontsApi = (document as unknown as { fonts?: FontFaceSet }).fonts;
  if (!fontsApi) {
    bebasNeueLoadPromise = Promise.resolve();
    return bebasNeueLoadPromise;
  }
  bebasNeueLoadPromise = fontsApi
    .load(`700 100px ${FONT_FAMILY}`)
    .then(() => undefined)
    .catch(() => undefined);
  return bebasNeueLoadPromise;
}

export function TemperatureNumber({ value, width, height }: TemperatureNumberProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) {
      return;
    }

    let cancelled = false;

    const draw = () => {
      if (cancelled) {
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const text = value || "--";

      // Find the largest font size that still fits the box.
      const maxWidth = width * 0.86;
      let displaySize = Math.round(height * 0.86);
      while (displaySize > 8) {
        ctx.font = `700 ${displaySize}px ${FONT_FAMILY}`;
        if (ctx.measureText(text).width <= maxWidth) {
          break;
        }
        displaySize -= 2;
      }
      ctx.font = `700 ${displaySize}px ${FONT_FAMILY}`;

      const cx = width / 2;
      const cy = height / 2;

      // Extruded depth: repeated copies offset diagonally down-right, darkening
      // toward the back - the same "dark material" the front face used to be,
      // now doing the job it's actually suited for (an unlit side face).
      const depth = Math.max(6, Math.round(displaySize * 0.14));
      for (let i = depth; i >= 1; i -= 1) {
        const t = i / depth;
        const r = Math.round(30 + 38 * (1 - t));
        const g = Math.round(32 + 40 * (1 - t));
        const b = Math.round(36 + 44 * (1 - t));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillText(text, cx + i * 0.55, cy + i * 0.72);
      }

      // Front face: bright and legible regardless of platform/GPU, since it's a
      // flat fill rather than something relying on 3D lighting to look white.
      // A warm red rim-light catches the top edge (echoing the sun/glow behind
      // it) before settling into white through the body of each stroke.
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = displaySize * 0.05;
      ctx.shadowOffsetY = displaySize * 0.02;

      const gradient = ctx.createLinearGradient(0, cy - displaySize * 0.5, 0, cy + displaySize * 0.1);
      gradient.addColorStop(0, "#ffb2a0");
      gradient.addColorStop(0.07, "#ffffff");
      gradient.addColorStop(1, "#e9edf6");
      ctx.fillStyle = gradient;
      ctx.fillText(text, cx, cy);
      ctx.restore();
    };

    void ensureBebasNeueLoaded().then(draw);

    return () => {
      cancelled = true;
    };
  }, [value, width, height]);

  return <canvas ref={canvasRef} className="temperature-number-canvas" aria-hidden="true" />;
}
