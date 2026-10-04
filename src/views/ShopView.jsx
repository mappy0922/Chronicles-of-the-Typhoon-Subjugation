import React, { useState } from "react";
import { useGame } from "../game/context/GameContext";
import { WEAPONS, ARMORS } from "../game/constants/equipment";
import { ITEMS } from "../game/constants/items";
import { SoundManager } from "../game/services/SoundManager";

export default function ShopView() {
  const {
    player,
    setPlayer,
    addMoney,
    modifyItemCount,
    equipWeapon,
    equipArmor
  } = useGame();

  const [activeTab, setActiveTab] = useState("defense"); // "defense" | "weapons" | "armors" | "consumables"
  const [purchaseMsg, setPurchaseMsg] = useState("");

  const handleBuyWeapon = (weapon) => {
    if (player.money < weapon.cost) {
      setPurchaseMsg("所持金が足りません！");
      return;
    }
    const alreadyOwned = player.ownedWeapons.some((w) => w.id === weapon.id);
    if (alreadyOwned) {
      setPurchaseMsg("既に所持しています。");
      return;
    }
    addMoney(-weapon.cost);
    setPlayer((prev) => ({
      ...prev,
      ownedWeapons: [...prev.ownedWeapons, weapon],
      equippedWeapon: weapon
    }));
    SoundManager.playHarvest();
    setPurchaseMsg(`【${weapon.name}】を購入し、装備しました！`);
  };

  const handleBuyArmor = (armor) => {
    if (player.money < armor.cost) {
      setPurchaseMsg("所持金が足りません！");
      return;
    }
    const alreadyOwned = player.ownedArmors.some((a) => a.id === armor.id);
    if (alreadyOwned) {
      setPurchaseMsg("既に所持しています。");
      return;
    }
    addMoney(-armor.cost);
    setPlayer((prev) => ({
      ...prev,
      ownedArmors: [...prev.ownedArmors, armor],
      equippedArmor: armor
    }));
    SoundManager.playHarvest();
    setPurchaseMsg(`【${armor.name}】を購入し、装備しました！`);
  };

  const handleBuyItem = (itemKey) => {
    const item = ITEMS[itemKey];
    if (player.money < item.cost) {
      setPurchaseMsg("所持金が足りません！");
      return;
    }
    addMoney(-item.cost);
    modifyItemCount(itemKey, 1);
    SoundManager.playHarvest();
    setPurchaseMsg(`【${item.name}】を1点購入しました！`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ヘッダーカード */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <span>🛒</span>
            <span>防災＆討伐よろず屋（ショップ）</span>
          </div>
          <div className="badge badge-amber" style={{ fontSize: "0.95rem", padding: "0.4rem 0.9rem" }}>
            <span>所持金: </span>
            <strong className="stat-val">{player.money.toLocaleString()} G</strong>
          </div>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          台風接近に備える「防災資材（防風ネット・土のう・補強材）」、戦闘用の「武器・防具」、農作業を加速する「肥料」を取り揃えています。
        </p>

        {purchaseMsg && (
          <div style={{ marginTop: "1rem", background: "rgba(0, 242, 254, 0.12)", border: "1px solid var(--accent-cyan)", padding: "0.6rem 1rem", borderRadius: "8px", color: "var(--accent-cyan)", fontSize: "0.9rem" }}>
            ✨ {purchaseMsg}
          </div>
        )}
      </div>

      {/* カテゴリタブ */}
      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto" }}>
        {[
          { id: "defense", label: "🛡️ 防災資材", desc: "台風被害軽減" },
          { id: "weapons", label: "⚔️ 討伐武器", desc: "剣・弓・盾" },
          { id: "armors", label: "🥋 防具・服", desc: "HP/防御強化" },
          { id: "consumables", label: "🧪 薬品・肥料", desc: "回復・農業" }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`btn-ghost ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => {
              SoundManager.playClick();
              setActiveTab(tab.id);
            }}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              background: activeTab === tab.id ? "rgba(0, 242, 254, 0.15)" : "var(--bg-glass)",
              borderColor: activeTab === tab.id ? "var(--accent-cyan)" : "var(--border-subtle)",
              color: activeTab === tab.id ? "var(--accent-cyan)" : "var(--text-secondary)",
              textAlign: "left"
            }}
          >
            <div style={{ fontWeight: 800 }}>{tab.label}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* 防災資材タブ */}
      {activeTab === "defense" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          {["wind_net", "sandbag", "building_reinforce", "drainPump"].map((key) => {
            const item = ITEMS[key] || {
              id: "drainPump",
              name: "強制排水ポンプ",
              cost: 250,
              icon: "⛽",
              description: "豪雨時の農地水没被害を80%防ぐ。"
            };
            const currentOwned = player.inventory[item.id] || 0;
            const canAfford = player.money >= item.cost;
            return (
              <div key={item.id} className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.8rem" }}>{item.icon}</span>
                    <span className="badge badge-cyan">所持数: {currentOwned} 個</span>
                  </div>
                  <h3 style={{ fontSize: "1.05rem", marginBottom: "0.3rem" }}>{item.name}</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                    {item.description}
                  </p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                  <span className="stat-val" style={{ color: "var(--accent-gold)", fontSize: "1.1rem" }}>{item.cost} G</span>
                  <button
                    className="btn-primary"
                    disabled={!canAfford}
                    onClick={() => handleBuyItem(item.id)}
                    style={{ padding: "0.45rem 1rem", opacity: canAfford ? 1 : 0.5 }}
                  >
                    購入する
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 武器タブ */}
      {activeTab === "weapons" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
          {WEAPONS.map((wpn) => {
            const isOwned = player.ownedWeapons.some((w) => w.id === wpn.id);
            const isEquipped = player.equippedWeapon.id === wpn.id;
            const canAfford = player.money >= wpn.cost;
            return (
              <div key={wpn.id} className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.8rem" }}>{wpn.icon}</span>
                    {isEquipped ? (
                      <span className="badge badge-green">装備中</span>
                    ) : isOwned ? (
                      <span className="badge badge-cyan">所持済</span>
                    ) : (
                      <span className="badge badge-amber">{wpn.type === "sword" ? "近接・剣" : wpn.type === "bow" ? "遠距離・弓" : "防護・盾"}</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>{wpn.name}</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.6rem" }}>
                    {wpn.description}
                  </p>
                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "0.5rem", borderRadius: "8px", fontSize: "0.78rem" }}>
                    <div>攻撃力: <strong style={{ color: "var(--accent-red)" }}>+{wpn.attack}</strong> | 防御力: <strong style={{ color: "var(--accent-blue)" }}>+{wpn.defense}</strong></div>
                    <div style={{ marginTop: "4px", color: "var(--accent-cyan)" }}>
                      ✨ スキル: <strong>{wpn.skill.name}</strong> ({wpn.skill.cost} SP) - {wpn.skill.desc}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                  <span className="stat-val" style={{ color: "var(--accent-gold)", fontSize: "1.1rem" }}>{wpn.cost} G</span>
                  {isOwned ? (
                    <button
                      className="btn-ghost"
                      disabled={isEquipped}
                      onClick={() => equipWeapon(wpn)}
                      style={{ padding: "0.45rem 1rem" }}
                    >
                      {isEquipped ? "装備中" : "装備する"}
                    </button>
                  ) : (
                    <button
                      className="btn-primary"
                      disabled={!canAfford}
                      onClick={() => handleBuyWeapon(wpn)}
                      style={{ padding: "0.45rem 1rem", opacity: canAfford ? 1 : 0.5 }}
                    >
                      購入する
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 防具タブ */}
      {activeTab === "armors" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
          {ARMORS.map((arm) => {
            const isOwned = player.ownedArmors.some((a) => a.id === arm.id);
            const isEquipped = player.equippedArmor.id === arm.id;
            const canAfford = player.money >= arm.cost;
            return (
              <div key={arm.id} className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.8rem" }}>{arm.icon}</span>
                    {isEquipped ? (
                      <span className="badge badge-green">装備中</span>
                    ) : isOwned ? (
                      <span className="badge badge-cyan">所持済</span>
                    ) : (
                      <span className="badge badge-amber">防護装甲</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>{arm.name}</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.6rem" }}>
                    {arm.description}
                  </p>
                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "0.5rem", borderRadius: "8px", fontSize: "0.78rem" }}>
                    <div>防御力: <strong style={{ color: "var(--accent-blue)" }}>+{arm.defense}</strong> | HP補正: <strong style={{ color: "var(--accent-green)" }}>+{arm.hpBonus} HP</strong></div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                  <span className="stat-val" style={{ color: "var(--accent-gold)", fontSize: "1.1rem" }}>{arm.cost} G</span>
                  {isOwned ? (
                    <button
                      className="btn-ghost"
                      disabled={isEquipped}
                      onClick={() => equipArmor(arm)}
                      style={{ padding: "0.45rem 1rem" }}
                    >
                      {isEquipped ? "装備中" : "装備する"}
                    </button>
                  ) : (
                    <button
                      className="btn-primary"
                      disabled={!canAfford}
                      onClick={() => handleBuyArmor(arm)}
                      style={{ padding: "0.45rem 1rem", opacity: canAfford ? 1 : 0.5 }}
                    >
                      購入する
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 薬品・肥料タブ */}
      {activeTab === "consumables" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          {["potion_small", "potion_large", "energy_tonic", "fertilizer"].map((key) => {
            const item = ITEMS[key];
            if (!item) return null;
            const currentOwned = player.inventory[item.id] || 0;
            const canAfford = player.money >= item.cost;
            return (
              <div key={item.id} className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.8rem" }}>{item.icon}</span>
                    <span className="badge badge-cyan">所持数: {currentOwned} 個</span>
                  </div>
                  <h3 style={{ fontSize: "1.05rem", marginBottom: "0.3rem" }}>{item.name}</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                    {item.description}
                  </p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                  <span className="stat-val" style={{ color: "var(--accent-gold)", fontSize: "1.1rem" }}>{item.cost} G</span>
                  <button
                    className="btn-primary"
                    disabled={!canAfford}
                    onClick={() => handleBuyItem(item.id)}
                    style={{ padding: "0.45rem 1rem", opacity: canAfford ? 1 : 0.5 }}
                  >
                    購入する
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
