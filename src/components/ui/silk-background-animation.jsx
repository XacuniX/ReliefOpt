import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";

export const Component = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const [isLoaded, setIsLoaded] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    const speed = 0.02;
    const scale = 2;
    const noiseIntensity = 0.8;

    // Theme-matched silk colors
    const base = isDark
      ? { r: 10, g: 24, b: 22 } // deep teal-black base
      : { r: 238, g: 248, b: 245 }; // light teal-tinted base
    const silk = isDark
      ? { r: 20, g: 184, b: 166 } // teal-500 silk
      : { r: 13, g: 148, b: 136 }; // teal-600 silk

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Simple noise function
    const noise = (x, y) => {
      const G = 2.71828;
      const rx = G * Math.sin(G * x);
      const ry = G * Math.sin(G * y);
      return (rx * ry * (1 + x)) % 1;
    };

    const animate = () => {
      const { width, height } = canvas;

      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      if (isDark) {
        gradient.addColorStop(0, "#0a0f0d");
        gradient.addColorStop(0.5, "#0d1518");
        gradient.addColorStop(1, "#041e1a");
      } else {
        gradient.addColorStop(0, "#f8f9fb");
        gradient.addColorStop(0.5, "#eef2f7");
        gradient.addColorStop(1, "#e6f4f2");
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Create silk-like pattern
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      for (let x = 0; x < width; x += 2) {
        for (let y = 0; y < height; y += 2) {
          const u = (x / width) * scale;
          const v = (y / height) * scale;

          const tOffset = speed * time;
          const tex_x = u;
          const tex_y = v + 0.03 * Math.sin(8.0 * tex_x - tOffset);

          const pattern =
            0.6 +
            0.4 *
              Math.sin(
                5.0 *
                  (tex_x +
                    tex_y +
                    Math.cos(3.0 * tex_x + 5.0 * tex_y) +
                    0.02 * tOffset) +
                  Math.sin(20.0 * (tex_x + tex_y - 0.1 * tOffset))
              );

          const rnd = noise(x, y);
          const intensity = Math.max(0, pattern - (rnd / 15.0) * noiseIntensity);

          // Blend silk color with theme base
          const r = Math.floor(base.r + (silk.r - base.r) * intensity);
          const g = Math.floor(base.g + (silk.g - base.g) * intensity);
          const b = Math.floor(base.b + (silk.b - base.b) * intensity);
          const a = 255;

          const index = (y * width + x) * 4;
          if (index < data.length) {
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
            data[index + 3] = a;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Add subtle overlay for depth
      const overlayGradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) / 2
      );
      if (isDark) {
        overlayGradient.addColorStop(0, "rgba(0, 0, 0, 0.1)");
        overlayGradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");
      } else {
        overlayGradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
        overlayGradient.addColorStop(1, "rgba(13, 148, 136, 0.08)");
      }

      ctx.fillStyle = overlayGradient;
      ctx.fillRect(0, 0, width, height);

      time += 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDark]);

  return (
    <>
      <style>{`
        .silk-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }
      `}</style>

      <div className="absolute inset-0 overflow-hidden bg-background">
        {/* Animated Silk Background */}
        <canvas ref={canvasRef} className="silk-canvas" />

        {/* Gradient Overlay */}
        <div
          className={`absolute inset-0 z-10 ${
            isDark
              ? "bg-gradient-to-b from-black/30 via-transparent to-black/50"
              : "bg-gradient-to-b from-white/20 via-transparent to-white/10"
          }`}
        />
      </div>
    </>
  );
};
