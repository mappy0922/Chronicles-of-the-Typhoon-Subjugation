import React from "react";
import { useGame } from "../game/context/GameContext";
import { HISTORICAL_TYPHOONS } from "../game/constants/typhoonTypes";

export default function EncyclopediaView() {
  const { encyclopedia, loadTyphoonPreset, setCurrentView } = useGame();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <span>📖</span>
            <span>台風アーカイブ & 討伐・防衛図鑑</span>
          </div>
          <span className="badge badge-cyan">記録総数: {encyclopedia.length} 件</span>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          プレイヤーがこれまで迎撃・防衛した台風の記録や、日本の気象観測史に残る歴代の巨大台風データを閲覧できます。
        </p>
      </div>

      {/* プレイヤーの防衛履歴 */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <span>📜</span>
            <span>迎撃・防衛の個人記録</span>
          </div>
        </div>

        {encyclopedia.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
            まだ台風の迎撃記録がありません。台風が接近したら防衛戦に挑みましょう！
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {encyclopedia.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, color: "var(--accent-cyan)" }}>{item.name}</span>
                  <span className="badge badge-green">{item.status}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  記録日: {item.date}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", background: "rgba(0,0,0,0.25)", padding: "0.5rem", borderRadius: "8px" }}>
                  <span>資産守護率:</span>
                  <strong className="stat-val" style={{ color: "var(--accent-gold)" }}>{item.defenseScore}%</strong>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  最大風速: {item.maxWind}m/s | タイプ: {item.type}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 歴代の巨大台風アーカイブ */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <span>🌪️</span>
            <span>日本の歴代巨大台風データ集</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
          {HISTORICAL_TYPHOONS.map((ty) => (
            <div
              key={ty.id}
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <strong style={{ fontSize: "1rem", color: "var(--text-primary)" }}>{ty.name}</strong>
                  <span className="badge badge-amber">{ty.year}</span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                  {ty.description}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", fontSize: "0.78rem", background: "rgba(0,0,0,0.25)", padding: "0.5rem", borderRadius: "8px", marginBottom: "0.75rem" }}>
                  <div>中心気圧: <strong>{ty.pressure} hPa</strong></div>
                  <div>最大風速: <strong>{ty.maxWind} m/s</strong></div>
                  <div>総雨量: <strong>{ty.rainfall} mm</strong></div>
                  <div>強風域: <strong>{ty.sizeKm} km</strong></div>
                </div>
              </div>

              <button
                className="btn-ghost"
                onClick={() => {
                  loadTyphoonPreset(ty.id);
                  setCurrentView("home");
                }}
                style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem" }}
              >
                🌀 この台風をシミュレーターにセット
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
