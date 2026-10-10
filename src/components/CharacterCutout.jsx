import React, { useRef, useEffect, useState } from "react";

/**
 * 画像から背景（黒背景や暗部、または白背景）を自動除去し、
 * キャラクター本体のみを透過Canvasとしてクリーンにレンダリングするコンポーネント
 */
export default function CharacterCutout({ src, alt = "", className = "", style = {} }) {
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      // 高解像度対応
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // 四隅のピクセルから背景色（黒基調か白基調か）を判定
      const topLeft = 0;
      const topRight = (canvas.width - 1) * 4;
      const bottomLeft = (canvas.height - 1) * canvas.width * 4;
      const bottomRight = (canvas.height * canvas.width - 1) * 4;
      const cornerR = (data[topLeft] + data[topRight] + data[bottomLeft] + data[bottomRight]) / 4;
      const cornerG = (data[topLeft + 1] + data[topRight + 1] + data[bottomLeft + 1] + data[bottomRight + 1]) / 4;
      const cornerB = (data[topLeft + 2] + data[topRight + 2] + data[bottomLeft + 2] + data[bottomRight + 2]) / 4;
      const isDarkBg = cornerR < 60; // 黒・暗色背景
      const isGreenBg = cornerG > cornerR * 1.3 && cornerG > cornerB * 1.12;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;

        if (isGreenBg) {
          const greenExcess = g - Math.max(r, b);
          if (greenExcess > 78) {
            data[i + 3] = 0;
          } else if (greenExcess > 24) {
            data[i + 3] = Math.round(((78 - greenExcess) / 54) * 255);
          }
        } else if (isDarkBg) {
          // 暗部・黒背景の透過処理（閾値と滑らかなアルファグラデーション）
          if (brightness < 30) {
            data[i + 3] = 0; // 完全透明
          } else if (brightness < 75) {
            // 滑らかにフェード
            data[i + 3] = Math.round(((brightness - 30) / 45) * 255);
          }
        } else {
          // 明部・白背景の透過処理
          if (brightness > 235) {
            data[i + 3] = 0;
          } else if (brightness > 190) {
            data[i + 3] = Math.round(((235 - brightness) / 45) * 255);
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setIsLoaded(true);
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        ...style,
        opacity: isLoaded ? 1 : 0,
        transition: "opacity 0.5s ease"
      }}
    />
  );
}
