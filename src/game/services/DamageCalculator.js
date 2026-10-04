/**
 * 台風通過後の被害集計 & 防衛評価エンジン
 */
export class DamageCalculator {
  /**
   * 被害結果の計算
   * @param {Object} typhoonBoss 台風データ
   * @param {Object} defenseActions プレイヤーが実施した防衛策 { windNetCount, sandbagCount, buildingReinforce, drainPump }
   * @param {Object} farmState 農地状態 { plots: [] }
   * @param {Object} battleResult 戦闘結果 { victory: boolean, damageDealtPercent: number, turns: number }
   * @param {Object} playerState プレイヤー資産
   */
  static calculateDamage({
    typhoonBoss,
    defenseActions = {},
    farmState = { plots: [] },
    battleResult = { victory: true, damageDealtPercent: 1.0 },
    playerState = { money: 1000 }
  }) {
    const { buildingDanger = 1.0, cropDanger = 1.0, rainfall = 200, maxWind = 35 } = typhoonBoss;

    // 1. 農作物被害の基本値計算 (台風の風速と雨量から 30% 〜 90%)
    const baseCropDamage = Math.min(95, Math.max(25, (maxWind * 0.8 + rainfall * 0.1) * cropDanger * 0.6));
    
    // 防風・水害対策による軽減率
    let cropReduction = 0;
    if (defenseActions.windNet) cropReduction += 0.35; // 防風ネットで35%軽減
    if (defenseActions.sandbag) cropReduction += 0.25; // 土のうで25%軽減
    if (defenseActions.drainPump) cropReduction += 0.30; // 排水ポンプで30%軽減

    // 戦闘で台風を弱体化/撃破した場合のボーナス (最大30%軽減)
    const battleBonus = battleResult.victory ? 0.30 : (battleResult.damageDealtPercent || 0.5) * 0.20;
    cropReduction += battleBonus;

    // 実際の農作物被害率（%）
    const effectiveCropReduction = Math.min(0.95, cropReduction);
    const cropDamageRate = Math.round(baseCropDamage * (1 - effectiveCropReduction));

    // 2. 建物被害の計算 (台風の風速・気圧から 20% 〜 80%)
    const baseBuildingDamage = Math.min(90, Math.max(15, maxWind * 1.1 * buildingDanger * 0.5));
    let buildingReduction = 0;
    if (defenseActions.buildingReinforce) buildingReduction += 0.45; // 建物補強で45%軽減
    if (defenseActions.sandbag) buildingReduction += 0.15; // 土のうで15%軽減
    buildingReduction += battleBonus;

    const effectiveBuildingReduction = Math.min(0.95, buildingReduction);
    const buildingDamageRate = Math.round(baseBuildingDamage * (1 - effectiveBuildingReduction));

    // 3. 総合資産被害率 & 資産守護率
    const overallDamageRate = Math.round((cropDamageRate * 0.55) + (buildingDamageRate * 0.45));
    const defenseScore = Math.max(5, 100 - overallDamageRate); // 守護率 (%)

    // 4. 実際の農作物損失（畑に植えられていた作物の判定）
    let lostCropsCount = 0;
    let survivingCropsCount = 0;
    const updatedPlots = farmState.plots.map((plot) => {
      if (!plot.crop) return plot;
      // 耐風・耐水性を加味した個別生存判定
      const individualSurvivalChance = (defenseScore / 100) * 1.2;
      const isDamaged = Math.random() > individualSurvivalChance;
      if (isDamaged) {
        lostCropsCount++;
        return { ...plot, crop: null, stage: 0, damaged: true };
      } else {
        survivingCropsCount++;
        return plot;
      }
    });

    // 5. 復興報奨金・ボーナス計算
    let rank = "C";
    let rewardMoney = 150;
    let expReward = 200;

    if (defenseScore >= 90) {
      rank = "S (神域の防災師)";
      rewardMoney = 800;
      expReward = 800;
    } else if (defenseScore >= 75) {
      rank = "A (熟練の守護者)";
      rewardMoney = 500;
      expReward = 500;
    } else if (defenseScore >= 60) {
      rank = "B (堅実な防衛)";
      rewardMoney = 300;
      expReward = 350;
    }

    return {
      cropDamageRate,
      buildingDamageRate,
      overallDamageRate,
      defenseScore, // 「今回の台風から XX% の資産を守りました！」
      rank,
      rewardMoney,
      expReward,
      lostCropsCount,
      survivingCropsCount,
      updatedPlots,
      defenseActionsSummary: {
        windNetUsed: !!defenseActions.windNet,
        sandbagUsed: !!defenseActions.sandbag,
        reinforceUsed: !!defenseActions.buildingReinforce,
        pumpUsed: !!defenseActions.drainPump
      }
    };
  }
}
