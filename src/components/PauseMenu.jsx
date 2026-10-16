import React, { useEffect, useState } from "react";
import { useGame } from "../game/context/GameContext";
import { SoundManager } from "../game/services/SoundManager";

const VOLUME_CONTROLS = [
  ["bgm", "BGM"],
  ["se", "SE"],
  ["voice", "Voice"],
  ["ambient", "環境音"],
  ["master", "Master Volume"]
];

export default function PauseMenu() {
  const { isInTitleScreen, isInIntroSequence, isInCharacterCreation, manualSave, returnToTitle } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState("menu");
  const [saved, setSaved] = useState(false);
  const [volumes, setVolumes] = useState(() => SoundManager.getVolumes());
  const canPause = !isInTitleScreen && !isInIntroSequence && !isInCharacterCreation;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || !canPause) return;
      event.preventDefault();
      setScreen("menu");
      setIsOpen((open) => !open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canPause]);

  useEffect(() => {
    if (!canPause) {
      setIsOpen(false);
      setScreen("menu");
      setSaved(false);
    }
  }, [canPause]);

  if (!canPause || !isOpen) return null;
  const saveAndNotify = () => {
    manualSave();
    setSaved(true);
  };

  const updateVolume = (channel, value) => {
    const nextValue = Number(value);
    setVolumes((current) => ({ ...current, [channel]: nextValue }));
    SoundManager.setVolume(channel, nextValue);
  };

  return (
    <div className="pause-menu-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
      <section className="pause-menu" role="dialog" aria-modal="true" aria-labelledby="pause-menu-title">
        <h2 id="pause-menu-title">{screen === "volume" ? "音量設定" : "メニュー"}</h2>
        {screen === "menu" ? (
          <>
            <button className="btn-ghost" onClick={saveAndNotify}>{saved ? "保存しました" : "セーブする"}</button>
            <button className="btn-ghost" onClick={() => setScreen("volume")}>音量設定</button>
            <button className="btn-ghost" onClick={returnToTitle}>タイトルに戻る</button>
            <button className="pause-menu-resume" onClick={() => setIsOpen(false)}>ゲームに戻る（Esc）</button>
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
    </div>
  );
}
