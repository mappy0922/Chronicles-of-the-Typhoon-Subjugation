import React, { useRef, useEffect } from "react";

function StormCanvas({ isBattle = false, strengthBased = false, flashAboveGround = false, weatherInfo = {}, proximityInfo = {}, isPaused = false }) {
  const canvasRef = useRef(null);
  const weatherRef = useRef(weatherInfo || {});
  const proximityRef = useRef(proximityInfo || {});
  weatherRef.current = weatherInfo || {};
  proximityRef.current = proximityInfo || {};

  useEffect(() => {
    if (isPaused) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;
    let dryTimerId;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // 警戒度に応じた雨量・風速パーティクル設定
    let rainCount = 180;
    let windSpeed = 3;
    let thunderChance = 0;

    const raindrops = Array.from({ length: 180 }, () => ({
      x: Math.random() * (canvas.width + 300) - 150,
      y: Math.random() * canvas.height,
      len: Math.random() * 20 + 15,
      speedY: Math.random() * 10 + 15,
      speedX: 3 + Math.random() * 4,
      opacity: Math.random() * 0.4 + 0.2
    }));

    let lightningTimer = 0;
    let hadRainOrLightning = false;

    const render = () => {
      const currentWeather = weatherRef.current;
      const currentProximity = proximityRef.current;
      const localStorm = currentWeather?.stormIntensity || 0;
      const strike = isBattle || currentProximity?.alertPhase === "strike";
      rainCount = strike ? 180 : Math.round(180 * (currentWeather.rainIntensity || 0));
      windSpeed = strike ? 22 : 3 + localStorm * 19;
      thunderChance = strike ? 0.015 : localStorm >= 0.8 ? 0.003 + localStorm * 0.012 : 0;
      if (!rainCount && !lightningTimer && !thunderChance) {
        if (hadRainOrLightning) ctx.clearRect(0, 0, canvas.width, canvas.height);
        hadRainOrLightning = false;
        dryTimerId = window.setTimeout(render, 100);
        return;
      }
      hadRainOrLightning = true;
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

      ctx.beginPath();
      for (let index = 0; index < rainCount; index += 1) {
        const drop = raindrops[index];
        drop.speedX = windSpeed + 1.5;
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + drop.speedX * 0.6, drop.y + drop.len);

        drop.y += drop.speedY;
        drop.x += drop.speedX;

        if (drop.y > canvas.height) {
          drop.y = -20;
          drop.x = Math.random() * (canvas.width + 300) - 150;
        }
      }
      if (rainCount) ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
      window.clearTimeout(dryTimerId);
    };
  }, [isBattle, strengthBased, flashAboveGround, isPaused]);

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

export default React.memo(StormCanvas);
