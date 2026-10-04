import { PREFECTURES } from "../constants/prefectures";
import { HISTORICAL_TYPHOONS } from "../constants/typhoonTypes";
import { TyphoonGenerator } from "./TyphoonGenerator";

/**
 * 気象情報連携 ＆ 台風シミュレーターサービス
 */
export class WeatherService {
  /**
   * 現在の台風（またはシミュレーション台風）を取得・生成
   */
  static getActiveTyphoon(presetId = null) {
    let preset = null;
    if (presetId) {
      preset = HISTORICAL_TYPHOONS.find((t) => t.id === presetId);
    }
    if (!preset) {
      // デフォルトは代表的な台風（2018年21号など）またはランダム
      preset = HISTORICAL_TYPHOONS[1];
    }
    return TyphoonGenerator.generateBoss(preset);
  }

  /**
   * ランダムな仮想台風を発生させる
   */
  static generateRandomTyphoon(number = Math.floor(Math.random() * 20) + 1) {
    const pressure = Math.floor(Math.random() * 70) + 925; // 925 - 995 hPa
    const maxWind = Math.floor((1015 - pressure) * 0.65) + Math.floor(Math.random() * 10);
    const maxGust = Math.round(maxWind * (1.3 + Math.random() * 0.3));
    const rainfall = Math.floor(Math.random() * 400) + 150;
    const sizeKm = Math.floor(Math.random() * 450) + 300;
    const speed = Math.floor(Math.random() * 50) + 15;

    const rawData = {
      id: `typhoon-sim-${Date.now()}`,
      name: `台風${number}号「テンペスト-${number}」`,
      year: "2026年シミュレーション",
      pressure,
      maxWind,
      maxGust,
      rainfall,
      sizeKm,
      speed
    };

    return TyphoonGenerator.generateBoss(rawData);
  }

  /**
   * 台風の位置（レーダーマップ上のX, Y）とプレイヤーの都道府県から距離・接近段階を算出
   * @param {Object} typhoonLocation { x, y }
   * @param {Number} prefectureId 
   * @returns {Object} { distanceKm, alertPhase, warningText, etaMinutes }
   */
  static calculateProximity(typhoonLocation, prefectureId) {
    const pref = PREFECTURES.find((p) => p.id === prefectureId) || PREFECTURES[13]; // デフォルト神奈川(id:14)または東京(id:13)
    
    // 画面座標系での距離計算（1px ≒ 3km換算）
    const dx = typhoonLocation.x - pref.x;
    const dy = typhoonLocation.y - pref.y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    const distanceKm = Math.round(pixelDist * 2.8);

    let alertPhase = "calm"; // calm (遠方), alert (予告), prep (防衛準備), strike (直撃・戦闘), passed (通過)
    let warningLevel = "平常";
    let warningText = "現在、台風は遠方に位置しています。通常の育成や農業を進めましょう。";
    let badgeColor = "#10b981"; // green

    if (distanceKm > 600) {
      alertPhase = "calm";
      warningLevel = "通常警戒";
      warningText = "遠方に台風の渦を感知。進路に注意してください。";
    } else if (distanceKm > 350) {
      alertPhase = "alert";
      warningLevel = "台風接近予告";
      warningText = `【接近予告】台風が${pref.name}から約${distanceKm}kmに接近中。防衛の準備を整えてください。`;
      badgeColor = "#f59e0b"; // amber
    } else if (distanceKm > 100) {
      alertPhase = "prep";
      warningLevel = "暴風域突入警報（防衛準備）";
      warningText = `【緊急防衛】台風が急接近（距離${distanceKm}km）！農地に防風ネット、建物に補強を施してください！`;
      badgeColor = "#f97316"; // orange
    } else {
      alertPhase = "strike";
      warningLevel = "特別警報（直撃・戦闘中）";
      warningText = `【直撃中】猛烈な暴風雨が${pref.name}を襲来！迎撃を開始してください！`;
      badgeColor = "#ef4444"; // red
    }

    return {
      distanceKm,
      alertPhase,
      warningLevel,
      warningText,
      badgeColor,
      pref
    };
  }
}
