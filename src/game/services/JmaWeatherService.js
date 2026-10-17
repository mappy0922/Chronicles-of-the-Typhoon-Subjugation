import { PREFECTURES } from "../constants/prefectures";

const FORECAST_OFFICES = [
  "011000", "020000", "030000", "040000", "050000", "060000", "070000", "080000", "090000", "100000",
  "110000", "120000", "130000", "140000", "150000", "160000", "170000", "180000", "190000", "200000",
  "210000", "220000", "230000", "240000", "250000", "260000", "270000", "280000", "290000", "300000",
  "310000", "320000", "330000", "340000", "350000", "360000", "370000", "380000", "390000", "400000",
  "410000", "420000", "430000", "440000", "450000", "460100", "471000"
];

const PREFECTURE_CENTERS = [
  [43.0642, 141.3468], [40.8244, 140.7400], [39.7036, 141.1527], [38.2688, 140.8721], [39.7186, 140.1024],
  [38.2404, 140.3633], [37.7503, 140.4676], [36.3418, 140.4468], [36.5657, 139.8836], [36.3911, 139.0608],
  [35.8569, 139.6489], [35.6047, 140.1233], [35.6895, 139.6917], [35.4478, 139.6425], [37.9026, 139.0236],
  [36.6953, 137.2113], [36.5947, 136.6256], [36.0652, 136.2216], [35.6642, 138.5684], [36.6513, 138.1810],
  [35.3912, 136.7223], [34.9769, 138.3831], [35.1802, 136.9066], [34.7303, 136.5086], [35.0045, 135.8686],
  [35.0214, 135.7556], [34.6863, 135.5200], [34.6913, 135.1830], [34.6851, 135.8329], [34.2260, 135.1675],
  [35.5039, 134.2377], [35.4723, 133.0505], [34.6618, 133.9350], [34.3966, 132.4596], [34.1861, 131.4705],
  [34.0658, 134.5593], [34.3401, 134.0434], [33.8416, 132.7657], [33.5597, 133.5311], [33.6064, 130.4181],
  [33.2494, 130.2988], [32.7448, 129.8737], [32.7898, 130.7417], [33.2382, 131.6126], [31.9111, 131.4239],
  [31.5602, 130.5581], [26.2124, 127.6809]
];

const FALLBACK_WEATHER = {
  status: "unavailable",
  weatherCode: "100",
  weatherText: "晴れ（気象情報を取得できません）",
  isRaining: false,
  rainIntensity: 0,
  cloudiness: 0.05,
  stormIntensity: 0,
  nightIntensity: 0,
  typhoonName: null,
  typhoonCategory: null,
  distanceKm: null,
  updatedAt: null
};

const jstDateKey = (date) => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
}).format(date);

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`JMA request failed: ${response.status}`);
  return response.json();
}

function selectTodayIndex(timeDefines = []) {
  const today = jstDateKey(new Date());
  const todayIndex = timeDefines.findIndex((value) => jstDateKey(new Date(value)) === today);
  if (todayIndex >= 0) return todayIndex;
  const now = Date.now();
  const nextIndex = timeDefines.findIndex((value) => new Date(value).getTime() >= now);
  return Math.max(0, nextIndex);
}

function describeWeather(code) {
  const numericCode = Number(code);
  if (numericCode >= 400) return "雪";
  if (numericCode >= 300) return "雨";
  if (numericCode >= 200) return "くもり";
  if ([102, 103, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 130, 131, 132, 140, 160, 170, 181].includes(numericCode)) return "雨を含む天気";
  if (numericCode === 101 || numericCode >= 110) return "晴れ時々くもり";
  return "晴れ";
}

function getForecastWeather(forecast, officeCode) {
  const dailySeries = forecast?.[1]?.timeSeries?.[0];
  if (!dailySeries) return null;
  const area = dailySeries.areas.find((entry) => entry.area?.code === officeCode) || dailySeries.areas[0];
  if (!area) return null;
  const index = selectTodayIndex(dailySeries.timeDefines);
  const weatherCode = area.weatherCodes?.[index] || "100";
  const probability = Number(area.pops?.[index] || 0);
  const codeNumber = Number(weatherCode);
  const isRain = (codeNumber >= 300 && codeNumber < 400) || [102, 103, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 130, 131, 132, 140, 160, 170, 181].includes(codeNumber);
  const rainIntensity = isRain ? Math.max(0.16, probability / 100) : 0;
  const cloudiness = codeNumber >= 300 ? 0.62 : codeNumber >= 200 ? 0.34 : codeNumber >= 100 && codeNumber !== 100 ? 0.16 : 0.04;
  return {
    weatherCode,
    weatherText: describeWeather(weatherCode),
    isRaining: isRain,
    rainIntensity: Math.min(1, rainIntensity),
    cloudiness,
    updatedAt: forecast?.[1]?.reportDatetime || forecast?.[0]?.reportDatetime || null
  };
}

function haversineKm(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const [lat1, lon1] = first;
  const [lat2, lon2] = second;
  const deltaLat = radians(lat2 - lat1);
  const deltaLon = radians(lon2 - lon1);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getActiveTyphoons() {
  try {
    const targetData = await fetchJson("https://www.jma.go.jp/bosai/typhoon/data/targetTc.json");
    const targets = targetData?.value || [];
    const results = await Promise.allSettled(targets.map(async (target) => {
      const data = await fetchJson(`https://www.jma.go.jp/bosai/typhoon/data/${target.tropicalCyclone}/forecast.json`);
      const analysis = data.find((part) => part.track?.typhoon?.length);
      const point = analysis?.track?.typhoon?.[0];
      if (!point || point.length < 2) return null;
      const title = data.find((part) => part.part === "title");
      return {
        point: [Number(point[0]), Number(point[1])],
        name: title?.name?.jp || `台風${target.typhoonNumber?.slice(-2) || ""}号`,
        category: target.category || "TD"
      };
    }));
    return results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  } catch {
    return [];
  }
}

function getStormConditions(typhoons, prefectureId) {
  const index = Math.max(0, Number(prefectureId || 14) - 1);
  const center = PREFECTURE_CENTERS[index] || PREFECTURE_CENTERS[13];
  const nearest = typhoons
    .map((typhoon) => ({ ...typhoon, distanceKm: Math.round(haversineKm(center, typhoon.point)) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
  if (!nearest) return { stormIntensity: 0, distanceKm: null, typhoonName: null, typhoonCategory: null };
  const categoryScale = nearest.category === "TY" ? 1 : nearest.category === "TS" ? 0.65 : 0.25;
  const proximityScale = nearest.distanceKm <= 100 ? 1 : nearest.distanceKm <= 350 ? 0.65 : nearest.distanceKm <= 600 ? 0.3 : 0;
  return {
    stormIntensity: categoryScale * proximityScale,
    distanceKm: nearest.distanceKm,
    typhoonName: nearest.name,
    typhoonCategory: nearest.category
  };
}

function makeProximityInfo(storm) {
  const { distanceKm, typhoonName } = storm;
  if (distanceKm === null || distanceKm > 600) {
    return { distanceKm: distanceKm ?? 9999, alertPhase: "calm", warningLevel: "平常", warningText: "気象庁の台風情報では、選択地域への接近はありません。", badgeColor: "#10b981" };
  }
  const alertPhase = distanceKm <= 100 ? "strike" : distanceKm <= 350 ? "prep" : "alert";
  const levels = { alert: "台風接近予告", prep: "台風接近・防衛準備", strike: "台風が近くにあります" };
  const colors = { alert: "#f59e0b", prep: "#f97316", strike: "#ef4444" };
  return {
    distanceKm,
    alertPhase,
    warningLevel: levels[alertPhase],
    warningText: `${typhoonName}が選択地域から約${distanceKm}kmにあります。`,
    badgeColor: colors[alertPhase]
  };
}

export class JmaWeatherService {
  static async getLocalConditions(prefectureId) {
    const officeCode = FORECAST_OFFICES[Math.max(0, Number(prefectureId || 14) - 1)] || "110000";
    try {
      const [forecast, typhoons] = await Promise.all([
        fetchJson(`https://www.jma.go.jp/bosai/forecast/data/forecast/${officeCode}.json`),
        getActiveTyphoons()
      ]);
      const localWeather = getForecastWeather(forecast, officeCode) || FALLBACK_WEATHER;
      const storm = getStormConditions(typhoons, prefectureId);
      const nightIntensity = storm.distanceKm === null || storm.distanceKm > 600
        ? 0
        : storm.distanceKm <= 100
          ? 1
          : (600 - storm.distanceKm) / 500;
      const weatherInfo = {
        ...FALLBACK_WEATHER,
        ...localWeather,
        ...storm,
        status: "available",
        isRaining: localWeather.isRaining || storm.stormIntensity > 0,
        rainIntensity: Math.max(localWeather.rainIntensity, storm.stormIntensity * 0.55),
        cloudiness: Math.max(localWeather.cloudiness, storm.stormIntensity * 0.8),
        nightIntensity
      };
      return { weatherInfo, proximityInfo: makeProximityInfo(storm) };
    } catch (error) {
      console.warn("JMA weather could not be loaded; using calm weather.", error);
      return { weatherInfo: { ...FALLBACK_WEATHER }, proximityInfo: makeProximityInfo({ distanceKm: null, typhoonName: null }) };
    }
  }
}
