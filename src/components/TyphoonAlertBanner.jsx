import React from "react";
import { useGame } from "../game/context/GameContext";

export default function TyphoonAlertBanner() {
  const { proximityInfo, weatherInfo, setCurrentView } = useGame();
  const isStrike = proximityInfo.alertPhase === "strike";
  const isPrep = proximityInfo.alertPhase === "prep";

  return (
    <div className={`alert-banner ${isStrike ? "strike" : ""}`}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontSize: "1.25rem" }}>{isStrike ? "🌪️" : isPrep ? "⚠️" : "🌀"}</span>
        <div>
          <span style={{ fontWeight: 800, color: proximityInfo.badgeColor, marginRight: "0.5rem" }}>
            [{proximityInfo.warningLevel}]
          </span>
          <span>{proximityInfo.warningText}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {isStrike && (
          <button className="btn-danger" onClick={() => setCurrentView("battle")} style={{ padding: "0.35rem 0.9rem", fontSize: "0.85rem" }}>
            台風迎撃戦へ
          </button>
        )}
        {isPrep && (
          <button className="btn-primary" onClick={() => setCurrentView("defense")} style={{ padding: "0.35rem 0.9rem", fontSize: "0.85rem" }}>
            防衛準備を行う
          </button>
        )}
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", gap: "0.5rem" }}>
          <span>気象庁予報: <strong>{weatherInfo.weatherText || "取得中"}</strong></span>
          <span>{weatherInfo.distanceKm !== null && weatherInfo.distanceKm <= 600
            ? `台風: ${weatherInfo.typhoonName}（約${weatherInfo.distanceKm}km）`
            : "選択地域に接近する台風はありません"}</span>
        </div>
      </div>
    </div>
  );
}
