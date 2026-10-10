import React, { useState, useEffect, useCallback } from "react";
import StormCanvas from "../components/StormCanvas";
import "../styles/title-screen.css";

const INTRO_MESSAGES = [
  "本ゲームの無断複製、転載、改変、配布、販売を禁止します",
  "本ゲーム内で台風を撃破しても、現実の世界に影響を与えるものではありません。あらかじめご了承ください"
];

export default function IntroSequenceView({ onComplete }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fadeState, setFadeState] = useState("fade-in"); // "fade-in" | "visible" | "fade-out"

  const advanceSequence = useCallback(() => {
    setFadeState("fade-out");
    setTimeout(() => {
      if (currentIdx < INTRO_MESSAGES.length - 1) {
        setCurrentIdx((prev) => prev + 1);
        setFadeState("fade-in");
      } else {
        onComplete();
      }
    }, 1800); // フェードアウト時間 (1.8秒)
  }, [currentIdx, onComplete]);

  // 自動進行タイマー
  useEffect(() => {
    let displayTimer;
    if (fadeState === "fade-in") {
      // フェードイン完了まで待機 (1.8秒)
      displayTimer = setTimeout(() => {
        setFadeState("visible");
      }, 1800);
    } else if (fadeState === "visible") {
      // 表示維持時間 (第1文: 3.6秒, 第2文: 4.2秒)
      const duration = currentIdx === 0 ? 3600 : 4200;
      displayTimer = setTimeout(() => {
        advanceSequence();
      }, duration);
    }

    return () => clearTimeout(displayTimer);
  }, [fadeState, currentIdx, advanceSequence]);

  // クリックまたはキー入力による早送り
  const handleSkip = () => {
    if (fadeState !== "fade-out") {
      advanceSequence();
    }
  };

  useEffect(() => {
    const handleKeyDown = () => {
      handleSkip();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fadeState, currentIdx]);

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
