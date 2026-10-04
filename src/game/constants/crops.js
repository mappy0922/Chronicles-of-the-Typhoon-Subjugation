// 農作物の定義
export const CROPS = {
  rice: {
    id: "rice",
    name: "稲作（コシヒカリ）",
    category: "穀物",
    icon: "🌾",
    growTime: 25, // 秒（ゲーム内テンポ調整）
    seedCost: 50,
    baseYield: 150, // 売却価格
    windResistance: 0.5, // 暴風への耐性（0:弱い〜1:強い）
    floodResistance: 0.7, // 水害への耐性
    description: "日本の主食。水には比較的耐性があるが、暴風で倒伏しやすい。"
  },
  vegetables: {
    id: "vegetables",
    name: "高原野菜（レタス・トマト）",
    category: "野菜",
    icon: "🥬",
    growTime: 15,
    seedCost: 30,
    baseYield: 90,
    windResistance: 0.3,
    floodResistance: 0.4,
    description: "成長が早いが、強風や豪雨に極めて弱い。台風前の早期収穫が有効。"
  },
  fruits: {
    id: "fruits",
    name: "高級果樹（巨峰・リンゴ）",
    category: "果物",
    icon: "🍎",
    growTime: 45,
    seedCost: 120,
    baseYield: 400,
    windResistance: 0.2,
    floodResistance: 0.6,
    description: "育てるのに時間がかかるが超高額。落果すると甚大な損害が出るため防風ネットが必須。"
  },
  special_wheat: {
    id: "special_wheat",
    name: "耐風金麦",
    category: "特殊作物",
    icon: "✨",
    growTime: 35,
    seedCost: 200,
    baseYield: 600,
    windResistance: 0.85,
    floodResistance: 0.8,
    description: "品種改良された強靭な麦。台風の猛威にも耐え抜く奇跡の作物。"
  }
};
