import React, { useRef, useEffect } from "react";
import { useGame } from "../game/context/GameContext";
import { PREFECTURES } from "../game/constants/prefectures";

export default function WeatherRadar({ width = 560, height = 520, interactive = true }) {
  const canvasRef = useRef(null);
  const { player, activeTyphoon, typhoonPos, setTyphoonPos, proximityInfo } = useGame();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. レーダー背景グリッド & 同心円
      ctx.strokeStyle = "rgba(0, 242, 254, 0.08)";
      ctx.lineWidth = 1;
      const cx = width / 2;
      const cy = height / 2;

      for (let r = 60; r < 360; r += 60) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 走査ライン (Radar Sweep)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle * 0.4);
      const sweepGrad = ctx.createLinearGradient(0, 0, 300, 0);
      sweepGrad.addColorStop(0, "rgba(0, 242, 254, 0)");
      sweepGrad.addColorStop(1, "rgba(0, 242, 254, 0.12)");
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 320, 0, Math.PI * 0.25);
      ctx.fill();
      ctx.restore();

      // 2. 日本列島 都道府県プロット
      PREFECTURES.forEach((pref) => {
        const isPlayerPref = pref.id === player.prefectureId;

        // 都道府県ポイント
        ctx.beginPath();
        ctx.arc(pref.x, pref.y, isPlayerPref ? 7 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isPlayerPref ? "#00f2fe" : "rgba(148, 163, 184, 0.4)";
        ctx.fill();

        if (isPlayerPref) {
          // プレイヤー拠点のパルス波
          ctx.beginPath();
          const pulseR = 7 + (Math.sin(angle * 2) + 1) * 6;
          ctx.arc(pref.x, pref.y, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0, 242, 254, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // 拠点名ラベル
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 12px var(--font-main)";
          ctx.fillText(`📍${pref.name} (防衛拠点)`, pref.x + 12, pref.y + 4);
        }
      });

      // 3. 台風の中心・暴風域・渦巻き描画
      const tx = typhoonPos.x;
      const ty = typhoonPos.y;
      const sizeRadius = (activeTyphoon.sizeKm / 600) * 80;

      // 強風域 (外側)
      ctx.beginPath();
      ctx.arc(tx, ty, sizeRadius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239, 68, 68, 0.08)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fill();

      // 暴風域 (内側)
      ctx.beginPath();
      ctx.arc(tx, ty, sizeRadius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239, 68, 68, 0.18)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fill();

      // スパイラル雨雲エコー (回転する渦)
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(-angle);
      for (let i = 0; i < 4; i++) {
        ctx.rotate((Math.PI / 2));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(sizeRadius * 0.5, sizeRadius * 0.2, sizeRadius * 1.2, sizeRadius * 0.8, sizeRadius * 1.4, sizeRadius * 1.3);
        ctx.strokeStyle = i % 2 === 0 ? "rgba(0, 242, 254, 0.6)" : "rgba(244, 63, 94, 0.6)";
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.restore();

      // 台風の目（中心）
      ctx.beginPath();
      ctx.arc(tx, ty, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#ff0055";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 台風情報バブル
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
      ctx.lineWidth = 1;
      const boxW = 160;
      const boxH = 46;
      ctx.fillRect(tx + 14, ty - 23, boxW, boxH);
      ctx.strokeRect(tx + 14, ty - 23, boxW, boxH);

      ctx.fillStyle = "#ff4d6d";
      ctx.font = "bold 11px var(--font-main)";
      ctx.fillText(`🌀 ${activeTyphoon.name}`, tx + 20, ty - 8);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px var(--font-mono)";
      ctx.fillText(`${activeTyphoon.pressure}hPa | 風速${activeTyphoon.maxWind}m/s`, tx + 20, ty + 8);

      // 4. プレイヤー拠点との距離結線
      const playerPref = PREFECTURES.find((p) => p.id === player.prefectureId) || PREFECTURES[13];
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(tx, ty);
      ctx.lineTo(playerPref.x, playerPref.y);
      ctx.strokeStyle = proximityInfo.badgeColor || "rgba(245, 158, 11, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]); // リセット

      // 距離バッジ描画（中間地点）
      const midX = (tx + playerPref.x) / 2;
      const midY = (ty + playerPref.y) / 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(midX - 35, midY - 10, 70, 20);
      ctx.strokeStyle = proximityInfo.badgeColor;
      ctx.strokeRect(midX - 35, midY - 10, 70, 20);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px var(--font-mono)";
      ctx.textAlign = "center";
      ctx.fillText(`${proximityInfo.distanceKm} km`, midX, midY + 4);
      ctx.textAlign = "start"; // リセット

      angle += 0.03;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [width, height, player.prefectureId, activeTyphoon, typhoonPos, proximityInfo]);

  // クリックで台風を任意の位置に移動させてテストできる機能
  const handleCanvasClick = (e) => {
    if (!interactive) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTyphoonPos({ x, y });
  };

  return (
    <div style={{ position: "relative", display: "inline-block", borderRadius: "14px", overflow: "hidden", border: "1px solid var(--border-subtle)", background: "rgba(10, 15, 29, 0.9)" }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        style={{ display: "block", cursor: interactive ? "crosshair" : "default" }}
      />
      {interactive && (
        <div style={{ position: "absolute", bottom: "8px", right: "10px", fontSize: "10px", color: "var(--text-muted)", pointerEvents: "none" }}>
          ※マップをクリックして台風位置を手動操作可能
        </div>
      )}
    </div>
  );
}
