import React, { useState, useEffect } from "react";
import { useGame } from "../game/context/GameContext";
import CharacterCutout from "../components/CharacterCutout";
import StormCanvas from "../components/StormCanvas";
import "../styles/title-screen.css";

export default function TitleScreenView() {
  const {
    startNewGame,
    continueGame,
    quitGame,
    hasSaveData,
    saveSummary,
    isQuitModalOpen,
    setIsQuitModalOpen
  } = useGame();

  // step: "press_any_key" | "menu"
  const [step, setStep] = useState("press_any_key");
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // 任意のキー入力検知（効果音なしでスッとメニューへ）
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (step === "press_any_key") {
        setStep("menu");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step]);

  // 画面クリック検知（効果音なしでスッとメニューへ）
  const handleStageClick = () => {
    if (step === "press_any_key") {
      setStep("menu");
    }
  };

  const handleNewGameClick = () => {
    if (hasSaveData) {
      setShowConfirmReset(true);
    } else {
      startNewGame();
    }
  };

  const handleConfirmNewGame = () => {
    setShowConfirmReset(false);
    startNewGame();
  };

  return (
    <div className="title-screen-container" onClick={handleStageClick}>
      {/* 暴風雨・天候パーティクル背景 */}
      <StormCanvas isBattle={true} />
      <div className="title-bg-grid" />

      {/* Step 1: タイトル「台風討伐記」から浮かび上がる台風キャラクター ＆ 点滅テキスト */}
      {step === "press_any_key" && (
        <div className="title-hero-center">
          {/* タイトルのすぐ後ろから浮かび上がる5体の台風キャラクター（背景透過・エフェクトなし） */}
          <div className="typhoon-gallery-stage">
            {/* 1. そよ風型 (左端) */}
            <div className="typhoon-char-card char-breeze">
              <CharacterCutout src="/そよ風型.png" alt="そよ風型" className="typhoon-canvas-char" />
            </div>

            {/* 2. 豪雨型 (左内側) */}
            <div className="typhoon-char-card char-rain">
              <CharacterCutout src="/豪雨型.jpg" alt="豪雨型" className="typhoon-canvas-char" />
            </div>

            {/* 3. ★超大型型★ (完全中央・頂点・最大サイズ) */}
            <div className="typhoon-char-card char-super-large">
              <CharacterCutout src="/超大型型.jpg" alt="超大型型" className="typhoon-canvas-char" />
            </div>

            {/* 4. 嵐型 (右内側) */}
            <div className="typhoon-char-card char-storm">
              <CharacterCutout src="/嵐型.jpg" alt="嵐型" className="typhoon-canvas-char" />
            </div>

            {/* 5. 暴風型 (右端) */}
            <div className="typhoon-char-card char-gale">
              <CharacterCutout src="/暴風型.png" alt="暴風型" className="typhoon-canvas-char" />
            </div>
          </div>

          {/* タイトルロゴ（最前面） */}
          <h1 className="title-main-heading">台風討伐記</h1>

          {/* 点滅テキスト */}
          <div className="press-any-key-box">
            <div className="press-any-key-text">PRESS ANY BUTTON TO START</div>
            <div className="press-sub-hint">または画面のどこかをクリック / タップ</div>
          </div>
        </div>
      )}

      {/* Step 2: タイトル消滅後、画面中央に登場するメニュー（アイコン無し） */}
      {step === "menu" && (
        <div className="title-menu-center" onClick={(e) => e.stopPropagation()}>
          {/* 1. New Game */}
          <button
            className="title-menu-btn anim-1"
            onClick={handleNewGameClick}
          >
            <div>NEW GAME</div>
            <div className="title-menu-sub">はじめから</div>
          </button>

          {/* 2. Continue（※手動セーブ記録が存在する場合のみ表示） */}
          {hasSaveData && (
            <button
              className="title-menu-btn anim-2"
              onClick={continueGame}
            >
              <div>CONTINUE</div>
              <div className="title-menu-sub">
                {saveSummary || "前回のセーブから再開"}
              </div>
            </button>
          )}

          {/* 3. Quit Game */}
          <button
            className={`title-menu-btn ${hasSaveData ? "anim-3" : "anim-2"}`}
            onClick={quitGame}
          >
            <div>QUIT GAME</div>
            <div className="title-menu-sub">ゲームを終了する</div>
          </button>
        </div>
      )}

      {/* New Game 上書き確認モーダル */}
      {showConfirmReset && (
        <div className="modal-overlay" onClick={() => setShowConfirmReset(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⚠️</div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem", color: "var(--accent-red)" }}>
              セーブデータの上書き確認
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              以前の手動セーブデータ（{saveSummary}）が存在します。新しいゲームを開始すると、現在のセーブデータは初期化されます。よろしいですか？
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button className="btn-ghost" onClick={() => setShowConfirmReset(false)}>
                キャンセル
              </button>
              <button className="btn-danger" onClick={handleConfirmNewGame}>
                初期化して開始する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ゲーム終了スクリーン（ブラウザでwindow.closeが制限された場合） */}
      {isQuitModalOpen && (
        <div className="quit-screen-modal">
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🌪️</div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: "0.5rem", color: "var(--accent-cyan)" }}>
            ゲームを終了しました
          </h2>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
            ブラウザのタブまたはウィンドウを閉じてください。<br />
            （手動セーブしたデータは安全に保存されています）
          </p>
          <button className="btn-primary" onClick={() => setIsQuitModalOpen(false)}>
            ↩️ タイトル画面へ戻る
          </button>
        </div>
      )}
    </div>
  );
}
