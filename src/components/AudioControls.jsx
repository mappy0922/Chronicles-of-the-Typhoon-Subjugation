import React, { useEffect, useState } from "react";
import { SoundManager } from "../game/services/SoundManager";
import { useGame } from "../game/context/GameContext";

export default function AudioControls() {
  const [isMuted, setIsMuted] = useState(SoundManager.isMuted);
  const { isInTitleScreen, isInIntroSequence, isInCharacterCreation, proximityInfo, activeTyphoon } = useGame();

  useEffect(() => {
    const startAmbient = () => SoundManager.startRain();
    window.addEventListener("pointerdown", startAmbient, { once: true });
    window.addEventListener("keydown", startAmbient, { once: true });
    return () => {
      window.removeEventListener("pointerdown", startAmbient);
      window.removeEventListener("keydown", startAmbient);
    };
  }, []);

  useEffect(() => {
    const phaseIntensity = { calm: 0, alert: 0.18, prep: 0.42, strike: 1 }[proximityInfo.alertPhase] || 0;
    const windStrength = Math.max(0, Math.min(1, ((activeTyphoon.maxWind || 20) - 15) / 45));
    const isSilentSequence = isInIntroSequence || isInCharacterCreation;
    const rainIntensity = isSilentSequence
      ? 0
      : isInTitleScreen
        ? 0.32
        : phaseIntensity * (0.25 + windStrength * 0.75);
    SoundManager.setRainIntensity(rainIntensity);
  }, [isInTitleScreen, isInIntroSequence, isInCharacterCreation, proximityInfo.alertPhase, activeTyphoon]);

  const toggleAudio = () => setIsMuted(SoundManager.toggleMute());

  return (
    <button
      type="button"
      className="global-audio-toggle"
      onClick={toggleAudio}
      aria-pressed={!isMuted}
      aria-label={isMuted ? "雨音をオンにする" : "雨音をオフにする"}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4z" />
        {isMuted ? <path d="m16 9 5 6m0-6-5 6" /> : <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>}
      </svg>
    </button>
  );
}
