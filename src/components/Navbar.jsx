import React from "react";
import { useGame } from "../game/context/GameContext";
import { PREFECTURES } from "../game/constants/prefectures";
import { SoundManager } from "../game/services/SoundManager";

export default function Navbar() {
  const { player, currentView, setCurrentView, setIsPrefModalOpen, returnToTitle } = useGame();
  const currentPref = PREFECTURES.find((p) => p.id === player.prefectureId) || PREFECTURES[13];

  const navItems = [
    { id: "home", label: "司令部", icon: "🏛️" },
    { id: "farm", label: "農場", icon: "🌾" },
    { id: "arena", label: "闘技場", icon: "⚔️" },
    { id: "shop", label: "ショップ", icon: "🛒" },
    { id: "defense", label: "防衛準備", icon: "🛡️" },
    { id: "encyclopedia", label: "台風図鑑", icon: "📖" },
    { id: "save", label: "セーブ", icon: "💾" }
  ];

  return (
    <header className="navbar">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* タイトルへ戻るボタン */}
        <button
          className="btn-ghost"
          onClick={returnToTitle}
          style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem", color: "var(--accent-cyan)", borderColor: "rgba(0, 242, 254, 0.4)" }}
          title="タイトル画面へ戻る"
        >
          <span>タイトルへ</span>
        </button>

        <div className="brand-title" onClick={() => setCurrentView("home")} style={{ cursor: "pointer" }}>
          <span>台風討伐記</span>
        </div>

        {/* 登録都道府県バッジ */}
        <button
          className="badge badge-cyan"
          onClick={() => setIsPrefModalOpen(true)}
          style={{ cursor: "pointer", background: "rgba(0,242,254,0.12)", border: "1px solid var(--accent-cyan)", padding: "0.35rem 0.75rem" }}
          title="クリックして拠点を変更"
        >
          <span>📍 拠点: {currentPref.name}</span>
          <span style={{ fontSize: "10px", opacity: 0.8 }}>[変更]</span>
        </button>
      </div>

      {/* ナビゲーションリンク */}
      <nav className="nav-links">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${currentView === item.id ? "active" : ""}`}
            onClick={() => {
              SoundManager.playClick();
              setCurrentView(item.id);
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* プレイヤーステータス要約 & 音声切替 */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div className="badge badge-amber" style={{ padding: "0.35rem 0.75rem" }}>
          <span>💰</span>
          <span className="stat-val">{player.money.toLocaleString()} G</span>
        </div>

        <div className="badge badge-green" style={{ padding: "0.35rem 0.75rem" }}>
          <span>⭐ Lv.{player.level}</span>
        </div>

        <button
          className="btn-ghost"
          onClick={() => SoundManager.toggleMute()}
          style={{ padding: "0.4rem 0.6rem", borderRadius: "50%", fontSize: "0.9rem" }}
          title="音量切り替え"
        >
          🔊
        </button>
      </div>
    </header>
  );
}
