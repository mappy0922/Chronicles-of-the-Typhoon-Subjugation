const STORAGE_KEY = "typhoon-game-key-bindings-v1";

export const KEY_BINDING_DEFINITIONS = [
  { id: "moveLeft", label: "\u5DE6\u3078\u79FB\u52D5", group: "\u79FB\u52D5" },
  { id: "moveRight", label: "\u53F3\u3078\u79FB\u52D5", group: "\u79FB\u52D5" },
  { id: "shiftModifier", label: "Shift\u64CD\u4F5C", group: "\u79FB\u52D5" },
  { id: "fight", label: "\u305F\u305F\u304B\u3046", group: "\u6226\u95D8" },
  { id: "guard", label: "\u307E\u3082\u308B", group: "\u6226\u95D8" },
  { id: "heal", label: "\u56DE\u5FA9", group: "\u6226\u95D8" },
  { id: "special", label: "\u5FC5\u6BBA\u6280", group: "\u6226\u95D8" }
];

const DEFAULTS = {
  moveLeft: ["a", ""],
  moveRight: ["d", ""],
  shiftModifier: ["code:shiftleft", "code:shiftright"],
  fight: ["l", ""],
  guard: ["k", ""],
  heal: ["m", ""],
  special: ["n", ""]
};
const PREVIOUS_DEFAULTS = { moveLeft: "a", moveRight: "d", fight: "z", guard: "x", heal: "a", special: "s" };
const cloneDefaults = () => Object.fromEntries(Object.entries(DEFAULTS).map(([id, keys]) => [id, [...keys]]));

export function getKeyBindings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const hasOnlyPreviousDefaults = Object.keys(PREVIOUS_DEFAULTS).every((id) => saved[id] === PREVIOUS_DEFAULTS[id]);
    if (hasOnlyPreviousDefaults) return cloneDefaults();
    const bindings = Object.fromEntries(Object.keys(DEFAULTS).map((id) => {
      const value = saved[id];
      const keys = Array.isArray(value) ? value : typeof value === "string" ? [value, ""] : DEFAULTS[id];
      return [id, [0, 1].map((index) => typeof keys[index] === "string" ? keys[index].toLowerCase() : DEFAULTS[id][index])];
    }));
    return bindings;
  } catch {
    return cloneDefaults();
  }
}

export function setKeyBinding(action, slotIndex, key) {
  const current = getKeyBindings();
  const slots = [...(current[action] || DEFAULTS[action])];
  const otherSlotIndex = slotIndex === 0 ? 1 : 0;
  if (slots[otherSlotIndex] === key.toLowerCase()) slots[otherSlotIndex] = "";
  slots[slotIndex] = key.toLowerCase();
  const next = { ...current, [action]: slots };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Ignore unavailable storage. */ }
  window.dispatchEvent(new CustomEvent("typhoon-key-bindings-changed", { detail: next }));
  return next;
}

export function getPrimaryBinding(bindings, action) {
  const keys = bindings?.[action];
  if (Array.isArray(keys)) return keys[0] || "";
  return typeof keys === "string" ? keys : "";
}

export function resetKeyBindings() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* Ignore unavailable storage. */ }
  const defaults = cloneDefaults();
  window.dispatchEvent(new CustomEvent("typhoon-key-bindings-changed", { detail: defaults }));
  return defaults;
}

export function getBindingKeys(bindings, action) {
  const value = bindings?.[action];
  return (Array.isArray(value) ? value : typeof value === "string" ? [value] : []).filter(Boolean);
}

function bindingIdentity(binding) {
  const normalized = binding.toLowerCase();
  if (!normalized.startsWith("code:")) return normalized;
  const code = normalized.slice(5);
  if (/^key[a-z]$/.test(code)) return code.slice(3);
  if (/^digit[0-9]$/.test(code)) return code.slice(5);
  if (/^numpad[0-9]$/.test(code)) return code.slice(6);
  const codeToKey = {
    space: " ", arrowleft: "arrowleft", arrowright: "arrowright", arrowup: "arrowup", arrowdown: "arrowdown",
    enter: "enter", escape: "escape", backspace: "backspace", delete: "delete", tab: "tab",
    shiftleft: "shift", shiftright: "shift", controlleft: "control", controlright: "control",
    altleft: "alt", altright: "alt", metaleft: "meta", metaright: "meta",
    minus: "-", equal: "=", bracketleft: "[", bracketright: "]", backslash: "\\",
    semicolon: ";", quote: "'", backquote: "`", comma: ",", period: ".", slash: "/",
    numpadadd: "+", numpadsubtract: "-", numpadmultiply: "*", numpaddivide: "/", numpaddecimal: "."
  };
  return codeToKey[code] || code;
}

export function bindingsMatchSameInput(first, second) {
  return bindingIdentity(first) === bindingIdentity(second);
}

export function matchesKeyBinding(bindings, action, event) {
  const eventKey = event.key.toLowerCase();
  const eventCodes = new Set();
  if (event.code && event.code !== "Unidentified") eventCodes.add(`code:${event.code.toLowerCase()}`);
  // Some browsers/keyboards report only "Shift" in `key`; location identifies
  // the physical side and keeps Right Shift bindings distinguishable.
  if (event.key === "Shift" && event.location === 1) eventCodes.add("code:shiftleft");
  if (event.key === "Shift" && event.location !== 1) eventCodes.add("code:shiftright");
  return getBindingKeys(bindings, action).some((binding) =>
    binding.startsWith("code:") ? eventCodes.has(binding) : binding.toLowerCase() === eventKey
  );
}

export function formatKeyBinding(key) {
  if (!key) return "\u672A\u8A2D\u5B9A";
  const mouseLabels = {
    "mouse:left": "\u5DE6\u30AF\u30EA\u30C3\u30AF",
    "mouse:right": "\u53F3\u30AF\u30EA\u30C3\u30AF",
    "mouse:middle": "\u30DB\u30A4\u30FC\u30EB\u30AF\u30EA\u30C3\u30AF"
  };
  if (mouseLabels[key]) return mouseLabels[key];
  if (key.startsWith("code:")) {
    const code = key.slice(5).toLowerCase();
    const labels = {
      space: "Space", arrowleft: "\u2190", arrowright: "\u2192", arrowup: "\u2191", arrowdown: "\u2193",
      enter: "Enter", escape: "Esc", backspace: "Backspace", delete: "Delete", tab: "Tab", capslock: "Caps Lock",
      shiftleft: "Left Shift", shiftright: "Right Shift", controlleft: "Left Ctrl", controlright: "Right Ctrl",
      altleft: "Left Alt", altright: "Right Alt", metaleft: "Left Win", metaright: "Right Win",
      pageup: "Page Up", pagedown: "Page Down", home: "Home", end: "End", insert: "Insert",
      numpadadd: "Num +", numpadsubtract: "Num -", numpadmultiply: "Num *", numpaddivide: "Num /", numpaddecimal: "Num ."
    };
    if (labels[code]) return labels[code];
    if (/^key[a-z]$/.test(code)) return code.slice(3).toUpperCase();
    if (/^digit[0-9]$/.test(code)) return code.slice(5);
    if (/^numpad[0-9]$/.test(code)) return `Num ${code.slice(6)}`;
    if (/^f([1-9]|1[0-9]|2[0-4])$/.test(code)) return code.toUpperCase();
    const punctuation = { minus: "-", equal: "=", bracketleft: "[", bracketright: "]", backslash: "\\\\", semicolon: ";", quote: "'", backquote: "`", comma: ",", period: ".", slash: "/" };
    return punctuation[code] || code;
  }
  return key.length === 1 ? key.toUpperCase() : key;
}
