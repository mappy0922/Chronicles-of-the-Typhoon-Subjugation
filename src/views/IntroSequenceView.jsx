import React, { useState, useEffect, useCallback, useRef } from "react";
import StormCanvas from "../components/StormCanvas";
import "../styles/title-screen.css";

const INTRO_MESSAGES = [
  "本ゲームの無断複製、転載、改変、配布、販売を禁止します",
  "本ゲーム内で台風を撃破しても、現実の世界に影響を与えるものではありません。あらかじめご了承ください"
];

export default function IntroSequenceView({ onComplete }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fadeState, setFadeState] = useState("fade-in");
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let timer;
    if (fadeState === "fade-in") {
      timer = window.setTimeout(() => setFadeState("visible"), 1800);
    } else if (fadeState === "visible") {
      timer = window.setTimeout(() => setFadeState("fade-out"), currentIdx === 0 ? 3600 : 4200);
    } else if (fadeState === "fade-out") {
      timer = window.setTimeout(() => {
        if (currentIdx < INTRO_MESSAGES.length - 1) {
          setCurrentIdx((index) => index + 1);
          setFadeState("fade-in");
        } else if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current?.();
        }
      }, 1800);
    }
    return () => window.clearTimeout(timer);
  }, [fadeState, currentIdx]);

  const handleSkip = useCallback(() => {
    setFadeState((state) => state === "fade-out" ? state : "fade-out");
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleSkip);
    return () => window.removeEventListener("keydown", handleSkip);
  }, [handleSkip]);

  return (
    <div className="intro-sequence-container" onClick={handleSkip}>
      {/* 背景の静かな雨モーション */}
      <StormCanvas isBattle={false} />

      <div className={`intro-text-box ${fadeState}`}>
        {INTRO_MESSAGES[currentIdx]}
      </div>

      <div className="intro-skip-hint">
        CLICK OR PRESS ANY KEY TO ADVANCE
        <span className="intro-source-credit">出典：気象庁ホームページ</span>
      </div>
    </div>
  );
}
