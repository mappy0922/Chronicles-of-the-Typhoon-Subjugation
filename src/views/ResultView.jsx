import React, { useEffect } from "react";
import { useGame } from "../game/context/GameContext";
import { SoundManager } from "../game/services/SoundManager";

export default function ResultView() {
  const { lastResult, addMoney, gainExp, setCurrentView } = useGame();

  useEffect(() => {
    SoundManager.playVictory();
  }, []);

  if (!lastResult) {
    return (
      <div className="glass-card" style={{ textAlign: "center", padding: "3rem" }}>
        <h2>戦闘・防衛データがありません</h2>
        <button className="btn-primary" onClick={() => setCurrentView("home")} style={{ marginTop: "1rem" }}>
          司令部へ戻る
        </button>
      </div>
    );
  }

  const {
    defenseScore,
    cropDamageRate,
    buildingDamageRate,
    rank,
    rewardMoney,
    expReward,
    typhoon,
    victory,
    defenseActionsSummary
  } = lastResult;

  const handleClaimAndReturn = () => {
    addMoney(rewardMoney);
    gainExp(expReward);
    SoundManager.playHarvest();
    setCurrentView("home");
  };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* メインスコアバナー */}
      <div
        className="glass-card"
        style={{
          textAlign: "center",
          padding: "2.5rem 1.5rem",
          background: "linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.95) 100%)",
          borderColor: defenseScore >= 80 ? "var(--accent-cyan)" : "var(--accent-amber)",
          boxShadow: defenseScore >= 80 ? "var(--glow-cyan)" : "none"
        }}
      >
        <span className="badge badge-green" style={{ fontSize: "0.85rem", padding: "0.35rem 0.9rem", marginBottom: "0.75rem" }}>
          🌀 {typhoon.name} 通過報告
        </span>

        <h1 style={{ fontSize: "2.2rem", fontWeight: 900, margin: "0.5rem 0", color: "var(--text-primary)" }}>
          今回の台風から <span style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}>{defenseScore}%</span> の資産を守りました！
        </h1>

        <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--accent-gold)", marginTop: "0.5rem" }}>
          防衛評価ランク: 【{rank}】
        </div>

        <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>
          戦闘結果: <strong>{victory ? "🎉 台風完全討伐 (撃退)" : "⚠️ 防衛完了 (台風通過)"}</strong>
        </div>
      </div>

      {/* 被害詳細内訳グリッド */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* 農作物被害 */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <span>🌾</span>
              <span>農作物被害状況</span>
            </div>
            <span className="stat-val" style={{ color: cropDamageRate > 30 ? "#f87171" : "#34d399", fontSize: "1.1rem" }}>
              {cropDamageRate}% 被害
            </span>
          </div>

          <div className="progress-bar-container" style={{ marginBottom: "0.75rem" }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${cropDamageRate}%`,
                background: cropDamageRate > 30 ? "#ef4444" : "#10b981"
              }}
            />
          </div>

          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div>・防風ネット: {defenseActionsSummary.windNetUsed ? "✅ 適用 (-35%)" : "❌ 未設置"}</div>
            <div>・止水土のう: {defenseActionsSummary.sandbagUsed ? "✅ 適用 (-25%)" : "❌ 未設置"}</div>
            <div>・強制排水ポンプ: {defenseActionsSummary.pumpUsed ? "✅ 稼働 (-30%)" : "❌ 未配備"}</div>
          </div>
        </div>

        {/* 建物・施設被害 */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <span>🏘️</span>
              <span>建物・施設被害状況</span>
            </div>
            <span className="stat-val" style={{ color: buildingDamageRate > 30 ? "#f87171" : "#38bdf8", fontSize: "1.1rem" }}>
              {buildingDamageRate}% 被害
            </span>
          </div>

          <div className="progress-bar-container" style={{ marginBottom: "0.75rem" }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${buildingDamageRate}%`,
                background: buildingDamageRate > 30 ? "#ef4444" : "#38bdf8"
              }}
            />
          </div>

          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div>・耐風建物補強: {defenseActionsSummary.reinforceUsed ? "✅ 適用 (-45%)" : "❌ 未補強"}</div>
            <div>・周辺土のう配置: {defenseActionsSummary.sandbagUsed ? "✅ 適用 (-15%)" : "❌ 未設置"}</div>
            <div>・迎撃討伐ボーナス: {victory ? "✅ 最大適用 (-30%)" : "一部適用"}</div>
          </div>
        </div>
      </div>

      {/* 獲得報酬カード */}
      <div className="glass-card" style={{ background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.3)" }}>
        <div className="card-header">
          <div className="card-title">
            <span>🎁</span>
            <span>防災功労賞 & 復興支援金</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "0.5rem 0" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>復興支援金</div>
            <div className="stat-val" style={{ fontSize: "1.6rem", color: "var(--accent-gold)" }}>
              + {rewardMoney.toLocaleString()} G
            </div>
          </div>

          <div style={{ width: "1px", height: "40px", background: "var(--border-subtle)" }} />

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>討伐士経験値</div>
            <div className="stat-val" style={{ fontSize: "1.6rem", color: "var(--accent-cyan)" }}>
              + {expReward.toLocaleString()} EXP
            </div>
          </div>
        </div>
      </div>

      {/* 完了ボタン */}
      <div style={{ textAlign: "center" }}>
        <button
          className="btn-primary"
          onClick={handleClaimAndReturn}
          style={{ padding: "0.9rem 2.5rem", fontSize: "1.1rem", borderRadius: "14px" }}
        >
          ✨ 報酬を受け取って司令部へ帰還
        </button>
      </div>
    </div>
  );
}
