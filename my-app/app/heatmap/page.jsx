"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useMap } from "react-leaflet";
import DuwimsStaticPage from "../components/DuwimsStaticPage";

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
const GLOBAL_SENSORS = ["temp", "humidity", "wind_speed", "rain"];

const HEAT_COLORS = [
  "#fff7ec",
  "#fee8c8",
  "#fdd49e",
  "#fdbb84",
  "#fc8d59",
  "#ef6548",
  "#d7301f",
  "#990000",
];

const THAILAND_BOUNDS = {
  minLat: 5.5,
  maxLat: 20.7,
  minLng: 97.2,
  maxLng: 105.8,
};

const GLOBAL_GRID_STEP = 1.15;
const GLOBAL_BATCH_SIZE = 120;
const GLOBAL_MAX_PARALLEL_PRELOAD = 1;

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

const FRAME_STEP_HOURS = 6;
const MAX_FRAMES = 6;
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
  const hour = bangkokDate.getUTCHours();
  const alignedHour = Math.floor(hour / FRAME_STEP_HOURS) * FRAME_STEP_HOURS;

  bangkokDate.setUTCHours(alignedHour, 0, 0, 0);
  return bangkokDate.getTime() - BANGKOK_UTC_OFFSET_MS;
}

function buildFrames(startDate, endDate) {
  const start = parseBangkokDate(startDate, false);
  const end = parseBangkokDate(endDate, true);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [alignBangkokFrameStart(Date.now())];
  }

  const stepMs = FRAME_STEP_HOURS * 60 * 60 * 1000;
  const frames = [];

  let cursor = alignBangkokFrameStart(start);
  while (cursor <= end.getTime()) {
    frames.push(cursor);
    cursor += stepMs;
  }

  if (!frames.length) {
    frames.push(alignBangkokFrameStart(start));
  }

  while (frames.length < MAX_FRAMES) {
    frames.push(frames[frames.length - 1] + stepMs);
  }

  return frames.slice(0, MAX_FRAMES);
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

function buildLocalHeatCells(plots, points, sensorKey, density = 48) {
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
      const opacityBase = 0.18 + (1 - clamp(nearestDistance / 0.03, 0, 1)) * 0.58;

      cells.push({
        id: `${row}-${col}`,
        bounds: [
          [minLat, minLng],
          [maxLat, maxLng],
        ],
        value,
        ratio,
        color: getHeatColorByRatio(ratio),
        opacity: clamp(opacityBase, 0.16, 0.82),
      });
    }
  }

  return cells;
}

function buildWorldGrid(step = GLOBAL_GRID_STEP) {
  const out = [];
  for (let lat = THAILAND_BOUNDS.minLat; lat <= THAILAND_BOUNDS.maxLat; lat += step) {
    for (let lng = THAILAND_BOUNDS.minLng; lng <= THAILAND_BOUNDS.maxLng; lng += step) {
      out.push({
        lat: Number(lat.toFixed(4)),
        lng: Number(lng.toFixed(4)),
      });
    }
  }
  return out;
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

  let idx = times.indexOf(targetIsoHour);
  if (idx >= 0) return toNum(series[idx]);

  let bestIdx = -1;
  let bestDiff = Infinity;
  const target = new Date(`${targetIsoHour}:00Z`).getTime();

  for (let i = 0; i < times.length; i += 1) {
    const t = new Date(`${times[i]}:00Z`).getTime();
    if (!Number.isFinite(t)) continue;
    const diff = Math.abs(t - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  return bestIdx >= 0 ? toNum(series[bestIdx]) : null;
}

async function fetchOpenMeteoGrid(sensorKey, ts) {
  const variable = getOpenMeteoVariable(sensorKey);
  if (!variable) return [];

  const targetTs = new Date(ts).getTime();
  const now = Date.now();
  const useArchive = targetTs < now - 36 * 60 * 60 * 1000;

  const grid = buildWorldGrid();
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

      return { lat, lng, value };
    })
    .filter(Boolean);
}

function buildGlobalClimateCells(points, sensorKey, step = GLOBAL_GRID_STEP) {
  if (!points.length) return [];

  return points.map((p, idx) => {
    const ratio = getSensorRatio(sensorKey, p.value);
    return {
      id: `global-${idx}`,
      bounds: [
        [p.lat - step / 2, p.lng - step / 2],
        [p.lat + step / 2, p.lng + step / 2],
      ],
      value: p.value,
      color: getHeatColorByRatio(ratio),
      opacity: 0.68,
    };
  });
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


function getCacheKeyForFrame(sensorKey, ts) {
  return `${sensorKey}-${toIsoHour(ts)}`;
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
  const isGlobalSensor = GLOBAL_SENSORS.includes(selectedSensor);
  const currentFrameTs = frameTimestamps[frameIndex] || Date.now();

  useEffect(() => {
    if (!frameTimestamps.length) return;
    if (frameIndex >= frameTimestamps.length) {
      setFrameIndex(frameTimestamps.length - 1);
    }
  }, [frameIndex, frameTimestamps.length]);

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
          setSensorReadingsNotice("ยังไม่มี /api/sensor-readings จึงไม่แสดงค่าบน heatmap");
        } else if (endpointFailures > 0 && !flattenedReadings.length) {
          setSensorReadingsNotice("โหลด sensor readings บางส่วนไม่สำเร็จ จะแสดงเฉพาะค่าที่โหลดได้");
        } else {
          setSensorReadingsNotice("");
        }
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
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
    if (!isGlobalSensor) {
      setGlobalPoints([]);
      setGlobalError("");
      setGlobalLoading(false);
      setGlobalProgress({ done: 0, total: 0, label: "" });
      preloadQueueRef.current = [];
      preloadActiveRef.current = false;
      globalInflightRef.current = "";
      return;
    }

    let alive = true;
    const currentCacheKey = getCacheKeyForFrame(selectedSensor, currentFrameTs);
    const priorityIndexes = buildPriorityFrameIndexes(frameTimestamps, currentFrameTs);
    const total = priorityIndexes.length || 1;

    async function loadCurrentAndQueue() {
      setGlobalError("");
      setGlobalProgress({ done: 0, total, label: "กำลังโหลดข้อมูลวันนี้..." });

      const cachedCountInitial = priorityIndexes.filter((idx) =>
        globalCacheRef.current.has(getCacheKeyForFrame(selectedSensor, frameTimestamps[idx]))
      ).length;

      if (globalCacheRef.current.has(currentCacheKey)) {
        setGlobalPoints(globalCacheRef.current.get(currentCacheKey));
        setGlobalProgress({
          done: cachedCountInitial,
          total,
          label: cachedCountInitial >= total ? "ข้อมูลพร้อมแสดงแล้ว" : "พร้อมแสดงผลแล้ว",
        });
      } else {
        const now = Date.now();
        if (now < globalBackoffUntilRef.current) {
          const waitSec = Math.max(1, Math.ceil((globalBackoffUntilRef.current - now) / 1000));
          setGlobalError(`กำลังพักการเรียก Global Climate ชั่วคราว ${waitSec} วินาที`);
        } else {
          try {
            globalInflightRef.current = currentCacheKey;
            setGlobalLoading(true);
            const pts = await fetchOpenMeteoGrid(selectedSensor, currentFrameTs);
            if (!alive) return;
            globalCacheRef.current.set(currentCacheKey, pts);
            setGlobalPoints(pts);
            const cachedCountAfter = priorityIndexes.filter((idx) =>
              globalCacheRef.current.has(getCacheKeyForFrame(selectedSensor, frameTimestamps[idx]))
            ).length;
            setGlobalProgress({
              done: cachedCountAfter,
              total,
              label: cachedCountAfter >= total ? "ข้อมูลพร้อมแสดงแล้ว" : "พร้อมแสดงผลแล้ว",
            });
          } catch (e) {
            if (!alive) return;
            const message = String(e?.message || "");
            if (message.includes("(429)")) {
              globalBackoffUntilRef.current = Date.now() + 60000;
              setGlobalError("Open-Meteo ใช้งานเกิน limit ชั่วคราว กรุณารอสักครู่");
            } else {
              setGlobalError(message || "โหลดข้อมูล Global Climate ไม่สำเร็จ");
            }
          } finally {
            if (alive) setGlobalLoading(false);
            if (globalInflightRef.current === currentCacheKey) {
              globalInflightRef.current = "";
            }
          }
        }
      }

      preloadQueueRef.current = priorityIndexes
        .map((idx) => ({ idx, key: getCacheKeyForFrame(selectedSensor, frameTimestamps[idx]), ts: frameTimestamps[idx] }))
        .filter((item) => item.key !== currentCacheKey && !globalCacheRef.current.has(item.key));

      async function runPreload() {
        if (preloadActiveRef.current || !preloadQueueRef.current.length) return;
        preloadActiveRef.current = true;

        while (alive && preloadQueueRef.current.length) {
          const item = preloadQueueRef.current.shift();
          if (!item || globalCacheRef.current.has(item.key)) continue;

          const now = Date.now();
          if (now < globalBackoffUntilRef.current) break;

          try {
            await fetchOpenMeteoGrid(selectedSensor, item.ts).then((pts) => {
              globalCacheRef.current.set(item.key, pts);
            });
          } catch (e) {
            const message = String(e?.message || "");
            if (message.includes("(429)")) {
              globalBackoffUntilRef.current = Date.now() + 60000;
              break;
            }
          }

          if (!alive) break;
          const done = priorityIndexes.filter((idx) =>
            globalCacheRef.current.has(getCacheKeyForFrame(selectedSensor, frameTimestamps[idx]))
          ).length;

          setGlobalProgress({
            done,
            total,
            label: done >= total ? "คลิปพร้อมเล่น" : `กำลังเตรียมคลิป ${done}/${total}`,
          });

          await new Promise((resolve) => setTimeout(resolve, 350));
        }

        preloadActiveRef.current = false;
      }

      runPreload();
    }

    loadCurrentAndQueue();

    return () => {
      alive = false;
      if (globalInflightRef.current === currentCacheKey) {
        globalInflightRef.current = "";
      }
    };
  }, [isGlobalSensor, selectedSensor, currentFrameTs, frameTimestamps]);

  const visiblePlots = useMemo(() => {
    if (selectedPlotId === "all") return plots;
    return plots.filter((plot) => plot.id === selectedPlotId);
  }, [plots, selectedPlotId]);

  const historicalReadingsBySensorId = useMemo(() => {
    const grouped = {};

    (Array.isArray(allReadings) ? allReadings : []).forEach((r) => {
      const sensorId = toText(r?.sensorId);
      const sensorName = normalizeSensorName(r?.sensorName || r?.sensorType || r?.name);
      const ts = new Date(r?.timestamp || r?.ts || r?.createdAt || 0).getTime();

      if (!sensorId || !Number.isFinite(ts)) return;
      if (sensorName && sensorName !== selectedSensor) return;

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
  }, [allReadings, selectedSensor]);

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
      plot.nodes.map((node) => ({
        ...node,
        plotId: plot.id,
        plotName: plot.name,
      }))
    );
  }, [visiblePlots]);

  const activeSensorPoints = useMemo(() => {
  return visiblePlots.flatMap((plot) =>
    plot.nodes.flatMap((node) => {
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
}, [visiblePlots, selectedSensor, readingsBySensorId, historicalReadingsBySensorId]);

  const renderedPoints = useMemo(() => {
  const currentTs = frameTimestamps[frameIndex] || alignBangkokFrameStart(Date.now());
  const nextFrameTs =
    frameIndex < frameTimestamps.length - 1
      ? frameTimestamps[frameIndex + 1]
      : currentTs +
        (frameTimestamps.length > 1
          ? Math.max(1, frameTimestamps[1] - frameTimestamps[0])
          : FRAME_STEP_HOURS * 60 * 60 * 1000);

  const nowFrameStart = alignBangkokFrameStart(Date.now());

  return activeSensorPoints
    .map((point) => {
      // 1) หา reading ในเฟรมนี้ก่อน
      const readingInFrame = findLatestReadingInWindow(
        point.readings,
        currentTs,
        nextFrameTs
      );

      // 2) latest ปัจจุบันจาก plot
      const latestSensorValue = point.latestSensorValue;
      const latestSensorTs = latestSensorValue?.timestamp
        ? new Date(latestSensorValue.timestamp).getTime()
        : NaN;

      // 3) หา reading ล่าสุดสุดจาก history ทั้งหมดของ sensor เดิม
      let latestHistory = null;
      let latestHistoryTs = -Infinity;

      for (const r of point.allSensorHistory || []) {
        const ts = getReadingTs(r);
        if (!Number.isFinite(ts)) continue;
        if (ts > latestHistoryTs) {
          latestHistory = r;
          latestHistoryTs = ts;
        }
      }

      let chosen = null;

      // ✅ ถ้าในเฟรมมี reading ให้ใช้ reading ก่อน
      if (readingInFrame) {
        chosen = readingInFrame;
      } else {
        // ✅ ถ้าเฟรมนี้ "เลยช่วง reading ล่าสุดมาแล้ว"
        // และเป็นเฟรมปัจจุบัน/อนาคต -> ใช้ latestValue จาก plot
        const frameIsCurrentOrAfter = currentTs >= nowFrameStart;
        const historyEndedBeforeThisFrame =
          !Number.isFinite(latestHistoryTs) || latestHistoryTs < currentTs;

        if (
          latestSensorValue &&
          Number.isFinite(latestSensorTs) &&
          frameIsCurrentOrAfter &&
          historyEndedBeforeThisFrame
        ) {
          chosen = latestSensorValue;
        }
      }

      const value = chosen?.value ?? null;
      const ts = chosen?.timestamp || chosen?.ts || chosen?.createdAt || null;

      console.log("📍 POINT PICKED:", {
        plotId: point.plotId,
        nodeId: point.nodeId,
        sensorId: point.sensorId,
        frameStart: new Date(currentTs).toISOString(),
        frameEnd: new Date(nextFrameTs).toISOString(),
        readingInFrame,
        latestHistory,
        latestSensorValue,
        chosen,
        value,
        ts,
      });

      return {
        ...point,
        value,
        ts,
        status: getSensorStatus(selectedSensor, value),
        color: getHeatColor(selectedSensor, value),
      };
    })
    .filter((point) => point.value != null && !Number.isNaN(point.value));
}, [activeSensorPoints, frameIndex, frameTimestamps, selectedSensor]);

  const heatCells = useMemo(() => {
    if (isGlobalSensor) {
      return buildGlobalClimateCells(globalPoints, selectedSensor);
    }

    const density = selectedPlotId === "all" ? 48 : 60;
    return buildLocalHeatCells(visiblePlots, renderedPoints, selectedSensor, density);
  }, [isGlobalSensor, globalPoints, selectedSensor, selectedPlotId, visiblePlots, renderedPoints]);

  const stats = useMemo(() => {
    const source = isGlobalSensor ? globalPoints : renderedPoints;
    const values = source
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
  }, [isGlobalSensor, globalPoints, renderedPoints, selectedSensor]);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = setInterval(() => {
      setFrameIndex((prev) => {
        if (!frameTimestamps.length) return 0;
        const next = prev >= frameTimestamps.length - 1 ? 0 : prev + 1;

        if (!isGlobalSensor) return next;

        const nextKey = getCacheKeyForFrame(selectedSensor, frameTimestamps[next]);
        if (globalCacheRef.current.has(nextKey)) {
          return next;
        }

        setGlobalProgress((old) => ({
          ...old,
          label: "กำลังโหลดเฟรมถัดไป...",
        }));
        return prev;
      });
    }, 2200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [playing, frameTimestamps, isGlobalSensor, selectedSensor]);

  const sensorMeta = SENSOR_META[selectedSensor] || SENSOR_META.soil_moisture;

  return (
    <DuwimsStaticPage current="heatmap">
      <div className="heat-page">
        <div className="top-grid">
          <div className="plot-card">
            <div className="top-label">เลือกแปลง</div>
            <select
              className="plot-select"
              value={selectedPlotId}
              onChange={(e) => {
                setPlaying(false);
                setFrameIndex(frameTimestamps.length ? frameTimestamps.length - 1 : 0);
                setSelectedPlotId(e.target.value);
              }}
            >
              <option value="all">ทุกแปลง</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                </option>
              ))}
            </select>
          </div>

          <div className="plot-card">
            <div className="top-label">ชนิดเซนเซอร์</div>
            <select
              className="plot-select"
              value={selectedSensor}
              onChange={(e) => {
                setPlaying(false);
                setFrameIndex(frameTimestamps.length ? frameTimestamps.length - 1 : 0);
                setSelectedSensor(e.target.value);
              }}
            >
              {SENSOR_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SENSOR_META[key].labelTh} {SENSOR_META[key].labelEn}
                </option>
              ))}
            </select>
          </div>

          <div className="plot-card">
            <div className="top-label">วันที่เริ่ม</div>
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
            <div className="top-label">วันที่สิ้นสุด</div>
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
                    polygons={plots}
                    selectedPlotId={selectedPlotId}
                    lockToWorld
                  />

                  {heatCells.map((cell) => (
                    <Rectangle
                      key={`heat-${cell.id}-${frameIndex}`}
                      bounds={cell.bounds}
                      pathOptions={{
                        stroke: false,
                        fillColor: cell.color,
                        fillOpacity: cell.opacity,
                      }}
                    />
                  ))}

                  {plots.filter((plot) => plot.coords.length >= 3).map((plot) => (
                    <Polygon
                      key={`plot-${plot.id}`}
                      positions={plot.coords.map((c) => [c.lat, c.lng])}
                      pathOptions={{
                        color: plot.id === selectedPlotId ? "#166534" : "#14532d",
                        weight: plot.id === selectedPlotId ? 4 : 3,
                        fillColor: "#166534",
                        fillOpacity:
                          selectedPlotId === "all"
                            ? 0.03
                            : plot.id === selectedPlotId
                            ? 0.08
                            : 0.03,
                      }}
                    >
                      <Tooltip sticky>{plot.name}</Tooltip>
                    </Polygon>
                  ))}

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
                            <div>แปลง: {node.plotName}</div>
                            <div>UID: {node.uid || "-"}</div>
                            <div>สถานะ: {node.status || "-"}</div>
                            <div style={{ marginTop: 8 }}>
                              {active ? (
                                <>
                                  <div>
                                    {sensorMeta.labelTh} {sensorMeta.labelEn}:{" "}
                                    <b>{active.value}</b> {sensorMeta.unit}
                                  </div>
                                  <div>เวลา: {formatDateTimeThai(active.ts)}</div>
                                  <div>สถานะ: {active.status.label}</div>
                                </>
                              ) : (
                                <div>
                                  {isGlobalSensor
                                    ? "Global Climate แสดงบนแผนที่ทั้งโลก ส่วน node เป็น overlay"
                                    : "ไม่มีข้อมูลของเซนเซอร์ที่เลือกใน node นี้"}
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
                <div className="map-loading-placeholder">กำลังเตรียมแผนที่...</div>
              )}

              {(loading || globalLoading || (isGlobalSensor && globalProgress.total > 0 && globalProgress.done < globalProgress.total)) && (
                <div className="map-overlay loading-card">
                  <div className="loading-title">
                    {loading ? "กำลังโหลดข้อมูล..." : globalProgress.label || "กำลังโหลด Global Climate..."}
                  </div>
                  {!loading && isGlobalSensor && globalProgress.total > 0 && (
                    <>
                      <div className="loading-sub">
                        โหลดแล้ว {globalProgress.done}/{globalProgress.total}
                      </div>
                      <div className="loading-bar">
                        <span
                          style={{
                            width: `${Math.max(6, Math.round((globalProgress.done / globalProgress.total) * 100))}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {!loading && error && <div className="map-overlay error">{error}</div>}

              {!loading && !error && !!globalError && (
                <div className="map-overlay error">{globalError}</div>
              )}
              {!loading && !error && !globalError && !!sensorReadingsNotice && !isGlobalSensor && (
                <div className="map-overlay">{sensorReadingsNotice}</div>
              )}

              {!loading && !error && !globalError && isGlobalSensor && !globalPoints.length && (
                <div className="map-overlay warn">ไม่มีข้อมูล Global Climate สำหรับช่วงเวลานี้</div>
              )}

              {!loading &&
                !error &&
                !isGlobalSensor &&
                !renderedPoints.length && (
                  <div className="map-overlay warn">ไม่มีข้อมูลเซนเซอร์ในช่วงเวลาที่เลือก</div>
                )}
            </div>

            <div className="timeline-card">
              <div className="timeline-top">
                <div>
                  <div className="top-label">เวลาที่กำลังแสดง</div>
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
                  {playing ? "หยุด" : "เล่น"}
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
            <div className="info-card">
              <div className="info-title">สรุป Heatmap</div>
              <div className="info-row">
                <span>เซนเซอร์</span>
                <strong>
                  {sensorMeta.labelTh} {sensorMeta.labelEn}
                </strong>
              </div>
              <div className="info-row">
                <span>โหมดข้อมูล</span>
                <strong>{isGlobalSensor ? "Thailand Climate" : "Local Sensor"}</strong>
              </div>
              {isGlobalSensor && (
                <div className="info-row">
                  <span>สถานะคลิป</span>
                  <strong>{globalProgress.label || "พร้อมแสดงผลแล้ว"}</strong>
                </div>
              )}
              <div className="info-row">
                <span>จำนวนจุดที่ใช้</span>
                <strong>{stats.count}</strong>
              </div>
              <div className="info-row">
                <span>ค่าเฉลี่ย</span>
                <strong>{stats.avg != null ? `${stats.avg} ${sensorMeta.unit}` : "-"}</strong>
              </div>
              <div className="info-row">
                <span>ค่าต่ำสุด</span>
                <strong>{stats.min != null ? `${stats.min} ${sensorMeta.unit}` : "-"}</strong>
              </div>
              <div className="info-row">
                <span>ค่าสูงสุด</span>
                <strong>{stats.max != null ? `${stats.max} ${sensorMeta.unit}` : "-"}</strong>
              </div>
            </div>

            <div className="info-card">
              <div className="info-title">Legend</div>
              <div className="legend-bar heat">
                {HEAT_COLORS.map((color, i) => (
                  <span key={`${color}-${i}`} style={{ background: color }} />
                ))}
              </div>
              <div className="legend-labels">
                <span>ต่ำ</span>
                <span>สูง</span>
              </div>
              <div className="legend-range">
                ช่วงอ้างอิง: {sensorMeta.min} - {sensorMeta.max} {sensorMeta.unit}
              </div>
            </div>

            <div className="info-card">
              <div className="info-title">สถานะค่า</div>
              <div className="status-grid">
                <div className="status-chip low">ต่ำ: {stats.low}</div>
                <div className="status-chip normal">ปกติ: {stats.normal}</div>
                <div className="status-chip high">สูง: {stats.high}</div>
              </div>
            </div>

            <div className="info-card">
              <div className="info-title">Node ที่ใช้คำนวณ (อิง reading ย้อนหลังตามเฟรม)</div>
              <div className="node-list">
                {renderedPoints.length ? (
                  renderedPoints.map((point) => (
                    <div className="node-item" key={point.id}>
                      <div className="node-item-top">
                        <span className="node-dot" style={{ background: point.color }} />
                        <strong>{point.nodeName}</strong>
                      </div>
                      <div className="node-sub">{point.plotName}</div>
                      <div className="node-value">
                        {point.value} {sensorMeta.unit}
                      </div>
                      <div className="node-sub">{formatDateTimeThai(point.ts)}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-text">
                    {isGlobalSensor
                      ? "โหมด Climate ใช้ Thailand grid ส่วน node ยังแสดงเป็น overlay"
                      : "ยังไม่มี reading ของเซนเซอร์นี้ในช่วงเฟรมที่เลือก"}
                  </div>
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
            grid-template-columns: repeat(4, minmax(0, 1fr));
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
            padding: 10px 12px;
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

          .status-grid {
            display: grid;
            gap: 8px;
          }

          .status-chip {
            border-radius: 12px;
            padding: 10px 12px;
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