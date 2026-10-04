// 消費アイテム & 防災資材の定義
export const ITEMS = {
  // 回復アイテム
  potion_small: {
    id: "potion_small",
    name: "応急回復薬",
    category: "consumable",
    icon: "🧪",
    cost: 40,
    effect: { type: "heal_hp", value: 150 },
    description: "戦闘中や作業中のHPを150回復する。"
  },
  potion_large: {
    id: "potion_large",
    name: "高濃度スタミナ剤",
    category: "consumable",
    icon: "💉",
    cost: 120,
    effect: { type: "heal_hp", value: 400 },
    description: "HPを400、SPを20回復する。"
  },
  energy_tonic: {
    id: "energy_tonic",
    name: "気付けの特効薬",
    category: "consumable",
    icon: "⚡",
    cost: 90,
    effect: { type: "heal_sp", value: 50 },
    description: "SPを50回復し、スキルを素早く発動可能にする。"
  },

  // 防災資材（台風接近時の防衛イベントで使用）
  wind_net: {
    id: "wind_net",
    name: "高耐久防風ネット",
    category: "defense",
    icon: "🕸️",
    cost: 80,
    effect: { type: "wind_reduction", value: 0.5 },
    description: "農地に設置することで強風・暴風による作物の落果・倒伏被害を50%軽減。"
  },
  sandbag: {
    id: "sandbag",
    name: "大型止水土のう",
    category: "defense",
    icon: "🧱",
    cost: 70,
    effect: { type: "flood_reduction", value: 0.5 },
    description: "農地や建物の周囲に積むことで冠水・豪雨による浸水被害を50%軽減。"
  },
  building_reinforce: {
    id: "building_reinforce",
    name: "建物補強用金具＆飛散防止板",
    category: "defense",
    icon: "🛠️",
    cost: 150,
    effect: { type: "building_protection", value: 0.6 },
    description: "街の施設や自宅建物の被害を60%防ぐ。"
  },
  drain_pump: {
    id: "drain_pump",
    name: "ガソリン式強制排水ポンプ",
    category: "defense",
    icon: "⛽",
    cost: 250,
    effect: { type: "flood_reduction", value: 0.8 },
    description: "豪雨時に作物の浸水死をほぼ完全に防ぐ強力な排水設備。"
  },

  // 農業アイテム
  fertilizer: {
    id: "fertilizer",
    name: "速効性有機肥料",
    category: "farm",
    icon: "🌱",
    cost: 50,
    effect: { type: "growth_boost", value: 0.5 }, // 成長時間を半分に短縮
    description: "作物の成長スピードを2倍に加速させる。台風前の緊急収穫に最適。"
  }
};
