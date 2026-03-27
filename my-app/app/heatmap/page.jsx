"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import DuwimsStaticPage from "../components/DuwimsStaticPage";
import "leaflet/dist/leaflet.css";

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
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false }
);

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function formatDateInput(date) {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateThai(date) {
  if (!date) return "-";
  const d = new Date(date);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543}`;
}

function formatDateTimeThai(date) {
  if (!date) return "-";
  const d = new Date(date);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function getApiBase() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
  }
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    window.__DUWIMS_API_BASE_URL__ ||
    "http://localhost:3001"
  );
}

function getAuthToken() {
  if (typeof window === "undefined") return "";
  const keys = [
    "AUTH_TOKEN_V1",
    "token",
    "authToken",
    "pmtool_token",
    "duwims_token",
  ];
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return "";
}

async function apiFetch(path, options = {}) {
  const base = getApiBase();
  const token = getAuthToken();

  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }

  return json;
}

function normalizeCoords(input) {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((pt) => {
        if (Array.isArray(pt) && pt.length >= 2) {
          const lat = num(pt[0]);
          const lng = num(pt[1]);
          if (lat !== null && lng !== null) return [lat, lng];
        }

        if (pt && typeof pt === "object") {
          const lat = num(pt.lat ?? pt.latitude);
          const lng = num(pt.lng ?? pt.lon ?? pt.longitude);
          if (lat !== null && lng !== null) return [lat, lng];
        }

        return null;
      })
      .filter(Boolean);
  }

  if (typeof input === "object") {
    return normalizeCoords(
      input.coords || input.coordinates || input.points || input.path || []
    );
  }

  return [];
}

function getPlotCoords(plot) {
  const candidates = [
    plot?.polygon,
    plot?.polygon?.coords,
    plot?.polygon?.coordinates,
    plot?.coords,
    plot?.coordinates,
    plot?.area,
    plot?.shape,
  ];

  for (const item of candidates) {
    const out = normalizeCoords(item);
    if (out.length >= 3) return out;
  }

  return [];
}

function getPlotId(plot, i) {
  return String(plot?.id || plot?._id || plot?.plotId || `plot-${i + 1}`);
}

function getPlotName(plot, i) {
  return plot?.plotName || plot?.name || plot?.alias || plot?.title || `แปลง ${i + 1}`;
}

function normalizeSensorType(type) {
  return String(type || "").trim().toLowerCase();
}

const SENSOR_META = {
  temp_rh_temp: {
    label: "Temperature",
    unit: "°C",
    min: 20,
    max: 35,
    legendLabels: ["20", "22", "24", "26", "28", "30", "32", "35+"],
    colors: [
      "#355CFF",
      "#2B82FF",
      "#30B7FF",
      "#36D6A2",
      "#92D645",
      "#E6D640",
      "#F3A63A",
      "#E56F3A",
      "#D95373",
      "#C04998",
      "#9A3BAF",
      "#75349D",
    ],
  },

  temp_rh_humidity: {
    label: "Humidity",
    unit: "%",
    min: 75,
    max: 85,
    legendLabels: ["75", "77", "79", "81", "83", "85+"],
    colors: [
      "#6A33BA",
      "#7F49D0",
      "#9963E2",
      "#B886F3",
      "#6CC7FF",
      "#35D6B4",
      "#7CD957",
      "#DDE24C",
      "#F2AF3D",
      "#E67546",
      "#D84C77",
    ],
  },

  soil_moisture: {
    label: "ความชื้นในดิน",
    unit: "%",
    min: 65,
    max: 80,
    legendLabels: ["65", "68", "71", "74", "77", "80+"],
    colors: [
      "#7A3DB8",
      "#8E52CD",
      "#A56AE2",
      "#6FBBFF",
      "#41D4C4",
      "#7DDA69",
      "#D8DD54",
      "#F1B34A",
      "#E77D4C",
      "#D8526E",
    ],
  },

  wind_speed: {
    label: "Wind Speed",
    unit: "m/s",
    min: 0.56,
    max: 1.39,
    legendLabels: ["0.56", "0.7", "0.85", "1.0", "1.2", "1.39+"],
    colors: [
      "#5443B8",
      "#396BEB",
      "#2D95FF",
      "#39C6FF",
      "#45D9B0",
      "#8CDA5D",
      "#D9D94F",
      "#F1B045",
      "#E67944",
      "#D65366",
    ],
  },

  light: {
    label: "Light",
    unit: "lux",
    min: 40000,
    max: 60000,
    legendLabels: ["40k", "44k", "48k", "52k", "56k", "60k+"],
    colors: [
      "#355CFF",
      "#2B82FF",
      "#2EB8FF",
      "#39D4C1",
      "#86D85D",
      "#DADB4F",
      "#F2BA45",
      "#F09439",
      "#E56E3C",
      "#D44E63",
      "#B94491",
    ],
  },

  rain: {
    label: "Rain",
    unit: "mm/day",
    min: 4,
    max: 8,
    legendLabels: ["4", "4.8", "5.6", "6.4", "7.2", "8+"],
    colors: [
      "#5A3FBC",
      "#4370E8",
      "#2D97FF",
      "#35C7FF",
      "#48D7AB",
      "#97D84F",
      "#D8D84B",
      "#F0B144",
      "#E97A3F",
      "#D65566",
    ],
  },

  n: {
    label: "N",
    unit: "%",
    min: 0.1,
    max: 1.0,
    legendLabels: ["0.1", "0.25", "0.4", "0.55", "0.7", "0.85", "1.0+"],
    colors: [
      "#4637A4",
      "#355CFF",
      "#2B82FF",
      "#36C0FF",
      "#44D7B4",
      "#73D96D",
      "#CFE055",
      "#F0B74C",
      "#E97C45",
      "#D75367",
    ],
  },

  p: {
    label: "P",
    unit: "ppm",
    min: 25,
    max: 45,
    legendLabels: ["25", "29", "33", "37", "41", "45+"],
    colors: [
      "#5F2FA8",
      "#6E46C2",
      "#3D71EB",
      "#2C99FF",
      "#38CFFF",
      "#4AD9AF",
      "#88D85C",
      "#DADA4A",
      "#F2B143",
      "#E67645",
      "#D34D72",
    ],
  },

  k: {
    label: "K",
    unit: "cmol/kg",
    min: 0.8,
    max: 1.4,
    legendLabels: ["0.8", "0.9", "1.0", "1.1", "1.2", "1.3", "1.4+"],
    colors: [
      "#5A34A4",
      "#3D5BE0",
      "#2E86FF",
      "#35BFFF",
      "#3FD5C0",
      "#78D96A",
      "#D3DE52",
      "#F2B248",
      "#E87B44",
      "#D75567",
    ],
  },

  water_level: {
    label: "การให้น้ำ / ความพร้อมใช้น้ำ",
    unit: "%",
    min: 50,
    max: 80,
    legendLabels: ["50", "56", "62", "68", "74", "80+"],
    colors: [
      "#5C38B0",
      "#3E63E2",
      "#2D8FFF",
      "#33C2FF",
      "#40D7C5",
      "#79DB66",
      "#D7DD4D",
      "#F0B246",
      "#E87B42",
      "#D44F6B",
    ],
  },
};

const SENSOR_KEYS = Object.keys(SENSOR_META);

function getColor(sensorKey, value) {
  const meta = SENSOR_META[sensorKey];
  if (!meta || value == null || Number.isNaN(value)) return "#CFD8DC";
  const t = clamp((value - meta.min) / (meta.max - meta.min || 1), 0, 0.999999);
  const idx = Math.floor(t * meta.colors.length);
  return meta.colors[Math.min(idx, meta.colors.length - 1)];
}

function getStatus(sensorKey, value) {
  const meta = SENSOR_META[sensorKey];
  if (!meta || value == null || Number.isNaN(value)) {
    return { type: "unknown", text: "ไม่มีข้อมูล" };
  }
  if (value < meta.min) {
    return { type: "low", text: `ต่ำกว่าปกติ (< ${meta.min} ${meta.unit})` };
  }
  if (value > meta.max) {
    return { type: "high", text: `สูงกว่าปกติ (> ${meta.max} ${meta.unit})` };
  }
  return { type: "normal", text: `ปกติ (${meta.min} - ${meta.max} ${meta.unit})` };
}

function extractValue(sensorKey, sensor, readingValue = null) {
  const st = normalizeSensorType(sensor?.sensorType);
  const raw =
    readingValue ?? sensor?.latestValue ?? sensor?.value ?? sensor?.lastReading?.value ?? null;

  if (sensorKey === "soil_moisture") {
    if (["soil_moisture", "soilmoisture", "moisture"].includes(st)) {
      return num(raw);
    }
  }

  if (sensorKey === "temp_rh_temp") {
    if (["temp_rh", "temperature_humidity", "temphumidity"].includes(st)) {
      if (raw && typeof raw === "object") {
        return num(raw.temperature ?? raw.temp ?? raw.t);
      }
    }
    if (["temp", "temperature"].includes(st)) return num(raw);
  }

  if (sensorKey === "temp_rh_humidity") {
    if (["temp_rh", "temperature_humidity", "temphumidity"].includes(st)) {
      if (raw && typeof raw === "object") {
        return num(raw.humidity ?? raw.rh ?? raw.h);
      }
    }
    if (["humidity", "rh"].includes(st)) return num(raw);
  }

  if (sensorKey === "wind_speed") {
    if (["wind_speed", "wind", "windspeed"].includes(st)) return num(raw);
  }

  if (sensorKey === "light") {
    if (["light", "lux", "light_sensor"].includes(st)) return num(raw);
  }

  if (sensorKey === "rain") {
    if (["rain", "rainfall", "rain_fall"].includes(st)) return num(raw);
  }

  if (sensorKey === "water_level") {
    if (["water_level", "waterlevel", "irrigation"].includes(st)) return num(raw);
  }

  if (["n", "p", "k"].includes(sensorKey)) {
    if (st === "npk") {
      if (raw && typeof raw === "object") {
        return num(raw[sensorKey.toUpperCase()] ?? raw[sensorKey]);
      }
    }
    if (st === sensorKey) return num(raw);
  }

  return null;
}

function pointInPolygon(point, polygon) {
  const x = point[1];
  const y = point[0];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1];
    const yi = polygon[i][0];
    const xj = polygon[j][1];
    const yj = polygon[j][0];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function getBounds(coords) {
  const lats = coords.map((c) => c[0]);
  const lngs = coords.map((c) => c[1]);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

function distance(aLat, aLng, bLat, bLng) {
  const dx = aLat - bLat;
  const dy = aLng - bLng;
  return Math.sqrt(dx * dx + dy * dy);
}

function interpolateValue(lat, lng, points) {
  if (!points.length) return null;
  if (points.length === 1) return points[0].value ?? null;

  let numerator = 0;
  let denominator = 0;

  for (const p of points) {
    if (p.value == null || Number.isNaN(p.value)) continue;
    const d = distance(lat, lng, p.lat, p.lng);
    if (d < 1e-7) return p.value;
    const w = 1 / Math.pow(d, 2);
    numerator += p.value * w;
    denominator += w;
  }

  if (!denominator) return null;
  return numerator / denominator;
}

function buildHeatCells(coords, points, density = 22) {
  if (!coords?.length || !points?.length) return [];

  const { minLat, maxLat, minLng, maxLng } = getBounds(coords);
  const latSpan = Math.max(0.0001, maxLat - minLat);
  const lngSpan = Math.max(0.0001, maxLng - minLng);

  const rows = density;
  const cols = density;
  const stepLat = latSpan / rows;
  const stepLng = lngSpan / cols;

  const cells = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellMinLat = minLat + r * stepLat;
      const cellMaxLat = cellMinLat + stepLat;
      const cellMinLng = minLng + c * stepLng;
      const cellMaxLng = cellMinLng + stepLng;

      const centerLat = cellMinLat + stepLat / 2;
      const centerLng = cellMinLng + stepLng / 2;

      if (!pointInPolygon([centerLat, centerLng], coords)) continue;

      const value = interpolateValue(centerLat, centerLng, points);

      cells.push({
        id: `${r}-${c}`,
        bounds: [
          [cellMinLat, cellMinLng],
          [cellMaxLat, cellMaxLng],
        ],
        value,
      });
    }
  }

  return cells;
}

function buildContourLines(coords, points, sensorKey, density = 12) {
  if (!coords?.length || !points?.length) return [];
  const meta = SENSOR_META[sensorKey];
  if (!meta) return [];

  const { minLat, maxLat, minLng, maxLng } = getBounds(coords);
  const latSpan = Math.max(0.0001, maxLat - minLat);
  const lngSpan = Math.max(0.0001, maxLng - minLng);
  const stepLat = latSpan / density;
  const stepLng = lngSpan / density;

  const lines = [];
  const levels = 5;

  for (let k = 1; k <= levels; k++) {
    const target = meta.min + ((meta.max - meta.min) * k) / (levels + 1);
    const segments = [];

    for (let r = 0; r < density; r++) {
      let current = [];
      for (let c = 0; c < density; c++) {
        const centerLat = minLat + r * stepLat + stepLat / 2;
        const centerLng = minLng + c * stepLng + stepLng / 2;
        if (!pointInPolygon([centerLat, centerLng], coords)) continue;

        const value = interpolateValue(centerLat, centerLng, points);
        if (value == null) continue;

        const tolerance = (meta.max - meta.min) / 12;
        if (Math.abs(value - target) <= tolerance) {
          current.push([centerLat, centerLng]);
        } else if (current.length > 1) {
          segments.push(current);
          current = [];
        } else {
          current = [];
        }
      }
      if (current.length > 1) segments.push(current);
    }

    segments.forEach((s, idx) => {
      lines.push({
        id: `level-${k}-${idx}`,
        points: s,
      });
    });
  }

  return lines;
}

function buildFrames(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [Date.now()];
  }

  if (end.getTime() <= start.getTime()) {
    return [start.getTime()];
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

  let stepMs = 24 * 60 * 60 * 1000;
  if (diffDays <= 2) stepMs = 2 * 60 * 60 * 1000;
  else if (diffDays <= 7) stepMs = 6 * 60 * 60 * 1000;
  else if (diffDays <= 31) stepMs = 24 * 60 * 60 * 1000;
  else stepMs = 3 * 24 * 60 * 60 * 1000;

  const out = [];
  for (let ts = start.getTime(); ts <= end.getTime(); ts += stepMs) {
    out.push(ts);
  }
  if (!out.length || out[out.length - 1] !== end.getTime()) {
    out.push(end.getTime());
  }
  return out;
}

function findClosestReadingAtTs(readings, ts) {
  if (!Array.isArray(readings) || !readings.length) return null;

  let best = null;
  let bestDiff = Infinity;

  for (const reading of readings) {
    const rts = new Date(reading.timestamp || reading.ts || reading.createdAt || 0).getTime();
    if (!Number.isFinite(rts)) continue;

    const diff = Math.abs(rts - ts);
    if (diff < bestDiff) {
      best = reading;
      bestDiff = diff;
    }
  }

  return best;
}

function FitToSelection({ polygons, selectedPlotId }) {
  const { useMap } = require("react-leaflet");
  const L = require("leaflet");
  const map = useMap();

  useEffect(() => {
    const targets =
      selectedPlotId === "all"
        ? polygons.filter((p) => p.coords.length >= 3)
        : polygons.filter((p) => p.id === selectedPlotId && p.coords.length >= 3);

    if (!targets.length) {
      map.setView([13.736717, 100.523186], 6);
      return;
    }

    const points = targets.flatMap((p) => p.coords);
    const bounds = L.latLngBounds(points);

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, polygons, selectedPlotId]);

  return null;
}

export default function Page() {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedPlotId, setSelectedPlotId] = useState("all");
  const [selectedSensor, setSelectedSensor] = useState("temp_rh_temp");

  const [startDate, setStartDate] = useState(() =>
    formatDateInput(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))
  );
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const timerRef = useRef(null);

  const frameTimestamps = useMemo(() => {
    return buildFrames(startDate, endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    if (frameIndex >= frameTimestamps.length) {
      setFrameIndex(0);
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

        const normalizedPlots = rawPlots.map((plot, i) => {
          const coords = getPlotCoords(plot);
          const nodes = Array.isArray(plot?.nodes) ? plot.nodes : [];

          return {
            id: getPlotId(plot, i),
            name: getPlotName(plot, i),
            coords,
            nodes: nodes.map((node, nodeIndex) => ({
              _id: String(node?._id || `node-${nodeIndex + 1}`),
              uid: String(node?.uid || ""),
              nodeName: node?.nodeName || node?.uid || `Node ${nodeIndex + 1}`,
              lat: num(node?.lat),
              lng: num(node?.lng),
              sensors: Array.isArray(node?.sensors)
                ? node.sensors.map((sensor, sensorIndex) => ({
                    _id: String(sensor?._id || `sensor-${sensorIndex + 1}`),
                    uid: String(sensor?.uid || ""),
                    name: sensor?.name || sensor?.sensorType || `Sensor ${sensorIndex + 1}`,
                    sensorType: sensor?.sensorType || sensor?.name || "",
                    latestValue: sensor?.latestValue ?? null,
                    latestTimestamp: sensor?.latestTimestamp ?? null,
                    raw: sensor,
                  }))
                : [],
            })),
          };
        });

        const readingsByPlot = {};

        await Promise.all(
          normalizedPlots.map(async (plot) => {
            try {
              const readingsJson = await apiFetch(
                `/api/sensor-readings?plotId=${encodeURIComponent(plot.id)}&limit=500`
              );
              readingsByPlot[plot.id] = Array.isArray(readingsJson?.items)
                ? readingsJson.items
                : [];
            } catch {
              readingsByPlot[plot.id] = [];
            }
          })
        );

        const finalPlots = normalizedPlots.map((plot) => {
          const plotReadings = readingsByPlot[plot.id] || [];
          const sensorPoints = [];

          plot.nodes.forEach((node) => {
            if (node.lat == null || node.lng == null) return;

            node.sensors.forEach((sensor) => {
              SENSOR_KEYS.forEach((sensorKey) => {
                const matchingReadings = plotReadings.filter(
                  (r) =>
                    String(r?.nodeId || "") === String(node._id) &&
                    String(r?.sensorId || "") === String(sensor._id)
                );

                const latestReading =
                  matchingReadings.length > 0
                    ? matchingReadings
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b?.timestamp || b?.createdAt || 0).getTime() -
                            new Date(a?.timestamp || a?.createdAt || 0).getTime()
                        )[0]
                    : null;

                const baseValue = extractValue(
                  sensorKey,
                  sensor.raw,
                  latestReading?.value ?? sensor.latestValue
                );

                if (baseValue == null) return;

                sensorPoints.push({
                  id: `${plot.id}-${node._id}-${sensor._id}-${sensorKey}`,
                  plotId: plot.id,
                  plotName: plot.name,
                  nodeId: node._id,
                  nodeName: node.nodeName,
                  sensorId: sensor._id,
                  sensorName: sensor.name,
                  sensorType: sensor.sensorType,
                  sensorKey,
                  lat: node.lat,
                  lng: node.lng,
                  baseValue,
                  readings: matchingReadings
                    .map((r) => ({
                      ...r,
                      value: extractValue(sensorKey, sensor.raw, r?.value),
                    }))
                    .filter((r) => r.value != null),
                });
              });
            });
          });

          return {
            ...plot,
            sensorPoints,
          };
        });

        if (!alive) return;
        setPlots(finalPlots.filter((plot) => plot.coords.length >= 3));
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

  const visiblePlots = useMemo(() => {
    if (selectedPlotId === "all") return plots;
    return plots.filter((plot) => plot.id === selectedPlotId);
  }, [plots, selectedPlotId]);

  const visiblePoints = useMemo(() => {
    return visiblePlots
      .flatMap((plot) => plot.sensorPoints || [])
      .filter((point) => point.sensorKey === selectedSensor);
  }, [visiblePlots, selectedSensor]);

  const renderedPoints = useMemo(() => {
    const currentTs = frameTimestamps[frameIndex] || Date.now();

    return visiblePoints.map((point) => {
      const reading = findClosestReadingAtTs(point.readings, currentTs);
      const value = reading?.value ?? point.baseValue ?? null;
      const status = getStatus(selectedSensor, value);

      return {
        ...point,
        value,
        ts: reading?.timestamp || reading?.createdAt || currentTs,
        status,
        color: getColor(selectedSensor, value),
      };
    });
  }, [visiblePoints, frameIndex, frameTimestamps, selectedSensor]);

  const renderedPlots = useMemo(() => {
    return visiblePlots.map((plot) => {
      const pointsForPlot = renderedPoints.filter((point) => point.plotId === plot.id);
      const density = selectedPlotId === "all" ? 14 : 22;

      const heatCells = buildHeatCells(
        plot.coords,
        pointsForPlot.map((point) => ({
          lat: point.lat,
          lng: point.lng,
          value: point.value,
        })),
        density
      );

      const contourLines = buildContourLines(
        plot.coords,
        pointsForPlot.map((point) => ({
          lat: point.lat,
          lng: point.lng,
          value: point.value,
        })),
        selectedSensor,
        selectedPlotId === "all" ? 8 : 12
      );

      return {
        ...plot,
        points: pointsForPlot,
        heatCells: heatCells.map((cell) => ({
          ...cell,
          color: getColor(selectedSensor, cell.value),
        })),
        contourLines,
      };
    });
  }, [visiblePlots, renderedPoints, selectedPlotId, selectedSensor]);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = setInterval(() => {
      setFrameIndex((prev) => (prev >= frameTimestamps.length - 1 ? 0 : prev + 1));
    }, 700);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [playing, frameTimestamps.length]);

  const sensorMeta = SENSOR_META[selectedSensor] || SENSOR_META.temp_rh_temp;
  const currentTs = frameTimestamps[frameIndex] || null;

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
      const type = getStatus(selectedSensor, v).type;
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

  const sensorOptions = useMemo(() => {
    return SENSOR_KEYS.map((key) => ({
      value: key,
      label: SENSOR_META[key]?.label || key,
      min: SENSOR_META[key]?.min,
      max: SENSOR_META[key]?.max,
      unit: SENSOR_META[key]?.unit,
      colors: SENSOR_META[key]?.colors || [],
      legendLabels: SENSOR_META[key]?.legendLabels || [],
    }));
  }, []);

  return (
    <DuwimsStaticPage current="heatmap">
      <div className="heat-page">
        <div className="plot-card">
          <div className="top-label">เลือกแปลง</div>

          <select
            className="plot-select"
            value={selectedPlotId}
            onChange={(e) => {
              setPlaying(false);
              setFrameIndex(0);
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

        <div className="content-grid">
          <div className="map-side">
            <div className="map-wrap">
              <MapContainer
                center={[13.736717, 100.523186]}
                zoom={6}
                scrollWheelZoom
                style={{ width: "100%", height: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitToSelection polygons={plots} selectedPlotId={selectedPlotId} />

                {renderedPlots.flatMap((plot) =>
                  plot.heatCells.map((cell) => (
                    <Rectangle
                      key={`${plot.id}-${cell.id}-${frameIndex}`}
                      bounds={cell.bounds}
                      pathOptions={{
                        stroke: false,
                        fillColor: cell.color,
                        fillOpacity: 0.74,
                      }}
                    />
                  ))
                )}

                {renderedPlots.flatMap((plot) =>
                  plot.contourLines.map((line) => (
                    <Polyline
                      key={`${plot.id}-${line.id}-${frameIndex}`}
                      positions={line.points}
                      pathOptions={{
                        color: "rgba(255,255,255,0.22)",
                        weight: 1,
                        opacity: 0.38,
                      }}
                    />
                  ))
                )}

                {renderedPlots.map((plot) => (
                  <Polygon
                    key={plot.id}
                    positions={plot.coords}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 1.4,
                      fillColor: "#ffffff",
                      fillOpacity: 0.02,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 220 }}>
                        <div style={{ fontWeight: 800, marginBottom: 8 }}>{plot.name}</div>
                        <div>เซนเซอร์: {sensorMeta.label}</div>
                        <div>จำนวนจุด: {plot.points.length}</div>
                        <div>เวลา: {currentTs ? formatDateTimeThai(currentTs) : "-"}</div>
                      </div>
                    </Popup>
                  </Polygon>
                ))}

                {renderedPoints.map((point) => (
                  <CircleMarker
                    key={`${point.id}-${frameIndex}`}
                    center={[point.lat, point.lng]}
                    radius={4}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 1.2,
                      fillColor: point.color,
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 240 }}>
                        <div style={{ fontWeight: 800, marginBottom: 8 }}>{point.sensorName}</div>
                        <div>แปลง: {point.plotName}</div>
                        <div>Node: {point.nodeName}</div>
                        <div>ชนิดเซนเซอร์: {sensorMeta.label}</div>
                        <div>
                          ค่า:{" "}
                          <strong>
                            {point.value != null ? `${point.value} ${sensorMeta.unit}` : "-"}
                          </strong>
                        </div>
                        <div>สถานะ: {point.status.text}</div>
                        <div>เวลา: {point.ts ? formatDateTimeThai(point.ts) : "-"}</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>

              {loading && <div className="floating-msg">กำลังโหลดข้อมูล...</div>}
              {!loading && error && <div className="floating-msg error">{error}</div>}
              {!loading && !error && !renderedPoints.length && (
                <div className="floating-msg warn">ไม่มีข้อมูลของเซนเซอร์นี้ในแปลงที่เลือก</div>
              )}

              <div className="player-overlay">
                <div className="date-row">
                  <div className="date-col">
                    <label>วันที่เริ่มต้น</label>
                    <div className="date-input-wrap">
                      <input
                        type="date"
                        className="date-input"
                        value={startDate}
                        onChange={(e) => {
                          setPlaying(false);
                          setFrameIndex(0);
                          setStartDate(e.target.value);
                        }}
                      />
                      <span className="date-icon">🗓️</span>
                    </div>
                  </div>

                  <div className="date-col">
                    <label>วันที่สิ้นสุด</label>
                    <div className="date-input-wrap">
                      <input
                        type="date"
                        className="date-input"
                        value={endDate}
                        onChange={(e) => {
                          setPlaying(false);
                          setFrameIndex(0);
                          setEndDate(e.target.value);
                        }}
                      />
                      <span className="date-icon">🗓️</span>
                    </div>
                  </div>
                </div>

                <div className="timeline-row">
                  <button
                    type="button"
                    className="play-btn"
                    onClick={() => setPlaying((v) => !v)}
                  >
                    {playing ? "❚❚" : "▶"}
                  </button>

                  <div className="timeline-main">
                    <div className="timeline-head">
                      <div className="timeline-date">{currentTs ? formatDateThai(currentTs) : "-"}</div>
                      <div className="timeline-datetime">
                        {currentTs ? formatDateTimeThai(currentTs) : "-"}
                      </div>
                    </div>

                    <input
                      type="range"
                      className="timeline-range"
                      min={0}
                      max={Math.max(0, frameTimestamps.length - 1)}
                      value={frameIndex}
                      onChange={(e) => {
                        setPlaying(false);
                        setFrameIndex(Number(e.target.value));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="legend-side">
            <div className="legend-card">
              <div className="legend-title">Legend ({sensorMeta.label})</div>

              <div className="legend-stack">
                {sensorMeta.colors
                  .slice()
                  .reverse()
                  .map((color, index) => {
                    const labels = sensorMeta.legendLabels || [];
                    const label = labels[labels.length - 1 - index] || "";
                    return (
                      <div key={`${color}-${index}`} className="legend-step">
                        <div className="legend-color" style={{ background: color }} />
                        <div className="legend-text">{label}</div>
                      </div>
                    );
                  })}
              </div>

              <div className="legend-subtitle">เลือกเซนเซอร์</div>

              <div className="sensor-list">
                {sensorOptions.map((sensor) => (
                  <button
                    key={sensor.value}
                    type="button"
                    className={`sensor-item ${
                      selectedSensor === sensor.value ? "active" : ""
                    }`}
                    onClick={() => {
                      setPlaying(false);
                      setFrameIndex(0);
                      setSelectedSensor(sensor.value);
                    }}
                  >
                    <span
                      className="sensor-dot"
                      style={{
                        background:
                          sensor.colors?.[Math.floor((sensor.colors.length - 1) / 2)] || "#b9b3ff",
                      }}
                    />
                    <div className="sensor-texts">
                      <div className="sensor-name">{sensor.label}</div>
                      <div className="sensor-sub">
                        MIN {sensor.min} / MAX {sensor.max} {sensor.unit}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-title">สรุปค่าปัจจุบัน</div>

              <div className="summary-grid">
                <div className="summary-box">
                  <span>ค่าเฉลี่ย</span>
                  <strong>
                    {stats.avg != null ? `${stats.avg} ${sensorMeta.unit}` : "-"}
                  </strong>
                </div>

                <div className="summary-box">
                  <span>ต่ำสุด</span>
                  <strong>
                    {stats.min != null ? `${stats.min} ${sensorMeta.unit}` : "-"}
                  </strong>
                </div>

                <div className="summary-box">
                  <span>สูงสุด</span>
                  <strong>
                    {stats.max != null ? `${stats.max} ${sensorMeta.unit}` : "-"}
                  </strong>
                </div>

                <div className="summary-box">
                  <span>จำนวนจุด</span>
                  <strong>{stats.count}</strong>
                </div>
              </div>

              <div className="status-list">
                <div className="status-pill low">
                  ต่ำ <strong>{stats.low}</strong>
                </div>
                <div className="status-pill normal">
                  ปกติ <strong>{stats.normal}</strong>
                </div>
                <div className="status-pill high">
                  สูง <strong>{stats.high}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .heat-page {
            width: 100%;
            padding: 10px 0 18px;
          }

          .plot-card {
            background: #cfe8e1;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 18px;
          }

          .top-label {
            font-size: 12px;
            color: #223531;
            margin-bottom: 8px;
          }

          .plot-select {
            width: 100%;
            height: 36px;
            border: 0;
            border-radius: 8px;
            background: #c7efe7;
            color: #223531;
            padding: 0 10px;
            font-size: 14px;
            outline: none;
          }

          .content-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 280px;
            gap: 14px;
            align-items: start;
          }

          .map-side,
          .legend-side {
            min-width: 0;
          }

          .map-wrap {
            position: relative;
            height: 505px;
            border-radius: 10px;
            overflow: hidden;
            background: #dbe8e4;
          }

          .floating-msg {
            position: absolute;
            top: 12px;
            left: 12px;
            z-index: 500;
            background: rgba(255, 255, 255, 0.96);
            color: #1f342f;
            border-radius: 10px;
            padding: 8px 10px;
            font-size: 12px;
            font-weight: 700;
          }

          .floating-msg.error {
            color: #b42318;
          }

          .floating-msg.warn {
            color: #8a5a00;
          }

          .player-overlay {
            position: absolute;
            left: 14px;
            right: 14px;
            bottom: 10px;
            z-index: 450;
            padding: 10px 12px;
            border-radius: 12px;
            background: linear-gradient(
              180deg,
              rgba(18, 23, 40, 0.06) 0%,
              rgba(18, 23, 40, 0.25) 34%,
              rgba(18, 23, 40, 0.56) 100%
            );
            backdrop-filter: blur(4px);
          }

          .date-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 10px;
          }

          .date-col label {
            display: block;
            color: #ffffff;
            font-size: 13px;
            margin-bottom: 6px;
          }

          .date-input-wrap {
            position: relative;
          }

          .date-input {
            width: 100%;
            height: 36px;
            border-radius: 10px;
            border: 0;
            outline: none;
            background: rgba(255, 255, 255, 0.96);
            color: #233833;
            padding: 0 34px 0 10px;
            font-size: 13px;
          }

          .date-icon {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            font-size: 16px;
          }

          .timeline-row {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .play-btn {
            width: 34px;
            height: 34px;
            border: 0;
            border-radius: 999px;
            background: #ffffff;
            color: #4367d9;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            flex: 0 0 34px;
          }

          .timeline-main {
            flex: 1;
            min-width: 0;
          }

          .timeline-head {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 6px;
          }

          .timeline-date {
            white-space: nowrap;
          }

          .timeline-datetime {
            text-align: right;
          }

          .timeline-range {
            width: 100%;
            accent-color: #ffffff;
          }

          .legend-card,
          .summary-card {
            background: #d8ece8;
            border-radius: 10px;
            padding: 14px;
          }

          .summary-card {
            margin-top: 12px;
          }

          .legend-title,
          .summary-title {
            font-size: 13px;
            font-weight: 700;
            color: #1d302b;
            margin-bottom: 8px;
          }

          .legend-stack {
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #cddfda;
            margin-bottom: 10px;
          }

          .legend-step {
            display: grid;
            grid-template-columns: 30px 1fr;
            align-items: center;
            min-height: 24px;
          }

          .legend-color {
            height: 100%;
            min-height: 24px;
          }

          .legend-text {
            padding: 0 8px;
            font-size: 11px;
            color: #243733;
            background: #f7faf9;
            height: 100%;
            display: flex;
            align-items: center;
          }

          .legend-subtitle {
            font-size: 11px;
            color: #60736e;
            margin-bottom: 8px;
          }

          .sensor-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .sensor-item {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 8px;
            text-align: left;
            border: 1px solid #d5e5e1;
            border-radius: 8px;
            background: #f5f8f7;
            padding: 7px 8px;
            cursor: pointer;
          }

          .sensor-item.active {
            border-color: #b5a8ff;
            background: #efebff;
          }

          .sensor-dot {
            width: 8px;
            height: 8px;
            border-radius: 999px;
            flex: 0 0 8px;
          }

          .sensor-texts {
            min-width: 0;
          }

          .sensor-name {
            font-size: 12px;
            color: #273934;
            font-weight: 700;
            line-height: 1.2;
          }

          .sensor-sub {
            font-size: 10px;
            color: #6d807b;
            margin-top: 2px;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 10px;
          }

          .summary-box {
            background: #f7faf9;
            border-radius: 8px;
            padding: 10px;
          }

          .summary-box span {
            display: block;
            font-size: 11px;
            color: #60736e;
            margin-bottom: 4px;
          }

          .summary-box strong {
            font-size: 13px;
            color: #20342f;
          }

          .status-list {
            display: grid;
            gap: 6px;
          }

          .status-pill {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 8px;
            padding: 8px 10px;
            font-size: 12px;
            font-weight: 700;
          }

          .status-pill.low {
            background: #fff0eb;
            color: #b54708;
          }

          .status-pill.normal {
            background: #ecfdf3;
            color: #027a48;
          }

          .status-pill.high {
            background: #fef3f2;
            color: #b42318;
          }

          :global(.leaflet-container) {
            width: 100%;
            height: 100%;
            font-family: inherit;
          }

          @media (max-width: 980px) {
            .content-grid {
              grid-template-columns: 1fr;
            }

            .map-wrap {
              height: 460px;
            }
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}