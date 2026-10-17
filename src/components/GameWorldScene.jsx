import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../game/context/GameContext";
import StormCanvas from "./StormCanvas";
import "../styles/game-world.css";

const HOUSE_LAYOUTS = [
  {
    back: [],
    front: []
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
    back: [],
    front: []
  },
  {
    back: [
      ["romantic_house-cutout.png", "-12%", "24%"], ["modan_house-cutout.png", "16%", "22%"],
      ["natural_house-cutout.png", "43%", "25%"], ["romantic_house-cutout.png", "73%", "24%"]
    ],
    front: [
      ["modan_house-cutout.png", "-4%", "27%"], ["natural_house-cutout.png", "25%", "27%"],
      ["romantic_house-cutout.png", "54%", "27%"], ["modan_house-cutout.png", "82%", "27%"]
    ]
  }
];
const MAP_NAMES = ["訓練場", "住宅街", "農場", "商店街"];
const MALE_RIGHT_WALK_FRAMES = [
  "/right_1.png",
  "/right_idle.png",
  "/right_2.png",
  "/right_idle.png"
];
const walkFrameSource = (facing, frame, isMale) => {
  if (facing > 0 && isMale) return MALE_RIGHT_WALK_FRAMES[(frame - 1) % MALE_RIGHT_WALK_FRAMES.length];
  return facing > 0 ? `/right_walk_${frame}-cutout.png` : `/left_walk_${frame}-cutout.png`;
};
const stopFrameSource = (facing) => facing > 0 ? "/right_idle.png" : "/idle-cutout.png";

const grassRandom = (seed) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const makeGrass = (count) => Array.from({ length: count }, (_, index) => {
  const depth = grassRandom(index + 1);
  return {
    left: grassRandom(index + 1201) * 100,
    // Grass higher on the ground plane is farther away, so make it shorter.
    depth,
    height: `${4 + (1 - depth) * (12 + grassRandom(index + 2401) * 11.8)}%`,
    lean: `${grassRandom(index + 3601) * 24 - 12}deg`,
    delay: `${-grassRandom(index + 4801) * 2}s`
  };
});

function Grass({ blades, playerPosition, mapIndex, moving }) {
  const canvasRef = useRef(null);
  const [hiddenIndexes, setHiddenIndexes] = useState(() => new Set());

  useLayoutEffect(() => {
    const updateOverlaps = () => {
      const canvas = canvasRef.current;
      const map = canvas?.closest(".world-map-content");
      if (!canvas || !map) return;

      const grassBounds = canvas.getBoundingClientRect();
      const houseBounds = [...map.querySelectorAll(".world-house")].map((house) => house.getBoundingClientRect());
      const playerBounds = map.querySelector(".world-player")?.getBoundingClientRect();
      const upperBodyBottom = playerBounds ? playerBounds.bottom - playerBounds.height * 0.18 : 0;
      const hidden = new Set();

      blades.forEach((blade, index) => {
        const x = grassBounds.left + (blade.left / 100) * grassBounds.width;
        const baseY = grassBounds.bottom - blade.depth * 0.96 * grassBounds.height;
        const bladeHeight = Math.max(4, (Number.parseFloat(blade.height) / 100) * grassBounds.height);
        const topY = baseY - bladeHeight;
        const halfWidth = Math.max(2, bladeHeight * 0.2);
        const overlapsHouse = houseBounds.some((house) =>
          x + halfWidth >= house.left && x - halfWidth <= house.right &&
          topY <= house.bottom && baseY >= house.top
        );
        const overlapsCharacter = playerBounds &&
          x + halfWidth >= playerBounds.left && x - halfWidth <= playerBounds.right &&
          topY <= upperBodyBottom && baseY >= playerBounds.top;

        if (overlapsHouse || overlapsCharacter) hidden.add(index);
      });

      setHiddenIndexes((previous) => {
        if (previous.size === hidden.size && [...previous].every((index) => hidden.has(index))) return previous;
        return hidden;
      });
    };

    updateOverlaps();
    window.addEventListener("resize", updateOverlaps);
    return () => window.removeEventListener("resize", updateOverlaps);
  }, [blades, playerPosition, mapIndex, moving]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frameId;
    let lastDraw = 0;
    const palette = ["#397f3b", "#478f40", "#579f45", "#68af4a", "#79bd50"];
    const draw = (timestamp) => {
      if (timestamp - lastDraw >= 1000 / 30) {
        lastDraw = timestamp;
        const bounds = canvas.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(bounds.width * pixelRatio));
        const height = Math.max(1, Math.round(bounds.height * pixelRatio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, bounds.width, bounds.height);

        const bladeWidth = Math.max(2, Math.min(4, window.innerWidth * 0.0028));
        blades.forEach((blade, index) => {
          if (hiddenIndexes.has(index)) return;
          const x = (blade.left / 100) * bounds.width;
          const baseY = bounds.height * (1 - blade.depth * 0.96);
          const bladeHeight = Math.max(4, (Number.parseFloat(blade.height) / 100) * bounds.height);
          const sway = Math.sin((timestamp / 850 + Number.parseFloat(blade.delay)) * Math.PI) * 3.5 + 0.5;
          const angle = ((Number.parseFloat(blade.lean) + sway) * Math.PI) / 180;
          const tipX = x + Math.sin(angle) * bladeHeight;
          const tipY = baseY - Math.cos(angle) * bladeHeight;

          context.beginPath();
          context.moveTo(x - bladeWidth / 2, baseY);
          context.quadraticCurveTo(x - bladeWidth * 0.2, baseY - bladeHeight * 0.55, tipX, tipY);
          context.quadraticCurveTo(x + bladeWidth * 0.5, baseY - bladeHeight * 0.48, x + bladeWidth / 2, baseY);
          context.closePath();
          context.fillStyle = palette[Math.min(4, Math.floor((1 - blade.depth) * 5))];
          context.fill();
        });
      }
      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frameId);
  }, [blades, hiddenIndexes]);

  return <canvas ref={canvasRef} className="world-grass-foreground" aria-hidden="true" />;
}

export default function GameWorldScene() {
  const { player, proximityInfo, weatherInfo } = useGame();
  const isMale = player.appearance?.gender !== "feminine";
  const [position, setPosition] = useState(48);
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState(1);
  const [fastWalking, setFastWalking] = useState(false);
  const [walkFrame, setWalkFrame] = useState(1);
  const [mapIndex, setMapIndex] = useState(1);
  const [mapTransition, setMapTransition] = useState("idle");
  const [mapLabelKey, setMapLabelKey] = useState(0);
  const mapIndexRef = useRef(1);
  const positionRef = useRef(48);
  const transitionRef = useRef("idle");
  const transitionTimers = useRef([]);
  const movementInterval = useRef(null);
  const shiftHeld = useRef(false);
  positionRef.current = position;
  const grass = useMemo(() => makeGrass(1200), []);

  useEffect(() => {
    const frameSources = [
      "/right_1.png",
      "/right_2.png",
      ...Array.from({ length: 6 }, (_, index) => `/left_walk_${index + 1}-cutout.png`),
      "/right_idle.png",
      "/idle-cutout.png"
    ];
    frameSources.forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);

  useEffect(() => {
    if (!moving) return undefined;
    const frameCount = isMale && facing > 0 ? MALE_RIGHT_WALK_FRAMES.length : 6;
    setWalkFrame(1);
    const frameTimer = window.setInterval(() => {
      setWalkFrame((frame) => frame % frameCount + 1);
    }, fastWalking ? 220 : 300);
    return () => window.clearInterval(frameTimer);
  }, [moving, fastWalking, facing, isMale]);

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
    const stopMovement = () => {
      if (movementInterval.current) {
        window.clearInterval(movementInterval.current);
        movementInterval.current = null;
      }
      setMoving(false);
    };

    const moveOneStep = (direction) => {
      if (transitionRef.current !== "idle") {
        stopMovement();
        return;
      }
      setFacing(direction);
      const stepSize = shiftHeld.current ? 2.6 : 1.5;
      const nextPosition = Math.max(0, Math.min(100, positionRef.current + direction * stepSize));
      positionRef.current = nextPosition;
      setPosition(nextPosition);
      if (nextPosition === 0 || nextPosition === 100) {
        const mapDirection = nextPosition === 100 ? 1 : -1;
        if (mapIndexRef.current + mapDirection >= 0 && mapIndexRef.current + mapDirection < HOUSE_LAYOUTS.length) {
          stopMovement();
          moveMap(mapDirection);
        }
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Shift") {
        shiftHeld.current = true;
        setFastWalking(true);
        return;
      }
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key.toLowerCase() !== "a" && event.key.toLowerCase() !== "d") return;
      event.preventDefault();
      shiftHeld.current = event.shiftKey;
      if (event.repeat || transitionRef.current !== "idle") return;
      const direction = event.key.toLowerCase() === "d" ? 1 : -1;
      stopMovement();
      setFastWalking(event.shiftKey);
      setMoving(true);
      moveOneStep(direction);
      movementInterval.current = window.setInterval(() => moveOneStep(direction), 100);
    };

    const onKeyUp = (event) => {
      if (event.key === "Shift") {
        shiftHeld.current = false;
        setFastWalking(false);
        return;
      }
      if (event.key.toLowerCase() === "a" || event.key.toLowerCase() === "d") stopMovement();
    };

    const onBlur = () => {
      shiftHeld.current = false;
      setFastWalking(false);
      stopMovement();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      stopMovement();
      transitionTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    setMapLabelKey((key) => key + 1);
  }, []);

  const approach = Math.max(0, Math.min(1, weatherInfo.stormIntensity || 0));
  const nightIntensity = Math.max(0, Math.min(1, weatherInfo.nightIntensity ?? approach));
  const skyDarkness = Math.max(nightIntensity, (weatherInfo.cloudiness || 0) * 0.28);
  const celestialFade = Math.max(nightIntensity, (weatherInfo.cloudiness || 0) * 0.8);
  const isStrike = proximityInfo.alertPhase === "strike";
  const houses = HOUSE_LAYOUTS[mapIndex];
  const isMapVisible = mapTransition === "idle" || mapTransition === "fade-in";
  const isMapNameVisible = mapTransition === "idle" || mapTransition === "fade-in";

  return (
    <section className={`game-world ${isStrike ? "is-strike" : ""}`} style={{ "--storm-darkness": skyDarkness, "--night-opacity": nightIntensity, "--celestial-opacity": 1 - celestialFade }} aria-label="草原のゲームフィールド">
      <div className={`world-map-content ${isMapVisible ? "is-visible" : ""}`}>
        <div className="world-sky" />
        <div className="world-night-shade" />
        <div className="world-sun" />
        <div className="world-houses" aria-hidden="true">
          {houses.back.map(([src, left, width], index) => <img key={`back-${index}`} className="world-house world-house-back" src={`/${src}`} alt="" style={{ left, width }} />)}
          {houses.front.map(([src, left, width], index) => <img key={`front-${index}`} className={`world-house world-house-front ${index === houses.front.length - 1 ? "world-house-front-right" : ""}`} src={`/${src}`} alt="" style={{ left, width }} />)}
        </div>
        <div className="world-ground" />
        <div className={`world-player ${moving ? "is-walking" : ""}`} style={{ left: `${position}%` }}>
          <img
            src={moving ? walkFrameSource(facing, walkFrame, isMale) : stopFrameSource(facing)}
            alt={player.appearance?.gender === "feminine" ? "女性剣士" : "男性剣士"}
          />
        </div>
        <Grass blades={grass} playerPosition={position} mapIndex={mapIndex} moving={moving} />
        <StormCanvas strengthBased flashAboveGround />
      </div>
      {isMapNameVisible && <div key={mapLabelKey} className="map-name-indicator" aria-live="polite">{MAP_NAMES[mapIndex]}</div>}
      {(mapTransition === "loading" || mapTransition === "fade-in") && <div className={`map-loading-indicator ${mapTransition === "fade-in" ? "is-fading" : ""}`}>ロード中...</div>}
    </section>
  );
}
