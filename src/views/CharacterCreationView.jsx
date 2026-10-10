import React, { useState } from "react";
import { useGame } from "../game/context/GameContext";
import { PREFECTURES } from "../game/constants/prefectures";
import CharacterPortrait from "../components/CharacterPortrait";
import "../styles/character-creation.css";

export default function CharacterCreationView() {
  const { player, setPlayer, completeCharacterCreation } = useGame();
  const [page, setPage] = useState(1);
  const [gender, setGender] = useState("");
  const [name, setName] = useState("");
  const [prefectureId, setPrefectureId] = useState(player.prefectureId || 14);

  const selectedPrefecture = PREFECTURES.find((pref) => pref.id === Number(prefectureId));
  const genderLabel = gender === "feminine" ? "女性" : "男性";
  const portraitState = (value) => !gender ? "" : gender === value ? "portrait-selected" : "portrait-dimmed";
  const startGame = () => {
    setPlayer((previous) => ({
      ...previous,
      name: name.trim() || "風害対策士",
      prefectureId: Number(prefectureId),
      appearance: { ...previous.appearance, gender }
    }));
    completeCharacterCreation();
  };

  return (
    <div className="char-create-container">
      <section key={page} className="char-create-wrapper character-setup-card">
        <div className="character-setup-grid">
          <aside className={`character-setup-portrait ${page === 1 ? "gender-gallery" : ""}`}>
            {page === 1 ? (
              <>
                <CharacterPortrait appearance={{ gender: "masculine" }} size={320} className={`setup-swordsman ${portraitState("masculine")}`} />
                <CharacterPortrait appearance={{ gender: "feminine" }} size={320} className={`setup-swordsman ${portraitState("feminine")}`} />
              </>
            ) : (
              <CharacterPortrait appearance={{ gender }} size={400} className="setup-swordsman" />
            )}
          </aside>

          <div className="character-setup-content">
            {page === 1 && (
              <>
                <h1>性別を決めましょう！</h1>
                <div className="gender-options">
                  {[["masculine", "男性"], ["feminine", "女性"]].map(([value, label]) => (
                    <button key={value} type="button" className={`option-btn gender-option ${gender === value ? "selected" : ""}`} aria-pressed={gender === value} onClick={() => setGender(value)}>{label}</button>
                  ))}
                </div>
                <div className="creation-actions setup-actions gender-actions">
                  <button className="btn-primary" disabled={!gender} onClick={() => setPage(2)}>決定</button>
                </div>
              </>
            )}

            {page === 2 && (
              <>
                <h1>名前と出身都道府県を決めましょう！</h1>
                <label className="creation-field">名前<input maxLength={16} value={name} onChange={(event) => setName(event.target.value)} placeholder="風害対策士" /></label>
                <label className="creation-field">出身都道府県<select value={prefectureId} onChange={(event) => setPrefectureId(event.target.value)}>{PREFECTURES.map((pref) => <option key={pref.id} value={pref.id}>{pref.name}</option>)}</select></label>
                <div className="creation-actions setup-actions">
                  <button className="btn-ghost" onClick={() => setPage(1)}>戻る</button>
                  <button className="btn-primary" onClick={() => setPage(3)}>決定</button>
                </div>
              </>
            )}

            {page === 3 && (
              <>
                <h1>この設定でよろしいですか？</h1>
                <dl className="character-review-list">
                  <div><dt>性別</dt><dd>{genderLabel}</dd></div>
                  <div><dt>名前</dt><dd>{name.trim() || "風害対策士"}</dd></div>
                  <div><dt>出身都道府県</dt><dd>{selectedPrefecture?.name}</dd></div>
                </dl>
                <p className="character-lock-warning">あとからは変更できません</p>
                <div className="creation-actions setup-actions review-actions">
                  <button className="btn-ghost" onClick={() => setPage(2)}>戻る</button>
                  <button className="btn-primary" onClick={startGame}>決定</button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
