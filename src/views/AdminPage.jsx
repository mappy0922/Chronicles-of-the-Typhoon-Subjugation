import React, { useEffect, useState } from "react";
import "../styles/admin.css";

const CONTROL_KEY = "TYPHOON_SUBJUGATION_FORCED_WEATHER_V1";
const CHANNEL_NAME = "typhoon-weather-control";
const OPTIONS = [
  ["sunny", "晴れ"],
  ["breeze", "そよかぜ型"],
  ["heavyRain", "豪雨型"],
  ["gale", "暴風型"],
  ["storm", "嵐型"],
  ["superTyphoon", "超大型型"]
];

export default function AdminPage() {
  const [selected, setSelected] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CONTROL_KEY) || "null")?.preset || null; }
    catch { return null; }
  });
  const [channel] = useState(() => "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null);

  useEffect(() => () => channel?.close(), [channel]);

  const chooseWeather = (preset) => {
    const message = { preset, updatedAt: Date.now() };
    setSelected(preset);
    localStorage.setItem(CONTROL_KEY, JSON.stringify(message));
    channel?.postMessage(message);
  };

  const clearWeatherOverride = () => {
    localStorage.removeItem(CONTROL_KEY);
    setSelected(null);
    channel?.postMessage({ action: "clear", updatedAt: Date.now() });
  };

  return (
    <main className="admin-page">
      <section className="admin-panel">
        <h1>天候管理</h1>
        <div className="admin-weather-grid">
          {OPTIONS.map(([id, label]) => (
            <button
              className={`btn-ghost admin-weather-button${selected === id ? " is-selected" : ""}`}
              key={id}
              onClick={() => chooseWeather(id)}
              aria-pressed={selected === id}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="btn-ghost admin-clear-weather" onClick={clearWeatherOverride} disabled={!selected}>
          強制解除
        </button>
        <p className="admin-current">現在の設定：<strong>{OPTIONS.find(([id]) => id === selected)?.[1] || "気象庁の天候"}</strong></p>
      </section>
    </main>
  );
}
