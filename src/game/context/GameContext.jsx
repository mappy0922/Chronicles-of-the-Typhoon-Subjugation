import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { PREFECTURES } from "../constants/prefectures";
import { WEAPONS, ARMORS } from "../constants/equipment";
import { CROPS } from "../constants/crops";
import { HISTORICAL_TYPHOONS } from "../constants/typhoonTypes";
import { WeatherService } from "../services/WeatherService";
import { JmaWeatherService } from "../services/JmaWeatherService";
import { SoundManager } from "../services/SoundManager";
import { DEFAULT_APPEARANCE } from "../../components/PlayerAvatar";

const GameContext = createContext(null);

const STORAGE_KEY = "TYPHOON_SUBJUGATION_MANUAL_SAVE_V1";
const SAVE_SLOTS_KEY = "TYPHOON_SUBJUGATION_SAVE_SLOTS_V1";
const MAX_SAVE_SLOTS = 10;
const WEATHER_CONTROL_KEY = "TYPHOON_SUBJUGATION_FORCED_WEATHER_V1";
const COMBAT_SUNNY_HOLD_KEY = "TYPHOON_SUBJUGATION_COMBAT_SUNNY_HOLD_V1";
const WEATHER_PRESETS = {
  sunny: { weatherText: "晴れ", isRaining: false, rainIntensity: 0, cloudiness: 0.02, stormIntensity: 0, nightIntensity: 0 },
  breeze: { weatherText: "そよかぜ型", isRaining: true, rainIntensity: 0.12, cloudiness: 0.22, stormIntensity: 0.16, nightIntensity: 1 },
  heavyRain: { weatherText: "豪雨型", isRaining: true, rainIntensity: 0.82, cloudiness: 0.8, stormIntensity: 0.42, nightIntensity: 1 },
  gale: { weatherText: "暴風型", isRaining: true, rainIntensity: 0.48, cloudiness: 0.78, stormIntensity: 0.78, nightIntensity: 1 },
  storm: { weatherText: "嵐型", isRaining: true, rainIntensity: 0.78, cloudiness: 0.92, stormIntensity: 0.9, nightIntensity: 1 },
  superTyphoon: { weatherText: "超大型型", isRaining: true, rainIntensity: 1, cloudiness: 1, stormIntensity: 1, nightIntensity: 1 }
};

// 初期プレイヤーデータ
const DEFAULT_PLAYER = {
  appearance: { ...DEFAULT_APPEARANCE },
  name: "気象守護士",
  prefectureId: 14, // 神奈川県 (初期値)
  level: 1,
  exp: 0,
  nextExp: 100,
  money: 500,
  maxHp: 500,
  currentHp: 500,
  maxSp: 100,
  currentSp: 100,
  baseAtk: 40,
  baseDef: 20,
  baseSpd: 30,
  equippedWeapon: WEAPONS[0], // 銅剣
  equippedArmor: ARMORS[0],  // 防風着
  inventory: {
    wind_net: 2,
    sandbag: 2,
    building_reinforce: 1,
    potion_small: 3,
    fertilizer: 2
  },
  ownedWeapons: [WEAPONS[0], WEAPONS[2], WEAPONS[4]], // 剣・弓・盾を初期所持
  ownedArmors: [ARMORS[0]]
};

const createEmptySaveSlots = () => Array.from({ length: MAX_SAVE_SLOTS }, () => null);

const readSaveSlots = () => {
  try {
    const savedSlots = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY) || "null");
    if (Array.isArray(savedSlots)) {
      return Array.from({ length: MAX_SAVE_SLOTS }, (_, index) => savedSlots[index] || null);
    }
    const legacySave = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const slots = createEmptySaveSlots();
    if (legacySave?.player) slots[0] = legacySave;
    return slots;
  } catch {
    return createEmptySaveSlots();
  }
};

const newestSavedSlot = (slots) => slots
  .map((save, index) => save ? { save, index } : null)
  .filter(Boolean)
  .sort((a, b) => (b.save.savedAt || 0) - (a.save.savedAt || 0))[0] || null;

// 初期畑プロット (6面)
const DEFAULT_PLOTS = [
  { id: 0, crop: "rice", plantedAt: Date.now() - 10000, growDuration: 25, stage: "growing" },
  { id: 1, crop: "vegetables", plantedAt: Date.now() - 5000, growDuration: 15, stage: "growing" },
  { id: 2, crop: null, plantedAt: null, growDuration: 0, stage: "empty" },
  { id: 3, crop: null, plantedAt: null, growDuration: 0, stage: "empty" },
  { id: 4, crop: null, plantedAt: null, growDuration: 0, stage: "empty" },
  { id: 5, crop: null, plantedAt: null, growDuration: 0, stage: "empty" }
];

const DEFAULT_ENCYCLOPEDIA = [
  {
    id: "archive-1",
    name: "台風15号（2019年・令和元年房総半島台風）",
    type: "gale",
    maxWind: 57.5,
    defenseScore: 82,
    date: "2026/08/15",
    status: "防衛成功"
  }
];

export function GameProvider({ children }) {
  // 画面遷移モード
  const [isInTitleScreen, setIsInTitleScreen] = useState(true);
  const [isInIntroSequence, setIsInIntroSequence] = useState(false);
  const [isInCharacterCreation, setIsInCharacterCreation] = useState(false);
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBattleActive, setIsBattleActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isPausedRef = useRef(isPaused);
  const pauseStartedAtRef = useRef(null);
  isPausedRef.current = isPaused;

  const [saveSlots, setSaveSlots] = useState(readSaveSlots);
  const [hasSaveData, setHasSaveData] = useState(() => saveSlots.some(Boolean));

  // 最終手動セーブ日時
  const [lastSavedTime, setLastSavedTime] = useState(() => {
    return newestSavedSlot(saveSlots)?.save.savedAtStr || null;
  });

  // セーブデータ概要
  const [saveSummary, setSaveSummary] = useState(() => {
    const latest = newestSavedSlot(saveSlots)?.save;
    if (!latest) return null;
    const pref = PREFECTURES.find((p) => p.id === latest.player?.prefectureId)?.name || "神奈川県";
    return `Lv.${latest.player?.level || 1} 守護士 / ${latest.player?.money || 500}G / 拠点: ${pref}`;
  });

  // 1. プレイヤー基本情報
  const [player, setPlayer] = useState(DEFAULT_PLAYER);

  // 2. 農地状態
  const [farmPlots, setFarmPlots] = useState(DEFAULT_PLOTS);

  // 3. 防衛準備状態
  const [defenseActions, setDefenseActions] = useState({
    windNet: false,
    sandbag: false,
    buildingReinforce: false,
    drainPump: false
  });

  // 4. 気象・台風シミュレーション状態
  const [activeTyphoon, setActiveTyphoon] = useState(() => WeatherService.getActiveTyphoon("typhoon-201821"));
  const [typhoonPos, setTyphoonPos] = useState({ x: 180, y: 560 });
  const [weatherInfo, setWeatherInfo] = useState({ status: "loading", isRaining: false, rainIntensity: 0, cloudiness: 0.04, stormIntensity: 0 });
  const weatherInfoRef = useRef(weatherInfo);
  const jmaWeatherInfoRef = useRef(null);
  const jmaProximityInfoRef = useRef(null);
  const savedCombatSunnyHoldRef = useRef(undefined);
  if (savedCombatSunnyHoldRef.current === undefined) {
    try { savedCombatSunnyHoldRef.current = JSON.parse(localStorage.getItem(COMBAT_SUNNY_HOLD_KEY) || "null"); }
    catch { savedCombatSunnyHoldRef.current = null; }
  }
  const sunnyUntilNextTyphoonRef = useRef(Boolean(savedCombatSunnyHoldRef.current?.active));
  const typhoonAtCombatEndRef = useRef(savedCombatSunnyHoldRef.current?.typhoonName || null);
  const weatherTransitionRef = useRef(null);
  const refreshJmaWeatherRef = useRef(null);
  const returnWeatherToSunnyAfterCombat = () => window.dispatchEvent(new Event("typhoon-combat-ended"));
  useEffect(() => {
    if (!sunnyUntilNextTyphoonRef.current) return;
    const sunnyWeather = { ...WEATHER_PRESETS.sunny, status: "available", adminForced: false };
    weatherInfoRef.current = sunnyWeather;
    setWeatherInfo(sunnyWeather);
    setProximityInfo({ distanceKm: 9999, alertPhase: "calm", warningLevel: "平常", warningText: "次の台風情報を確認しています。", badgeColor: "#10b981" });
  }, []);
  useEffect(() => { weatherInfoRef.current = weatherInfo; }, [weatherInfo]);
  useEffect(() => {
    document.documentElement.classList.toggle("game-paused", isPaused);
    return () => document.documentElement.classList.remove("game-paused");
  }, [isPaused]);
  const [proximityInfo, setProximityInfo] = useState({
    distanceKm: 800,
    alertPhase: "calm",
    warningLevel: "通常警戒",
    warningText: "台風は遠方に位置しています。",
    badgeColor: "#10b981"
  });

  // 5. 台風図鑑
  const [encyclopedia, setEncyclopedia] = useState(DEFAULT_ENCYCLOPEDIA);

  // 6. 直前の戦闘・被害集計結果
  const [lastResult, setLastResult] = useState(null);

  // 7. 現在のアクティブビュー ("home", "farm", "arena", "shop", "defense", "battle", "result", "encyclopedia", "save")
  const [currentView, setCurrentView] = useState("home");
  const playTimeRef = useRef(0);

  // 8. 都道府県変更モーダル
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);

  // ステータス合算計算
  const computedStats = {
    atk: player.baseAtk + (player.equippedWeapon?.attack || 0),
    def: player.baseDef + (player.equippedWeapon?.defense || 0) + (player.equippedArmor?.defense || 0),
    spd: player.baseSpd + (player.equippedWeapon?.speed || 0),
    maxHp: player.maxHp + (player.equippedArmor?.hpBonus || 0)
  };

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(saveSlots));
    } catch (error) {
      console.error("Save slot storage error", error);
    }
    setHasSaveData(saveSlots.some(Boolean));
    const latest = newestSavedSlot(saveSlots)?.save;
    setLastSavedTime(latest?.savedAtStr || null);
    if (latest?.player) {
      const pref = PREFECTURES.find((item) => item.id === latest.player.prefectureId)?.name || "神奈川県";
      setSaveSummary(`Lv.${latest.player.level || 1} 守護士 / ${latest.player.money || 500}G / 拠点: ${pref}`);
    } else {
      setSaveSummary(null);
    }
  }, [saveSlots]);

  useEffect(() => {
    if (isInTitleScreen || isInIntroSequence || isInCharacterCreation || isPaused) return undefined;
    let previousTime = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      playTimeRef.current += now - previousTime;
      previousTime = now;
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isInTitleScreen, isInIntroSequence, isInCharacterCreation, isPaused]);

  // --- 手動セーブ実行関数（自動セーブは行わない） ---
  const manualSave = (slotIndex = 0) => {
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= MAX_SAVE_SLOTS) return false;
    const savedAt = Date.now();
    const timeStr = new Date(savedAt).toLocaleString("ja-JP");
    const saveData = {
      version: 2,
      slotNumber: slotIndex + 1,
      player,
      farmPlots,
      defenseActions,
      encyclopedia,
      activeTyphoon,
      typhoonPos,
      weatherInfo,
      proximityInfo,
      lastResult,
      currentView: currentView === "battle" || currentView === "save" ? "home" : currentView,
      playTimeMs: playTimeRef.current,
      defeatedEnemy: lastResult?.typhoon || saveSlots[slotIndex]?.defeatedEnemy || null,
      savedAt,
      savedAtStr: timeStr
    };
    const nextSlots = [...saveSlots];
    nextSlots[slotIndex] = saveData;
    try {
      localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(nextSlots));
    } catch (error) {
      console.error("Manual save error", error);
      return false;
    }
    setSaveSlots(nextSlots);
    return true;
  };

  const restoreSaveData = (parsed) => {
    if (parsed.player) setPlayer({ ...DEFAULT_PLAYER, ...parsed.player, appearance: { ...DEFAULT_APPEARANCE, ...parsed.player.appearance } });
    if (parsed.farmPlots) setFarmPlots(parsed.farmPlots);
    if (parsed.defenseActions) setDefenseActions(parsed.defenseActions);
    if (parsed.encyclopedia) setEncyclopedia(parsed.encyclopedia);
    if (parsed.activeTyphoon) setActiveTyphoon(parsed.activeTyphoon);
    if (parsed.typhoonPos) setTyphoonPos(parsed.typhoonPos);
    if (parsed.weatherInfo && !sunnyUntilNextTyphoonRef.current && !jmaWeatherInfoRef.current) {
      weatherInfoRef.current = parsed.weatherInfo;
      setWeatherInfo(parsed.weatherInfo);
    }
    if (parsed.proximityInfo && !sunnyUntilNextTyphoonRef.current && !jmaProximityInfoRef.current) setProximityInfo(parsed.proximityInfo);
    setLastResult(parsed.lastResult || null);
    const allowedViews = ["home", "farm", "arena", "shop", "defense", "result", "encyclopedia", "save"];
    setCurrentView(allowedViews.includes(parsed.currentView) ? parsed.currentView : "home");
    playTimeRef.current = Number(parsed.playTimeMs) || 0;
    setIsInTitleScreen(false);
    setIsInIntroSequence(false);
    setIsInCharacterCreation(false);
  };

  const loadSaveSlot = (slotIndex) => {
    const saved = saveSlots[slotIndex];
    if (!saved) return false;
    try {
      restoreSaveData(saved);
      return true;
    } catch (error) {
      console.error("Save slot load error", error);
      return false;
    }
  };

  // 台風接近判定の定期更新
  useEffect(() => {
    let isActive = true;
    const refreshWeather = async () => {
      const result = await JmaWeatherService.getLocalConditions(player.prefectureId);
      if (!isActive) return;
      jmaWeatherInfoRef.current = result.weatherInfo;
      jmaProximityInfoRef.current = result.proximityInfo;
      if (sunnyUntilNextTyphoonRef.current) {
        const nextTyphoonName = result.weatherInfo.typhoonName;
        if (!nextTyphoonName || nextTyphoonName === typhoonAtCombatEndRef.current) {
          setProximityInfo({ distanceKm: 9999, alertPhase: "calm", warningLevel: "平常", warningText: "台風情報を確認しています。", badgeColor: "#10b981" });
          return;
        }
        sunnyUntilNextTyphoonRef.current = false;
        typhoonAtCombatEndRef.current = null;
        localStorage.removeItem(COMBAT_SUNNY_HOLD_KEY);
        if (!localStorage.getItem(WEATHER_CONTROL_KEY)) {
          if (weatherTransitionRef.current) weatherTransitionRef.current(result.weatherInfo, { proximityInfo: result.proximityInfo });
          else {
            setWeatherInfo(result.weatherInfo);
            setProximityInfo(result.proximityInfo);
          }
        }
        return;
      }
      if (!localStorage.getItem(WEATHER_CONTROL_KEY)) setWeatherInfo(result.weatherInfo);
      setProximityInfo(result.proximityInfo);
    };
    refreshJmaWeatherRef.current = refreshWeather;
    refreshWeather();
    const interval = window.setInterval(refreshWeather, 30 * 60 * 1000);
    return () => {
      isActive = false;
      refreshJmaWeatherRef.current = null;
      window.clearInterval(interval);
    };
  }, [player.prefectureId]);

  // 管理画面から受け取った天候を、複数タブ間で同期して滑らかに反映する。
  useEffect(() => {
    let frameId = 0;
    let activeTransition = null;
    const channel = "BroadcastChannel" in window ? new BroadcastChannel("typhoon-weather-control") : null;

    const transitionWeather = (target, options = {}) => {
      if (!target) return;
      cancelAnimationFrame(frameId);
      const start = { ...weatherInfoRef.current };
      let startedAt = performance.now();
      const duration = 4200;
      let pausedAt = null;
      activeTransition = () => {
        if (isPausedRef.current) {
          if (pausedAt === null) pausedAt = performance.now();
          frameId = requestAnimationFrame(activeTransition);
          return;
        }
        if (pausedAt !== null) {
          const pausedDuration = performance.now() - pausedAt;
          pausedAt = null;
          startedAt += pausedDuration;
        }
        const progress = Math.min(1, (performance.now() - startedAt) / duration);
        const eased = progress * progress * (3 - 2 * progress);
        const interpolate = (key) => (Number(start[key]) || 0) + ((Number(target[key]) || 0) - (Number(start[key]) || 0)) * eased;
        const nextWeather = {
          ...weatherInfoRef.current,
          status: "ready",
          weatherText: options.weatherText ?? target.weatherText,
          isRaining: interpolate("rainIntensity") > 0.015,
          rainIntensity: interpolate("rainIntensity"),
          cloudiness: interpolate("cloudiness"),
          stormIntensity: interpolate("stormIntensity"),
          nightIntensity: interpolate("nightIntensity"),
          typhoonName: options.typhoonName ?? target.typhoonName ?? null,
          distanceKm: options.distanceKm ?? target.distanceKm ?? null,
          adminForced: options.adminForced ?? target.adminForced ?? false
        };
        weatherInfoRef.current = nextWeather;
        setWeatherInfo(nextWeather);
        if (progress < 1) frameId = requestAnimationFrame(activeTransition);
        else if (options.proximityInfo) setProximityInfo(options.proximityInfo);
      };
      frameId = requestAnimationFrame(activeTransition);
    };
    weatherTransitionRef.current = transitionWeather;

    const onCombatEnded = () => {
      const adminForced = Boolean(weatherInfoRef.current.adminForced || localStorage.getItem(WEATHER_CONTROL_KEY));
      if (adminForced) {
        sunnyUntilNextTyphoonRef.current = false;
        typhoonAtCombatEndRef.current = null;
        localStorage.removeItem(COMBAT_SUNNY_HOLD_KEY);
        const sunnyMessage = { preset: "sunny" };
        try { localStorage.setItem(WEATHER_CONTROL_KEY, JSON.stringify(sunnyMessage)); } catch { /* ignore storage errors */ }
        channel?.postMessage(sunnyMessage);
      } else {
        sunnyUntilNextTyphoonRef.current = true;
        typhoonAtCombatEndRef.current = weatherInfoRef.current.typhoonName || jmaWeatherInfoRef.current?.typhoonName || null;
        try {
          localStorage.setItem(COMBAT_SUNNY_HOLD_KEY, JSON.stringify({ active: true, typhoonName: typhoonAtCombatEndRef.current }));
        } catch { /* ignore storage errors */ }
        setProximityInfo({ distanceKm: 9999, alertPhase: "calm", warningLevel: "平常", warningText: "次の台風情報を確認しています。", badgeColor: "#10b981" });
      }
      transitionWeather({ ...WEATHER_PRESETS.sunny, status: "available" }, {
        weatherText: "晴れ",
        typhoonName: null,
        distanceKm: null,
        adminForced
      });
    };

    const transitionToPreset = (message) => {
      const target = WEATHER_PRESETS[message?.preset];
      if (!target) return;
      sunnyUntilNextTyphoonRef.current = false;
      typhoonAtCombatEndRef.current = null;
      localStorage.removeItem(COMBAT_SUNNY_HOLD_KEY);
      transitionWeather(target, {
        weatherText: target.weatherText,
        typhoonName: message.preset === "sunny" ? null : target.weatherText,
        distanceKm: message.preset === "sunny" ? null : 0,
        adminForced: true
      });
    };
    const transitionToJma = () => {
      sunnyUntilNextTyphoonRef.current = false;
      typhoonAtCombatEndRef.current = null;
      localStorage.removeItem(COMBAT_SUNNY_HOLD_KEY);
      const target = jmaWeatherInfoRef.current || {
        status: "loading", weatherText: "気象庁データ取得中", isRaining: false,
        rainIntensity: 0, cloudiness: 0.04, stormIntensity: 0, nightIntensity: 0,
        typhoonName: null, distanceKm: null
      };
      transitionWeather(target, { proximityInfo: jmaProximityInfoRef.current });
    };
    const onMessage = (event) => {
      if (event.data?.action === "clear") transitionToJma();
      else transitionToPreset(event.data);
    };
    const onStorage = (event) => {
      if (event.key !== WEATHER_CONTROL_KEY) return;
      if (!event.newValue) {
        if (!channel) transitionToJma();
        return;
      }
      try { transitionToPreset(JSON.parse(event.newValue)); } catch { /* ignore invalid stored state */ }
    };
    channel?.addEventListener("message", onMessage);
    window.addEventListener("typhoon-combat-ended", onCombatEnded);
    window.addEventListener("storage", onStorage);
    try {
      const saved = localStorage.getItem(WEATHER_CONTROL_KEY);
      if (saved) transitionToPreset(JSON.parse(saved));
    } catch { /* ignore invalid stored state */ }
    return () => {
      cancelAnimationFrame(frameId);
      channel?.removeEventListener("message", onMessage);
      window.removeEventListener("typhoon-combat-ended", onCombatEnded);
      weatherTransitionRef.current = null;
      channel?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // 台風の自動移動（本編プレイ時のみ）
  // 作物の成長タイマー（本編プレイ時のみ）
  useEffect(() => {
    if (isPaused) {
      pauseStartedAtRef.current = Date.now();
      return;
    }
    if (pauseStartedAtRef.current === null) return;
    const pausedDuration = Date.now() - pauseStartedAtRef.current;
    pauseStartedAtRef.current = null;
    setFarmPlots((plots) => plots.map((plot) =>
      plot.crop && plot.stage !== "ready" && plot.plantedAt
        ? { ...plot, plantedAt: plot.plantedAt + pausedDuration }
        : plot
    ));
  }, [isPaused]);

  useEffect(() => {
    if (isInTitleScreen || isInIntroSequence || isPaused) return;
    const interval = setInterval(() => {
      setFarmPlots((prevPlots) =>
        prevPlots.map((plot) => {
          if (!plot.crop || plot.stage === "ready") return plot;
          const elapsed = (Date.now() - plot.plantedAt) / 1000;
          if (elapsed >= plot.growDuration) {
            return { ...plot, stage: "ready" };
          }
          return plot;
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [isInTitleScreen, isInIntroSequence, isPaused]);

  // --- ゲーム起動・終了関連 ---

  // New Game: データを完全初期化し、導入シーケンスを開始（効果音なしで静かに移行）
  const startNewGame = () => {
    playTimeRef.current = 0;
    setSaveSlots(createEmptySaveSlots());
    try {
      localStorage.removeItem(SAVE_SLOTS_KEY);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(COMBAT_SUNNY_HOLD_KEY);
      localStorage.removeItem(WEATHER_CONTROL_KEY);
    } catch (error) {
      console.error("Could not clear save slots", error);
    }
    sunnyUntilNextTyphoonRef.current = false;
    typhoonAtCombatEndRef.current = null;
    refreshJmaWeatherRef.current?.();
    setIsPaused(false);
    setLastResult(null);
    setCurrentView("home");
    setPlayer(DEFAULT_PLAYER);
    setFarmPlots(DEFAULT_PLOTS);
    setEncyclopedia(DEFAULT_ENCYCLOPEDIA);
    setDefenseActions({
      windNet: false,
      sandbag: false,
      buildingReinforce: false,
      drainPump: false
    });
    setTyphoonPos({ x: 180, y: 560 });
    
    setIsInTitleScreen(false);
    setIsInIntroSequence(false);
    setIsInCharacterCreation(true);
  };

  // 導入シーケンス完了時（無音で本編へ）
  const finishIntroSequence = () => {
    setIsInIntroSequence(false);
    setCurrentView("home");
  };

  const completeCharacterCreation = () => {
    setIsInCharacterCreation(false);
    setIsInIntroSequence(true);
  };

  // Continue: 手動セーブデータを復元して開始（無音で本編へ）
  const continueGame = () => {
    const latest = newestSavedSlot(saveSlots);
    if (latest) loadSaveSlot(latest.index);
    else {
      setIsInTitleScreen(false);
      setIsInIntroSequence(false);
      setCurrentView("home");
    }
  };

  // Quit Game: タブを閉じる
  const quitGame = () => {
    try {
      window.close();
    } catch (e) {}
    setIsQuitModalOpen(true);
  };

  // タイトル画面へ戻る
  const returnToTitle = () => {
    setIsInTitleScreen(true);
    setIsInIntroSequence(false);
    setIsInCharacterCreation(false);
  };

  // --- アクション関数群 ---

  const setPrefecture = (prefId) => {
    setPlayer((prev) => ({ ...prev, prefectureId: prefId }));
  };

  const gainExp = (amount) => {
    setPlayer((prev) => {
      let exp = prev.exp + amount;
      let level = prev.level;
      let nextExp = prev.nextExp;
      let maxHp = prev.maxHp;
      let baseAtk = prev.baseAtk;
      let baseDef = prev.baseDef;
      let baseSpd = prev.baseSpd;

      while (exp >= nextExp) {
        exp -= nextExp;
        level += 1;
        nextExp = Math.round(nextExp * 1.4);
        maxHp += 40;
        baseAtk += 8;
        baseDef += 5;
        baseSpd += 3;
      }

      return {
        ...prev,
        level,
        exp,
        nextExp,
        maxHp,
        currentHp: maxHp,
        baseAtk,
        baseDef,
        baseSpd
      };
    });
  };

  const addMoney = (amount) => {
    setPlayer((prev) => ({ ...prev, money: Math.max(0, prev.money + amount) }));
  };

  const modifyItemCount = (itemId, delta) => {
    setPlayer((prev) => {
      const current = prev.inventory[itemId] || 0;
      const nextCount = Math.max(0, current + delta);
      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          [itemId]: nextCount
        }
      };
    });
  };

  const plantCrop = (plotId, cropId) => {
    const cropConfig = CROPS[cropId];
    if (!cropConfig || player.money < cropConfig.seedCost) return false;

    addMoney(-cropConfig.seedCost);
    setFarmPlots((prev) =>
      prev.map((plot) =>
        plot.id === plotId
          ? {
              ...plot,
              crop: cropId,
              plantedAt: Date.now(),
              growDuration: cropConfig.growTime,
              stage: "growing"
            }
          : plot
      )
    );
    SoundManager.playClick();
    return true;
  };

  const harvestCrop = (plotId) => {
    const plot = farmPlots.find((p) => p.id === plotId);
    if (!plot || !plot.crop) return 0;

    const cropConfig = CROPS[plot.crop];
    const isReady = plot.stage === "ready";
    const yieldMoney = Math.round(cropConfig.baseYield * (isReady ? 1.0 : 0.7));

    addMoney(yieldMoney);
    gainExp(isReady ? 25 : 10);
    SoundManager.playHarvest();

    setFarmPlots((prev) =>
      prev.map((p) => (p.id === plotId ? { ...p, crop: null, stage: "empty" } : p))
    );
    return yieldMoney;
  };

  const applyFertilizer = (plotId) => {
    if ((player.inventory.fertilizer || 0) <= 0) return false;
    modifyItemCount("fertilizer", -1);
    setFarmPlots((prev) =>
      prev.map((p) => {
        if (p.id === plotId && p.crop && p.stage !== "ready") {
          return {
            ...p,
            plantedAt: p.plantedAt - p.growDuration * 500
          };
        }
        return p;
      })
    );
    SoundManager.playClick();
    return true;
  };

  const equipWeapon = (weapon) => {
    setPlayer((prev) => ({ ...prev, equippedWeapon: weapon }));
    SoundManager.playClick();
  };

  const equipArmor = (armor) => {
    setPlayer((prev) => ({ ...prev, equippedArmor: armor }));
    SoundManager.playClick();
  };

  const toggleDefenseAction = (actionKey, requiredItemId) => {
    const isCurrentlyActive = defenseActions[actionKey];
    if (isCurrentlyActive) {
      setDefenseActions((prev) => ({ ...prev, [actionKey]: false }));
      if (requiredItemId) modifyItemCount(requiredItemId, 1);
    } else {
      if (requiredItemId && (player.inventory[requiredItemId] || 0) <= 0) {
        return false;
      }
      if (requiredItemId) modifyItemCount(requiredItemId, -1);
      setDefenseActions((prev) => ({ ...prev, [actionKey]: true }));
      SoundManager.playClick();
    }
    return true;
  };

  const loadTyphoonPreset = (presetId) => {
    const newBoss = WeatherService.getActiveTyphoon(presetId);
    setActiveTyphoon(newBoss);
    setTyphoonPos({ x: 200, y: 520 });
    SoundManager.playAlert();
  };

  const spawnRandomTyphoon = () => {
    const newBoss = WeatherService.generateRandomTyphoon();
    setActiveTyphoon(newBoss);
    setTyphoonPos({ x: 200, y: 520 });
    SoundManager.playAlert();
  };

  const addToEncyclopedia = (record) => {
    setEncyclopedia((prev) => [record, ...prev]);
  };

  return (
    <GameContext.Provider
      value={{
        isInTitleScreen,
        setIsInTitleScreen,
        isInIntroSequence,
        isInCharacterCreation,
        finishIntroSequence,
        completeCharacterCreation,
        hasSaveData,
        saveSlots,
        lastSavedTime,
        saveSummary,
        manualSave,
        loadSaveSlot,
        startNewGame,
        continueGame,
        quitGame,
        returnToTitle,
        isQuitModalOpen,
        setIsQuitModalOpen,
        isPaused,
        setIsPaused,
        isBattleActive,
        setIsBattleActive,
        returnWeatherToSunnyAfterCombat,
        isLoading,
        setIsLoading,
        player,
        setPlayer,
        computedStats,
        gainExp,
        addMoney,
        modifyItemCount,
        farmPlots,
        plantCrop,
        harvestCrop,
        applyFertilizer,
        equipWeapon,
        equipArmor,
        defenseActions,
        toggleDefenseAction,
        activeTyphoon,
        typhoonPos,
        setTyphoonPos,
        proximityInfo,
        weatherInfo,
        loadTyphoonPreset,
        spawnRandomTyphoon,
        encyclopedia,
        addToEncyclopedia,
        lastResult,
        setLastResult,
        currentView,
        setCurrentView,
        isPrefModalOpen,
        setIsPrefModalOpen,
        setPrefecture
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
}
