import React, { useEffect, useState } from "react";
import { useGame } from "../game/context/GameContext";
import SaveSlotsView from "./SaveSlotsView";
import SettingsPanel from "./SettingsPanel";

export default function PauseMenu() {
  const { isInTitleScreen, isInIntroSequence, isInCharacterCreation, isLoading, isPaused, isBattleActive, setIsBattleActive, currentView, setCurrentView, setLastResult, returnToTitle, returnWeatherToSunnyAfterCombat, setIsPaused } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState("menu");
  const [showRetireConfirm, setShowRetireConfirm] = useState(false);
  const [showTitleConfirm, setShowTitleConfirm] = useState(false);
  const isCombatActive = isBattleActive || currentView === "battle";
  const canPause = !isInTitleScreen && !isInIntroSequence && !isInCharacterCreation && !isLoading;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || !canPause || (isPaused && !isOpen)) return;
      event.preventDefault();
      if (showRetireConfirm) {
        setShowRetireConfirm(false);
        return;
      }
      if (showTitleConfirm) {
        setShowTitleConfirm(false);
        return;
      }
      if (screen === "settings") {
        setScreen("menu");
        return;
      }
      if (screen === "slots" || screen === "loadSlots") return;
      setScreen("menu");
      setIsOpen((open) => {
        setIsPaused(!open);
        return !open;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canPause, isPaused, isOpen, screen, showRetireConfirm, showTitleConfirm]);

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
    setShowTitleConfirm(false);
    setIsOpen(false);
    setIsPaused(false);
    returnToTitle();
  };

  const confirmRetireBattle = () => {
    setShowRetireConfirm(false);
    setIsOpen(false);
    setIsPaused(false);
    setIsBattleActive(false);
    returnWeatherToSunnyAfterCombat();
    if (currentView === "battle") {
      setLastResult({ combatRewardScreen: true, outcome: "retired", victory: false, expReward: 0, rewardMoney: 0 });
      setCurrentView("result");
    } else {
      window.dispatchEvent(new Event("typhoon-combat-retired"));
    }
  };

  if (!canPause || !isOpen) return null;
  if (screen === "slots" || screen === "loadSlots") {
    return <SaveSlotsView mode={screen === "slots" ? "save" : "load"} onClose={() => setScreen("menu")} />;
  }
  if (screen === "settings") {
    return (
      <div className="settings-screen-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setScreen("menu"); }}>
        <SettingsPanel onClose={() => setScreen("menu")} />
      </div>
    );
  }

  return (
    <div className="pause-menu-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) resumeGame(); }}>
      <section className="pause-menu" role="dialog" aria-modal="true" aria-labelledby="pause-menu-title">
        <>
          <h2 id="pause-menu-title">Menu</h2>
          {isCombatActive ? (
            <button className="btn-ghost" onClick={() => setShowRetireConfirm(true)}>Retire</button>
          ) : (
          <>
            <button className="btn-ghost" onClick={() => setScreen("slots")}>Save</button>
            <button className="btn-ghost" onClick={() => setScreen("loadSlots")}>Load</button>
            <button className="btn-ghost" onClick={() => setScreen("settings")}>Settings</button>
            <button className="btn-ghost" onClick={() => setShowTitleConfirm(true)}>Title</button>
          </>
          )}
        </>
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
      {showTitleConfirm && (
        <div className="title-return-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowTitleConfirm(false); }}>
          <section className="title-return-confirm-card" role="dialog" aria-modal="true" aria-labelledby="title-return-confirm-title">
            <h3 id="title-return-confirm-title">{"\u30bf\u30a4\u30c8\u30eb\u306b\u623b\u308a\u307e\u3059\u304b\uff1f"}</h3>
            <p>{"\u30bb\u30fc\u30d6\u3057\u3066\u3044\u306a\u3044\u5185\u5bb9\u306f\u7834\u68c4\u3055\u308c\u307e\u3059"}</p>
            <div>
              <button className="btn-ghost" onClick={backToTitle}>{"\u306f\u3044"}</button>
              <button className="btn-ghost" onClick={() => setShowTitleConfirm(false)}>{"\u3044\u3044\u3048"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
