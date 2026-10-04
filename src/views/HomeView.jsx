import React from "react";
import { useGame } from "../game/context/GameContext";
import WeatherRadar from "../components/WeatherRadar";
import { HISTORICAL_TYPHOONS } from "../game/constants/typhoonTypes";
import { PREFECTURES } from "../game/constants/prefectures";

export default function HomeView() {
  const {
    player,
    computedStats,
    activeTyphoon,
    proximityInfo,
    loadTyphoonPreset,
    spawnRandomTyphoon,
    setCurrentView,
    setIsPrefModalOpen
  } = useGame();

  const currentPref = PREFECTURES.find((p) => p.id === player.prefectureId) || PREFECTURES[13];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 上部ステータスグリッド */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {/* プレイヤー情報カード */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <span>👤</span>
              <span>討伐士ステータス</span>
            </div>
            <span className="badge badge-cyan">Lv.{player.level}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-secondary)" }}>HP (体力)</span>
                <span className="stat-val">{player.currentHp} / {computedStats.maxHp}</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill fill-hp"
                  style={{ width: `${(player.currentHp / computedStats.maxHp) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-secondary)" }}>SP (気力)</span>
                <span className="stat-val">{player.currentSp} / {player.maxSp}</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill fill-sp"
                  style={{ width: `${(player.currentSp / player.maxSp) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-secondary)" }}>EXP (経験値)</span>
                <span className="stat-val">{player.exp} / {player.nextExp}</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill fill-exp"
                  style={{ width: `${(player.exp / player.nextExp) * 100}%` }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginTop: "0.5rem", padding: "0.6rem", background: "rgba(0,0,0,0.25)", borderRadius: "10px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>攻撃力</div>
                <div className="stat-val" style={{ color: "var(--accent-red)", fontSize: "1.1rem" }}>{computedStats.atk}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>防御力</div>
                <div className="stat-val" style={{ color: "var(--accent-blue)", fontSize: "1.1rem" }}>{computedStats.def}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>敏捷性</div>
                <div className="stat-val" style={{ color: "var(--accent-cyan)", fontSize: "1.1rem" }}>{computedStats.spd}</div>
              </div>
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              <div>⚔️ 武器: <strong>{player.equippedWeapon.name}</strong></div>
              <div>🥋 防具: <strong>{player.equippedArmor.name}</strong></div>
            </div>
          </div>
        </div>

        {/* 観測・接近状況カード */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <span>📡</span>
              <span>気象観測データ</span>
            </div>
            <span className="badge" style={{ background: proximityInfo.badgeColor, color: "#fff" }}>
              {proximityInfo.warningLevel}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)" }}>迎撃対象</span>
              <span style={{ fontWeight: 800, color: "var(--accent-cyan)", fontSize: "1.05rem" }}>
                {activeTyphoon.name}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)" }}>台風タイプ</span>
              <span className="badge badge-amber">{activeTyphoon.typeInfo.badge}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "0.5rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>中心気圧</div>
                <div className="stat-val" style={{ fontSize: "1.1rem", color: "#f87171" }}>{activeTyphoon.pressure} hPa</div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "0.5rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>最大風速</div>
                <div className="stat-val" style={{ fontSize: "1.1rem", color: "#38bdf8" }}>{activeTyphoon.maxWind} m/s</div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "0.5rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>推定総雨量</div>
                <div className="stat-val" style={{ fontSize: "1.1rem", color: "#60a5fa" }}>{activeTyphoon.rainfall} mm</div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "0.5rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>拠点との距離</div>
                <div className="stat-val" style={{ fontSize: "1.1rem", color: proximityInfo.badgeColor }}>
                  {proximityInfo.distanceKm} km
                </div>
              </div>
            </div>

            {/* クイックアクションボタン */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => setCurrentView("defense")}
              >
                🛡️ 防衛準備へ
              </button>
              <button
                className="btn-danger"
                style={{ flex: 1 }}
                onClick={() => setCurrentView("battle")}
              >
                ⚔️ 迎撃戦闘へ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メイングリッド: レーダーマップ & 台風シミュレーター操作パネル */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem" }}>
        {/* レーダーマップ */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="card-header" style={{ width: "100%" }}>
            <div className="card-title">
              <span>🗾</span>
              <span>全国気象レーダー & 警戒域マップ</span>
            </div>
            <button className="btn-ghost" onClick={() => setIsPrefModalOpen(true)} style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}>
              📍 拠点: {currentPref.name}
            </button>
          </div>

          <WeatherRadar width={480} height={460} interactive={true} />
        </div>

        {/* 台風シミュレーター & 過去データ切り替え */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <span>🕹️</span>
              <span>台風シミュレーター / 歴代台風ロード</span>
            </div>
            <button className="btn-primary" onClick={spawnRandomTyphoon} style={{ fontSize: "0.8rem", padding: "0.35rem 0.8rem" }}>
              🎲 ランダム台風発生
            </button>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            過去に日本を襲来した巨大台風や、様々な気象特性の台風を自由に発生させてシミュレーション検証を行えます。
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {HISTORICAL_TYPHOONS.map((ty) => {
              const isCurrent = activeTyphoon.name.includes(ty.name.split("（")[0]);
              return (
                <div
                  key={ty.id}
                  style={{
                    background: isCurrent ? "rgba(0, 242, 254, 0.12)" : "rgba(255, 255, 255, 0.03)",
                    border: isCurrent ? "1.5px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
                    borderRadius: "12px",
                    padding: "0.9rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>{ty.name}</span>
                    <button
                      className="btn-ghost"
                      onClick={() => loadTyphoonPreset(ty.id)}
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderColor: "var(--accent-cyan)" }}
                    >
                      ロード
                    </button>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{ty.description}</div>
                  <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    <span>気圧: <strong style={{ color: "#f87171" }}>{ty.pressure}hPa</strong></span>
                    <span>最大風速: <strong style={{ color: "#38bdf8" }}>{ty.maxWind}m/s</strong></span>
                    <span>雨量: <strong style={{ color: "#60a5fa" }}>{ty.rainfall}mm</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
