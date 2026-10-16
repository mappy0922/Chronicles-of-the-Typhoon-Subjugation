import React, { useEffect } from "react";
import { SoundManager } from "../game/services/SoundManager";
import { useGame } from "../game/context/GameContext";

export default function AudioControls() {
  const { isInTitleScreen, isInIntroSequence, isInCharacterCreation, weatherInfo } = useGame();

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
    if (isInIntroSequence || isInCharacterCreation) {
      SoundManager.stopRain();
      return;
    }
    const rainIntensity = isInTitleScreen
      ? 0.32
      : weatherInfo.isRaining
        ? weatherInfo.rainIntensity || 0
        : 0;
    SoundManager.setRainIntensity(rainIntensity);
  }, [isInTitleScreen, isInIntroSequence, isInCharacterCreation, weatherInfo.isRaining, weatherInfo.rainIntensity]);

  return null;
}
