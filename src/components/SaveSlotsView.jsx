import React, { useRef, useState } from "react";
import { useGame } from "../game/context/GameContext";
import { SoundManager } from "../game/services/SoundManager";
import "../styles/save-slots.css";

const ENEMY_IMAGE_BY_TYPE = {
  rain: "/typhoon-rain-cutout-v3.png",
  gale: "/typhoon-gale-cutout-v3.png",
  large: "/typhoon-storm-cutout-v3.png",
  complex: "/typhoon-super-cutout-v3.png"
};

const formatPlayTime = (milliseconds = 0) => {
  const totalMinutes = Math.floor(Math.max(0, milliseconds) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
};

export default function SaveSlotsView({ mode = "save", onClose }) {
  const { saveSlots, manualSave, loadSaveSlot, isPaused, setIsPaused } = useGame();
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notice, setNotice] = useState("");
  const wasPausedRef = useRef(isPaused);
  const isSaveMode = mode === "save";
  const selectedData = selectedSlot === null ? null : saveSlots[selectedSlot];

  const openConfirmation = (index) => {
    wasPausedRef.current = isPaused;
    if (isSaveMode) setIsPaused(true);
    setSelectedSlot(index);
    setNotice("");
    SoundManager.playClick();
  };

  const closeConfirmation = () => {
    setSelectedSlot(null);
    if (isSaveMode) setIsPaused(wasPausedRef.current);
  };

  const confirmSelection = () => {
    if (selectedSlot === null) return;
    if (isSaveMode) {
      const success = manualSave(selectedSlot);
      setNotice(success ? `スロット${selectedSlot + 1}にセーブしました。` : "セーブできませんでした。空き容量を確認してください。");
      if (success) SoundManager.playHarvest();
      closeConfirmation();
      return;
    }
    const success = loadSaveSlot(selectedSlot);
    if (success) {
      SoundManager.playClick();
      onClose?.();
    } else {
      setNotice("セーブデータを読み込めませんでした。");
      closeConfirmation();
    }
  };

  return (
    <div className="save-slots-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section className="save-slots-panel" role="dialog" aria-modal="true" aria-labelledby="save-slots-title" onClick={(event) => event.stopPropagation()}>
        <header className="save-slots-header">
          <div>
            <h2 id="save-slots-title">{isSaveMode ? "セーブスロット" : "ロードゲーム"}</h2>
            <p>{isSaveMode ? "保存先のスロットを選んでください（最大10件）" : "再開するスロットを選んでください"}</p>
          </div>
          <button className="save-slots-close" type="button" onClick={onClose} aria-label="閉じる">×</button>
        </header>

        <div className="save-slots-grid">
          {Array.from({ length: 10 }, (_, index) => {
            const save = saveSlots[index];
            const gender = save?.player?.appearance?.gender;
            const characterImage = gender === "feminine" ? "/player-female-normalized.png" : "/player-male-normalized.png";
            const enemy = save?.defeatedEnemy || save?.lastResult?.typhoon;
            const enemyImage = enemy ? ENEMY_IMAGE_BY_TYPE[enemy.type] : null;
            return (
              <button
                className={`save-slot-card${save ? " is-saved" : " is-empty"}${selectedSlot === index ? " is-selected" : ""}`}
                type="button"
                key={index}
                disabled={!isSaveMode && !save}
                onClick={() => openConfirmation(index)}
                aria-label={save ? `スロット${index + 1}、レベル${save.player?.level || 1}` : `スロット${index + 1}、空き`}
              >
                <div className="save-slot-card-heading"><strong>スロット {index + 1}</strong></div>
                {save ? (
                  <div className="save-slot-content">
                    <div className="save-slot-character"><img src={characterImage} alt="キャラクター" /></div>
                    <div className="save-slot-details">
                      <strong>Lv.{save.player?.level || 1}　{save.player?.name || "主人公"}</strong>
                      <span>討伐した敵</span>
                      {enemyImage ? <img className="save-slot-enemy" src={enemyImage} alt={enemy.name || "討伐した敵"} /> : <span className="save-slot-no-enemy">討伐記録なし</span>}
                      <small>{save.savedAtStr || (save.savedAt ? new Date(save.savedAt).toLocaleString("ja-JP") : "日時不明")}</small>
                      <small>プレイ時間：{formatPlayTime(save.playTimeMs)}</small>
                    </div>
                  </div>
                ) : (
                  <div className="save-slot-empty-message">空きスロット</div>
                )}
              </button>
            );
          })}
        </div>

        {notice && <p className="save-slots-notice" role="status">{notice}</p>}
      </section>
      {selectedSlot !== null && (
        <div className="save-slot-confirm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeConfirmation(); }}>
          <section className="save-slot-confirm" role="dialog" aria-modal="true" aria-label="slot confirmation" onClick={(event) => event.stopPropagation()}>
            <p>{isSaveMode
              ? selectedData
                ? `このスロットにはセーブした内容が記録されています。スロット${selectedSlot + 1}に上書き保存しますか？`
                : `スロット${selectedSlot + 1}にセーブしますか？`
              : `スロット${selectedSlot + 1}を始めますか？`}</p>
            <div>
              <button className="btn-ghost" type="button" onClick={confirmSelection}>はい</button>
              <button className="btn-ghost" type="button" onClick={closeConfirmation}>いいえ</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
