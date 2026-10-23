import React, { useEffect, useState } from "react";
import { useGame } from "../game/context/GameContext";
import { SoundManager } from "../game/services/SoundManager";
import SaveSlotsView from "./SaveSlotsView";

const VOLUME_CONTROLS = [
  ["bgm", "BGM"],
  ["se", "効果音"],
  ["voice", "ボイス"],
  ["ambient", "環境音"],
  ["master", "マスター音量"]
];

export default function PauseMenu() {
  const { isInTitleScreen, isInIntroSequence, isInCharacterCreation, isLoading, isBattleActive, setIsBattleActive, currentView, setCurrentView, returnToTitle, returnWeatherToSunnyAfterCombat, setIsPaused } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState("menu");
  const [showRetireConfirm, setShowRetireConfirm] = useState(false);
  const [volumes, setVolumes] = useState(() => SoundManager.getVolumes());
  const isCombatActive = isBattleActive || currentView === "battle";
  const canPause = !isInTitleScreen && !isInIntroSequence && !isInCharacterCreation && !isLoading;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || !canPause) return;
      event.preventDefault();
      if (showRetireConfirm) {
        setShowRetireConfirm(false);
        return;
      }
      setScreen("menu");
      setIsOpen((open) => {
        setIsPaused(!open);
        return !open;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canPause, showRetireConfirm]);

  useEffect(() => {
    if (!canPause) {
      setIsOpen(false);
      setIsPaused(false);
      setScreen("menu");
    }
  }, [canPause, setIsPaused]);

  const resumeGame = () => {
    setIsOpen(false);
    setIsPaused(false);
  };
  const backToTitle = () => {
    setIsOpen(false);
    setIsPaused(false);
    returnToTitle();
  };

  const confirmRetireBattle = () => {
    setShowRetireConfirm(false);
    setIsOpen(false);
    setIsPaused(false);
    setIsBattleActive(false);
    if (currentView === "battle") setCurrentView("home");
    returnWeatherToSunnyAfterCombat();
  };

  const updateVolume = (channel, value) => {
    const nextValue = Number(value);
    setVolumes((current) => ({ ...current, [channel]: nextValue }));
    SoundManager.setVolume(channel, nextValue);
  };

  if (!canPause || !isOpen) return null;
  if (screen === "slots") return <SaveSlotsView mode="save" onClose={() => setScreen("menu")} />;

  return (
    <div className="pause-menu-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) resumeGame(); }}>
      <section className="pause-menu" role="dialog" aria-modal="true" aria-labelledby="pause-menu-title">
        <h2 id="pause-menu-title">{screen === "volume" ? "音量設定" : "メニュー"}</h2>
        {isCombatActive ? (
          <button className="btn-ghost" onClick={() => setShowRetireConfirm(true)}>リタイヤ</button>
        ) : screen === "menu" ? (
          <>
            <button className="btn-ghost" onClick={() => setScreen("slots")}>セーブする</button>
            <button className="btn-ghost" onClick={() => setScreen("volume")}>音量設定</button>
            <button className="btn-ghost" onClick={backToTitle}>タイトルに戻る</button>
            <button className="pause-menu-resume" onClick={resumeGame}>Esc：ゲームに戻る</button>
          </>
        ) : (
          <>
            <div className="pause-volume-settings" aria-label="音量設定">
              {VOLUME_CONTROLS.map(([channel, label]) => (
                <label className="pause-volume-control" key={channel}>
                  <span>{label}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={volumes[channel]}
                    onChange={(event) => updateVolume(channel, event.target.value)}
                    aria-label={`${label}の音量`}
                  />
                  <output>{volumes[channel]}</output>
                </label>
              ))}
            </div>
            <button className="btn-ghost" onClick={() => setScreen("menu")}>メニューに戻る</button>
          </>
        )}
      </section>
      {showRetireConfirm && (
        <div className="retire-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowRetireConfirm(false); }}>
          <section className="retire-confirm-card" role="dialog" aria-modal="true" aria-labelledby="retire-confirm-title">
            <h3 id="retire-confirm-title">戦闘をリタイヤしますか？</h3>
            <p>戦闘を終了してマップへ戻ります。</p>
            <div>
              <button className="btn-ghost" onClick={confirmRetireBattle}>はい</button>
              <button className="btn-ghost" onClick={() => setShowRetireConfirm(false)}>いいえ</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
