"use client";

import {
  defaultSettings,
  getMood,
  getResolution,
  type CinematicSettings
} from "@/lib/cinematicPresets";
import { forwardRef, useCallback, useEffect, useRef } from "react";

type Particle = {
  baseX: number;
  baseY: number;
  amplitude: number;
  speed: number;
  radius: number;
  axis: number;
};

type Props = {
  settings: CinematicSettings;
};

const CinematicCanvas = forwardRef<HTMLCanvasElement, Props>(({ settings }, forwardedRef) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();

  const assignRefs = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node;
      if (!forwardedRef) {
        return;
      }
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else {
        forwardedRef.current = node;
      }
    },
    [forwardedRef]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const effectiveSettings = { ...defaultSettings, ...settings };
    const { width, height } = getResolution(
      effectiveSettings.resolutionPresetId,
      effectiveSettings.aspectRatio
    );

    canvas.width = width;
    canvas.height = height;

    const mood = getMood(effectiveSettings.moodId);
    const startTime = performance.now();

    const particleCount = Math.round(120 * (effectiveSettings.parallax + 0.5));
    const particles: Particle[] = Array.from({ length: particleCount }).map((_, index) => ({
      baseX: Math.random(),
      baseY: Math.random(),
      amplitude: 0.05 + Math.random() * 0.35,
      speed: 0.6 + Math.random() * 1.2,
      radius: 0.6 + Math.random() * 1.9,
      axis: index % 2 === 0 ? 1 : -1
    }));

    const grainCanvas = document.createElement("canvas");
    grainCanvas.width = 240;
    grainCanvas.height = 135;
    const grainCtx = grainCanvas.getContext("2d");

    const generateGrain = () => {
      if (!grainCtx) {
        return;
      }
      const grainData = grainCtx.createImageData(grainCanvas.width, grainCanvas.height);
      for (let i = 0; i < grainData.data.length; i += 4) {
        const tint = Math.random() * 255;
        grainData.data[i] = tint;
        grainData.data[i + 1] = tint;
        grainData.data[i + 2] = tint;
        grainData.data[i + 3] = 35;
      }
      grainCtx.putImageData(grainData, 0, 0);
    };

    generateGrain();

    const renderFrame = (timestamp: number) => {
      const elapsed = (timestamp - startTime) / 1000;
      generateGrain();
      drawFrame({
        ctx,
        width,
        height,
        elapsed,
        settings: effectiveSettings,
        mood,
        particles,
        grainCanvas
      });
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animationFrameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [settings]);

  return <canvas ref={assignRefs} className="h-full w-full rounded-[26px] object-cover" />;
});

CinematicCanvas.displayName = "CinematicCanvas";

export default CinematicCanvas;

type DrawFrameArgs = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  elapsed: number;
  settings: CinematicSettings;
  mood: ReturnType<typeof getMood>;
  particles: Particle[];
  grainCanvas: HTMLCanvasElement;
};

const drawFrame = ({
  ctx,
  width,
  height,
  elapsed,
  settings,
  mood,
  particles,
  grainCanvas
}: DrawFrameArgs) => {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  paintBackground(ctx, width, height, elapsed, mood, settings);
  paintParallaxShapes(ctx, width, height, elapsed, settings);
  paintLightSweeps(ctx, width, height, elapsed, mood, settings);
  paintParticles(ctx, width, height, elapsed, particles, settings, mood);
  paintBars(ctx, width, height, settings);
  paintGrain(ctx, width, height, grainCanvas, settings);

  ctx.restore();
};

const paintBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  mood: ReturnType<typeof getMood>,
  settings: CinematicSettings
) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, applyPulse(mood.palette[0], elapsed * 0.1, 0.04));
  gradient.addColorStop(0.45, applyPulse(mood.palette[1], elapsed * 0.12, 0.08));
  gradient.addColorStop(1, mood.palette[2]);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const radial = ctx.createRadialGradient(
    width * 0.5,
    height * 0.35 + Math.sin(elapsed * 0.6) * width * 0.05,
    width * 0.1,
    width * 0.5,
    height,
    width
  );
  radial.addColorStop(0, `${mood.light}90`);
  radial.addColorStop(1, "transparent");

  ctx.fillStyle = radial;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = mood.haze;
  ctx.fillRect(0, height * 0.65, width, height * 0.35);
};

const paintParallaxShapes = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  settings: CinematicSettings
) => {
  const layers = 4;
  for (let layer = 0; layer < layers; layer += 1) {
    const depth = layer / layers;
    const intensity = 1 - depth;
    const baseY = height * (0.4 + depth * 0.4);
    const amplitude = 60 + depth * 120;
    const waveSpeed = (0.1 + depth * 0.2) * getCameraSpeedMultiplier(settings.cameraMotionId);
    const slope = 0.3 + depth * 0.5;
    ctx.beginPath();

    for (let x = 0; x <= width; x += 4) {
      const normalizedX = x / width;
      const offset =
        Math.sin(normalizedX * Math.PI * (3 + layer) + elapsed * waveSpeed) * amplitude * slope +
        Math.cos(normalizedX * Math.PI * 6 + elapsed * 0.25) * 18 * settings.parallax;
      const y = baseY + offset;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, baseY - 200, 0, height);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${0.15 + depth * 0.3})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${0.35 + depth * 0.6})`);

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.globalAlpha = 0.18 * intensity;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * intensity})`;
    ctx.lineWidth = 1.5 - depth * 1.1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
};

const paintLightSweeps = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  mood: ReturnType<typeof getMood>,
  settings: CinematicSettings
) => {
  const base = elapsed * 0.2;
  for (let index = 0; index < 3; index += 1) {
    const progress = (base + index * 0.6) % 1;
    const sweepX =
      width * 0.2 + progress * width * 0.6 + Math.sin(elapsed * 0.6 + index) * width * 0.08;
    const sweepWidth = width * (0.15 + settings.bloom * 0.25);

    const gradient = ctx.createLinearGradient(sweepX - sweepWidth, 0, sweepX + sweepWidth, 0);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.5, `${mood.light}${index === 0 ? "80" : "40"}`);
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = "screen";
    ctx.fillRect(sweepX - sweepWidth, height * 0.1, sweepWidth * 2, height * 0.8);
  }
  ctx.globalCompositeOperation = "source-over";
};

const paintParticles = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  particles: Particle[],
  settings: CinematicSettings,
  mood: ReturnType<typeof getMood>
) => {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.4 + settings.bloom * 0.3;

  particles.forEach((particle, index) => {
    const motion = getCameraMotionOffset(settings.cameraMotionId, elapsed, particle.axis);
    const x =
      (particle.baseX + Math.sin(elapsed * 0.17 + index) * 0.02 + motion.x * 0.001) * width +
      Math.sin(elapsed * particle.speed * 0.2 + index) * width * 0.02;
    const y =
      (particle.baseY +
        Math.cos(elapsed * 0.12 + index) * 0.02 +
        motion.y * 0.001 +
        Math.sin(elapsed * particle.speed * 0.1 + index) * 0.01) *
      height;

    const radius = particle.radius * (1 + Math.sin(elapsed * particle.speed) * 0.4);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 18);
    gradient.addColorStop(0, `${mood.light}dd`);
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius * 10, y - radius * 10, radius * 20, radius * 20);
  });

  ctx.globalAlpha = 0.8 * settings.chromaShift;
  ctx.globalCompositeOperation = "screen";
  ctx.filter = `blur(${1.5 + settings.bloom * 5}px) saturate(${1.3 + settings.chromaShift * 0.7})`;
  ctx.fillStyle = `${mood.palette[2]}66`;
  ctx.fillRect(0, 0, width, height);
  ctx.filter = "none";
  ctx.restore();
};

const paintBars = (ctx: CanvasRenderingContext2D, width: number, height: number, settings: CinematicSettings) => {
  const targetAspect = settings.aspectRatio;
  const currentAspect = width / height;

  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "rgba(0,0,0,0.85)";

  if (currentAspect > targetAspect) {
    const desiredHeight = width / targetAspect;
    const barHeight = (height - desiredHeight) / 2;
    if (barHeight > 0) {
      ctx.fillRect(0, 0, width, barHeight);
      ctx.fillRect(0, height - barHeight, width, barHeight);
    }
  } else {
    const desiredWidth = height * targetAspect;
    const barWidth = (width - desiredWidth) / 2;
    if (barWidth > 0) {
      ctx.fillRect(0, 0, barWidth, height);
      ctx.fillRect(width - barWidth, 0, barWidth, height);
    }
  }

  ctx.restore();
};

const paintGrain = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grainCanvas: HTMLCanvasElement,
  settings: CinematicSettings
) => {
  ctx.save();
  ctx.globalAlpha = settings.grain;
  const pattern = ctx.createPattern(grainCanvas, "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
};

const applyPulse = (hexColor: string, time: number, amplitude: number) => {
  const { r, g, b } = hexToRgb(hexColor);
  const pulse = 1 + Math.sin(time * Math.PI * 2) * amplitude;
  const clamp = (value: number) => Math.min(255, Math.max(0, Math.round(value)));
  return `rgb(${clamp(r * pulse)}, ${clamp(g * pulse)}, ${clamp(b * pulse)})`;
};

const hexToRgb = (hex: string) => {
  const sanitized = hex.replace("#", "");
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

const getCameraMotionOffset = (
  motionId: CinematicSettings["cameraMotionId"],
  elapsed: number,
  axis: number
) => {
  switch (motionId) {
    case "dolly":
      return {
        x: Math.sin(elapsed * 0.4) * 420 * axis,
        y: Math.cos(elapsed * 0.25) * 280
      };
    case "drift":
      return {
        x: Math.sin(elapsed * 0.6 + axis) * 320,
        y: Math.sin(elapsed * 0.35 + axis) * 220
      };
    case "pulse":
      return {
        x: Math.sin(elapsed * 3) * 65,
        y: Math.cos(elapsed * 1.5) * 45
      };
    case "orbit":
    default:
      return {
        x: Math.cos(elapsed * 0.35) * 380,
        y: Math.sin(elapsed * 0.3) * 200
      };
  }
};

const getCameraSpeedMultiplier = (motionId: CinematicSettings["cameraMotionId"]) => {
  switch (motionId) {
    case "dolly":
      return 1.4;
    case "drift":
      return 0.9;
    case "pulse":
      return 1.8;
    case "orbit":
    default:
      return 1;
  }
};
