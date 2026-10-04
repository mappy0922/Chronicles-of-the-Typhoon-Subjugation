// 武器・装備の定義
export const WEAPONS = [
  {
    id: "bronze_sword",
    name: "討伐の銅剣",
    type: "sword",
    attack: 45,
    defense: 5,
    speed: 15,
    cost: 150,
    icon: "🗡️",
    description: "新米討伐士に支給される頑丈な剣。",
    skill: {
      name: "烈風斬",
      cost: 15,
      power: 1.6,
      desc: "風の刃を纏い、敵に大ダメージを与える。"
    }
  },
  {
    id: "wind_cutter",
    name: "疾風切（しっぷうきり）",
    type: "sword",
    attack: 95,
    defense: 15,
    speed: 25,
    cost: 650,
    icon: "⚔️",
    description: "暴風の気流を切り裂く名刀。暴風型の敵に特効。",
    skill: {
      name: "断気圧一閃",
      cost: 25,
      power: 2.2,
      desc: "台風の気圧渦を両断し、敵の攻撃力を2ターン低下させる。"
    }
  },
  {
    id: "hunter_bow",
    name: "狩人の長弓",
    type: "bow",
    attack: 40,
    defense: 0,
    speed: 30,
    cost: 180,
    icon: "🏹",
    description: "遠距離から安全に敵を狙う弓。",
    skill: {
      name: "豪雨貫通矢",
      cost: 18,
      power: 1.5,
      desc: "暴風雨の乱気流をものともせず急所を射抜く。"
    }
  },
  {
    id: "eye_piercer",
    name: "天眼弓（てんがんきゅう）",
    type: "bow",
    attack: 85,
    defense: 10,
    speed: 40,
    cost: 720,
    icon: "🎯",
    description: "台風の目（中心部）を的確に射貫く古代の神弓。大型型に特効。",
    skill: {
      name: "台風の目狙撃",
      cost: 30,
      power: 2.5,
      desc: "台風の核に直撃させ、行動速度を大幅に削る。"
    }
  },
  {
    id: "iron_shield",
    name: "重装鉄盾",
    type: "shield",
    attack: 20,
    defense: 50,
    speed: -5,
    cost: 200,
    icon: "🛡️",
    description: "飛来物や突風をしっかり防ぐ頼もしい盾。",
    skill: {
      name: "耐風シェルター",
      cost: 20,
      power: 0.8,
      desc: "防御姿勢を取り、次のターン受けるダメージを75%カット。"
    }
  },
  {
    id: "aegis_barrier",
    name: "気象防壁イージス",
    type: "shield",
    attack: 35,
    defense: 110,
    speed: 5,
    cost: 850,
    icon: "🔰",
    description: "超高圧の力場で暴風・豪雨を完全遮断する最先端防護盾。",
    skill: {
      name: "絶対防衛結界",
      cost: 35,
      power: 1.0,
      desc: "施設とプレイヤーへのダメージを無効化し、敵に反射ダメージを与える。"
    }
  }
];

// 防具の定義
export const ARMORS = [
  {
    id: "cloth_armor",
    name: "旅立ちの防風着",
    defense: 15,
    hpBonus: 50,
    cost: 100,
    icon: "🥋",
    description: "撥水加工が施された軽量作業服。"
  },
  {
    id: "rain_coat_pro",
    name: "耐水耐風タクティカルスーツ",
    defense: 45,
    hpBonus: 150,
    cost: 450,
    icon: "🦺",
    description: "激しい豪雨と飛来物から身を守るプロ仕様の防護服。"
  },
  {
    id: "storm_guardian_armor",
    name: "気象守護神の重甲",
    defense: 90,
    hpBonus: 350,
    cost: 1100,
    icon: "🦹",
    description: "台風の強大エネルギーにも屈しない伝説の防災鎧。"
  }
];
