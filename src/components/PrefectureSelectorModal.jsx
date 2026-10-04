import React, { useState } from "react";
import { useGame } from "../game/context/GameContext";
import { PREFECTURES } from "../game/constants/prefectures";

export default function PrefectureSelectorModal() {
  const { player, setPrefecture, isPrefModalOpen, setIsPrefModalOpen } = useGame();
  const [selectedRegion, setSelectedRegion] = useState("関東");

  if (!isPrefModalOpen) return null;

  const regions = ["北海道", "東北", "関東", "中部", "近畿", "中国", "四国", "九州", "沖縄"];

  const handleSelect = (prefId) => {
    setPrefecture(prefId);
    setIsPrefModalOpen(false);
  };

  return (
    <div className="modal-overlay" onClick={() => setIsPrefModalOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div className="card-title">
            <span>🗾</span>
            <span>居住地・防衛拠点の都道府県登録</span>
          </div>
          <button className="btn-ghost" onClick={() => setIsPrefModalOpen(false)} style={{ padding: "0.25rem 0.6rem" }}>
            ✕
          </button>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
          登録した都道府県の気象データや台風の接近状況に連動して、ゲーム内の防衛イベントやボス討伐ミッションが発生します。
        </p>

        {/* 地方タブ */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          {regions.map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className="btn-ghost"
              style={{
                padding: "0.4rem 0.8rem",
                fontSize: "0.85rem",
                borderColor: selectedRegion === reg ? "var(--accent-cyan)" : "var(--border-subtle)",
                color: selectedRegion === reg ? "var(--accent-cyan)" : "var(--text-secondary)",
                background: selectedRegion === reg ? "rgba(0, 242, 254, 0.1)" : "transparent"
              }}
            >
              {reg}
            </button>
          ))}
        </div>

        {/* 都道府県グリッド */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem", maxHeight: "320px", overflowY: "auto", paddingRight: "4px" }}>
          {PREFECTURES.filter((p) => (selectedRegion === "北海道" ? p.region === "北海道" : p.region === selectedRegion)).map((pref) => {
            const isCurrent = player.prefectureId === pref.id;
            return (
              <button
                key={pref.id}
                onClick={() => handleSelect(pref.id)}
                style={{
                  background: isCurrent ? "linear-gradient(135deg, rgba(0,242,254,0.2), rgba(59,130,246,0.2))" : "rgba(255,255,255,0.03)",
                  border: isCurrent ? "1.5px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "0.75rem 0.5rem",
                  color: isCurrent ? "var(--accent-cyan)" : "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{pref.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  台風リスク: x{pref.stormRisk}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
          <button className="btn-primary" onClick={() => setIsPrefModalOpen(false)}>
            確定する
          </button>
        </div>
      </div>
    </div>
  );
}
