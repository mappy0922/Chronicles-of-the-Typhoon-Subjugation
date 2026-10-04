import React, { useState } from "react";
import { useGame } from "../game/context/GameContext";
import { SoundManager } from "../game/services/SoundManager";

const ARENA_ENEMIES = [
  {
    id: "wind_slime",
    name: "突風スライム",
    rank: "初級",
    icon: "💨",
    hp: 220,
    maxHp: 220,
    atk: 25,
    def: 10,
    expReward: 60,
    moneyReward: 80,
    itemDrop: "potion_small",
    desc: "微風が集まってできた小さな精霊。討伐の基礎訓練に最適。"
  },
  {
    id: "rain_beast",
    name: "豪雨獣アクアブルート",
    rank: "中級",
    icon: "🌊",
    hp: 650,
    maxHp: 650,
    atk: 55,
    def: 30,
    expReward: 160,
    moneyReward: 200,
    itemDrop: "sandbag",
    desc: "水害の濁流を纏う魔獣。水流タックルに注意。"
  },
  {
    id: "thunder_garuda",
    name: "雷雲怪鳥サンダーガルダ",
    rank: "上級",
    icon: "⚡",
    hp: 1400,
    maxHp: 1400,
    atk: 95,
    def: 50,
    expReward: 350,
    moneyReward: 450,
    itemDrop: "wind_net",
    desc: "積乱雲の核から生じた幻獣。強烈な落雷攻撃を放つ。"
  },
  {
    id: "tornado_golem",
    name: "竜巻巨兵テンペストゴーレム",
    rank: "超級",
    icon: "🌪️",
    hp: 2800,
    maxHp: 2800,
    atk: 150,
    def: 85,
    expReward: 700,
    moneyReward: 900,
    itemDrop: "building_reinforce",
    desc: "気圧の渦で岩石を巻き上げた巨大兵器。台風ボスに匹敵するパワーを持つ。"
  }
];

export default function ArenaView() {
  const {
    player,
    setPlayer,
    computedStats,
    gainExp,
    addMoney,
    modifyItemCount,
    equipWeapon
  } = useGame();

  const [selectedEnemy, setSelectedEnemy] = useState(null);
  const [battleState, setBattleState] = useState(null); // { enemyHp, playerHp, playerSp, logs, isGuarding, turn }
  const [battleResult, setBattleResult] = useState(null); // "win" | "lose"

  // 戦闘開始
  const startBattle = (enemy) => {
    SoundManager.playAlert();
    setSelectedEnemy(enemy);
    setBattleState({
      enemy: { ...enemy },
      enemyHp: enemy.hp,
      playerHp: player.currentHp,
      playerSp: player.currentSp,
      isGuarding: false,
      turn: 1,
      logs: [`【戦闘開始】${enemy.name} が立ちふさがった！`]
    });
    setBattleResult(null);
  };

  // プレイヤー行動処理
  const handleAction = (actionType) => {
    if (!battleState || battleResult) return;

    let { enemy, enemyHp, playerHp, playerSp, isGuarding, turn, logs } = battleState;
    const newLogs = [...logs];

    let playerDamage = 0;
    let guardBonus = false;

    if (actionType === "attack") {
      // 通常攻撃
      if (player.equippedWeapon.type === "sword") SoundManager.playSlash();
      else if (player.equippedWeapon.type === "bow") SoundManager.playBow();
      else SoundManager.playShield();

      const isCrit = Math.random() < 0.2;
      const baseDmg = Math.max(10, computedStats.atk * 1.5 - enemy.def);
      playerDamage = Math.round(baseDmg * (isCrit ? 1.5 : 1.0));
      newLogs.push(`⚔️ プレイヤーの攻撃！ ${enemy.name} に ${playerDamage} ダメージ${isCrit ? "（会心の一撃！）" : ""}`);
    } else if (actionType === "skill") {
      // 武器スキル
      const skill = player.equippedWeapon.skill;
      if (playerSp < skill.cost) {
        newLogs.push(`⚠️ SPが不足しています！（必要SP: ${skill.cost}）`);
        setBattleState((prev) => ({ ...prev, logs: newLogs }));
        return;
      }
      playerSp -= skill.cost;
      SoundManager.playSlash();
      playerDamage = Math.round(Math.max(20, computedStats.atk * skill.power * 1.6 - enemy.def * 0.7));
      newLogs.push(`✨ 必殺技【${skill.name}】を発動！ ${playerDamage} の猛烈なダメージ！`);
    } else if (actionType === "guard") {
      // 防御
      SoundManager.playShield();
      guardBonus = true;
      newLogs.push(`🛡️ プレイヤーは身構えて防御の姿勢をとった！`);
    } else if (actionType === "heal") {
      // 回復薬
      if ((player.inventory.potion_small || 0) <= 0) {
        newLogs.push(`⚠️ 応急回復薬がありません！`);
        setBattleState((prev) => ({ ...prev, logs: newLogs }));
        return;
      }
      modifyItemCount("potion_small", -1);
      SoundManager.playHarvest();
      playerHp = Math.min(computedStats.maxHp, playerHp + 200);
      newLogs.push(`🧪 応急回復薬を使用！ HPが200回復した。（残りHP: ${playerHp}）`);
    }

    enemyHp = Math.max(0, enemyHp - playerDamage);

    // 勝利判定
    if (enemyHp <= 0) {
      SoundManager.playVictory();
      newLogs.push(`🎉 ${enemy.name} を討伐した！`);
      gainExp(enemy.expReward);
      addMoney(enemy.moneyReward);
      if (enemy.itemDrop) {
        modifyItemCount(enemy.itemDrop, 1);
        newLogs.push(`🎁 報酬: 経験値+${enemy.expReward} EXP, 資金+${enemy.moneyReward} G, アイテム獲得！`);
      }
      setBattleResult("win");
      setBattleState({ ...battleState, enemyHp, playerHp, playerSp, logs: newLogs });
      return;
    }

    // 敵の反撃ターン
    const baseEnemyDmg = Math.max(8, enemy.atk * 1.3 - computedStats.def);
    let finalEnemyDmg = Math.round(baseEnemyDmg * (guardBonus ? 0.3 : 1.0));
    playerHp = Math.max(0, playerHp - finalEnemyDmg);
    newLogs.push(`💥 ${enemy.name} の反撃！ ${finalEnemyDmg} のダメージを受けた！`);

    // プレイヤーHP残存の同期
    setPlayer((prev) => ({ ...prev, currentHp: playerHp, currentSp: playerSp }));

    if (playerHp <= 0) {
      newLogs.push(`💀 力尽きてしまった…`);
      setBattleResult("lose");
    }

    setBattleState({
      ...battleState,
      enemyHp,
      playerHp,
      playerSp,
      isGuarding: guardBonus,
      turn: turn + 1,
      logs: newLogs
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {!battleState ? (
        <>
          {/* 闘技場トップ */}
          <div className="glass-card">
            <div className="card-header">
              <div className="card-title">
                <span>⚔️</span>
                <span>闘技場・気象モンスター討伐訓練</span>
              </div>
              <span className="badge badge-cyan">プレイヤー Lv.{player.level}</span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              気象現象から生まれたモンスターと模擬戦を行い、討伐士としてのレベルアップや資金・防災資材を獲得できます。台風本番に向け、装備と腕を磨きましょう！
            </p>
          </div>

          {/* 敵一覧 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {ARENA_ENEMIES.map((enemy) => (
              <div
                key={enemy.id}
                className="glass-card"
                style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span className="badge badge-amber">{enemy.rank}</span>
                    <span style={{ fontSize: "1.8rem" }}>{enemy.icon}</span>
                  </div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "0.4rem" }}>{enemy.name}</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                    {enemy.desc}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", fontSize: "0.78rem", background: "rgba(0,0,0,0.2)", padding: "0.5rem", borderRadius: "8px" }}>
                    <div>HP: <strong>{enemy.hp}</strong></div>
                    <div>攻撃力: <strong>{enemy.atk}</strong></div>
                    <div>獲得EXP: <strong style={{ color: "var(--accent-gold)" }}>+{enemy.expReward}</strong></div>
                    <div>報酬金: <strong style={{ color: "var(--accent-cyan)" }}>+{enemy.moneyReward}G</strong></div>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => startBattle(enemy)}
                  style={{ marginTop: "1rem", width: "100%", justifyContent: "center" }}
                >
                  ⚔️ 模擬戦を開始する
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* 闘技場 バトル画面 */
        <div className="glass-card" style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
          <div className="card-header">
            <div className="card-title">
              <span>⚔️ 闘技場バトル: </span>
              <span style={{ color: "var(--accent-cyan)" }}>{battleState.enemy.name}</span>
            </div>
            <span className="badge badge-amber">第 {battleState.turn} ターン</span>
          </div>

          {/* 対戦バー */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", padding: "1rem 0" }}>
            {/* プレイヤー側 */}
            <div style={{ background: "rgba(0,242,254,0.06)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(0,242,254,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <strong>👤 {player.name} (Lv.{player.level})</strong>
                <span className="stat-val">{battleState.playerHp} / {computedStats.maxHp}</span>
              </div>
              <div className="progress-bar-container" style={{ marginBottom: "8px" }}>
                <div className="progress-bar-fill fill-hp" style={{ width: `${(battleState.playerHp / computedStats.maxHp) * 100}%` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <span>SP: {battleState.playerSp} / {player.maxSp}</span>
                <span>武器: {player.equippedWeapon.name}</span>
              </div>
            </div>

            {/* 敵側 */}
            <div style={{ background: "rgba(239,68,68,0.06)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(239,68,68,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <strong>{battleState.enemy.icon} {battleState.enemy.name}</strong>
                <span className="stat-val">{battleState.enemyHp} / {battleState.enemy.maxHp}</span>
              </div>
              <div className="progress-bar-container" style={{ marginBottom: "8px" }}>
                <div className="progress-bar-fill fill-boss-hp" style={{ width: `${(battleState.enemyHp / battleState.enemy.maxHp) * 100}%` }} />
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                危険度: {battleState.enemy.rank}
              </div>
            </div>
          </div>

          {/* 武器切り替えボタン群 */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", background: "rgba(0,0,0,0.25)", padding: "0.6rem", borderRadius: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: "0.25rem" }}>武器切替:</span>
            {player.ownedWeapons.map((wpn) => (
              <button
                key={wpn.id}
                onClick={() => equipWeapon(wpn)}
                className="btn-ghost"
                style={{
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.8rem",
                  borderColor: player.equippedWeapon.id === wpn.id ? "var(--accent-cyan)" : "transparent",
                  color: player.equippedWeapon.id === wpn.id ? "var(--accent-cyan)" : "var(--text-secondary)"
                }}
              >
                {wpn.icon} {wpn.name}
              </button>
            ))}
          </div>

          {/* 戦闘ログ */}
          <div style={{ height: "140px", overflowY: "auto", background: "rgba(0,0,0,0.4)", borderRadius: "10px", padding: "0.75rem", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.3rem", border: "1px solid var(--border-subtle)", marginBottom: "1.25rem" }}>
            {battleState.logs.map((log, idx) => (
              <div key={idx} style={{ color: log.includes("🎉") ? "var(--accent-gold)" : log.includes("💥") ? "#f87171" : "var(--text-primary)" }}>
                {log}
              </div>
            ))}
          </div>

          {/* コマンドパレット */}
          {!battleResult ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem" }}>
              <button className="btn-primary" onClick={() => handleAction("attack")}>
                ⚔️ 攻撃
              </button>
              <button className="btn-primary" onClick={() => handleAction("skill")} style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
                ✨ スキル ({player.equippedWeapon.skill.cost} SP)
              </button>
              <button className="btn-ghost" onClick={() => handleAction("guard")}>
                🛡️ 防御 (ガード)
              </button>
              <button className="btn-ghost" onClick={() => handleAction("heal")}>
                🧪 応急薬 ({player.inventory.potion_small || 0})
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <button className="btn-primary" onClick={() => setBattleState(null)} style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}>
                {battleResult === "win" ? "🏆 勝利！ 闘技場トップへ戻る" : "↩️ 敗北… 態勢を立て直す"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
