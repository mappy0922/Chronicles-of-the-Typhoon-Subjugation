import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../game/context/GameContext";
import StormCanvas from "./StormCanvas";
import VictoryRewardView from "./VictoryRewardView";
import { formatKeyBinding, getBindingKeys, getKeyBindings, getPrimaryBinding, matchesKeyBinding } from "../game/services/KeyBindings";
import "../styles/game-world.css";

const getTyphoonCharacter = (intensity) => {
  if (intensity <= 0.2) return ["/typhoon-breeze-cutout-v4.png", "\u305D\u3088\u98A8\u578B"];
  if (intensity <= 0.5) return ["/typhoon-rain-cutout-v4.png", "\u8C6A\u96E8\u578B"];
  if (intensity <= 0.84) return ["/typhoon-gale-cutout-v5.png", "\u66B4\u98A8\u578B"];
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
const BATTLE_JUMP_ATTACK_POSITION = 64;
const BATTLE_JUMP_TRIGGER_RANGE = 15;
const BATTLE_JUMP_TARGET_STANDOFF = 6;
const BATTLE_JUMP_LUNGE_DURATION = 180;
const BATTLE_JUMP_LANDING_DURATION = 100;
const BATTLE_AIR_LUNGE_GAP_PX = 32;
const BATTLE_AIR_LUNGE_STEP_PERCENT = 2;
const BATTLE_AIR_LUNGE_DECAY = 0.7;
const BATTLE_TARGET_HIT_RANGE = 0.16;
const BATTLE_FOOT_HIT_RANGE_PERCENT = 17;
const BATTLE_ATTACK_FRAME_INTERVAL = 150;
const BATTLE_ATTACK_MASH_WINDOW = 280;
const SPECIAL_CHARGE_DURATION = 300_000;
const FOCUS_TARGETS = [
  { id: "head", label: "\u982d", x: 50, y: 22 },
  { id: "eyes", label: "\u76ee", x: 50, y: 43 },
  { id: "hand", label: "\u624b", x: 76, y: 68 },
  { id: "foot", label: "\u8db3", x: 50, y: 91 }
];
const EYE_BARRIER_CELLS = [
  [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
  [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10],
  [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9], [2, 10],
  [3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8]
];
const EYE_BARRIER_WIDTHS = { breeze: "36%", rain: "42%", gale: "38%", large: "46%", complex: "42%" };
const FOCUS_MARK_OFFSETS = {
  breeze: { eyes: { x: -5, y: 13 }, foot: { x: 6 } },
  rain: { all: { x: -2, y: 2 }, eyes: { x: -14, y: 5 }, rightHand: { x: 4, y: -4 } },
  large: { all: { x: -2 }, eyes: { x: -6 }, rightHand: { x: 6 } },
  complex: { eyes: { x: -10 }, rightHand: { y: -6 }, leftHand: { x: -6 } },
  shared: { eyes: { x: -2 }, leftHand: { x: -2 } }
};
const getAdjustedFocusTarget = (targetId, typhoonType, handSide = "right") => {
  const isHand = targetId.startsWith("hand-") || targetId === "hand";
  const selectedHandSide = targetId.startsWith("hand-") ? targetId.slice("hand-".length) : handSide;
  const baseTarget = FOCUS_TARGETS.find((target) => target.id === (isHand ? "hand" : targetId)) || FOCUS_TARGETS[0];
  let x = isHand ? selectedHandSide === "right" ? 76 : 24 : baseTarget.x;
  let y = baseTarget.y;
  const typeOffsetKey = isHand ? selectedHandSide === "right" ? "rightHand" : "leftHand" : baseTarget.id;
  const typeOffset = FOCUS_MARK_OFFSETS[typhoonType]?.[typeOffsetKey] || FOCUS_MARK_OFFSETS[typhoonType]?.[baseTarget.id] || FOCUS_MARK_OFFSETS[typhoonType]?.all;
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
const orientBossTarget = (target, flipped) => flipped ? { ...target, x: 100 - target.x } : target;

const EdgeShadedImage = React.memo(function EdgeShadedImage({ src, alt = "", className = "", wrapperClassName = "", style }) {
  return (
    <span className={`edge-shade-wrap ${wrapperClassName}`.trim()} style={style}>
      <img src={src} alt={alt} className={className} />
      <img src={src} alt="" aria-hidden="true" className="edge-shade-overlay" />
    </span>
  );
}, (previous, next) => previous.src === next.src
  && previous.alt === next.alt
  && previous.className === next.className
  && previous.wrapperClassName === next.wrapperClassName
  && previous.style?.left === next.style?.left
  && previous.style?.width === next.style?.width);

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
const MAP_NAMES = ["\u8A13\u7DF4\u5834", "\u4F4F\u5B85\u8857", "\u8FB2\u5834", "\u5546\u5E97\u8857"];
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
const MALE_BATTLE_RIGHT_WALK_FRAMES = [
  "/right_man_battle1.png",
  "/right_man_battle_idle.png",
  "/right_man_battle2.png",
  "/right_man_battle_idle.png"
];
const MALE_BATTLE_LEFT_WALK_FRAMES = [
  "/left_man_battle1.png",
  "/left_man_battle_idle.png",
  "/left_man_battle2.png",
  "/left_man_battle_idle.png"
];
const FEMALE_BATTLE_RIGHT_WALK_FRAMES = [
  "/right_woman_battle1.png",
  "/right_woman_battle_idle.png",
  "/right_woman_battle2.png",
  "/right_woman_battle_idle.png"
];
const FEMALE_BATTLE_LEFT_WALK_FRAMES = [
  "/left_woman_battle1.png",
  "/left_woman_battle_idle.png",
  "/left_woman_battle2.png",
  "/left_woman_battle_idle.png"
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
    left: grassRandom(index + 1201),
    // Grass higher on the ground plane is farther away, so make it shorter.
    depth,
    height: (4 + (1 - depth) * (12 + grassRandom(index + 2401) * 11.8)) / 100,
    lean: (grassRandom(index + 3601) * 24 - 12) * Math.PI / 180,
    delay: -grassRandom(index + 4801) * 2,
    colorIndex: Math.min(4, Math.floor((1 - depth) * 5))
  };
});

const Grass = React.memo(function Grass({ blades, playerPosition, mapIndex, moving, paused, windStrength }) {
  const canvasRef = useRef(null);
  const windStrengthRef = useRef(windStrength);
  const hiddenIndexesRef = useRef(new Set());
  windStrengthRef.current = Math.max(0, Math.min(1, Number(windStrength) || 0));

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
        const x = grassBounds.left + blade.left * grassBounds.width;
        const baseY = grassBounds.bottom - blade.depth * 0.96 * grassBounds.height;
        const bladeHeight = Math.max(4, blade.height * grassBounds.height);
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

      hiddenIndexesRef.current = hidden;
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
    let boundsWidth = 0;
    let boundsHeight = 0;
    let pixelRatio = 1;
    let bladeWidth = 2;
    const palette = ["#397f3b", "#478f40", "#579f45", "#68af4a", "#79bd50"];
    const bladesByColor = palette.map(() => []);
    blades.forEach((blade, index) => bladesByColor[blade.colorIndex].push(index));
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      boundsWidth = bounds.width;
      boundsHeight = bounds.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(boundsWidth * pixelRatio));
      const height = Math.max(1, Math.round(boundsHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      bladeWidth = Math.max(2, Math.min(4, window.innerWidth * 0.0028));
    };
    resize();
    window.addEventListener("resize", resize);
    const draw = (timestamp) => {
      if (timestamp - lastDraw >= 1000 / 30) {
        lastDraw = timestamp;
        context.clearRect(0, 0, boundsWidth, boundsHeight);
        const force = windStrengthRef.current;
        const phaseRate = 1 / (850 - force * 360);
        for (let colorIndex = 0; colorIndex < bladesByColor.length; colorIndex += 1) {
          context.beginPath();
          for (const index of bladesByColor[colorIndex]) {
            if (hiddenIndexesRef.current.has(index)) continue;
            const blade = blades[index];
            const x = blade.left * boundsWidth;
            const baseY = boundsHeight * (1 - blade.depth * 0.96);
            const bladeHeight = Math.max(4, blade.height * boundsHeight);
            const phase = (timestamp * phaseRate + blade.delay) * Math.PI;
            const gust = Math.sin(timestamp / 1500 + blade.delay * 2) * force * 4;
            const sway = Math.sin(phase) * (3.5 + force * 8) + 0.5 + force * 20 + gust;
            const angle = blade.lean + (sway * Math.PI) / 180;
            const tipX = x + Math.sin(angle) * bladeHeight;
            const tipY = baseY - Math.cos(angle) * bladeHeight;

            context.moveTo(x - bladeWidth / 2, baseY);
            context.quadraticCurveTo(x - bladeWidth * 0.2, baseY - bladeHeight * 0.55, tipX, tipY);
            context.quadraticCurveTo(x + bladeWidth * 0.5, baseY - bladeHeight * 0.48, x + bladeWidth / 2, baseY);
            context.closePath();
          }
          context.fillStyle = palette[colorIndex];
          context.fill();
        }
      }
      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [blades, paused]);

  return <canvas ref={canvasRef} className="world-grass-foreground" aria-hidden="true" />;
});

export default function GameWorldScene() {
  const { player, setPlayer, gainExp, addMoney, setIsPaused, computedStats, proximityInfo, weatherInfo, activeTyphoon, addToEncyclopedia, setLastResult, returnWeatherToSunnyAfterCombat, isPaused, setIsLoading, isBattleActive: battleActive, setIsBattleActive: setBattleActive } = useGame();
  const [keyBindings, setKeyBindings] = useState(getKeyBindings);
  const isMale = player.appearance?.gender !== "feminine";
  const battleActiveRef = useRef(battleActive);
  battleActiveRef.current = battleActive;

  useEffect(() => {
    const syncBindings = (event) => setKeyBindings(event.detail || getKeyBindings());
    window.addEventListener("typhoon-key-bindings-changed", syncBindings);
    return () => window.removeEventListener("typhoon-key-bindings-changed", syncBindings);
  }, []);
  const [position, setPosition] = useState(48);
  const [battlePlayerLeft, setBattlePlayerLeft] = useState(24);
  const [battlePlayerHasMoved, setBattlePlayerHasMoved] = useState(false);
  const [battleJumpActive, setBattleJumpActive] = useState(false);
  const [battleJumpFlipped, setBattleJumpFlipped] = useState(false);
  const [battleJumpTargetTop, setBattleJumpTargetTop] = useState(null);
  const [battleAttackFrame, setBattleAttackFrame] = useState(null);
  const [battleJumpAttackFrame, setBattleJumpAttackFrame] = useState(null);
  const [battleAttackFlipped, setBattleAttackFlipped] = useState(false);
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState(1);
  const [fastWalking, setFastWalking] = useState(false);
  const [walkFrame, setWalkFrame] = useState(1);
  const [mapIndex, setMapIndex] = useState(1);
  const [mapTransition, setMapTransition] = useState("idle");
  const [isTyphoonTransition, setIsTyphoonTransition] = useState(false);
  const [mapLabelKey, setMapLabelKey] = useState(0);
  const [typhoonAppearance, setTyphoonAppearance] = useState(null);
  const [bossFlipped, setBossFlipped] = useState(false);
  const [bossHorizontalOffset, setBossHorizontalOffset] = useState(0);
  const [eyeBarrierPhase, setEyeBarrierPhaseValue] = useState("inactive");
  const [eyeBarrierRevealOrder, setEyeBarrierRevealOrder] = useState(() => EYE_BARRIER_CELLS.map((_, index) => index));
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
  const [specialChargeProgress, setSpecialChargeProgress] = useState(0);
  const [specialChargeCycle, setSpecialChargeCycle] = useState(0);
  const [bossHitEffect, setBossHitEffect] = useState(null);
  const [bossDefeating, setBossDefeating] = useState(false);
  const [bossFullyDefeated, setBossFullyDefeated] = useState(false);
  const [victoryReward, setVictoryReward] = useState(null);
  const [adminStrike, setAdminStrike] = useState(false);
  const adminStrikeTimerRef = useRef(null);
  const mapIndexRef = useRef(1);
  const positionRef = useRef(48);
  const battlePlayerLeftRef = useRef(24);
  const battleFacingRef = useRef(facing);
  battleFacingRef.current = facing;
  const bossHorizontalOffsetRef = useRef(0);
  const bossMovementTimeoutRef = useRef(null);
  const bossMovementInProgressRef = useRef(false);
  const eyeBarrierPhaseRef = useRef("inactive");
  const eyesBarrierActivatedRef = useRef(false);
  const eyeBarrierRevealCheckRef = useRef(null);
  const freezeBattlePlayerRef = useRef(null);
  const battleJumpActiveRef = useRef(battleJumpActive);
  const battleAttackPhaseRef = useRef("none");
  const battleAttackFrameTimerRef = useRef(null);
  const battleJumpAttackFrameTimerRef = useRef(null);
  const battleJumpAttackMashRemainingRef = useRef(0);
  const battleJumpAttackHasRepeatedRef = useRef(false);
  const battleJumpAttackFrameIndexRef = useRef(0);
  const battleJumpAttackReadyRef = useRef(false);
  const battleAirLungeCountRef = useRef(0);
  const battleJumpAttackConnectedRef = useRef(false);
  const battleJumpAttackTargetRef = useRef(null);
  const battleJumpAttackBossFlippedRef = useRef(false);
  const battleJumpAttackFocusedRef = useRef(false);
  const battleJumpAttackHitRef = useRef(null);
  const battleAttackMashRemainingRef = useRef(0);
  const battleAttackHasRepeatedRef = useRef(false);
  const battleAttackFrameIndexRef = useRef(0);
  const battleFootAttackTimerActiveRef = useRef(false);
  const battleJumpUsesMashAttackRef = useRef(false);
  const battleJumpGroundTopRef = useRef(null);
  const finishBattleJumpRef = useRef(null);
  const stopGroundedFootAttackRef = useRef(null);
  const battleGroundedRef = useRef(true);
  const changeJumpAttackFrame = (frame) => {
    setBattleJumpAttackFrame(frame);
    if (frame === 2) {
      lungeTowardBossForAirSwing();
      battleJumpAttackHitRef.current?.();
    }
    if (frame === 3 && battleJumpAttackHasRepeatedRef.current) {
      battleJumpAttackHitRef.current?.();
    }
  };
  const lungeTowardBossForAirSwing = () => {
    if (!battleJumpActiveRef.current || battleAttackPhaseRef.current !== "attack"
      || !battleJumpAttackReadyRef.current || pausedRef.current) return;
    const encounterBounds = document.querySelector(".strike-encounter")?.getBoundingClientRect();
    const bossBounds = document.querySelector(".typhoon-boss-art")?.getBoundingClientRect();
    const targetId = battleJumpAttackTargetRef.current;
    if (!encounterBounds || !bossBounds || encounterBounds.width <= 0 || !targetId || targetId === "foot") return;

    const target = orientBossTarget(getAdjustedFocusTarget(targetId, bossType, handSide), bossFlippedRef.current);
    const targetX = bossBounds.left + (target.x / 100) * bossBounds.width;
    const playerX = encounterBounds.left + (battlePlayerLeftRef.current / 100) * encounterBounds.width;
    const horizontalGap = targetX - playerX;
    const attackRange = Math.max(BATTLE_AIR_LUNGE_GAP_PX, bossBounds.width * BATTLE_TARGET_HIT_RANGE);
    if (Math.abs(horizontalGap) <= attackRange) return;

    const direction = battleFacingRef.current;
    if (direction === 0) return;
    const stepPercent = BATTLE_AIR_LUNGE_STEP_PERCENT * Math.pow(BATTLE_AIR_LUNGE_DECAY, battleAirLungeCountRef.current);
    const nextLeft = Math.max(0, Math.min(100, battlePlayerLeftRef.current + direction * stepPercent));
    if (nextLeft === battlePlayerLeftRef.current) return;
    battleAirLungeCountRef.current += 1;
    battlePlayerLeftRef.current = nextLeft;
    setBattlePlayerLeft(nextLeft);
  };
  const resetJumpAttackFrames = () => {
    setBattleJumpAttackFrame(null);
  };
  const transitionRef = useRef("idle");
  const lastMapTransitionWasTyphoonRef = useRef(false);
  const strikeActiveRef = useRef(false);
  const movementLockedRef = useRef(false);
  const nightIntensityRef = useRef(0);
  const transitionTimers = useRef([]);
  const movementInterval = useRef(null);
  const shiftHeld = useRef(false);
  const focusModeRef = useRef(false);
  const setFocusMode = (enabled) => {
    focusModeRef.current = enabled;
    setFocusModifierHeld(enabled);
  };
  const battleCommandsReadyRef = useRef(false);
  const battleCommandHandlerRef = useRef(null);
  const battleFocusHandlerRef = useRef(null);
  const bossFlippedRef = useRef(bossFlipped);
  const battleActionTimeoutRef = useRef(null);
  const bossHitTimeoutRef = useRef(null);
  const bossHitCounterRef = useRef(0);
  const bossDefeatedRef = useRef(false);
  const bossGaugeChargeRef = useRef(0);
  const bossGaugeDamageRef = useRef(bossGaugeDamage);
  const bossGaugeTrailRef = useRef(bossGaugeTrail);
  const spRegenProgressRef = useRef(0);
  const specialChargeProgressRef = useRef(0);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;
  bossGaugeChargeRef.current = bossGaugeCharge;
  bossGaugeDamageRef.current = bossGaugeDamage;
  bossGaugeTrailRef.current = bossGaugeTrail;
  positionRef.current = position;
  battlePlayerLeftRef.current = battlePlayerLeft;
  battleJumpActiveRef.current = battleJumpActive;
  bossFlippedRef.current = bossFlipped;
  const setEyeBarrierPhase = (phase) => {
    if (phase === "revealing") {
      const revealOrder = EYE_BARRIER_CELLS.map((_, index) => index);
      for (let index = revealOrder.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [revealOrder[index], revealOrder[randomIndex]] = [revealOrder[randomIndex], revealOrder[index]];
      }
      setEyeBarrierRevealOrder(revealOrder);
    }
    eyeBarrierPhaseRef.current = phase;
    setEyeBarrierPhaseValue(phase);
  };
  eyeBarrierRevealCheckRef.current = () => {
    if (eyeBarrierPhaseRef.current !== "pending" || bossMovementInProgressRef.current || !battleGroundedRef.current) return;
    setEyeBarrierPhase("revealing");
  };
  freezeBattlePlayerRef.current = () => {
    if (movementInterval.current) window.clearInterval(movementInterval.current);
    movementInterval.current = null;
    const encounterBounds = document.querySelector(".strike-encounter")?.getBoundingClientRect();
    const playerBounds = document.querySelector(".strike-player-position")?.getBoundingClientRect();
    if (encounterBounds && playerBounds && encounterBounds.width > 0) {
      const frozenPosition = Math.max(0, Math.min(100, ((playerBounds.left + playerBounds.width / 2 - encounterBounds.left) / encounterBounds.width) * 100));
      battlePlayerLeftRef.current = frozenPosition;
      setBattlePlayerLeft(frozenPosition);
    }
    setMoving(false);
    if (battleFootAttackTimerActiveRef.current) stopGroundedFootAttackRef.current?.();
    finishBattleJumpRef.current?.();
  };
  const bossGaugeProgress = Math.max(0, bossGaugeCharge - bossGaugeDamage);
  const grass = useMemo(() => makeGrass(1200), []);

  useEffect(() => {
    if (!battleActive || !typhoonAppearance) {
      setBossFlipped(false);
      return;
    }
    const battleBounds = document.querySelector(".strike-encounter")?.getBoundingClientRect();
    const bossBounds = document.querySelector(".typhoon-boss-art")?.getBoundingClientRect();
    const playerBounds = document.querySelector(".strike-player-position img")?.getBoundingClientRect();
    if (!battleBounds || !bossBounds) return;
    const playerX = battleBounds.left + (battlePlayerLeft / 100) * battleBounds.width;
    const playerBackX = playerBounds
      ? facing < 0 ? playerBounds.right : playerBounds.left
      : playerX - facing * 60;
    const bossBackSideInset = bossBounds.width * 0.08;
    const handJumpMiss = battleJumpActiveRef.current
      && battleJumpAttackFocusedRef.current
      && ["hand-left", "hand-right", "hand"].includes(battleJumpAttackTargetRef.current)
      && bossFlipped !== battleJumpAttackBossFlippedRef.current;
    if (!bossFlipped && playerBackX > bossBounds.right - bossBackSideInset) {
      if (handJumpMiss) {
        battleJumpAttackConnectedRef.current = false;
      }
      setBossFlipped(true);
    } else if (bossFlipped && playerBackX < bossBounds.left + bossBackSideInset) {
      if (handJumpMiss) {
        battleJumpAttackConnectedRef.current = false;
      }
      setBossFlipped(false);
    }
  }, [battleActive, battlePlayerLeft, bossFlipped, bossHorizontalOffset, facing, typhoonAppearance]);

  useEffect(() => {
    if (!battleActive || !battleCommandsReady || !typhoonAppearance || bossDefeating || isPaused) {
      if (!battleActive || !typhoonAppearance) {
        bossHorizontalOffsetRef.current = 0;
        setBossHorizontalOffset(0);
      }
      return undefined;
    }

    const movementTimer = window.setInterval(() => {
      if (eyeBarrierPhaseRef.current === "pending" || eyeBarrierPhaseRef.current === "revealing") return;
      if (Math.random() >= 0.6) return;
      const encounterBounds = document.querySelector(".strike-encounter")?.getBoundingClientRect();
      const arrivalBounds = document.querySelector(".typhoon-strike-arrival")?.getBoundingClientRect();
      const bossBounds = document.querySelector(".typhoon-boss-art")?.getBoundingClientRect();
      if (!encounterBounds || !arrivalBounds || !bossBounds) return;

      const currentOffset = bossHorizontalOffsetRef.current;
      const baseLeft = arrivalBounds.left + (arrivalBounds.width - bossBounds.width) / 2;
      const baseCenter = baseLeft + bossBounds.width / 2;
      const bossHalfWidth = bossBounds.width / 2;
      const minOffset = encounterBounds.left + bossHalfWidth - baseCenter;
      const maxOffset = encounterBounds.right - bossHalfWidth - baseCenter;
      if (minOffset >= maxOffset) return;

      const nextOffset = minOffset + Math.random() * (maxOffset - minOffset);
      const offsetDelta = nextOffset - currentOffset;
      if (Math.abs(offsetDelta) < 4) return;
      bossHorizontalOffsetRef.current = nextOffset;
      setBossHorizontalOffset(nextOffset);
      bossMovementInProgressRef.current = true;
      window.clearTimeout(bossMovementTimeoutRef.current);
      bossMovementTimeoutRef.current = window.setTimeout(() => {
        bossMovementInProgressRef.current = false;
        eyeBarrierRevealCheckRef.current?.();
      }, 700);
    }, 1800);

    return () => window.clearInterval(movementTimer);
  }, [battleActive, battleCommandsReady, bossDefeating, isPaused, typhoonAppearance]);

  useEffect(() => {
    const showRetirementRewards = () => {
      transitionTimers.current.forEach((timer) => window.clearInterval(timer));
      transitionTimers.current = [];
      if (movementInterval.current) window.clearInterval(movementInterval.current);
      movementInterval.current = null;
      window.clearInterval(battleActionTimeoutRef.current);
      window.clearInterval(bossHitTimeoutRef.current);
      window.clearInterval(battleAttackFrameTimerRef.current);
      window.clearInterval(battleJumpAttackFrameTimerRef.current);
      movementLockedRef.current = false;
      strikeActiveRef.current = false;
      bossDefeatedRef.current = false;
      battleGroundedRef.current = true;
      battleJumpActiveRef.current = false;
      battleAttackPhaseRef.current = "none";
      battleJumpAttackReadyRef.current = false;
      battleJumpAttackHitRef.current = null;
      battleJumpAttackHasRepeatedRef.current = false;
      battleJumpAttackMashRemainingRef.current = 0;
      resetJumpAttackFrames();
      battleAttackMashRemainingRef.current = 0;
      battleAttackHasRepeatedRef.current = false;
      battleFootAttackTimerActiveRef.current = false;
      battleJumpUsesMashAttackRef.current = false;
      setBattleAttackFrame(null);
      setBattleAttackFlipped(false);
      setBattleJumpActive(false);
      setBattleJumpTargetTop(null);
      setBattleActive(false);
      setBattleCommandsReady(false);
      battleCommandsReadyRef.current = false;
      setBossDefeating(false);
      setBossFullyDefeated(false);
      setBossHitEffect(null);
      setShowBossGauge(false);
      setBossGaugeCharging(false);
      setTyphoonAppearance(null);
      setVictoryReward({
        playerBefore: { level: player.level, exp: player.exp, nextExp: player.nextExp },
        expReward: 0,
        moneyReward: 0,
        outcome: "retired"
      });
      setIsPaused(true);
    };
    window.addEventListener("typhoon-combat-retired", showRetirementRewards);
    return () => window.removeEventListener("typhoon-combat-retired", showRetirementRewards);
  }, [player.level, player.exp, player.nextExp, setBattleActive, setIsPaused]);

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

  finishBattleJumpRef.current = () => {
    if (!battleJumpActiveRef.current || battleAttackPhaseRef.current === "landing") return;
    window.clearInterval(battleAttackFrameTimerRef.current);
    battleAttackFrameTimerRef.current = null;
    window.clearInterval(battleJumpAttackFrameTimerRef.current);
    battleJumpAttackFrameTimerRef.current = null;
    battleAttackPhaseRef.current = "landing";
    battleJumpUsesMashAttackRef.current = false;
    battleJumpAttackReadyRef.current = false;
    battleJumpAttackConnectedRef.current = false;
    battleJumpAttackTargetRef.current = null;
    battleJumpAttackFocusedRef.current = false;
    battleJumpAttackHitRef.current = null;
    battleJumpAttackHasRepeatedRef.current = false;
    battleJumpAttackMashRemainingRef.current = 0;
    battleAttackHasRepeatedRef.current = false;
    setBattleAttackFrame(null);
    resetJumpAttackFrames();
    setBattleJumpTargetTop(battleJumpGroundTopRef.current);
    const landingTimer = scheduleWhileUnpaused(() => {
      transitionTimers.current = transitionTimers.current.filter((timer) => timer !== landingTimer);
      battleGroundedRef.current = true;
      battleAirLungeCountRef.current = 0;
      battleJumpActiveRef.current = false;
      battleAttackPhaseRef.current = "none";
      battleJumpUsesMashAttackRef.current = false;
      battleJumpAttackReadyRef.current = false;
      setBattleJumpActive(false);
      setBattleJumpFlipped(false);
      setBattleJumpTargetTop(null);
      eyeBarrierRevealCheckRef.current?.();
    }, BATTLE_JUMP_LANDING_DURATION);
    transitionTimers.current.push(landingTimer);
  };

  const startGroundedFootAttack = (flipped) => {
    setBattleAttackFlipped(flipped);
    if (movementInterval.current) window.clearInterval(movementInterval.current);
    movementInterval.current = null;
    setMoving(false);
    if (battleAttackPhaseRef.current === "attack" && battleFootAttackTimerActiveRef.current) {
      battleAttackHasRepeatedRef.current = true;
      battleAttackMashRemainingRef.current = BATTLE_ATTACK_MASH_WINDOW;
      return;
    }

    window.clearInterval(battleAttackFrameTimerRef.current);
    battleAttackFrameIndexRef.current = 0;
    battleAttackPhaseRef.current = "attack";
    battleJumpUsesMashAttackRef.current = true;
    battleAttackHasRepeatedRef.current = false;
    battleAttackMashRemainingRef.current = 0;
    battleFootAttackTimerActiveRef.current = true;
    setBattleAttackFrame(1);
    battleAttackFrameTimerRef.current = window.setInterval(() => {
      if (pausedRef.current || battleAttackPhaseRef.current !== "attack") return;
      const currentFrameIndex = battleAttackFrameIndexRef.current;
      const stillMashing = battleAttackHasRepeatedRef.current && battleAttackMashRemainingRef.current > 0;
      if (currentFrameIndex >= 2 && !stillMashing) {
        window.clearInterval(battleAttackFrameTimerRef.current);
        battleAttackFrameTimerRef.current = null;
        battleAttackPhaseRef.current = "none";
        battleJumpUsesMashAttackRef.current = false;
        battleAttackHasRepeatedRef.current = false;
        battleFootAttackTimerActiveRef.current = false;
        setBattleAttackFrame(null);
        setBattleAttackFlipped(false);
        return;
      }
      const attackFrames = [1, 2, 3, 2, 1, 2];
      battleAttackFrameIndexRef.current = (currentFrameIndex + 1) % attackFrames.length;
      setBattleAttackFrame(attackFrames[battleAttackFrameIndexRef.current]);
      if (stillMashing) battleAttackMashRemainingRef.current = Math.max(0, battleAttackMashRemainingRef.current - BATTLE_ATTACK_FRAME_INTERVAL);
    }, BATTLE_ATTACK_FRAME_INTERVAL);
  };
  stopGroundedFootAttackRef.current = () => {
    if (!battleFootAttackTimerActiveRef.current) return;
    window.clearInterval(battleAttackFrameTimerRef.current);
    battleAttackFrameTimerRef.current = null;
    battleAttackPhaseRef.current = "none";
    battleJumpUsesMashAttackRef.current = false;
    battleAttackHasRepeatedRef.current = false;
    battleAttackMashRemainingRef.current = 0;
    battleFootAttackTimerActiveRef.current = false;
    setBattleAttackFrame(null);
    setBattleAttackFlipped(false);
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
      "/idle-cutout.png",
      ...MALE_BATTLE_RIGHT_WALK_FRAMES,
      ...MALE_BATTLE_LEFT_WALK_FRAMES,
      "/man_attack1.png",
      "/man_attack2.png",
      "/man_attack3.png",
      "/woman_attack1-cutout.png",
      "/woman_attack2-cutout.png",
      "/woman_attack3-cutout.png",
      "/man_attack_jump2-cutout.png",
      "/man_attack_jump3-cutout.png",
      "/woman_attack_jump2-cutout.png",
      "/woman_attack_jump3-cutout.png",
      "/man_battle_jump-cutout.png",
      ...FEMALE_BATTLE_RIGHT_WALK_FRAMES,
      ...FEMALE_BATTLE_LEFT_WALK_FRAMES,
      "/\u7537\u6027\u52DD\u5229.png",
      "/\u5973\u6027\u52DD\u5229.png"
    ];
    frameSources.forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);

  useEffect(() => {
    if (!moving || isPaused) return undefined;
    const frameCount = battleActive
      ? isMale
        ? facing > 0 ? MALE_BATTLE_RIGHT_WALK_FRAMES.length : MALE_BATTLE_LEFT_WALK_FRAMES.length
        : facing > 0 ? FEMALE_BATTLE_RIGHT_WALK_FRAMES.length : FEMALE_BATTLE_LEFT_WALK_FRAMES.length
      : isMale && facing > 0
        ? MALE_RIGHT_WALK_FRAMES.length
        : isMale && facing < 0
          ? MALE_LEFT_WALK_FRAMES.length
          : facing > 0
            ? FEMALE_RIGHT_WALK_FRAMES.length
            : FEMALE_LEFT_WALK_FRAMES.length;
    setWalkFrame(1);
    const frameTimer = window.setInterval(() => {
      setWalkFrame((frame) => frame % frameCount + 1);
    }, battleActive ? 240 : fastWalking ? 220 : 300);
    return () => window.clearInterval(frameTimer);
  }, [moving, fastWalking, facing, isMale, isPaused, battleActive]);

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
    let lastUpdate = 0;
    let currentTrail = bossGaugeTrailRef.current;
    const easeDamageTrail = (timestamp) => {
      if (previousTime === undefined) previousTime = timestamp;
      const elapsed = timestamp - previousTime;
      previousTime = timestamp;
      const nextTrail = Math.max(bossGaugeProgress, currentTrail - elapsed * 0.075);
      currentTrail = nextTrail;
      bossGaugeTrailRef.current = nextTrail;
      if (timestamp - lastUpdate >= 1000 / 30 || nextTrail === bossGaugeProgress) {
        setBossGaugeTrail(nextTrail);
        lastUpdate = timestamp;
      }
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
    let cycleStartedAt = performance.now() - spRegenProgressRef.current * 20_000;
    let lastUpdate = 0;
    let frameId;
    const recharge = (timestamp) => {
      const progress = Math.min(1, (timestamp - cycleStartedAt) / 20_000);
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

  useEffect(() => {
    if (isPaused || !battleCommandsReady || specialChargeProgressRef.current >= 1) return undefined;
    let startedAt = performance.now() - specialChargeProgressRef.current * SPECIAL_CHARGE_DURATION;
    let lastUpdate = 0;
    let frameId;
    const chargeSpecial = (timestamp) => {
      const progress = Math.min(1, (timestamp - startedAt) / SPECIAL_CHARGE_DURATION);
      if (timestamp - lastUpdate >= 1000 / 30 || progress === 1) {
        specialChargeProgressRef.current = progress;
        setSpecialChargeProgress(progress * 100);
        lastUpdate = timestamp;
      }
      if (progress < 1) frameId = window.requestAnimationFrame(chargeSpecial);
    };
    frameId = window.requestAnimationFrame(chargeSpecial);
    return () => window.cancelAnimationFrame(frameId);
  }, [battleCommandsReady, isPaused, specialChargeCycle]);

  useEffect(() => () => {
    window.clearInterval(battleActionTimeoutRef.current);
    window.clearInterval(bossHitTimeoutRef.current);
    window.clearInterval(battleAttackFrameTimerRef.current);
    window.clearInterval(battleJumpAttackFrameTimerRef.current);
    window.clearTimeout(bossMovementTimeoutRef.current);
  }, []);

  const moveBattleFocus = (direction) => {
    if (bossDefeatedRef.current) return;
    if (direction === "left" || direction === "right") {
      if (focusTargetIndex === 2) setHandSide((currentSide) => currentSide === "right" ? "left" : "right");
      return;
    }
    const nextIndex = (focusTargetIndex + direction + FOCUS_TARGETS.length) % FOCUS_TARGETS.length;
    setFocusTargetIndex(nextIndex);
    if (nextIndex === 2) setHandSide("right");
  };
  battleFocusHandlerRef.current = moveBattleFocus;

  const startGroundedJumpToAttack = (attackTarget, onImpact) => {
    if (attackTarget.id === "foot") return false;
    if (pausedRef.current || !battleActiveRef.current || !battleCommandsReadyRef.current || !battleGroundedRef.current) return false;
    if (battleFootAttackTimerActiveRef.current) stopGroundedFootAttackRef.current?.();
    battleAirLungeCountRef.current = 0;
    const currentPosition = battlePlayerLeftRef.current;

    const battleBounds = document.querySelector(".strike-encounter")?.getBoundingClientRect();
    const bossBounds = document.querySelector(".typhoon-boss-art")?.getBoundingClientRect();
    const battleHeight = battleBounds?.height || window.innerHeight;
    const playerContainerHeight = Math.max(100, Math.min(window.innerHeight * 0.21, 190));
    const attackLeft = battleBounds && bossBounds
      ? Math.max(0, Math.min(100, ((bossBounds.left + (attackTarget.x / 100) * bossBounds.width - battleBounds.left) / battleBounds.width) * 100))
      : BATTLE_JUMP_ATTACK_POSITION;
    if (Math.abs(attackLeft - currentPosition) > BATTLE_JUMP_TRIGGER_RANGE) return false;
    const attackPointX = battleBounds ? battleBounds.left + (attackLeft / 100) * battleBounds.width : attackLeft;
    const currentPlayerX = battleBounds ? battleBounds.left + (currentPosition / 100) * battleBounds.width : currentPosition;
    const attackSide = currentPlayerX < attackPointX ? -1 : 1;
    const jumpLandingLeft = Math.max(0, Math.min(100, attackLeft + attackSide * BATTLE_JUMP_TARGET_STANDOFF));
    const attackTop = battleBounds && bossBounds
      ? Math.max(40, Math.min(battleHeight - 40, bossBounds.top + (attackTarget.y / 100) * bossBounds.height - battleBounds.top))
      : battleHeight * 0.45;
    const groundTop = battleHeight * 0.8 - playerContainerHeight / 2;

    battleGroundedRef.current = false;
    battleJumpActiveRef.current = true;
    battleJumpUsesMashAttackRef.current = false;
    battleJumpAttackReadyRef.current = true;
    battleJumpAttackConnectedRef.current = false;
    battleJumpAttackTargetRef.current = attackTarget.id;
    battleJumpAttackBossFlippedRef.current = bossFlippedRef.current;
    battleJumpAttackFocusedRef.current = focusModeRef.current;
    battleJumpAttackHitRef.current = onImpact;
    battleJumpAttackHasRepeatedRef.current = false;
    battleJumpAttackMashRemainingRef.current = 0;
    battleJumpAttackFrameIndexRef.current = 0;
    battleAttackPhaseRef.current = "jump";
    battleJumpGroundTopRef.current = groundTop;
    setBattleJumpActive(true);
    setBattleAttackFrame(null);
    resetJumpAttackFrames();
    setBattleJumpFlipped(attackSide > 0);
    setBattleJumpTargetTop(attackTop);
    setBattlePlayerHasMoved(true);
    battleFacingRef.current = attackSide > 0 ? -1 : 1;
    setFacing(battleFacingRef.current);
    setMoving(false);
    if (movementInterval.current) {
      window.clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
    battlePlayerLeftRef.current = jumpLandingLeft;
    setBattlePlayerLeft(jumpLandingLeft);
    const impactTimer = scheduleWhileUnpaused(() => {
      transitionTimers.current = transitionTimers.current.filter((timer) => timer !== impactTimer);
      battleAttackPhaseRef.current = "attack";
      if (battleJumpAttackHasRepeatedRef.current) {
        battleJumpAttackMashRemainingRef.current = BATTLE_ATTACK_MASH_WINDOW;
      }
      changeJumpAttackFrame(2);
      if (battleAttackPhaseRef.current !== "attack") return;
      window.clearInterval(battleJumpAttackFrameTimerRef.current);
      battleJumpAttackFrameIndexRef.current = 0;
      battleJumpAttackFrameTimerRef.current = window.setInterval(() => {
        if (pausedRef.current || battleAttackPhaseRef.current !== "attack") return;
        const repeated = battleJumpAttackHasRepeatedRef.current;
        const mashStillActive = repeated && battleJumpAttackMashRemainingRef.current > 0;
        if (!mashStillActive && battleJumpAttackFrameIndexRef.current >= 1) {
          finishBattleJumpRef.current?.();
          return;
        }
        const frames = [2, 3, 2, "jump", 2, 3];
        battleJumpAttackFrameIndexRef.current = repeated
          ? (battleJumpAttackFrameIndexRef.current + 1) % frames.length
          : 1;
        changeJumpAttackFrame(frames[battleJumpAttackFrameIndexRef.current]);
        if (mashStillActive) {
          battleJumpAttackMashRemainingRef.current = Math.max(0, battleJumpAttackMashRemainingRef.current - BATTLE_ATTACK_FRAME_INTERVAL);
        }
      }, BATTLE_ATTACK_FRAME_INTERVAL);
    }, BATTLE_JUMP_LUNGE_DURATION);
    transitionTimers.current.push(impactTimer);
    return true;
  };

  const executeBattleCommand = (command) => {
    if (command === "fight" && !pausedRef.current && battleCommandsReadyRef.current && battleJumpAttackReadyRef.current && !battleGroundedRef.current
      && eyeBarrierPhaseRef.current !== "pending" && eyeBarrierPhaseRef.current !== "revealing"
      && ["jump", "attack"].includes(battleAttackPhaseRef.current)) {
      battleJumpAttackHasRepeatedRef.current = true;
      battleJumpAttackMashRemainingRef.current = BATTLE_ATTACK_MASH_WINDOW;
      return;
    }
    if (pausedRef.current || !battleCommandsReadyRef.current || !battleGroundedRef.current || eyeBarrierPhaseRef.current === "pending" || eyeBarrierPhaseRef.current === "revealing") return;
    const maxHp = computedStats.maxHp || player.maxHp || 500;
    const maxSp = player.maxSp || 100;
    const spPerSegment = maxSp / 3;
    const availableSp = Math.min(maxSp, player.currentSp + spPerSegment * spRegenProgressRef.current);
    if (command === "heal" && availableSp < spPerSegment) return;
    if (command === "special" && specialChargeProgressRef.current < 1) return;
    setBattleAction(command);
    setBattleActionPulse((pulse) => pulse + 1);
    window.clearInterval(battleActionTimeoutRef.current);
    battleActionTimeoutRef.current = scheduleWhileUnpaused(() => setBattleAction(null), 220);

    const dealBossDamage = (damage, critical, target) => {
      const currentGaugeProgress = Math.max(0, bossGaugeChargeRef.current - bossGaugeDamageRef.current);
      const currentBossHp = Math.round((bossMaxHp * currentGaugeProgress) / 100);
      if (target.id === "eyes" && currentBossHp > 0 && currentBossHp <= bossMaxHp / 2) {
        bossHitCounterRef.current += 1;
        setBossHitEffect({ id: bossHitCounterRef.current, damage: 0, targetId: target.id, typhoonType: bossType, critical: false, blocked: true });
        window.clearInterval(bossHitTimeoutRef.current);
        bossHitTimeoutRef.current = scheduleWhileUnpaused(() => setBossHitEffect(null), 900);
        return;
      }
      const damageAsGaugePercent = (damage / bossMaxHp) * 100;
      const actualProgressDamage = Math.min(damageAsGaugePercent, currentGaugeProgress);
      if (actualProgressDamage <= 0) return;
      const actualHpDamage = Math.min(currentBossHp, Math.max(1, Math.round((bossMaxHp * actualProgressDamage) / 100)));
      const nextBossHp = Math.max(0, currentBossHp - actualHpDamage);
      setBossGaugeTrail((currentTrail) => Math.max(currentTrail, currentGaugeProgress));
      const defeatsBoss = damage >= currentBossHp;
      setBossGaugeDamage((currentDamage) => Math.min(100, currentDamage + actualProgressDamage));
      bossHitCounterRef.current += 1;
      setBossHitEffect({ id: bossHitCounterRef.current, damage: actualHpDamage, targetId: target.id, typhoonType: bossType, critical });
      window.clearInterval(bossHitTimeoutRef.current);
      if (!defeatsBoss && !eyesBarrierActivatedRef.current && nextBossHp <= bossMaxHp / 2) {
        eyesBarrierActivatedRef.current = true;
        setEyeBarrierPhase("pending");
        freezeBattlePlayerRef.current?.();
        setBattleAction(null);
        eyeBarrierRevealCheckRef.current?.();
      }
      if (defeatsBoss) {
        bossDefeatedRef.current = false;
        setBossDefeating(true);
        battleCommandsReadyRef.current = false;
        setBattleCommandsReady(false);
        setBossGaugeCharging(false);
        setBossGaugeDamage(100);
        finishBattleJumpRef.current?.();
        stopGroundedFootAttackRef.current?.();
      } else {
        bossHitTimeoutRef.current = scheduleWhileUnpaused(() => setBossHitEffect(null), 900);
      }
    };

    const attackPower = Math.max(1, Number(player.equippedWeapon?.attack) || 10);
    const attackBoss = (baseDamage) => {
      const battleBounds = document.querySelector(".strike-encounter")?.getBoundingClientRect();
      const bossBounds = document.querySelector(".typhoon-boss-art")?.getBoundingClientRect();
      const playerBounds = document.querySelector(".strike-player-position img")?.getBoundingClientRect();
      const nearbyTargets = [
        ...FOCUS_TARGETS.filter((target) => target.id !== "hand").map((target) => orientBossTarget(getAdjustedFocusTarget(target.id, bossType, handSide), bossFlipped)),
        orientBossTarget(getAdjustedFocusTarget("hand-left", bossType, handSide), bossFlipped),
        orientBossTarget(getAdjustedFocusTarget("hand-right", bossType, handSide), bossFlipped)
      ];
      const attackTarget = focusModeRef.current
        ? focusTarget
        : bossBounds && playerBounds
          ? nearbyTargets.reduce((nearest, candidate) => {
            const candidateX = bossBounds.left + (candidate.x / 100) * bossBounds.width;
            const candidateY = bossBounds.top + (candidate.y / 100) * bossBounds.height;
            const playerX = playerBounds.left + playerBounds.width / 2;
            const playerY = playerBounds.top + playerBounds.height / 2;
            const candidateDistance = Math.hypot(candidateX - playerX, candidateY - playerY);
            const nearestX = bossBounds.left + (nearest.x / 100) * bossBounds.width;
            const nearestY = bossBounds.top + (nearest.y / 100) * bossBounds.height;
            const nearestDistance = Math.hypot(nearestX - playerX, nearestY - playerY);
            return candidateDistance < nearestDistance ? candidate : nearest;
          })
          : getAdjustedFocusTarget("head", bossType, handSide);
      const attackLeft = battleBounds && bossBounds
        ? ((bossBounds.left + (attackTarget.x / 100) * bossBounds.width - battleBounds.left) / battleBounds.width) * 100
        : BATTLE_JUMP_ATTACK_POSITION;
      if (Math.abs(attackLeft - battlePlayerLeftRef.current) > BATTLE_JUMP_TRIGGER_RANGE) {
        if (command === "fight") {
          window.clearInterval(bossHitTimeoutRef.current);
          setBossHitEffect(null);
          setBattlePlayerHasMoved(true);
          startGroundedFootAttack(facing > 0);
        }
        return false;
      }
      let attackFacing = facing;
      if (attackTarget.id === "foot") {
        setBattlePlayerHasMoved(true);
        attackFacing = battlePlayerLeftRef.current > attackLeft ? -1 : 1;
        battleFacingRef.current = attackFacing;
        setFacing(attackFacing);
      }

      const applyAttackHit = () => {
        const currentBattleBounds = document.querySelector(".strike-encounter")?.getBoundingClientRect();
        const currentBossBounds = document.querySelector(".typhoon-boss-art")?.getBoundingClientRect();
        const currentPlayerBounds = document.querySelector(".strike-player-position")?.getBoundingClientRect();
        if (!currentBattleBounds || !currentBossBounds || !currentPlayerBounds || currentBattleBounds.width <= 0) {
          battleJumpAttackConnectedRef.current = false;
          return;
        }
        const playerX = currentBattleBounds.left + (battlePlayerLeftRef.current / 100) * currentBattleBounds.width;
        const playerY = currentPlayerBounds.top + currentPlayerBounds.height / 2;
        const currentTargets = [
          ...FOCUS_TARGETS.filter((target) => target.id !== "hand").map((target) => orientBossTarget(getAdjustedFocusTarget(target.id, bossType, handSide), bossFlippedRef.current)),
          orientBossTarget(getAdjustedFocusTarget("hand-left", bossType, handSide), bossFlippedRef.current),
          orientBossTarget(getAdjustedFocusTarget("hand-right", bossType, handSide), bossFlippedRef.current)
        ];
        const verticalHitRange = Math.max(36, currentBossBounds.height * BATTLE_TARGET_HIT_RANGE);
        const inRangeTargets = currentTargets.map((target) => {
          const isFootTarget = target.id === "foot";
          if (isFootTarget && !battleGroundedRef.current) return null;
          const targetX = currentBossBounds.left + (target.x / 100) * currentBossBounds.width;
          const targetY = currentBossBounds.top + (target.y / 100) * currentBossBounds.height;
          const deltaX = Math.abs(playerX - targetX);
          const deltaY = Math.abs(playerY - targetY);
          const horizontalHitRange = isFootTarget
            ? currentBattleBounds.width * (BATTLE_FOOT_HIT_RANGE_PERCENT / 100)
            : Math.max(36, currentBossBounds.width * BATTLE_TARGET_HIT_RANGE);
          if (deltaX > horizontalHitRange || (!isFootTarget && deltaY > verticalHitRange)) return null;
          return { target, score: deltaX / horizontalHitRange + (isFootTarget ? 0 : deltaY / verticalHitRange) };
        }).filter(Boolean);
        const hitTarget = inRangeTargets.reduce((nearest, candidate) => !nearest || candidate.score < nearest.score ? candidate : nearest, null)?.target;
        if (!hitTarget) {
          battleJumpAttackConnectedRef.current = false;
          return;
        }

        const hitTargetX = currentBossBounds.left + (hitTarget.x / 100) * currentBossBounds.width;
        const hitFacing = hitTargetX >= playerX ? 1 : -1;
        battleFacingRef.current = hitFacing;
        setFacing(hitFacing);
        if (battleJumpActiveRef.current) setBattleJumpFlipped(hitFacing < 0);
        else setBattleAttackFlipped(hitFacing < 0);

        battleJumpAttackConnectedRef.current = true;
        const critical = Math.random() < 0.03;
        const finalDamage = baseDamage * (hitTarget.id === "eyes" ? 2 : 1) * (critical ? 3 : 1);
        dealBossDamage(finalDamage, critical, hitTarget);
      };
      const mashAttack = command === "fight" && attackTarget.id === "foot";
      if (mashAttack) startGroundedFootAttack(attackFacing > 0);
      const startedJump = startGroundedJumpToAttack(attackTarget, applyAttackHit);
      if (!startedJump) applyAttackHit();
      return true;
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
      if (attackBoss(attackPower * 3)) {
        specialChargeProgressRef.current = 0;
        setSpecialChargeProgress(0);
        setSpecialChargeCycle((cycle) => cycle + 1);
      }
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
      if (pausedRef.current || (movementLockedRef.current && !battleActiveRef.current) || transitionRef.current !== "idle") {
        stopMovement();
        return;
      }
      if (battleActiveRef.current) {
        if (eyeBarrierPhaseRef.current === "pending" || eyeBarrierPhaseRef.current === "revealing") {
          stopMovement();
          return;
        }
        battleFacingRef.current = direction;
        setFacing(direction);
        setBattlePlayerHasMoved(true);
        const battleStep = 3.6;
        const nextLeft = Math.max(0, Math.min(100, battlePlayerLeftRef.current + direction * battleStep));
        battlePlayerLeftRef.current = nextLeft;
        setBattlePlayerLeft(nextLeft);
        return;
      }
      battleFacingRef.current = direction;
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
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      const bindings = getKeyBindings();
      if (matchesKeyBinding(bindings, "shiftModifier", event)) {
        event.preventDefault();
        if (!event.repeat) {
          if (movementLockedRef.current && battleActiveRef.current) {
            setFocusMode(!focusModeRef.current);
          } else {
            shiftHeld.current = true;
            setFastWalking(true);
          }
        }
        return;
      }
      const command = ["fight", "guard", "heal", "special"].find((action) => matchesKeyBinding(bindings, action, event));
      const moveLeft = matchesKeyBinding(bindings, "moveLeft", event);
      const moveRight = matchesKeyBinding(bindings, "moveRight", event);
      if (battleActiveRef.current && battleFootAttackTimerActiveRef.current && (moveLeft || moveRight)) {
        event.preventDefault();
        stopMovement();
        return;
      }
      if ((moveLeft || moveRight) && battleActiveRef.current && battleJumpActiveRef.current
        && ["jump", "attack", "landing"].includes(battleAttackPhaseRef.current)) {
        event.preventDefault();
        stopMovement();
        return;
      }
      if (movementLockedRef.current) {
        if (command) {
          event.preventDefault();
          if (event.key === "Escape") event.stopImmediatePropagation();
          if (!event.repeat && battleActiveRef.current && battleCommandsReadyRef.current) battleCommandHandlerRef.current?.(command);
          return;
        }
        if (battleActiveRef.current && battleCommandsReadyRef.current && (moveLeft || moveRight)) {
          event.preventDefault();
          if (event.key === "Escape") event.stopImmediatePropagation();
          if (event.repeat || transitionRef.current !== "idle") return;
          const direction = moveRight ? 1 : -1;
          stopMovement();
          setFastWalking(false);
          setMoving(true);
          moveOneStep(direction);
          movementInterval.current = window.setInterval(() => moveOneStep(direction), 80);
          return;
        }
        if (event.key.startsWith("Arrow")) {
          event.preventDefault();
          if (event.repeat) return;
          if (focusModeRef.current && event.key === "ArrowUp") battleFocusHandlerRef.current?.(-1);
          else if (focusModeRef.current && event.key === "ArrowDown") battleFocusHandlerRef.current?.(1);
          else if (event.key === "ArrowLeft") battleFocusHandlerRef.current?.("left");
          else if (event.key === "ArrowRight") battleFocusHandlerRef.current?.("right");
          return;
        }
        return;
      }
      if (moveLeft || moveRight) {
        event.preventDefault();
        if (event.key === "Escape") event.stopImmediatePropagation();
        if (event.repeat || transitionRef.current !== "idle") return;
        const direction = moveRight ? 1 : -1;
        stopMovement();
        setFastWalking(shiftHeld.current);
        setMoving(true);
        moveOneStep(direction);
        movementInterval.current = window.setInterval(() => moveOneStep(direction), 100);
        return;
      }
    };

    const onKeyUp = (event) => {
      const bindings = getKeyBindings();
      if (matchesKeyBinding(bindings, "moveLeft", event) || matchesKeyBinding(bindings, "moveRight", event)) stopMovement();
      if (matchesKeyBinding(bindings, "shiftModifier", event) && !movementLockedRef.current) {
        shiftHeld.current = false;
        setFastWalking(false);
      }
    };

    const mouseBindingForEvent = (event) => ({ 0: "mouse:left", 1: "mouse:middle", 2: "mouse:right" })[event.button];
    const onMouseDown = (event) => {
      if (pausedRef.current || (event.target instanceof Element && event.target.closest(".battle-command-panel"))) return;
      const mouseBinding = mouseBindingForEvent(event);
      if (!mouseBinding) return;
      const bindings = getKeyBindings();
      if (getBindingKeys(bindings, "shiftModifier").includes(mouseBinding)) {
        if (movementLockedRef.current && battleActiveRef.current) {
          setFocusMode(!focusModeRef.current);
        } else {
          shiftHeld.current = true;
          setFastWalking(true);
        }
        return;
      }
      const moveLeft = getBindingKeys(bindings, "moveLeft").includes(mouseBinding);
      const moveRight = getBindingKeys(bindings, "moveRight").includes(mouseBinding);
      if (battleActiveRef.current && battleFootAttackTimerActiveRef.current && (moveLeft || moveRight)) {
        event.preventDefault();
        stopMovement();
        return;
      }
      if (movementLockedRef.current) {
        if (!battleActiveRef.current) return;
        const command = ["fight", "guard", "heal", "special"].find((action) => getBindingKeys(bindings, action).includes(mouseBinding));
        if (command && battleCommandsReadyRef.current) {
          event.preventDefault();
          battleCommandHandlerRef.current?.(command);
          return;
        }
        if (!battleCommandsReadyRef.current || (!moveLeft && !moveRight)) return;
        event.preventDefault();
        if (transitionRef.current !== "idle") return;
        const direction = moveRight ? 1 : -1;
        stopMovement();
        setFastWalking(false);
        setMoving(true);
        moveOneStep(direction);
        movementInterval.current = window.setInterval(() => moveOneStep(direction), 80);
        return;
      }
      if (!moveLeft && !moveRight) return;
      event.preventDefault();
      if (transitionRef.current !== "idle") return;
      const direction = moveRight ? 1 : -1;
      stopMovement();
      setFastWalking(shiftHeld.current);
      setMoving(true);
      moveOneStep(direction);
      movementInterval.current = window.setInterval(() => moveOneStep(direction), 100);
    };
    const onMouseUp = (event) => {
      const mouseBinding = mouseBindingForEvent(event);
      if (!mouseBinding) return;
      const bindings = getKeyBindings();
      if (getBindingKeys(bindings, "shiftModifier").includes(mouseBinding) && !movementLockedRef.current) {
        shiftHeld.current = false;
        setFastWalking(false);
      }
      if (getBindingKeys(bindings, "moveLeft").includes(mouseBinding) || getBindingKeys(bindings, "moveRight").includes(mouseBinding)) stopMovement();
    };
    const onContextMenu = (event) => {
      if (!pausedRef.current && battleActiveRef.current) event.preventDefault();
    };
    const onBlur = () => {
      shiftHeld.current = false;
      setFastWalking(false);
      stopMovement();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("contextmenu", onContextMenu);
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
    if (!weatherInfo.adminForced || weatherInfo.weatherText === "\u6674\u308C" || approach <= 0) return undefined;

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
      window.clearInterval(battleAttackFrameTimerRef.current);
      window.clearInterval(battleJumpAttackFrameTimerRef.current);
      battleAttackPhaseRef.current = "none";
      battleJumpAttackReadyRef.current = false;
      battleJumpAttackHitRef.current = null;
      battleJumpAttackHasRepeatedRef.current = false;
      battleJumpAttackMashRemainingRef.current = 0;
      battleJumpUsesMashAttackRef.current = false;
      battleAttackMashRemainingRef.current = 0;
      battleAttackHasRepeatedRef.current = false;
      battleFootAttackTimerActiveRef.current = false;
      battleJumpActiveRef.current = false;
      setBattleAttackFrame(null);
      resetJumpAttackFrames();
      strikeActiveRef.current = false;
      movementLockedRef.current = false;
      transitionTimers.current.forEach((timer) => window.clearInterval(timer));
      transitionTimers.current = [];
      bossDefeatedRef.current = false;
      eyesBarrierActivatedRef.current = false;
      bossMovementInProgressRef.current = false;
      window.clearTimeout(bossMovementTimeoutRef.current);
      setEyeBarrierPhase("inactive");
      setFocusTargetIndex(0);
      setHandSide("right");
      setFocusMode(false);
      setBossDefeating(false);
      setBossFullyDefeated(false);
      battleGroundedRef.current = true;
      setBattleJumpActive(false);
      setBattleJumpTargetTop(null);
      setBattleActive(false);
      setTyphoonAppearance(null);
      setShowBossGauge(false);
      setBossGaugeCharge(0);
      setBossGaugeDamage(0);
      setBossGaugeTrail(0);
      setBossGaugeCharging(false);
      setBattleCommandsReady(false);
      specialChargeProgressRef.current = 0;
      setSpecialChargeProgress(0);
      battleCommandsReadyRef.current = false;
      setBattleAction(null);
      return;
    }
    if (strikeActiveRef.current) return;
    strikeActiveRef.current = true;
    movementLockedRef.current = true;
    bossDefeatedRef.current = false;
    eyesBarrierActivatedRef.current = false;
    bossMovementInProgressRef.current = false;
    window.clearTimeout(bossMovementTimeoutRef.current);
    setEyeBarrierPhase("inactive");
    setFocusTargetIndex(0);
    setHandSide("right");
    setFocusMode(false);
    setBossDefeating(false);
    setBossFullyDefeated(false);
    battleGroundedRef.current = true;
    battleAttackPhaseRef.current = "none";
    battleJumpAttackReadyRef.current = false;
    battleJumpAttackHitRef.current = null;
    battleJumpAttackHasRepeatedRef.current = false;
    battleJumpAttackMashRemainingRef.current = 0;
    battleJumpUsesMashAttackRef.current = false;
    battleAttackMashRemainingRef.current = 0;
    battleAttackHasRepeatedRef.current = false;
    battleFootAttackTimerActiveRef.current = false;
    window.clearInterval(battleAttackFrameTimerRef.current);
    window.clearInterval(battleJumpAttackFrameTimerRef.current);
    setBattleAttackFrame(null);
    resetJumpAttackFrames();
    setBattleJumpActive(false);
    setBattleJumpTargetTop(null);
      battlePlayerLeftRef.current = 24;
      setBattlePlayerLeft(24);
      setBattlePlayerHasMoved(false);
    setPlayer((current) => ({ ...current, currentSp: current.maxSp || 100 }));
    spRegenProgressRef.current = 0;
    setSpRegenProgress(0);
    specialChargeProgressRef.current = 0;
    setSpecialChargeProgress(0);
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
      startMapTransition(1, 48, () => {
        eyesBarrierActivatedRef.current = false;
        bossMovementInProgressRef.current = false;
        window.clearTimeout(bossMovementTimeoutRef.current);
        bossHorizontalOffsetRef.current = 0;
        setBossHorizontalOffset(0);
        setEyeBarrierPhase("inactive");
        setTyphoonAppearance({ src, name });
      }, { typhoon: true });
    };
    enterResidentialMap();
  }, [isStrike]);
  useEffect(() => {
    if (battleActive) return;
    battleFacingRef.current = 1;
    setFacing(1);
    eyesBarrierActivatedRef.current = false;
    bossMovementInProgressRef.current = false;
    window.clearTimeout(bossMovementTimeoutRef.current);
    setEyeBarrierPhase("inactive");
    if (!strikeActiveRef.current) return;
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
    battleGroundedRef.current = true;
    setBattleJumpActive(false);
    setBattleJumpTargetTop(null);
    setBattleAction(null);
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
  const focusTarget = orientBossTarget(getAdjustedFocusTarget(FOCUS_TARGETS[focusTargetIndex]?.id || "head", bossType, handSide), bossFlipped);
  const eyeBarrierTarget = orientBossTarget(getAdjustedFocusTarget("eyes", bossType, handSide), bossFlipped);
  const eyeBarrierLocked = eyeBarrierPhase === "pending" || eyeBarrierPhase === "revealing";
  const eyeBarrierActive = battleCommandsReady && bossCurrentHp > 0 && (eyeBarrierPhase === "revealing" || eyeBarrierPhase === "active");
  const damageTarget = bossHitEffect
    ? orientBossTarget(getAdjustedFocusTarget(bossHitEffect.targetId, bossHitEffect.typhoonType || bossType, handSide), bossFlipped)
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
      status: "\u5B8C\u5168\u8A0E\u4F10",
      defeatedAt
    };
    const expReward = Math.round(bossMaxHp * 0.2);
    const moneyReward = Math.round(bossMaxHp * 0.1);
    const playerBefore = { level: player.level, exp: player.exp, nextExp: player.nextExp };
    addToEncyclopedia(defeatedEnemy);
    setLastResult((previous) => ({ ...(previous || {}), typhoon: defeatedEnemy, victory: true, date, defeatedAt, expReward, rewardMoney: moneyReward }));
    gainExp(expReward);
    addMoney(moneyReward);
    setBossDefeating(false);
    setBossHitEffect(null);
    setShowBossGauge(false);
    setBossGaugeCharging(false);
    setBossFullyDefeated(true);
    const victoryTimer = scheduleWhileUnpaused(() => {
      transitionTimers.current = transitionTimers.current.filter((timer) => timer !== victoryTimer);
      setTyphoonAppearance(null);
      strikeActiveRef.current = false;
      movementLockedRef.current = false;
      setBattleActive(false);
      returnWeatherToSunnyAfterCombat();
      setVictoryReward({ playerBefore, expReward, moneyReward, enemyName: defeatedEnemy.name });
      setIsPaused(true);
    }, 1800);
    transitionTimers.current.push(victoryTimer);
  };

  if (victoryReward) {
    return <VictoryRewardView
      {...victoryReward}
      onComplete={() => {
        setVictoryReward(null);
        setIsPaused(false);
      }}
    />;
  }

  const worldPlayerSprite = moving
    ? walkFrameSource(facing, walkFrame, isMale)
    : stopFrameSource(facing, isMale);
  const sunHorizontalPosition = 88;
  const shadowDistance = position - sunHorizontalPosition;
  const maxShadowTurnDistance = sunHorizontalPosition;
  const shadowTurnAngle = Math.min(70, Math.abs(shadowDistance) / maxShadowTurnDistance * 70);
  const playerShadowAngle = shadowDistance < 0
    ? -180 + shadowTurnAngle
    : shadowDistance > 0
      ? -180 - shadowTurnAngle
      : -180;
  const battlePlayerSprite = battleJumpAttackFrame === "jump"
    ? isMale ? "/man_battle_jump-cutout.png" : "/woman_battle_jump-cutout.png"
    : battleJumpAttackFrame === 2 || battleJumpAttackFrame === 3
      ? `/${isMale ? "man" : "woman"}_attack_jump${battleJumpAttackFrame}-cutout.png`
      : battleAttackFrame
        ? `/${isMale ? "man" : "woman"}_attack${battleAttackFrame}${isMale ? ".png" : "-cutout.png"}`
        : battleJumpActive
          ? isMale ? "/man_battle_jump-cutout.png" : "/woman_battle_jump-cutout.png"
          : isMale
            ? moving
              ? (facing < 0 ? MALE_BATTLE_LEFT_WALK_FRAMES : MALE_BATTLE_RIGHT_WALK_FRAMES)[(walkFrame - 1) % MALE_BATTLE_LEFT_WALK_FRAMES.length]
              : battlePlayerHasMoved
                ? facing < 0 ? "/left_man_battle_idle.png" : "/right_man_battle_idle.png"
                : "/man_battle_idle.png"
            : moving
              ? (facing < 0 ? FEMALE_BATTLE_LEFT_WALK_FRAMES : FEMALE_BATTLE_RIGHT_WALK_FRAMES)[(walkFrame - 1) % FEMALE_BATTLE_LEFT_WALK_FRAMES.length]
              : battlePlayerHasMoved
                ? facing < 0 ? "/left_woman_battle_idle.png" : "/right_woman_battle_idle.png"
                : "/woman_battle_idle.png";
  const battlePlayerSpriteClasses = `${!isMale ? "female-battle-character" : ""} ${!isMale && battleAttackFrame ? "is-female-foot-attack-frame" : ""} ${isMale && battleJumpActive && battleJumpAttackFrame !== 2 && battleJumpAttackFrame !== 3 ? "is-male-jump-frame" : ""} ${battleJumpAttackFrame === 2 || battleJumpAttackFrame === 3 ? "is-jump-attack-frame" : ""} ${battleJumpAttackFrame === "jump" ? "is-jump-transition-frame" : ""} ${(battleJumpActive && battleJumpFlipped) || (battleAttackFrame && battleAttackFlipped) ? "is-flipped" : ""}`.trim();
  const battlePlayerSpriteStyle = {
    ...(battleAttackFrame ? { "--attack-baseline-offset": { 1: "1.5%", 2: "3.4%", 3: "-0.9%" }[battleAttackFrame] } : {}),
    ...(battleJumpAttackFrame === 2 ? { "--jump-attack-baseline-offset": "8px" } : {})
  };

  return (
    <section className={`game-world ${isStrike ? "is-strike" : ""} ${battleActive ? "is-battle-active" : ""} ${isTyphoonTransition ? "is-typhoon-transition" : ""}`} style={{ "--storm-darkness": skyDarkness, "--night-opacity": nightIntensity, "--celestial-opacity": 1 - celestialFade }} aria-label="\u8349\u539F\u306E\u30B2\u30FC\u30E0\u30D5\u30A3\u30FC\u30EB\u30C9">
      <div className={`world-map-content ${isMapVisible ? "is-visible" : ""}`}>
        <div className="world-sky" />
        <div className="world-night-shade" />
        <div className="world-sun" />
        <div className="world-houses" aria-hidden="true">
          {houses.back.map(([src, left, width], index) => <EdgeShadedImage key={`back-${index}`} wrapperClassName="world-house world-house-back" src={`/${src}`} style={{ left, width }} />)}
          {houses.front.map(([src, left, width], index) => <EdgeShadedImage key={`front-${index}`} wrapperClassName={`world-house world-house-front ${index === houses.front.length - 1 ? "world-house-front-right" : ""}`} src={`/${src}`} style={{ left, width }} />)}
        </div>
        <div className="world-ground" />
        <div className={`world-player ${moving ? "is-walking" : ""}`} style={{ left: `${position}%`, "--player-shadow-angle": `${playerShadowAngle}deg` }}>
          <span className="world-player-shadow" aria-hidden="true" />
          <img className="world-player-cast-shadow" src={worldPlayerSprite} alt="" aria-hidden="true" />
          <EdgeShadedImage
            className={isMale ? "" : "female-character-sprite"}
            src={worldPlayerSprite}
            alt={player.appearance?.gender === "feminine" ? "\u5973\u6027\u5263\u58EB" : "\u7537\u6027\u5263\u58EB"}
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
        <StormCanvas strengthBased flashAboveGround weatherInfo={weatherInfo} proximityInfo={proximityInfo} isPaused={isPaused} />
      </div>
      {isMapNameVisible && <div key={mapLabelKey} className="map-name-indicator" aria-live="polite">{MAP_NAMES[mapIndex]}</div>}
      {(mapTransition === "loading" || mapTransition === "fade-in") && <div className={`map-loading-indicator ${mapTransition === "fade-in" ? "is-fading" : ""}`}>{"\u30ED\u30FC\u30C9\u4E2D..."}</div>}
      {(mapTransition === "fade-out" || mapTransition === "loading") && <div className={`map-transition-curtain ${mapTransition === "fade-out" ? "is-fading-out" : ""}`} aria-hidden="true" />}
      {battleActive && typhoonAppearance && <div className="strike-encounter" aria-label="\u4E3B\u4EBA\u516C\u3068\u53F0\u98A8\u306E\u5BFE\u5CD9">
        <div className={`strike-player-position ${battleJumpActive ? "is-jumping" : ""} ${battleAttackFrame || battleJumpAttackFrame ? "is-attacking" : ""} ${eyeBarrierLocked ? "is-barrier-locked" : ""}`} style={{ left: `${battlePlayerLeft}%`, top: battleJumpActive && battleJumpTargetTop !== null ? `${battleJumpTargetTop}px` : undefined }}>
          <span className="world-player-shadow battle-player-shadow" aria-hidden="true" />
          <img
            className={battlePlayerSpriteClasses}
            src={battlePlayerSprite}
            alt={isMale ? "\u7537\u6027\u5263\u58EB" : "\u5973\u6027\u5263\u58EB"}
            style={battlePlayerSpriteStyle}
          />
          <img
            className={`edge-shade-overlay ${battlePlayerSpriteClasses}`}
            src={battlePlayerSprite}
            alt=""
            aria-hidden="true"
            style={battlePlayerSpriteStyle}
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
            key={bossDefeating ? "boss-defeated" : "boss-active"}
            className={`typhoon-boss-sprite ${bossDefeating ? "is-defeated" : ""}`}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && event.animationName === "boss-defeat-exit") completeBossDefeat();
            }}
          >
            <div className="typhoon-boss-art" style={{ transform: `translateX(${bossHorizontalOffset}px)` }}>
              <div key={`boss-hit-${bossHitEffect?.id || "idle"}`} className={`typhoon-boss-content ${bossHitEffect && !bossHitEffect.blocked ? "is-hit" : ""}`}>
              <img src={typhoonAppearance.src} alt={typhoonAppearance.name} className={`typhoon-strike-character ${bossFlipped ? "is-flipped" : ""}`} />
              <img src={typhoonAppearance.src} alt="" aria-hidden="true" className={`edge-shade-overlay typhoon-strike-character ${bossFlipped ? "is-flipped" : ""}`} />
                {bossHitEffect && <span
                  key={`boss-sparks-${bossHitEffect.id}`}
                  className="boss-hit-sparks"
                  style={{ left: `${damageTarget.x}%`, top: `${damageTarget.y}%` }}
                  aria-hidden="true"
                >{Array.from({ length: 16 }, (_, index) => <i key={index} style={{ "--spark-angle": `${index * 22.5 + (index % 2) * 7}deg`, "--spark-distance": `${-90 - (index % 4) * 20}px`, "--spark-length": `${7 + (index % 3) * 4}px`, "--spark-delay": `${(index % 3) * 0.015}s` }} />)}</span>}
              </div>
              {battleCommandsReady && focusModifierHeld && !bossDefeating && <span
                className={`boss-focus-marker ${focusTarget.id === "eyes" ? "is-eye" : ""}`}
                style={{ left: `${focusTarget.x}%`, top: `${focusTarget.y}%` }}
                aria-label={`${focusTarget.label}\u306b\u6ce8\u76ee\u4e2d`}
              />}
              {eyeBarrierActive && <span
                className="boss-eye-barrier-grid"
                style={{ left: `${eyeBarrierTarget.x}%`, top: `${eyeBarrierTarget.y}%`, "--eye-barrier-width": EYE_BARRIER_WIDTHS[bossType] || "30%" }}
                aria-label="\u76EE\u306E\u30D0\u30EA\u30A2"
              >{EYE_BARRIER_CELLS.map(([row, column], index) => {
                const revealOrder = eyeBarrierRevealOrder[index] ?? index;
                return <i
                key={index}
                style={{ gridRow: row + 1, gridColumn: column + 1, animationDelay: `${revealOrder * 80}ms` }}
                onAnimationEnd={revealOrder === EYE_BARRIER_CELLS.length - 1 ? (event) => {
                  if (event.animationName !== "boss-eye-barrier-cell" || eyeBarrierPhaseRef.current !== "revealing") return;
                  setEyeBarrierPhase("active");
                } : undefined}
              />;
              })}</span>}
              {bossHitEffect && <span
                key={`boss-damage-${bossHitEffect.id}`}
                className={`boss-damage-number ${bossHitEffect.critical ? "is-critical" : ""} ${bossHitEffect.blocked ? "is-blocked" : ""}`}
                style={{ left: `${damageTarget.x}%`, top: `${damageTarget.y}%` }}
                aria-live="polite"
              >{bossHitEffect.blocked ? "0" : <>{bossHitEffect.critical && <span className="boss-damage-critical">CRITICAL x3</span>}-{bossHitEffect.damage}</>}</span>}
            </div>
          </div>}
          {showBossGauge && <>
            <span className={`boss-character-name ${bossDefeating ? "is-defeated" : ""}`} style={{ left: `calc(50% + ${bossHorizontalOffset}px)` }}>{typhoonAppearance.name}</span>
            <span
              className={`boss-health-gauge ${bossDefeating ? "is-defeated" : ""}`}
              style={{ left: `calc(50% + ${bossHorizontalOffset}px)` }}
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
          <div className="battle-status-row">
            <div className="battle-player-portrait" aria-hidden="true">
              <img src={isMale ? "/player-male-card-clean.png" : "/player-female-card-clean.png"} alt="" />
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
            <button key={`fight-${battleActionPulse}`} disabled={eyeBarrierLocked} className={battleAction === "fight" ? "is-selected" : ""} onClick={() => executeBattleCommand("fight")}><kbd>{formatKeyBinding(getPrimaryBinding(keyBindings, "fight"))}</kbd><span>{"\u305F\u305F\u304B\u3046"}</span></button>
            <button key={`guard-${battleActionPulse}`} disabled={eyeBarrierLocked} className={battleAction === "guard" ? "is-selected" : ""} onClick={() => executeBattleCommand("guard")}><kbd>{formatKeyBinding(getPrimaryBinding(keyBindings, "guard"))}</kbd><span>{"\u307E\u3082\u308B"}</span></button>
            <button key={`heal-${battleActionPulse}`} disabled={eyeBarrierLocked || displayedSp < currentMaxSp / 3} className={battleAction === "heal" ? "is-selected" : ""} onClick={() => executeBattleCommand("heal")}><kbd>{formatKeyBinding(getPrimaryBinding(keyBindings, "heal"))}</kbd><span>{"\u56DE\u5FA9"}</span></button>
            <button
              key={`special-${battleActionPulse}`}
              disabled={eyeBarrierLocked || specialChargeProgress < 100}
              className={`battle-special-command${battleAction === "special" ? " is-selected" : ""}`}
              style={{ "--special-charge-progress": `${specialChargeProgress}%` }}
              aria-label={`\u5FC5\u6BBA\u6280\u3001\u30C1\u30E3\u30FC\u30B8${Math.round(specialChargeProgress)}%`}
              onClick={() => executeBattleCommand("special")}
            >
              <kbd>{formatKeyBinding(getPrimaryBinding(keyBindings, "special"))}</kbd>
              <span>{"\u5FC5\u6BBA\u6280"}</span>
            </button>
          </div>
        </section>}
      </div>}
    </section>
  );
}

