import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../game/context/GameContext";
import StormCanvas from "./StormCanvas";
import "../styles/game-world.css";

const getTyphoonCharacter = (intensity) => {
  if (intensity <= 0.2) return ["/typhoon-breeze-cutout.png", "Breeze Typhoon"];
  if (intensity <= 0.5) return ["/typhoon-rain-cutout.png", "Heavy Rain Typhoon"];
  if (intensity <= 0.84) return ["/typhoon-gale-cutout.png", "Gale Typhoon"];
  if (intensity <= 0.94) return ["/typhoon-storm-cutout.png", "Storm Typhoon"];
  return ["/typhoon-super-cutout.png", "Super Typhoon"];
};

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
const MALE_LEFT_WALK_FRAMES = [
  "/left_1.png",
  "/left_idle.png",
  "/left_2.png",
  "/left_idle.png"
];
const FEMALE_RIGHT_WALK_FRAMES = [
  "/woman_right_1.png",
  "/woman_right_idle.png",
  "/woman_right_2.png",
  "/woman_right_idle.png"
];
const FEMALE_LEFT_WALK_FRAMES = [
  "/woman_left_1.png",
  "/woman_left_idle.png",
  "/woman_left_2.png",
  "/woman_left_idle.png"
];
const walkFrameSource = (facing, frame, isMale) => {
  if (facing > 0 && isMale) return MALE_RIGHT_WALK_FRAMES[(frame - 1) % MALE_RIGHT_WALK_FRAMES.length];
  if (facing < 0 && isMale) return MALE_LEFT_WALK_FRAMES[(frame - 1) % MALE_LEFT_WALK_FRAMES.length];
  if (facing > 0) return FEMALE_RIGHT_WALK_FRAMES[(frame - 1) % FEMALE_RIGHT_WALK_FRAMES.length];
  if (facing < 0) return FEMALE_LEFT_WALK_FRAMES[(frame - 1) % FEMALE_LEFT_WALK_FRAMES.length];
  return facing > 0 ? `/right_walk_${frame}-cutout.png` : `/left_walk_${frame}-cutout.png`;
};
const stopFrameSource = (facing, isMale) => {
  if (isMale) return facing > 0 ? "/right_idle.png" : "/left_idle.png";
  return facing > 0 ? "/woman_right_idle.png" : "/woman_left_idle.png";
};

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
      const characterBounds = playerBounds ? {
        left: playerBounds.left + playerBounds.width * 0.18,
        right: playerBounds.right - playerBounds.width * 0.18,
        top: playerBounds.top + playerBounds.height * 0.08,
        bottom: playerBounds.bottom - playerBounds.height * 0.3
      } : null;
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
        const overlapsCharacter = characterBounds &&
          x + halfWidth >= characterBounds.left && x - halfWidth <= characterBounds.right &&
          topY <= characterBounds.bottom && baseY >= characterBounds.top;

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
  const [isTyphoonTransition, setIsTyphoonTransition] = useState(false);
  const [mapLabelKey, setMapLabelKey] = useState(0);
  const [typhoonAppearance, setTyphoonAppearance] = useState(null);
  const [showBossGauge, setShowBossGauge] = useState(false);
  const [bossGaugeCharge, setBossGaugeCharge] = useState(0);
  const [bossGaugeDamage, setBossGaugeDamage] = useState(0);
  const [bossGaugeCharging, setBossGaugeCharging] = useState(false);
  const [adminStrike, setAdminStrike] = useState(false);
  const [battleActive, setBattleActive] = useState(false);
  const mapIndexRef = useRef(1);
  const positionRef = useRef(48);
  const transitionRef = useRef("idle");
  const strikeActiveRef = useRef(false);
  const movementLockedRef = useRef(false);
  const nightIntensityRef = useRef(0);
  const transitionTimers = useRef([]);
  const movementInterval = useRef(null);
  const shiftHeld = useRef(false);
  const showBossGaugeRef = useRef(false);
  showBossGaugeRef.current = showBossGauge;
  positionRef.current = position;
  const grass = useMemo(() => makeGrass(1200), []);

  useEffect(() => {
    const frameSources = [
      "/right_1.png",
      "/right_2.png",
      "/left_1.png",
      "/left_2.png",
      "/left_idle.png",
      ...FEMALE_RIGHT_WALK_FRAMES,
      ...FEMALE_LEFT_WALK_FRAMES,
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
    const frameCount = isMale && facing > 0
      ? MALE_RIGHT_WALK_FRAMES.length
      : isMale && facing < 0
        ? MALE_LEFT_WALK_FRAMES.length
        : facing > 0
          ? FEMALE_RIGHT_WALK_FRAMES.length
          : FEMALE_LEFT_WALK_FRAMES.length;
    setWalkFrame(1);
    const frameTimer = window.setInterval(() => {
      setWalkFrame((frame) => frame % frameCount + 1);
    }, fastWalking ? 220 : 300);
    return () => window.clearInterval(frameTimer);
  }, [moving, fastWalking, facing, isMale]);

  const startMapTransition = (nextMap, entryPosition, onFadeIn, { typhoon = false } = {}) => {
    if (transitionRef.current !== "idle" || nextMap < 0 || nextMap >= HOUSE_LAYOUTS.length) return;
    const fadeDuration = typhoon ? 1200 : 400;
    const loadingDuration = typhoon ? 1200 : 450;
    setIsTyphoonTransition(typhoon);
    setTyphoonAppearance(null);
    setShowBossGauge(false);
    showBossGaugeRef.current = false;
    setBossGaugeCharge(0);
    setBossGaugeDamage(0);
    setBossGaugeCharging(false);
    transitionRef.current = "fade-out";
    setMapTransition("fade-out");
    transitionTimers.current.push(window.setTimeout(() => {
      mapIndexRef.current = nextMap;
      setMapIndex(nextMap);
      positionRef.current = entryPosition;
      setPosition(entryPosition);
      transitionRef.current = "loading";
      setMapTransition("loading");
      transitionTimers.current.push(window.setTimeout(() => {
        transitionRef.current = "fade-in";
        setMapTransition("fade-in");
        setMapLabelKey((key) => key + 1);
        onFadeIn?.();
        transitionTimers.current.push(window.setTimeout(() => {
          transitionRef.current = "idle";
          setMapTransition("idle");
          setIsTyphoonTransition(false);
        }, fadeDuration));
      }, loadingDuration));
    }, fadeDuration));
  };

  const moveMap = (direction) => {
    startMapTransition(mapIndexRef.current + direction, direction > 0 ? 3 : 97);
  };

  useEffect(() => {
    if (!bossGaugeCharging) return undefined;
    let frameId;
    let startedAt;
    let lastUpdate = 0;
    const chargeGauge = (timestamp) => {
      if (startedAt === undefined) startedAt = timestamp;
      const charge = Math.min(100, ((timestamp - startedAt) / 2000) * 100);
      if (timestamp - lastUpdate >= 33 || charge === 100) {
        setBossGaugeCharge(charge);
        lastUpdate = timestamp;
      }
      if (charge < 100) frameId = window.requestAnimationFrame(chargeGauge);
      else setBossGaugeCharging(false);
    };
    frameId = window.requestAnimationFrame(chargeGauge);
    return () => window.cancelAnimationFrame(frameId);
  }, [bossGaugeCharging]);

  useEffect(() => {
    const stopMovement = () => {
      if (movementInterval.current) {
        window.clearInterval(movementInterval.current);
        movementInterval.current = null;
      }
      setMoving(false);
    };

    const moveOneStep = (direction) => {
      if (movementLockedRef.current || transitionRef.current !== "idle") {
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
      if (movementLockedRef.current) {
        if (event.key.toLowerCase() === "d" && !event.repeat && showBossGaugeRef.current) {
          setBossGaugeDamage((damage) => Math.min(100, damage + 10));
        }
        return;
      }
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
  nightIntensityRef.current = nightIntensity;
  const skyDarkness = Math.max(nightIntensity, (weatherInfo.cloudiness || 0) * 0.28);
  const celestialFade = Math.max(nightIntensity, (weatherInfo.cloudiness || 0) * 0.8);
  useEffect(() => {
    setAdminStrike(false);
    if (!weatherInfo.adminForced || approach <= 0) return undefined;

    let strikeTimer;
    const nightWatcher = window.setInterval(() => {
      if (nightIntensityRef.current < 0.99) return;
      window.clearInterval(nightWatcher);
      strikeTimer = window.setTimeout(() => setAdminStrike(true), 10_000);
    }, 100);
    return () => {
      window.clearInterval(nightWatcher);
      if (strikeTimer) window.clearTimeout(strikeTimer);
    };
  }, [weatherInfo.adminForced, weatherInfo.weatherText]);
  const isStrike = weatherInfo.adminForced ? adminStrike : proximityInfo.alertPhase === "strike";
  useEffect(() => {
    if (!isStrike) {
      strikeActiveRef.current = false;
      movementLockedRef.current = false;
      setBattleActive(false);
      setTyphoonAppearance(null);
      setShowBossGauge(false);
      showBossGaugeRef.current = false;
      setBossGaugeCharge(0);
      setBossGaugeDamage(0);
      setBossGaugeCharging(false);
      return;
    }
    if (strikeActiveRef.current) return;
    strikeActiveRef.current = true;
    movementLockedRef.current = true;
    setBattleActive(true);
    if (movementInterval.current) {
      window.clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
    setMoving(false);
    const enterResidentialMap = () => {
      if (!strikeActiveRef.current) return;
      if (transitionRef.current !== "idle") {
        transitionTimers.current.push(window.setTimeout(enterResidentialMap, 100));
        return;
      }
      const [src, name] = getTyphoonCharacter(approach);
      startMapTransition(1, 48, () => setTyphoonAppearance({ src, name }), { typhoon: true });
    };
    enterResidentialMap();
  }, [isStrike]);
  const houses = HOUSE_LAYOUTS[mapIndex];
  const isMapVisible = mapTransition === "idle" || mapTransition === "fade-in";
  const isMapNameVisible = (mapTransition === "idle" || mapTransition === "fade-in") && !battleActive;
  const bossGaugeProgress = Math.max(0, bossGaugeCharge - bossGaugeDamage);

  return (
    <section className={`game-world ${isStrike ? "is-strike" : ""} ${battleActive ? "is-battle-active" : ""} ${isTyphoonTransition ? "is-typhoon-transition" : ""}`} style={{ "--storm-darkness": skyDarkness, "--night-opacity": nightIntensity, "--celestial-opacity": 1 - celestialFade }} aria-label="草原のゲームフィールド">
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
            className={isMale ? "" : "female-character-sprite"}
            src={moving ? walkFrameSource(facing, walkFrame, isMale) : stopFrameSource(facing, isMale)}
            alt={player.appearance?.gender === "feminine" ? "女性剣士" : "男性剣士"}
          />
        </div>
        <Grass blades={grass} playerPosition={position} mapIndex={mapIndex} moving={moving} />
        <StormCanvas strengthBased flashAboveGround />
      </div>
      {isMapNameVisible && <div key={mapLabelKey} className="map-name-indicator" aria-live="polite">{MAP_NAMES[mapIndex]}</div>}
      {(mapTransition === "loading" || mapTransition === "fade-in") && <div className={`map-loading-indicator ${mapTransition === "fade-in" ? "is-fading" : ""}`}>ロード中...</div>}
      {(mapTransition === "fade-out" || mapTransition === "loading") && <div className={`map-transition-curtain ${mapTransition === "fade-out" ? "is-fading-out" : ""}`} aria-hidden="true" />}
      {battleActive && typhoonAppearance && <div className="strike-encounter" aria-label="主人公と台風の対峙">
        <div className="strike-player-position">
          <img src={isMale ? "/player-male-normalized.png" : "/player-female-normalized.png"} alt={isMale ? "男性剣士" : "女性剣士"} />
        </div>
        <div
          key={typhoonAppearance.src}
          className="typhoon-strike-arrival"
          aria-label={`${typhoonAppearance.name}。Dキーで10%ダメージ`}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && event.animationName === "typhoon-strike-enter") {
              setBossGaugeCharge(0);
              setBossGaugeDamage(0);
              showBossGaugeRef.current = true;
              setBossGaugeCharging(true);
              setShowBossGauge(true);
            }
          }}
        >
          <img src={typhoonAppearance.src} alt={typhoonAppearance.name} className="typhoon-strike-character" />
          {showBossGauge && <span className="boss-health-gauge" role="progressbar" aria-label="ボスゲージ" aria-valuemin={0} aria-valuemax={100} aria-valuenow={bossGaugeProgress}>
            <span
              className="boss-health-gauge-fill"
              aria-hidden="true"
              style={{
                width: `${bossGaugeProgress}%`,
                backgroundColor: bossGaugeProgress <= 10 ? "#ef4444" : bossGaugeProgress <= 50 ? "#facc15" : "#a3e635"
              }}
            />
          </span>}
        </div>
      </div>}
    </section>
  );
}
