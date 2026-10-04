// 台風タイプおよび実在・仮想台風プリセットの定義
export const TYPHOON_TYPES = {
  gale: {
    id: "gale",
    name: "暴風型（Gale Type）",
    badge: "🌪️ 暴風型",
    themeColor: "#00d2ff",
    description: "気圧傾度が急激で猛烈な暴風雨を伴う。攻撃力と建物への破壊力が極めて高い。",
    bonusStats: { atkMultiplier: 1.35, defMultiplier: 1.0, hpMultiplier: 1.0, spdMultiplier: 1.2 },
    buildingDanger: 1.5,
    cropDanger: 0.9,
    specialSkills: [
      { name: "最大瞬間突風弾", power: 1.8, desc: "看板や屋根瓦が飛来する猛烈な突風攻撃", target: "single" },
      { name: "猛吹塵旋風", power: 1.3, desc: "建物のガラスを破る暴風", target: "all" }
    ]
  },
  rain: {
    id: "rain",
    name: "豪雨型（Heavy Rain Type）",
    badge: "🌊 豪雨型",
    themeColor: "#3a7bd5",
    description: "線状降水帯や湿った空気を大量に吸い上げた水害特化型。農地冠水と行動制限の濁流攻撃を繰り出す。",
    bonusStats: { atkMultiplier: 1.0, defMultiplier: 1.2, hpMultiplier: 1.2, spdMultiplier: 0.9 },
    buildingDanger: 0.9,
    cropDanger: 1.6,
    specialSkills: [
      { name: "ゲリラ線状豪雨", power: 1.5, desc: "畑を一気に水没させる集中豪雨攻撃", target: "crop_focus" },
      { name: "泥流タイダルウェーブ", power: 1.2, desc: "プレイヤーの視界を奪い次ターンの行動を遅らせる", debuff: "speed_down" }
    ]
  },
  large: {
    id: "large",
    name: "大型型（Giant Type）",
    badge: "🌀 超大型",
    themeColor: "#9b51e0",
    description: "強風域が日本列島全体をすっぽり覆う巨大台風。圧倒的な攻撃範囲を持ち、すべての施設を同時に脅かす。",
    bonusStats: { atkMultiplier: 1.15, defMultiplier: 1.35, hpMultiplier: 1.4, spdMultiplier: 0.8 },
    buildingDanger: 1.3,
    cropDanger: 1.3,
    specialSkills: [
      { name: "全域暴風圏バースト", power: 1.4, desc: "農地と建物の両方を同時に襲う広域攻撃", target: "all" },
      { name: "巨大スパイラルアーム", power: 1.6, desc: "巨大な雨雲の帯で全方位を薙ぎ払う", target: "all" }
    ]
  },
  complex: {
    id: "complex",
    name: "複合型（Catastrophic Complex）",
    badge: "⚡ 複合スーパータイフーン",
    themeColor: "#ff416c",
    description: "超低気圧・猛烈な風・記録的豪雨・巨大な強風域を兼ね備えた最凶の天災ボス。準備なしでの防衛は極めて困難。",
    bonusStats: { atkMultiplier: 1.5, defMultiplier: 1.4, hpMultiplier: 1.7, spdMultiplier: 1.15 },
    buildingDanger: 1.6,
    cropDanger: 1.6,
    specialSkills: [
      { name: "終末の気圧崩壊（ハイパーストーム）", power: 2.2, desc: "天変地異の破壊力を持つ必殺ストーム", target: "all" },
      { name: "高潮ダブルインパクト", power: 1.7, desc: "暴風と高潮の同時直撃", target: "all" }
    ]
  }
};

// 歴代実在台風 & シミュレーション用プリセットデータ
export const HISTORICAL_TYPHOONS = [
  {
    id: "typhoon-195915",
    name: "台風15号「ヴェラ」（伊勢湾台風）",
    year: "1959年",
    pressure: 929, // hPa
    maxWind: 55, // m/s
    maxGust: 75, // m/s
    rainfall: 450, // mm
    sizeKm: 700, // 強風域半径
    speed: 65, // km/h
    type: "complex",
    description: "近代日本観測史上最悪の被害をもたらした伝説の超大型猛烈台風。甚大な高潮と暴風が特徴。"
  },
  {
    id: "typhoon-201821",
    name: "台風21号「チェービー」",
    year: "2018年",
    pressure: 950,
    maxWind: 45,
    maxGust: 58,
    rainfall: 250,
    sizeKm: 500,
    speed: 70,
    type: "gale",
    description: "猛烈な突風で空港連絡橋へのタンカー衝突や建物の屋根飛散を起こした記録的暴風型台風。"
  },
  {
    id: "typhoon-201919",
    name: "台風19号「ハギビス」（令和元年東日本台風）",
    year: "2019年",
    pressure: 955,
    maxWind: 40,
    maxGust: 50,
    rainfall: 600,
    sizeKm: 650,
    speed: 35,
    type: "rain",
    description: "広範囲で記録的大雨となり、全国140箇所超の河川決壊をもたらした超弩級豪雨型台風。"
  },
  {
    id: "typhoon-202410",
    name: "台風10号「サンサン」（迷走型超大型）",
    year: "2024年",
    pressure: 935,
    maxWind: 50,
    maxGust: 70,
    rainfall: 500,
    sizeKm: 600,
    speed: 15,
    type: "complex",
    description: "非常に遅い速度で列島を縦断し、長時間にわたり暴風雨をもたらした最強クラスの複合台風。"
  },
  {
    id: "typhoon-standard",
    name: "台風3号「ファジー」（標準型熱帯低気圧）",
    year: "演習用",
    pressure: 985,
    maxWind: 25,
    maxGust: 35,
    rainfall: 120,
    sizeKm: 350,
    speed: 40,
    type: "gale",
    description: "初級者向けの標準的な台風。防衛の基本を学ぶのに最適。"
  }
];
