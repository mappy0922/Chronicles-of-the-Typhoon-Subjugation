import React, { useEffect, useRef, useState } from "react";
import { SoundManager } from "../game/services/SoundManager";
import { formatKeyBinding, getBindingKeys, getKeyBindings, KEY_BINDING_DEFINITIONS, resetKeyBindings, setKeyBinding } from "../game/services/KeyBindings";

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
  const suppressCapturedClick = useRef(false);

  useEffect(() => {
    const suppressClickAfterMouseBinding = (event) => {
      if (!suppressCapturedClick.current) return;
      suppressCapturedClick.current = false;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    window.addEventListener("click", suppressClickAfterMouseBinding, true);
    return () => window.removeEventListener("click", suppressClickAfterMouseBinding, true);
  }, []);

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

  useEffect(() => {
    if (!listening) return undefined;
    const mouseKeys = { 0: "mouse:left", 1: "mouse:middle", 2: "mouse:right" };
    const assignMouseButton = (event) => {
      if (event.target instanceof Element && event.target.closest(".settings-cancel-capture")) return;
      const key = mouseKeys[event.button];
      if (!key) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.button === 0) suppressCapturedClick.current = true;
      const [action, slotValue] = listening.split(":");
      const slotIndex = Number(slotValue);
      const group = KEY_BINDING_DEFINITIONS.find((item) => item.id === action)?.group;
      const duplicate = KEY_BINDING_DEFINITIONS
        .filter((item) => item.group === group || item.id === "shiftModifier" || action === "shiftModifier")
        .some((item) => getBindingKeys(keyBindings, item.id).some((boundKey, index) =>
          boundKey === key && (item.id !== action || index !== slotIndex)
        ));
      if (duplicate) {
        setKeyError("\u540C\u3058\u64CD\u4F5C\u30B0\u30EB\u30FC\u5185\u3067\u306F\u30AD\u30FC\u3092\u91CD\u8907\u3067\u304D\u307E\u305B\u3093\u3002");
        return;
      }
      setKeyBindings(setKeyBinding(action, slotIndex, key));
      setListening(null);
      setKeyError("");
    };
    const preventContextMenu = (event) => event.preventDefault();
    window.addEventListener("mousedown", assignMouseButton, true);
    window.addEventListener("contextmenu", preventContextMenu, true);
    return () => {
      window.removeEventListener("mousedown", assignMouseButton, true);
      window.removeEventListener("contextmenu", preventContextMenu, true);
    };
  }, [listening, keyBindings]);

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
    if (event.key === "Escape" && !listening) {
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
      return;
    }
    if (!listening) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.code || event.code === "Unidentified") {
      setKeyError("\u3053\u306E\u30AD\u30FC\u306F\u767B\u9332\u3067\u304D\u307E\u305B\u3093\u3002");
      return;
    }
    const [action, slotValue] = listening.split(":");
    const slotIndex = Number(slotValue);
    const key = `code:${event.code}`;
    const group = KEY_BINDING_DEFINITIONS.find((item) => item.id === action)?.group;
    const duplicate = KEY_BINDING_DEFINITIONS
      .filter((item) => item.group === group || item.id === "shiftModifier" || action === "shiftModifier")
      .some((item) => getBindingKeys(keyBindings, item.id).some((boundKey, index) =>
        boundKey === key && (item.id !== action || index !== slotIndex)
      ));
    if (duplicate) {
      setKeyError("\u540C\u3058\u64CD\u4F5C\u30B0\u30EB\u30FC\u5185\u3067\u306F\u30AD\u30FC\u3092\u91CD\u8907\u3067\u304D\u307E\u305B\u3093\u3002");
      return;
    }
    setKeyBindings(setKeyBinding(action, slotIndex, key));
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
    >
      <div className="settings-section">
        <h3>キー設定</h3>
        <div className="settings-key-bindings" role="table" aria-label={"\u30AD\u30FC\u5272\u308A\u5F53\u3066"}>
          <div className="settings-key-row settings-key-header" role="row">
            <span className="settings-key-action" role="columnheader">{"\u64CD\u4F5C"}</span>
            <span role="columnheader">{"\u30AD\u30FC1"}</span>
            <span role="columnheader">{"\u30AD\u30FC2"}</span>
          </div>
          {KEY_BINDING_DEFINITIONS.map(({ id, label }) => (
            <div className="settings-key-row" key={id} role="row">
              <span className="settings-key-action" role="rowheader">{label}</span>
              {[0, 1].map((slotIndex) => {
                const listenId = `${id}:${slotIndex}`;
                const keys = getBindingKeys(keyBindings, id);
                return (
                  <span className="settings-key-cell" key={listenId} role="cell">
                    <button type="button" className={listening === listenId ? "is-listening" : ""} onClick={() => { setListening(listenId); setKeyError(""); }}>
                      {listening === listenId ? "\u30AD\u30FC\u307E\u305F\u306F\u30DE\u30A6\u30B9\u30DC\u30BF\u30F3\u3092\u5165\u529B" : formatKeyBinding(keys[slotIndex] || "")}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        {keyError && <p className="settings-key-error" role="alert">{keyError}</p>}
        {listening && <button type="button" className="settings-cancel-capture" onClick={() => { setListening(null); setKeyError(""); }}>{"\u30AD\u30E3\u30F3\u30BB\u30EB"}</button>}
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
