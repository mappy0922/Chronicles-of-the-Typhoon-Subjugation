import React, { useState, useEffect } from "react";
import { useGame } from "../game/context/GameContext";
import StormCanvas from "../components/StormCanvas";
import { SoundManager } from "../game/services/SoundManager";
import { DamageCalculator } from "../game/services/DamageCalculator";
import CharacterPortrait from "../components/CharacterPortrait";

export default function BattleView() {
  const {
    player,
    computedStats,
    activeTyphoon,
    farmPlots,
    defenseActions,
    setLastResult,
    setCurrentView,
    addToEncyclopedia,
    equipWeapon,
    modifyItemCount
  } = useGame();

  // 戦闘状態
  const [bossHp, setBossHp] = useState(activeTyphoon.currentHp);
  const [playerHp, setPlayerHp] = useState(player.currentHp);
  const [playerSp, setPlayerSp] = useState(player.currentSp);
  const [turn, setTurn] = useState(1);
  const [isGuarding, setIsGuarding] = useState(false);
  const [isEyeExposed, setIsEyeExposed] = useState(false); // 台風の目（弱点）露出フラグ
  const [bossChargeTurn, setBossChargeTurn] = useState(0); // ボス必殺技チャージ
  const [battleLogs, setBattleLogs] = useState([
    `⚠️【特別警報】${activeTyphoon.name}（${activeTyphoon.typeInfo.name}）が直撃した！`,
    `中心気圧: ${activeTyphoon.pressure}hPa / 最大風速: ${activeTyphoon.maxWind}m/s の超猛烈な暴風雨が吹き荒れる！`
  ]);
  const [isScreenShaking, setIsScreenShaking] = useState(false);

  // 画面揺れ演出
  const triggerShake = () => {
    setIsScreenShaking(true);
    setTimeout(() => setIsScreenShaking(false), 500);
  };

  // プレイヤー行動ハンドラ
  const handlePlayerCommand = (commandType) => {
    let newLogs = [...battleLogs];
    let damageToBoss = 0;
    let nextSp = playerSp;
    let nextIsGuarding = false;

    if (commandType === "attack") {
      const isBow = player.equippedWeapon.type === "bow";
      const isSword = player.equippedWeapon.type === "sword";

      if (isSword) SoundManager.playSlash();
      else if (isBow) SoundManager.playBow();
      else SoundManager.playShield();

      // 台風の目露出時に弓なら超特大クリティカル
      let critMultiplier = 1.0;
      if (isEyeExposed && isBow) {
        critMultiplier = 2.8;
        newLogs.push(`🎯 命中！ 露出した【台風の目】を射抜いた！ 超特大クリティカル！`);
      } else if (Math.random() < 0.25) {
        critMultiplier = 1.5;
        newLogs.push(`💥 プレイヤーの会心の一撃！`);
      }

      const baseDmg = Math.max(15, computedStats.atk * 1.8 - activeTyphoon.def * 0.4);
      damageToBoss = Math.round(baseDmg * critMultiplier);
      newLogs.push(`⚔️ ${player.equippedWeapon.name} で攻撃！ ${activeTyphoon.name} に ${damageToBoss} ダメージ！`);
    } else if (commandType === "skill") {
      const skill = player.equippedWeapon.skill;
      if (playerSp < skill.cost) {
        newLogs.push(`⚠️ SPが不足しています！（必要SP: ${skill.cost}）`);
        setBattleLogs(newLogs);
        return;
      }
      nextSp -= skill.cost;
      SoundManager.playSlash();
      triggerShake();

      const baseSkillDmg = Math.max(30, computedStats.atk * skill.power * 2.0 - activeTyphoon.def * 0.3);
      damageToBoss = Math.round(baseSkillDmg);
      newLogs.push(`✨ 秘奥義【${skill.name}】発動！ 気圧の渦を切り裂き ${damageToBoss} の大ダメージ！`);
    } else if (commandType === "guard") {
      SoundManager.playShield();
      nextIsGuarding = true;
      newLogs.push(`🛡️ 盾を構え、強固な耐風防御姿勢をとった！（被ダメージ75%カット）`);
    } else if (commandType === "heal") {
      if ((player.inventory.potion_small || 0) <= 0) {
        newLogs.push(`⚠️ 応急回復薬がありません！`);
        setBattleLogs(newLogs);
        return;
      }
      modifyItemCount("potion_small", -1);
      SoundManager.playHarvest();
      const healAmt = 250;
      const nextHp = Math.min(computedStats.maxHp, playerHp + healAmt);
      setPlayerHp(nextHp);
      newLogs.push(`🧪 応急回復薬を使用！ HPが ${healAmt} 回復した。`);
    }

    const nextBossHp = Math.max(0, bossHp - damageToBoss);
    setBossHp(nextBossHp);
    setPlayerSp(Math.min(player.maxSp, nextSp + 5)); // 毎ターンSP自然回復

    // ボス撃破判定
    if (nextBossHp <= 0) {
      finishBattle(true, nextLogs, nextBossHp);
      return;
    }

    // ボス（台風）の反撃ターン
    setTimeout(() => {
      executeBossTurn(nextBossHp, nextLogs, nextIsGuarding);
    }, 600);
  };

  // ボス行動処理
  const executeBossTurn = (currentBossHp, currentLogs, isPlayerGuarded) => {
    let nextLogs = [...currentLogs];
    let nextPlayerHp = playerHp;
    triggerShake();

    // 2ターンに1回、大技チャージまたは台風の目露出
    if (turn % 3 === 0 && bossChargeTurn === 0) {
      setBossChargeTurn(1);
      setIsEyeExposed(true);
      SoundManager.playAlert();
      nextLogs.push(`🌀【台風の異変】気流が収束し大技の予兆！ 中心部の【台風の目】が露出した！（弓特効）`);
    } else if (bossChargeTurn === 1) {
      // チャージ大技発動
      setBossChargeTurn(0);
      setIsEyeExposed(false);
      SoundManager.playAlert();
      const skill = activeTyphoon.skills[0] || { name: "猛烈な暴風雨", power: 1.8 };
      let bossDmg = Math.round(activeTyphoon.atk * skill.power * (isPlayerGuarded ? 0.25 : 1.0));
      nextPlayerHp = Math.max(0, nextPlayerHp - bossDmg);
      nextLogs.push(`🌪️ 台風の最大奥義【${skill.name}】が炸裂！！ ${bossDmg} の壊滅的ダメージ！`);
    } else {
      // 通常暴風攻撃
      const baseAtk = activeTyphoon.atk;
      let bossDmg = Math.round(Math.max(15, baseAtk * 1.2 - computedStats.def * 0.5) * (isPlayerGuarded ? 0.25 : 1.0));
      nextPlayerHp = Math.max(0, nextPlayerHp - bossDmg);
      nextLogs.push(`💨 ${activeTyphoon.name} の突風乱舞！ ${bossDmg} ダメージを受けた！`);
    }

    setPlayerHp(nextPlayerHp);
    setIsGuarding(false);
    setTurn((prev) => prev + 1);

    if (nextPlayerHp <= 0) {
      nextLogs.push(`💀 猛烈な暴風雨に押し流されてしまった…（緊急撤退）`);
      finishBattle(false, nextLogs, currentBossHp);
    } else {
      setBattleLogs(nextLogs);
    }
  };

  // 戦闘終了処理
  const finishBattle = (victory, logs, finalBossHp) => {
    SoundManager.playVictory();
    const damagePercent = Math.min(1.0, (activeTyphoon.maxHp - finalBossHp) / activeTyphoon.maxHp);

    const result = DamageCalculator.calculateDamage({
      typhoonBoss: activeTyphoon,
      defenseActions,
      farmState: { plots: farmPlots },
      battleResult: { victory, damageDealtPercent: damagePercent, turns: turn },
      playerState: player
    });

    setLastResult({
      ...result,
      typhoon: activeTyphoon,
      victory,
      turns: turn,
      date: new Date().toLocaleDateString("ja-JP")
    });

    // 台風図鑑に記録
    addToEncyclopedia({
      id: `history-${Date.now()}`,
      name: activeTyphoon.name,
      type: activeTyphoon.type,
      maxWind: activeTyphoon.maxWind,
      defenseScore: result.defenseScore,
      date: new Date().toLocaleDateString("ja-JP"),
      status: victory ? "完全討伐" : "防衛完了（通過）"
    });

    setTimeout(() => {
      setCurrentView("result");
    }, 1200);
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "75vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        animation: isScreenShaking ? "shake 0.4s ease-in-out infinite" : "none"
      }}
    >
      <StormCanvas isBattle={true} />

      {/* 上部ボスステータス */}
      <div className="glass-card" style={{ zIndex: 10, borderColor: "rgba(239, 68, 68, 0.5)", background: "rgba(15, 23, 42, 0.85)" }}>
        <div className="card-header" style={{ marginBottom: "0.5rem" }}>
          <div className="card-title">
            <span style={{ fontSize: "1.5rem" }}>🌀</span>
            <span>{activeTyphoon.name}</span>
            <span className="badge badge-red">{activeTyphoon.typeInfo.badge}</span>
            {isEyeExposed && <span className="badge badge-amber" style={{ animation: "pulse-border 1s infinite" }}>🎯 台風の目 露出中！</span>}
          </div>
          <span className="badge badge-cyan">第 {turn} ターン</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
              <span style={{ color: "#f87171", fontWeight: 700 }}>勢力HP (気圧核)</span>
              <span className="stat-val" style={{ color: "#f87171", fontSize: "1.05rem" }}>
                {bossHp} / {activeTyphoon.maxHp}
              </span>
            </div>
            <div className="progress-bar-container" style={{ height: "12px" }}>
              <div
                className="progress-bar-fill fill-boss-hp"
                style={{ width: `${(bossHp / activeTyphoon.maxHp) * 100}%` }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <span>気圧: <strong style={{ color: "#fff" }}>{activeTyphoon.pressure}hPa</strong></span>
            <span>最大風速: <strong style={{ color: "#fff" }}>{activeTyphoon.maxWind}m/s</strong></span>
            <span>最大瞬間風速: <strong style={{ color: "#fff" }}>{activeTyphoon.maxGust}m/s</strong></span>
          </div>
        </div>
      </div>

      {/* 中央バトル演出エリア */}
      <div style={{ zIndex: 10, textAlign: "center", margin: "1.5rem 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            fontSize: "5.5rem",
            filter: "drop-shadow(0 0 25px rgba(239, 68, 68, 0.7))",
            animation: "rotate 8s linear infinite"
          }}
        >
          🌀
        </div>
        <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--text-primary)", marginTop: "0.5rem", textShadow: "0 0 10px rgba(0,0,0,0.8)" }}>
          {activeTyphoon.dialogue[turn % activeTyphoon.dialogue.length]}
        </div>
      </div>

      {/* 下部プレイヤー状態 ＆ コマンドエリア */}
      <div className="glass-card" style={{ zIndex: 10, background: "rgba(15, 23, 42, 0.9)" }}>
        {/* プレイヤーステータス */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.75rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--accent-cyan)" }}><CharacterPortrait appearance={player.appearance} size={42} /> {player.name} (HP)</span>
              <span className="stat-val">{playerHp} / {computedStats.maxHp}</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill fill-hp"
                style={{ width: `${(playerHp / computedStats.maxHp) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
              <span style={{ fontWeight: 700, color: "var(--accent-blue)" }}>SP (気力)</span>
              <span className="stat-val">{playerSp} / {player.maxSp}</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill fill-sp"
                style={{ width: `${(playerSp / player.maxSp) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 武器切替セレクター */}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", overflowX: "auto", paddingBottom: "2px" }}>
          {player.ownedWeapons.map((wpn) => (
            <button
              key={wpn.id}
              onClick={() => equipWeapon(wpn)}
              className="btn-ghost"
              style={{
                padding: "0.3rem 0.6rem",
                fontSize: "0.75rem",
                borderColor: player.equippedWeapon.id === wpn.id ? "var(--accent-cyan)" : "transparent",
                color: player.equippedWeapon.id === wpn.id ? "var(--accent-cyan)" : "var(--text-secondary)",
                background: player.equippedWeapon.id === wpn.id ? "rgba(0,242,254,0.15)" : "transparent"
              }}
            >
              {wpn.icon} {wpn.name}
            </button>
          ))}
        </div>

        {/* 戦闘ログ */}
        <div
          style={{
            height: "100px",
            overflowY: "auto",
            background: "rgba(0, 0, 0, 0.5)",
            borderRadius: "8px",
            padding: "0.6rem",
            fontSize: "0.82rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            border: "1px solid var(--border-subtle)",
            marginBottom: "0.75rem"
          }}
        >
          {battleLogs.map((log, i) => (
            <div key={i} style={{ color: log.includes("⚠️") || log.includes("🌪️") ? "#f87171" : log.includes("🎯") || log.includes("✨") ? "var(--accent-gold)" : "var(--text-primary)" }}>
              {log}
            </div>
          ))}
        </div>

        {/* コマンドボタン */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem" }}>
          <button className="btn-primary" onClick={() => handlePlayerCommand("attack")} style={{ padding: "0.75rem 0.5rem", justifyContent: "center" }}>
            ⚔️ 攻撃
          </button>
          <button
            className="btn-primary"
            onClick={() => handlePlayerCommand("skill")}
            style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", padding: "0.75rem 0.5rem", justifyContent: "center" }}
          >
            ✨ 秘技 ({player.equippedWeapon.skill.cost} SP)
          </button>
          <button className="btn-ghost" onClick={() => handlePlayerCommand("guard")} style={{ padding: "0.75rem 0.5rem", justifyContent: "center" }}>
            🛡️ 耐風防御
          </button>
          <button className="btn-ghost" onClick={() => handlePlayerCommand("heal")} style={{ padding: "0.75rem 0.5rem", justifyContent: "center" }}>
            🧪 回復薬 ({player.inventory.potion_small || 0})
          </button>
        </div>
      </div>

      <style>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-6px, 4px); }
          40% { transform: translate(5px, -4px); }
          60% { transform: translate(-4px, 2px); }
          80% { transform: translate(4px, -2px); }
        }
      `}</style>
    </div>
  );
}
