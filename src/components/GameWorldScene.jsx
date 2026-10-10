import React, { useEffect, useRef, useState } from "react";
import { useGame } from "../game/context/GameContext";
import CharacterPortrait from "./CharacterPortrait";
import StormCanvas from "./StormCanvas";
import "../styles/game-world.css";

const HOUSE_LAYOUTS = [
  {
    back: [
      ["natural_house-cutout.png", "-10%", "28%"], ["romantic_house-cutout.png", "18%", "25%"],
      ["modan_house-cutout.png", "53%", "27%"], ["natural_house-cutout.png", "83%", "28%"]
    ],
    front: [
      ["romantic_house-cutout.png", "-3%", "32%"], ["natural_house-cutout.png", "34%", "29%"],
      ["modan_house-cutout.png", "70%", "32%"]
    ]
  },
  {
    back: [
      ["natural_house-cutout.png", "-9%", "29%"], ["romantic_house-cutout.png", "22%", "27%"],
      ["modan_house-cutout.png", "47%", "27%"], ["natural_house-cutout.png", "80%", "29%"]
    ],
    front: [
      ["natural_house-cutout.png", "2%", "31%"], ["modan_house-cutout.png", "35%", "30%"],
      ["romantic_house-cutout.png", "68%", "31%"]
    ]
  },
  {
    back: [
      ["modan_house-cutout.png", "-12%", "29%"], ["natural_house-cutout.png", "24%", "27%"],
      ["romantic_house-cutout.png", "51%", "25%"], ["modan_house-cutout.png", "84%", "28%"]
    ],
    front: [
      ["modan_house-cutout.png", "1%", "30%"], ["romantic_house-cutout.png", "36%", "32%"],
      ["natural_house-cutout.png", "69%", "30%"]
    ]
  }
];
const MAP_NAMES = ["訓練場", "住宅街", "農場"];

const makeGrass = (count) => Array.from({ length: count }, (_, index) => ({
  left: `${(index * 37.7) % 100}%`,
  height: `${42 + ((index * 17) % 59)}%`,
  lean: `${((index * 13) % 25) - 12}deg`,
  delay: `${-((index * 7) % 20) / 10}s`
}));

function Grass({ blades }) {
  return blades.map((blade, index) => (
    <span key={index} className="world-grass-blade" style={{ left: blade.left, height: blade.height, "--lean": blade.lean, "--sway-delay": blade.delay }} />
  ));
}

export default function GameWorldScene() {
  const { player, proximityInfo, weatherInfo } = useGame();
  const [position, setPosition] = useState(48);
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState(1);
  const [mapIndex, setMapIndex] = useState(1);
  const [mapTransition, setMapTransition] = useState("idle");
  const [mapLabelKey, setMapLabelKey] = useState(0);
  const mapIndexRef = useRef(1);
  const positionRef = useRef(48);
  const transitionRef = useRef("idle");
  const transitionTimers = useRef([]);
  positionRef.current = position;
  const grass = makeGrass(520);

  const moveMap = (direction) => {
    const nextMap = mapIndexRef.current + direction;
    if (transitionRef.current !== "idle" || nextMap < 0 || nextMap >= HOUSE_LAYOUTS.length) return;
    transitionRef.current = "fade-out";
    setMapTransition("fade-out");
    transitionTimers.current.push(window.setTimeout(() => {
      mapIndexRef.current = nextMap;
      setMapIndex(nextMap);
      const entryPosition = direction > 0 ? 3 : 97;
      positionRef.current = entryPosition;
      setPosition(entryPosition);
      transitionRef.current = "loading";
      setMapTransition("loading");
      transitionTimers.current.push(window.setTimeout(() => {
        transitionRef.current = "fade-in";
        setMapTransition("fade-in");
        setMapLabelKey((key) => key + 1);
        transitionTimers.current.push(window.setTimeout(() => {
          transitionRef.current = "idle";
          setMapTransition("idle");
        }, 400));
      }, 450));
    }, 400));
  };

  useEffect(() => {
    let stopTimer;
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key.toLowerCase() !== "a" && event.key.toLowerCase() !== "d") return;
      event.preventDefault();
      if (transitionRef.current !== "idle") return;
      const direction = event.key.toLowerCase() === "d" ? 1 : -1;
      setFacing(direction);
      const nextPosition = Math.max(0, Math.min(100, positionRef.current + direction * 2.5));
      positionRef.current = nextPosition;
      setPosition(nextPosition);
      setMoving(true);
      if (nextPosition === 0 || nextPosition === 100) {
        const mapDirection = nextPosition === 100 ? 1 : -1;
        if (mapIndexRef.current + mapDirection >= 0 && mapIndexRef.current + mapDirection < HOUSE_LAYOUTS.length) {
          moveMap(mapDirection);
        }
      }
      window.clearTimeout(stopTimer);
      stopTimer = window.setTimeout(() => setMoving(false), 180);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(stopTimer);
      transitionTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    setMapLabelKey((key) => key + 1);
  }, []);

  const approach = Math.max(0, Math.min(1, weatherInfo.stormIntensity || 0));
  const skyDarkness = Math.max(approach, (weatherInfo.cloudiness || 0) * 0.28);
  const celestialFade = Math.max(approach, (weatherInfo.cloudiness || 0) * 0.8);
  const isStrike = proximityInfo.alertPhase === "strike";
  const houses = HOUSE_LAYOUTS[mapIndex];
  const isMapVisible = mapTransition === "idle" || mapTransition === "fade-in";
  const isMapNameVisible = mapTransition === "idle" || mapTransition === "fade-in";

  return (
    <section className={`game-world ${isStrike ? "is-strike" : ""}`} style={{ "--storm-darkness": skyDarkness, "--night-opacity": approach, "--celestial-opacity": 1 - celestialFade }} aria-label="草原のゲームフィールド">
      <div className={`world-map-content ${isMapVisible ? "is-visible" : ""}`}>
        <div className="world-sky" />
        <div className="world-night-shade" />
        <div className="world-sun" />
        <div className="world-cloud world-cloud-one" />
        <div className="world-cloud world-cloud-two" />
        <div className="world-houses" aria-hidden="true">
          {houses.back.map(([src, left, width], index) => <img key={`back-${index}`} className="world-house world-house-back" src={`/${src}`} alt="" style={{ left, width }} />)}
          {houses.front.map(([src, left, width], index) => <img key={`front-${index}`} className={`world-house world-house-front ${index === houses.front.length - 1 ? "world-house-front-right" : ""}`} src={`/${src}`} alt="" style={{ left, width }} />)}
        </div>
        <div className="world-ground"><Grass blades={grass} /></div>
        <div className={`world-player ${moving ? "is-walking" : ""}`} style={{ left: `${position}%`, "--facing": facing }}>
          <CharacterPortrait appearance={player.appearance} size={112} />
        </div>
        <StormCanvas strengthBased flashAboveGround />
      </div>
      {isMapNameVisible && <div key={mapLabelKey} className="map-name-indicator" aria-live="polite">{MAP_NAMES[mapIndex]}</div>}
      {(mapTransition === "loading" || mapTransition === "fade-in") && <div className={`map-loading-indicator ${mapTransition === "fade-in" ? "is-fading" : ""}`}>ロード中...</div>}
    </section>
  );
}
