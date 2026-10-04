import React from "react";
import { GameProvider, useGame } from "./game/context/GameContext";
import Navbar from "./components/Navbar";
import TyphoonAlertBanner from "./components/TyphoonAlertBanner";
import PrefectureSelectorModal from "./components/PrefectureSelectorModal";
import StormCanvas from "./components/StormCanvas";

import HomeView from "./views/HomeView";
import FarmView from "./views/FarmView";
import ArenaView from "./views/ArenaView";
import ShopView from "./views/ShopView";
import DefensePrepView from "./views/DefensePrepView";
import BattleView from "./views/BattleView";
import ResultView from "./views/ResultView";
import EncyclopediaView from "./views/EncyclopediaView";

import "./styles/index.css";

function GameApp() {
  const { currentView } = useGame();

  return (
    <div className="app-container">
      {/* 背景パーティクル（戦闘中以外も天候状態に応じて演出） */}
      {currentView !== "battle" && <StormCanvas isBattle={false} />}

      {/* トップナビゲーション */}
      <Navbar />

      {/* 警報ヘッダーバー */}
      <TyphoonAlertBanner />

      {/* メインビューエリア */}
      <main className="main-content" style={{ zIndex: 10, position: "relative" }}>
        {currentView === "home" && <HomeView />}
        {currentView === "farm" && <FarmView />}
        {currentView === "arena" && <ArenaView />}
        {currentView === "shop" && <ShopView />}
        {currentView === "defense" && <DefensePrepView />}
        {currentView === "battle" && <BattleView />}
        {currentView === "result" && <ResultView />}
        {currentView === "encyclopedia" && <EncyclopediaView />}
      </main>

      {/* 都道府県設定モーダル */}
      <PrefectureSelectorModal />
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameApp />
    </GameProvider>
  );
}