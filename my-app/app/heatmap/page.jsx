"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useMap } from "react-leaflet";
import DuwimsStaticPage from "../components/DuwimsStaticPage";
import { useDuwimsT } from "../components/language-context";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Polygon = dynamic(
  () => import("react-leaflet").then((m) => m.Polygon),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);
const Rectangle = dynamic(
  () => import("react-leaflet").then((m) => m.Rectangle),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((m) => m.Tooltip),
  { ssr: false }
);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const DEFAULT_CENTER = [13.736717, 100.523186];
const DEFAULT_ZOOM = 6;
const THAILAND_FIT_PADDING = [12, 12];


const UI_TEXT = {
  th: {
    selectPlot: "เลือกแปลง",
    allPlots: "ทุกแปลง",
    sensorType: "ชนิดเซนเซอร์",
    startDate: "วันที่เริ่ม",
    endDate: "วันที่สิ้นสุด",
    plot: "แปลง",
    status: "สถานะ",
    time: "เวลา",
    noData: "ไม่มีข้อมูล",
    belowRange: "ต่ำกว่าช่วง",
    aboveRange: "สูงกว่าช่วง",
    withinRange: "อยู่ในช่วง",
    sensorReadingsMissing: "ยังไม่มี /api/sensor-readings จึงไม่แสดงค่าบน heatmap",
    sensorReadingsPartial: "โหลด sensor readings บางส่วนไม่สำเร็จ จะแสดงเฉพาะค่าที่โหลดได้",
    loadFailed: "โหลดข้อมูลไม่สำเร็จ",
    loadingToday: "กำลังโหลดข้อมูลวันนี้...",
    readyToShow: "ข้อมูลพร้อมแสดงแล้ว",
    readyToRender: "พร้อมแสดงผลแล้ว",
    globalClimateCooldown: "กำลังพักการเรียก Global Climate ชั่วคราว {waitSec} วินาที",
    openMeteoLimit: "Open-Meteo ใช้งานเกิน limit ชั่วคราว กรุณารอสักครู่",
    globalClimateLoadFailed: "โหลดข้อมูล Global Climate ไม่สำเร็จ",
    clipReady: "คลิปพร้อมเล่น",
    preparingClip: "กำลังเตรียมคลิป {done}/{total}",
    loadingNextFrame: "กำลังโหลดเฟรมถัดไป...",
    preparingMap: "กำลังเตรียมแผนที่...",
    loadingData: "กำลังโหลดข้อมูล...",
    loadingGlobalClimate: "กำลังโหลด Global Climate...",
    loadedCount: "โหลดแล้ว {done}/{total}",
    noGlobalClimateData: "ไม่มีข้อมูล Global Climate สำหรับช่วงเวลานี้",
    noSensorDataSelectedRange: "ไม่มีข้อมูลเซนเซอร์ในช่วงเวลาที่เลือก",
    currentTimeShown: "เวลาที่กำลังแสดง",
    stop: "หยุด",
    play: "เล่น",
    heatmapSummary: "สรุป Heatmap",
    sensor: "เซนเซอร์",
    dataMode: "โหมดข้อมูล",
    clipStatus: "สถานะคลิป",
    pointsUsed: "จำนวนจุดที่ใช้",
    averageValue: "ค่าเฉลี่ย",
    minValue: "ค่าต่ำสุด",
    maxValue: "ค่าสูงสุด",
    low: "ต่ำ",
    high: "สูง",
    referenceRange: "ช่วงอ้างอิง",
    valueStatus: "สถานะค่า",
    normal: "ปกติ",
    nodesUsedForCalc: "Node ที่ใช้คำนวณ (อิง reading ย้อนหลังตามเฟรม)",
    climateModeOverlay: "โหมด Climate ใช้ grid ที่ตัดเฉพาะในแปลงที่เลือก",
    noReadingInFrame: "ยังไม่มี reading ของเซนเซอร์นี้ในช่วงเฟรมที่เลือก",
    globalOverlayNote: "โหมด Climate แสดงค่าจาก grid ที่ตัดเฉพาะบริเวณแปลง",
    noSensorForNode: "ไม่มีข้อมูลของเซนเซอร์ที่เลือกใน node นี้",
    dataGlobalClimate: "Global Climate",
    dataLocalSensor: "Local Sensor",
  },
  en: {
    selectPlot: "Select Plot",
    allPlots: "All Plots",
    sensorType: "Sensor Type",
    startDate: "Start Date",
    endDate: "End Date",
    plot: "Plot",
    status: "Status",
    time: "Time",
    noData: "No data",
    belowRange: "Below range",
    aboveRange: "Above range",
    withinRange: "Within range",
    sensorReadingsMissing: "No /api/sensor-readings endpoint yet, so heatmap values are hidden.",
    sensorReadingsPartial: "Some sensor readings could not be loaded. Only available values are shown.",
    loadFailed: "Failed to load data",
    loadingToday: "Loading today's data...",
    readyToShow: "Data is ready",
    readyToRender: "Ready to render",
    globalClimateCooldown: "Global Climate requests are cooling down for {waitSec} seconds",
    openMeteoLimit: "Open-Meteo rate limit reached temporarily. Please wait a moment.",
    globalClimateLoadFailed: "Failed to load Global Climate data",
    clipReady: "Clip ready",
    preparingClip: "Preparing clip {done}/{total}",
    loadingNextFrame: "Loading next frame...",
    preparingMap: "Preparing map...",
    loadingData: "Loading data...",
    loadingGlobalClimate: "Loading Global Climate...",
    loadedCount: "Loaded {done}/{total}",
    noGlobalClimateData: "No Global Climate data for this time range",
    noSensorDataSelectedRange: "No sensor data in the selected range",
    currentTimeShown: "Currently shown time",
    stop: "Stop",
    play: "Play",
    heatmapSummary: "Heatmap Summary",
    sensor: "Sensor",
    dataMode: "Data Mode",
    clipStatus: "Clip Status",
    pointsUsed: "Points Used",
    averageValue: "Average",
    minValue: "Minimum",
    maxValue: "Maximum",
    low: "Low",
    high: "High",
    referenceRange: "Reference range",
    valueStatus: "Value Status",
    normal: "Normal",
    nodesUsedForCalc: "Nodes used for calculation (based on historical readings by frame)",
    climateModeOverlay: "Climate mode uses a grid clipped to the selected plots",
    noReadingInFrame: "No reading for this sensor in the selected frame",
    globalOverlayNote: "Climate mode shows clipped grid values only around the plots",
    noSensorForNode: "No data for the selected sensor in this node",
    dataGlobalClimate: "Global Climate",
    dataLocalSensor: "Local Sensor",
  },
};

function fillTemplate(template, params = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ""));
}

function getUiText(lang, key, params = {}) {
  const pack = UI_TEXT[lang] || UI_TEXT.th;
  return fillTemplate(pack[key] ?? UI_TEXT.th[key] ?? key, params);
}

function getLocalizedSensorLabel(sensorKey, lang) {
  const meta = SENSOR_META[sensorKey] || {};
  return lang === "en" ? meta.labelEn || meta.labelTh || sensorKey : meta.labelTh || meta.labelEn || sensorKey;
}

function getLocalizedStatusLabel(type, lang) {
  if (type === "low") return getUiText(lang, "belowRange");
  if (type === "high") return getUiText(lang, "aboveRange");
  if (type === "normal") return getUiText(lang, "withinRange");
  return getUiText(lang, "noData");
}


const SENSOR_META = {
  temp: {
    labelTh: "อุณหภูมิ",
    labelEn: "Temperature",
    unit: "°C",
    min: 20,
    max: 35,
  },
  humidity: {
    labelTh: "ความชื้นสัมพัทธ์",
    labelEn: "Relative Humidity",
    unit: "%",
    min: 75,
    max: 85,
  },
  wind_speed: {
    labelTh: "ความเร็วลม",
    labelEn: "Wind Speed",
    unit: "m/s",
    min: 0.56,
    max: 1.39,
  },
  light: {
    labelTh: "ความเข้มแสง",
    labelEn: "Light Intensity",
    unit: "lux",
    min: 40000,
    max: 60000,
  },
  rain: {
    labelTh: "ปริมาณน้ำฝน",
    labelEn: "Rainfall",
    unit: "mm",
    min: 4,
    max: 8,
  },
  soil_moisture: {
    labelTh: "ความชื้นดิน",
    labelEn: "Soil Moisture",
    unit: "%",
    min: 65,
    max: 80,
  },
  n: {
    labelTh: "N",
    labelEn: "N",
    unit: "%",
    min: 0.1,
    max: 1.0,
  },
  p: {
    labelTh: "P",
    labelEn: "P",
    unit: "ppm",
    min: 25,
    max: 45,
  },
  k: {
    labelTh: "K",
    labelEn: "K",
    unit: "cmol/kg",
    min: 0.8,
    max: 1.4,
  },
  water_level: {
    labelTh: "ความพร้อมใช้น้ำ",
    labelEn: "Water Availability",
    unit: "%",
    min: 50,
    max: 90,
  },
};

const SENSOR_KEYS = Object.keys(SENSOR_META);
const AIR_NODE_SENSORS = ["temp", "humidity", "wind_speed", "light", "rain"];
const SOIL_NODE_SENSORS = ["soil_moisture", "n", "p", "k", "water_level"];
const GLOBAL_SENSORS = ["temp", "humidity", "wind_speed", "rain"];

const HEAT_COLORS = [
  "#1e3a8a",
  "#2563eb",
  "#16a34a",
  "#fde047",
  "#f97316",
  "#dc2626",
  "#7f1d1d",
];

const THAILAND_BOUNDS = {
  minLat: 5.5,
  maxLat: 20.7,
  minLng: 97.2,
  maxLng: 105.8,
};

const GLOBAL_GRID_STEP = 0.35;
const GLOBAL_BATCH_SIZE = 120;
const GLOBAL_MAX_PARALLEL_PRELOAD = 1;


function getNodeTypeFromNode(node = {}) {
  const sensorNames = (Array.isArray(node?.sensors) ? node.sensors : [])
    .map((s) => normalizeSensorName(s?.name));

  const hasSoil = sensorNames.some((name) => SOIL_NODE_SENSORS.includes(name));
  const hasAir = sensorNames.some((name) => AIR_NODE_SENSORS.includes(name));

  if (hasSoil && !hasAir) return "soil";
  if (hasAir && !hasSoil) return "air";

  const raw = `${node?.nodeName || ""} ${node?.uid || ""}`.toLowerCase();
  if (raw.includes("soil")) return "soil";
  if (raw.includes("air")) return "air";

  return hasSoil ? "soil" : "air";
}

function getSensorOptionsByNodeType(nodeType) {
  return nodeType === "air" ? AIR_NODE_SENSORS : SOIL_NODE_SENSORS;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toText(v) {
  return String(v ?? "").trim();
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function formatDateInput(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateThai(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543}`;
}

function formatDateTimeThai(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function toIsoHour(dateOrTs) {
  const d = new Date(dateOrTs);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(0, 0, 0);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(
    d.getUTCHours()
  )}:00`;
}

function getAuthToken() {
  if (typeof window === "undefined") return "";
  const keys = ["AUTH_TOKEN_V1", "token", "authToken", "pmtool_token", "duwims_token"];
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return "";
}

async function apiFetch(path, options = {}) {
  const token = getAuthToken();

  console.log("🔑 TOKEN:", token);

  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  // 🔥 FIX: กัน 401
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn("⚠️ NO TOKEN → bypass dev mode");
    headers.Authorization = "Bearer dev";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  let json = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  console.log("🔥 API:", path, json);

  // 🔥 FIX: ไม่ throw สำหรับ sensor-readings
  if (!res.ok) {
    if (path.includes("sensor-readings")) {
      console.warn("⚠️ sensor-readings fallback []");
      return [];
    }

    throw new Error(json?.message || `Request failed (${res.status})`);
  }

  return json;
}


function isMissingSensorReadingsEndpointError(error) {
  const msg = String(error?.message || "").toLowerCase();
  return (
    msg.includes("/api/sensor-readings") ||
    msg.includes("sensor-readings") ||
    msg.includes("request failed (404)") ||
    msg.includes("request failed (405)") ||
    msg.includes("request failed (501)")
  );
}

function extractSensorReadingItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeReadingItem(item) {
  const value = Number(item?.value);

  if (value === 99) {
    console.log("🎯 FOUND 99 FROM DB:", item);
  }

  return {
    ...item,
    sensorId: item?.sensorId,
    sensorName: normalizeSensorName(item?.sensorType || item?.sensorName),
    value,
    timestamp:
      item?.timestamp ||
      item?.ts ||
      item?.createdAt ||
      null,
  };
}

function normalizeCoords(input) {
  const arr = Array.isArray(input) ? input : [];
  return arr
    .map((pt) => {
      if (Array.isArray(pt) && pt.length >= 2) {
        return { lat: toNum(pt[0]), lng: toNum(pt[1]) };
      }
      return { lat: toNum(pt?.lat), lng: toNum(pt?.lng) };
    })
    .filter((pt) => pt.lat != null && pt.lng != null);
}

function normalizeSensorName(name) {
  const raw = toText(name).toLowerCase();

  const dict = {
    temp: "temp",
    temperature: "temp",
    "อุณหภูมิ": "temp",

    humidity: "humidity",
    "relative humidity": "humidity",
    "ความชื้นสัมพัทธ์": "humidity",

    wind_speed: "wind_speed",
    "wind speed": "wind_speed",
    windspeed: "wind_speed",
    wind: "wind_speed",
    "ความเร็วลม": "wind_speed",
    "วัดความเร็วลม": "wind_speed",

    light: "light",
    "light intensity": "light",
    lux: "light",
    "ความเข้มแสง": "light",

    rain: "rain",
    rainfall: "rain",
    "ปริมาณน้ำฝน": "rain",

    soil_moisture: "soil_moisture",
    "soil moisture": "soil_moisture",
    "ความชื้นในดิน": "soil_moisture",
    "ความชื้นดิน": "soil_moisture",

    water_level: "water_level",
    "water availability": "water_level",
    "ความพร้อมใช้น้ำ": "water_level",
    "การให้น้ำ / ความพร้อมใช้น้ำ": "water_level",

    n: "n",
    p: "p",
    k: "k",
  };

  return dict[raw] || raw;
}

function lerpColor(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);

  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;

  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;

  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);

  return `rgb(${rr}, ${rg}, ${rb})`;
}

function getSensorRatio(sensorKey, value) {
  const meta = SENSOR_META[sensorKey] || {};
  const min = toNum(meta.min);
  const max = toNum(meta.max);

  if (value == null || min == null || max == null || max <= min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function getHeatColorByRatio(ratio) {
  const colors = HEAT_COLORS;
  const scaled = clamp(ratio, 0, 1) * (colors.length - 1);
  const index = Math.floor(scaled);
  const frac = scaled - index;
  if (index >= colors.length - 1) return colors[colors.length - 1];
  return lerpColor(colors[index], colors[index + 1], frac);
}

function getHeatColor(sensorKey, value) {
  return getHeatColorByRatio(getSensorRatio(sensorKey, value));
}

function getContrastText(color) {
  if (!color) return "#ffffff";

  const rgbMatch = String(color).match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
  let r;
  let g;
  let b;

  if (rgbMatch) {
    r = Number(rgbMatch[1]);
    g = Number(rgbMatch[2]);
    b = Number(rgbMatch[3]);
  } else if (String(color).startsWith("#")) {
    const hex = String(color).slice(1);
    const normalized = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const num = parseInt(normalized, 16);
    r = (num >> 16) & 255;
    g = (num >> 8) & 255;
    b = num & 255;
  } else {
    return "#ffffff";
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.68 ? "#111827" : "#ffffff";
}

function getSensorStatus(sensorKey, value) {
  const meta = SENSOR_META[sensorKey] || {};
  const min = toNum(meta.min);
  const max = toNum(meta.max);

  if (value == null || Number.isNaN(value)) {
    return { type: "none", label: "ไม่มีข้อมูล" };
  }
  if (min != null && value < min) {
    return { type: "low", label: "ต่ำกว่าช่วง" };
  }
  if (max != null && value > max) {
    return { type: "high", label: "สูงกว่าช่วง" };
  }
  return { type: "normal", label: "อยู่ในช่วง" };
}


function formatLegendValue(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  const n = Number(value);
  if (Math.abs(n) >= 1000) return n.toLocaleString();
  if (Math.abs(n) >= 100) return String(Math.round(n));
  if (Math.abs(n) >= 10) return n % 1 === 0 ? String(n) : n.toFixed(1);
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function getLegendStops(sensorKey) {
  const meta = SENSOR_META[sensorKey] || {};
  const min = toNum(meta.min);
  const max = toNum(meta.max);
  if (min == null || max == null || max <= min) return [];
  const segments = 4;
  return Array.from({ length: segments + 1 }, (_, i) => {
    const ratio = i / segments;
    const value = min + (max - min) * ratio;
    return {
      ratio,
      value,
      label: formatLegendValue(value),
      color: getHeatColorByRatio(ratio),
    };
  });
}

const FRAME_STEP_MINUTES = 15;
const MAX_FRAMES = 96 * 14;
const BANGKOK_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

function parseBangkokDate(dateText, endOfDay = false) {
  const safe = toText(dateText);
  if (!safe) return new Date(NaN);
  return new Date(`${safe}T${endOfDay ? "23:59:59" : "00:00:00"}+07:00`);
}

function alignBangkokFrameStart(dateOrTs) {
  const d = new Date(dateOrTs);
  if (Number.isNaN(d.getTime())) return NaN;

  const bangkokTs = d.getTime() + BANGKOK_UTC_OFFSET_MS;
  const bangkokDate = new Date(bangkokTs);

  const minutes = bangkokDate.getUTCMinutes();
  const alignedMinutes = Math.floor(minutes / FRAME_STEP_MINUTES) * FRAME_STEP_MINUTES;

  bangkokDate.setUTCSeconds(0, 0);
  bangkokDate.setUTCMinutes(alignedMinutes);
  return bangkokDate.getTime() - BANGKOK_UTC_OFFSET_MS;
}

function buildFrames(startDate, endDate) {
  const start = parseBangkokDate(startDate, false);
  const end = parseBangkokDate(endDate, true);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [alignBangkokFrameStart(Date.now())];
  }

  const stepMs = FRAME_STEP_MINUTES * 60 * 1000;
  const frames = [];

  let cursor = alignBangkokFrameStart(start);
  while (cursor <= end.getTime()) {
    frames.push(cursor);
    cursor += stepMs;
    if (frames.length >= MAX_FRAMES) break;
  }

  if (!frames.length) {
    frames.push(alignBangkokFrameStart(start));
  }

  return frames;
}

function getReadingTs(reading) {
  return new Date(reading?.timestamp || reading?.ts || reading?.createdAt || 0).getTime();
}

function findLatestReadingInWindow(readings, startTs, endTs) {
  if (!Array.isArray(readings) || !readings.length) return null;

  let bestInWindow = null;
  let bestInWindowTs = -Infinity;

  for (const reading of readings) {
    const rts = getReadingTs(reading);
    if (!Number.isFinite(rts)) continue;

    // อยู่ในเฟรมนี้เท่านั้น
    if (rts >= startTs && rts < endTs) {
      if (rts > bestInWindowTs) {
        bestInWindow = reading;
        bestInWindowTs = rts;
      }
    }
  }

  return bestInWindow;
}

function findReadingAtOrBefore(readings, targetTs) {
  if (!Array.isArray(readings) || !readings.length) return null;

  let best = null;
  let bestTs = -Infinity;

  for (const reading of readings) {
    const rts = getReadingTs(reading);
    if (!Number.isFinite(rts) || rts > targetTs) continue;
    if (rts > bestTs) {
      best = reading;
      bestTs = rts;
    }
  }

  return best;
}

function findReadingAtOrAfter(readings, targetTs) {
  if (!Array.isArray(readings) || !readings.length) return null;

  let best = null;
  let bestTs = Infinity;

  for (const reading of readings) {
    const rts = getReadingTs(reading);
    if (!Number.isFinite(rts) || rts < targetTs) continue;
    if (rts < bestTs) {
      best = reading;
      bestTs = rts;
    }
  }

  return best;
}

function interpolateValueBetweenReadings(beforeReading, afterReading, targetTs) {
  const beforeTs = getReadingTs(beforeReading);
  const afterTs = getReadingTs(afterReading);
  const beforeValue = toNum(beforeReading?.value);
  const afterValue = toNum(afterReading?.value);

  if (!Number.isFinite(beforeValue) && !Number.isFinite(afterValue)) return null;
  if (!Number.isFinite(beforeTs) || !Number.isFinite(afterTs) || afterTs <= beforeTs) {
    if (Number.isFinite(beforeValue)) return beforeValue;
    return Number.isFinite(afterValue) ? afterValue : null;
  }

  if (!Number.isFinite(beforeValue)) return Number.isFinite(afterValue) ? afterValue : null;
  if (!Number.isFinite(afterValue)) return Number.isFinite(beforeValue) ? beforeValue : null;

  const ratio = clamp((targetTs - beforeTs) / (afterTs - beforeTs), 0, 1);
  return beforeValue + (afterValue - beforeValue) * ratio;
}

function getSmoothedReadingForFrame(point, currentTs, nextFrameTs) {
  const readingInFrame = findLatestReadingInWindow(point.readings, currentTs, nextFrameTs);
  if (readingInFrame) {
    return {
      chosen: readingInFrame,
      value: toNum(readingInFrame?.value),
      ts: readingInFrame?.timestamp || readingInFrame?.ts || readingInFrame?.createdAt || null,
      mode: "frame",
      readingInFrame,
      beforeReading: null,
      afterReading: null,
      latestHistory: null,
    };
  }

  return {
    chosen: null,
    value: null,
    ts: null,
    mode: "none",
    readingInFrame: null,
    beforeReading: null,
    afterReading: null,
    latestHistory: null,
  };
}

function getBoundsFromCoords(coords) {
  if (!coords.length) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  coords.forEach((c) => {
    minLat = Math.min(minLat, c.lat);
    maxLat = Math.max(maxLat, c.lat);
    minLng = Math.min(minLng, c.lng);
    maxLng = Math.max(maxLng, c.lng);
  });

  if (
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLat) ||
    !Number.isFinite(minLng) ||
    !Number.isFinite(maxLng)
  ) {
    return null;
  }

  return { minLat, maxLat, minLng, maxLng };
}

function pointInPolygon(point, polygon) {
  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function getPolygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.lng * b.lat - b.lng * a.lat;
  }
  return area / 2;
}

function lineIntersection(a1, a2, b1, b2) {
  const x1 = a1.lng;
  const y1 = a1.lat;
  const x2 = a2.lng;
  const y2 = a2.lat;
  const x3 = b1.lng;
  const y3 = b1.lat;
  const x4 = b2.lng;
  const y4 = b2.lat;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-12) return null;

  const px =
    ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
  const py =
    ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;

  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
  return { lat: py, lng: px };
}

function dedupePolygonPoints(points) {
  const out = [];
  for (const point of points || []) {
    const last = out[out.length - 1];
    if (
      last &&
      Math.abs(last.lat - point.lat) < 1e-10 &&
      Math.abs(last.lng - point.lng) < 1e-10
    ) {
      continue;
    }
    out.push(point);
  }

  if (out.length >= 2) {
    const first = out[0];
    const last = out[out.length - 1];
    if (
      Math.abs(first.lat - last.lat) < 1e-10 &&
      Math.abs(first.lng - last.lng) < 1e-10
    ) {
      out.pop();
    }
  }

  return out;
}

function clipPolygonWithConvexPolygon(subjectPolygon, clipPolygon) {
  if (!Array.isArray(subjectPolygon) || subjectPolygon.length < 3) return [];
  if (!Array.isArray(clipPolygon) || clipPolygon.length < 3) return [];

  let output = [...subjectPolygon];
  const clipArea = getPolygonArea(clipPolygon);
  const clipSign = clipArea >= 0 ? 1 : -1;

  for (let i = 0; i < clipPolygon.length; i += 1) {
    const cp1 = clipPolygon[i];
    const cp2 = clipPolygon[(i + 1) % clipPolygon.length];
    const input = [...output];
    output = [];
    if (!input.length) break;

    const isInside = (p) => {
      const cross =
        (cp2.lng - cp1.lng) * (p.lat - cp1.lat) -
        (cp2.lat - cp1.lat) * (p.lng - cp1.lng);
      return clipSign >= 0 ? cross >= -1e-10 : cross <= 1e-10;
    };

    let s = input[input.length - 1];
    for (const e of input) {
      const eInside = isInside(e);
      const sInside = isInside(s);

      if (eInside) {
        if (!sInside) {
          const inter = lineIntersection(s, e, cp1, cp2);
          if (inter) output.push(inter);
        }
        output.push(e);
      } else if (sInside) {
        const inter = lineIntersection(s, e, cp1, cp2);
        if (inter) output.push(inter);
      }

      s = e;
    }
  }

  return dedupePolygonPoints(output);
}

function getRectPolygon(minLat, maxLat, minLng, maxLng) {
  return [
    { lat: minLat, lng: minLng },
    { lat: minLat, lng: maxLng },
    { lat: maxLat, lng: maxLng },
    { lat: maxLat, lng: minLng },
  ];
}


function getPlotFillStats(plot, points, sensorKey) {
  const insidePoints = (Array.isArray(points) ? points : []).filter((p) => {
    if (p?.value == null || Number.isNaN(p.value)) return false;
    if (p?.lat == null || p?.lng == null) return false;
    return pointInPolygon({ lat: p.lat, lng: p.lng }, plot.coords || []);
  });

  if (!insidePoints.length) {
    return {
      hasData: false,
      value: null,
      ratio: null,
      color: "transparent",
      opacity: 0,
      count: 0,
      min: null,
      max: null,
      avg: null,
    };
  }

  const values = insidePoints
    .map((p) => Number(p.value))
    .filter((v) => !Number.isNaN(v));

  if (!values.length) {
    return {
      hasData: false,
      value: null,
      ratio: null,
      color: "transparent",
      opacity: 0,
      count: 0,
      min: null,
      max: null,
      avg: null,
    };
  }

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const ratio = getSensorRatio(sensorKey, avg);
  const color = getHeatColorByRatio(ratio);
  const opacity = clamp(0.45 + ratio * 0.45, 0.45, 0.9);

  return {
    hasData: true,
    value: avg,
    ratio,
    color,
    opacity,
    count: insidePoints.length,
    min,
    max,
    avg,
  };
}

function buildLocalHeatCells(plots, points, sensorKey, density = 72) {
  if (!plots.length || !points.length) return [];

  const allCoords = plots.flatMap((p) => p.coords || []);
  const bounds = getBoundsFromCoords(allCoords);
  if (!bounds) return [];

  const width = bounds.maxLng - bounds.minLng;
  const height = bounds.maxLat - bounds.minLat;
  if (width <= 0 || height <= 0) return [];

  const cols = density;
  const rows = Math.max(16, Math.round((height / width) * cols));
  const cellLng = width / cols;
  const cellLat = height / rows;

  const cells = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const minLat = bounds.minLat + row * cellLat;
      const maxLat = minLat + cellLat;
      const minLng = bounds.minLng + col * cellLng;
      const maxLng = minLng + cellLng;

      const center = {
        lat: (minLat + maxLat) / 2,
        lng: (minLng + maxLng) / 2,
      };

      const ownerPlot = plots.find((plot) => pointInPolygon(center, plot.coords));
      if (!ownerPlot) continue;

      let weighted = 0;
      let totalWeight = 0;
      let nearestDistance = Infinity;

      for (const p of points) {
        if (p.value == null || Number.isNaN(p.value)) continue;

        const dLat = center.lat - p.lat;
        const dLng = center.lng - p.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        nearestDistance = Math.min(nearestDistance, dist);

        const w = 1 / Math.pow(dist + 0.00012, 2);
        weighted += p.value * w;
        totalWeight += w;
      }

      if (!totalWeight) continue;

      const value = weighted / totalWeight;
      const ratio = getSensorRatio(sensorKey, value);
      const opacityBase = 0.34 + (1 - clamp(nearestDistance / 0.028, 0, 1)) * 0.62;

      const clippedPolygon = clipPolygonWithConvexPolygon(
        getRectPolygon(minLat, maxLat, minLng, maxLng),
        ownerPlot.coords
      );
      if (clippedPolygon.length < 3) continue;

      cells.push({
        id: `${row}-${col}`,
        positions: clippedPolygon.map((p) => [p.lat, p.lng]),
        value,
        ratio,
        color: getHeatColorByRatio(ratio),
        opacity: clamp(opacityBase, 0.30, 0.96),
      });
    }
  }

  return cells;
}

function buildGridPoints(bounds, step = GLOBAL_GRID_STEP) {
  const safeBounds = bounds || THAILAND_BOUNDS;
  const out = [];
  for (let lat = safeBounds.minLat; lat <= safeBounds.maxLat; lat += step) {
    for (let lng = safeBounds.minLng; lng <= safeBounds.maxLng; lng += step) {
      out.push({
        lat: Number(lat.toFixed(4)),
        lng: Number(lng.toFixed(4)),
      });
    }
  }
  return out;
}

function getExpandedBoundsFromPlots(plots, padding = GLOBAL_GRID_STEP) {
  const coords = (Array.isArray(plots) ? plots : []).flatMap((plot) => plot?.coords || []);
  const bounds = getBoundsFromCoords(coords);
  if (!bounds) return { ...THAILAND_BOUNDS };

  return {
    minLat: clamp(bounds.minLat - padding, THAILAND_BOUNDS.minLat, THAILAND_BOUNDS.maxLat),
    maxLat: clamp(bounds.maxLat + padding, THAILAND_BOUNDS.minLat, THAILAND_BOUNDS.maxLat),
    minLng: clamp(bounds.minLng - padding, THAILAND_BOUNDS.minLng, THAILAND_BOUNDS.maxLng),
    maxLng: clamp(bounds.maxLng + padding, THAILAND_BOUNDS.minLng, THAILAND_BOUNDS.maxLng),
  };
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function getOpenMeteoVariable(sensorKey) {
  switch (sensorKey) {
    case "temp":
      return "temperature_2m";
    case "humidity":
      return "relative_humidity_2m";
    case "wind_speed":
      return "wind_speed_10m";
    case "rain":
      return "precipitation";
    default:
      return null;
  }
}

function pickOpenMeteoValue(item, variable, targetIsoHour) {
  const series = item?.hourly?.[variable];
  const times = item?.hourly?.time;

  if (!Array.isArray(series) || !Array.isArray(times) || !times.length) return null;

  const target = new Date(`${targetIsoHour}:00Z`).getTime();
  if (!Number.isFinite(target)) return null;

  let exactIdx = times.indexOf(targetIsoHour);
  if (exactIdx >= 0) return toNum(series[exactIdx]);

  let beforeIdx = -1;
  let afterIdx = -1;

  for (let i = 0; i < times.length; i += 1) {
    const ts = new Date(`${times[i]}:00Z`).getTime();
    if (!Number.isFinite(ts)) continue;
    if (ts <= target) beforeIdx = i;
    if (ts >= target) {
      afterIdx = i;
      break;
    }
  }

  if (beforeIdx >= 0 && afterIdx >= 0 && beforeIdx !== afterIdx) {
    const t1 = new Date(`${times[beforeIdx]}:00Z`).getTime();
    const t2 = new Date(`${times[afterIdx]}:00Z`).getTime();
    const v1 = toNum(series[beforeIdx]);
    const v2 = toNum(series[afterIdx]);

    if ([t1, t2, v1, v2].every((v) => Number.isFinite(v)) && t2 > t1) {
      const ratio = (target - t1) / (t2 - t1);
      return Number((v1 + (v2 - v1) * ratio).toFixed(2));
    }
  }

  const fallbackIdx = beforeIdx >= 0 ? beforeIdx : afterIdx;
  return fallbackIdx >= 0 ? toNum(series[fallbackIdx]) : null;
}

async function fetchOpenMeteoGrid(sensorKey, ts, clipPlots = [], selectedPlotId = "all") {
  const variable = getOpenMeteoVariable(sensorKey);
  if (!variable) return [];

  const usePlotBounds =
    selectedPlotId !== "all" &&
    Array.isArray(clipPlots) &&
    clipPlots.some((plot) => (plot?.coords || []).length >= 3);

  const step = usePlotBounds ? 0.2 : GLOBAL_GRID_STEP;
  const requestBounds = usePlotBounds
    ? getExpandedBoundsFromPlots(clipPlots, Math.max(step, 0.15))
    : THAILAND_BOUNDS;

  const targetTs = new Date(ts).getTime();
  const now = Date.now();
  const useArchive = targetTs < now - 36 * 60 * 60 * 1000;

  const grid = buildGridPoints(requestBounds, step);
  if (!grid.length) return [];

  const targetIsoHour = toIsoHour(targetTs);
  const targetDate = targetIsoHour.slice(0, 10);

  const latitudes = grid.map((p) => p.lat).join(",");
  const longitudes = grid.map((p) => p.lng).join(",");

  const base = useArchive
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";

  const params = new URLSearchParams({
    latitude: latitudes,
    longitude: longitudes,
    hourly: variable,
    start_date: targetDate,
    end_date: targetDate,
    timezone: "GMT",
    wind_speed_unit: "ms",
    precipitation_unit: "mm",
    temperature_unit: "celsius",
    cell_selection: "nearest",
  });

  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(`${base}?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Open-Meteo failed (${res.status})`);
      const json = await res.json();

      const list = Array.isArray(json) ? json : [json];

      return list
        .map((item, index) => {
          const value = pickOpenMeteoValue(item, variable, targetIsoHour);
          if (value == null || Number.isNaN(value)) return null;

          const lat = toNum(item?.latitude ?? grid[index]?.lat);
          const lng = toNum(item?.longitude ?? grid[index]?.lng);
          if (lat == null || lng == null) return null;

          return { lat, lng, value, step };
        })
        .filter(Boolean);
    } catch (error) {
      lastError = error;
      if (String(error?.message || "").includes("(429)")) break;
      await new Promise((resolve) => setTimeout(resolve, 450));
    }
  }

  throw lastError || new Error("Open-Meteo failed");
}

function getPercentile(values, percentile) {
  const nums = (Array.isArray(values) ? values : [])
    .filter((v) => v != null && !Number.isNaN(v))
    .sort((a, b) => a - b);
  if (!nums.length) return null;
  const idx = (nums.length - 1) * percentile;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return nums[lower];
  const weight = idx - lower;
  return nums[lower] * (1 - weight) + nums[upper] * weight;
}

function buildGlobalClimateCells(points, sensorKey, step = GLOBAL_GRID_STEP, clipPlots = []) {
  if (!points.length) return [];

  const shouldClip = Array.isArray(clipPlots) && clipPlots.some((plot) => (plot?.coords || []).length >= 3);

  return points
    .map((p, idx) => {
      const ratio = getSensorRatio(sensorKey, p.value);
      const minLat = p.lat - step / 2;
      const maxLat = p.lat + step / 2;
      const minLng = p.lng - step / 2;
      const maxLng = p.lng + step / 2;

      if (shouldClip) {
        const center = { lat: p.lat, lng: p.lng };
        const ownerPlot = clipPlots.find((plot) => pointInPolygon(center, plot.coords));
        if (!ownerPlot) return null;

        const clippedPolygon = clipPolygonWithConvexPolygon(
          getRectPolygon(minLat, maxLat, minLng, maxLng),
          ownerPlot.coords
        );
        if (clippedPolygon.length < 3) return null;

        return {
          id: `global-${idx}`,
          positions: clippedPolygon.map((point) => [point.lat, point.lng]),
          value: p.value,
          color: getHeatColorByRatio(ratio),
          opacity: 0.52,
        };
      }

      return {
        id: `global-${idx}`,
        positions: [
          [minLat, minLng],
          [minLat, maxLng],
          [maxLat, maxLng],
          [maxLat, minLng],
        ],
        value: p.value,
        color: getHeatColorByRatio(ratio),
        opacity: 0.52,
      };
    })
    .filter(Boolean);
}

function FitToSelection({ polygons, selectedPlotId, lockToWorld }) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof map.fitBounds !== "function" || typeof map.setView !== "function") {
      return;
    }

    if (lockToWorld) {
      map.fitBounds(
        [
          [THAILAND_BOUNDS.minLat, THAILAND_BOUNDS.minLng],
          [THAILAND_BOUNDS.maxLat, THAILAND_BOUNDS.maxLng],
        ],
        { padding: THAILAND_FIT_PADDING, maxZoom: 7 }
      );
      return;
    }

    const targets =
      selectedPlotId === "all"
        ? polygons
        : polygons.filter((p) => p.id === selectedPlotId);

    const polygonPoints = targets
      .filter((p) => p.coords.length >= 3)
      .flatMap((p) => p.coords)
      .map((c) => [c.lat, c.lng]);

    const nodePoints = targets
      .flatMap((p) => (Array.isArray(p.nodes) ? p.nodes : []))
      .filter((n) => n.lat != null && n.lng != null)
      .map((n) => [n.lat, n.lng]);

    const points = polygonPoints.length ? polygonPoints : nodePoints;

    if (!points.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    map.fitBounds(points, { padding: [24, 24], maxZoom: 12 });
  }, [map, polygons, selectedPlotId, lockToWorld]);

  return null;
}


function getCacheKeyForFrame(sensorKey, ts, plotKey = "all") {
  return `${sensorKey}-${plotKey}-${toIsoHour(ts)}`;
}

function buildPriorityFrameIndexes(frameTimestamps, selectedTs) {
  if (!Array.isArray(frameTimestamps) || !frameTimestamps.length) return [];
  let anchor = frameTimestamps.findIndex((ts) => ts === selectedTs);
  if (anchor < 0) anchor = frameTimestamps.length - 1;

  const used = new Set([anchor]);
  const out = [anchor];

  for (let gap = 1; gap < frameTimestamps.length; gap += 1) {
    const right = anchor + gap;
    const left = anchor - gap;

    if (right < frameTimestamps.length && !used.has(right)) {
      used.add(right);
      out.push(right);
    }
    if (left >= 0 && !used.has(left)) {
      used.add(left);
      out.push(left);
    }
  }

  return out;
}

export default function Page() {
  const { t, lang } = useDuwimsT();
  const uiLang = lang === "en" ? "en" : "th";
  const tt = useCallback((key, fallback, params = {}) => {
    const raw = t?.[key];
    if (typeof raw === "function") {
      try {
        const value = raw(params);
        if (value != null && value !== "") return value;
      } catch {}
    }
    if (typeof raw === "string" && raw) return fillTemplate(raw, params);
    return fillTemplate(fallback ?? getUiText(uiLang, key, params), params);
  }, [t, uiLang]);
  const [mounted, setMounted] = useState(false);
  const [plots, setPlots] = useState([]);
  const [allReadings, setAllReadings] = useState([]);
  const [sensorReadingsNotice, setSensorReadingsNotice] = useState("");
  const [globalPoints, setGlobalPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalProgress, setGlobalProgress] = useState({ done: 0, total: 0, label: "" });
  const [error, setError] = useState("");
  const [globalError, setGlobalError] = useState("");

  const [selectedPlotId, setSelectedPlotId] = useState("all");
  const [selectedNodeType, setSelectedNodeType] = useState("soil");
  const [selectedSensor, setSelectedSensor] = useState("soil_moisture");

  const [startDate, setStartDate] = useState(() => formatDateInput(new Date()));
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const timerRef = useRef(null);
  const globalCacheRef = useRef(new Map());
  const globalLastFetchRef = useRef(0);
  const globalBackoffUntilRef = useRef(0);
  const globalInflightRef = useRef("");
  const preloadQueueRef = useRef([]);
  const preloadActiveRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const frameTimestamps = useMemo(() => buildFrames(startDate, endDate), [startDate, endDate]);
  const framesKey = useMemo(() => frameTimestamps.join("|"), [frameTimestamps]);
  const frameCount = frameTimestamps.length;
  const isGlobalSensor = false;
  const currentFrameTs = frameTimestamps[frameIndex] || Date.now();

  const visiblePlots = useMemo(() => {
    if (selectedPlotId === "all") return plots;
    return plots.filter((plot) => plot.id === selectedPlotId);
  }, [plots, selectedPlotId]);
  const visiblePlotsKey = useMemo(
    () => visiblePlots.map((plot) => `${plot.id}:${(plot.coords || []).length}:${(plot.nodes || []).length}`).join("|"),
    [visiblePlots]
  );

  useEffect(() => {
    const allowed = getSensorOptionsByNodeType(selectedNodeType);
    if (!allowed.includes(selectedSensor)) {
      setSelectedSensor(allowed[0]);
    }
  }, [selectedNodeType, selectedSensor]);




  useEffect(() => {
    if (!frameCount) return;
    if (frameIndex >= frameCount) {
      setFrameIndex(frameCount - 1);
    }
  }, [frameIndex, frameCount]);

  useEffect(() => {
    let alive = true;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const plotsJson = await apiFetch("/api/plots");
        const rawPlots = Array.isArray(plotsJson?.items) ? plotsJson.items : [];

        const normalizedPlots = rawPlots
          .map((plot, plotIndex) => {
            const coords = normalizeCoords(
              plot?.polygon || plot?.coords || plot?.geometry || []
            );
            const rawNodes = Array.isArray(plot?.nodes) ? plot.nodes : [];

            return {
              id: toText(plot?.id || plot?._id || `plot-${plotIndex + 1}`),
              name: toText(plot?.plotName || plot?.name || `แปลง ${plotIndex + 1}`),
              caretaker: toText(plot?.caretaker),
              coords,
              nodes: rawNodes
                .map((node, nodeIndex) => ({
                  _id: toText(node?._id || `node-${nodeIndex + 1}`),
                  uid: toText(node?.uid),
                  nodeName: toText(node?.nodeName || node?.uid || `Node ${nodeIndex + 1}`),
                  status: toText(node?.status || "INACTIVE"),
                  lat: toNum(node?.lat),
                  lng: toNum(node?.lng),
                  sensors: (Array.isArray(node?.sensors) ? node.sensors : []).map(
                    (sensor, sensorIndex) => ({
                      _id: toText(sensor?._id || `sensor-${sensorIndex + 1}`),
                      uid: toText(sensor?.uid),
                      name: normalizeSensorName(sensor?.name),
                      rawName: toText(sensor?.name),
                      latestValue: toNum(sensor?.latestValue),
                      latestTimestamp: sensor?.latestTimestamp || null,
                      minValue: toNum(sensor?.minValue),
                      maxValue: toNum(sensor?.maxValue),
                      status: toText(sensor?.status || "NO_DATA"),
                    })
                  ),
                }))
                .filter((node) => node.lat != null && node.lng != null),
            };
          });

        const readingsResults = await Promise.allSettled(
          normalizedPlots.map(async (plot) => {
            const readingsJson = await apiFetch(
              `/api/sensor-readings?plotId=${encodeURIComponent(plot.id)}&limit=500`
            );
            return extractSensorReadingItems(readingsJson)
              .map(normalizeReadingItem)
              .filter((row) => row.sensorId && row.sensorName && row.value != null && row.timestamp);
          })
        );

        if (!alive) return;

        const flattenedReadings = [];
        let endpointMissing = false;
        let endpointFailures = 0;

        readingsResults.forEach((result) => {
          if (result.status === "fulfilled") {
            if (Array.isArray(result.value)) flattenedReadings.push(...result.value);
            return;
          }

          if (isMissingSensorReadingsEndpointError(result.reason)) {
            endpointMissing = true;
          } else {
            endpointFailures += 1;
          }
        });

        setPlots(normalizedPlots);
        setAllReadings(flattenedReadings);

        if (endpointMissing) {
          setSensorReadingsNotice(tt("sensorReadingsMissing"));
        } else if (endpointFailures > 0 && !flattenedReadings.length) {
          setSensorReadingsNotice(tt("sensorReadingsPartial"));
        } else {
          setSensorReadingsNotice("");
        }
      } catch (e) {
        if (!alive) return;
        setError(e?.message || tt("loadFailed"));
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadData();

    return () => {
      alive = false;
    };
  }, []);

  
useEffect(() => {
  setGlobalPoints([]);
  setGlobalError("");
  setGlobalLoading(false);
  setGlobalProgress({ done: 0, total: 0, label: "" });
  preloadQueueRef.current = [];
  preloadActiveRef.current = false;
  globalInflightRef.current = "";
}, [selectedSensor, currentFrameTs, selectedPlotId, frameCount, visiblePlotsKey]);


  const historicalReadingsBySensorId = useMemo(() => {
    const grouped = {};

    (Array.isArray(allReadings) ? allReadings : []).forEach((r) => {
      const sensorId = toText(r?.sensorId);
      const sensorName = normalizeSensorName(r?.sensorName || r?.sensorType || r?.name);
      const ts = new Date(r?.timestamp || r?.ts || r?.createdAt || 0).getTime();

      if (!sensorId || !Number.isFinite(ts)) return;

      if (!grouped[sensorId]) grouped[sensorId] = [];
      grouped[sensorId].push({
        ...r,
        value: toNum(r?.value),
        sensorName,
      });
    });

    Object.values(grouped).forEach((arr) => {
      arr.sort(
        (a, b) =>
          new Date(a?.timestamp || a?.createdAt || 0).getTime() -
          new Date(b?.timestamp || b?.createdAt || 0).getTime()
      );
    });

    return grouped;
  }, [allReadings]);

  const readingsBySensorId = useMemo(() => {
    const startTs = new Date(`${startDate}T00:00:00`).getTime();
    const endTs = new Date(`${endDate}T23:59:59`).getTime();
    const grouped = {};

    Object.entries(historicalReadingsBySensorId).forEach(([sensorId, rows]) => {
      const filtered = (Array.isArray(rows) ? rows : []).filter((r) => {
        const ts = new Date(r?.timestamp || r?.ts || r?.createdAt || 0).getTime();
        if (!Number.isFinite(ts)) return false;
        if (Number.isFinite(startTs) && ts < startTs) return false;
        if (Number.isFinite(endTs) && ts > endTs) return false;
        return true;
      });

      if (filtered.length) grouped[sensorId] = filtered;
    });

    return grouped;
  }, [historicalReadingsBySensorId, startDate, endDate]);

  const allNodes = useMemo(() => {
    return visiblePlots.flatMap((plot) =>
      plot.nodes
        .filter((node) => getNodeTypeFromNode(node) === selectedNodeType)
        .map((node) => ({
          ...node,
          plotId: plot.id,
          plotName: plot.name,
        }))
    );
  }, [visiblePlots, selectedNodeType]);

  const activeSensorPoints = useMemo(() => {
    return visiblePlots.flatMap((plot) =>
      plot.nodes.flatMap((node) => {
        const nodeType = getNodeTypeFromNode(node);
        if (nodeType !== selectedNodeType) return [];

        const sensor = (node.sensors || []).find((s) => s.name === selectedSensor);
        if (!sensor) return [];

        const sensorHistoryAll = Array.isArray(historicalReadingsBySensorId[sensor._id])
          ? historicalReadingsBySensorId[sensor._id].filter((r) => {
              return (
                toText(r?.plotId) === toText(plot.id) &&
                toText(r?.nodeId) === toText(node._id) &&
                toText(r?.sensorId) === toText(sensor._id)
              );
            })
          : [];

        const sensorHistoryInDateRange = Array.isArray(readingsBySensorId[sensor._id])
          ? readingsBySensorId[sensor._id].filter((r) => {
              return (
                toText(r?.plotId) === toText(plot.id) &&
                toText(r?.nodeId) === toText(node._id) &&
                toText(r?.sensorId) === toText(sensor._id)
              );
            })
          : [];

        return [
          {
            id: `${plot.id}-${node._id}-${sensor._id}`,
            plotId: plot.id,
            plotName: plot.name,
            nodeId: node._id,
            nodeName: node.nodeName,
            nodeUid: node.uid,
            nodeType,
            lat: node.lat,
            lng: node.lng,
            sensorId: sensor._id,
            sensorKey: sensor.name,
            sensorDisplayName: sensor.rawName || sensor.name,
            readings: sensorHistoryInDateRange,
            allSensorHistory: sensorHistoryAll,
            latestSensorValue:
              sensor.latestValue != null
                ? {
                    value: toNum(sensor.latestValue),
                    timestamp: sensor.latestTimestamp || null,
                    plotId: plot.id,
                    nodeId: node._id,
                    sensorId: sensor._id,
                  }
                : null,
          },
        ];
      })
    );
  }, [visiblePlots, selectedNodeType, selectedSensor, readingsBySensorId, historicalReadingsBySensorId]);

  const renderedPoints = useMemo(() => {
    const currentTs = frameTimestamps[frameIndex] || alignBangkokFrameStart(Date.now());
    const nextFrameTs =
      frameIndex < frameTimestamps.length - 1
        ? frameTimestamps[frameIndex + 1]
        : currentTs +
          (frameTimestamps.length > 1
            ? Math.max(1, frameTimestamps[1] - frameTimestamps[0])
            : FRAME_STEP_MINUTES * 60 * 1000);

    return activeSensorPoints
      .map((point) => {
        const smoothed = getSmoothedReadingForFrame(point, currentTs, nextFrameTs);

        let value = smoothed?.value ?? null;
        let ts = smoothed?.ts ?? null;
        let smoothMode = smoothed?.mode || "none";

        if (value == null && point?.latestSensorValue?.value != null) {
          value = toNum(point.latestSensorValue.value);
          ts = point.latestSensorValue.timestamp || null;
          smoothMode = "latest";
        }

        return {
          ...point,
          value,
          ts,
          smoothMode,
          status: getSensorStatus(selectedSensor, value),
          color: getHeatColor(selectedSensor, value),
        };
      })
      .filter((point) => point.value != null && !Number.isNaN(point.value));
  }, [activeSensorPoints, frameIndex, frameTimestamps, selectedSensor]);

  
const globalDisplayPoints = useMemo(() => {
  return [];
}, []);


  
const plotHeatFills = useMemo(() => {
  const map = {};

  for (const plot of visiblePlots) {
    if (!plot?.id || !Array.isArray(plot?.coords) || plot.coords.length < 3) continue;
    map[plot.id] = getPlotFillStats(plot, renderedPoints, selectedSensor);
  }

  return map;
}, [visiblePlots, renderedPoints, selectedSensor]);


  
const stats = useMemo(() => {
  const values = renderedPoints
    .map((point) => point.value)
    .filter((v) => v != null && !Number.isNaN(v));

  if (!values.length) {
    return {
      avg: null,
      min: null,
      max: null,
      count: 0,
      low: 0,
      normal: 0,
      high: 0,
    };
  }

  let low = 0;
  let normal = 0;
  let high = 0;

  values.forEach((v) => {
    const type = getSensorStatus(selectedSensor, v).type;
    if (type === "low") low += 1;
    else if (type === "high") high += 1;
    else if (type === "normal") normal += 1;
  });

  return {
    avg: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)),
    min: Number(Math.min(...values).toFixed(2)),
    max: Number(Math.max(...values).toFixed(2)),
    count: values.length,
    low,
    normal,
    high,
  };
}, [renderedPoints, selectedSensor]);


  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = setInterval(() => {
      setFrameIndex((prev) => {
        if (!frameCount) return 0;
        const next = prev >= frameCount - 1 ? 0 : prev + 1;

        if (!isGlobalSensor) return next;

        const nextKey = getCacheKeyForFrame(selectedSensor, frameTimestamps[next], selectedPlotId);
        if (globalCacheRef.current.has(nextKey)) {
          return next;
        }

        setGlobalProgress((old) => ({
          ...old,
          label: tt("loadingNextFrame"),
        }));
        return prev;
      });
    }, 1200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [playing, framesKey, frameCount, isGlobalSensor, selectedSensor, selectedPlotId, tt]);

  const sensorMeta = SENSOR_META[selectedSensor] || SENSOR_META.soil_moisture;

  const legendStops = useMemo(() => getLegendStops(selectedSensor), [selectedSensor]);

  const legendSensorItems = useMemo(() => {
    const currentTs = frameTimestamps[frameIndex] || alignBangkokFrameStart(Date.now());
    const nextFrameTs =
      frameIndex < frameTimestamps.length - 1
        ? frameTimestamps[frameIndex + 1]
        : currentTs + FRAME_STEP_MINUTES * 60 * 1000;

    const allowedKeys = getSensorOptionsByNodeType(selectedNodeType);

    return allowedKeys
      .map((sensorKey) => {
        const meta = SENSOR_META[sensorKey] || {};

        const pointsForSensor = visiblePlots.flatMap((plot) =>
          plot.nodes.flatMap((node) => {
            const nodeType = getNodeTypeFromNode(node);
            if (nodeType !== selectedNodeType) return [];

            const sensor = (node.sensors || []).find((s) => s.name === sensorKey);
            if (!sensor) return [];

            const sensorHistoryInDateRange = Array.isArray(readingsBySensorId[sensor._id])
              ? readingsBySensorId[sensor._id].filter((r) => {
                  return (
                    toText(r?.plotId) === toText(plot.id) &&
                    toText(r?.nodeId) === toText(node._id) &&
                    toText(r?.sensorId) === toText(sensor._id)
                  );
                })
              : [];

            return [
              {
                id: `${plot.id}-${node._id}-${sensor._id}`,
                plotId: plot.id,
                plotName: plot.name,
                nodeId: node._id,
                nodeName: node.nodeName,
                nodeUid: node.uid,
                nodeType,
                lat: node.lat,
                lng: node.lng,
                sensorId: sensor._id,
                sensorKey: sensor.name,
                sensorDisplayName: sensor.rawName || sensor.name,
                readings: sensorHistoryInDateRange,
                latestSensorValue:
                  sensor.latestValue != null
                    ? {
                        value: toNum(sensor.latestValue),
                        timestamp: sensor.latestTimestamp || null,
                      }
                    : null,
              },
            ];
          })
        );

        const candidates = pointsForSensor
          .map((point) => {
            const smoothed = getSmoothedReadingForFrame(point, currentTs, nextFrameTs);
            const value = smoothed?.value ?? point?.latestSensorValue?.value ?? null;
            const ts = smoothed?.ts ?? point?.latestSensorValue?.timestamp ?? null;
            const sortTs = new Date(ts || 0).getTime();

            return value != null && !Number.isNaN(value)
              ? {
                  ...point,
                  value,
                  ts,
                  sortTs: Number.isFinite(sortTs) ? sortTs : 0,
                }
              : null;
          })
          .filter(Boolean)
          .sort((a, b) => b.sortTs - a.sortTs);

        if (!candidates.length) return null;

        const values = candidates.map((item) => Number(item.value)).filter((v) => Number.isFinite(v));
        if (!values.length) return null;

        const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const ratio = Math.round(getSensorRatio(sensorKey, avgValue) * 100);
        const nodeCount = new Set(candidates.map((item) => item.nodeId)).size;
        const isAllPlots = selectedPlotId === "all";

        return {
          key: sensorKey,
          label: getLocalizedSensorLabel(sensorKey, uiLang),
          scoreText: `${ratio}/100`,
          rawText:
            minValue === maxValue
              ? `${formatLegendValue(avgValue)} ${meta.unit || ""}`.trim()
              : `${formatLegendValue(minValue)}–${formatLegendValue(maxValue)} ${meta.unit || ""}`.trim(),
          avgText: `${formatLegendValue(avgValue)} ${meta.unit || ""}`.trim(),
          color: getHeatColor(sensorKey, avgValue),
          active: selectedSensor === sensorKey,
          nodeCount,
          hideValues: isAllPlots,
        };
      })
      .filter(Boolean);
  }, [
    frameIndex,
    frameTimestamps,
    readingsBySensorId,
    selectedNodeType,
    selectedPlotId,
    selectedSensor,
    uiLang,
    visiblePlots,
  ]);


  useEffect(() => {
    if (!legendSensorItems.length) return;
    const exists = legendSensorItems.some((item) => item.key === selectedSensor);
    if (!exists) {
      setSelectedSensor(legendSensorItems[0].key);
    }
  }, [legendSensorItems, selectedSensor]);

  return (
    <DuwimsStaticPage current="heatmap">
      <div className="heat-page">
        <div className="top-grid">
          <div className="plot-card">
            <div className="top-label">{tt("selectPlot")}</div>
            <select
              className="plot-select"
              value={selectedPlotId}
              onChange={(e) => {
                setPlaying(false);
                setFrameIndex(frameTimestamps.length ? frameTimestamps.length - 1 : 0);
                setSelectedPlotId(e.target.value);
              }}
            >
              <option value="all">{tt("allPlots")}</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                </option>
              ))}
            </select>
          </div>


          <div className="plot-card">
            <div className="top-label">{tt("startDate")}</div>
            <input
              className="plot-select"
              type="date"
              value={startDate}
              onChange={(e) => {
                setPlaying(false);
                setFrameIndex(frameTimestamps.length ? frameTimestamps.length - 1 : 0);
                setStartDate(e.target.value);
              }}
            />
          </div>

          <div className="plot-card">
            <div className="top-label">{tt("endDate")}</div>
            <input
              className="plot-select"
              type="date"
              value={endDate}
              onChange={(e) => {
                setPlaying(false);
                setFrameIndex(frameTimestamps.length ? frameTimestamps.length - 1 : 0);
                setEndDate(e.target.value);
              }}
            />
          </div>
        </div>

        <div className="content-grid">
          <div className="map-side">
            <div className="map-wrap">
              {mounted ? (
                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={DEFAULT_ZOOM}
                  scrollWheelZoom
                  maxBounds={[
                    [THAILAND_BOUNDS.minLat, THAILAND_BOUNDS.minLng],
                    [THAILAND_BOUNDS.maxLat, THAILAND_BOUNDS.maxLng],
                  ]}
                  maxBoundsViscosity={1.0}
                  minZoom={5}
                  style={{ width: "100%", height: "100%" }}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    noWrap
                  />

                  <FitToSelection
                    polygons={visiblePlots}
                    selectedPlotId={selectedPlotId}
                    lockToWorld={false}
                  />

                  {visiblePlots.filter((plot) => plot.coords.length >= 3).map((plot) => {
                    const fillStat = plotHeatFills[plot.id] || null;
                    const hasFill = !!fillStat?.hasData;

                    return (
                      <Polygon
                        key={`plot-${plot.id}-${frameIndex}`}
                        positions={plot.coords.map((c) => [c.lat, c.lng])}
                        pathOptions={{
                          color: plot.id === selectedPlotId ? "#14532d" : "#166534",
                          weight: plot.id === selectedPlotId ? 4 : 3,
                          fill: true,
                          fillColor: hasFill ? fillStat.color : "#d1d5db",
                          fillOpacity: hasFill ? fillStat.opacity : 0.08,
                        }}
                      >
                        <Tooltip sticky>
                          <div style={{ minWidth: 180 }}>
                            <div style={{ fontWeight: 800 }}>{plot.name}</div>
                            {hasFill ? (
                              <>
                                <div>
                                  {getLocalizedSensorLabel(selectedSensor, uiLang)} เฉลี่ย:{" "}
                                  <b>{formatLegendValue(fillStat.avg)}</b> {sensorMeta.unit || ""}
                                </div>
                                <div>จำนวน node: {fillStat.count}</div>
                                <div>
                                  ช่วงค่า: {formatLegendValue(fillStat.min)} - {formatLegendValue(fillStat.max)} {sensorMeta.unit || ""}
                                </div>
                              </>
                            ) : (
                              <div>ไม่มีข้อมูลในช่วงเวลาที่เลือก</div>
                            )}
                          </div>
                        </Tooltip>
                      </Polygon>
                    );
                  })}

                  {allNodes.map((node) => {
                    const active = renderedPoints.find((point) => point.nodeId === node._id);

                    return (
                      <CircleMarker
                        key={`node-${node.plotId}-${node._id}`}
                        center={[node.lat, node.lng]}
                        radius={active ? 8 : 6}
                        pathOptions={{
                          color: active ? "#111827" : "#374151",
                          weight: 2,
                          fillColor: active ? "#ffffff" : "#d1d5db",
                          fillOpacity: active ? 1 : 0.85,
                        }}
                      >
                        <Popup>
                          <div style={{ minWidth: 220 }}>
                            <div style={{ fontWeight: 800, marginBottom: 6 }}>
                              {node.nodeName}
                            </div>
                            <div>{tt("plot")}: {node.plotName}</div>
                            <div>UID: {node.uid || "-"}</div>
                            <div>{tt("status")}: {node.status || "-"}</div>
                            <div style={{ marginTop: 8 }}>
                              {active ? (
                                <>
                                  <div>
                                    {getLocalizedSensorLabel(selectedSensor, uiLang)}:{" "}
                                    <b>{active.value}</b> {sensorMeta.unit}
                                  </div>
                                  <div>{tt("time")}: {formatDateTimeThai(active.ts)}</div>
                                  <div>ประเภท Node: {active.nodeType === "air" ? "Air Node" : "Soil Node"}</div>
                                  <div>{tt("status")}: {getLocalizedStatusLabel(active.status.type, uiLang)}</div>
                                </>
                              ) : (
                                <div>
                                  {isGlobalSensor ? tt("globalOverlayNote") : tt("noSensorForNode")}
                                </div>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              ) : (
                <div className="map-loading-placeholder">{tt("preparingMap")}</div>
              )}

              {!loading && !error && !!legendStops.length && (
                <div className="map-scale-overlay">
                  <div className="map-scale-steps">
                    {[...legendStops].reverse().map((stop) => (
                      <div
                        key={`map-scale-${selectedSensor}-${stop.ratio}`}
                        className="map-scale-step"
                        style={{
                          background: stop.color,
                          color: getContrastText(stop.color),
                        }}
                      >
                        <span className="map-scale-step-value">{stop.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="map-scale-range-note map-scale-range-note-overlay">
                    ช่วงอ้างอิง: {formatLegendValue(sensorMeta.min)} - {formatLegendValue(sensorMeta.max)} {sensorMeta.unit || ""}
                  </div>
                </div>
              )}

              {loading && (
                <div className="map-overlay loading-card">
                  <div className="loading-title">
                    {tt("loadingData")}
                  </div>
                  
                </div>
              )}

              {!loading && error && <div className="map-overlay error">{error}</div>}
              {!loading && !error && !!sensorReadingsNotice && (
                <div className="map-overlay">{sensorReadingsNotice}</div>
              )}

              {!loading &&
                !error &&
                !renderedPoints.length && (
                  <div className="map-overlay warn">{tt("noSensorDataSelectedRange")}</div>
                )}
            </div>

            <div className="timeline-card">
              <div className="timeline-top">
                <div>
                  <div className="top-label">{tt("currentTimeShown")}</div>
                  <div className="timeline-value">
                    {currentFrameTs ? formatDateTimeThai(currentFrameTs) : "-"}
                  </div>
                </div>

                <button
                  type="button"
                  className={`play-btn ${playing ? "pause" : ""}`}
                  onClick={() => setPlaying((v) => !v)}
                  disabled={frameTimestamps.length <= 1 || (isGlobalSensor && globalProgress.done < 2)}
                >
                  {playing ? tt("stop") : tt("play")}
                </button>
              </div>

              <input
                className="timeline-slider"
                type="range"
                min={0}
                max={Math.max(0, frameTimestamps.length - 1)}
                step={1}
                value={frameIndex}
                onChange={(e) => {
                  setPlaying(false);
                  setFrameIndex(Number(e.target.value));
                }}
              />

              <div className="timeline-bottom">
                <span>{formatDateThai(startDate)}</span>
                <span>{formatDateThai(endDate)}</span>
              </div>
            </div>
          </div>

          
<div className="side-panel">
  <div className="info-card legend-sensor-card">
    <div className="legend-header-block">
      <div className="legend-main-title">
        Legend ({getLocalizedSensorLabel(selectedSensor, uiLang)})
      </div>

      <div className="legend-node-type-wrap">
        <div className="top-label legend-top-label">ประเภท Node</div>
        <select
          className="plot-select legend-node-type-select"
          value={selectedNodeType}
          onChange={(e) => {
            setPlaying(false);
            setFrameIndex(frameTimestamps.length ? frameTimestamps.length - 1 : 0);
            setSelectedNodeType(e.target.value);
          }}
        >
          <option value="soil">Soil Node</option>
          <option value="air">Air Node</option>
        </select>
      </div>
    </div>

    <div className="legend-gradient-wrap">
      <div className="legend-gradient-bar" />
      <div className="legend-labels legend-labels-strong legend-labels-wide">
        <span>น้อย</span>
        <span>มาก</span>
      </div>
    </div>

    <div className="legend-sample-title">
      {selectedPlotId === "all" ? "รายการเซนเซอร์ที่มีในแปลง" : "จุดข้อมูลตัวอย่าง"}
    </div>

    <div className="legend-sensor-list">
      {legendSensorItems.length ? legendSensorItems.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`legend-sensor-item ${item.active ? "active" : ""}`}
          onClick={() => {
            setPlaying(false);
            setFrameIndex(frameTimestamps.length ? frameTimestamps.length - 1 : 0);
            setSelectedSensor(item.key);
          }}
        >
          <span
            className="legend-sensor-dot"
            style={{ background: item.color }}
          />
          <div className="legend-sensor-text">
            <div className="legend-sensor-row">
              <div className="legend-sensor-name">{item.label}</div>
              {item.nodeCount > 1 ? (
                <div className="legend-node-badge">{item.nodeCount} nodes</div>
              ) : (
                <div className="legend-node-badge">1 node</div>
              )}
            </div>
            {!item.hideValues && (
              <>
                <div className="legend-sensor-value">ความเข้ม: {item.scoreText}</div>
                <div className="legend-sensor-raw">{item.rawText}</div>
                <div className="legend-sensor-avg">เฉลี่ย {item.avgText}</div>
              </>
            )}
          </div>
        </button>
      )) : (
        <div className="empty-text">ไม่มีเซนเซอร์ตามประเภท node และแปลงที่เลือก</div>
      )}
    </div>
  </div>
</div>
        </div>

        <style jsx>{`
          .heat-page {
            display: grid;
            gap: 14px;
            padding: 14px;
            background: #f6faf6;
            min-height: calc(100vh - 80px);
          }

          .top-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .plot-card,
          .timeline-card,
          .info-card {
            background: #ffffff;
            border: 1px solid #dbe7dc;
            border-radius: 18px;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
            padding: 14px;
          }

          .top-label,
          .info-title {
            font-size: 12px;
            font-weight: 800;
            color: #166534;
            margin-bottom: 8px;
          }

          .plot-select {
            width: 100%;
            height: 44px;
            border-radius: 12px;
            border: 1px solid #cfe0d0;
            background: #fff;
            padding: 0 12px;
            font-size: 14px;
            outline: none;
          }

          .content-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.8fr) minmax(320px, 0.9fr);
            gap: 14px;
          }

          .map-side {
            display: grid;
            gap: 12px;
          }

          .map-wrap {
            position: relative;
            height: 72vh;
            min-height: 620px;
            overflow: hidden;
            border-radius: 24px;
            border: 1px solid #dbe7dc;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
            background: #eef7ee;
          }

          .map-loading-placeholder {
            display: grid;
            place-items: center;
            width: 100%;
            height: 100%;
            color: #166534;
            font-weight: 800;
            background: #eef7ee;
          }

          .map-overlay {
            position: absolute;
            top: 14px;
            left: 14px;
            z-index: 500;
            background: rgba(255, 255, 255, 0.96);
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 12px 14px;
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
          }

          .map-overlay.error {
            color: #b91c1c;
            border-color: #fecaca;
            background: rgba(254, 242, 242, 0.96);
          }

          .map-overlay.warn {
            color: #92400e;
            border-color: #fde68a;
            background: rgba(255, 251, 235, 0.96);
          }

          .loading-card {
            min-width: 240px;
          }

          .loading-title {
            font-weight: 800;
            margin-bottom: 4px;
          }

          .loading-sub {
            font-size: 12px;
            color: #475569;
            margin-bottom: 8px;
          }

          .loading-bar {
            width: 100%;
            height: 8px;
            overflow: hidden;
            border-radius: 999px;
            background: #e5e7eb;
          }

          .loading-bar span {
            display: block;
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(90deg, #fdbb84, #ef6548, #d7301f);
          }

          .timeline-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 10px;
          }

          .timeline-value {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
          }

          .timeline-slider {
            width: 100%;
          }

          .timeline-bottom {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 12px;
            color: #64748b;
            font-weight: 700;
          }

          .play-btn {
            border: none;
            border-radius: 12px;
            padding: 10px 16px;
            font-weight: 800;
            cursor: pointer;
            background: #16a34a;
            color: #fff;
          }

          .play-btn.pause {
            background: #dc2626;
          }

          .play-btn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .side-panel {
            display: grid;
            gap: 12px;
          }


.legend-sensor-card {
  background: #ffffff;
  border: 1px solid #dbe7dc;
  border-radius: 22px;
  padding: 18px;
}

.legend-main-title {
  font-size: 18px;
  font-weight: 800;
  color: #111827;
  margin-bottom: 0;
}

.legend-gradient-wrap {
  margin-bottom: 0;
}

.legend-gradient-bar {
  width: 100%;
  height: 16px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    #6e40aa 0%,
    #3b82f6 18%,
    #22c55e 40%,
    #fde047 60%,
    #fb923c 80%,
    #ef4444 100%
  );
}

.legend-labels.legend-labels-strong {
  margin-top: 8px;
  color: #111827;
  font-size: 14px;
  font-weight: 700;
}

.legend-sample-title {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  margin: 12px 0 8px;
}

.legend-sensor-list {
  display: grid;
  gap: 12px;
}

.legend-sensor-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  text-align: left;
  background: #ffffff;
  border: 1px solid #d9ebe5;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: 0.18s ease;
}


.legend-header-block {
  display: grid;
  gap: 16px;
  margin-bottom: 18px;
}

.legend-node-type-wrap {
  display: grid;
  gap: 10px;
}

.legend-top-label {
  margin-bottom: 0;
}

.legend-node-type-select {
  height: 46px;
}

.legend-labels-wide {
  margin-top: 12px;
}

.legend-sensor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.legend-node-badge {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 800;
  color: #166534;
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  padding: 4px 8px;
}

.legend-sensor-avg {
  font-size: 11px;
  color: #065f46;
  margin-top: 3px;
}

.legend-sensor-item:hover {
  border-color: #86efac;
  background: #f0fdf4;
}

.legend-sensor-item.active {
  border-color: #16a34a;
  background: #ecfdf5;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.10);
}

.legend-sensor-dot {
  width: 16px;
  height: 16px;
  min-width: 16px;
  border-radius: 999px;
  margin-top: 4px;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
}

.legend-sensor-text {
  min-width: 0;
}

.legend-sensor-name {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  line-height: 1.35;
}

.legend-sensor-value {
  font-size: 12px;
  color: #374151;
  margin-top: 2px;
}

.legend-sensor-raw {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
  word-break: break-word;
}

          .info-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 10px 0;
            border-bottom: 1px dashed #e5e7eb;
            font-size: 14px;
          }

          .info-row:last-child {
            border-bottom: none;
          }

          .legend-bar.heat {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            overflow: hidden;
            border-radius: 999px;
            height: 16px;
            margin-bottom: 8px;
          }

          .legend-bar span {
            display: block;
            height: 100%;
          }

          .legend-labels {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #475569;
            margin-bottom: 6px;
          }

          .legend-range {
            font-size: 13px;
            color: #334155;
            font-weight: 700;
          }

          .map-scale-overlay {
            position: absolute;
            top: 14px;
            right: 14px;
            z-index: 600;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 10px;
            pointer-events: none;
          }

          .map-scale-steps {
            width: 54px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.24);
            border: 1px solid rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(2px);
          }

          .map-scale-step {
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.2px;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
          }

          .map-scale-step + .map-scale-step {
            border-top: 1px solid rgba(255, 255, 255, 0.15);
          }

          .map-scale-step-value {
            line-height: 1;
          }

          .map-scale-range-note.map-scale-range-note-overlay {
            max-width: 180px;
            padding: 8px 10px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.9);
            color: #0f172a;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.35;
            text-align: right;
            box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
          }

          .status-grid {
            display: grid;
            gap: 8px;
          }

          .status-chip {
            border-radius: 12px;
            padding: 12px 14px;
            font-size: 14px;
            font-weight: 800;
          }

          .status-chip.low {
            background: #dbeafe;
            color: #1d4ed8;
          }

          .status-chip.normal {
            background: #dcfce7;
            color: #166534;
          }

          .status-chip.high {
            background: #fee2e2;
            color: #b91c1c;
          }

          .node-list {
            display: grid;
            gap: 10px;
            max-height: 360px;
            overflow: auto;
          }

          .node-item {
            background: #fafafa;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 12px;
          }

          .node-item-top {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
          }

          .node-dot {
            width: 12px;
            height: 12px;
            border-radius: 999px;
            display: inline-block;
          }

          .node-sub {
            font-size: 12px;
            color: #64748b;
          }

          .node-value {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            margin: 6px 0;
          }

          .empty-text {
            font-size: 14px;
            color: #64748b;
          }

          @media (max-width: 1100px) {
            .map-scale-overlay {
              top: 10px;
              right: 10px;
            }

            .map-scale-steps {
              width: 48px;
            }

            .map-scale-step {
              height: 32px;
              font-size: 11px;
            }

            .top-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .content-grid {
              grid-template-columns: 1fr;
            }

            .map-wrap {
              min-height: 520px;
              height: 60vh;
            }
          }

          @media (max-width: 720px) {
            .top-grid {
              grid-template-columns: 1fr;
            }

            .map-wrap {
              min-height: 420px;
              height: 52vh;
            }

            .timeline-top {
              flex-direction: column;
              align-items: flex-start;
            }
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}