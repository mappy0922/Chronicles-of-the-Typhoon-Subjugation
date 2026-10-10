import React, { createContext, useContext, useState, useEffect } from "react";
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

  // 手動セーブデータの存在確認
  const [hasSaveData, setHasSaveData] = useState(() => {
    return !!localStorage.getItem(STORAGE_KEY);
  });

  // 最終手動セーブ日時
  const [lastSavedTime, setLastSavedTime] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.savedAtStr || null;
      } catch (e) {}
    }
    return null;
  });

  // セーブデータ概要
  const [saveSummary, setSaveSummary] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const pref = PREFECTURES.find((p) => p.id === parsed.player?.prefectureId)?.name || "神奈川県";
        return `Lv.${parsed.player?.level || 1} 守護士 / ${parsed.player?.money || 500}G / 拠点: ${pref}`;
      } catch (e) {}
    }
    return null;
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
  const [weatherInfo, setWeatherInfo] = useState({ status: "loading", rainIntensity: 0, cloudiness: 0.04, stormIntensity: 0 });
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

  // 8. 都道府県変更モーダル
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);

  // ステータス合算計算
  const computedStats = {
    atk: player.baseAtk + (player.equippedWeapon?.attack || 0),
    def: player.baseDef + (player.equippedWeapon?.defense || 0) + (player.equippedArmor?.defense || 0),
    spd: player.baseSpd + (player.equippedWeapon?.speed || 0),
    maxHp: player.maxHp + (player.equippedArmor?.hpBonus || 0)
  };

  // --- 手動セーブ実行関数（自動セーブは行わない） ---
  const manualSave = () => {
    const timeStr = new Date().toLocaleString("ja-JP");
    const saveData = {
      player,
      farmPlots,
      defenseActions,
      encyclopedia,
      savedAt: Date.now(),
      savedAtStr: timeStr
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    setHasSaveData(true);
    setLastSavedTime(timeStr);
    const pref = PREFECTURES.find((p) => p.id === player.prefectureId)?.name || "神奈川県";
    setSaveSummary(`Lv.${player.level} 守護士 / ${player.money}G / 拠点: ${pref}`);
    return true;
  };

  // 台風接近判定の定期更新
  useEffect(() => {
    let isActive = true;
    const refreshWeather = async () => {
      const result = await JmaWeatherService.getLocalConditions(player.prefectureId);
      if (!isActive) return;
      setWeatherInfo(result.weatherInfo);
      setProximityInfo(result.proximityInfo);
    };
    refreshWeather();
    const interval = window.setInterval(refreshWeather, 30 * 60 * 1000);
    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [player.prefectureId]);

  // 台風の自動移動（本編プレイ時のみ）
  // 作物の成長タイマー（本編プレイ時のみ）
  useEffect(() => {
    if (isInTitleScreen || isInIntroSequence) return;
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
  }, [isInTitleScreen, isInIntroSequence]);

  // --- ゲーム起動・終了関連 ---

  // New Game: データを完全初期化し、導入シーケンスを開始（効果音なしで静かに移行）
  const startNewGame = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSaveData(false);
    setLastSavedTime(null);
    setSaveSummary(null);

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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.player) setPlayer({ ...DEFAULT_PLAYER, ...parsed.player, appearance: { ...DEFAULT_APPEARANCE, ...parsed.player.appearance } });
        if (parsed.farmPlots) setFarmPlots(parsed.farmPlots);
        if (parsed.defenseActions) setDefenseActions(parsed.defenseActions);
        if (parsed.encyclopedia) setEncyclopedia(parsed.encyclopedia);
      } catch (e) {
        console.error("Continue error", e);
      }
    }
    setIsInTitleScreen(false);
    setIsInIntroSequence(false);
    setCurrentView("home");
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
        lastSavedTime,
        saveSummary,
        manualSave,
        startNewGame,
        continueGame,
        quitGame,
        returnToTitle,
        isQuitModalOpen,
        setIsQuitModalOpen,
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
