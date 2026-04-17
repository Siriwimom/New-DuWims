"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import DuwimsStaticPage from "../components/DuwimsStaticPage";
import { useDuwimsT } from "../components/language-context";
import { useRouter } from "next/navigation";
const AUTH_KEYS = [
  "AUTH_TOKEN_V1",
  "token",
  "authToken",
  "pmtool_token",
  "duwims_token",
];
function getToken() {
  if (typeof window === "undefined") return "";
  for (const key of AUTH_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }
  return "";
}

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });



const PLOT_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

const SENSOR_OPTIONS = [
  { key: "temp", labelKey: "temperature", unit: "°C", nodeType: "air" },
  { key: "rh", labelKey: "relativeHumidity", unit: "%", nodeType: "air" },
  { key: "wind", labelKey: "windSpeed", unit: "m/s", nodeType: "air" },
  { key: "light", labelKey: "lightIntensity", unit: "lux", nodeType: "air" },
  { key: "rain", labelKey: "rainfall", unit: "mm", nodeType: "air" },
  { key: "soil", labelKey: "soilMoisture", unit: "%", nodeType: "soil" },
  { key: "water", labelKey: "waterAvailability", unit: "%", nodeType: "soil" },
  { key: "n", labelKey: null, unit: "%", nodeType: "soil" },
  { key: "p", labelKey: null, unit: "ppm", nodeType: "soil" },
  { key: "k", labelKey: null, unit: "cmol/kg", nodeType: "soil" },
];

function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001").replace(/\/+$/, "");
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

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function getId(obj) {
  return obj?._id || obj?.id || obj?.uid || "";
}

function sameText(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function average(nums) {
  const arr = nums.filter((n) => Number.isFinite(n));
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function formatDateInput(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDateDMY(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseFlexibleDate(value) {
  const raw =
    value?.server_timestamp ||
    value?.serverTimestamp ||
    value?.timestamp ||
    value?.ts ||
    value?.time ||
    value?.createdAt ||
    value?.updatedAt ||
    value;

  if (!raw) return null;

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }

  if (typeof raw === "object") {
    const sec = toNum(raw?.seconds ?? raw?._seconds);
    const nano = toNum(raw?.nanoseconds ?? raw?._nanoseconds) || 0;
    if (sec !== null) {
      const d = new Date(sec * 1000 + nano / 1e6);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof raw?.toDate === "function") {
      const d = raw.toDate();
      return Number.isNaN(d?.getTime?.()) ? null : d;
    }
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDayMs(value) {
  const d = parseFlexibleDate(value);
  if (!d) return null;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function buildDailyTimeline(startDate, endDate) {
  const start = startOfDayMs(startDate);
  const end = startOfDayMs(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];

  const out = [];
  for (let ts = start; ts <= end; ts += 24 * 60 * 60 * 1000) {
    out.push(ts);
  }
  return out;
}


function bucketTimestampMs(value, bucketHours = 3) {
  const d = parseFlexibleDate(value);
  if (!d) return null;
  const ts = d.getTime();
  const bucketMs = Math.max(1, bucketHours) * 60 * 60 * 1000;
  return Math.floor(ts / bucketMs) * bucketMs;
}

function formatDateTimeLabel(value, lang = "th") {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value || "-");
  return d.toLocaleString(lang === "en" ? "en-US" : "th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function normalizeDateKey(value) {
  const d = parseFlexibleDate(value);
  if (!d) return null;
  return formatDateInput(d);
}

function getTimestampFromReading(item) {
  const d = parseFlexibleDate(item);
  return d ? d.toISOString() : "";
}

function isAcceptedStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return true;
  return ["active", "on", "ok", "normal", "online", "running", "1", "true"].includes(s);
}

function colorOfSensorKey(sensorKey) {
  const colorMap = {
    temp: "#ff7043",
    rh: "#42a5f5",
    wind: "#26c6da",
    light: "#f4c542",
    rain: "#7c4dff",
    soil: "#66bb6a",
    water: "#26a69a",
    n: "#a1887f",
    p: "#ef5350",
    k: "#ecd33f",
  };
  return colorMap[sensorKey] || "#64748b";
}

function sensorUnitFromKey(key) {
  return SENSOR_OPTIONS.find((s) => s.key === key)?.unit || "-";
}

function sensorLabelFromKey(key, t) {
  const found = SENSOR_OPTIONS.find((s) => s.key === key);
  if (!found) return String(key || "-");
  if (!found.labelKey) return key.toUpperCase();
  return t?.[found.labelKey] || key;
}

function dashedByIndex(i) {
  const patterns = [0, 0, 4, 6, 8, 2, 10, 12];
  return patterns[i % patterns.length];
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
    key.includes("water_availability") ||
    key.includes("water availability") ||
    key.includes("water_potential") ||
    key.includes("water potential") ||
    key.includes("water_level") ||
    key.includes("water level") ||
    key.includes("waterlevel") ||
    key.includes("wateravailability") ||
    key.includes("irrigation") ||
    key.includes("ให้น้ำ") ||
    key.includes("ความพร้อมใช้น้ำ") ||
    key.includes("water")
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

function getObjectValueByAliases(obj, aliases = []) {
  if (!obj || typeof obj !== "object") return null;
  for (const alias of aliases) {
    const n = toNum(obj?.[alias]);
    if (n !== null) return n;
  }
  return null;
}

function pickValueForSensorKey(item, sensorKey) {
  if (!item || !sensorKey) return null;

  if (typeof item === "number") return Number.isFinite(item) ? item : null;

  const direct = toNum(item?.value);
  if (direct !== null && typeof item?.value !== "object") return direct;

  const latestValue = toNum(item?.latestValue);
  if (latestValue !== null && typeof item?.latestValue !== "object") return latestValue;

  const reading = toNum(item?.reading);
  if (reading !== null && typeof item?.reading !== "object") return reading;

  const raw = toNum(item?.raw);
  if (raw !== null && typeof item?.raw !== "object") return raw;

  const lastReading = toNum(item?.lastReading?.value);
  if (lastReading !== null) return lastReading;

  const topAliases = {
    temp: ["temp", "temperature", "t"],
    rh: ["rh", "humidity", "humid", "h"],
    wind: ["wind", "windSpeed", "wind_speed"],
    light: ["light", "lux", "lightIntensity", "light_intensity"],
    rain: ["rain", "rainfall"],
    soil: ["soil", "soilMoisture", "soil_moisture", "moisture"],
    water: [
      "water",
      "waterLevel",
      "water_level",
      "waterAvailability",
      "water_availability",
      "waterPotential",
      "water_potential",
      "irrigation",
    ],
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
    item,
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
      const v = getObjectValueByAliases(source, [
        "water",
        "waterLevel",
        "water_level",
        "waterAvailability",
        "water_availability",
        "waterPotential",
        "water_potential",
        "irrigation",
      ]);
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

function formatCell(v, unit = "") {
  if (!Number.isFinite(v)) return "-";
  return `${v.toFixed(2)}${unit ? ` ${unit}` : ""}`;
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
    nodeId: getId(node),
    nodeUid: node?.uid || "",
    nodeName: node?.nodeName || node?.name || node?.uid || "Node",
    nodeType: inferNodeType(node),
    sensors: safeArray(node?.sensors).map((sensor) => ({
      ...sensor,
      sensorId: getId(sensor),
      sensorUid: sensor?.uid || "",
      sensorName: sensor?.name || sensor?.sensorType || sensor?.uid || "",
      _frontendSensorKeys: expandSensorKeys(sensor),
    })),
  }));

  return {
    id: getId(plot),
    plotName: plot?.plotName || plot?.name || plot?.alias || t?.unknownPlot || "Unknown plot",
    nodes,
  };
}

function normalizeNodeItem(node) {
  return {
    ...node,
    nodeId: getId(node),
    nodeUid: node?.uid || "",
    nodeName: node?.nodeName || node?.name || node?.uid || "Node",
    nodeType: node?.nodeType || inferNodeType(node),
    plotId: node?.plotId || node?.plot_id || node?.plot?.id || node?.plot?._id || "",
    ownerRef: node?.ownerRef || node?.ownerUid || "",
    sensors: safeArray(node?.sensors).map((sensor) => ({
      ...sensor,
      sensorId: getId(sensor),
      sensorUid: sensor?.uid || "",
      sensorName: sensor?.name || sensor?.sensorType || sensor?.uid || "",
      _frontendSensorKeys: expandSensorKeys(sensor),
    })),
  };
}

function attachNodesToPlots(plotItems, nodeItems, t) {
  const normalizedNodes = safeArray(nodeItems).map(normalizeNodeItem).filter((node) => node.nodeId || node.nodeUid);

  return safeArray(plotItems)
    .map((item) => normalizePlot(item, t))
    .filter((p) => p.id)
    .map((plot) => {
      const inlineNodes = safeArray(plot.nodes);
      const externalNodes = normalizedNodes.filter((node) => sameText(node.plotId, plot.id));
      const seen = new Set();
      const merged = [...inlineNodes, ...externalNodes].filter((node) => {
        const key = node?.nodeId || node?.nodeUid || "";
        if (!key) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { ...plot, nodes: merged };
    });
}

function normalizeReading(item) {
  const sensorType =
    item?.sensorType ||
    item?.sensorName ||
    item?.sensor?.sensorType ||
    item?.sensor?.name ||
    item?.name ||
    "";

  const sensorKey = canonicalSensorKey(sensorType);

  return {
    id: getId(item),
    plotId:
      item?.plotId ||
      item?.plot_id ||
      item?.plot?.id ||
      item?.plot?._id ||
      "",
    nodeId:
      item?.nodeId ||
      item?.node_id ||
      item?.node?.id ||
      item?.node?._id ||
      "",
    nodeUid:
      item?.nodeUid ||
      item?.node_uid ||
      item?.node?.uid ||
      item?.uid ||
      "",
    sensorId:
      item?.sensorId ||
      item?.sensor_id ||
      item?.sensor?.id ||
      item?.sensor?._id ||
      "",
    sensorUid:
      item?.sensorUid ||
      item?.sensor_uid ||
      item?.sensor?.uid ||
      "",
    sensorType,
    sensorKey,
    timestamp: getTimestampFromReading(item),
    status: String(item?.status || item?.state || "").trim().toLowerCase(),
    rawItem: item,
  };
}

function makeSeriesKey(row) {
  return [
    row.plotId || "",
    row.nodeId || row.nodeUid || "",
    row.sensorKey || "",
  ].join("|");
}

function makeSeriesLabel(row) {
  return `${row.plotName || "Plot"} · ${row.nodeName || "Node"} · ${row.sensorLabel || "Sensor"}`;
}

export default function HistoryPage() {
  const { t, lang } = useDuwimsT();
  const router = useRouter();
  const apiBase = getApiBase();

  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/");
      return;
    }

    setAuthChecked(true);
  }, [router]);

  const txt = {
    historyFilterTitle: t?.historyFilterTitle || "ตัวกรองประวัติ",
    historyFilterSub: t?.historyFilterSub || "เลือกช่วงเวลา แปลง และประเภทเซนเซอร์",
    quickRange: t?.quickRange || "ช่วงเวลา",
    todayShort: t?.todayShort || "วันนี้",
    last7Days: t?.last7Days || "7D",
    last30Days: t?.last30Days || "30D",
    startDate: t?.startDate || "วันที่เริ่ม",
    endDate: t?.endDate || "วันที่สิ้นสุด",
    plotSelect: t?.plotSelect || "เลือกแปลง",
    allPlots: t?.allPlots || "ทุกแปลง",
    sensorType: t?.sensorType || "ประเภทเซนเซอร์",
    selectSensorType: t?.selectSensorType || "เลือกประเภทเซนเซอร์",
    done: t?.done || "เสร็จสิ้น",
    exportCsv: t?.exportCsv || "EXPORT CSV",
    chartComparePlots: t?.chartComparePlots || "กราฟเปรียบเทียบ Multi-Sensor",
    unknownPlot: t?.unknownPlot || "ไม่ทราบชื่อแปลง",
    loadPlotsFailed: t?.loadPlotsFailed || "โหลดข้อมูลแปลงไม่สำเร็จ",
    loadHistoryFailed: t?.loadHistoryFailed || "โหลดข้อมูลประวัติไม่สำเร็จ",
  };

  const today = useMemo(() => new Date(), []);
  const defaultEnd = formatDateInput(today);
  const defaultStart = formatDateInput(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
  );

  const [plots, setPlots] = useState([]);
  const [loadingPlots, setLoadingPlots] = useState(true);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [error, setError] = useState("");

  const [quickRange, setQuickRange] = useState(txt.last30Days);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const [selectedPlotIds, setSelectedPlotIds] = useState([]);
  const [plotDropdownOpen, setPlotDropdownOpen] = useState(false);

  const [selectedSensors, setSelectedSensors] = useState(SENSOR_OPTIONS.map((s) => s.key));
  const [sensorDropdownOpen, setSensorDropdownOpen] = useState(false);
  const [chartType, setChartType] = useState("line");

  const [readingMap, setReadingMap] = useState({});
  const csvRef = useRef("");

  const sensorWrapRef = useRef(null);
  const plotWrapRef = useRef(null);

  const quickRangeOptions = useMemo(
    () => [txt.todayShort, txt.last7Days, txt.last30Days],
    [txt.todayShort, txt.last7Days, txt.last30Days]
  );

  const sensorOptionsI18n = useMemo(
    () =>
      SENSOR_OPTIONS.map((s) => ({
        ...s,
        label: s.labelKey ? t?.[s.labelKey] || s.key : s.key.toUpperCase(),
      })),
    [t]
  );

  useEffect(() => {
    setQuickRange(txt.last30Days);
  }, [txt.last30Days]);

  useEffect(() => {
    let alive = true;

    async function loadPlots() {
      setLoadingPlots(true);
      setError("");
      try {
        const [plotsData, nodesData] = await Promise.all([
          apiGet("/api/plots"),
          apiGet("/api/nodes").catch(() => ({ items: [] })),
        ]);
        if (!alive) return;
        const plotItems = Array.isArray(plotsData?.items) ? plotsData.items : Array.isArray(plotsData) ? plotsData : [];
        const nodeItems = Array.isArray(nodesData?.items) ? nodesData.items : Array.isArray(nodesData) ? nodesData : [];
        setPlots(attachNodesToPlots(plotItems, nodeItems, txt));
      } catch (err) {
        if (!alive) return;
        setError(err?.message || txt.loadPlotsFailed);
        setPlots([]);
      } finally {
        if (alive) setLoadingPlots(false);
      }
    }

    loadPlots();

    return () => {
      alive = false;
    };
  }, [txt.loadPlotsFailed, txt.unknownPlot]);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (sensorWrapRef.current && !sensorWrapRef.current.contains(e.target)) {
        setSensorDropdownOpen(false);
      }
      if (plotWrapRef.current && !plotWrapRef.current.contains(e.target)) {
        setPlotDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const filteredPlots = useMemo(() => {
    if (!selectedPlotIds.length) return plots;
    return plots.filter((p) => selectedPlotIds.includes(String(p.id)));
  }, [plots, selectedPlotIds]);

  const visibleNodes = useMemo(() => {
    const rows = [];
    for (const plot of filteredPlots) {
      for (const node of safeArray(plot?.nodes)) {
        rows.push({
          plotId: plot.id,
          plotName: plot.plotName,
          nodeId: node.nodeId || getId(node),
          nodeUid: node.nodeUid || node?.uid || "",
          nodeName: node.nodeName || node?.nodeName || node?.name || node?.uid || "Node",
          nodeType: node.nodeType || inferNodeType(node),
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
    if (!selectedSensorNames.length) return txt.selectSensorType;
    return selectedSensorNames.join(", ");
  }, [selectedSensorNames, txt.selectSensorType]);

  const selectedPlotNames = useMemo(() => {
    if (!selectedPlotIds.length) return [txt.allPlots];
    return plots.filter((p) => selectedPlotIds.includes(String(p.id))).map((p) => p.plotName);
  }, [plots, selectedPlotIds, txt.allPlots]);

  const plotDropdownLabel = useMemo(() => selectedPlotNames.join(", "), [selectedPlotNames]);

  const fetchTargets = useMemo(() => {
    const targets = [];
    const seen = new Set();

    for (const plot of filteredPlots) {
      for (const node of safeArray(plot?.nodes)) {
        const key = [plot.id, node.nodeId || node.nodeUid || ""].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        targets.push({
          plotId: plot.id,
          plotName: plot.plotName,
          nodeId: node.nodeId || "",
          nodeUid: node.nodeUid || "",
          nodeName: node.nodeName || "Node",
          nodeType: node.nodeType || inferNodeType(node),
          sensors: safeArray(node?.sensors),
        });
      }
    }

    return targets;
  }, [filteredPlots]);

  useEffect(() => {
    let alive = true;

    async function loadReadings() {
      if (!fetchTargets.length) {
        setReadingMap({});
        return;
      }

      setLoadingReadings(true);
      setError("");

      try {
        const results = await Promise.all(
          fetchTargets.map(async (target) => {
            const mapKey = `${target.plotId}|${target.nodeId || target.nodeUid || ""}`;

            try {
              const allItems = [];
              const queryVariants = [];

              if (target.plotId) {
                queryVariants.push({ plotId: String(target.plotId) });
              }
              if (target.plotId && target.nodeId) {
                queryVariants.push({ plotId: String(target.plotId), nodeId: String(target.nodeId) });
              }
              if (target.plotId && target.nodeUid) {
                queryVariants.push({ plotId: String(target.plotId), nodeUid: String(target.nodeUid) });
              }
              if (target.nodeUid) {
                queryVariants.push({ nodeUid: String(target.nodeUid) });
              }
              if (target.nodeId) {
                queryVariants.push({ nodeId: String(target.nodeId) });
              }

              const seenReq = new Set();

              for (const params of queryVariants) {
                const reqKey = JSON.stringify(params);
                if (seenReq.has(reqKey)) continue;
                seenReq.add(reqKey);

                const qs = new URLSearchParams();
                qs.set("limit", "5000");

                Object.entries(params).forEach(([k, v]) => {
                  if (v) qs.set(k, v);
                });

                try {
                  const data = await apiGet(`/api/sensor-readings?${qs.toString()}`);
                  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
                  allItems.push(...items);
                } catch {}
              }

              const seenItem = new Set();
              const normalized = allItems
                .map(normalizeReading)
                .filter((item) => {
                  const key =
                    item.id ||
                    [
                      item.plotId,
                      item.nodeId || item.nodeUid,
                      item.sensorId || item.sensorUid || item.sensorKey,
                      item.timestamp,
                    ].join("|");

                  if (!key) return false;
                  if (seenItem.has(key)) return false;
                  seenItem.add(key);
                  return true;
                });

              return [mapKey, normalized];
            } catch {
              return [mapKey, []];
            }
          })
        );

        if (!alive) return;
        setReadingMap(Object.fromEntries(results));
      } catch (err) {
        if (!alive) return;
        setError(err?.message || txt.loadHistoryFailed);
        setReadingMap({});
      } finally {
        if (alive) setLoadingReadings(false);
      }
    }

    loadReadings();

    return () => {
      alive = false;
    };
  }, [fetchTargets, txt.loadHistoryFailed]);

  const targetRows = useMemo(() => {
    const out = [];
    const seen = new Set();

    for (const plot of filteredPlots) {
      for (const node of safeArray(plot?.nodes)) {
        const nodeType = node.nodeType || inferNodeType(node);
        const allowedKeys = SENSOR_OPTIONS.filter((s) => s.nodeType === nodeType).map((s) => s.key);

        for (const sensorKey of selectedSensors) {
          if (!allowedKeys.includes(sensorKey)) continue;

          const matchedSensor = safeArray(node?.sensors).find((sensor) => {
            const keys =
              safeArray(sensor?._frontendSensorKeys).length > 0
                ? sensor._frontendSensorKeys
                : expandSensorKeys(sensor);

            return keys.includes(sensorKey);
          });

          const row = {
            plotId: plot.id,
            plotName: plot.plotName,
            nodeId: node.nodeId || getId(node) || "",
            nodeUid: node.nodeUid || node?.uid || "",
            nodeName: node.nodeName || node?.nodeName || node?.name || node?.uid || "Node",
            nodeType,
            sensorId: matchedSensor?.sensorId || getId(matchedSensor) || "",
            sensorUid: matchedSensor?.sensorUid || matchedSensor?.uid || "",
            rawSensorType:
              matchedSensor?.sensorName ||
              matchedSensor?.sensorType ||
              matchedSensor?.name ||
              sensorKey,
            sensorKey,
            sensorLabel: sensorLabelFromKey(sensorKey, t),
            unit: sensorUnitFromKey(sensorKey),
            latestValue: matchedSensor?.latestValue ?? null,
            latestTimestamp:
              matchedSensor?.latestTimestamp ||
              matchedSensor?.updatedAt ||
              matchedSensor?.createdAt ||
              null,
          };

          const uniq = [row.plotId, row.nodeId || row.nodeUid, row.sensorKey].join("|");
          if (seen.has(uniq)) continue;
          seen.add(uniq);
          out.push(row);
        }
      }
    }

    return out;
  }, [filteredPlots, selectedSensors, t]);

  const filteredReadingRows = useMemo(() => {
    const rows = [];

    for (const target of targetRows) {
      const directKey = `${target.plotId}|${target.nodeId || target.nodeUid || ""}`;
      const plotOnlyPools = Object.entries(readingMap)
        .filter(([k]) => k.startsWith(`${target.plotId}|`))
        .flatMap(([, arr]) => (Array.isArray(arr) ? arr : []));
      const nodeReadings = [
        ...(Array.isArray(readingMap[directKey]) ? readingMap[directKey] : []),
        ...plotOnlyPools,
      ];
      const seenRowKeys = new Set();

      for (const item of nodeReadings) {
        const raw = item?.rawItem || item;

        const timestamp = getTimestampFromReading(raw);
        const dateKey = normalizeDateKey(timestamp);
        if (!dateKey) continue;
        if (dateKey < startDate || dateKey > endDate) continue;

        const readingStatus = String(item?.status || raw?.status || raw?.state || "").trim().toLowerCase();
        if (!isAcceptedStatus(readingStatus)) continue;

        const readingPlotId =
          item?.plotId || raw?.plotId || raw?.plot_id || raw?.plot?.id || raw?.plot?._id || "";
        const readingNodeId =
          item?.nodeId || raw?.nodeId || raw?.node_id || raw?.node?.id || raw?.node?._id || "";
        const readingNodeUid =
          item?.nodeUid || raw?.nodeUid || raw?.node_uid || raw?.node?.uid || raw?.uid || "";
        const readingSensorId =
          item?.sensorId || raw?.sensorId || raw?.sensor_id || raw?.sensor?.id || raw?.sensor?._id || "";
        const readingSensorUid =
          item?.sensorUid || raw?.sensorUid || raw?.sensor_uid || raw?.sensor?.uid || "";
        const readingSensorType =
          item?.sensorType ||
          raw?.sensorType ||
          raw?.sensorName ||
          raw?.sensor?.sensorType ||
          raw?.sensor?.name ||
          raw?.name ||
          "";

        const readingKey = canonicalSensorKey(readingSensorType);
        if (readingPlotId && !sameText(readingPlotId, target.plotId)) continue;

        const rawValue = pickValueForSensorKey(raw, target.sensorKey);
        const sensorMatched =
          sameText(readingKey, target.sensorKey) ||
          (target.sensorId && sameText(readingSensorId, target.sensorId)) ||
          (target.sensorUid && sameText(readingSensorUid, target.sensorUid)) ||
          sameText(readingSensorType, target.rawSensorType) ||
          rawValue !== null;
        if (!sensorMatched) continue;

        const nodeMatchedStrict =
          sameText(readingNodeId, target.nodeId) ||
          sameText(readingNodeUid, target.nodeUid) ||
          sameText(readingNodeUid, target.nodeId) ||
          sameText(readingNodeId, target.nodeUid);
        const nodeMissingOnReading = !readingNodeId && !readingNodeUid;
        const allowPlotLevelFallback = !nodeMatchedStrict && sensorMatched && (!target.nodeId && !target.nodeUid || nodeMissingOnReading);
        if (!nodeMatchedStrict && !allowPlotLevelFallback && readingNodeId && readingNodeUid) continue;

        const value = safeDisplayValue(target.sensorKey, rawValue);
        if (value === null) continue;

        const rowBucketTs = bucketTimestampMs(timestamp, 3) || timestamp;
        const rowKey = [
          target.plotId,
          target.nodeId || target.nodeUid || "plot-fallback",
          target.sensorKey,
          rowBucketTs,
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
          sensorUid: target.sensorUid,
          sensorKey: target.sensorKey,
          sensorLabel: target.sensorLabel,
          unit: target.unit,
          value,
          timestamp,
          status: readingStatus || "active",
          dateKey,
          source: "history",
        });
      }

      const latestTimestamp = getTimestampFromReading({ timestamp: target.latestTimestamp });
      const latestDateKey = normalizeDateKey(latestTimestamp);
      const latestValue = safeDisplayValue(
        target.sensorKey,
        pickValueForSensorKey({ latestValue: target.latestValue }, target.sensorKey)
      );

      const hasHistoryForThisTarget = rows.some(
        (r) =>
          sameText(r.plotId, target.plotId) &&
          (sameText(r.nodeId, target.nodeId) || sameText(r.nodeUid, target.nodeUid)) &&
          sameText(r.sensorKey, target.sensorKey)
      );

      if (
        latestValue !== null &&
        latestTimestamp &&
        latestDateKey &&
        latestDateKey >= startDate &&
        latestDateKey <= endDate &&
        !hasHistoryForThisTarget
      ) {
        rows.push({
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
          value: latestValue,
          timestamp: latestTimestamp,
          status: "active",
          dateKey: latestDateKey,
          source: "latest",
        });
      }
    }

    rows.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
    return rows;
  }, [targetRows, readingMap, startDate, endDate]);

  const combinedChart = useMemo(() => {
    if (!targetRows.length) return { series: [], timestamps: [] };

    const bucketHours = 3;
    const startMs = parseFlexibleDate(startDate)?.getTime?.() ?? null;
    const endMs = parseFlexibleDate(endDate)?.getTime?.() ?? null;

    const allBucketTimes = Array.from(
      new Set(
        filteredReadingRows
          .map((row) => bucketTimestampMs(row.timestamp, bucketHours))
          .filter((ts) => Number.isFinite(ts))
          .filter((ts) => {
            if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return true;
            return ts >= startMs && ts <= endMs + 86399999;
          })
      )
    ).sort((a, b) => a - b);

    const series = targetRows.map((target) => {
      const valuesByBucket = new Map();

      filteredReadingRows
        .filter(
          (row) =>
            sameText(row.plotId, target.plotId) &&
            sameText(row.sensorKey, target.sensorKey) &&
            (
              sameText(row.nodeId, target.nodeId) ||
              sameText(row.nodeUid, target.nodeUid) ||
              (!row.nodeId && !row.nodeUid)
            )
        )
        .forEach((row) => {
          const bucketTs = bucketTimestampMs(row.timestamp, bucketHours);
          if (!Number.isFinite(bucketTs)) return;

          const prev = valuesByBucket.get(bucketTs) || [];
          prev.push(row.value);
          valuesByBucket.set(bucketTs, prev);
        });

      const values = allBucketTimes.map((bucketTs) => {
        const bucketValues = valuesByBucket.get(bucketTs) || [];
        const avg = average(bucketValues);
        return Number.isFinite(avg) ? avg : null;
      });

      return {
        key: [target.plotId, target.nodeId || target.nodeUid, target.sensorKey].join("|"),
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
        label: `${target.plotName} · ${target.nodeName} · ${target.sensorLabel}`,
        timestamps: allBucketTimes.map((ts) => new Date(ts).toISOString()),
        values,
        hasAnyValue: values.some((v) => Number.isFinite(v)),
      };
    });

    return {
      series,
      timestamps: allBucketTimes.map((ts) => new Date(ts).toISOString()),
    };
  }, [targetRows, filteredReadingRows, startDate, endDate]);

  const visibleChartSeries = useMemo(
    () => safeArray(combinedChart?.series).filter((s) => s.hasAnyValue),
    [combinedChart]
  );

  const activeSensorKeys = useMemo(
    () => Array.from(new Set(visibleChartSeries.map((s) => s.sensorKey))),
    [visibleChartSeries]
  );

  const axisSensorOrder = useMemo(() => {
    return activeSensorKeys.map((sensorKey, index) => {
      const total = activeSensorKeys.length;
      const leftCount = Math.ceil(total / 2);
      const isLeft = index < leftCount;
      return { sensorKey, opposite: !isLeft };
    });
  }, [activeSensorKeys]);

  const sensorMinMax = useMemo(() => {
    const out = {};

    for (const key of activeSensorKeys) {
      const vals = visibleChartSeries
        .filter((s) => s.sensorKey === key)
        .flatMap((s) => s.values)
        .filter((v) => Number.isFinite(v));

      if (!vals.length) {
        out[key] = { min: 0, max: 100 };
        continue;
      }

      let min = Math.min(...vals);
      let max = Math.max(...vals);

      if (min === max) {
        min -= 1;
        max += 1;
      } else {
        const pad = (max - min) * 0.12;
        min -= pad;
        max += pad;
      }

      out[key] = { min, max };
    }

    return out;
  }, [visibleChartSeries, activeSensorKeys]);

  const sensorAxisIndexMap = useMemo(() => {
    const out = {};
    activeSensorKeys.forEach((key, idx) => {
      out[key] = idx;
    });
    return out;
  }, [activeSensorKeys]);

  const apexSeries = useMemo(() => {
    if (!visibleChartSeries.length) return [];

    return visibleChartSeries.map((item, idx) => ({
      name: item.label,
      yAxisIndex: sensorAxisIndexMap[item.sensorKey] || 0,
      data: item.timestamps.map((ts, i) => ({
        x: new Date(ts).getTime(),
        y: Number.isFinite(item.values[i]) ? Number(item.values[i].toFixed(2)) : null,
        rawY: Number.isFinite(item.values[i]) ? item.values[i] : null,
        unit: item.unit,
        sensorLabel: item.sensorLabel,
        sensorKey: item.sensorKey,
        plotName: item.plotName,
        nodeName: item.nodeName,
      })),
      color: colorOfSensorKey(item.sensorKey),
      dashArray: dashedByIndex(idx),
    }));
  }, [visibleChartSeries, sensorAxisIndexMap]);

  const brushSeries = useMemo(() => {
    if (!visibleChartSeries.length) return [];
    return visibleChartSeries.map((item) => ({
      name: item.label,
      data: item.timestamps.map((ts, i) => ({
        x: new Date(ts).getTime(),
        y: Number.isFinite(item.values[i]) ? Number(item.values[i].toFixed(2)) : null,
      })),
      color: colorOfSensorKey(item.sensorKey),
    }));
  }, [visibleChartSeries]);

  const yAxes = useMemo(() => {
    return activeSensorKeys.map((sensorKey) => {
      const axisSide = axisSensorOrder.find((a) => a.sensorKey === sensorKey);
      const bounds = sensorMinMax[sensorKey] || { min: 0, max: 100 };

      return {
        min: bounds.min,
        max: bounds.max,
        tickAmount: 6,
        opposite: axisSide?.opposite || false,
        forceNiceScale: true,
        show: true,
        floating: false,
        axisTicks: {
          show: true,
          color: colorOfSensorKey(sensorKey),
        },
        axisBorder: {
          show: true,
          color: colorOfSensorKey(sensorKey),
        },
        labels: {
          show: true,
          style: {
            colors: colorOfSensorKey(sensorKey),
            fontSize: "11px",
            fontWeight: 800,
          },
          formatter: (val) => Number(val).toFixed(1),
        },
        title: {
          text: sensorLabelFromKey(sensorKey, t),
          style: {
            color: colorOfSensorKey(sensorKey),
            fontSize: "12px",
            fontWeight: 900,
          },
        },
        tooltip: {
          enabled: true,
        },
      };
    });
  }, [activeSensorKeys, axisSensorOrder, sensorMinMax, t]);

  const chartSeriesLegend = useMemo(() => {
    const grouped = activeSensorKeys.map((sensorKey) => {
      const sensorItems = visibleChartSeries
        .filter((item) => item.sensorKey === sensorKey)
        .map((item, idx) => ({
          key: item.key,
          color: colorOfSensorKey(item.sensorKey),
          label: item.label,
          sensorLabel: item.sensorLabel,
          plotName: item.plotName,
          nodeName: item.nodeName,
          unit: item.unit,
          dash: dashedByIndex(idx),
          points: item.values.filter((v) => Number.isFinite(v)).length,
          plotColor:
            PLOT_COLORS[
              (selectedPlotIds.indexOf(item.plotId) >= 0 ? selectedPlotIds.indexOf(item.plotId) : idx) %
                PLOT_COLORS.length
            ] || "#94a3b8",
        }));

      return {
        sensorKey,
        sensorLabel: sensorLabelFromKey(sensorKey, t),
        unit: sensorUnitFromKey(sensorKey),
        color: colorOfSensorKey(sensorKey),
        items: sensorItems,
      };
    });

    return grouped.filter((group) => group.items.length > 0);
  }, [activeSensorKeys, visibleChartSeries, selectedPlotIds, t]);

  const selectedSensorCount = selectedSensors.length;
  const visibleSensorCount = useMemo(
    () => new Set(visibleChartSeries.map((s) => s.sensorKey)).size,
    [visibleChartSeries]
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
        const fromHistory = average(nodeRows.filter((r) => r.sensorKey === opt.key).map((r) => r.value));

        if (fromHistory !== null) {
          values[opt.key] = fromHistory;
          continue;
        }

        const fallbackSensor = safeArray(node.sensors).find((s) => {
          const keys = safeArray(s?._frontendSensorKeys).length ? s._frontendSensorKeys : expandSensorKeys(s);
          return keys.includes(opt.key);
        });

        const fallbackValue = safeDisplayValue(
          opt.key,
          pickValueForSensorKey({ latestValue: fallbackSensor?.latestValue }, opt.key)
        );

        values[opt.key] = fallbackValue;
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
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [...prev, key];
    });
  }

  function resetSensors() {
    setSelectedSensors([]);
  }

  function selectAllSensors() {
    setSelectedSensors(sensorOptionsI18n.map((s) => s.key));
  }

  function togglePlot(plotId) {
    setSelectedPlotIds((prev) => {
      const key = String(plotId);
      if (prev.includes(key)) return prev.filter((id) => id !== key);
      return [...prev, key];
    });
  }

  function clearPlots() {
    setSelectedPlotIds([]);
  }

  function selectAllPlots() {
    setSelectedPlotIds(plots.map((p) => String(p.id)));
  }

  function handleQuick(label) {
    const now = new Date();
    const end = formatDateInput(now);
    let start = end;

    if (label === txt.todayShort) {
      start = end;
    } else if (label === txt.last7Days) {
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
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `history-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const chartMeta = useMemo(() => {
    const plotText =
      !selectedPlotIds.length
        ? lang === "en"
          ? "All plots"
          : "ทุกแปลง"
        : `${selectedPlotNames.join(", ")}`;

    return `${lang === "en" ? "Range" : "ช่วง"}: ${quickRange} · ${plotText} · ${
      selectedSensors.length
    } sensor`;
  }, [selectedPlotIds, selectedPlotNames, quickRange, selectedSensors.length, lang]);

  const mainChartOptions = useMemo(() => {
    return {
      chart: {
        id: "h2MainHistoryChart",
        type: chartType,
        height: 400,
        fontFamily: "Sarabun, sans-serif",
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
        },
        zoom: {
          enabled: true,
        },
      },
      stroke: {
        curve: "smooth",
        lineCap: "round",
        width: chartType === "bar" ? 0 : 2.5,
        dashArray: apexSeries.map((s) => s.dashArray || 0),
      },
      fill: {
        type: chartType === "area" ? "gradient" : "solid",
        opacity: chartType === "area" ? 0.22 : 1,
        gradient:
          chartType === "area"
            ? {
                shadeIntensity: 1,
                opacityFrom: 0.24,
                opacityTo: 0.05,
                stops: [0, 90, 100],
              }
            : undefined,
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        show: false,
      },
      xaxis: {
        type: "datetime",
        labels: {
          datetimeUTC: false,
          formatter: (value) => {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return "";
            return d.toLocaleString(lang === "en" ? "en-US" : "th-TH", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
          },
          style: {
            fontSize: "11px",
            fontWeight: 700,
          },
        },
      },
      yaxis: yAxes,
      tooltip: {
        shared: true,
        intersect: false,
        x: {
          formatter: (value) => formatDateTimeLabel(value, lang),
        },
        y: {
          formatter: (value, { seriesIndex, dataPointIndex, w }) => {
            const point = w?.config?.series?.[seriesIndex]?.data?.[dataPointIndex];
            if (point?.rawY === null || point?.rawY === undefined || !Number.isFinite(point?.rawY)) {
              return Number(value).toFixed(2);
            }
            return `${Number(point.rawY).toFixed(2)} ${point.unit || ""}`;
          },
        },
      },
      noData: {
        text: lang === "en" ? "No chart data" : "ไม่มีข้อมูลกราฟ",
      },
      grid: {
        borderColor: "rgba(148,163,184,0.18)",
        strokeDashArray: 4,
        padding: {
          left: 28,
          right: 28,
          top: 10,
          bottom: 0,
        },
      },
      markers: {
        size: chartType === "bar" ? 0 : 1.5,
        strokeWidth: chartType === "bar" ? 0 : 1.5,
        hover: {
          sizeOffset: 4,
        },
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: "55%",
        },
      },
    };
  }, [chartType, apexSeries, lang, yAxes]);

  const brushChartOptions = useMemo(() => {
    return {
      chart: {
        id: "h2BrushHistoryChart",
        height: 95,
        type: "area",
        brush: {
          enabled: true,
          target: "h2MainHistoryChart",
        },
        selection: {
          enabled: true,
          fill: {
            color: "#90CAF9",
            opacity: 0.25,
          },
          stroke: {
            color: "#2563eb",
          },
        },
        toolbar: {
          show: false,
        },
        fontFamily: "Sarabun, sans-serif",
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "smooth",
        width: 1.5,
      },
      fill: {
        opacity: 0.14,
      },
      legend: {
        show: false,
      },
      xaxis: {
        type: "datetime",
        labels: {
          datetimeUTC: false,
          style: {
            fontSize: "10px",
            fontWeight: 700,
          },
        },
      },
      yaxis: {
        labels: {
          show: false,
        },
      },
      grid: {
        borderColor: "rgba(148,163,184,0.16)",
      },
      tooltip: {
        enabled: false,
      },
    };
  }, []);

  return (
    <DuwimsStaticPage current="history">
      <div id="history-page-root" className="history-page-shell">
        <div className="history-card filter-card">
          <div className="history-title">{txt.historyFilterTitle}</div>
          <div className="history-sub">{txt.historyFilterSub}</div>

          <div style={{ marginBottom: 12 }}>
            <div className="history-label">{txt.quickRange}</div>
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
              <label className="history-label">{txt.startDate}</label>
              <div className="date-input-wrap">
                <input
                  className="history-input history-date-input"
                  type="date"
                  value={startDate}
                  data-display={formatDisplayDateDMY(startDate) || "วัน/เดือน/ปี"}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="history-label">{txt.endDate}</label>
              <div className="date-input-wrap">
                <input
                  className="history-input history-date-input"
                  type="date"
                  value={endDate}
                  data-display={formatDisplayDateDMY(endDate) || "วัน/เดือน/ปี"}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="plot-wrap-block">
              <label className="history-label">{txt.plotSelect}</label>

              <div className="plot-dd-wrap" ref={plotWrapRef}>
                <button
                  type="button"
                  className={`plot-dd-trigger ${plotDropdownOpen ? "open" : ""}`}
                  onClick={() => setPlotDropdownOpen((v) => !v)}
                >
                  <span className="plot-dd-trigger-text">{plotDropdownLabel}</span>
                  <span className="plot-dd-trigger-arrow">{plotDropdownOpen ? "▲" : "▼"}</span>
                </button>

                {plotDropdownOpen && (
                  <div className="plot-dd-menu">
                    <div className="plot-dd-actions">
                      <button type="button" className="plot-dd-action" onClick={selectAllPlots}>
                        เลือกทั้งหมด
                      </button>
                      <button type="button" className="plot-dd-action danger" onClick={clearPlots}>
                        ลบ
                      </button>
                    </div>

                    <div className="plot-dd-grid">
                      {plots.map((plot) => {
                        const checked = selectedPlotIds.includes(String(plot.id));
                        return (
                          <label
                            key={plot.id}
                            className={`plot-dd-item ${checked ? "checked" : ""}`}
                            onClick={(e) => {
                              e.preventDefault();
                              togglePlot(plot.id);
                            }}
                          >
                            <span className="plot-dd-box">{checked ? "✓" : ""}</span>
                            <span className="plot-dd-name">{plot.plotName}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="plot-dd-footer">
                      <button
                        type="button"
                        className="plot-dd-done"
                        onClick={() => setPlotDropdownOpen(false)}
                      >
                        {txt.done}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sensor-wrap-block sensor-wrap-block-inline">
            <div className="sensor-inline-head">
              <div className="history-label" style={{ marginBottom: 0 }}>
                {txt.sensorType}
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
                      {txt.done}
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

        {loadingPlots || loadingReadings ? (
          <div className="history-card">
            <div className="chart-empty-inline">
              {lang === "en" ? "Loading data..." : "กำลังโหลดข้อมูล..."}
            </div>
          </div>
        ) : null}

        {visibleChartSeries.length ? (
          <div className="history-card chart-card">
            <div className="h2-chart-topbar">
              <div>
                <div className="h2-chart-title">📈 {txt.chartComparePlots}</div>
                <div className="h2-chart-meta">
                  {chartMeta} ·{" "}
                  {lang === "en"
                    ? `showing ${visibleSensorCount}/${selectedSensorCount} sensor types with data`
                    : `แสดง ${visibleSensorCount}/${selectedSensorCount} ประเภทเซนเซอร์ที่มีข้อมูล`}
                </div>
                <div className="h2-chart-sub">
                  {lang === "en"
                    ? "This chart uses real sensor values and separates toolbar from legend."
                    : "กราฟนี้ใช้ค่าจริงของแต่ละเซนเซอร์ และแยกส่วนข้อมูลออกจากปุ่มซูมแล้ว"}
                </div>
                <div className="h2-chart-sub" style={{ marginTop: 6 }}>
                  {lang === "en"
                    ? `targets: ${targetRows.length} · visible series: ${visibleChartSeries.length} · readings: ${filteredReadingRows.length}`
                    : `targets: ${targetRows.length} · เส้นที่แสดง: ${visibleChartSeries.length} · จำนวน readings: ${filteredReadingRows.length}`}
                </div>
              </div>

              <div className="h2-chart-actions">
                <div className="h2-type-toggle">
                  <button
                    type="button"
                    className={`h2-type-btn ${chartType === "line" ? "active" : ""}`}
                    onClick={() => setChartType("line")}
                  >
                    📈 Line
                  </button>
                  <button
                    type="button"
                    className={`h2-type-btn ${chartType === "area" ? "active" : ""}`}
                    onClick={() => setChartType("area")}
                  >
                    🏔 Area
                  </button>
                  <button
                    type="button"
                    className={`h2-type-btn ${chartType === "bar" ? "active" : ""}`}
                    onClick={() => setChartType("bar")}
                  >
                    📊 Bar
                  </button>
                </div>

                <button type="button" className="h2-export-btn" onClick={exportCsv}>
                  ↓ {txt.exportCsv}
                </button>
              </div>
            </div>

            <div className="chart-main-row">
              <div className="chart-main-col">
                <div className="chart-wrap chart-wrap-apex">
                  <ReactApexChart
                    type={chartType}
                    height={440}
                    series={apexSeries}
                    options={mainChartOptions}
                  />
                </div>
              </div>

              {chartSeriesLegend.length ? (
                <aside className="chart-right-legend">
                  <div className="chart-right-legend-title">
                    📚 {lang === "en" ? "Legend" : "คำอธิบายเส้นกราฟ"}
                  </div>
                  <div className="chart-right-legend-list">
                    {chartSeriesLegend.map((group) => (
                      <div key={group.sensorKey} className="chart-right-legend-group">
                        <div
                          className="chart-right-legend-group-title"
                          style={{ borderLeftColor: group.color }}
                        >
                          {group.sensorLabel} ({group.unit})
                        </div>
                        <div className="chart-right-legend-group-items">
                          {group.items.map((item) => (
                            <div
                              key={item.key}
                              className="chart-right-legend-item"
                              title={`${item.label} (${item.unit})`}
                            >
                              <div className="chart-right-legend-visual">
                                <span
                                  className="chart-series-line"
                                  style={{
                                    color: item.plotColor,
                                    borderTopStyle: item.dash ? "dashed" : "solid",
                                  }}
                                />
                                <span
                                  className="chart-series-dot"
                                  style={{
                                    background: group.color,
                                    boxShadow: `0 0 0 3px ${item.plotColor}22`,
                                  }}
                                />
                              </div>
                              <div className="chart-right-legend-texts">
                                <div className="chart-right-legend-main">{item.plotName}</div>
                                <div className="chart-right-legend-sub">{item.nodeName}</div>
                                <div className="chart-right-legend-meta">{item.points} pts</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>
              ) : null}
            </div>

            <div className="h2-brush-label">
              📍 {lang === "en" ? "Drag to zoom timeline" : "ลากเพื่อซูมช่วงเวลา"}
            </div>

            <div className="chart-wrap chart-wrap-brush">
              <ReactApexChart
                type="area"
                height={95}
                series={brushSeries}
                options={brushChartOptions}
              />
            </div>


          </div>
        ) : (
          !loadingPlots &&
          !loadingReadings && (
            <div className="history-card">
              <div className="chart-empty-inline">
                {lang === "en"
                  ? "No data available for the selected period."
                  : "ไม่มีข้อมูลสำหรับกราฟในช่วงที่เลือก"}
              </div>
            </div>
          )
        )}

        <div className="history-card">
          <div className="history-title" style={{ marginBottom: 10 }}>
            {lang === "en" ? "Air Node Summary" : "สรุป Air Node"}
          </div>

          <div className="table-scroll">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>{lang === "en" ? "Plot" : "แปลง"}</th>
                  <th>{lang === "en" ? "Node" : "Node"}</th>
                  <th>{sensorLabelFromKey("temp", t)}</th>
                  <th>{sensorLabelFromKey("rh", t)}</th>
                  <th>{sensorLabelFromKey("wind", t)}</th>
                  <th>{sensorLabelFromKey("light", t)}</th>
                  <th>{sensorLabelFromKey("rain", t)}</th>
                </tr>
              </thead>
              <tbody>
                {airNodeSummaryRows.length ? (
                  airNodeSummaryRows.map((row, idx) => (
                    <tr key={`${row.plotName}-${row.nodeName}-${idx}`}>
                      <td>{row.plotName}</td>
                      <td>{row.nodeName}</td>
                      <td>{formatCell(row.values.temp, sensorUnitFromKey("temp"))}</td>
                      <td>{formatCell(row.values.rh, sensorUnitFromKey("rh"))}</td>
                      <td>{formatCell(row.values.wind, sensorUnitFromKey("wind"))}</td>
                      <td>{formatCell(row.values.light, sensorUnitFromKey("light"))}</td>
                      <td>{formatCell(row.values.rain, sensorUnitFromKey("rain"))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="table-empty" colSpan={7}>
                      {lang === "en" ? "No Air Node data" : "ไม่มีข้อมูล Air Node"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="history-card">
          <div className="history-title" style={{ marginBottom: 10 }}>
            {lang === "en" ? "Soil Node Summary" : "สรุป Soil Node"}
          </div>

          <div className="table-scroll">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>{lang === "en" ? "Plot" : "แปลง"}</th>
                  <th>{lang === "en" ? "Node" : "Node"}</th>
                  <th>{sensorLabelFromKey("soil", t)}</th>
                  <th>{sensorLabelFromKey("water", t)}</th>
                  <th>{sensorLabelFromKey("n", t)}</th>
                  <th>{sensorLabelFromKey("p", t)}</th>
                  <th>{sensorLabelFromKey("k", t)}</th>
                </tr>
              </thead>
              <tbody>
                {soilNodeSummaryRows.length ? (
                  soilNodeSummaryRows.map((row, idx) => (
                    <tr key={`${row.plotName}-${row.nodeName}-${idx}`}>
                      <td>{row.plotName}</td>
                      <td>{row.nodeName}</td>
                      <td>{formatCell(row.values.soil, sensorUnitFromKey("soil"))}</td>
                      <td>{formatCell(row.values.water, sensorUnitFromKey("water"))}</td>
                      <td>{formatCell(row.values.n, sensorUnitFromKey("n"))}</td>
                      <td>{formatCell(row.values.p, sensorUnitFromKey("p"))}</td>
                      <td>{formatCell(row.values.k, sensorUnitFromKey("k"))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="table-empty" colSpan={7}>
                      {lang === "en" ? "No Soil Node data" : "ไม่มีข้อมูล Soil Node"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <style jsx>{`
          .history-page-shell {
            padding: 16px;
            display: grid;
            gap: 16px;
          }

          .history-card {
            background: #ffffff;
            border: 1px solid #e5efe1;
            border-radius: 22px;
            padding: 18px;
            box-shadow: 0 10px 30px rgba(60, 86, 33, 0.08);
          }

          .filter-card {
            position: relative;
            z-index: 3;
          }

          .history-title {
            font-size: 20px;
            font-weight: 900;
            color: #244f15;
            margin-bottom: 6px;
          }

          .history-sub {
            font-size: 13px;
            font-weight: 700;
            color: #64748b;
            margin-bottom: 14px;
          }

          .history-label {
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 900;
            color: #244f15;
          }

          .quick-wrap {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .quick-btn {
            border: 1px solid #d7e5d1;
            background: #f8fbf7;
            color: #244f15;
            border-radius: 999px;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 900;
            cursor: pointer;
          }

          .quick-btn.active {
            background: #2f6f1e;
            color: #ffffff;
            border-color: #2f6f1e;
          }

          .history-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1.2fr;
            gap: 14px;
          }

          .history-input {
            width: 100%;
            height: 46px;
            border-radius: 14px;
            border: 1px solid #dbe6d6;
            padding: 0 14px;
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            outline: none;
            background: #fff;
          }

          .date-input-wrap {
            position: relative;
          }

          .history-date-input {
            position: relative;
            color: transparent;
            caret-color: transparent;
          }

          .history-date-input::-webkit-datetime-edit,
          .history-date-input::-webkit-datetime-edit-text,
          .history-date-input::-webkit-datetime-edit-month-field,
          .history-date-input::-webkit-datetime-edit-day-field,
          .history-date-input::-webkit-datetime-edit-year-field {
            color: transparent;
          }

          .history-date-input::before {
            content: attr(data-display);
            position: absolute;
            left: 14px;
            right: 42px;
            top: 50%;
            transform: translateY(-50%);
            color: #0f172a;
            font-size: 14px;
            font-weight: 700;
            line-height: 1;
            pointer-events: none;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .history-date-input::-webkit-calendar-picker-indicator {
            opacity: 1;
            cursor: pointer;
            position: relative;
            z-index: 2;
          }

          .plot-dd-wrap,
          .sensor-dd-wrap {
            position: relative;
          }

          .plot-dd-trigger,
          .sensor-dd-trigger {
            width: 100%;
            min-height: 46px;
            border: 1px solid #dbe6d6;
            border-radius: 14px;
            padding: 10px 14px;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            cursor: pointer;
          }

          .plot-dd-trigger.open,
          .sensor-dd-trigger.open {
            border-color: #5b8f48;
            box-shadow: 0 0 0 3px rgba(91, 143, 72, 0.1);
          }

          .plot-dd-trigger-text,
          .sensor-dd-trigger-text {
            text-align: left;
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.3;
            flex: 1 1 auto;
          }

          .plot-dd-trigger-arrow,
          .sensor-dd-trigger-arrow {
            font-size: 12px;
            font-weight: 900;
            color: #2f6f1e;
            flex: 0 0 auto;
          }

          .plot-dd-menu,
          .sensor-dd-menu {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            background: #ffffff;
            border: 1px solid #dfe9da;
            border-radius: 18px;
            padding: 14px;
            box-shadow: 0 18px 40px rgba(31, 41, 55, 0.16);
            z-index: 40;
          }

          .plot-dd-actions,
          .sensor-dd-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 14px;
          }

          .plot-dd-action,
          .sensor-dd-action {
            border: none;
            background: #edf4ea;
            color: #244f15;
            border-radius: 12px;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 900;
            cursor: pointer;
          }

          .plot-dd-action.danger,
          .sensor-dd-action.danger {
            background: #fff1f2;
            color: #dc2626;
          }

          .plot-dd-grid,
          .sensor-dd-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .plot-dd-item,
          .sensor-dd-item {
            display: flex;
            align-items: center;
            gap: 10px;
            min-height: 52px;
            border: 1px solid #5a7f43;
            border-radius: 16px;
            padding: 0 14px;
            background: #f8fbf7;
            cursor: pointer;
          }

          .plot-dd-item.checked,
          .sensor-dd-item.checked {
            background: #eef6eb;
            border-color: #2f6f1e;
          }

          .plot-dd-box,
          .sensor-dd-box {
            width: 24px;
            height: 24px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #2f6f1e;
            color: #fff;
            font-size: 15px;
            font-weight: 900;
            flex: 0 0 auto;
          }

          .plot-dd-name,
          .sensor-dd-name {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            flex: 1 1 auto;
          }

          .sensor-dd-unit {
            font-size: 12px;
            font-weight: 900;
            color: #64748b;
            flex: 0 0 auto;
          }

          .plot-dd-footer,
          .sensor-dd-footer {
            display: flex;
            justify-content: flex-end;
            margin-top: 14px;
          }

          .plot-dd-done,
          .sensor-dd-done {
            border: none;
            background: #2f6f1e;
            color: #fff;
            border-radius: 14px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 900;
            cursor: pointer;
            box-shadow: 0 10px 20px rgba(47, 111, 30, 0.18);
          }

          .sensor-wrap-block-inline {
            margin-top: 6px;
          }

          .h2-chart-topbar {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
            margin-bottom: 14px;
          }

          .h2-chart-title {
            font-size: 22px;
            font-weight: 900;
            color: #244f15;
            margin-bottom: 4px;
          }

          .h2-chart-meta {
            font-size: 13px;
            font-weight: 800;
            color: #64748b;
            margin-bottom: 4px;
          }

          .h2-chart-sub {
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
          }

          .h2-chart-actions {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }

          .h2-type-toggle {
            display: inline-flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .h2-type-btn {
            border: none;
            background: #edf4ea;
            color: #244f15;
            border-radius: 999px;
            padding: 12px 18px;
            font-size: 13px;
            font-weight: 900;
            cursor: pointer;
          }

          .h2-type-btn.active {
            background: linear-gradient(135deg, #2d6cdf, #3b82f6);
            color: #fff;
          }

          .h2-export-btn {
            border: none;
            background: #15903a;
            color: #fff;
            border-radius: 16px;
            padding: 13px 18px;
            font-size: 13px;
            font-weight: 900;
            cursor: pointer;
          }

          .chart-main-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 300px;
            gap: 14px;
            align-items: start;
          }

          .chart-main-col {
            min-width: 0;
          }

          .chart-right-legend {
            border: 1px solid #e4ede0;
            background: #f8fbf7;
            border-radius: 18px;
            padding: 12px;
            max-height: 448px;
            overflow: auto;
          }

          .chart-right-legend-title {
            font-size: 15px;
            font-weight: 900;
            color: #244f15;
            margin-bottom: 10px;
          }

          .chart-right-legend-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .chart-right-legend-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .chart-right-legend-group-title {
            font-size: 11px;
            font-weight: 900;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            padding-left: 8px;
            border-left: 3px solid #22c55e;
            margin-left: 4px;
          }

          .chart-right-legend-group-items {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .chart-right-legend-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            min-width: 0;
            background: #ffffff;
            border: 1px solid #e4ede0;
            border-radius: 14px;
            padding: 10px 12px;
          }

          .chart-right-legend-visual {
            position: relative;
            width: 34px;
            min-width: 34px;
            height: 16px;
            display: flex;
            align-items: center;
          }

          .chart-right-legend-texts {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .chart-right-legend-main {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.2;
          }

          .chart-right-legend-sub,
          .chart-right-legend-meta {
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
            line-height: 1.25;
            word-break: break-word;
          }

          .chart-series-legend {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 14px;
          }

          .chart-series-chip {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            background: #f8fbf7;
            border: 1px solid #e4ede0;
            border-radius: 14px;
            padding: 10px 12px;
          }

          .chart-series-line {
            width: 30px;
            min-width: 30px;
            height: 0;
            border-top-width: 3.5px;
            border-top-color: currentColor;
            border-top-style: solid;
            border-radius: 999px;
          }

          .chart-series-dot {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 10px;
            height: 10px;
            border-radius: 999px;
            border: 2px solid #ffffff;
          }

          .chart-series-label {
            min-width: 0;
            font-size: 12px;
            font-weight: 800;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .chart-series-unit {
            color: #64748b;
            font-weight: 900;
          }

          .chart-wrap {
            width: 100%;
            overflow: hidden;
          }

          .chart-wrap-apex {
            border: 1px solid #edf2f7;
            border-radius: 18px;
            padding: 10px 8px 6px;
            background: #fff;
          }

          .chart-wrap-brush {
            margin-top: 8px;
            border: 1px solid #edf2f7;
            border-radius: 14px;
            padding: 8px;
            background: #fff;
          }

          .h2-brush-label {
            margin-top: 14px;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 800;
            color: #64748b;
          }

          .chart-empty-inline {
            font-size: 13px;
            color: #64748b;
            font-weight: 700;
          }

          .table-scroll {
            overflow-x: auto;
          }

          .summary-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            min-width: 780px;
          }

          .summary-table th,
          .summary-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #edf2f7;
            text-align: left;
            font-size: 13px;
          }

          .summary-table th {
            color: #244f15;
            font-weight: 900;
            background: #f8fbf7;
          }

          .summary-table td {
            color: #1f2937;
            font-weight: 700;
          }

          .table-empty {
            text-align: center !important;
            color: #64748b !important;
            font-weight: 700;
          }

          @media (max-width: 1180px) {
            .chart-main-row {
              grid-template-columns: 1fr;
            }

            .chart-right-legend {
              max-height: none;
            }

            .chart-series-legend {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 980px) {
            .history-grid {
              grid-template-columns: 1fr;
            }

            .plot-dd-grid,
            .sensor-dd-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 640px) {
            .history-page-shell {
              padding: 12px;
            }

            .history-card {
              padding: 14px;
            }

            .h2-chart-topbar {
              gap: 10px;
            }
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}