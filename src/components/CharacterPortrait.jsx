import React from "react";

const PORTRAIT_BY_GENDER = {
  masculine: { src: "/player-male-normalized.png", alt: "男性剣士" },
  feminine: { src: "/player-female-normalized.png", alt: "女性剣士" }
};

export default function CharacterPortrait({ appearance, size = 120, className = "" }) {
  const portrait = PORTRAIT_BY_GENDER[appearance?.gender] || PORTRAIT_BY_GENDER.masculine;
  return (
    <img
      src={portrait.src}
      alt={portrait.alt}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
