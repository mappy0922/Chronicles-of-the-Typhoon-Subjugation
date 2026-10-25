import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../game/context/GameContext";
import StormCanvas from "./StormCanvas";
import "../styles/game-world.css";

const getTyphoonCharacter = (intensity) => {
  if (intensity <= 0.2) return ["/typhoon-breeze-cutout-v4.png", "\u305D\u3088\u98A8\u578B"];
  if (intensity <= 0.5) return ["/typhoon-rain-cutout-v4.png", "\u8C6A\u96E8\u578B"];
  if (intensity <= 0.84) return ["/typhoon-gale-cutout-v4.png", "\u66B4\u98A8\u578B"];
  if (intensity <= 0.94) return ["/typhoon-storm-cutout-v4.png", "\u5D50\u578B"];
  return ["/typhoon-super-cutout-v4.png", "\u8D85\u5927\u578B\u578B"];
};
const getTyphoonType = (intensity) => {
  if (intensity <= 0.2) return "breeze";
  if (intensity <= 0.5) return "rain";
  if (intensity <= 0.84) return "gale";
  if (intensity <= 0.94) return "large";
  return "complex";
};
const BOSS_MAX_HP = { breeze: 1000, rain: 3000, gale: 5000, large: 10000, complex: 20000 };
const FOCUS_TARGETS = [
  { id: "head", label: "\u982d", x: 50, y: 22 },
  { id: "eyes", label: "\u76ee", x: 50, y: 43 },
  { id: "hand", label: "\u624b", x: 76, y: 68 },
  { id: "foot", label: "\u8db3", x: 50, y: 91 }
];
const FOCUS_MARK_OFFSETS = {
  breeze: { eyes: { y: 2 }, foot: { x: 1 } },
  rain: { all: { x: -2, y: 2 } },
  large: { all: { x: -2 } },
  shared: { eyes: { x: -2 }, leftHand: { x: -2 } }
};
const getAdjustedFocusTarget = (targetId, typhoonType, handSide = "right") => {
  const isHand = targetId.startsWith("hand-") || targetId === "hand";
  const selectedHandSide = targetId.startsWith("hand-") ? targetId.slice("hand-".length) : handSide;
  const baseTarget = FOCUS_TARGETS.find((target) => target.id === (isHand ? "hand" : targetId)) || FOCUS_TARGETS[0];
  let x = isHand ? selectedHandSide === "right" ? 76 : 24 : baseTarget.x;
  let y = baseTarget.y;
  const typeOffset = FOCUS_MARK_OFFSETS[typhoonType]?.[baseTarget.id] || FOCUS_MARK_OFFSETS[typhoonType]?.all;
  const sharedOffset = FOCUS_MARK_OFFSETS.shared[baseTarget.id === "hand" && selectedHandSide === "left" ? "leftHand" : baseTarget.id];
  x += (typeOffset?.x || 0) + (sharedOffset?.x || 0);
  y += (typeOffset?.y || 0) + (sharedOffset?.y || 0);

  return {
    ...baseTarget,
    id: isHand ? `hand-${selectedHandSide}` : baseTarget.id,
    label: isHand ? selectedHandSide === "right" ? "\u53f3\u624b" : "\u5de6\u624b" : baseTarget.label,
    x: Math.max(2, Math.min(98, x)),
    y: Math.max(2, Math.min(98, y))
  };
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

function Grass({ blades, playerPosition, mapIndex, moving, paused, windStrength }) {
  const canvasRef = useRef(null);
  const [hiddenIndexes, setHiddenIndexes] = useState(() => new Set());
  const windStrengthRef = useRef(windStrength);
  useEffect(() => {
    windStrengthRef.current = Math.max(0, Math.min(1, Number(windStrength) || 0));
  }, [windStrength]);

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
    if (paused) return undefined;
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
          const force = windStrengthRef.current;
          const phase = (timestamp / (850 - force * 360) + Number.parseFloat(blade.delay)) * Math.PI;
          const gust = Math.sin(timestamp / 1500 + Number.parseFloat(blade.delay) * 2) * force * 4;
          const sway = Math.sin(phase) * (3.5 + force * 8) + 0.5 + force * 20 + gust;
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
  }, [blades, hiddenIndexes, paused]);

  return <canvas ref={canvasRef} className="world-grass-foreground" aria-hidden="true" />;
}

export default function GameWorldScene() {
  const { player, setPlayer, computedStats, proximityInfo, weatherInfo, activeTyphoon, addToEncyclopedia, setLastResult, returnWeatherToSunnyAfterCombat, isPaused, setIsLoading, isBattleActive: battleActive, setIsBattleActive: setBattleActive } = useGame();
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
  const [bossGaugeTrail, setBossGaugeTrail] = useState(0);
  const [bossGaugeCharging, setBossGaugeCharging] = useState(false);
  const [battleCommandsReady, setBattleCommandsReady] = useState(false);
  const [focusTargetIndex, setFocusTargetIndex] = useState(0);
  const [handSide, setHandSide] = useState("right");
  const [focusModifierHeld, setFocusModifierHeld] = useState(false);
  const [battleAction, setBattleAction] = useState(null);
  const [battleActionPulse, setBattleActionPulse] = useState(0);
  const [spRegenProgress, setSpRegenProgress] = useState(0);
  const [bossHitEffect, setBossHitEffect] = useState(null);
  const [bossDefeating, setBossDefeating] = useState(false);
  const [bossFullyDefeated, setBossFullyDefeated] = useState(false);
  const [showVictoryPose, setShowVictoryPose] = useState(false);
  const [adminStrike, setAdminStrike] = useState(false);
  const adminStrikeTimerRef = useRef(null);
  const mapIndexRef = useRef(1);
  const positionRef = useRef(48);
  const transitionRef = useRef("idle");
  const lastMapTransitionWasTyphoonRef = useRef(false);
  const strikeActiveRef = useRef(false);
  const movementLockedRef = useRef(false);
  const nightIntensityRef = useRef(0);
  const transitionTimers = useRef([]);
  const movementInterval = useRef(null);
  const shiftHeld = useRef(false);
  const battleCommandsReadyRef = useRef(false);
  const battleCommandHandlerRef = useRef(null);
  const battleFocusHandlerRef = useRef(null);
  const battleActionTimeoutRef = useRef(null);
  const bossHitTimeoutRef = useRef(null);
  const bossHitCounterRef = useRef(0);
  const bossDefeatedRef = useRef(false);
  const bossGaugeChargeRef = useRef(0);
  const bossGaugeTrailRef = useRef(bossGaugeTrail);
  const spRegenProgressRef = useRef(0);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;
  bossGaugeChargeRef.current = bossGaugeCharge;
  bossGaugeTrailRef.current = bossGaugeTrail;
  positionRef.current = position;
  const bossGaugeProgress = Math.max(0, bossGaugeCharge - bossGaugeDamage);
  const grass = useMemo(() => makeGrass(1200), []);

  const scheduleWhileUnpaused = (callback, delay) => {
    let remaining = delay;
    let lastTick = performance.now();
    let timerId;
    timerId = window.setInterval(() => {
      const now = performance.now();
      if (!pausedRef.current) remaining -= now - lastTick;
      lastTick = now;
      if (remaining <= 0) {
        window.clearInterval(timerId);
        callback();
      }
    }, 25);
    return timerId;
  };

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
    if (!moving || isPaused) return undefined;
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
  }, [moving, fastWalking, facing, isMale, isPaused]);

  const startMapTransition = (nextMap, entryPosition, onFadeIn, { typhoon = false } = {}) => {
    if (transitionRef.current !== "idle" || nextMap < 0 || nextMap >= HOUSE_LAYOUTS.length) return;
    lastMapTransitionWasTyphoonRef.current = typhoon;
    const fadeDuration = typhoon ? 1200 : 400;
    const loadingDuration = typhoon ? 1200 : 450;
    setIsTyphoonTransition(typhoon);
    setTyphoonAppearance(null);
    setShowBossGauge(false);
    setBossGaugeCharge(0);
    setBossGaugeDamage(0);
    setBossGaugeTrail(0);
    setBossGaugeCharging(false);
    setBattleCommandsReady(false);
    battleCommandsReadyRef.current = false;
    setBattleAction(null);
    window.clearInterval(battleActionTimeoutRef.current);
    window.clearInterval(bossHitTimeoutRef.current);
    setBossHitEffect(null);
    transitionRef.current = "fade-out";
    setMapTransition("fade-out");
    transitionTimers.current.push(scheduleWhileUnpaused(() => {
      mapIndexRef.current = nextMap;
      setMapIndex(nextMap);
      positionRef.current = entryPosition;
      setPosition(entryPosition);
      transitionRef.current = "loading";
      setMapTransition("loading");
      transitionTimers.current.push(scheduleWhileUnpaused(() => {
        transitionRef.current = "fade-in";
        setMapTransition("fade-in");
        setMapLabelKey((key) => key + 1);
        onFadeIn?.();
        transitionTimers.current.push(scheduleWhileUnpaused(() => {
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
    if (!bossGaugeCharging || isPaused) return undefined;
    let frameId;
    let startedAt;
    let lastUpdate = 0;
    const chargeGauge = (timestamp) => {
      if (startedAt === undefined) startedAt = timestamp - (bossGaugeChargeRef.current / 100) * 2000;
      const charge = Math.min(100, ((timestamp - startedAt) / 2000) * 100);
      if (timestamp - lastUpdate >= 33 || charge === 100) {
        setBossGaugeCharge(charge);
        if (bossGaugeDamage === 0) setBossGaugeTrail(charge);
        lastUpdate = timestamp;
      }
      if (charge < 100) frameId = window.requestAnimationFrame(chargeGauge);
      else {
        setBossGaugeCharging(false);
        battleCommandsReadyRef.current = true;
        setBattleCommandsReady(true);
      }
    };
    frameId = window.requestAnimationFrame(chargeGauge);
    return () => window.cancelAnimationFrame(frameId);
  }, [bossGaugeCharging, isPaused]);

  useEffect(() => {
    if (isPaused || bossGaugeTrail <= bossGaugeProgress) return undefined;
    let frameId;
    let previousTime;
    let currentTrail = bossGaugeTrailRef.current;
    const easeDamageTrail = (timestamp) => {
      if (previousTime === undefined) previousTime = timestamp;
      const elapsed = timestamp - previousTime;
      previousTime = timestamp;
      const nextTrail = Math.max(bossGaugeProgress, currentTrail - elapsed * 0.075);
      currentTrail = nextTrail;
      bossGaugeTrailRef.current = nextTrail;
      setBossGaugeTrail(nextTrail);
      if (nextTrail > bossGaugeProgress) frameId = window.requestAnimationFrame(easeDamageTrail);
    };
    frameId = window.requestAnimationFrame(easeDamageTrail);
    return () => window.cancelAnimationFrame(frameId);
  }, [bossGaugeProgress, isPaused]);

  useEffect(() => {
    if (isPaused) return undefined;
    if (!battleCommandsReady || player.currentSp >= (player.maxSp || 100)) {
      spRegenProgressRef.current = 0;
      setSpRegenProgress(0);
      return undefined;
    }
    const maxSp = player.maxSp || 100;
    const segmentSize = maxSp / 3;
    let cycleStartedAt = performance.now() - spRegenProgressRef.current * 30_000;
    let lastUpdate = 0;
    let frameId;
    const recharge = (timestamp) => {
      const progress = Math.min(1, (timestamp - cycleStartedAt) / 30_000);
      if (timestamp - lastUpdate >= 1000 / 30 || progress === 1) {
        spRegenProgressRef.current = progress;
        setSpRegenProgress(progress);
        lastUpdate = timestamp;
      }
      if (progress === 1) {
        setPlayer((current) => ({ ...current, currentSp: Math.min(maxSp, current.currentSp + segmentSize) }));
        spRegenProgressRef.current = 0;
        setSpRegenProgress(0);
        return;
      }
      frameId = window.requestAnimationFrame(recharge);
    };
    frameId = window.requestAnimationFrame(recharge);
    return () => window.cancelAnimationFrame(frameId);
  }, [battleCommandsReady, player.currentSp, player.maxSp, setPlayer, isPaused]);

  useEffect(() => () => {
    window.clearInterval(battleActionTimeoutRef.current);
    window.clearInterval(bossHitTimeoutRef.current);
  }, []);

  const moveBattleFocus = (direction) => {
    if (bossDefeatedRef.current) return;
    if (direction === "left" || direction === "right") {
      if (focusTargetIndex === 2) setHandSide(direction);
      return;
    }
    const nextIndex = (focusTargetIndex + direction + FOCUS_TARGETS.length) % FOCUS_TARGETS.length;
    setFocusTargetIndex(nextIndex);
    if (nextIndex === 2) setHandSide("right");
  };
  battleFocusHandlerRef.current = moveBattleFocus;

  const executeBattleCommand = (command) => {
    if (pausedRef.current || !battleCommandsReadyRef.current) return;
    const maxHp = computedStats.maxHp || player.maxHp || 500;
    const maxSp = player.maxSp || 100;
    const spPerSegment = maxSp / 3;
    const availableSp = Math.min(maxSp, player.currentSp + spPerSegment * spRegenProgressRef.current);
    if (command === "heal" && availableSp < spPerSegment) return;
    if (command === "special" && availableSp < maxSp) return;
    setBattleAction(command);
    setBattleActionPulse((pulse) => pulse + 1);
    window.clearInterval(battleActionTimeoutRef.current);
    battleActionTimeoutRef.current = scheduleWhileUnpaused(() => setBattleAction(null), 220);

    const dealBossDamage = (damage, critical) => {
      const damageAsGaugePercent = (damage / bossMaxHp) * 100;
      const actualProgressDamage = Math.min(damageAsGaugePercent, bossGaugeProgress);
      if (actualProgressDamage <= 0) return;
      const actualHpDamage = Math.min(bossCurrentHp, Math.max(1, Math.round((bossMaxHp * actualProgressDamage) / 100)));
      setBossGaugeTrail((currentTrail) => Math.max(currentTrail, bossGaugeProgress));
      const defeatsBoss = damage >= bossCurrentHp;
      setBossGaugeDamage((currentDamage) => Math.min(100, currentDamage + actualProgressDamage));
      bossHitCounterRef.current += 1;
      setBossHitEffect({ id: bossHitCounterRef.current, damage: actualHpDamage, targetId: focusTarget.id, typhoonType: bossType, critical });
      window.clearInterval(bossHitTimeoutRef.current);
      if (defeatsBoss) {
        bossDefeatedRef.current = false;
        setBossDefeating(true);
        battleCommandsReadyRef.current = false;
        setBattleCommandsReady(false);
        setBossGaugeCharging(false);
        setBossGaugeDamage(100);
      } else {
        bossHitTimeoutRef.current = scheduleWhileUnpaused(() => setBossHitEffect(null), 900);
      }
    };

    const attackPower = Math.max(1, Number(player.equippedWeapon?.attack) || 10);
    const attackBoss = (baseDamage) => {
      const focusMultiplier = focusTarget.id === "eyes" ? 2 : 1;
      const critical = Math.random() < 0.05;
      dealBossDamage(baseDamage * focusMultiplier * (critical ? 3 : 1), critical);
    };
    if (command === "fight") attackBoss(attackPower);
    if (command === "guard") return;
    if (command === "heal") {
      setSpRegenProgress(0);
      spRegenProgressRef.current = 0;
      setPlayer((current) => ({
        ...current,
        currentHp: Math.min(maxHp, current.currentHp + Math.round(maxHp * 0.25)),
        currentSp: Math.max(0, availableSp - spPerSegment)
      }));
    }
    if (command === "special") {
      setSpRegenProgress(0);
      spRegenProgressRef.current = 0;
      setPlayer((current) => ({
        ...current,
        currentSp: 0
      }));
      attackBoss(attackPower * 3);
    }
  };
  battleCommandHandlerRef.current = executeBattleCommand;

  useEffect(() => {
    const stopMovement = () => {
      if (movementInterval.current) {
        window.clearInterval(movementInterval.current);
        movementInterval.current = null;
      }
      setMoving(false);
    };

    const moveOneStep = (direction) => {
      if (pausedRef.current || movementLockedRef.current || transitionRef.current !== "idle") {
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
      if (pausedRef.current) return;
      if (event.key === "Shift") {
        shiftHeld.current = true;
        if (movementLockedRef.current) setFocusModifierHeld(true);
        else setFastWalking(true);
        return;
      }
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      const key = event.key.toLowerCase();
      if (movementLockedRef.current) {
        if (event.key.startsWith("Arrow")) {
          event.preventDefault();
          if (event.repeat) return;
          if (event.shiftKey && event.key === "ArrowUp") battleFocusHandlerRef.current?.(-1);
          else if (event.shiftKey && event.key === "ArrowDown") battleFocusHandlerRef.current?.(1);
          else if (event.key === "ArrowLeft") battleFocusHandlerRef.current?.("left");
          else if (event.key === "ArrowRight") battleFocusHandlerRef.current?.("right");
          return;
        }
        if (!battleCommandsReadyRef.current || event.repeat) return;
        const commands = { z: "fight", x: "guard", a: "heal", s: "special" };
        if (!commands[key]) return;
        event.preventDefault();
        battleCommandHandlerRef.current?.(commands[key]);
        return;
      }
      if (key !== "a" && key !== "d") return;
      event.preventDefault();
      shiftHeld.current = event.shiftKey;
      if (event.repeat || transitionRef.current !== "idle") return;
      const direction = key === "d" ? 1 : -1;
      stopMovement();
      setFastWalking(event.shiftKey);
      setMoving(true);
      moveOneStep(direction);
      movementInterval.current = window.setInterval(() => moveOneStep(direction), 100);
    };

    const onKeyUp = (event) => {
      if (event.key === "Shift") {
        shiftHeld.current = false;
        setFocusModifierHeld(false);
        setFastWalking(false);
        return;
      }
      if (event.key.toLowerCase() === "a" || event.key.toLowerCase() === "d") stopMovement();
    };

    const onBlur = () => {
      shiftHeld.current = false;
      setFocusModifierHeld(false);
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
      transitionTimers.current.forEach((timer) => window.clearInterval(timer));
    };
  }, []);

  useEffect(() => {
    if (!isPaused) return;
    if (movementInterval.current) window.clearInterval(movementInterval.current);
    movementInterval.current = null;
    shiftHeld.current = false;
    setFocusModifierHeld(false);
    setFastWalking(false);
    setMoving(false);
  }, [isPaused]);

  useEffect(() => {
    setMapLabelKey((key) => key + 1);
  }, []);

  const approach = Math.max(0, Math.min(1, weatherInfo.stormIntensity || 0));
  const bossType = getTyphoonType(approach);
  const bossMaxHp = BOSS_MAX_HP[bossType];
  const bossCurrentHp = Math.round((bossMaxHp * bossGaugeProgress) / 100);
  const nightIntensity = Math.max(0, Math.min(1, weatherInfo.nightIntensity ?? approach));
  nightIntensityRef.current = nightIntensity;
  const skyDarkness = Math.max(nightIntensity, (weatherInfo.cloudiness || 0) * 0.28);
  const celestialFade = Math.max(nightIntensity, (weatherInfo.cloudiness || 0) * 0.8);
  useEffect(() => {
    setAdminStrike(false);
    if (!weatherInfo.adminForced || weatherInfo.weatherText === "晴れ" || approach <= 0) return undefined;

    let strikeTimer;
    const nightWatcher = window.setInterval(() => {
      if (pausedRef.current) return;
      if (nightIntensityRef.current < 0.99) return;
      window.clearInterval(nightWatcher);
      strikeTimer = scheduleWhileUnpaused(() => {
        adminStrikeTimerRef.current = null;
        setAdminStrike(true);
      }, 10_000);
      adminStrikeTimerRef.current = strikeTimer;
    }, 100);
    return () => {
      window.clearInterval(nightWatcher);
      if (strikeTimer) window.clearInterval(strikeTimer);
      if (adminStrikeTimerRef.current) window.clearInterval(adminStrikeTimerRef.current);
      adminStrikeTimerRef.current = null;
    };
  }, [weatherInfo.adminForced, weatherInfo.weatherText]);
  const isStrike = weatherInfo.adminForced ? adminStrike : proximityInfo.alertPhase === "strike";
  useEffect(() => {
    if (!isStrike) {
      strikeActiveRef.current = false;
      movementLockedRef.current = false;
      transitionTimers.current.forEach((timer) => window.clearInterval(timer));
      transitionTimers.current = [];
      bossDefeatedRef.current = false;
      setFocusTargetIndex(0);
      setHandSide("right");
      setFocusModifierHeld(false);
      setBossDefeating(false);
      setBossFullyDefeated(false);
      setShowVictoryPose(false);
      setBattleActive(false);
      setTyphoonAppearance(null);
      setShowBossGauge(false);
      setBossGaugeCharge(0);
      setBossGaugeDamage(0);
      setBossGaugeTrail(0);
      setBossGaugeCharging(false);
      setBattleCommandsReady(false);
      battleCommandsReadyRef.current = false;
      setBattleAction(null);
      return;
    }
    if (strikeActiveRef.current) return;
    strikeActiveRef.current = true;
    movementLockedRef.current = true;
    bossDefeatedRef.current = false;
    setFocusTargetIndex(0);
    setHandSide("right");
    setFocusModifierHeld(false);
    setBossDefeating(false);
    setBossFullyDefeated(false);
    setShowVictoryPose(false);
    setBattleActive(true);
    if (movementInterval.current) {
      window.clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
    setMoving(false);
    const enterResidentialMap = () => {
      if (!strikeActiveRef.current) return;
      if (transitionRef.current !== "idle") {
        transitionTimers.current.push(scheduleWhileUnpaused(enterResidentialMap, 100));
        return;
      }
      const [src, name] = getTyphoonCharacter(approach);
      startMapTransition(1, 48, () => setTyphoonAppearance({ src, name }), { typhoon: true });
    };
    enterResidentialMap();
  }, [isStrike]);
  useEffect(() => {
    if (battleActive || !strikeActiveRef.current) return;
    strikeActiveRef.current = false;
    movementLockedRef.current = false;
    transitionTimers.current.forEach((timer) => window.clearInterval(timer));
    transitionTimers.current = [];
    setTyphoonAppearance(null);
    setShowBossGauge(false);
    setBossGaugeCharge(0);
    setBossGaugeDamage(0);
    setBossGaugeTrail(0);
    setBossGaugeCharging(false);
    setBattleCommandsReady(false);
    battleCommandsReadyRef.current = false;
    setBattleAction(null);
    setShowVictoryPose(false);
    setBossFullyDefeated(false);
    setMapTransition("idle");
    setIsTyphoonTransition(false);
    if (movementInterval.current) window.clearInterval(movementInterval.current);
    movementInterval.current = null;
    shiftHeld.current = false;
    setFastWalking(false);
    setMoving(false);
  }, [battleActive]);
  const houses = HOUSE_LAYOUTS[mapIndex];
  const isMapVisible = mapTransition === "idle" || mapTransition === "fade-in";
  const isMapNameVisible = (mapTransition === "idle" || mapTransition === "fade-in") && !battleActive && !lastMapTransitionWasTyphoonRef.current;
  useEffect(() => {
    setIsLoading(mapTransition === "loading");
    return () => setIsLoading(false);
  }, [mapTransition, setIsLoading]);
  const playerMaxHp = computedStats.maxHp || player.maxHp || 1;
  const playerHpRatio = Math.max(0, player.currentHp) / playerMaxHp;
  const currentMaxSp = player.maxSp || 100;
  const displayedSp = Math.min(currentMaxSp, player.currentSp + currentMaxSp / 3 * spRegenProgress);
  const focusTarget = getAdjustedFocusTarget(FOCUS_TARGETS[focusTargetIndex]?.id || "head", bossType, handSide);
  const damageTarget = bossHitEffect
    ? getAdjustedFocusTarget(bossHitEffect.targetId, bossHitEffect.typhoonType || bossType, handSide)
    : focusTarget;

  const completeBossDefeat = () => {
    if (bossDefeatedRef.current || !typhoonAppearance) return;
    bossDefeatedRef.current = true;
    const type = getTyphoonType(approach);
    const defeatedAt = Date.now();
    const date = new Date(defeatedAt).toLocaleDateString("ja-JP");
    const defeatedEnemy = {
      id: `history-${defeatedAt}`,
      name: typhoonAppearance.name,
      type,
      maxWind: activeTyphoon?.maxWind || Math.round(15 + approach * 55),
      defenseScore: 100,
      date,
      status: "完全討伐",
      defeatedAt
    };
    addToEncyclopedia(defeatedEnemy);
    setLastResult((previous) => ({ ...(previous || {}), typhoon: defeatedEnemy, victory: true, date, defeatedAt }));
    setBossDefeating(false);
    setBossHitEffect(null);
    setShowBossGauge(false);
    setBossGaugeCharging(false);
    setBossFullyDefeated(true);
    setShowVictoryPose(true);
    const victoryTimer = scheduleWhileUnpaused(() => {
      transitionTimers.current = transitionTimers.current.filter((timer) => timer !== victoryTimer);
      setShowVictoryPose(false);
      setTyphoonAppearance(null);
      strikeActiveRef.current = false;
      movementLockedRef.current = false;
      setBattleActive(false);
      returnWeatherToSunnyAfterCombat();
    }, 1800);
    transitionTimers.current.push(victoryTimer);
  };

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
          <Grass
            blades={grass}
            playerPosition={position}
            mapIndex={mapIndex}
            moving={moving}
            paused={isPaused}
            windStrength={Math.max(weatherInfo.rainIntensity || 0, weatherInfo.stormIntensity || 0)}
          />
        <StormCanvas strengthBased flashAboveGround />
      </div>
      {isMapNameVisible && <div key={mapLabelKey} className="map-name-indicator" aria-live="polite">{MAP_NAMES[mapIndex]}</div>}
      {(mapTransition === "loading" || mapTransition === "fade-in") && <div className={`map-loading-indicator ${mapTransition === "fade-in" ? "is-fading" : ""}`}>ロード中...</div>}
      {(mapTransition === "fade-out" || mapTransition === "loading") && <div className={`map-transition-curtain ${mapTransition === "fade-out" ? "is-fading-out" : ""}`} aria-hidden="true" />}
      {battleActive && typhoonAppearance && <div className="strike-encounter" aria-label="主人公と台風の対峙">
        <div className={`strike-player-position ${showVictoryPose ? "is-victorious" : ""}`}>
          <img
            src={showVictoryPose
              ? isMale ? "/victory-male-cutout.png" : "/victory-female-cutout.png"
              : isMale ? "/player-male-normalized.png" : "/player-female-normalized.png"}
            alt={showVictoryPose ? "勝利ポーズ" : isMale ? "男性剣士" : "女性剣士"}
          />
        </div>
        <div
          key={typhoonAppearance.src}
          className="typhoon-strike-arrival"
          aria-label={typhoonAppearance.name}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && event.animationName === "typhoon-strike-enter") {
              setBossGaugeCharge(0);
              setBossGaugeDamage(0);
              setBossGaugeTrail(0);
              battleCommandsReadyRef.current = false;
              setBattleCommandsReady(false);
              setBattleAction(null);
              setBossGaugeCharging(false);
              setShowBossGauge(true);
            }
          }}
        >
          {!bossFullyDefeated && <div
            key={bossDefeating ? "boss-defeated" : `boss-hit-${bossHitEffect?.id || "idle"}`}
            className={`typhoon-boss-sprite ${bossHitEffect ? "is-hit" : ""} ${bossDefeating ? "is-defeated" : ""}`}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && event.animationName === "boss-defeat-exit") completeBossDefeat();
            }}
          >
            <div className="typhoon-boss-art">
              <img src={typhoonAppearance.src} alt={typhoonAppearance.name} className="typhoon-strike-character" />
              {battleCommandsReady && focusModifierHeld && !bossDefeating && bossHitEffect?.targetId !== focusTarget.id && <span
                className="boss-focus-marker"
                style={{ left: `${focusTarget.x}%`, top: `${focusTarget.y}%` }}
                aria-label={`${focusTarget.label}\u306b\u6ce8\u76ee\u4e2d`}
              ><span className="boss-focus-marker-label">{focusTarget.label}</span></span>}
              {bossHitEffect && <span
                className={`boss-damage-number ${bossHitEffect.critical ? "is-critical" : ""}`}
                style={{ left: `${damageTarget.x}%`, top: `${damageTarget.y}%` }}
                aria-live="polite"
              >{bossHitEffect.critical && <span className="boss-damage-critical">CRITICAL x3</span>}-{bossHitEffect.damage}</span>}
            </div>
          </div>}
          {showBossGauge && <>
            <span className={`boss-character-name ${bossDefeating ? "is-defeated" : ""}`}>{typhoonAppearance.name}</span>
            <span
              className={`boss-health-gauge ${bossDefeating ? "is-defeated" : ""}`}
              role="progressbar"
              aria-label={`${typhoonAppearance.name} HP`}
              aria-valuemin={0}
              aria-valuemax={bossMaxHp}
              aria-valuenow={bossCurrentHp}
              aria-valuetext={`${bossCurrentHp} / ${bossMaxHp}`}
              onAnimationEnd={(event) => {
                if (event.target === event.currentTarget && event.animationName === "boss-gauge-spin-settle") {
                  setBossGaugeCharge(0);
                  setBossGaugeDamage(0);
                  setBossGaugeTrail(0);
                  setBossGaugeCharging(true);
                }
              }}
            >
              <span className="boss-health-gauge-track" aria-hidden="true">
                <span
                  className="boss-health-gauge-fill"
                  style={{
                    width: `${bossGaugeProgress}%`,
                    backgroundColor: bossGaugeProgress <= 10 ? "#ef4444" : bossGaugeProgress <= 50 ? "#facc15" : "#a3e635"
                  }}
                />
                <span
                  className="boss-health-gauge-damage"
                  style={{ left: `${bossGaugeProgress}%`, width: `${Math.max(0, bossGaugeTrail - bossGaugeProgress)}%` }}
                />
              </span>
            </span>
          </>}
        </div>
        {battleCommandsReady && <section className="battle-command-panel" aria-label="Battle commands">
          <div className="battle-focus-hint">{"Shift + \u2191 / \u2193 : \u90e8\u4f4d\u5207\u66ff\u3000\u624b\u306f \u2190 / \u2192"}</div>
          <div className="battle-status-row">
            <div className="battle-player-portrait" aria-hidden="true">
              <img src={isMale ? "/player-male-normalized.png" : "/player-female-normalized.png"} alt="" />
            </div>
            <div className="battle-player-status">
              <div className="battle-hp-line"><span>HP</span><strong style={{ color: playerHpRatio <= 0.1 ? "#ef4444" : playerHpRatio <= 0.5 ? "#facc15" : "#fff" }}>{Math.max(0, player.currentHp)} / {playerMaxHp}</strong></div>
              <div className="battle-sp-line" aria-label={`SP ${Math.floor(displayedSp)} / ${currentMaxSp}`}>
                <span className="battle-sp-label">SP</span>
                <span className="battle-sp-segments">{[0, 1, 2].map((segment) => {
                  const segmentSize = currentMaxSp / 3;
                  const fill = Math.max(0, Math.min(1, (displayedSp - segment * segmentSize) / segmentSize));
                  return <span key={segment} className="battle-sp-segment"><span style={{ width: `${fill * 100}%` }} /></span>;
                })}</span>
              </div>
            </div>
          </div>
          <div className="battle-command-list">
            <button key={`fight-${battleActionPulse}`} className={battleAction === "fight" ? "is-selected" : ""} onClick={() => executeBattleCommand("fight")}><kbd>Z</kbd><span>たたかう</span></button>
            <button key={`guard-${battleActionPulse}`} className={battleAction === "guard" ? "is-selected" : ""} onClick={() => executeBattleCommand("guard")}><kbd>X</kbd><span>まもる</span></button>
            <button key={`heal-${battleActionPulse}`} disabled={displayedSp < currentMaxSp / 3} className={battleAction === "heal" ? "is-selected" : ""} onClick={() => executeBattleCommand("heal")}><kbd>A</kbd><span>回復</span></button>
            <button key={`special-${battleActionPulse}`} disabled={displayedSp < currentMaxSp} className={battleAction === "special" ? "is-selected" : ""} onClick={() => executeBattleCommand("special")}><kbd>S</kbd><span>必殺技</span></button>
          </div>
        </section>}
      </div>}
    </section>
  );
}
