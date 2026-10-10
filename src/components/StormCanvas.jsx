import React, { useRef, useEffect } from "react";
import { useGame } from "../game/context/GameContext";

export default function StormCanvas({ isBattle = false, strengthBased = false, flashAboveGround = false }) {
  const canvasRef = useRef(null);
  const { proximityInfo, activeTyphoon } = useGame();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // 警戒度に応じた雨量・風速パーティクル設定
    const typhoonStrength = Math.max(0, Math.min(1, ((activeTyphoon.maxWind || 20) - 20) / 45));
    let rainCount = 20;
    let windSpeed = 3;
    let thunderChance = 0;

    if (strengthBased) {
      const phaseRain = { calm: 0, alert: 0.18, prep: 0.42, strike: 1 }[proximityInfo.alertPhase] ?? 0;
      rainCount = Math.round((10 + typhoonStrength * 170) * phaseRain);
      windSpeed = 3 + typhoonStrength * 19;
      thunderChance = proximityInfo.alertPhase === "strike" ? 0.003 + typhoonStrength * 0.012 : 0;
    } else if (isBattle || proximityInfo.alertPhase === "strike") {
      rainCount = 180;
      windSpeed = 22;
      thunderChance = 0.015;
    } else if (proximityInfo.alertPhase === "prep") {
      rainCount = 100;
      windSpeed = 12;
      thunderChance = 0.005;
    } else if (proximityInfo.alertPhase === "alert") {
      rainCount = 45;
      windSpeed = 6;
    }

    const raindrops = Array.from({ length: rainCount }, () => ({
      x: Math.random() * (canvas.width + 300) - 150,
      y: Math.random() * canvas.height,
      len: Math.random() * 20 + 15,
      speedY: Math.random() * 10 + 15,
      speedX: windSpeed + Math.random() * 4,
      opacity: Math.random() * 0.4 + 0.2
    }));

    let lightningTimer = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 雷光フラッシュ
      if (lightningTimer > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${lightningTimer * 0.15})`;
        ctx.fillRect(0, 0, canvas.width, flashAboveGround ? canvas.height * 0.65 : canvas.height);
        lightningTimer--;
      } else if (Math.random() < thunderChance) {
        lightningTimer = Math.floor(Math.random() * 4) + 2;
      }

      // 雨滴の描画
      ctx.strokeStyle = "rgba(180, 220, 255, 0.45)";
      ctx.lineWidth = 1.5;

      raindrops.forEach((drop) => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + drop.speedX * 0.6, drop.y + drop.len);
        ctx.stroke();

        drop.y += drop.speedY;
        drop.x += drop.speedX;

        if (drop.y > canvas.height) {
          drop.y = -20;
          drop.x = Math.random() * (canvas.width + 300) - 150;
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [proximityInfo.alertPhase, isBattle, activeTyphoon, strengthBased, flashAboveGround]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5
      }}
    />
  );
}
