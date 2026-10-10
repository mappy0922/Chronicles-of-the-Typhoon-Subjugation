import React, { useEffect, useState } from "react";
import { useGame } from "../game/context/GameContext";

export default function PauseMenu() {
  const { isInTitleScreen, isInIntroSequence, isInCharacterCreation, manualSave, returnToTitle } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const canPause = !isInTitleScreen && !isInIntroSequence && !isInCharacterCreation;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || !canPause) return;
      event.preventDefault();
      setIsOpen((open) => !open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canPause]);

  if (!canPause || !isOpen) return null;
  const saveAndNotify = () => {
    manualSave();
    setSaved(true);
  };

  return (
    <div className="pause-menu-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
      <section className="pause-menu" role="dialog" aria-modal="true" aria-labelledby="pause-menu-title">
        <h2 id="pause-menu-title">メニュー</h2>
        <button className="btn-primary" onClick={saveAndNotify}>{saved ? "保存しました" : "セーブする"}</button>
        <button className="btn-ghost" onClick={returnToTitle}>タイトルに戻る</button>
        <button className="pause-menu-resume" onClick={() => setIsOpen(false)}>ゲームに戻る（Esc）</button>
      </section>
    </div>
  );
}
