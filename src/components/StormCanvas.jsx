import React, { useRef, useEffect } from "react";
import { useGame } from "../game/context/GameContext";

export default function StormCanvas({ isBattle = false, strengthBased = false, flashAboveGround = false }) {
  const canvasRef = useRef(null);
  const { proximityInfo, weatherInfo } = useGame();

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
    let rainCount = 20;
    let windSpeed = 3;
    let thunderChance = 0;

    if (strengthBased) {
      const localRain = weatherInfo.rainIntensity || 0;
      const localStorm = weatherInfo.stormIntensity || 0;
      rainCount = Math.round(180 * localRain);
      windSpeed = 3 + localStorm * 19;
      thunderChance = localStorm >= 0.8 ? 0.003 + localStorm * 0.012 : 0;
    } else if (isBattle || proximityInfo.alertPhase === "strike") {
      rainCount = 180;
      windSpeed = 22;
      thunderChance = 0.015;
    } else {
      const localRain = weatherInfo.rainIntensity || 0;
      const localStorm = weatherInfo.stormIntensity || 0;
      rainCount = Math.round(180 * localRain);
      windSpeed = 3 + localStorm * 19;
      thunderChance = localStorm >= 0.8 ? 0.003 + localStorm * 0.012 : 0;
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
  }, [proximityInfo.alertPhase, weatherInfo.rainIntensity, weatherInfo.stormIntensity, isBattle, strengthBased, flashAboveGround]);

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
