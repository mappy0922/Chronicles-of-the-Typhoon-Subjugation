import React from "react";
import { useGame } from "../game/context/GameContext";
import { PREFECTURES } from "../game/constants/prefectures";
import { SoundManager } from "../game/services/SoundManager";
import CharacterPortrait from "./CharacterPortrait";

export default function Navbar() {
  const { player, currentView, setCurrentView } = useGame();
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
        <div className="brand-title" onClick={() => setCurrentView("home")} style={{ cursor: "pointer" }}>
          <span>イラつく台風ぶっ飛ばしゲーム</span>
        </div>

        {/* 登録都道府県バッジ */}
        <div
          className="badge badge-cyan"
          style={{ background: "rgba(0,242,254,0.12)", border: "1px solid var(--accent-cyan)", padding: "0.35rem 0.75rem" }}
          title="登録した都道府県"
        >
          <span>📍 拠点: {currentPref.name}</span>
        </div>
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
        <div className="navbar-player-identity" title={player.name}>
          <CharacterPortrait appearance={player.appearance} size={38} />
          <span>{player.name}</span>
        </div>
        <div className="badge badge-amber" style={{ padding: "0.35rem 0.75rem" }}>
          <span>💰</span>
          <span className="stat-val">{player.money.toLocaleString()} G</span>
        </div>

        <div className="badge badge-green" style={{ padding: "0.35rem 0.75rem" }}>
          <span>⭐ Lv.{player.level}</span>
        </div>

      </div>
    </header>
  );
}
