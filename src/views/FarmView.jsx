import React, { useState } from "react";
import { useGame } from "../game/context/GameContext";
import { CROPS } from "../game/constants/crops";
import { SoundManager } from "../game/services/SoundManager";

export default function FarmView() {
  const {
    player,
    farmPlots,
    plantCrop,
    harvestCrop,
    applyFertilizer,
    defenseActions,
    proximityInfo,
    setCurrentView
  } = useGame();

  const [selectedCropKey, setSelectedCropKey] = useState("rice");
  const [lastActionMsg, setLastActionMsg] = useState("");

  const handlePlant = (plotId) => {
    const success = plantCrop(plotId, selectedCropKey);
    if (success) {
      setLastActionMsg(`区画 #${plotId + 1} に ${CROPS[selectedCropKey].name} の種を植えました！`);
    } else {
      setLastActionMsg("所持金が足りないか、作付けできません。");
    }
  };

  const handleHarvest = (plotId) => {
    const gained = harvestCrop(plotId);
    if (gained > 0) {
      setLastActionMsg(`収穫成功！ 💰 +${gained} G を獲得しました！`);
    }
  };

  const handleFertilize = (plotId) => {
    const success = applyFertilizer(plotId);
    if (success) {
      setLastActionMsg(`区画 #${plotId + 1} に肥料を散布！成長が加速しました。`);
    } else {
      setLastActionMsg("肥料アイテムを所持していません。ショップで購入してください。");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 警報連動アドバイス */}
      {proximityInfo.alertPhase !== "calm" && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid var(--accent-amber)",
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: "var(--accent-amber)" }}>
              ⚠️ 台風接近中！ 農地の緊急対策を推奨
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              未収穫の作物は暴風雨で落果・水没する恐れがあります。「防風ネット」「土のう」の設置、または「早期緊急収穫」を行ってください。
            </div>
          </div>
          <button className="btn-primary" onClick={() => setCurrentView("defense")}>
            🛡️ 防衛資材を設置する
          </button>
        </div>
      )}

      {lastActionMsg && (
        <div style={{ background: "rgba(0, 242, 254, 0.1)", border: "1px solid var(--accent-cyan)", padding: "0.6rem 1rem", borderRadius: "8px", fontSize: "0.9rem", color: "var(--accent-cyan)" }}>
          ✨ {lastActionMsg}
        </div>
      )}

      {/* 作物選択パレット & 防衛状況 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
        {/* 作物種選択カード */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <span>🌱</span>
              <span>作物の種まき選択</span>
            </div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              所持金: <strong className="stat-val" style={{ color: "var(--accent-gold)" }}>{player.money} G</strong>
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            {Object.keys(CROPS).map((cropKey) => {
              const crop = CROPS[cropKey];
              const isSelected = selectedCropKey === cropKey;
              const canAfford = player.money >= crop.seedCost;
              return (
                <button
                  key={cropKey}
                  onClick={() => {
                    SoundManager.playClick();
                    setSelectedCropKey(cropKey);
                  }}
                  style={{
                    background: isSelected ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.03)",
                    border: isSelected ? "1.5px solid var(--accent-green)" : "1px solid var(--border-subtle)",
                    borderRadius: "10px",
                    padding: "0.75rem 0.5rem",
                    textAlign: "left",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                    opacity: canAfford ? 1 : 0.6
                  }}
                >
                  <div style={{ fontSize: "1.25rem", marginBottom: "4px" }}>{crop.icon} {crop.name.split("（")[0]}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    種代: <strong style={{ color: "var(--accent-gold)" }}>{crop.seedCost}G</strong> | 売却: <strong style={{ color: "var(--accent-green)" }}>{crop.baseYield}G</strong>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    成長: {crop.growTime}秒 | 耐風: {Math.round(crop.windResistance * 100)}%
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 農地防衛ステータス */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <span>🛡️</span>
              <span>現在の農地防衛設備</span>
            </div>
            <button className="btn-ghost" onClick={() => setCurrentView("shop")} style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}>
              🛒 資材購入
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
              <div>
                <strong>🕸️ 高耐久防風ネット</strong>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>暴風による落果・倒伏被害を50%カット</div>
              </div>
              <span className={`badge ${defenseActions.windNet ? "badge-green" : "badge-amber"}`}>
                {defenseActions.windNet ? "設置済 (有効)" : "未設置"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
              <div>
                <strong>🧱 大型止水土のう</strong>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>豪雨による冠水・浸水被害を50%カット</div>
              </div>
              <span className={`badge ${defenseActions.sandbag ? "badge-green" : "badge-amber"}`}>
                {defenseActions.sandbag ? "設置済 (有効)" : "未設置"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
              <div>
                <strong>⛽ 強制排水ポンプ</strong>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>線状降水帯の水没死をほぼ完全防御</div>
              </div>
              <span className={`badge ${defenseActions.drainPump ? "badge-green" : "badge-amber"}`}>
                {defenseActions.drainPump ? "稼働中" : "未配備"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 畑グリッド (6区画) */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <span>🌾</span>
            <span>農園フィールド（全6区画）</span>
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            所持肥料: <strong className="stat-val">{player.inventory.fertilizer || 0} 個</strong>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
          {farmPlots.map((plot) => {
            const cropInfo = plot.crop ? CROPS[plot.crop] : null;
            const isReady = plot.stage === "ready";
            const isGrowing = plot.stage === "growing";
            const elapsed = isGrowing ? (Date.now() - plot.plantedAt) / 1000 : 0;
            const progress = isGrowing ? Math.min(100, Math.round((elapsed / plot.growDuration) * 100)) : isReady ? 100 : 0;

            return (
              <div
                key={plot.id}
                style={{
                  background: isReady ? "rgba(16, 185, 129, 0.12)" : isGrowing ? "rgba(245, 158, 11, 0.08)" : "rgba(255, 255, 255, 0.02)",
                  border: isReady ? "1.5px solid var(--accent-green)" : "1px solid var(--border-subtle)",
                  borderRadius: "14px",
                  padding: "1.2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, color: "var(--text-secondary)" }}>区画 #{plot.id + 1}</span>
                  {isReady ? (
                    <span className="badge badge-green">✨ 収穫可能！</span>
                  ) : isGrowing ? (
                    <span className="badge badge-amber">🌱 育成中 ({progress}%)</span>
                  ) : (
                    <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>空き地</span>
                  )}
                </div>

                <div style={{ textAlign: "center", padding: "1rem 0" }}>
                  <div style={{ fontSize: "3rem", filter: isReady ? "drop-shadow(0 0 10px rgba(16,185,129,0.5))" : "none" }}>
                    {isReady ? cropInfo?.icon : isGrowing ? "🌱" : "🟫"}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "4px" }}>
                    {cropInfo ? cropInfo.name : "何も植えられていません"}
                  </div>
                </div>

                {isGrowing && (
                  <div>
                    <div className="progress-bar-container" style={{ marginBottom: "6px" }}>
                      <div className="progress-bar-fill fill-exp" style={{ width: `${progress}%` }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      <span>残り約 {Math.max(0, Math.round(plot.growDuration - elapsed))} 秒</span>
                      <span>完熟時: +{cropInfo.baseYield}G</span>
                    </div>
                  </div>
                )}

                {/* アクションボタン */}
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto" }}>
                  {plot.crop ? (
                    <>
                      <button
                        className={isReady ? "btn-primary" : "btn-ghost"}
                        onClick={() => handleHarvest(plot.id)}
                        style={{ flex: 1, fontSize: "0.85rem", padding: "0.5rem" }}
                      >
                        {isReady ? "🌾 収穫する (満額)" : "⚠️ 早期緊急収穫 (70%)"}
                      </button>
                      {isGrowing && (
                        <button
                          className="btn-ghost"
                          onClick={() => handleFertilize(plot.id)}
                          style={{ fontSize: "0.8rem", padding: "0.5rem" }}
                          title="肥料で成長時間を半分短縮"
                        >
                          🧪 肥料
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      className="btn-primary"
                      onClick={() => handlePlant(plot.id)}
                      style={{ width: "100%", fontSize: "0.85rem", padding: "0.5rem" }}
                    >
                      🌱 {CROPS[selectedCropKey].name.split("（")[0]} を植える ({CROPS[selectedCropKey].seedCost}G)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
