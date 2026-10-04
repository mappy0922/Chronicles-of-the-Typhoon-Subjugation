import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { PREFECTURES } from "../constants/prefectures";
import { WEAPONS, ARMORS } from "../constants/equipment";
import { ITEMS } from "../constants/items";
import { CROPS } from "../constants/crops";
import { HISTORICAL_TYPHOONS } from "../constants/typhoonTypes";
import { WeatherService } from "../services/WeatherService";
import { TyphoonGenerator } from "../services/TyphoonGenerator";
import { SoundManager } from "../services/SoundManager";

const GameContext = createContext(null);

const STORAGE_KEY = "TYPHOON_SUBJUGATION_SAVE_V1";

// 初期畑プロット (6面)
const INITIAL_PLOTS = [
  { id: 0, crop: "rice", plantedAt: Date.now() - 10000, growDuration: 25, stage: "growing" },
  { id: 1, crop: "vegetables", plantedAt: Date.now() - 5000, growDuration: 15, stage: "growing" },
  { id: 2, crop: null, plantedAt: null, growDuration: 0, stage: "empty" },
  { id: 3, crop: null, plantedAt: null, growDuration: 0, stage: "empty" },
  { id: 4, crop: null, plantedAt: null, growDuration: 0, stage: "empty" },
  { id: 5, crop: null, plantedAt: null, growDuration: 0, stage: "empty" }
];

export function GameProvider({ children }) {
  // 1. プレイヤー基本情報
  const [player, setPlayer] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.player;
      } catch (e) {
        console.error("Save load error", e);
      }
    }
    return {
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
  });

  // 2. 農地状態
  const [farmPlots, setFarmPlots] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.farmPlots) return parsed.farmPlots;
      } catch (e) {}
    }
    return INITIAL_PLOTS;
  });

  // 3. 防衛準備状態
  const [defenseActions, setDefenseActions] = useState({
    windNet: false,
    sandbag: false,
    buildingReinforce: false,
    drainPump: false
  });

  // 4. 気象・台風シミュレーション状態
  const [activeTyphoon, setActiveTyphoon] = useState(() => WeatherService.getActiveTyphoon("typhoon-201821"));
  const [typhoonPos, setTyphoonPos] = useState({ x: 180, y: 560 }); // 南海上からスタート
  const [isSimulatingMovement, setIsSimulatingMovement] = useState(true);
  const [proximityInfo, setProximityInfo] = useState({
    distanceKm: 800,
    alertPhase: "calm",
    warningLevel: "通常警戒",
    warningText: "台風は遠方に位置しています。",
    badgeColor: "#10b981"
  });

  // 5. 台風図鑑（過去の迎撃・防衛履歴）
  const [encyclopedia, setEncyclopedia] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.encyclopedia) return parsed.encyclopedia;
      } catch (e) {}
    }
    return [
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
  });

  // 6. 直前の戦闘・被害集計結果（結果画面用）
  const [lastResult, setLastResult] = useState(null);

  // 7. 現在のアクティブビュー ("home", "farm", "arena", "shop", "defense", "battle", "result", "encyclopedia")
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

  // セーブ保存
  const saveGame = useCallback(() => {
    const saveData = {
      player,
      farmPlots,
      encyclopedia
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
  }, [player, farmPlots, encyclopedia]);

  useEffect(() => {
    saveGame();
  }, [saveGame]);

  // 台風接近判定の定期更新
  useEffect(() => {
    const info = WeatherService.calculateProximity(typhoonPos, player.prefectureId);
    setProximityInfo(info);
  }, [typhoonPos, player.prefectureId]);

  // 台風の自動移動（シミュレーション時）
  useEffect(() => {
    if (!isSimulatingMovement) return;
    const interval = setInterval(() => {
      setTyphoonPos((prev) => {
        // 目標都道府県の座標に向かって徐々に北東へ北上
        const targetPref = PREFECTURES.find((p) => p.id === player.prefectureId) || PREFECTURES[13];
        const dx = targetPref.x - prev.x;
        const dy = targetPref.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 15) {
          // 直撃中。急激に東へ抜けていく
          return { x: prev.x + 3, y: prev.y - 1.5 };
        } else if (prev.y < 50 || prev.x > 550) {
          // 通過完了。南西沖で再発生
          return { x: 140, y: 550 };
        } else {
          // 北上
          const stepX = (dx / dist) * 1.5 + (Math.random() * 0.4 - 0.2);
          const stepY = (dy / dist) * 1.5 - 0.5;
          return { x: prev.x + stepX, y: prev.y + stepY };
        }
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isSimulatingMovement, player.prefectureId]);

  // 作物の成長タイマー
  useEffect(() => {
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
  }, []);

  // --- アクション関数群 ---

  // 都道府県変更
  const setPrefecture = (prefId) => {
    setPlayer((prev) => ({ ...prev, prefectureId: prefId }));
  };

  // 経験値獲得とレベルアップ判定
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

  // 所持金の変動
  const addMoney = (amount) => {
    setPlayer((prev) => ({ ...prev, money: Math.max(0, prev.money + amount) }));
  };

  // アイテム消費/追加
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

  // 作物植え付け
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

  // 作物収穫
  const harvestCrop = (plotId) => {
    const plot = farmPlots.find((p) => p.id === plotId);
    if (!plot || !plot.crop) return 0;

    const cropConfig = CROPS[plot.crop];
    const isReady = plot.stage === "ready";
    // 早期緊急収穫なら70%の売却価格、完熟なら100%
    const yieldMoney = Math.round(cropConfig.baseYield * (isReady ? 1.0 : 0.7));

    addMoney(yieldMoney);
    gainExp(isReady ? 25 : 10);
    SoundManager.playHarvest();

    setFarmPlots((prev) =>
      prev.map((p) => (p.id === plotId ? { ...p, crop: null, stage: "empty" } : p))
    );
    return yieldMoney;
  };

  // 肥料使用
  const applyFertilizer = (plotId) => {
    if ((player.inventory.fertilizer || 0) <= 0) return false;
    modifyItemCount("fertilizer", -1);
    setFarmPlots((prev) =>
      prev.map((p) => {
        if (p.id === plotId && p.crop && p.stage !== "ready") {
          return {
            ...p,
            plantedAt: p.plantedAt - p.growDuration * 500 // 半分進める
          };
        }
        return p;
      })
    );
    SoundManager.playClick();
    return true;
  };

  // 装備切り替え
  const equipWeapon = (weapon) => {
    setPlayer((prev) => ({ ...prev, equippedWeapon: weapon }));
    SoundManager.playClick();
  };

  const equipArmor = (armor) => {
    setPlayer((prev) => ({ ...prev, equippedArmor: armor }));
    SoundManager.playClick();
  };

  // 防衛アイテム設置
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

  // 台風プリセットのロード
  const loadTyphoonPreset = (presetId) => {
    const newBoss = WeatherService.getActiveTyphoon(presetId);
    setActiveTyphoon(newBoss);
    // 距離を適切な位置にリセット
    setTyphoonPos({ x: 200, y: 520 });
    SoundManager.playAlert();
  };

  // ランダム台風生成
  const spawnRandomTyphoon = () => {
    const newBoss = WeatherService.generateRandomTyphoon();
    setActiveTyphoon(newBoss);
    setTyphoonPos({ x: 200, y: 520 });
    SoundManager.playAlert();
  };

  // 台風図鑑への追加
  const addToEncyclopedia = (record) => {
    setEncyclopedia((prev) => [record, ...prev]);
  };

  return (
    <GameContext.Provider
      value={{
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
