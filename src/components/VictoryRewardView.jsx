import React, { useEffect, useMemo, useState } from "react";
import "../styles/victory-reward.css";

const makeExpSteps = (player, amount) => {
  let level = player.level || 1;
  let exp = player.exp || 0;
  let nextExp = player.nextExp || 100;
  let remaining = amount;
  const steps = [];

  while (remaining > 0) {
    const toNextLevel = Math.max(0, nextExp - exp);
    if (remaining >= toNextLevel && toNextLevel > 0) {
      steps.push({ level, from: exp / nextExp * 100, to: 100, required: nextExp });
      remaining -= toNextLevel;
      level += 1;
      exp = 0;
      nextExp = Math.round(nextExp * 1.4);
    } else {
      const finalExp = exp + remaining;
      steps.push({ level, from: exp / nextExp * 100, to: finalExp / nextExp * 100, required: nextExp });
      remaining = 0;
    }
  }

  if (steps.length === 0) steps.push({ level, from: exp / nextExp * 100, to: exp / nextExp * 100, required: nextExp });
  return { steps, finalLevel: level };
};

export default function VictoryRewardView({ playerBefore, expReward, moneyReward, outcome = "victory", onComplete }) {
  const [phase, setPhase] = useState("exp");
  const [rolledExp, setRolledExp] = useState(0);
  const [rolledMoney, setRolledMoney] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [gaugeValue, setGaugeValue] = useState(0);
  const [gaugeFinished, setGaugeFinished] = useState(false);
  const progression = useMemo(() => makeExpSteps(playerBefore, expReward), [playerBefore, expReward]);
  const currentStep = progression.steps[stepIndex];
  const resultTitle = outcome === "retired"
    ? "\u30ea\u30bf\u30a4\u30a2\u5831\u916c"
    : outcome === "defeat"
      ? "\u6557\u5317\u5831\u916c"
      : "\u52dd\u5229\u5831\u916c";

  useEffect(() => {
    if (phase !== "exp" && phase !== "money") return undefined;
    const target = phase === "exp" ? expReward : moneyReward;
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / 1500);
      const eased = 1 - (1 - progress) ** 4;
      if (phase === "exp") setRolledExp(Math.floor(target * eased));
      else setRolledMoney(Math.floor(target * eased));

      if (progress >= 1) {
        window.clearInterval(interval);
        window.setTimeout(() => setPhase(phase === "exp" ? "gauge" : "complete"), 350);
      }
    }, 30);
    return () => window.clearInterval(interval);
  }, [phase, expReward, moneyReward]);

  useEffect(() => {
    if (phase !== "gauge" || !currentStep) return undefined;
    setGaugeValue(currentStep.from);
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / 1050);
      const eased = 1 - (1 - progress) ** 3;
      setGaugeValue(currentStep.from + (currentStep.to - currentStep.from) * eased);

      if (progress >= 1) {
        window.clearInterval(interval);
        window.setTimeout(() => {
          if (stepIndex + 1 < progression.steps.length) {
            setGaugeFinished(false);
            setStepIndex((index) => index + 1);
          } else {
            setGaugeFinished(true);
            window.setTimeout(() => setPhase("money"), 900);
          }
        }, 300);
      }
    }, 30);
    return () => window.clearInterval(interval);
  }, [phase, currentStep, stepIndex, progression.steps.length]);

  return (
    <main className="victory-reward-screen" role="dialog" aria-modal="true" aria-label="勝利報酬">
      <div className="victory-reward-content">
        <h1>{resultTitle}</h1>

        <div className="victory-reward-rows" aria-live="polite">
          <section className="victory-reward-row">
            <span>{"\u7372\u5f97\u7d4c\u9a13\u5024"}</span>
            <div className="victory-reward-gauge-value">
              <strong className="victory-reward-exp-amount">+{rolledExp.toLocaleString()} EXP</strong>
              {phase !== "exp" && <>
                <div className="victory-reward-gauge-line">
                  <strong className="victory-reward-level-label">Lv.{gaugeFinished ? progression.finalLevel : currentStep?.level ?? progression.finalLevel}</strong>
                  <div className="victory-reward-exp-track"><span style={{ width: `${gaugeValue}%` }} /></div>
                </div>
                <strong className="victory-reward-exp-progress">{`${Math.round((gaugeValue / 100) * (currentStep?.required || playerBefore.nextExp || 100)).toLocaleString()} / ${(currentStep?.required || playerBefore.nextExp || 100).toLocaleString()} EXP`}</strong>
              </>}
            </div>
          </section>

          <section className="victory-reward-row">
            <span>{"\u7372\u5f97\u91d1"}</span>
            <strong className="victory-reward-money">{phase === "money" || phase === "complete" ? `+${rolledMoney.toLocaleString()} G` : "\u2014"}</strong>
          </section>
        </div>

        {phase === "complete" && <button type="button" className="btn-ghost victory-reward-button" onClick={onComplete}>{"\u30b2\u30fc\u30e0\u306b\u623b\u308b"}</button>}
      </div>
    </main>
  );
}
