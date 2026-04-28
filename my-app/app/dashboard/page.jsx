"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DuwimsStaticPage from "../components/DuwimsStaticPage";
import "leaflet/dist/leaflet.css";
import { useDuwimsT } from "../components/language-context";

const AUTH_KEYS = [
  "AUTH_TOKEN_V1",
  "token",
  "authToken",
  "pmtool_token",
  "duwims_token",
];

function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001").replace(
    /\/+$/,
    ""
  );
}

function saveTokenToStorage(token) {
  if (typeof window === "undefined" || !token) return;
  for (const k of AUTH_KEYS) {
    try {
      window.localStorage.setItem(k, token);
    } catch {}
    try {
      window.sessionStorage.setItem(k, token);
    } catch {}
  }
}

function getToken() {
  if (typeof window === "undefined") return "";
  for (const k of AUTH_KEYS) {
    try {
      const localValue = window.localStorage.getItem(k);
      if (localValue) return localValue;
    } catch {}
    try {
      const sessionValue = window.sessionStorage.getItem(k);
      if (sessionValue) return sessionValue;
    } catch {}
  }
  return "";
}

function parseJwt(token) {
  try {
    if (!token) return null;
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeCoord(c) {
  if (!c) return null;

  if (Array.isArray(c) && c.length >= 2) {
    const lat = toNum(c[0]);
    const lng = toNum(c[1]);
    if (lat != null && lng != null) return [lat, lng];
  }

  const lat = toNum(c.lat) ?? toNum(c.latitude) ?? toNum(c._lat);
  const lng =
    toNum(c.lng) ?? toNum(c.lon) ?? toNum(c.longitude) ?? toNum(c._lng);

  if (lat != null && lng != null) return [lat, lng];
  return null;
}

function normalizeCoords(input) {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeCoord).filter(Boolean);
}

function plotNameOf(plot, idx, t, lang) {
  return (
    plot?.plotName ||
    plot?.alias ||
    plot?.name ||
    (lang === "en" ? `Plot ${idx + 1}` : `แปลง ${idx + 1}`)
  );
}

function inferNodeType(node) {
  const raw = [
    node?.nodeType,
    node?.type,
    node?.nodeName,
    node?.uid,
    ...(Array.isArray(node?.sensors)
      ? node.sensors.map((s) => `${s?.name || ""} ${s?.uid || ""}`)
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    raw.includes("soil") ||
    raw.includes("ดิน") ||
    raw.includes("moisture") ||
    raw.includes("npk") ||
    raw.includes("water")
  ) {
    return "soil";
  }

  return "air";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayLatest(sensor) {
  if (
    sensor?.latestValue !== undefined &&
    sensor?.latestValue !== null &&
    sensor?.latestValue !== ""
  ) {
    return String(sensor.latestValue);
  }

  if (
    sensor?.value !== undefined &&
    sensor?.value !== null &&
    sensor?.value !== ""
  ) {
    return String(sensor.value);
  }

  if (
    sensor?.lastReading?.value !== undefined &&
    sensor?.lastReading?.value !== null &&
    sensor?.lastReading?.value !== ""
  ) {
    return String(sensor.lastReading.value);
  }

  return "-";
}

function getLatestNumericValue(sensor) {
  const raw =
    sensor?.latestValue ??
    sensor?.value ??
    sensor?.lastReading?.value ??
    sensor?.lastReading ??
    sensor?.reading ??
    null;

  if (raw === null || raw === undefined || raw === "") return null;

  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }

  const cleaned = String(raw).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function getDefaultSensorUnit(sensorName = "") {
  const raw = String(sensorName || "").trim();
  const key = raw.toLowerCase();

  if (key.includes("temp") || raw.includes("อุณหภูมิ")) return "°C";

  if (
    (key.includes("humidity") && !key.includes("soil")) ||
    raw.includes("ความชื้นสัมพัทธ์") ||
    key === "rh"
  ) {
    return "%";
  }

  if (key.includes("wind") || raw.includes("ความเร็วลม") || raw.includes("ลม")) {
    return "km/h";
  }

  if (key.includes("light") || raw.includes("ความเข้มแสง") || raw.includes("แสง")) {
    return "lux";
  }

  if (key.includes("rain") || raw.includes("ปริมาณน้ำฝน") || raw.includes("ฝน")) {
    return "mm/day";
  }

  if (
    key.includes("soil") ||
    key.includes("moisture") ||
    raw.includes("ความชื้นดิน") ||
    raw.includes("ความชื้นในดิน")
  ) {
    return "%";
  }

  if (key === "n" || raw === "N" || key.includes("nitrogen") || raw.includes("ไนโตรเจน")) {
    return "%";
  }

  if (key === "p" || raw === "P" || key.includes("phosphorus") || raw.includes("ฟอสฟอรัส")) {
    return "ppm";
  }

  if (key === "k" || raw === "K" || key.includes("potassium") || raw.includes("โพแทสเซียม")) {
    return "cmol/kg";
  }

  if (
    key.includes("water") ||
    key.includes("availability") ||
    raw.includes("ความพร้อมใช้น้ำ") ||
    raw.includes("การให้น้ำ")
  ) {
    return "kPa";
  }

  return "";
}

function getDisplayUnit(sensor = {}, sensorName = "") {
  return (
    sensor?.unit ||
    sensor?.sensorUnit ||
    sensor?.latestUnit ||
    getDefaultSensorUnit(sensorName || sensor?.name || sensor?.uid || "")
  );
}

function formatSensorValue(value, unit = "") {
  if (value === null || value === undefined || value === "") return "-";
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function translateSensorName(sensorName = "", lang = "th") {
  const raw = String(sensorName || "").trim();
  const key = raw.toLowerCase();

  const isTemp = key.includes("temp") || raw.includes("อุณหภูมิ");

  const isHumidity =
    (key.includes("humidity") && !key.includes("soil")) ||
    raw.includes("ความชื้นสัมพัทธ์") ||
    key === "rh";

  const isWind =
    key.includes("wind") || raw.includes("ความเร็วลม") || raw.includes("ลม");

  const isLight =
    key.includes("light") || raw.includes("ความเข้มแสง") || raw.includes("แสง");

  const isRain =
    key.includes("rain") || raw.includes("ปริมาณน้ำฝน") || raw.includes("ฝน");

  const isSoilMoisture =
    key.includes("soil") ||
    key.includes("moisture") ||
    raw.includes("ความชื้นดิน") ||
    raw.includes("ความชื้นในดิน");

  const isWaterAvailability =
    key.includes("water") ||
    raw.includes("ความพร้อมใช้น้ำ") ||
    raw.includes("การให้น้ำ");

  if (isTemp) return lang === "en" ? "Temperature" : "อุณหภูมิ";
  if (isHumidity) return lang === "en" ? "Relative Humidity" : "ความชื้นสัมพัทธ์";
  if (isWind) return lang === "en" ? "Wind Speed" : "ความเร็วลม";
  if (isLight) return lang === "en" ? "Light Intensity" : "ความเข้มแสง";
  if (isRain) return lang === "en" ? "Rainfall" : "ปริมาณน้ำฝน";
  if (isSoilMoisture) return lang === "en" ? "Soil Moisture" : "ความชื้นดิน";
  if (key === "n" || raw === "N") return "N";
  if (key === "p" || raw === "P") return "P";
  if (key === "k" || raw === "K") return "K";
  if (isWaterAvailability) {
    return lang === "en" ? "Water Availability" : "ความพร้อมใช้น้ำ";
  }

  return raw || (lang === "en" ? "Sensor" : "เซนเซอร์");
}

function getSensorThresholdProfile(sensorName = "", lang = "th") {
  const key = String(sensorName).trim().toLowerCase();

  if (key.includes("temp") || key.includes("อุณหภูมิ")) {
    return {
      label: lang === "en" ? "Temperature" : "อุณหภูมิ",
      greenMin: 20,
      greenMax: 35,
      redLowMax: 19.999999,
      redHighMin: 35.000001,
      displayMin: "20 °C",
      displayMax: "35 °C",
      lowReason:
        lang === "en"
          ? "To prevent stomatal closure and leaf burn before reaching a critical temperature, which affects photosynthesis and fruit set."
          : "เพื่อป้องกันปากใบปิดและอาการใบไหม้ก่อนอุณหภูมิจะถึงจุดวิกฤตจริง ซึ่งส่งผลต่อการสังเคราะห์แสงและการติดผล",
      highReason:
        lang === "en"
          ? "To prevent stomatal closure and leaf burn before reaching a critical temperature, which affects photosynthesis and fruit set."
          : "เพื่อป้องกันปากใบปิดและอาการใบไหม้ก่อนอุณหภูมิจะถึงจุดวิกฤตจริง ซึ่งส่งผลต่อการสังเคราะห์แสงและการติดผล",
    };
  }

  if (
    (key.includes("humidity") && !key.includes("soil")) ||
    key.includes("ความชื้นสัมพัทธ์") ||
    key === "rh"
  ) {
    return {
      label: lang === "en" ? "Relative Humidity" : "ความชื้นสัมพัทธ์",
      greenMin: 75,
      greenMax: 85,
      redLowMax: 74.999999,
      redHighMin: 85.000001,
      displayMin: "75 %",
      displayMax: "85 %",
      lowReason:
        lang === "en"
          ? "To prevent flowers and young floral structures from drying and falling in overly dry air, and to reduce fungal problems or failed pollination in overly humid air."
          : "ป้องกันดอกและหางแย้แห้งร่วงหากอากาศแห้งเกินไป และป้องกันโรคราใบติดหรือการผสมเกสรไม่ติดหากอากาศชื้นเกินไป",
      highReason:
        lang === "en"
          ? "To prevent flowers and young floral structures from drying and falling in overly dry air, and to reduce fungal problems or failed pollination in overly humid air."
          : "ป้องกันดอกและหางแย้แห้งร่วงหากอากาศแห้งเกินไป และป้องกันโรคราใบติดหรือการผสมเกสรไม่ติดหากอากาศชื้นเกินไป",
    };
  }

  if (key.includes("wind") || key.includes("ลม")) {
    return {
      label: lang === "en" ? "Wind Speed" : "ความเร็วลม",
      greenMin: 2,
      greenMax: 5,
      redLowMax: null,
      redHighMin: 6,
      displayMin: lang === "en" ? "2 km/h" : "2 กม./ชม.",
      displayMax: lang === "en" ? "5 km/h" : "5 กม./ชม.",
      lowReason: "",
      highReason:
        lang === "en"
          ? "Strong wind at this level can tear durian branches and accelerate water loss from leaves until the tree wilts."
          : "ลมที่แรงระดับนี้ทำให้กิ่งทุเรียนฉีกขาดได้ง่ายและกระตุ้นให้ต้นคายน้ำที่ใบเร็วเกินไปจนต้นเหี่ยวเฉา",
    };
  }

  if (key.includes("light") || key.includes("แสง")) {
    return {
      label: lang === "en" ? "Light Intensity" : "ความเข้มแสง",
      greenMin: 40000,
      greenMax: 60000,
      redLowMax: null,
      redHighMin: 70000,
      displayMin: "40,000 Lux",
      displayMax: "60,000 Lux",
      lowReason: "",
      highReason:
        lang === "en"
          ? "Excessive light often comes with heat radiation that damages durian leaf and fruit surfaces, causing sunburn."
          : "แสงที่แรงเกินไปมักมาพร้อมรังสีความร้อนที่ทำลายเนื้อเยื่อผิวใบและผลทุเรียนทำให้เกิดอาการซันเบิร์น",
    };
  }

  if (key.includes("rain") || key.includes("ฝน")) {
    return {
      label: lang === "en" ? "Rainfall" : "ปริมาณน้ำฝน",
      greenMin: 4,
      greenMax: 8,
      redLowMax: null,
      redHighMin: 10,
      displayMin: lang === "en" ? "4 mm/day" : "4 มม./วัน",
      displayMax: lang === "en" ? "8 mm/day" : "8 มม./วัน",
      lowReason: "",
      highReason:
        lang === "en"
          ? "About 10 mm of rain is enough to trigger flushing instead of flowering, or cause young fruit to drop due to sudden water intake."
          : "ปริมาณฝน 10 มม. เพียงพอที่จะกระตุ้นให้ทุเรียนแตกใบอ่อนแทนการออกดอก หรือทำให้ผลอ่อนร่วงจากการได้รับน้ำกะทันหัน",
    };
  }

  if (
    key.includes("soil") ||
    key.includes("moisture") ||
    key.includes("ความชื้นในดิน") ||
    key.includes("ความชื้นดิน")
  ) {
    return {
      label: lang === "en" ? "Soil Moisture" : "ความชื้นดิน",
      greenMin: 65,
      greenMax: 80,
      redLowMax: 64.999999,
      redHighMin: 80.000001,
      displayMin: "65 %",
      displayMax: "80 %",
      lowReason:
        lang === "en"
          ? "To maintain the balance of air and water in the soil so roots do not die from drought or rot from oxygen deficiency."
          : "เพื่อรักษาความสมดุลของอากาศและน้ำในดิน ไม่ให้รากฝอยขาดน้ำจนตายหรือเน่าตายจากสภาวะขาดออกซิเจน",
      highReason:
        lang === "en"
          ? "To maintain the balance of air and water in the soil so roots do not die from drought or rot from oxygen deficiency."
          : "เพื่อรักษาความสมดุลของอากาศและน้ำในดิน ไม่ให้รากฝอยขาดน้ำจนตายหรือเน่าตายจากสภาวะขาดออกซิเจน",
    };
  }

  if (key === "n" || key.includes("ไนโตรเจน")) {
    return {
      label: lang === "en" ? "Nitrogen (N)" : "ไนโตรเจน (N)",
      greenMin: 0.1,
      greenMax: 1.0,
      redLowMax: 0.099999,
      redHighMin: 1.000001,
      displayMin: "0.1 %",
      displayMax: "1.0 %",
      lowReason:
        lang === "en"
          ? "If nitrogen is too high during fruiting, the tree may shed fruit to push new leaf flush instead."
          : "หาก N สูงเกินไปในช่วงติดผลจะทำให้ต้นสลัดลูกทิ้งเพื่อไปแตกใบอ่อนแทน",
      highReason:
        lang === "en"
          ? "If nitrogen is too high during fruiting, the tree may shed fruit to push new leaf flush instead."
          : "หาก N สูงเกินไปในช่วงติดผลจะทำให้ต้นสลัดลูกทิ้งเพื่อไปแตกใบอ่อนแทน",
    };
  }

  if (key === "p" || key.includes("ฟอสฟอรัส")) {
    return {
      label: lang === "en" ? "Phosphorus (P)" : "ฟอสฟอรัส (P)",
      greenMin: 25,
      greenMax: 45,
      redLowMax: 24.999999,
      redHighMin: 45.000001,
      displayMin: "25 ppm",
      displayMax: "45 ppm",
      lowReason:
        lang === "en"
          ? "If phosphorus is too low, the tree lacks energy to form flower buds and root development becomes poor."
          : "หาก P ต่ำเกินไปต้นจะขาดพลังงานในการสร้างตาดอกและระบบรากจะไม่สมบูรณ์",
      highReason:
        lang === "en"
          ? "If phosphorus is too low, the tree lacks energy to form flower buds and root development becomes poor."
          : "หาก P ต่ำเกินไปต้นจะขาดพลังงานในการสร้างตาดอกและระบบรากจะไม่สมบูรณ์",
    };
  }

  if (key === "k" || key.includes("โพแทสเซียม")) {
    return {
      label: lang === "en" ? "Potassium (K)" : "โพแทสเซียม (K)",
      greenMin: 0.8,
      greenMax: 1.4,
      redLowMax: 0.799999,
      redHighMin: 1.400001,
      displayMin: "0.8 cmol/kg",
      displayMax: "1.4 cmol/kg",
      lowReason:
        lang === "en"
          ? "If potassium moves out of range, durian lobes become incomplete, fruit shape becomes distorted, and flesh quality declines."
          : "หาก K หลุดช่วงจะทำให้พูทุเรียนไม่สมบูรณ์ ทรงผลบิดเบี้ยว และเนื้อทุเรียนไม่มีคุณภาพ",
      highReason:
        lang === "en"
          ? "If potassium moves out of range, durian lobes become incomplete, fruit shape becomes distorted, and flesh quality declines."
          : "หาก K หลุดช่วงจะทำให้พูทุเรียนไม่สมบูรณ์ ทรงผลบิดเบี้ยว และเนื้อทุเรียนไม่มีคุณภาพ",
    };
  }

  if (
    key.includes("water") ||
    key.includes("availability") ||
    key.includes("การให้น้ำ") ||
    key.includes("ความพร้อมใช้น้ำ")
  ) {
    return {
      label: lang === "en" ? "Water Availability" : "ความพร้อมใช้น้ำ",
      greenMin: 10,
      greenMax: 25,
      redLowMax: null,
      redHighMin: 40,
      displayMin: "8 kPa",
      displayMax: "25 kPa",
      lowReason: "",
      highReason:
        lang === "en"
          ? "To keep water supply matched to the tree’s need during fruit development, avoiding water stress that shrivels fruit or excess water that causes root rot."
          : "เพื่อควบคุมปริมาณน้ำให้พอดีกับความต้องการของต้นโตในช่วงติดผล ไม่ให้ต้นขาดน้ำจนลูกฝ่อหรือได้น้ำมากจนรากเน่า",
    };
  }

  return {
    label: sensorName || "Sensor",
    greenMin: null,
    greenMax: null,
    redLowMax: null,
    redHighMin: null,
    displayMin: "-",
    displayMax: "-",
    lowReason: "",
    highReason: "",
  };
}

function getSensorMinMax(sensor = {}) {
  return {
    min: toNum(sensor?.minValue ?? sensor?.min ?? sensor?.minimum),
    max: toNum(sensor?.maxValue ?? sensor?.max ?? sensor?.maximum),
  };
}

function getSensorStatusInfo(sensor = {}, sensorName = "", t, lang = "th") {
  const latest = getLatestNumericValue(sensor);
  const profile = getSensorThresholdProfile(sensorName, lang);
  const unit = getDisplayUnit(sensor, sensorName);
  const { min, max } = getSensorMinMax(sensor);

  const range = {
    min,
    max,
    displayMin: min != null ? formatSensorValue(min, unit) : "-",
    displayMax: max != null ? formatSensorValue(max, unit) : "-",
  };

  if (latest == null) {
    return {
      latest,
      unit,
      profile,
      range,
      isOut: false,
      statusText: t.noCurrentData,
      reasonText: t.noCurrentDataReason,
    };
  }

  const hasLowRed = min != null && latest < min;
  const hasHighRed = max != null && latest > max;

  if (hasLowRed) {
    return {
      latest,
      unit,
      profile,
      range,
      isOut: true,
      statusText: t.tooLow,
      reasonText: profile.lowReason || t.outOfRange,
    };
  }

  if (hasHighRed) {
    return {
      latest,
      unit,
      profile,
      range,
      isOut: true,
      statusText: t.tooHigh,
      reasonText: profile.highReason || t.outOfRange,
    };
  }

  return {
    latest,
    unit,
    profile,
    range,
    isOut: false,
    statusText: t.normalValue,
    reasonText: min == null && max == null ? (t.noThreshold || t.inRange) : t.inRange,
  };
}

function getDayShortLabel(dateStr, lang = "th") {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  const day = d.getDay();
  const th = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const en = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return lang === "en" ? en[day] : th[day];
}

function weatherCodeToEmoji(code) {
  const c = Number(code);
  if (c === 0) return "☀️";
  if ([1].includes(c)) return "🌤️";
  if ([2].includes(c)) return "⛅";
  if ([3].includes(c)) return "☁️";
  if ([45, 48].includes(c)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(c)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(c)) return "❄️";
  if ([95, 96, 99].includes(c)) return "⛈️";
  return "🌤️";
}

function sumNumbers(values = []) {
  return values.reduce((sum, v) => {
    const n = Number(v);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function getPlotCenterLatLng(plot) {
  const polygon = normalizeCoords(plot?.polygon || []);
  if (polygon.length) {
    const lat = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
    const lng = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
    return { lat, lng };
  }

  const nodes = Array.isArray(plot?.nodes) ? plot.nodes : [];
  const validNodes = nodes.filter((n) => toNum(n?.lat) != null && toNum(n?.lng) != null);
  if (validNodes.length) {
    const lat = validNodes.reduce((s, n) => s + Number(n.lat), 0) / validNodes.length;
    const lng = validNodes.reduce((s, n) => s + Number(n.lng), 0) / validNodes.length;
    return { lat, lng };
  }

  return null;
}

function buildWeatherRecommendation(weather, lang = "th") {
  const probs = weather?.daily?.precipitation_probability_max || [];
  const rains = weather?.daily?.precipitation_sum || [];
  const next3 = probs.slice(0, 3);
  const next3Rain = rains.slice(0, 3);

  const heavyChanceDays = next3.filter((v) => Number(v) >= 70).length;
  const totalNext3Rain = sumNumbers(next3Rain);
  const total7Rain = sumNumbers(rains);

  if (heavyChanceDays >= 2 || totalNext3Rain >= 20) {
    return lang === "en"
      ? "High rain chance in the next 2–3 days. Prepare drainage and inspect field channels."
      : "มีโอกาสฝนสูงใน 2–3 วันข้างหน้า ควรเตรียมระบบระบายน้ำ/ตรวจร่องน้ำในแปลง";
  }

  if (total7Rain <= 5) {
    return lang === "en"
      ? "Low rain expected this week. Consider checking irrigation readiness."
      : "สัปดาห์นี้ฝนค่อนข้างน้อย ควรตรวจความพร้อมระบบน้ำในแปลง";
  }

  return lang === "en"
    ? "Weather is within a moderate range this week. Continue monitoring field conditions."
    : "สภาพอากาศสัปดาห์นี้อยู่ในระดับปานกลาง ควรติดตามสภาพแปลงต่อเนื่อง";
}

async function fetchWeather7Days(lat, lng) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lng)}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
    `&current=temperature_2m` +
    `&forecast_days=7` +
    `&timezone=Asia/Bangkok`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`โหลดพยากรณ์อากาศไม่สำเร็จ (${res.status})`);
  }
  return res.json();
}

function buildMapData(plotsRaw, t, lang) {
  const polygons = [];
  const pins = [];

  (Array.isArray(plotsRaw) ? plotsRaw : []).forEach((plot, plotIndex) => {
    const plotName = plotNameOf(plot, plotIndex, t, lang);
    const polygonCoords = normalizeCoords(plot?.polygon || []);

    if (polygonCoords.length >= 3) {
      polygons.push({
        id: plot?.id || plot?._id || `plot-${plotIndex}`,
        name: plotName,
        color: "#6c8f5d",
        coords: polygonCoords,
      });
    }

    const sourceNodes = Array.isArray(plot?.nodes) ? plot.nodes : [];

    sourceNodes.forEach((node, nodeIndex) => {
      const lat = toNum(node?.lat);
      const lng = toNum(node?.lng);
      if (lat == null || lng == null) return;

      pins.push({
        id:
          node?._id ||
          node?.id ||
          `${plotIndex}-${nodeIndex}-${lat.toFixed(6)}-${lng.toFixed(6)}`,
        pinName: node?.nodeName || node?.uid || `${t.node} ${nodeIndex + 1}`,
        plotName,
        lat,
        lng,
        nodes: [
          {
            ...node,
            nodeType: inferNodeType(node),
          },
        ],
      });
    });
  });

  return { polygons, pins };
}

function buildHtmlContent(t, weatherView, weatherLoading, weatherError, lang, role) {
  const weatherDaysHtml = weatherView?.days?.length
    ? weatherView.days
        .map(
          (d) => `
        <div class="weather-day"><div class="wd-name">${escapeHtml(d.label)}</div><div class="wd-icon">${escapeHtml(d.icon)}</div><div class="wd-temp">${escapeHtml(`${Math.round(Number(d.maxTemp ?? 0))}°`)}</div><div class="wd-rain">${t.rain} ${escapeHtml(`${Math.round(Number(d.rainChance ?? 0))}%`)}</div></div>
      `
        )
        .join("")
    : `<div style="padding:12px;font-size:13px;color:#64748b">${escapeHtml(
        weatherLoading ? "กำลังโหลดข้อมูลอากาศ..." : weatherError || "ยังไม่มีข้อมูลอากาศ"
      )}</div>`;

  const tempRangeText = weatherView?.today
    ? `${Math.round(Number(weatherView.today.minTemp ?? 0))}–${Math.round(
        Number(weatherView.today.maxTemp ?? 0)
      )}°C`
    : "-";

  const rainChanceText =
    weatherView?.today?.rainChance != null
      ? `${Math.round(Number(weatherView.today.rainChance))}%`
      : "-";

  const recommendationText = weatherView?.recommendation || "-";

  const rain7DaysText =
    weatherView?.rain7Days != null
      ? `${Math.round(Number(weatherView.rain7Days) * 10) / 10} mm`
      : "-";

  const statusOnCardHtml =
    role === "employee"
      ? `
        <div class="status-on" style="
          width:100%;
          display:block;
          box-sizing:border-box;
          margin-bottom:12px;
          padding:12px 14px;
        ">
          <div class="on-label">${t.workingStatus}</div>
          <div style="font-size:11px;opacity:0.85;margin-bottom:8px">
            ${lang === "en" ? "Employee view" : "มุมมองพนักงาน"}
          </div>
          <div class="on-value" style="font-size:20px;line-height:1.2">
            ${t.on} <span id="dashboardNodeOnCount" style="font-size:20px">0</span> ${t.machineUnit}
          </div>
          <div class="on-sub" style="font-size:14px;line-height:1.35">
            ${t.off} <span id="dashboardNodeOffCount" style="font-size:16px">0</span> ${t.machineUnit}
          </div>
        </div>
      `
      : `
        <div class="status-on" style="
          width:100%;
          display:block;
          box-sizing:border-box;
          margin-bottom:12px;
          padding:12px 14px;
        ">
          <div class="on-label">${t.workingStatus}</div>
          <div style="font-size:11px;opacity:0.85;margin-bottom:8px">${t.updatedLatest}</div>
          <div class="on-value" style="font-size:20px;line-height:1.2">
            ${t.on} <span id="dashboardNodeOnCount" style="font-size:20px">0</span> ${t.machineUnit}
          </div>
          <div class="on-sub" style="font-size:14px;line-height:1.35">
            ${t.off} <span id="dashboardNodeOffCount" style="font-size:16px">0</span> ${t.machineUnit}
          </div>
        </div>
      `;

  const responsiveCss = `
    <style>
      #p1.page.active {
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        box-sizing: border-box;
      }

      #p1 *,
      #p1 *::before,
      #p1 *::after {
        box-sizing: border-box;
      }

      #p1 .grid-top {
        display: grid;
        grid-template-columns: minmax(0, 1.55fr) minmax(220px, 0.75fr) minmax(220px, 0.75fr);
        gap: 16px;
        align-items: stretch;
        width: 100%;
      }

      #p1 .col-stack {
        display: flex;
        flex-direction: column;
        gap: 14px;
        min-width: 0;
      }

      #p1 .card,
      #p1 .metric-card,
      #p1 .status-alert,
      #p1 .status-on,
      #p1 .pin-card,
      #p1 .sensor-group {
        min-width: 0;
        max-width: 100%;
      }

      #p1 .weather-strip {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 8px;
        width: 100%;
      }

      #p1 .weather-day {
        min-width: 0;
        overflow: hidden;
      }

      #dashboardSensorCards {
        width: 100% !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }

      #p1 .pin-header {
        display: flex;
        justify-content: space-between;
        min-width: 0;
      }

      #p1 .pin-header > div:first-child {
        min-width: 0;
      }

      #p1 .pin-name,
      #p1 .pin-sub,
      #p1 .sg-title,
      #p1 .metric-card-value,
      #p1 .alert-pill {
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #p1 .sgi-row {
        min-width: 0;
      }

      #p1 .sgi-row-val,
      #p1 .sgi-row-sub {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      #dashboardMapHost,
      #dashboardMap {
        width: 100% !important;
      }

      @media (max-width: 1180px) {
        #p1 .grid-top {
          grid-template-columns: 1fr 1fr;
        }

        #p1 .grid-top > .card {
          grid-column: 1 / -1;
        }

        #dashboardSensorCards {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }

      @media (max-width: 820px) {
        #p1 .grid-top {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        #p1 .weather-strip {
          grid-template-columns: repeat(4, minmax(78px, 1fr));
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: thin;
        }

        #dashboardSensorCards {
          grid-template-columns: 1fr !important;
          gap: 12px !important;
          justify-content: stretch !important;
        }

        #p1 .pin-header {
          flex-direction: column;
        }

        #p1 .status-badge {
          width: fit-content;
        }

        #dashboardMapHost,
        #dashboardMap {
          min-height: 280px !important;
          height: 280px !important;
        }
      }

      @media (max-width: 520px) {
        #p1 .card,
        #p1 .metric-card,
        #p1 .status-alert,
        #p1 .status-on,
        #p1 .pin-card {
          border-radius: 14px !important;
        }

        #p1 .weather-strip {
          grid-template-columns: repeat(7, minmax(82px, 1fr));
        }

        #p1 .weather-day {
          padding: 8px 6px;
        }

        #p1 .metric-card-value {
          font-size: clamp(18px, 6vw, 26px) !important;
        }

        #p1 .pin-name {
          font-size: 16px !important;
        }

        #p1 .sg-title {
          font-size: 15px !important;
        }

        #p1 .sgi-row {
          grid-template-columns: 78px minmax(0, 1fr) !important;
          column-gap: 8px !important;
        }

        #p1 .sgi-row-label,
        #p1 .sgi-row-sub,
        #p1 .status-badge {
          font-size: 12px !important;
        }

        #p1 .sgi-row-val {
          font-size: 15px !important;
        }

        #dashboardMapHost,
        #dashboardMap {
          min-height: 240px !important;
          height: 240px !important;
          border-radius: 14px !important;
        }
      }
    </style>
  `;

  return `${responsiveCss}<div id="p1" class="page active">

  <div class="grid-top">

    <div class="card">
      <div class="card-title">${t.weather7Days}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${t.weatherHint}</div>
      <div class="weather-strip">
        ${weatherDaysHtml}
      </div>
    </div>

    <div class="col-stack">
      <div class="metric-card mc-blue">
        <div class="metric-card-label">${t.currentTemperatureToday}</div>
        <div class="metric-card-value">${escapeHtml(tempRangeText)}</div>
        <div class="metric-card-sub">${t.forecastDailyHint}</div>
      </div>
      <div class="metric-card mc-yellow">
        <div class="metric-card-label">${t.rainChanceToday}</div>
        <div class="metric-card-value">${escapeHtml(rainChanceText)}</div>
        <div class="metric-card-sub">${t.precipitationHint}</div>
      </div>
    </div>

    <div class="col-stack">
      <div class="metric-card mc-red">
        <div class="metric-card-label">${t.recommendation}</div>
        <div class="metric-card-value" style="font-size:15px;line-height:1.5;font-family:'Sarabun',sans-serif;font-weight:600">${escapeHtml(recommendationText)}</div>
      </div>
      <div class="metric-card mc-green">
        <div class="metric-card-label">${t.rainAmount7Days}</div>
        <div class="metric-card-value">${escapeHtml(rain7DaysText)}</div>
        <div class="metric-card-sub">${t.rainAmountHint}</div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div class="card-title">${t.mapAndResources}</div>
      <div style="font-size:11px;color:var(--muted)">${t.mapHint}</div>
    </div>
    <div id="dashboardMapHost" style="width:100%;min-height:320px;border-radius:18px;overflow:hidden;position:relative;background:#dfeecf;border:1px solid rgba(0,0,0,.08)">
      <div id="dashboardMap" style="width:100%;height:320px;min-height:320px;display:block;border-radius:18px;overflow:hidden;background:#dfeecf"></div>
    </div>
    <div style="margin-top:10px;display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#475569">
      <div id="mapPlotCount">${t.plotCount}: 0</div>
      <div id="mapPinCount">${t.pinCount}: 0</div>
      <div>${t.nodeLegend}</div>
    </div>
  </div>

  <div style="margin-bottom:16px;display:flex;flex-direction:column;width:100%;">
    ${statusOnCardHtml}
    <div class="status-alert" style="width:100%;">
      <div style="font-size:16px;font-weight:800;color:#7c2d12;margin-bottom:8px">${t.issuesFound}</div>
      <div id="dashboardIssueCount" style="font-size:15px;font-weight:800;color:#7c2d12;margin-bottom:8px">${t.issuesCount(0)}</div>
      <div id="dashboardIssueList"></div>
    </div>
  </div>

  <div class="section-title">${t.plotSensorData}</div>
  <div
    id="dashboardSensorCards"
    style="
      display:grid;
      grid-template-columns:repeat(3,minmax(0,0.92fr));
      gap:14px;
      align-items:start;
      justify-content:center;
    "
  ></div>
</div>`;
}

function buildSensorCards(plots = [], t, lang) {
  const cards = [];

  for (const plot of plots) {
    const plotName = plot?.plotName || t.unknownPlotName;
    const nodes = Array.isArray(plot?.nodes) ? plot.nodes : [];

    for (const node of nodes) {
      const nodeName = node?.nodeName || node?.uid || t.node;
      const nodeType = inferNodeType(node);
      const nodeStatus = String(node?.status || "INACTIVE").toUpperCase();
      const sensors = Array.isArray(node?.sensors) ? node.sensors : [];

      let hasProblemInNode = false;

      const sensorGroups = sensors.length
        ? sensors
            .map((sensor) => {
              const sensorName = translateSensorName(
                sensor?.name || sensor?.uid || t.sensor,
                lang
              );
              const sensorStatus = getSensorStatusInfo(sensor, sensorName, t, lang);
              const range = sensorStatus.range;
              const latestValueText =
                sensorStatus.latest != null
                  ? formatSensorValue(sensorStatus.latest, sensorStatus.unit)
                  : displayLatest(sensor);

              if (sensorStatus.isOut) hasProblemInNode = true;

              const sensorBoxStyle = sensorStatus.isOut
                ? `
                    border:1.5px solid #ef4444;
                    background:#fef2f2;
                    box-shadow:0 0 0 1px rgba(239,68,68,.08) inset;
                  `
                : `
                    border:1.5px solid #22c55e;
                    background:#f0fdf4;
                    box-shadow:0 0 0 1px rgba(34,197,94,.08) inset;
                  `;

              const valueStyle = sensorStatus.isOut
                ? "color:#dc2626;font-weight:800;font-size:17px;"
                : "color:#166534;font-weight:800;font-size:17px;";

              const statusStyle = sensorStatus.isOut
                ? "color:#dc2626;font-weight:800;font-size:13px;"
                : "color:#166534;font-weight:800;font-size:13px;";

              return `
                <div class="sensor-group" style="
                  ${sensorBoxStyle}
                  border-radius:14px;
                  padding:10px 12px;
                  margin-bottom:10px;
                ">
                  <div class="sg-title" style="
                    font-size:16px;
                    font-weight:800;
                    margin-bottom:8px;
                    line-height:1.3;
                  ">
                    ${escapeHtml(sensorName)}
                  </div>

                  <div class="sgi-vmm" style="
                    display:flex;
                    flex-direction:column;
                    gap:6px;
                  ">
                    <div class="sgi-row" style="
                      display:grid;
                      grid-template-columns:92px minmax(0,1fr);
                      column-gap:10px;
                      align-items:flex-start;
                    ">
                      <span class="sgi-row-label" style="font-size:13px;font-weight:700;">${t.currentValue}</span>
                      <span class="sgi-row-val" style="${valueStyle}text-align:left;padding-left:2px;">
                        ${escapeHtml(latestValueText)}
                      </span>
                    </div>

                    <div class="sgi-row" style="
                      display:grid;
                      grid-template-columns:92px minmax(0,1fr);
                      column-gap:10px;
                      align-items:flex-start;
                    ">
                      <span class="sgi-row-label" style="font-size:13px;font-weight:700;">MIN</span>
                      <span class="sgi-row-sub" style="font-size:13px;font-weight:700;text-align:left;padding-left:2px;">
                        ${escapeHtml(range.displayMin)}
                      </span>
                    </div>

                    <div class="sgi-row" style="
                      display:grid;
                      grid-template-columns:92px minmax(0,1fr);
                      column-gap:10px;
                      align-items:flex-start;
                    ">
                      <span class="sgi-row-label" style="font-size:13px;font-weight:700;">MAX</span>
                      <span class="sgi-row-sub" style="font-size:13px;font-weight:700;text-align:left;padding-left:2px;">
                        ${escapeHtml(range.displayMax)}
                      </span>
                    </div>

                    <div class="sgi-row" style="
                      display:grid;
                      grid-template-columns:92px minmax(0,1fr);
                      column-gap:10px;
                      align-items:flex-start;
                    ">
                      <span class="sgi-row-label" style="${statusStyle}">${t.status}</span>
                      <span class="sgi-row-sub" style="${statusStyle}text-align:left;padding-left:2px;">
                        ${escapeHtml(sensorStatus.statusText)}
                      </span>
                    </div>
                  </div>
                </div>
              `;
            })
            .join("")
        : `
          <div class="sensor-group" style="
            border:1.5px solid #22c55e;
            background:#f0fdf4;
            box-shadow:0 0 0 1px rgba(34,197,94,.08) inset;
            border-radius:14px;
            padding:10px 12px;
            margin-bottom:10px;
          ">
            <div class="sg-title" style="
              font-size:16px;
              font-weight:800;
              margin-bottom:8px;
              line-height:1.3;
            ">
              ${t.noSensor}
            </div>
            <div class="sgi-name" style="font-size:14px;font-weight:700;">
              ${t.noSensorDataYet}
            </div>
          </div>
        `;

      const cardStyle = hasProblemInNode
        ? `
          border:2px solid #ef4444;
          background:linear-gradient(180deg,#fff5f5 0%,#ffffff 100%);
          box-shadow:0 10px 24px rgba(239,68,68,.10);
        `
        : `
          border:2px solid #22c55e;
          background:linear-gradient(180deg,#f0fdf4 0%,#ffffff 100%);
          box-shadow:0 10px 24px rgba(34,197,94,.10);
        `;

      const badgeStyle = hasProblemInNode
        ? `
          background:#fee2e2;
          color:#b91c1c;
          border:1px solid #fecaca;
        `
        : `
          background:#dcfce7;
          color:#166534;
          border:1px solid #bbf7d0;
        `;

      cards.push(`
        <div class="pin-card" style="
          ${cardStyle}
          padding:12px 12px 10px 12px;
          border-radius:16px;
        ">
          <div class="pin-header" style="align-items:flex-start;gap:10px;margin-bottom:6px;">
            <div>
              <div class="pin-name" style="font-size:18px;font-weight:800;line-height:1.35;">
                ${t.dataLabel} : ${escapeHtml(plotName)} • ${escapeHtml(
        nodeType === "soil" ? t.soilNode : t.airNode
      )} • ${t.node}:${escapeHtml(nodeName)}
              </div>
              <div class="pin-sub" style="font-size:13px;line-height:1.4;margin-top:4px;">
                ${t.deviceAndSensorDetails}
              </div>
            </div>
            <div class="status-badge" style="${badgeStyle}font-size:12px;font-weight:800;padding:6px 10px;border-radius:999px;white-space:nowrap;">
              ${hasProblemInNode ? t.abnormal : t.normal} • ${escapeHtml(nodeStatus)}
            </div>
          </div>
          ${sensorGroups}
        </div>
      `);
    }
  }

  return cards.join("");
}

function buildIssueSummary(plots = [], t, lang) {
  const issues = [];

  for (const plot of plots) {
    const nodes = Array.isArray(plot?.nodes) ? plot.nodes : [];
    for (const node of nodes) {
      const sensors = Array.isArray(node?.sensors) ? node.sensors : [];
      for (const sensor of sensors) {
        const sensorName = translateSensorName(
          sensor?.name || sensor?.uid || t.sensor,
          lang
        );
        const info = getSensorStatusInfo(sensor, sensorName, t, lang);

        if (info.isOut) {
          issues.push({
            plotName: plot?.plotName || t.plot,
            nodeName: node?.nodeName || node?.uid || t.node,
            sensorName,
            latestValue: info.latest,
            unit: info.unit,
            statusText: info.statusText,
            reasonText: info.reasonText,
          });
        }
      }
    }
  }

  return issues;
}

export default function Page() {
  const { t, lang } = useDuwimsT();
  const mapRef = useRef(null);

  const [plots, setPlots] = useState([]);
  const [loadingMap, setLoadingMap] = useState(true);
  const [mapError, setMapError] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [role, setRole] = useState("");

  const mapData = useMemo(() => buildMapData(plots, t, lang), [plots, t, lang]);

  const weatherView = useMemo(() => {
    const daily = weatherData?.daily;
    if (!daily?.time?.length) return null;

    const days = daily.time.map((dateStr, i) => ({
      date: dateStr,
      label: i === 0 ? (lang === "en" ? "Today" : "วันนี้") : getDayShortLabel(dateStr, lang),
      icon: weatherCodeToEmoji(daily.weather_code?.[i]),
      maxTemp: daily.temperature_2m_max?.[i],
      minTemp: daily.temperature_2m_min?.[i],
      rainChance: daily.precipitation_probability_max?.[i],
      rainSum: daily.precipitation_sum?.[i],
    }));

    return {
      days,
      today: days[0],
      rain7Days: sumNumbers(days.map((d) => d.rainSum)),
      recommendation: buildWeatherRecommendation(weatherData, lang),
      currentTemp: weatherData?.current?.temperature_2m,
    };
  }, [weatherData, lang]);

  const htmlContent = useMemo(
    () => buildHtmlContent(t, weatherView, weatherLoading, weatherError, lang, role),
    [t, weatherView, weatherLoading, weatherError, lang, role]
  );

  useEffect(() => {
    let alive = true;

    async function loadPlots() {
      setLoadingMap(true);
      setMapError("");

      try {
        const url = new URL(window.location.href);
        const tokenFromUrl = url.searchParams.get("token");

        if (tokenFromUrl) {
          saveTokenToStorage(tokenFromUrl);
          url.searchParams.delete("token");
          url.searchParams.delete("error");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }

        const token = tokenFromUrl || getToken();
        if (!token) {
          setPlots([]);
          setMapError("กรุณาเข้าสู่ระบบก่อน");
          window.location.replace("/");
          return;
        }

        const payload = parseJwt(token);
        if (alive) {
          setRole(
            String(
              payload?.role ||
                payload?.user?.role ||
                payload?.data?.role ||
                ""
            ).toLowerCase()
          );
        }

        const res = await fetch(`${getApiBase()}/api/plots`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`${t.loadPlotFailed} (${res.status}) ${text || ""}`);
        }

        const data = await res.json();
        const rows = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        if (!alive) return;
        setPlots(rows);
      } catch (err) {
        if (!alive) return;
        setPlots([]);
        setMapError(err?.message || t.loadDashboardFailed);
      } finally {
        if (alive) setLoadingMap(false);
      }
    }

    loadPlots();
    return () => {
      alive = false;
    };
  }, [t]);

  useEffect(() => {
    let alive = true;

    async function loadWeather() {
      try {
        setWeatherLoading(true);
        setWeatherError("");

        if (!Array.isArray(plots) || !plots.length) {
          if (alive) setWeatherData(null);
          return;
        }

        const firstPlot = plots[0];
        const center = getPlotCenterLatLng(firstPlot);

        if (!center) {
          if (alive) {
            setWeatherData(null);
            setWeatherError("ไม่พบพิกัดแปลงสำหรับพยากรณ์อากาศ");
          }
          return;
        }

        const data = await fetchWeather7Days(center.lat, center.lng);
        if (!alive) return;
        setWeatherData(data);
      } catch (err) {
        if (!alive) return;
        setWeatherData(null);
        setWeatherError(err?.message || "โหลดพยากรณ์อากาศไม่สำเร็จ");
      } finally {
        if (alive) setWeatherLoading(false);
      }
    }

    loadWeather();

    return () => {
      alive = false;
    };
  }, [plots]);

  useEffect(() => {
    const cardsEl = document.getElementById("dashboardSensorCards");
    const onCountEl = document.getElementById("dashboardNodeOnCount");
    const offCountEl = document.getElementById("dashboardNodeOffCount");
    const issueCountEl = document.getElementById("dashboardIssueCount");
    const issueListEl = document.getElementById("dashboardIssueList");

    if (cardsEl) {
      cardsEl.innerHTML = buildSensorCards(plots, t, lang);
    }

    const allNodes = plots.flatMap((p) => (Array.isArray(p?.nodes) ? p.nodes : []));
    const onCount = allNodes.filter((n) => {
      const s = String(n?.status || "").toUpperCase();
      return s === "ONLINE" || s === "ACTIVE" || s === "ON";
    }).length;
    const offCount = Math.max(allNodes.length - onCount, 0);

    if (onCountEl) onCountEl.textContent = String(onCount);
    if (offCountEl) offCountEl.textContent = String(offCount);

    const issues = buildIssueSummary(plots, t, lang);
    if (issueCountEl) {
      issueCountEl.textContent = t.issuesCount(issues.length);
    }

    if (issueListEl) {
      issueListEl.innerHTML = issues.length
        ? issues
            .map((issue) => {
              return `
                <div class="alert-pill" style="display:block;line-height:1.5">
                  <div style="font-weight:800">
                    ${escapeHtml(issue.sensorName)} • ${escapeHtml(issue.statusText)}
                  </div>
                  <div>
                    ${t.valueLabel} ${escapeHtml(formatSensorValue(issue.latestValue, issue.unit))}
                  </div>
                  <div>
                    ${escapeHtml(issue.reasonText)}
                  </div>
                  <div>
                    ${escapeHtml(issue.plotName)} / ${escapeHtml(issue.nodeName)}
                  </div>
                </div>
              `;
            })
            .join("")
        : `<div class="alert-pill">${t.noIssues}</div>`;
    }
  }, [plots, t, lang, htmlContent]);

  useEffect(() => {
    let mounted = true;
    let mapInstance = null;
    let resizeTimer = null;

    async function initLeaflet() {
      if (loadingMap) return;

      const hostEl = document.getElementById("dashboardMapHost");
      const plotCountEl = document.getElementById("mapPlotCount");
      const pinCountEl = document.getElementById("mapPinCount");

      if (plotCountEl) {
        plotCountEl.textContent = `${t.plotCount}: ${mapData.polygons.length}`;
      }

      if (pinCountEl) {
        pinCountEl.textContent = `${t.pinCount}: ${mapData.pins.length}`;
      }

      if (!hostEl) return;

      if (mapError) {
        if (mapRef.current) {
          try {
            mapRef.current.remove();
          } catch {}
          mapRef.current = null;
        }

        hostEl.innerHTML = `
          <div style="
            height:320px;
            display:flex;
            align-items:center;
            justify-content:center;
            text-align:center;
            padding:24px;
            color:#9a3412;
            background:#fff7ed;
            font-weight:700;
          ">
            ${escapeHtml(mapError)}
          </div>
        `;
        return;
      }

      let mapEl = document.getElementById("dashboardMap");

      if (!mapEl) {
        hostEl.innerHTML = `<div id="dashboardMap" style="width:100%;height:320px;min-height:320px;display:block;border-radius:18px;overflow:hidden;background:#dfeecf"></div>`;
        mapEl = document.getElementById("dashboardMap");
      }

      if (!mapEl || !mapEl.isConnected) return;

      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
      }

      if (mapEl._leaflet_id) {
        try {
          mapEl._leaflet_id = null;
        } catch {}
      }

      try {
        const leafletModule = await import("leaflet");
        const L = leafletModule.default || leafletModule;

        if (!mounted || !L || !mapEl || !mapEl.isConnected) return;

        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        function makeDotIcon(color) {
          return L.divIcon({
            className: "dashboard-node-marker",
            html: `
              <div style="
                width:18px;
                height:18px;
                border-radius:999px;
                background:${color};
                border:3px solid #ffffff;
                box-shadow:0 4px 10px rgba(0,0,0,.25);
              "></div>
            `,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
            popupAnchor: [0, -10],
          });
        }

        const airIcon = makeDotIcon("#2563eb");
        const soilIcon = makeDotIcon("#16a34a");

        const defaultCenter = [13.112, 100.926];
        const center =
          mapData.polygons?.[0]?.coords?.[0] ||
          (mapData.pins?.[0] ? [mapData.pins[0].lat, mapData.pins[0].lng] : defaultCenter);

        mapInstance = L.map(mapEl, {
          center,
          zoom: 17,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 20,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(mapInstance);

        const bounds = [];

        mapData.polygons.forEach((poly) => {
          const layer = L.polygon(poly.coords, {
            color: poly.color || "#6c8f5d",
            weight: 2,
            fillColor: poly.color || "#6c8f5d",
            fillOpacity: 0.12,
          }).addTo(mapInstance);

          layer.bindTooltip(poly.name, { sticky: true });

          layer.bindPopup(`
            <div style="min-width:180px">
              <div style="font-weight:800;margin-bottom:6px">${escapeHtml(poly.name)}</div>
              <div>${t.polygonPointCount}: ${poly.coords.length}</div>
            </div>
          `);

          poly.coords.forEach((pt) => bounds.push(pt));
        });

        mapData.pins.forEach((pin) => {
          const node = pin.nodes?.[0] || {};
          const nodeType = String(node?.nodeType || "air").toLowerCase();
          const marker = L.marker([pin.lat, pin.lng], {
            icon: nodeType === "soil" ? soilIcon : airIcon,
          }).addTo(mapInstance);

          const sensorList = Array.isArray(node?.sensors) ? node.sensors : [];

          const sensorListHtml = sensorList.length
            ? `<ul style="padding-left:18px;margin:6px 0 0 0">
                ${sensorList
                  .map((sensor, i) => {
                    const sensorName = translateSensorName(
                      sensor?.name || sensor?.uid || `${t.sensor} ${i + 1}`,
                      lang
                    );
                    const latestValue = formatSensorValue(
                      displayLatest(sensor),
                      getDisplayUnit(sensor, sensorName)
                    );
                    return `<li>${escapeHtml(sensorName)} • ${escapeHtml(latestValue)}</li>`;
                  })
                  .join("")}
               </ul>`
            : `<div>${t.noSensorLower}</div>`;

          marker.bindTooltip(pin.pinName, {
            direction: "top",
            offset: [0, -8],
            opacity: 1,
          });

          marker.bindPopup(`
            <div style="min-width:240px">
              <div style="font-weight:800;margin-bottom:6px">${escapeHtml(pin.pinName)}</div>
              <div style="margin-bottom:4px">${t.plot}: ${escapeHtml(pin.plotName)}</div>
              <div style="margin-bottom:4px">${t.type}: ${escapeHtml(
                nodeType === "soil" ? t.soilNode : t.airNode
              )}</div>
              <div style="margin-bottom:4px">${t.status}: ${escapeHtml(node?.status || "-")}</div>
              <div style="margin-bottom:4px">lat ${escapeHtml(pin.lat)}, lng ${escapeHtml(pin.lng)}</div>
              <div style="font-weight:700;margin-top:8px;margin-bottom:4px">${t.currentSensors}</div>
              ${sensorListHtml}
            </div>
          `);

          bounds.push([pin.lat, pin.lng]);
        });

        if (bounds.length) {
          mapInstance.fitBounds(bounds, { padding: [20, 20] });
        } else {
          mapInstance.setView(defaultCenter, 17);
        }

        mapRef.current = mapInstance;

        resizeTimer = setTimeout(() => {
          try {
            if (!mounted) return;
            if (!mapInstance) return;
            if (mapRef.current !== mapInstance) return;
            if (!mapEl || !mapEl.isConnected) return;
            mapInstance.invalidateSize();
          } catch {}
        }, 250);
      } catch {
        if (!mounted) return;
        hostEl.innerHTML = `
          <div style="
            height:320px;
            display:flex;
            align-items:center;
            justify-content:center;
            text-align:center;
            padding:24px;
            color:#9a3412;
            background:#fff7ed;
            font-weight:700;
          ">
            ${t.leafletLoadFailed}
          </div>
        `;
      }
    }

    const tm = setTimeout(initLeaflet, 100);

    return () => {
      mounted = false;
      clearTimeout(tm);
      if (resizeTimer) clearTimeout(resizeTimer);

      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
      }

      const mapEl = document.getElementById("dashboardMap");
      if (mapEl && mapEl._leaflet_id) {
        try {
          mapEl._leaflet_id = null;
        } catch {}
      }
    };
  }, [loadingMap, mapError, mapData, t, lang, htmlContent]);

  return <DuwimsStaticPage current="dashboard" htmlContent={htmlContent} />;
}