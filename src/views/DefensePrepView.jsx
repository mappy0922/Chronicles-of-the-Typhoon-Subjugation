import React, { useState } from "react";
import { useGame } from "../game/context/GameContext";
import { SoundManager } from "../game/services/SoundManager";

export default function DefensePrepView() {
  const {
    player,
    activeTyphoon,
    proximityInfo,
    defenseActions,
    toggleDefenseAction,
    farmPlots,
    harvestCrop,
    setCurrentView
  } = useGame();

  const [notification, setNotification] = useState("");

  const handleToggle = (key, itemId, name) => {
    const success = toggleDefenseAction(key, itemId);
    if (!success) {
      setNotification(`⚠️ ${name} の資材がインベントリにありません。ショップで購入してください。`);
    } else {
      setNotification(`✅ ${name} の状態を切り替えました。`);
    }
  };

  // 農地の一括早期収穫
  const handleEmergencyHarvestAll = () => {
    let totalYield = 0;
    farmPlots.forEach((plot) => {
      if (plot.crop) {
        totalYield += harvestCrop(plot.id);
      }
    });
    if (totalYield > 0) {
      setNotification(`🌾 緊急一括収穫完了！ 合計 💰 +${totalYield} G を確保し、作物の台風全滅を防ぎました！`);
    } else {
      setNotification("現在、収穫可能な作物は植えられていません。");
    }
  };

  // 推定防御率計算
  let estCropProtection = 30;
  if (defenseActions.windNet) estCropProtection += 30;
  if (defenseActions.sandbag) estCropProtection += 20;
  if (defenseActions.drainPump) estCropProtection += 15;

  let estBuildingProtection = 25;
  if (defenseActions.buildingReinforce) estBuildingProtection += 45;
  if (defenseActions.sandbag) estBuildingProtection += 15;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 警報ヘッダー */}
      <div className="glass-card" style={{ borderColor: proximityInfo.badgeColor }}>
        <div className="card-header">
          <div className="card-title">
            <span>🛡️</span>
            <span>防災防衛作戦本部（台風接近対応フェーズ）</span>
          </div>
          <span className="badge" style={{ background: proximityInfo.badgeColor, color: "#fff" }}>
            {proximityInfo.warningLevel}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--accent-cyan)", marginBottom: "4px" }}>
              襲来中: {activeTyphoon.name}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              タイプ: <strong>{activeTyphoon.typeInfo.name}</strong> | 拠点距離: <strong className="stat-val">{proximityInfo.distanceKm} km</strong>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {activeTyphoon.typeInfo.description}
            </p>
          </div>

          <div style={{ background: "rgba(0,0,0,0.25)", padding: "1rem", borderRadius: "12px" }}>
            <div style={{ fontWeight: 700, marginBottom: "8px", color: "var(--accent-gold)" }}>📊 推定防衛予測レート</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
              <span>農作物防護率:</span>
              <strong style={{ color: "var(--accent-green)" }}>{Math.min(95, estCropProtection)}%</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
              <span>建物施設防護率:</span>
              <strong style={{ color: "var(--accent-cyan)" }}>{Math.min(95, estBuildingProtection)}%</strong>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
              ※迎撃戦闘で台風本体を早期撃破するとさらに防護率が上乗せされます。
            </div>
          </div>
        </div>

        {notification && (
          <div style={{ marginTop: "1rem", background: "rgba(0, 242, 254, 0.12)", border: "1px solid var(--accent-cyan)", padding: "0.6rem 1rem", borderRadius: "8px", color: "var(--accent-cyan)", fontSize: "0.9rem" }}>
            {notification}
          </div>
        )}
      </div>

      {/* 防衛アクション項目一覧 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        {/* 1. 防風ネット */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "2rem" }}>🕸️</span>
              <span className={`badge ${defenseActions.windNet ? "badge-green" : "badge-amber"}`}>
                {defenseActions.windNet ? "設置稼働中" : "未設置"}
              </span>
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>高耐久防風ネットの展開</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              農地全体を強靭なネットで覆い、強風による作物の倒伏や果樹の落果被害を大幅に防ぎます。
            </p>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              所持数: <strong className="stat-val">{player.inventory.wind_net || 0} 個</strong>
            </div>
          </div>

          <button
            className={defenseActions.windNet ? "btn-ghost" : "btn-primary"}
            onClick={() => handleToggle("windNet", "wind_net", "防風ネット")}
            style={{ marginTop: "1rem", justifyContent: "center" }}
          >
            {defenseActions.windNet ? "撤去する" : "ネットを設置する"}
          </button>
        </div>

        {/* 2. 大型止水土のう */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "2rem" }}>🧱</span>
              <span className={`badge ${defenseActions.sandbag ? "badge-green" : "badge-amber"}`}>
                {defenseActions.sandbag ? "配備完了" : "未設置"}
              </span>
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>止水土のうラインの構築</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              住宅や畑の外周に土のうを積み上げ、豪雨・冠水による浸水被害を食い止めます。
            </p>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              所持数: <strong className="stat-val">{player.inventory.sandbag || 0} 個</strong>
            </div>
          </div>

          <button
            className={defenseActions.sandbag ? "btn-ghost" : "btn-primary"}
            onClick={() => handleToggle("sandbag", "sandbag", "止水土のう")}
            style={{ marginTop: "1rem", justifyContent: "center" }}
          >
            {defenseActions.sandbag ? "土のうを撤去" : "土のうを積む"}
          </button>
        </div>

        {/* 3. 建物補強 */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "2rem" }}>🛠️</span>
              <span className={`badge ${defenseActions.buildingReinforce ? "badge-green" : "badge-amber"}`}>
                {defenseActions.buildingReinforce ? "補強完了" : "未補強"}
              </span>
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>建物の耐風金具・飛散防止補強</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              窓ガラスの飛散防止板の設置と屋根・外壁の固定を行い、建物被害を最小限に抑えます。
            </p>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              所持数: <strong className="stat-val">{player.inventory.building_reinforce || 0} 個</strong>
            </div>
          </div>

          <button
            className={defenseActions.buildingReinforce ? "btn-ghost" : "btn-primary"}
            onClick={() => handleToggle("buildingReinforce", "building_reinforce", "建物補強")}
            style={{ marginTop: "1rem", justifyContent: "center" }}
          >
            {defenseActions.buildingReinforce ? "補強を解除" : "建物を補強する"}
          </button>
        </div>

        {/* 4. 緊急一括収穫 */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "2rem" }}>⚡</span>
              <span className="badge badge-cyan">即時実行アクション</span>
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>農作物の緊急一括早期収穫</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              生育中の全作物を即時刈り取り、直撃による全滅リスクを回避します（売却額は70%）。
            </p>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              作付け中区画: {farmPlots.filter((p) => p.crop).length} / 6
            </div>
          </div>

          <button
            className="btn-danger"
            onClick={handleEmergencyHarvestAll}
            style={{ marginTop: "1rem", justifyContent: "center" }}
          >
            🌾 一括緊急収穫を実行
          </button>
        </div>
      </div>

      {/* 出撃アクションフッター */}
      <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(90deg, rgba(15,23,42,0.9), rgba(30,41,59,0.9))" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>防衛体制の準備は整いましたか？</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            準備を完了したら、台風の中心核を迎撃し、さらなる被害を食い止めましょう！
          </div>
        </div>
        <button
          className="btn-danger"
          onClick={() => {
            SoundManager.playAlert();
            setCurrentView("battle");
          }}
          style={{ padding: "0.85rem 1.75rem", fontSize: "1rem" }}
        >
          ⚔️ 台風迎撃戦闘へ出撃！
        </button>
      </div>
    </div>
  );
}
