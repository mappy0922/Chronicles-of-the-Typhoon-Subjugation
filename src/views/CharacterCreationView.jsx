import React, { useState } from "react";
import { useGame } from "../game/context/GameContext";
import { PREFECTURES } from "../game/constants/prefectures";
import PlayerAvatar, { DEFAULT_APPEARANCE } from "../components/PlayerAvatar";
import "../styles/character-creation.css";

const COLORS = ["#fbd38d", "#f3c5a5", "#d9a477", "#a96f50", "#1e293b", "#7c3aed", "#dc2626", "#f8fafc", "#0f766e", "#d97706"];
const OPTIONS = {
  gender: [["masculine", "男性的"], ["feminine", "女性的"]],
  faceShape: [["sharp", "シャープ"], ["round", "丸顔"], ["square", "四角"]],
  hairStyle: [["short", "ショート"], ["wolf", "ウルフ"], ["long", "ロング"], ["ponytail", "ポニーテール"], ["twintail", "ツインテール"], ["samurai", "サムライ"]],
  eyeType: [["sharp", "鋭い"], ["calm", "穏やか"], ["cool", "クール"], ["intense", "力強い"]],
  mole: [["none", "なし"], ["eye_mole", "目元"], ["mouth_mole", "口元"], ["cheek_mole", "頬"]],
  glasses: [["none", "なし"], ["square", "スクエア"], ["round", "丸メガネ"], ["sunglasses", "サングラス"]],
  accessory: [["none", "なし"], ["bandage", "ばんそうこう"], ["scar", "傷あと"], ["earring", "イヤリング"]]
};
const CATEGORIES = [["gender", "スタイル"], ["skinTone", "肌色"], ["faceShape", "顔"], ["hairStyle", "髪型"], ["hairColor", "髪色"], ["eyeType", "目"], ["eyeColor", "瞳色"], ["mole", "ほくろ"], ["glasses", "メガネ"], ["accessory", "アクセサリー"]];

export default function CharacterCreationView() {
  const { player, setPlayer, completeCharacterCreation } = useGame();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [prefectureId, setPrefectureId] = useState(player.prefectureId || 14);
  const [appearance, setAppearance] = useState({ ...DEFAULT_APPEARANCE, ...player.appearance });
  const [category, setCategory] = useState("hairStyle");

  const updateAppearance = (key, value) => setAppearance((prev) => ({ ...prev, [key]: value }));
  const finish = () => {
    setPlayer((prev) => ({ ...prev, name: name.trim() || "風害対策士", prefectureId: Number(prefectureId), appearance }));
    completeCharacterCreation();
  };

  return (
    <div className="char-create-container">
      <section className="char-create-wrapper">
        <header>
          <p className="char-create-kicker">NEW GAME / CHARACTER SETUP</p>
          <h1>主人公を作成</h1>
          <div className="wizard-steps" aria-label="作成ステップ">
            {["プロフィール", "外見"].map((label, i) => <div key={label} className={`wizard-step-item ${step === i + 1 ? "active" : ""}`}><span className="wizard-step-num">{i + 1}</span>{label}</div>)}
          </div>
        </header>

        {step === 1 ? (
          <div className="creation-profile">
            <label className="creation-field">プレイヤー名<input maxLength={16} value={name} onChange={(e) => setName(e.target.value)} placeholder="風害対策士" /></label>
            <label className="creation-field">出身都道府県<select value={prefectureId} onChange={(e) => setPrefectureId(e.target.value)}>{PREFECTURES.map((pref) => <option key={pref.id} value={pref.id}>{pref.name}（リスク x{pref.stormRisk.toFixed(1)}）</option>)}</select></label>
            <div className="creation-actions"><button className="btn-primary" onClick={() => setStep(2)}>外見を設定する →</button></div>
          </div>
        ) : (
          <div className="char-custom-grid">
            <aside className="avatar-preview-stage"><span className="avatar-preview-label">LIVE PREVIEW</span><PlayerAvatar appearance={appearance} size={220} /><div className="avatar-pedestal-ring"/><strong>{name.trim() || "風害対策士"}</strong><span>{PREFECTURES.find((pref) => pref.id === Number(prefectureId))?.name}</span></aside>
            <div className="creation-customizer">
              <div className="custom-category-tabs">{CATEGORIES.map(([key, label]) => <button key={key} className={`custom-tab-btn ${category === key ? "active" : ""}`} onClick={() => setCategory(key)}>{label}</button>)}</div>
              {category.endsWith("Color") ? <div className="color-picker-row">{COLORS.map((color) => <button key={color} className={`color-dot-btn ${appearance[category] === color ? "selected" : ""}`} style={{ backgroundColor: color }} aria-label={color} onClick={() => updateAppearance(category, color)} />)}</div> : <div className="options-grid">{(OPTIONS[category] || []).map(([value, label]) => <button key={value} className={`option-btn ${appearance[category] === value ? "selected" : ""}`} onClick={() => updateAppearance(category, value)}>{label}</button>)}</div>}
              <div className="creation-actions"><button className="btn-ghost" onClick={() => setStep(1)}>← プロフィールに戻る</button><button className="btn-primary" onClick={finish}>この主人公で開始</button></div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
