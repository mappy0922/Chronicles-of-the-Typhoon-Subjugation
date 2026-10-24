import { describe, expect, it } from "vitest";
import { DamageCalculator } from "./DamageCalculator";

const storm = {
  buildingDanger: 1,
  cropDanger: 1,
  rainfall: 300,
  maxWind: 45
};

const calculate = (defenseActions = {}) => DamageCalculator.calculateDamage({
  typhoonBoss: storm,
  defenseActions,
  farmState: { plots: [] },
  battleResult: { victory: false, damageDealtPercent: 0 },
  playerState: { money: 1000 }
});

describe("DamageCalculator", () => {
  it("returns damage percentages and a matching defense score", () => {
    const result = calculate();

    expect(result.cropDamageRate).toBeGreaterThanOrEqual(0);
    expect(result.cropDamageRate).toBeLessThanOrEqual(100);
    expect(result.buildingDamageRate).toBeGreaterThanOrEqual(0);
    expect(result.buildingDamageRate).toBeLessThanOrEqual(100);
    expect(result.defenseScore).toBe(100 - result.overallDamageRate);
  });

  it("reduces damage when protective actions are used", () => {
    const withoutDefenses = calculate();
    const withDefenses = calculate({
      windNet: true,
      sandbag: true,
      drainPump: true,
      buildingReinforce: true
    });

    expect(withDefenses.overallDamageRate).toBeLessThan(withoutDefenses.overallDamageRate);
    expect(withDefenses.defenseScore).toBeGreaterThan(withoutDefenses.defenseScore);
  });
});
