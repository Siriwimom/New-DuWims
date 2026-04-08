"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DuwimsStaticPage from "../components/DuwimsStaticPage";
import { useDuwimsT } from "../components/language-context";

const AUTH_KEYS = [
  "AUTH_TOKEN_V1",
  "token",
  "authToken",
  "pmtool_token",
  "duwims_token",
];

const SENSOR_OPTIONS = [
  { key: "temp", labelKey: "temperature", unit: "°C" },
  { key: "rh", labelKey: "relativeHumidity", unit: "%" },
  { key: "wind", labelKey: "windSpeed", unit: "m/s" },
  { key: "light", labelKey: "lightIntensity", unit: "lux" },
  { key: "rain", labelKey: "rainfall", unit: "mm" },
  { key: "soil", labelKey: "soilMoisture", unit: "%" },
  { key: "water", labelKey: "waterAvailability", unit: "%" },
  { key: "n", labelKey: null, unit: "%" },
  { key: "p", labelKey: null, unit: "ppm" },
  { key: "k", labelKey: null, unit: "cmol/kg" },
];

function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001").replace(/\/+$/, "");
}

function getToken() {
  if (typeof window === "undefined") return "";
  for (const key of AUTH_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }
  return "";
}

function getId(obj) {
  return obj?._id || obj?.id || obj?.uid || "";
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function toNum(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatDateInput(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatThaiDateLabel(dateStr, lang = "th") {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(lang === "en" ? "en-US" : "th-TH", {
    day: "2-digit",
    month: "short",
  });
}

function formatThaiDateTimeLabel(dateStr, lang = "th") {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString(lang === "en" ? "en-US" : "th-TH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildDateRange(startDate, endDate) {
  const out = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return out;
  }

  const cur = new Date(start);
  while (cur <= end) {
    out.push(formatDateInput(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function average(nums) {
  const arr = nums.filter((n) => Number.isFinite(n));
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(nums) {
  const arr = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function percentile(nums, p) {
  const arr = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return null;
  if (arr.length === 1) return arr[0];
  const idx = (arr.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const w = idx - lo;
  return arr[lo] * (1 - w) + arr[hi] * w;
}

function colorOfIndex(i) {
  const colors = [
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#6366f1",
    "#84cc16",
    "#a855f7",
    "#0ea5e9",
    "#10b981",
    "#eab308",
    "#dc2626",
  ];
  return colors[i % colors.length];
}

function makeCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  };
  return rows.map((row) => row.map(esc).join(",")).join("\n");
}

function canonicalSensorKey(name = "") {
  const key = String(name || "").trim().toLowerCase();

  if (key.includes("temp_rh") || key.includes("temperature_humidity")) return "temp_rh";
  if (key.includes("npk")) return "npk";

  if (
    key.includes("soil_moisture") ||
    key.includes("soil moisture") ||
    key.includes("moisture") ||
    key.includes("ความชื้นในดิน")
  ) {
    return "soil";
  }

  if (
    key.includes("water_level") ||
    key.includes("water level") ||
    key.includes("irrigation") ||
    key.includes("ให้น้ำ") ||
    key.includes("ความพร้อมใช้น้ำ")
  ) {
    return "water";
  }

  if (key.includes("temperature") || key === "temp" || key.includes("อุณหภูมิ")) return "temp";

  if (
    key.includes("humidity") ||
    key === "rh" ||
    key.includes("ความชื้นสัมพัทธ์") ||
    key === "ความชื้น"
  ) {
    return "rh";
  }

  if (
    key.includes("light") ||
    key.includes("lux") ||
    key.includes("ความเข้มแสง") ||
    key.includes("แสง")
  ) {
    return "light";
  }

  if (
    key.includes("wind_speed") ||
    key.includes("wind speed") ||
    key === "wind" ||
    key.includes("วัดความเร็วลม") ||
    key.includes("ความเร็วลม")
  ) {
    return "wind";
  }

  if (key.includes("rain") || key.includes("ฝน")) return "rain";
  if (key === "n" || key.includes("ไนโตรเจน")) return "n";
  if (key === "p" || key.includes("ฟอสฟอรัส")) return "p";
  if (key === "k" || key.includes("โพแทสเซียม")) return "k";

  return "";
}

function sensorLabelFromKey(key, t) {
  const sensor = SENSOR_OPTIONS.find((s) => s.key === key);
  if (!sensor) return key;
  if (!sensor.labelKey) return key.toUpperCase();
  return t[sensor.labelKey] || key;
}

function sensorUnitFromKey(key) {
  return SENSOR_OPTIONS.find((s) => s.key === key)?.unit || "-";
}

function getTimestampFromReading(item) {
  return item?.timestamp || item?.ts || item?.time || item?.createdAt || item?.updatedAt || "";
}

function normalizeDateKey(value) {
  const raw =
    value?.timestamp ||
    value?.ts ||
    value?.time ||
    value?.createdAt ||
    value?.updatedAt ||
    value;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return formatDateInput(d);
}

function inferNodeType(node) {
  const raw = [
    node?.nodeType,
    node?.type,
    node?.nodeName,
    node?.name,
    node?.uid,
    ...safeArray(node?.sensors).map(
      (s) => `${s?.name || ""} ${s?.uid || ""} ${s?.sensorType || ""}`
    ),
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

function getObjectValueByAliases(obj, aliases = []) {
  if (!obj || typeof obj !== "object") return null;
  for (const alias of aliases) {
    const n = toNum(obj?.[alias]);
    if (n !== null) return n;
  }
  return null;
}

function pickValueForSensorKey(item, sensorKey) {
  if (!item) return null;

  const direct = toNum(item?.value);
  if (direct !== null) return direct;

  const latestValue = toNum(item?.latestValue);
  if (latestValue !== null) return latestValue;

  const reading = toNum(item?.reading);
  if (reading !== null) return reading;

  const raw = toNum(item?.raw);
  if (raw !== null) return raw;

  const lastReading = toNum(item?.lastReading?.value);
  if (lastReading !== null) return lastReading;

  const topAliases = {
    temp: ["temp", "temperature", "t"],
    rh: ["rh", "humidity", "humid", "h"],
    wind: ["wind", "windSpeed", "wind_speed"],
    light: ["light", "lux", "lightIntensity", "light_intensity"],
    rain: ["rain", "rainfall"],
    soil: ["soil", "soilMoisture", "soil_moisture", "moisture"],
    water: ["water", "waterLevel", "water_level", "irrigation"],
    n: ["n", "N", "nitrogen"],
    p: ["p", "P", "phosphorus"],
    k: ["k", "K", "potassium"],
  };

  const topValue = getObjectValueByAliases(item, topAliases[sensorKey] || []);
  if (topValue !== null) return topValue;

  const nestedSources = [
    item?.value,
    item?.reading,
    item?.raw,
    item?.latestValue,
    item?.lastReading?.value,
    item?.values,
    item?.data,
    item?.payload,
    item?.metrics,
    item?.measurement,
  ];

  for (const source of nestedSources) {
    if (!source || typeof source !== "object") continue;

    if (sensorKey === "temp") {
      const v1 = getObjectValueByAliases(source, ["temp", "temperature", "t"]);
      if (v1 !== null) return v1;
      const trh = source?.temp_rh || source?.tempRh;
      const v2 = getObjectValueByAliases(trh, ["temp", "temperature", "t"]);
      if (v2 !== null) return v2;
    }

    if (sensorKey === "rh") {
      const v1 = getObjectValueByAliases(source, ["rh", "humidity", "humid", "h"]);
      if (v1 !== null) return v1;
      const trh = source?.temp_rh || source?.tempRh;
      const v2 = getObjectValueByAliases(trh, ["rh", "humidity", "humid", "h"]);
      if (v2 !== null) return v2;
    }

    if (sensorKey === "light") {
      const v = getObjectValueByAliases(source, ["light", "lux", "lightIntensity", "light_intensity"]);
      if (v !== null) return v;
    }

    if (sensorKey === "wind") {
      const v = getObjectValueByAliases(source, ["wind", "windSpeed", "wind_speed"]);
      if (v !== null) return v;
    }

    if (sensorKey === "rain") {
      const v = getObjectValueByAliases(source, ["rain", "rainfall"]);
      if (v !== null) return v;
    }

    if (sensorKey === "soil") {
      const v = getObjectValueByAliases(source, ["soil", "soilMoisture", "soil_moisture", "moisture"]);
      if (v !== null) return v;
    }

    if (sensorKey === "water") {
      const v = getObjectValueByAliases(source, ["water", "waterLevel", "water_level", "irrigation"]);
      if (v !== null) return v;
    }

    if (sensorKey === "n" || sensorKey === "p" || sensorKey === "k") {
      const v1 = getObjectValueByAliases(source, [sensorKey, sensorKey.toUpperCase()]);
      if (v1 !== null) return v1;
      const npk = source?.npk || source?.NPK;
      const v2 = getObjectValueByAliases(npk, [sensorKey, sensorKey.toUpperCase()]);
      if (v2 !== null) return v2;
    }
  }

  return null;
}

function expandSensorKeys(rawSensor) {
  const rawText = [
    rawSensor?.sensorType,
    rawSensor?.name,
    rawSensor?.uid,
    rawSensor?._id,
    rawSensor?.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (rawText.includes("temp_rh") || rawText.includes("temperature_humidity")) {
    return ["temp", "rh"];
  }

  if (rawText.includes("npk")) {
    return ["n", "p", "k"];
  }

  const single = canonicalSensorKey(rawSensor?.sensorType || rawSensor?.name || rawSensor?.uid || "");
  return single ? [single] : [];
}

function extractNodesFromPlot(plot) {
  const directNodes = safeArray(plot?.nodes);

  const pins =
    safeArray(plot?.pins).length > 0 ? safeArray(plot?.pins) : safeArray(plot?.polygon?.pins);

  const pinNodes = pins.flatMap((pin) => {
    const air = safeArray(pin?.node_air).map((node) => ({
      ...node,
      nodeType: node?.nodeType || "air",
      pinId: getId(pin),
      pinName: pin?.pinName || pin?.name || "",
    }));

    const soil = safeArray(pin?.node_soil).map((node) => ({
      ...node,
      nodeType: node?.nodeType || "soil",
      pinId: getId(pin),
      pinName: pin?.pinName || pin?.name || "",
    }));

    const generic = safeArray(pin?.nodes).map((node) => ({
      ...node,
      pinId: getId(pin),
      pinName: pin?.pinName || pin?.name || "",
    }));

    return [...air, ...soil, ...generic];
  });

  const seen = new Set();
  return [...directNodes, ...pinNodes].filter((node) => {
    const key = getId(node) || `${node?.uid || ""}-${node?.nodeName || node?.name || ""}`;
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizePlot(plot, t) {
  const nodes = extractNodesFromPlot(plot).map((node) => ({
    ...node,
    sensors: safeArray(node?.sensors).map((sensor) => ({
      ...sensor,
      _frontendSensorKeys: expandSensorKeys(sensor),
    })),
  }));

  return {
    id: getId(plot),
    plotName: plot?.plotName || plot?.name || plot?.alias || t.unknownPlot,
    nodes,
  };
}

function normalizeReading(item) {
  return {
    id: getId(item),
    sensorId: item?.sensorId || item?.sensor_id || item?.sensor?.id || item?.sensor?._id || "",
    sensorUid: item?.sensorUid || item?.sensor_uid || item?.sensor?.uid || "",
    sensorType:
      item?.sensorType || item?.sensorName || item?.sensor?.sensorType || item?.sensor?.name || "",
    nodeId: item?.nodeId || item?.node_id || item?.node?.id || item?.node?._id || "",
    nodeUid: item?.nodeUid || item?.node_uid || item?.node?.uid || "",
    plotId: item?.plotId || item?.plot_id || item?.plot?.id || item?.plot?._id || "",
    timestamp: getTimestampFromReading(item),
    value: pickValueForSensorKey(item, canonicalSensorKey(item?.sensorType || item?.sensorName || "")),
    rawItem: item,
    status: item?.status || item?.state || "",
  };
}

function allowedSensorKeysForNodeType(nodeType) {
  return nodeType === "soil"
    ? ["soil", "water", "n", "p", "k"]
    : ["temp", "rh", "wind", "light", "rain"];
}

function sameText(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function makeTargetMapKey(target) {
  return [
    target?.plotId || "",
    target?.nodeId || target?.nodeUid || "",
    target?.sensorId || target?.sensorUid || target?.rawSensorType || target?.sensorKey || "",
    target?.sensorKey || "",
  ].join("|");
}

function makeSeriesLabel(target) {
  return `${target?.sensorLabel || "Sensor"} • ${target?.plotName || "Plot"} • ${target?.nodeName || "Node"}`;
}

function rowMatchesTarget(row, target) {
  if (!sameText(row?.plotId, target?.plotId)) return false;

  const nodeMatched =
    sameText(row?.nodeId, target?.nodeId) ||
    sameText(row?.nodeUid, target?.nodeUid) ||
    (!row?.nodeId && !row?.nodeUid && !target?.nodeId && !target?.nodeUid);

  if (!nodeMatched) return false;

  const sensorMatched =
    sameText(row?.sensorId, target?.sensorId) ||
    sameText(row?.sensorUid, target?.sensorUid) ||
    sameText(row?.sensorKey, target?.sensorKey) ||
    (!row?.sensorId && !row?.sensorUid && !target?.sensorId && !target?.sensorUid);

  return sensorMatched;
}

function readingMatchesTarget(raw, target) {
  const itemPlotId = raw?.plotId || raw?.plot_id || raw?.plot?.id || raw?.plot?._id || "";
  const itemNodeId = raw?.nodeId || raw?.node_id || raw?.node?.id || raw?.node?._id || "";
  const itemNodeUid = raw?.nodeUid || raw?.node_uid || raw?.node?.uid || "";
  const itemSensorId = raw?.sensorId || raw?.sensor_id || raw?.sensor?.id || raw?.sensor?._id || "";
  const itemSensorUid = raw?.sensorUid || raw?.sensor_uid || raw?.sensor?.uid || "";
  const itemSensorType =
    raw?.sensorType || raw?.sensorName || raw?.sensor?.sensorType || raw?.sensor?.name || "";

  if (itemPlotId && !sameText(itemPlotId, target.plotId)) return false;

  const nodeMatched =
    (!itemNodeId && !itemNodeUid) ||
    sameText(itemNodeId, target.nodeId) ||
    sameText(itemNodeUid, target.nodeUid);

  if (!nodeMatched) return false;

  const readingKey = canonicalSensorKey(itemSensorType);

  return (
    (target.sensorId && sameText(itemSensorId, target.sensorId)) ||
    (target.sensorUid && sameText(itemSensorUid, target.sensorUid)) ||
    (itemSensorType && sameText(readingKey, target.sensorKey)) ||
    (!target.sensorId && !target.sensorUid)
  );
}

async function apiGet(path) {
  const token = getToken();
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}) ${text || ""}`);
  }

  return res.json();
}

function normalizeSeriesValues(values) {
  const clean = values.map((v) => (Number.isFinite(v) ? v : null));
  const valid = clean.filter((v) => Number.isFinite(v));

  if (!valid.length) return clean.map(() => null);

  if (valid.length === 1) {
    return clean.map((v) => (Number.isFinite(v) ? 50 : null));
  }

  let lo = percentile(valid, 0.05);
  let hi = percentile(valid, 0.95);

  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = Math.min(...valid);
    hi = Math.max(...valid);
  }

  if (lo === hi) {
    const med = median(valid) ?? lo;
    return clean.map((v) => (Number.isFinite(v) ? (v >= med ? 60 : 40) : null));
  }

  return clean.map((v) => {
    if (!Number.isFinite(v)) return null;
    const clamped = Math.max(lo, Math.min(hi, v));
    return ((clamped - lo) / (hi - lo)) * 100;
  });
}

function safeDisplayValue(sensorKey, value) {
  if (!Number.isFinite(value)) return null;

  if (sensorKey === "rh") return Math.max(0, Math.min(100, value));
  if (sensorKey === "water") return Math.max(0, Math.min(100, value));
  if (sensorKey === "soil") return Math.max(0, Math.min(100, value));
  if (sensorKey === "temp") return Math.max(-20, Math.min(100, value));
  if (sensorKey === "wind") return Math.max(0, Math.min(200, value));
  if (sensorKey === "rain") return Math.max(0, Math.min(1000, value));
  if (sensorKey === "n") return Math.max(0, Math.min(1000, value));
  if (sensorKey === "p") return Math.max(0, Math.min(100000, value));
  if (sensorKey === "k") return Math.max(0, Math.min(100000, value));
  if (sensorKey === "light") return Math.max(0, Math.min(1000000, value));

  return value;
}

function buildPathFromValues(values, width = 900, height = 260) {
  const stepX = values.length <= 1 ? 0 : width / Math.max(values.length - 1, 1);
  let path = "";
  let started = false;

  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    const x = i * stepX;

    if (!Number.isFinite(v)) {
      started = false;
      continue;
    }

    const y = height - (v / 100) * height;

    if (!started) {
      path += `M ${x} ${y}`;
      started = true;
    } else {
      path += ` L ${x} ${y}`;
    }
  }

  return path;
}

function getPointCoords(values, width = 900, height = 260) {
  const stepX = values.length <= 1 ? 0 : width / Math.max(values.length - 1, 1);
  return values.map((v, i) => {
    if (!Number.isFinite(v)) return null;
    return {
      x: i * stepX,
      y: height - (v / 100) * height,
      value: v,
      index: i,
    };
  });
}

function buildAreaPathFromValues(values, width = 900, height = 260) {
  const points = getPointCoords(values, width, height).filter(Boolean);
  if (!points.length) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${height} L ${p.x} ${p.y} L ${p.x} ${height} Z`;
  }

  const linePath = buildPathFromValues(values, width, height);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x} ${height} L ${first.x} ${height} Z`;
}

export default function HistoryPage() {
  const { t, lang } = useDuwimsT();
  const today = useMemo(() => new Date(), []);
  const defaultEnd = formatDateInput(today);
  const defaultStart = formatDateInput(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
  );

  const [plots, setPlots] = useState([]);
  const [loadingPlots, setLoadingPlots] = useState(true);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [error, setError] = useState("");

  const [quickRange, setQuickRange] = useState(t.last30Days);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedPlotId, setSelectedPlotId] = useState("all");

  const [selectedSensors, setSelectedSensors] = useState(SENSOR_OPTIONS.map((s) => s.key));
  const [sensorDropdownOpen, setSensorDropdownOpen] = useState(false);

  const [readingMap, setReadingMap] = useState({});
  const csvRef = useRef("");
  const sensorWrapRef = useRef(null);
  const [hoverInfo, setHoverInfo] = useState(null);

  const quickRangeOptions = useMemo(() => [t.todayShort, t.last7Days, t.last30Days], [t]);

  const sensorOptionsI18n = useMemo(
    () =>
      SENSOR_OPTIONS.map((s) => ({
        ...s,
        label: s.labelKey ? t[s.labelKey] || s.key : s.key.toUpperCase(),
      })),
    [t]
  );

  useEffect(() => {
    setQuickRange(t.last30Days);
  }, [t.last30Days]);

  useEffect(() => {
    let alive = true;

    async function loadPlots() {
      setLoadingPlots(true);
      setError("");
      try {
        const data = await apiGet("/api/plots");
        if (!alive) return;

        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setPlots(items.map((item) => normalizePlot(item, t)).filter((p) => p.id));
      } catch (err) {
        if (!alive) return;
        setError(err?.message || t.loadPlotsFailed);
        setPlots([]);
      } finally {
        if (alive) setLoadingPlots(false);
      }
    }

    loadPlots();
    return () => {
      alive = false;
    };
  }, [t]);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!sensorWrapRef.current) return;
      if (!sensorWrapRef.current.contains(e.target)) {
        setSensorDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const filteredPlots = useMemo(() => {
    if (selectedPlotId === "all") return plots;
    return plots.filter((p) => String(p.id) === String(selectedPlotId));
  }, [plots, selectedPlotId]);

  const visibleNodes = useMemo(() => {
    const rows = [];
    for (const plot of filteredPlots) {
      for (const node of safeArray(plot?.nodes)) {
        rows.push({
          plotId: plot.id,
          plotName: plot.plotName,
          nodeId: getId(node),
          nodeUid: node?.uid || "",
          nodeName: node?.nodeName || node?.name || node?.uid || "Node",
          nodeType: inferNodeType(node),
          sensors: safeArray(node?.sensors),
        });
      }
    }
    return rows;
  }, [filteredPlots]);

  const selectedSensorNames = useMemo(() => {
    return selectedSensors
      .map((key) => sensorOptionsI18n.find((s) => s.key === key)?.label)
      .filter(Boolean);
  }, [selectedSensors, sensorOptionsI18n]);

  const sensorDropdownLabel = useMemo(() => {
    if (!selectedSensorNames.length) return t.selectSensorType;
    return selectedSensorNames.join(", ");
  }, [selectedSensorNames, t]);

  const sensorTargets = useMemo(() => {
    const targets = [];
    const seen = new Set();

    for (const plot of filteredPlots) {
      for (const node of safeArray(plot?.nodes)) {
        const nodeId = getId(node);
        const nodeUid = node?.uid || "";
        const nodeName = node?.nodeName || node?.name || nodeUid || "Node";
        const nodeType = inferNodeType(node);
        const sensors = safeArray(node?.sensors);
        const fallbackKeys = selectedSensors.filter((key) =>
          allowedSensorKeysForNodeType(nodeType).includes(key)
        );

        if (sensors.length) {
          for (const rawSensor of sensors) {
            const keys =
              safeArray(rawSensor?._frontendSensorKeys).length > 0
                ? rawSensor._frontendSensorKeys
                : expandSensorKeys(rawSensor);

            for (const sensorKey of keys) {
              if (!sensorKey || !selectedSensors.includes(sensorKey)) continue;

              const target = {
                plotId: plot.id,
                plotName: plot.plotName,
                nodeId,
                nodeUid,
                nodeName,
                nodeType,
                sensorId: getId(rawSensor),
                sensorUid: rawSensor?.uid || "",
                rawSensorType: rawSensor?.sensorType || rawSensor?.name || rawSensor?.uid || "",
                sensorKey,
                sensorLabel: sensorLabelFromKey(sensorKey, t),
                unit: sensorUnitFromKey(sensorKey),
                latestValue: rawSensor?.latestValue,
                latestTimestamp: rawSensor?.latestTimestamp,
              };

              const uniq = [
                target.plotId,
                target.nodeId || target.nodeUid,
                target.sensorId || target.sensorUid || target.rawSensorType || target.sensorKey,
                target.sensorKey,
              ].join("|");

              if (seen.has(uniq)) continue;
              seen.add(uniq);
              targets.push(target);
            }
          }
        } else {
          for (const sensorKey of fallbackKeys) {
            const target = {
              plotId: plot.id,
              plotName: plot.plotName,
              nodeId,
              nodeUid,
              nodeName,
              nodeType,
              sensorId: "",
              sensorUid: "",
              rawSensorType: sensorKey,
              sensorKey,
              sensorLabel: sensorLabelFromKey(sensorKey, t),
              unit: sensorUnitFromKey(sensorKey),
              latestValue: null,
              latestTimestamp: null,
            };

            const uniq = [target.plotId, target.nodeId || target.nodeUid, target.sensorKey].join("|");
            if (seen.has(uniq)) continue;
            seen.add(uniq);
            targets.push(target);
          }
        }
      }
    }

    return targets;
  }, [filteredPlots, selectedSensors, t]);

  useEffect(() => {
    let alive = true;

    async function loadReadings() {
      if (!sensorTargets.length) {
        setReadingMap({});
        return;
      }

      setLoadingReadings(true);
      setError("");

      try {
        const results = await Promise.all(
          sensorTargets.map(async (target) => {
            const mapKey = makeTargetMapKey(target);

            try {
              const qs = new URLSearchParams();
              qs.set("limit", "5000");
              if (target.plotId) qs.set("plotId", String(target.plotId));
              if (target.nodeId) qs.set("nodeId", String(target.nodeId));
              if (target.sensorId) qs.set("sensorId", String(target.sensorId));

              const data = await apiGet(`/api/sensor-readings?${qs.toString()}`);
              const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
              return [mapKey, items.map(normalizeReading)];
            } catch {
              return [mapKey, []];
            }
          })
        );

        if (!alive) return;
        setReadingMap(Object.fromEntries(results));
      } catch (err) {
        if (!alive) return;
        setError(err?.message || t.loadHistoryFailed);
        setReadingMap({});
      } finally {
        if (alive) setLoadingReadings(false);
      }
    }

    loadReadings();
    return () => {
      alive = false;
    };
  }, [sensorTargets, t]);

  const dateKeys = useMemo(() => buildDateRange(startDate, endDate), [startDate, endDate]);

  const maxXAxisLabels = 7;

  const filteredReadingRows = useMemo(() => {
    const rows = [];

    for (const target of sensorTargets) {
      const mapKey = makeTargetMapKey(target);

      const items = Array.isArray(readingMap[mapKey]) ? readingMap[mapKey] : [];
      const seenRowKeys = new Set();

      for (const item of items) {
        const raw = item?.rawItem || item;
        const timestamp = getTimestampFromReading(raw);
        const dateKey = normalizeDateKey(timestamp);
        if (!dateKey) continue;
        if (dateKey < startDate || dateKey > endDate) continue;

        if (!readingMatchesTarget(raw, target)) continue;

        const rawValue = pickValueForSensorKey(raw, target.sensorKey);
        const value = safeDisplayValue(target.sensorKey, rawValue);
        if (value === null) continue;

        const rowKey = [
          target.plotId,
          target.nodeId || target.nodeUid,
          target.sensorId || target.sensorUid || target.rawSensorType,
          target.sensorKey,
          timestamp,
          value,
        ].join("|");

        if (seenRowKeys.has(rowKey)) continue;
        seenRowKeys.add(rowKey);

        rows.push({
          plotId: target.plotId,
          plotName: target.plotName,
          nodeId: target.nodeId,
          nodeUid: target.nodeUid,
          nodeName: target.nodeName,
          nodeType: target.nodeType,
          sensorId: target.sensorId,
          sensorKey: target.sensorKey,
          sensorLabel: target.sensorLabel,
          unit: target.unit,
          value,
          timestamp,
          status: raw?.status || "",
          dateKey,
          source: "history",
        });
      }

      const latestTimestamp = target.latestTimestamp || null;
      const latestDateKey = normalizeDateKey(latestTimestamp);
      const latestRawValue = pickValueForSensorKey({ latestValue: target.latestValue }, target.sensorKey);
      const latestValue = safeDisplayValue(target.sensorKey, latestRawValue);

      if (
        latestValue !== null &&
        latestDateKey &&
        latestDateKey >= startDate &&
        latestDateKey <= endDate
      ) {
        const latestRowKey = [
          target.plotId,
          target.nodeId || target.nodeUid,
          target.sensorId || target.sensorUid || target.rawSensorType,
          target.sensorKey,
          latestTimestamp,
          latestValue,
        ].join("|");

        if (!seenRowKeys.has(latestRowKey)) {
          seenRowKeys.add(latestRowKey);
          rows.push({
            plotId: target.plotId,
            plotName: target.plotName,
            nodeId: target.nodeId,
            nodeUid: target.nodeUid,
            nodeName: target.nodeName,
            nodeType: target.nodeType,
            sensorId: target.sensorId,
            sensorKey: target.sensorKey,
            sensorLabel: target.sensorLabel,
            unit: target.unit,
            value: latestValue,
            timestamp: latestTimestamp,
            status: "",
            dateKey: latestDateKey,
            source: "latest",
          });
        }
      }
    }

    rows.sort((a, b) => {
      const ta = new Date(a.timestamp || 0).getTime();
      const tb = new Date(b.timestamp || 0).getTime();
      return ta - tb;
    });

    return rows;
  }, [sensorTargets, readingMap, startDate, endDate]);

  const selectedSensorOptions = useMemo(() => {
    return sensorOptionsI18n.filter((s) => selectedSensors.includes(s.key));
  }, [selectedSensors, sensorOptionsI18n]);

  const chartBucket = useMemo(() => {
    const BUCKET_THRESHOLD_MS = 10 * 1000;

    const uniq = Array.from(
      new Set(
        filteredReadingRows
          .map((row) => row.timestamp)
          .filter((value) => {
            const time = new Date(value || "").getTime();
            return Number.isFinite(time) && time > 0;
          })
      )
    );

    uniq.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const buckets = [];
    const bucketMap = new Map();

    for (const ts of uniq) {
      const currentMs = new Date(ts).getTime();
      const lastBucket = buckets[buckets.length - 1];

      if (!lastBucket) {
        buckets.push({
          anchor: ts,
          anchorMs: currentMs,
          items: [ts],
        });
        bucketMap.set(ts, ts);
        continue;
      }

      if (Math.abs(currentMs - lastBucket.anchorMs) <= BUCKET_THRESHOLD_MS) {
        lastBucket.items.push(ts);
        bucketMap.set(ts, lastBucket.anchor);
      } else {
        buckets.push({
          anchor: ts,
          anchorMs: currentMs,
          items: [ts],
        });
        bucketMap.set(ts, ts);
      }
    }

    return {
      timestamps: buckets.map((bucket) => bucket.anchor),
      bucketMap,
      thresholdMs: BUCKET_THRESHOLD_MS,
    };
  }, [filteredReadingRows]);

  const chartTimestamps = chartBucket.timestamps;

  const combinedChart = useMemo(() => {
    if (!sensorTargets.length || !chartTimestamps.length) return null;

    const series = sensorTargets
      .map((target) => {
        const valuesByTimestamp = new Map();

        filteredReadingRows
          .filter((row) => rowMatchesTarget(row, target))
          .forEach((row) => {
            const bucketTimestamp = chartBucket.bucketMap.get(row.timestamp) || row.timestamp;
            valuesByTimestamp.set(bucketTimestamp, row.value);
          });

        const rawValues = chartTimestamps.map((ts) => {
          const value = valuesByTimestamp.get(ts);
          return Number.isFinite(value) ? value : null;
        });

        const normalizedValues = normalizeSeriesValues(rawValues);
        if (!normalizedValues.some((v) => Number.isFinite(v))) return null;

        return {
          key: makeTargetMapKey(target),
          plotId: target.plotId,
          plotName: target.plotName,
          nodeId: target.nodeId,
          nodeUid: target.nodeUid,
          nodeName: target.nodeName,
          nodeType: target.nodeType,
          sensorId: target.sensorId,
          sensorUid: target.sensorUid,
          sensorKey: target.sensorKey,
          sensorLabel: target.sensorLabel,
          unit: target.unit,
          label: makeSeriesLabel(target),
          timestamps: chartTimestamps,
          values: rawValues,
          normalizedValues,
        };
      })
      .filter(Boolean);

    return {
      series,
      timestamps: chartTimestamps,
      min: 0,
      max: 100,
      yLabels: ["100", "75", "50", "25", "0"],
      bucketThresholdMs: chartBucket.thresholdMs,
    };
  }, [sensorTargets, filteredReadingRows, chartTimestamps, chartBucket]);

  const xLabelStep = Math.max(
    1,
    Math.ceil(((Array.isArray(combinedChart?.timestamps) ? combinedChart.timestamps.length : 0) || 1) / maxXAxisLabels)
  );

  const summaryRows = useMemo(() => {
    return visibleNodes.map((node) => {
      const nodeRows = filteredReadingRows.filter(
        (r) =>
          sameText(r.plotId, node.plotId) &&
          (sameText(r.nodeId, node.nodeId) || sameText(r.nodeUid, node.nodeUid))
      );

      const values = {};
      for (const opt of SENSOR_OPTIONS) {
        values[opt.key] = average(nodeRows.filter((r) => r.sensorKey === opt.key).map((r) => r.value));
      }

      return {
        plotName: node.plotName,
        nodeName: node.nodeName,
        nodeType: node.nodeType,
        values,
      };
    });
  }, [visibleNodes, filteredReadingRows]);

  const airNodeSummaryRows = useMemo(
    () => summaryRows.filter((row) => row.nodeType === "air"),
    [summaryRows]
  );

  const soilNodeSummaryRows = useMemo(
    () => summaryRows.filter((row) => row.nodeType === "soil"),
    [summaryRows]
  );

  const hoverTime = hoverInfo?.timestamp || null;

  const csvRows = useMemo(() => {
    const header = ["plot", "node", "nodeType", "sensor", "unit", "value", "timestamp", "status", "source"];
    const body = filteredReadingRows.map((row) => [
      row.plotName,
      row.nodeName,
      row.nodeType,
      row.sensorLabel,
      row.unit ?? "",
      row.value ?? "",
      row.timestamp ?? "",
      row.status ?? "",
      row.source ?? "",
    ]);

    return [header, ...body];
  }, [filteredReadingRows]);

  useEffect(() => {
    csvRef.current = makeCsv(csvRows);
  }, [csvRows]);

  function toggleSensor(key) {
    setSelectedSensors((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  }

  function resetSensors() {
    setSelectedSensors([]);
  }

  function selectAllSensors() {
    setSelectedSensors(sensorOptionsI18n.map((s) => s.key));
  }

  function handleQuick(label) {
    const now = new Date();
    const end = formatDateInput(now);
    let start = end;

    if (label === t.todayShort) {
      start = end;
    } else if (label === t.last7Days) {
      start = formatDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
    } else {
      start = formatDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
    }

    setQuickRange(label);
    setStartDate(start);
    setEndDate(end);
  }

  function exportCsv() {
    if (!filteredReadingRows.length) {
      alert(lang === "en" ? "No data to export." : "ไม่มีข้อมูลสำหรับส่งออก CSV");
      return;
    }

    const bom = "\uFEFF";
    const csvText = bom + csvRef.current;

    const blob = new Blob([csvText], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `history-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <DuwimsStaticPage current="history">
      <div id="history-page-root" className="history-page-shell">
        <div className="history-card filter-card">
          <div className="history-title">{t.historyFilterTitle}</div>
          <div className="history-sub">{t.historyFilterSub}</div>

          <div style={{ marginBottom: 12 }}>
            <div className="history-label">{t.quickRange}</div>
            <div className="quick-wrap">
              {quickRangeOptions.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`quick-btn ${quickRange === label ? "active" : ""}`}
                  onClick={() => handleQuick(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="history-grid" style={{ marginBottom: 14 }}>
            <div>
              <label className="history-label">{t.startDate}</label>
              <input
                className="history-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="history-label">{t.endDate}</label>
              <input
                className="history-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label className="history-label">{t.plotSelect}</label>
              <select
                className="history-select"
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(e.target.value)}
              >
                <option value="all">{t.allPlots}</option>
                {plots.map((plot) => (
                  <option key={plot.id} value={plot.id}>
                    {plot.plotName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sensor-wrap-block sensor-wrap-block-inline">
            <div className="sensor-inline-head">
              <div className="history-label" style={{ marginBottom: 0 }}>
                {t.sensorType}
              </div>
            </div>

            <div className="sensor-dd-wrap" ref={sensorWrapRef}>
              <button
                type="button"
                className={`sensor-dd-trigger ${sensorDropdownOpen ? "open" : ""}`}
                onClick={() => setSensorDropdownOpen((v) => !v)}
              >
                <span className="sensor-dd-trigger-text">{sensorDropdownLabel}</span>
                <span className="sensor-dd-trigger-arrow">{sensorDropdownOpen ? "▲" : "▼"}</span>
              </button>

              {sensorDropdownOpen && (
                <div className="sensor-dd-menu open">
                  <div className="sensor-dd-actions">
                    <button
                      type="button"
                      className="sensor-dd-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllSensors();
                      }}
                    >
                      เลือกทั้งหมด
                    </button>

                    <button
                      type="button"
                      className="sensor-dd-action danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSensors();
                      }}
                    >
                      ลบ
                    </button>
                  </div>

                  <div className="sensor-dd-grid">
                    {sensorOptionsI18n.map((sensor) => {
                      const checked = selectedSensors.includes(sensor.key);
                      return (
                        <label
                          key={sensor.key}
                          className={`sensor-dd-item ${checked ? "checked" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleSensor(sensor.key);
                          }}
                        >
                          <span className="sensor-dd-box">{checked ? "✓" : ""}</span>
                          <span className="sensor-dd-name">{sensor.label}</span>
                          <span className="sensor-dd-unit">{sensor.unit}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="sensor-dd-footer">
                    <button
                      type="button"
                      className="sensor-dd-done"
                      onClick={() => setSensorDropdownOpen(false)}
                    >
                      {t.done}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className="history-card">
            <div className="chart-empty-inline">{error}</div>
          </div>
        ) : null}

        {combinedChart && combinedChart.series.length ? (
          <div className="history-card chart-card">
            <div className="chart-head">
              <div>
                <div className="history-title" style={{ marginBottom: 4 }}>
                  {t.chartComparePlots}
                </div>
                <div className="history-sub" style={{ marginBottom: 0 }}>
                  {lang === "en"
                    ? "Combined chart uses normalized scale (0–100) so different sensor units can be compared in one graph."
                    : "กราฟรวมนี้ใช้สเกลปรับเทียบ 0–100 เพื่อให้เซนเซอร์ต่างหน่วยดูรวมกันในกราฟเดียวได้"}
                </div>
              </div>

              <button type="button" className="export-btn" onClick={exportCsv}>
                {t.exportCsv}
              </button>
            </div>

            <div className="chart-legend">
              {combinedChart.series.map((item, i) => (
                <div key={item.key} className="legend-item">
                  <div className="legend-dot" style={{ background: colorOfIndex(i) }} />
                  <span>
                    {item.label} ({item.unit})
                  </span>
                </div>
              ))}
            </div>

            <div className="chart-wrap">
              <div className="chart-svg-box">
                <svg
                  viewBox="0 0 900 260"
                  preserveAspectRatio="none"
                  className="chart-svg"
                  onMouseLeave={() => setHoverInfo(null)}
                >
                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y = 260 - (tick / 100) * 260;
                    return (
                      <line
                        key={tick}
                        x1="0"
                        y1={y}
                        x2="900"
                        y2={y}
                        stroke="rgba(93,184,102,0.12)"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {combinedChart.timestamps.map((d, index) => {
                    const stepX = combinedChart.timestamps.length <= 1 ? 900 : 900 / Math.max(combinedChart.timestamps.length - 1, 1);
                    const x = index * stepX;
                    return (
                      <line
                        key={d}
                        x1={x}
                        y1="0"
                        x2={x}
                        y2="260"
                        stroke={hoverTime === d ? "rgba(59,130,246,0.18)" : "rgba(148,163,184,0.10)"}
                        strokeWidth={hoverTime === d ? "2" : "1"}
                      />
                    );
                  })}

                  {combinedChart.series.map((series, i) => {
                    const color = colorOfIndex(i);
                    const path = buildPathFromValues(series.normalizedValues, 900, 260);
                    const points = getPointCoords(series.normalizedValues, 900, 260).filter(Boolean);

                    if (!points.length) return null;

                    if (points.length === 1) {
                      const p = points[0];
                      const x1 = Math.max(0, p.x - 8);
                      const x2 = Math.min(900, p.x + 8);
                      return (
                        <path
                          key={series.key}
                          d={`M ${x1} ${p.y} L ${x2} ${p.y}`}
                          fill="none"
                          stroke={color}
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      );
                    }

                    return (
                      <path
                        key={series.key}
                        d={path}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {combinedChart.timestamps.map((d, index) => {
                    const stepX = combinedChart.timestamps.length <= 1 ? 900 : 900 / Math.max(combinedChart.timestamps.length - 1, 1);
                    const x = index * stepX;
                    const rowsAtTime = filteredReadingRows.filter((row) => (chartBucket.bucketMap.get(row.timestamp) || row.timestamp) === d);
                    return (
                      <rect
                        key={`hover-${d}`}
                        x={Math.max(0, x - stepX / 2)}
                        y="0"
                        width={combinedChart.timestamps.length <= 1 ? 900 : Math.max(20, stepX)}
                        height="260"
                        fill="transparent"
                        onMouseEnter={() => setHoverInfo({ timestamp: d, x, rows: rowsAtTime })}
                        onFocus={() => setHoverInfo({ timestamp: d, x, rows: rowsAtTime })}
                      />
                    );
                  })}

                  {hoverInfo ? (
                    <line
                      x1={hoverInfo.x}
                      y1="0"
                      x2={hoverInfo.x}
                      y2="260"
                      stroke="rgba(37,99,235,0.35)"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                  ) : null}
                </svg>

                <div className="chart-y">
                  {combinedChart.yLabels.map((label, index) => (
                    <div key={index}>{label}</div>
                  ))}
                </div>

                {hoverInfo ? (
                  <div
                    className="chart-tooltip"
                    style={{ left: `clamp(64px, calc(${(hoverInfo.x / 900) * 100}% + 24px), calc(100% - 280px))` }}
                  >
                    <div className="chart-tooltip-date">{formatThaiDateTimeLabel(hoverInfo.timestamp, lang)}</div>
                    <div className="chart-tooltip-list">
                      {combinedChart.series.map((series, i) => {
                        const dateIndex = combinedChart.timestamps.indexOf(hoverInfo.timestamp);
                        const rawValue = dateIndex >= 0 ? series.values[dateIndex] : null;
                        if (!Number.isFinite(rawValue)) return null;
                        return (
                          <div key={`${series.key}-${hoverInfo.timestamp}`} className="chart-tooltip-row">
                            <span className="chart-tooltip-dot" style={{ background: colorOfIndex(i) }} />
                            <span className="chart-tooltip-name">
                              {series.label}
                            </span>
                            <span className="chart-tooltip-value">
                              {Number(rawValue).toFixed(2)} {series.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className="chart-x"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(combinedChart.timestamps.length, 1)}, minmax(0, 1fr))`,
                }}
              >
                {combinedChart.timestamps.map((d, index) => (
                  <div key={d} className={hoverTime === d ? "active" : ""}>
                    {index % xLabelStep === 0 || index === combinedChart.timestamps.length - 1
                      ? formatThaiDateTimeLabel(d, lang)
                      : ""}
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-note">
              {lang === "en"
                ? "Usable combined chart: all selected sensors are drawn together in one graph with normalized 0–100 scale, area fill, and real values shown in the tooltip and summary tables below."
                : "กราฟรวมนี้ใช้งานจริงได้สำหรับทุกเซนเซอร์ที่เลือก โดยวาดรวมในกราฟเดียวด้วยสเกลปรับเทียบ 0–100 มีพื้นใต้เส้น และดูค่าจริงได้จาก tooltip และตารางสรุปด้านล่าง"}
            </div>
          </div>
        ) : (
          <div className="history-card chart-card">
            <div className="chart-empty-inline">{t.noChartData}</div>
          </div>
        )}

        <div className="summary-stack">
          <div className="history-card">
            <div className="history-title">Air Node 1</div>
            <div className="history-sub">{t.summarySub}</div>

            <div className="summary-wrap">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>{t.plotCol}</th>
                    <th>{t.nodeCol}</th>
                    <th>{t.temperature}</th>
                    <th>{t.relativeHumidity}</th>
                    <th>{t.windSpeed}</th>
                    <th>{t.lightIntensity}</th>
                    <th>{t.rainfall}</th>
                  </tr>
                </thead>
                <tbody>
                  {airNodeSummaryRows.length ? (
                    airNodeSummaryRows.map((row, index) => (
                      <tr key={`${row.plotName}-${row.nodeName}-air-${index}`}>
                        <td>{row.plotName}</td>
                        <td>{row.nodeName}</td>
                        <td>{Number.isFinite(row.values.temp) ? Number(row.values.temp).toFixed(2) : "-"}</td>
                        <td>{Number.isFinite(row.values.rh) ? Number(row.values.rh).toFixed(2) : "-"}</td>
                        <td>{Number.isFinite(row.values.wind) ? Number(row.values.wind).toFixed(2) : "-"}</td>
                        <td>{Number.isFinite(row.values.light) ? Number(row.values.light).toFixed(2) : "-"}</td>
                        <td>{Number.isFinite(row.values.rain) ? Number(row.values.rain).toFixed(2) : "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#64748b" }}>
                        {t.noSummaryData}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="history-card">
            <div className="history-title">Soil Node 1</div>
            <div className="history-sub">{t.summarySub}</div>

            <div className="summary-wrap">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>{t.plotCol}</th>
                    <th>{t.nodeCol}</th>
                    <th>{t.soilMoisture}</th>
                    <th>{t.waterAvailability}</th>
                    <th>N</th>
                    <th>P</th>
                    <th>K</th>
                  </tr>
                </thead>
                <tbody>
                  {soilNodeSummaryRows.length ? (
                    soilNodeSummaryRows.map((row, index) => (
                      <tr key={`${row.plotName}-${row.nodeName}-soil-${index}`}>
                        <td>{row.plotName}</td>
                        <td>{row.nodeName}</td>
                        <td>{Number.isFinite(row.values.soil) ? Number(row.values.soil).toFixed(2) : "-"}</td>
                        <td>{Number.isFinite(row.values.water) ? Number(row.values.water).toFixed(2) : "-"}</td>
                        <td>{Number.isFinite(row.values.n) ? Number(row.values.n).toFixed(2) : "-"}</td>
                        <td>{Number.isFinite(row.values.p) ? Number(row.values.p).toFixed(2) : "-"}</td>
                        <td>{Number.isFinite(row.values.k) ? Number(row.values.k).toFixed(2) : "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#64748b" }}>
                        {t.noSummaryData}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <style jsx>{`
          #history-page-root,
          #history-page-root * {
            box-sizing: border-box;
          }

          #history-page-root {
            position: relative;
            overflow: visible !important;
            width: 100%;
            max-width: 1300px;
            margin: 0 auto;
            padding: 16px 20px;
            z-index: 2;
            display: grid;
            gap: 18px;
          }

          .history-card {
            width: 100%;
            max-width: 1180px;
            margin-left: auto;
            margin-right: auto;
            background: #fff;
            border: 1px solid #dfe7dc;
            border-radius: 18px;
            padding: 18px;
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
            overflow: visible !important;
            position: relative;
            min-width: 0;
          }

          .history-card.filter-card {
            z-index: 100;
          }

          .history-title {
            font-size: 18px;
            font-weight: 900;
            color: #244f15;
            margin-bottom: 6px;
            line-height: 1.35;
            word-break: break-word;
          }

          .history-sub {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 14px;
            line-height: 1.5;
            word-break: break-word;
          }

          .history-label {
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 800;
            color: #244f15;
          }

          .history-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .history-input,
          .history-select {
            width: 100%;
            min-width: 0;
            border: 1px solid #d8e7d2;
            background: #fff;
            border-radius: 12px;
            padding: 11px 12px;
            font-size: 14px;
            color: #0f172a;
            outline: none;
          }

          .history-input:focus,
          .history-select:focus {
            border-color: #5db866;
            box-shadow: 0 0 0 3px rgba(93, 184, 102, 0.15);
          }

          .quick-wrap {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .quick-btn {
            border: 1px solid #cfe3c7;
            background: #fff;
            color: #244f15;
            border-radius: 999px;
            padding: 9px 14px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            white-space: nowrap;
          }

          .quick-btn.active {
            background: #244f15;
            border-color: #244f15;
            color: #fff;
          }

          .sensor-wrap-block-inline {
            display: grid;
            gap: 10px;
          }

          .sensor-inline-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
          }

          .sensor-dd-wrap {
            position: relative;
          }

          .sensor-dd-trigger {
            width: 100%;
            min-height: 46px;
            border: 1px solid #d8e7d2;
            background: #fff;
            border-radius: 14px;
            padding: 11px 14px;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            min-width: 0;
            text-align: left;
          }

          .sensor-dd-trigger.open {
            border-color: #5db866;
            box-shadow: 0 0 0 3px rgba(93, 184, 102, 0.15);
          }

          .sensor-dd-trigger-text {
            overflow: visible;
            white-space: normal;
            text-align: left;
            min-width: 0;
            flex: 1 1 auto;
            line-height: 1.55;
            word-break: break-word;
          }

          .sensor-dd-trigger-arrow {
            color: #244f15;
            font-size: 12px;
            font-weight: 900;
            flex: 0 0 auto;
            padding-top: 2px;
          }

          .sensor-dd-menu {
            position: absolute;
            z-index: 30;
            left: 0;
            right: 0;
            top: calc(100% + 8px);
            background: #fff;
            border: 1px solid #dbead5;
            border-radius: 16px;
            box-shadow: 0 18px 44px rgba(15, 23, 42, 0.12);
            padding: 12px;
            max-width: 100%;
          }

          .sensor-dd-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-bottom: 10px;
            flex-wrap: wrap;
          }

          .sensor-dd-action {
            border: 1px solid #d8e7d2;
            background: #fff;
            color: #244f15;
            border-radius: 10px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
          }

          .sensor-dd-action.danger {
            color: #ef4444;
            border-color: #fecaca;
          }

          .sensor-dd-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .sensor-dd-item {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 10px 12px;
            display: grid;
            grid-template-columns: 20px minmax(0, 1fr) auto;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            user-select: none;
            background: #fff;
            min-width: 0;
          }

          .sensor-dd-item.checked {
            border-color: #5db866;
            background: #f4fff3;
          }

          .sensor-dd-box {
            width: 18px;
            height: 18px;
            border: 1.5px solid #9ca3af;
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 900;
            color: #fff;
            background: transparent;
          }

          .sensor-dd-item.checked .sensor-dd-box {
            border-color: #244f15;
            background: #244f15;
          }

          .sensor-dd-name {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            word-break: break-word;
            min-width: 0;
          }

          .sensor-dd-unit {
            font-size: 12px;
            font-weight: 900;
            color: #64748b;
            white-space: nowrap;
          }

          .sensor-dd-footer {
            display: flex;
            justify-content: flex-end;
            margin-top: 12px;
          }

          .sensor-dd-done {
            border: none;
            border-radius: 12px;
            padding: 10px 14px;
            background: #244f15;
            color: #fff;
            font-weight: 900;
            cursor: pointer;
          }

          .chart-card {
            overflow: hidden;
          }

          .chart-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
            flex-wrap: wrap;
          }

          .chart-legend {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            margin-bottom: 10px;
            font-size: 12px;
            color: #334155;
            font-weight: 700;
          }

          .chart-empty-inline {
            font-size: 12px;
            color: #64748b;
          }

          .legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
          }

          .legend-dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            flex: 0 0 auto;
          }

          .chart-wrap {
            position: relative;
            border: 1px solid #e6efe4;
            border-radius: 14px;
            padding: 10px 10px 0;
            background: #fcfffc;
            overflow: hidden;
            width: 100%;
          }

          .chart-y {
            position: absolute;
            left: 0;
            top: 10px;
            bottom: 28px;
            width: 50px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            pointer-events: none;
            font-size: 11px;
            color: #475569;
            font-weight: 700;
            padding-right: 6px;
            text-align: right;
            z-index: 2;
          }

          .chart-svg-box {
            position: relative;
            min-width: 0;
            width: 100%;
            height: 260px;
            padding-left: 54px;
          }

          .chart-svg {
            display: block;
            width: 100%;
            height: 260px;
          }

          .chart-x {
            min-width: 0;
            display: grid;
            gap: 0;
            margin-top: 8px;
            margin-left: 54px;
            padding-bottom: 8px;
            font-size: 11px;
            color: #475569;
            font-weight: 700;
            text-align: center;
          }

          .chart-x > div.active {
            color: #1d4ed8;
            font-weight: 900;
          }

          .chart-tooltip {
            position: absolute;
            top: 12px;
            z-index: 4;
            width: min(260px, calc(100% - 70px));
            background: rgba(255, 255, 255, 0.97);
            border: 1px solid #dbe8d7;
            border-radius: 14px;
            box-shadow: 0 14px 34px rgba(15, 23, 42, 0.14);
            padding: 10px 12px;
            pointer-events: none;
          }

          .chart-tooltip-date {
            font-size: 12px;
            font-weight: 900;
            color: #244f15;
            margin-bottom: 8px;
          }

          .chart-tooltip-list {
            display: grid;
            gap: 6px;
          }

          .chart-tooltip-row {
            display: grid;
            grid-template-columns: 10px minmax(0, 1fr) auto;
            gap: 8px;
            align-items: center;
            font-size: 11px;
            color: #334155;
          }

          .chart-tooltip-dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
          }

          .chart-tooltip-name {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .chart-tooltip-value {
            font-weight: 900;
            color: #0f172a;
            white-space: nowrap;
          }

          .chart-note {
            margin-top: 8px;
            font-size: 11px;
            color: #64748b;
            line-height: 1.5;
          }

          .export-btn {
            border: none;
            border-radius: 12px;
            padding: 10px 14px;
            background: #244f15;
            color: #fff;
            font-weight: 900;
            cursor: pointer;
            white-space: nowrap;
          }

          .summary-stack {
            display: grid;
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .summary-wrap {
            overflow-x: auto;
            width: 100%;
          }

          .summary-table {
            width: 100%;
            min-width: 900px;
            border-collapse: collapse;
          }

          .summary-table th {
            background: #244f15;
            color: #fff;
            font-size: 10px;
            font-weight: 300;
            padding: 10px 8px;
            text-align: center;
            white-space: nowrap;
          }

          .summary-table td {
            border-bottom: 1px solid #e5e7eb;
            padding: 10px 8px;
            font-size: 13px;
            text-align: center;
            white-space: nowrap;
          }

          @media (max-width: 1200px) {
            #history-page-root {
              max-width: 100%;
              padding: 16px;
            }

            .history-card {
              max-width: 100%;
            }
          }

          @media (max-width: 900px) {
            #history-page-root {
              max-width: 100%;
              padding: 14px;
            }

            .history-grid {
              grid-template-columns: 1fr;
            }

            .sensor-dd-grid {
              grid-template-columns: 1fr;
            }

            .chart-head {
              flex-direction: column;
              align-items: stretch;
            }

            .export-btn {
              width: 100%;
            }

            .history-card {
              padding: 16px;
              border-radius: 16px;
            }
          }

          @media (max-width: 640px) {
            #history-page-root {
              padding: 12px;
              gap: 14px;
            }

            .history-card {
              padding: 14px;
              border-radius: 14px;
            }

            .history-title {
              font-size: 16px;
            }

            .history-sub,
            .history-label {
              font-size: 12px;
            }

            .history-input,
            .history-select,
            .sensor-dd-trigger {
              font-size: 14px;
              min-height: 44px;
              padding: 10px 12px;
            }

            .quick-wrap {
              gap: 8px;
            }

            .quick-btn {
              flex: 1 1 calc(50% - 8px);
              text-align: center;
              padding: 10px 12px;
            }

            .sensor-dd-menu {
              padding: 10px;
              border-radius: 14px;
            }

            .sensor-dd-item {
              grid-template-columns: 20px minmax(0, 1fr);
              gap: 8px;
            }

            .sensor-dd-unit {
              grid-column: 2 / 3;
              justify-self: start;
              white-space: normal;
            }

            .summary-table th {
              font-size: 9px;
              padding: 8px 6px;
            }

            .summary-table td {
              font-size: 10px;
              padding: 8px 6px;
            }

            .chart-svg-box,
            .chart-x {
              min-width: 0;
            }
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}