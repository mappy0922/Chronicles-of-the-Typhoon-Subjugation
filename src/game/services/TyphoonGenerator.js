import { TYPHOON_TYPES } from "../constants/typhoonTypes";

/**
 * 気象データからゲーム用台風ボスオブジェクトを生成するエンジン
 */
export class TyphoonGenerator {
  /**
   * 気象パラメータから台風キャラクターを生成
   * @param {Object} rawData { name, pressure, maxWind, maxGust, rainfall, sizeKm, speed, type }
   */
  static generateBoss(rawData) {
    const pressure = rawData.pressure || 970;
    const maxWind = rawData.maxWind || 35;
    const maxGust = rawData.maxGust || 50;
    const rainfall = rawData.rainfall || 200;
    const sizeKm = rawData.sizeKm || 450;
    const speed = rawData.speed || 30;

    // タイプ判定（指定がなければ自動推定）
    let determinedType = rawData.type;
    if (!determinedType) {
      if (pressure <= 940 && maxWind >= 45 && rainfall >= 350) {
        determinedType = "complex";
      } else if (sizeKm >= 600) {
        determinedType = "large";
      } else if (rainfall >= 300) {
        determinedType = "rain";
      } else {
        determinedType = "gale";
      }
    }

    const typeConfig = TYPHOON_TYPES[determinedType] || TYPHOON_TYPES.gale;
    const multipliers = typeConfig.bonusStats;

    // 1. HP計算: 気圧が低いほど莫大なHP（900hPaで約15,000、1000hPaで約2,500）
    const baseHp = Math.round(Math.max(2500, (1015 - pressure) * 110));
    const maxHp = Math.round(baseHp * multipliers.hpMultiplier);

    // 2. 攻撃力計算: 最大風速 (20m/sで約90、60m/sで約450)
    const baseAtk = Math.round(Math.max(60, maxWind * 7.5));
    const atk = Math.round(baseAtk * multipliers.atkMultiplier);

    // 3. 特殊攻撃力（瞬間最大風速）
    const specialAtk = Math.round(maxGust * 6.5 * multipliers.atkMultiplier);

    // 4. 防御力計算: 気圧とサイズから
    const baseDef = Math.round(Math.max(40, (1010 - pressure) * 2.2));
    const def = Math.round(baseDef * multipliers.defMultiplier);

    // 5. 行動速度計算: 進行速度から (10km/hで約40、80km/hで約90)
    const spd = Math.round(Math.min(100, Math.max(35, speed * 1.1 + 30)) * multipliers.spdMultiplier);

    // 6. 危険度評価 (Threat Level: S, A, B, C)
    let threatLevel = "B";
    if (pressure <= 935 || maxWind >= 50) threatLevel = "S";
    else if (pressure <= 960 || maxWind >= 40) threatLevel = "A";
    else if (pressure >= 985) threatLevel = "C";

    return {
      id: rawData.id || `typhoon-${Date.now()}`,
      name: rawData.name || "謎の熱帯低気圧",
      year: rawData.year || "現在",
      type: determinedType,
      typeInfo: typeConfig,
      pressure,
      maxWind,
      maxGust,
      rainfall,
      sizeKm,
      speed,
      threatLevel,
      // 戦闘用ステータス
      maxHp,
      currentHp: maxHp,
      atk,
      specialAtk,
      def,
      spd,
      // 被害影響度係数
      buildingDanger: typeConfig.buildingDanger,
      cropDanger: typeConfig.cropDanger,
      skills: typeConfig.specialSkills,
      dialogue: [
        "ゴオオオオッ！すべてを吹き飛ばしてやる！",
        "雨雲が渦巻く…我が暴威を防げるものか！",
        "気圧が急低下している…これがお前の街の終わりだ！"
      ]
    };
  }
}
