import React, { useState } from "react";
import { useGame } from "../game/context/GameContext";
import { PREFECTURES } from "../game/constants/prefectures";
import { SoundManager } from "../game/services/SoundManager";

export default function SaveView() {
  const {
    player,
    manualSave,
    lastSavedTime,
    computedStats,
    farmPlots,
    encyclopedia
  } = useGame();

  const [savedSuccess, setSavedSuccess] = useState(false);
  const currentPref = PREFECTURES.find((p) => p.id === player.prefectureId)?.name || "神奈川県";

  const handleSaveClick = () => {
    manualSave();
    SoundManager.playHarvest();
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 4000);
  };

  const activeCropsCount = farmPlots.filter((p) => p.crop).length;

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <span>💾</span>
            <span>記録の書（手動セーブ管理）</span>
          </div>
          <span className="badge badge-cyan">完全手動セーブ方式</span>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
          現在のゲーム進行状況（ステータス、所持金、装備、農地の作付け状態、台風図鑑）を保存します。<br />
          セーブしたデータはブラウザのタブを閉じたり、ゲームを終了（Quit Game）しても、タイトル画面の「CONTINUE」からいつでも再開できます。
        </p>

        {savedSuccess && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)",
              border: "1.5px solid var(--accent-green)",
              borderRadius: "12px",
              padding: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              color: "#34d399",
              fontWeight: 700,
              fontSize: "1rem",
              marginBottom: "1.25rem",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)"
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>✨</span>
            <div>
              <div>セーブが正常に完了しました！</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 400 }}>
                次回以降、タイトル画面の「CONTINUE」からこの地点を再開できます。
              </div>
            </div>
          </div>
        )}

        {/* セーブデータプレビュー */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
            marginBottom: "1.5rem"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.6rem" }}>
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text-primary)" }}>
              👤 {player.name} (Lv.{player.level})
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              最終セーブ: <strong style={{ color: lastSavedTime ? "var(--accent-gold)" : "var(--text-muted)" }}>{lastSavedTime || "未セーブ（新規プレイ中）"}</strong>
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.6rem", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>所持金</div>
              <div className="stat-val" style={{ color: "var(--accent-gold)", fontSize: "1.1rem" }}>{player.money.toLocaleString()} G</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.6rem", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>拠点地域</div>
              <div style={{ fontWeight: 700, color: "var(--accent-cyan)", fontSize: "1rem" }}>{currentPref}</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.6rem", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>装備中武器</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{player.equippedWeapon.name}</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.6rem", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>農地作付け数</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-green)" }}>{activeCropsCount} / 6 区画</div>
            </div>
          </div>
        </div>

        {/* セーブ実行ボタン */}
        <div style={{ textAlign: "center" }}>
          <button
            className="btn-primary"
            onClick={handleSaveClick}
            style={{
              padding: "1rem 3rem",
              fontSize: "1.15rem",
              fontWeight: 900,
              borderRadius: "14px",
              boxShadow: "0 0 30px rgba(0, 242, 254, 0.4)"
            }}
          >
            💾 この地点でセーブする（手動保存）
          </button>
        </div>
      </div>
    </div>
  );
}
