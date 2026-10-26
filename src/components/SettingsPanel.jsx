import React, { useEffect, useState } from "react";
import { SoundManager } from "../game/services/SoundManager";
import { formatKeyBinding, getKeyBindings, KEY_BINDING_DEFINITIONS, resetKeyBindings, setKeyBinding } from "../game/services/KeyBindings";

const VOLUME_CONTROLS = [
  ["bgm", "BGM"],
  ["se", "SE"],
  ["voice", "Voice"],
  ["ambient", "環境音"],
  ["master", "Master Volume"]
];
const DEFAULT_VOLUMES = { bgm: 100, se: 100, voice: 100, ambient: 100, master: 100 };

export default function SettingsPanel({ onClose }) {
  const [volumes, setVolumes] = useState(() => SoundManager.getVolumes());
  const [keyBindings, setKeyBindings] = useState(getKeyBindings);
  const [listening, setListening] = useState(null);
  const [keyError, setKeyError] = useState("");

  useEffect(() => {
    const handleGlobalEscape = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      if (listening) {
        setListening(null);
        setKeyError("");
      } else {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleGlobalEscape);
    return () => window.removeEventListener("keydown", handleGlobalEscape);
  }, [listening, onClose]);

  const updateVolume = (channel, value) => {
    const nextValue = Number(value);
    setVolumes((current) => ({ ...current, [channel]: nextValue }));
    SoundManager.setVolume(channel, nextValue);
  };

  const resetVolumes = () => {
    Object.entries(DEFAULT_VOLUMES).forEach(([channel, value]) => SoundManager.setVolume(channel, value));
    setVolumes({ ...DEFAULT_VOLUMES });
  };

  const captureKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (listening) {
        setListening(null);
        setKeyError("");
      } else {
        onClose?.();
      }
      return;
    }
    if (!listening) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.ctrlKey || event.altKey || event.metaKey || event.key.length !== 1 || !/^[a-z0-9]$/i.test(event.key)) {
      setKeyError("英字または数字キーを選んでください。");
      return;
    }
    const key = event.key.toLowerCase();
    const sameGroupDuplicate = KEY_BINDING_DEFINITIONS.some((item) => item.id !== listening && item.group === KEY_BINDING_DEFINITIONS.find((entry) => entry.id === listening)?.group && keyBindings[item.id] === key);
    if (sameGroupDuplicate) {
      setKeyError("同じ操作グループ内ではキーを重複できません。");
      return;
    }
    setKeyBindings(setKeyBinding(listening, key));
    setListening(null);
    setKeyError("");
  };

  return (
    <section
      className="settings-panel"
      role="dialog"
      aria-modal="true"
      aria-label="設定"
      onKeyDown={captureKey}
      onClick={(event) => {
        if (listening && !event.target.closest(".settings-key-row button")) {
          setListening(null);
          setKeyError("");
        }
      }}
    >
      <div className="settings-section">
        <h3>キー設定</h3>
        <div className="settings-key-bindings">
          {KEY_BINDING_DEFINITIONS.map(({ id, label }) => (
            <div className="settings-key-row" key={id}>
              <span>{label}</span>
              <button type="button" className={listening === id ? "is-listening" : ""} onClick={() => { setListening(id); setKeyError(""); }}>
                {listening === id ? "キーを押してください" : formatKeyBinding(keyBindings[id])}
              </button>
            </div>
          ))}
        </div>
        {keyError && <p className="settings-key-error" role="alert">{keyError}</p>}
        <button type="button" className="settings-reset-button" onClick={() => { setKeyBindings(resetKeyBindings()); setListening(null); setKeyError(""); }}>初期設定に戻す</button>
      </div>
      <div className="settings-section">
        <h3>音量設定</h3>
        <div className="pause-volume-settings" aria-label="音量設定">
          {VOLUME_CONTROLS.map(([channel, label]) => (
            <label className="pause-volume-control" key={channel}>
              <span>{label}</span>
              <input type="range" min="0" max="100" step="1" value={volumes[channel]} onChange={(event) => updateVolume(channel, event.target.value)} aria-label={`${label}の音量`} />
              <output>{volumes[channel]}</output>
            </label>
          ))}
        </div>
        <button type="button" className="settings-reset-button" onClick={resetVolumes}>初期設定に戻す</button>
      </div>
    </section>
  );
}
