import React from "react";

// デフォルトのアバター外見データ
export const DEFAULT_APPEARANCE = {
  skinTone: "#fbd38d", // 肌色
  faceShape: "sharp",  // sharp, round, square
  hairStyle: "short",  // short, wolf, long, ponytail, twintail, samurai
  hairColor: "#1e293b", // 髪色 (黒, 栗, 金, 白, 蒼, 紅)
  eyeType: "sharp",    // sharp, calm, cool, intense
  eyeColor: "#0284c7", // 瞳の色
  mole: "none",        // none, eye_mole, mouth_mole, cheek_mole
  glasses: "none",     // none, square, round, sunglasses
  accessory: "none"    // none, bandage, scar, earring
};

export default function PlayerAvatar({ appearance = DEFAULT_APPEARANCE, size = 120, className = "" }) {
  const app = { ...DEFAULT_APPEARANCE, ...appearance };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        {/* 背景シャドウ */}
        <filter id="avatar-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.35" />
        </filter>
        <linearGradient id="body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* 胴体・服 (気象守護士の装束) */}
      <path
        d="M 50 190 Q 100 160 150 190 L 160 200 L 40 200 Z"
        fill="url(#body-grad)"
        stroke="rgba(0, 242, 254, 0.4)"
        strokeWidth="2"
      />
      {/* 襟・マフラー */}
      <path d="M 85 165 L 100 180 L 115 165 Z" fill="#00f2fe" opacity="0.8" />

      {/* 首 */}
      <rect x="88" y="130" width="24" height="25" fill={app.skinTone} />

      {/* 後ろ髪 (ロング / ポニーテール等の場合) */}
      {app.hairStyle === "long" && (
        <path d="M 50 80 Q 40 160 60 190 Q 100 170 140 190 Q 160 160 150 80 Z" fill={app.hairColor} />
      )}
      {app.hairStyle === "twintail" && (
        <g fill={app.hairColor}>
          <path d="M 55 90 Q 20 120 25 180 Q 45 150 55 120 Z" />
          <path d="M 145 90 Q 180 120 175 180 Q 155 150 145 120 Z" />
        </g>
      )}
      {app.hairStyle === "ponytail" && (
        <path d="M 140 70 Q 190 70 175 140 Q 150 110 135 90 Z" fill={app.hairColor} />
      )}

      {/* 顔・頭部の輪郭 */}
      {app.faceShape === "round" ? (
        <circle cx="100" cy="100" r="42" fill={app.skinTone} filter="url(#avatar-shadow)" />
      ) : app.faceShape === "square" ? (
        <rect x="60" y="60" width="80" height="80" rx="20" fill={app.skinTone} filter="url(#avatar-shadow)" />
      ) : (
        /* sharp (デフォルト) */
        <path
          d="M 60 80 Q 60 135 100 148 Q 140 135 140 80 Q 140 58 100 58 Q 60 58 60 80 Z"
          fill={app.skinTone}
          filter="url(#avatar-shadow)"
        />
      )}

      {/* 耳 */}
      <circle cx="58" cy="100" r="8" fill={app.skinTone} />
      <circle cx="142" cy="100" r="8" fill={app.skinTone} />
      {app.accessory === "earring" && (
        <circle cx="56" cy="105" r="3" fill="#fbbf24" />
      )}

      {/* 眉毛 */}
      {app.eyeType === "sharp" || app.eyeType === "intense" ? (
        <g stroke={app.hairColor} strokeWidth="3" strokeLinecap="round">
          <line x1="72" y1="84" x2="88" y2="88" />
          <line x1="128" y1="84" x2="112" y2="88" />
        </g>
      ) : (
        <g stroke={app.hairColor} strokeWidth="2.5" strokeLinecap="round">
          <line x1="72" y1="86" x2="88" y2="85" />
          <line x1="128" y1="86" x2="112" y2="85" />
        </g>
      )}

      {/* 目 */}
      {/* 白目 */}
      <ellipse cx="80" cy="98" rx="8" ry="6" fill="#ffffff" />
      <ellipse cx="120" cy="98" rx="8" ry="6" fill="#ffffff" />
      {/* 瞳 */}
      <circle cx="80" cy="98" r="4.5" fill={app.eyeColor} />
      <circle cx="120" cy="98" r="4.5" fill={app.eyeColor} />
      {/* ハイライト */}
      <circle cx="78" cy="96" r="1.5" fill="#ffffff" />
      <circle cx="118" cy="96" r="1.5" fill="#ffffff" />
      {/* まつ毛・アイライン */}
      <path d="M 70 95 Q 80 90 90 95" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      <path d="M 130 95 Q 120 90 110 95" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />

      {/* 鼻 */}
      <path d="M 100 102 L 98 114 L 102 114" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

      {/* 口 */}
      {app.eyeType === "intense" ? (
        <path d="M 94 128 Q 100 124 106 128" fill="none" stroke="#991b1b" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M 94 126 Q 100 132 106 126" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
      )}

      {/* ほくろ */}
      {app.mole === "eye_mole" && (
        <circle cx="88" cy="107" r="1.5" fill="#451a03" />
      )}
      {app.mole === "mouth_mole" && (
        <circle cx="91" cy="132" r="1.5" fill="#451a03" />
      )}
      {app.mole === "cheek_mole" && (
        <circle cx="126" cy="112" r="1.5" fill="#451a03" />
      )}

      {/* 傷 / 絆創膏 */}
      {app.accessory === "bandage" && (
        <rect x="110" y="110" width="16" height="8" rx="2" fill="#fde68a" stroke="#d97706" strokeWidth="1" transform="rotate(-15 110 110)" />
      )}
      {app.accessory === "scar" && (
        <line x1="75" y1="88" x2="85" y2="110" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
      )}

      {/* 前髪・メインヘアスタイル */}
      {app.hairStyle === "short" && (
        <path
          d="M 55 85 Q 50 45 100 45 Q 150 45 145 85 Q 135 60 115 75 Q 100 62 85 75 Q 65 60 55 85 Z"
          fill={app.hairColor}
        />
      )}
      {app.hairStyle === "wolf" && (
        <path
          d="M 50 95 L 45 75 Q 48 42 100 42 Q 152 42 155 75 L 150 95 Q 140 65 125 80 L 115 70 Q 100 60 85 70 L 75 80 Q 60 65 50 95 Z"
          fill={app.hairColor}
        />
      )}
      {app.hairStyle === "long" && (
        <path
          d="M 55 85 Q 50 45 100 45 Q 150 45 145 85 Q 135 70 120 85 Q 100 70 80 85 Q 65 70 55 85 Z"
          fill={app.hairColor}
        />
      )}
      {app.hairStyle === "ponytail" && (
        <path
          d="M 55 85 Q 50 45 100 45 Q 150 45 145 85 Q 130 65 110 75 Q 90 65 70 75 Z"
          fill={app.hairColor}
        />
      )}
      {app.hairStyle === "twintail" && (
        <path
          d="M 55 85 Q 50 45 100 45 Q 150 45 145 85 Q 135 60 100 75 Q 65 60 55 85 Z"
          fill={app.hairColor}
        />
      )}
      {app.hairStyle === "samurai" && (
        <g fill={app.hairColor}>
          <path d="M 55 85 Q 50 45 100 45 Q 150 45 145 85 Q 130 65 100 70 Q 70 65 55 85 Z" />
          {/* ちょんまげ/お団子 */}
          <circle cx="100" cy="36" r="10" />
        </g>
      )}

      {/* メガネ / サングラス */}
      {app.glasses === "square" && (
        <g stroke="#38bdf8" strokeWidth="2.5" fill="rgba(255,255,255,0.15)">
          <rect x="68" y="90" width="24" height="16" rx="3" />
          <rect x="108" y="90" width="24" height="16" rx="3" />
          <line x1="92" y1="98" x2="108" y2="98" />
          <line x1="68" y1="98" x2="58" y2="95" />
          <line x1="132" y1="98" x2="142" y2="95" />
        </g>
      )}
      {app.glasses === "round" && (
        <g stroke="#fbbf24" strokeWidth="2.5" fill="rgba(255,255,255,0.15)">
          <circle cx="80" cy="98" r="11" />
          <circle cx="120" cy="98" r="11" />
          <line x1="91" y1="98" x2="109" y2="98" />
          <line x1="69" y1="98" x2="58" y2="95" />
          <line x1="131" y1="98" x2="142" y2="95" />
        </g>
      )}
      {app.glasses === "sunglasses" && (
        <g stroke="#0f172a" strokeWidth="2" fill="#0f172a">
          <path d="M 68 90 L 92 90 L 88 108 L 72 108 Z" />
          <path d="M 108 90 L 132 90 L 128 108 L 112 108 Z" />
          <line x1="92" y1="94" x2="108" y2="94" stroke="#0f172a" strokeWidth="3" />
          {/* 反射光 */}
          <line x1="72" y1="94" x2="80" y2="104" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
          <line x1="112" y1="94" x2="120" y2="104" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
        </g>
      )}
    </svg>
  );
}
