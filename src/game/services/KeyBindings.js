const STORAGE_KEY = "typhoon-game-key-bindings-v1";

export const KEY_BINDING_DEFINITIONS = [
  { id: "moveLeft", label: "左へ移動", group: "移動" },
  { id: "moveRight", label: "右へ移動", group: "移動" },
  { id: "fight", label: "たたかう", group: "戦闘" },
  { id: "guard", label: "まもる", group: "戦闘" },
  { id: "heal", label: "回復", group: "戦闘" },
  { id: "special", label: "必殺技", group: "戦闘" }
];

const DEFAULTS = { moveLeft: "a", moveRight: "d", fight: "z", guard: "x", heal: "a", special: "s" };

export function getKeyBindings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULTS, ...Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, typeof saved[key] === "string" ? saved[key] : DEFAULTS[key]])) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setKeyBinding(action, key) {
  const current = getKeyBindings();
  const next = { ...current, [action]: key.toLowerCase() };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Ignore unavailable storage. */ }
  window.dispatchEvent(new CustomEvent("typhoon-key-bindings-changed", { detail: next }));
  return next;
}

export function resetKeyBindings() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* Ignore unavailable storage. */ }
  const defaults = { ...DEFAULTS };
  window.dispatchEvent(new CustomEvent("typhoon-key-bindings-changed", { detail: defaults }));
  return defaults;
}

export function formatKeyBinding(key) {
  return key.length === 1 ? key.toUpperCase() : key;
}
