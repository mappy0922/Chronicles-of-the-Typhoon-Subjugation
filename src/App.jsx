import React from "react";
import { GameProvider, useGame } from "./game/context/GameContext";
import Navbar from "./components/Navbar";
import TyphoonAlertBanner from "./components/TyphoonAlertBanner";
import PrefectureSelectorModal from "./components/PrefectureSelectorModal";
import StormCanvas from "./components/StormCanvas";

import TitleScreenView from "./views/TitleScreenView";
import IntroSequenceView from "./views/IntroSequenceView";
import HomeView from "./views/HomeView";
import FarmView from "./views/FarmView";
import ArenaView from "./views/ArenaView";
import ShopView from "./views/ShopView";
import DefensePrepView from "./views/DefensePrepView";
import BattleView from "./views/BattleView";
import ResultView from "./views/ResultView";
import EncyclopediaView from "./views/EncyclopediaView";
import SaveView from "./views/SaveView";
import CharacterCreationView from "./views/CharacterCreationView";
import AudioControls from "./components/AudioControls";
import PauseMenu from "./components/PauseMenu";
import GameWorldScene from "./components/GameWorldScene";

import "./styles/index.css";
import "./styles/title-screen.css";

function GameApp() {
  const { currentView, isInTitleScreen, isInIntroSequence, isInCharacterCreation, finishIntroSequence } = useGame();

  // 1. タイトル画面表示中
  if (isInTitleScreen) {
    return <TitleScreenView />;
  }

  // 2. New Game 選択時の導入メッセージシーケンス中
  if (isInIntroSequence) {
    return <IntroSequenceView onComplete={finishIntroSequence} />;
  }

  if (isInCharacterCreation) {
    return <CharacterCreationView />;
  }

  if (currentView === "home") {
    return <GameWorldScene />;
  }

  // 3. ゲーム本編画面
  return (
    <div className="app-container">
      {/* 背景パーティクル */}
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
        {currentView === "save" && <SaveView />}
      </main>

      {/* 都道府県設定モーダル */}
      <PrefectureSelectorModal />
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AudioControls />
      <GameApp />
      <PauseMenu />
    </GameProvider>
  );
}
