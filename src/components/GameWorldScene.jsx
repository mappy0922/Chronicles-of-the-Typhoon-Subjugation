import React, { useEffect, useState } from "react";
import { useGame } from "../game/context/GameContext";
import CharacterPortrait from "./CharacterPortrait";
import StormCanvas from "./StormCanvas";
import "../styles/game-world.css";

export default function GameWorldScene() {
  const { player, proximityInfo } = useGame();
  const [position, setPosition] = useState(48);
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState(1);

  useEffect(() => {
    let stopTimer;
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key.toLowerCase() !== "a" && event.key.toLowerCase() !== "d") return;
      event.preventDefault();
      const direction = event.key.toLowerCase() === "d" ? 1 : -1;
      setFacing(direction);
      setPosition((current) => Math.max(5, Math.min(95, current + direction * 2.5)));
      setMoving(true);
      window.clearTimeout(stopTimer);
      stopTimer = window.setTimeout(() => setMoving(false), 180);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(stopTimer);
    };
  }, []);

  const distance = proximityInfo.distanceKm ?? 800;
  const approach = Math.max(0, Math.min(1, (650 - distance) / 550));
  const isStrike = proximityInfo.alertPhase === "strike";
  const grass = Array.from({ length: 520 }, (_, index) => ({
    left: `${(index * 37.7) % 100}%`,
    height: `${42 + ((index * 17) % 59)}%`,
    lean: `${((index * 13) % 25) - 12}deg`,
    delay: `${-((index * 7) % 20) / 10}s`
  }));
  return (
    <section className={`game-world ${isStrike ? "is-strike" : ""}`} style={{ "--storm-darkness": approach, "--night-opacity": approach, "--celestial-opacity": 1 - approach }} aria-label="草原のゲームフィールド">
      <div className="world-sky" />
      <div className="world-night-shade" />
      <div className="world-sun" />
      <div className="world-cloud world-cloud-one" />
      <div className="world-cloud world-cloud-two" />
      <div className="world-houses" aria-hidden="true">
        <img className="world-house world-house-back house-far-left" src="/natural_house-cutout.png" alt="" />
        <img className="world-house world-house-back house-back-one" src="/romantic_house-cutout.png" alt="" />
        <img className="world-house world-house-back house-back-two" src="/modan_house-cutout.png" alt="" />
        <img className="world-house world-house-back house-far-right" src="/natural_house-cutout.png" alt="" />
        <img className="world-house world-house-natural" src="/natural_house-cutout.png" alt="" />
        <img className="world-house world-house-modern" src="/modan_house-cutout.png" alt="" />
        <img className="world-house world-house-romantic" src="/romantic_house-cutout.png" alt="" />
      </div>
      <div className="world-ground">
        {grass.map((blade, index) => <span key={index} className="world-grass-blade" style={{ left: blade.left, height: blade.height, "--lean": blade.lean, "--sway-delay": blade.delay }} />)}
      </div>
      <div className={`world-player ${moving ? "is-walking" : ""}`} style={{ left: `${position}%`, "--facing": facing }}>
        <CharacterPortrait appearance={player.appearance} size={112} />
      </div>
      <StormCanvas strengthBased flashAboveGround />
    </section>
  );
}
