"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DuwimsStaticPage from "../components/DuwimsStaticPage";

const AUTH_KEYS = [
  "AUTH_TOKEN_V1",
  "token",
  "authToken",
  "pmtool_token",
  "duwims_token",
];

const DEFAULT_SENSOR_OPTIONS = [
  { label: "ความชื้นในดิน", unit: "%" },
  { label: "อุณหภูมิ", unit: "°C" },
  { label: "ความชื้นสัมพัทธ์", unit: "%" },
  { label: "N", unit: "%" },
  { label: "P", unit: "ppm" },
  { label: "K", unit: "cmol/kg" },
  { label: "ความเข้มแสง", unit: "lux" },
  { label: "ปริมาณน้ำฝน", unit: "mm" },
  { label: "ความเร็วลม", unit: "m/s" },
  { label: "การให้น้ำ", unit: "L" },
];

function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001").replace(/\/+$/, "");
}

function getToken() {
  if (typeof window === "undefined") return "";
  for (const k of AUTH_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v) return v;
  }
  return "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJsString(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "");
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatDateInput(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function formatThaiDateLabel(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
  });
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

function average(nums) {
  const arr = nums.filter((n) => Number.isFinite(n));
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function buildDateRange(startDate, endDate) {
  const out = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return out;

  const cur = new Date(start);
  while (cur <= end) {
    out.push(formatDateInput(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function colorOfIndex(i) {
  const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];
  return colors[i % colors.length];
}

function polylinePoints(values, minY, maxY, width = 900, height = 220) {
  if (!values.length) return "";
  const stepX = values.length === 1 ? 0 : width / (values.length - 1);

  return values
    .map((v, i) => {
      const x = Math.round(i * stepX);
      const safeV = Number.isFinite(v) ? v : minY;
      const ratio = maxY === minY ? 0.5 : (safeV - minY) / (maxY - minY);
      const y = Math.round(height - ratio * height);
      return `${x},${y}`;
    })
    .join(" ");
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

function canonicalSensorLabel(name = "") {
  const key = String(name || "").trim().toLowerCase();

  if (
    key.includes("soil_moisture") ||
    key.includes("soil moisture") ||
    key === "soil" ||
    key.includes("moisture") ||
    key.includes("ความชื้นในดิน")
  ) {
    return "ความชื้นในดิน";
  }

  if (
    key.includes("temp_rh") ||
    key.includes("temperature") ||
    key === "temp" ||
    key.includes("อุณหภูมิ")
  ) {
    return "อุณหภูมิ";
  }

  if (
    key.includes("humidity") ||
    key === "rh" ||
    key.includes("ความชื้นสัมพัทธ์") ||
    key === "ความชื้น"
  ) {
    return "ความชื้นสัมพัทธ์";
  }

  if (key === "n" || key.includes("ไนโตรเจน")) return "N";
  if (key === "p" || key.includes("ฟอสฟอรัส")) return "P";
  if (key === "k" || key.includes("โพแทสเซียม")) return "K";
  if (key.includes("npk")) return "NPK";
  if (key.includes("light") || key.includes("แสง")) return "ความเข้มแสง";
  if (key.includes("rain") || key.includes("ฝน")) return "ปริมาณน้ำฝน";
  if (key.includes("wind") || key.includes("ลม")) return "ความเร็วลม";
  if (key.includes("water") || key.includes("ให้น้ำ")) return "การให้น้ำ";

  return String(name || "ไม่ทราบชื่อเซนเซอร์").trim();
}

function sensorUnit(label) {
  switch (label) {
    case "ความชื้นในดิน":
      return "%";
    case "อุณหภูมิ":
      return "°C";
    case "ความชื้นสัมพัทธ์":
      return "%";
    case "ความเข้มแสง":
      return "lux";
    case "ปริมาณน้ำฝน":
      return "mm";
    case "ความเร็วลม":
      return "m/s";
    case "การให้น้ำ":
      return "L";
    case "N":
      return "%";
    case "P":
      return "ppm";
    case "K":
      return "cmol/kg";
    default:
      return "";
  }
}

function getId(obj) {
  return obj?._id || obj?.id || obj?.uid || "";
}

function getTimestampFromReading(item) {
  return item?.timestamp || item?.ts || item?.time || item?.createdAt || item?.updatedAt || "";
}

function getValueFromReading(item) {
  const direct = toNum(item?.value);
  if (direct !== null) return direct;

  const reading = toNum(item?.reading);
  if (reading !== null) return reading;

  const raw = toNum(item?.raw);
  if (raw !== null) return raw;

  const last = toNum(item?.lastReading?.value);
  if (last !== null) return last;

  return null;
}

function normalizePlot(plot) {
  return {
    id: getId(plot),
    plotName: plot?.plotName || plot?.name || plot?.alias || "ไม่ทราบชื่อแปลง",
    nodes: Array.isArray(plot?.nodes) ? plot.nodes : [],
  };
}

function normalizeSensor(sensor) {
  const label = canonicalSensorLabel(sensor?.sensorType || sensor?.name || sensor?.uid || "");
  return {
    id: getId(sensor),
    uid: sensor?.uid || "",
    name: sensor?.name || sensor?.sensorType || sensor?.uid || "",
    label,
    unit: sensorUnit(label),
    status: sensor?.status || sensor?.lastReading?.status || "",
  };
}

function normalizeReading(item) {
  return {
    id: getId(item),
    sensorId: item?.sensorId || item?.sensor_id || item?.sensor?.id || item?.sensor?._id || "",
    nodeId: item?.nodeId || item?.node_id || item?.node?.id || item?.node?._id || "",
    plotId: item?.plotId || item?.plot_id || item?.plot?.id || item?.plot?._id || "",
    timestamp: getTimestampFromReading(item),
    value: getValueFromReading(item),
    status: item?.status || item?.state || "",
    raw: item,
  };
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

export default function HistoryPage() {
  const today = useMemo(() => new Date(), []);
  const defaultEnd = formatDateInput(today);
  const defaultStart = formatDateInput(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)
  );

  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [error, setError] = useState("");

  const [quickRange, setQuickRange] = useState("7 วันล่าสุด");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedPlotId, setSelectedPlotId] = useState("all");
  const [selectedSensors, setSelectedSensors] = useState(["ความชื้นในดิน"]);
  const [sensorDropdownOpen, setSensorDropdownOpen] = useState(false);

  const [readingMap, setReadingMap] = useState({});
  const csvRef = useRef("");

  useEffect(() => {
    let alive = true;

    async function loadPlots() {
      setLoading(true);
      setError("");

      try {
        const data = await apiGet("/api/plots");
        if (!alive) return;

        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const normalized = items.map(normalizePlot).filter((p) => p.id);
        setPlots(normalized);
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "ไม่สามารถโหลดข้อมูลแปลงได้");
        setPlots([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadPlots();
    return () => {
      alive = false;
    };
  }, []);

  const sensorOptions = useMemo(() => {
    const map = new Map();

    for (const item of DEFAULT_SENSOR_OPTIONS) {
      map.set(item.label, item);
    }

    for (const plot of plots) {
      const nodes = Array.isArray(plot?.nodes) ? plot.nodes : [];
      for (const node of nodes) {
        const sensors = Array.isArray(node?.sensors) ? node.sensors : [];
        for (const rawSensor of sensors) {
          const sensor = normalizeSensor(rawSensor);
          if (!sensor.label) continue;
          map.set(sensor.label, {
            label: sensor.label,
            unit: sensor.unit || sensorUnit(sensor.label),
          });
        }
      }
    }

    const arr = [...map.values()];
    arr.sort((a, b) => a.label.localeCompare(b.label, "th"));
    return arr;
  }, [plots]);

  useEffect(() => {
    if (!sensorOptions.length) return;
    setSelectedSensors((prev) => {
      const valid = prev.filter((x) => sensorOptions.some((s) => s.label === x));
      return valid.length ? valid : [sensorOptions[0].label];
    });
  }, [sensorOptions]);

  const filteredPlots = useMemo(() => {
    if (selectedPlotId === "all") return plots;
    return plots.filter((p) => String(p.id) === String(selectedPlotId));
  }, [plots, selectedPlotId]);

  const sensorTargets = useMemo(() => {
    const targets = [];

    for (const plot of filteredPlots) {
      const nodes = Array.isArray(plot?.nodes) ? plot.nodes : [];
      for (const node of nodes) {
        const sensors = Array.isArray(node?.sensors) ? node.sensors : [];
        for (const rawSensor of sensors) {
          const sensor = normalizeSensor(rawSensor);
          if (!sensor.id) continue;
          if (!selectedSensors.includes(sensor.label)) continue;

          targets.push({
            plotId: plot.id,
            plotName: plot.plotName,
            nodeId: getId(node),
            nodeName: node?.nodeName || node?.name || node?.uid || "Node",
            nodeType: inferNodeType(node),
            sensorId: sensor.id,
            sensorUid: sensor.uid,
            sensorName: sensor.name,
            sensorLabel: sensor.label,
            unit: sensor.unit,
            status: sensor.status,
          });
        }
      }
    }

    return targets;
  }, [filteredPlots, selectedSensors]);

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
          sensorTargets.map(async (t) => {
            try {
              const qs = new URLSearchParams({
                sensorId: String(t.sensorId),
                plotId: String(t.plotId),
                nodeId: String(t.nodeId),
                limit: "1000",
              });

              const data = await apiGet(`/api/sensor-readings?${qs.toString()}`);
              const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
              const normalized = items.map(normalizeReading);
              return [t.sensorId, normalized];
            } catch {
              return [t.sensorId, []];
            }
          })
        );

        if (!alive) return;
        setReadingMap(Object.fromEntries(results));
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "ไม่สามารถโหลดข้อมูลย้อนหลังได้");
        setReadingMap({});
      } finally {
        if (alive) setLoadingReadings(false);
      }
    }

    loadReadings();
    return () => {
      alive = false;
    };
  }, [sensorTargets]);

  useEffect(() => {
    const onDocClick = (e) => {
      const wrap = document.getElementById("sensor-type-dropdown-wrap");
      if (!wrap) return;
      if (!wrap.contains(e.target)) {
        setSensorDropdownOpen(false);
      }
    };

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const dateKeys = useMemo(() => buildDateRange(startDate, endDate), [startDate, endDate]);

  const filteredReadingRows = useMemo(() => {
    const rows = [];

    for (const target of sensorTargets) {
      const items = Array.isArray(readingMap[target.sensorId]) ? readingMap[target.sensorId] : [];

      for (const item of items) {
        const timestamp = getTimestampFromReading(item);
        const dateKey = normalizeDateKey(timestamp);
        if (!dateKey) continue;
        if (dateKey < startDate || dateKey > endDate) continue;

        const value =
          item?.value !== undefined && item?.value !== null
            ? toNum(item.value)
            : getValueFromReading(item);

        if (value === null) continue;

        rows.push({
          plotId: target.plotId,
          plotName: target.plotName,
          nodeId: target.nodeId,
          nodeName: target.nodeName,
          nodeType: target.nodeType,
          sensorId: target.sensorId,
          sensorLabel: target.sensorLabel,
          sensorName: target.sensorName,
          value,
          timestamp,
          status: item?.status || target.status || "",
          dateKey,
        });
      }
    }

    return rows;
  }, [sensorTargets, readingMap, startDate, endDate]);

  const firstSelectedSensor =
    selectedSensors[0] || (sensorOptions[0]?.label ?? "ความชื้นในดิน");

  const chartSeries = useMemo(() => {
    const byPlot = new Map();

    for (const plot of filteredPlots) {
      const valuesByDate = new Map(dateKeys.map((d) => [d, []]));

      filteredReadingRows
        .filter((r) => r.plotId === plot.id && r.sensorLabel === firstSelectedSensor)
        .forEach((row) => {
          if (!valuesByDate.has(row.dateKey)) valuesByDate.set(row.dateKey, []);
          valuesByDate.get(row.dateKey).push(row.value);
        });

      const values = dateKeys.map((d) => average(valuesByDate.get(d) || []));
      byPlot.set(plot.id, {
        plotId: plot.id,
        plotName: plot.plotName || "ไม่ทราบชื่อแปลง",
        values,
      });
    }

    return [...byPlot.values()];
  }, [filteredPlots, filteredReadingRows, firstSelectedSensor, dateKeys]);

  const chartMinMax = useMemo(() => {
    const vals = chartSeries.flatMap((s) => s.values).filter((n) => Number.isFinite(n));
    if (!vals.length) return { min: 0, max: 100 };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) return { min: min - 1, max: max + 1 };
    const pad = (max - min) * 0.1;
    return { min: min - pad, max: max + pad };
  }, [chartSeries]);

  const summaryRows = useMemo(() => {
    const labels = [
      "ความชื้นในดิน",
      "อุณหภูมิ",
      "ความชื้นสัมพัทธ์",
      "N",
      "P",
      "K",
      "ความเข้มแสง",
      "ปริมาณน้ำฝน",
      "ความเร็วลม",
      "การให้น้ำ",
    ];

    return filteredPlots.map((plot) => {
      const plotRows = filteredReadingRows.filter((r) => r.plotId === plot.id);
      const firstNode = (Array.isArray(plot?.nodes) ? plot.nodes[0] : null) || null;
      const nodeType = firstNode ? inferNodeType(firstNode) : "air";

      const values = {};
      for (const label of labels) {
        values[label] = average(
          plotRows.filter((r) => r.sensorLabel === label).map((r) => r.value)
        );
      }

      return {
        plotName: plot?.plotName || "ไม่ทราบชื่อแปลง",
        nodeType,
        values,
      };
    });
  }, [filteredPlots, filteredReadingRows]);

  const csvRows = useMemo(() => {
    const header = ["plot", "node", "nodeType", "sensor", "value", "timestamp", "status"];
    const body = filteredReadingRows.map((r) => [
      r.plotName,
      r.nodeName,
      r.nodeType,
      r.sensorLabel,
      r.value ?? "",
      r.timestamp ?? "",
      r.status ?? "",
    ]);

    return [header, ...body];
  }, [filteredReadingRows]);

  useEffect(() => {
    csvRef.current = makeCsv(csvRows);
  }, [csvRows]);

  useEffect(() => {
    window.historyPageApi = {
      selectQuick: (label) => {
        const now = new Date();
        const end = formatDateInput(now);
        let start = end;

        if (label === "วันนี้") {
          start = end;
        } else if (label === "7 วันล่าสุด") {
          start = formatDateInput(
            new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
          );
        } else if (label === "30 วันล่าสุด") {
          start = formatDateInput(
            new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
          );
        }

        setQuickRange(label);
        setStartDate(start);
        setEndDate(end);
      },

      setStartDate: (value) => setStartDate(String(value || "")),
      setEndDate: (value) => setEndDate(String(value || "")),
      setPlot: (value) => setSelectedPlotId(String(value || "all")),

      toggleSensor: (label) => {
        setSelectedSensors((prev) => {
          if (prev.includes(label)) {
            const next = prev.filter((x) => x !== label);
            return next.length ? next : prev;
          }
          return [...prev, label];
        });
      },

      toggleSensorDropdown: () => setSensorDropdownOpen((prev) => !prev),
      closeSensorDropdown: () => setSensorDropdownOpen(false),

      exportCsv: () => {
        const blob = new Blob([csvRef.current], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `history-${startDate}-to-${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
    };

    return () => {
      delete window.historyPageApi;
    };
  }, [startDate, endDate]);

  const legendHtml = chartSeries
    .map(
      (item, i) => `
        <div class="legend-item">
          <div class="legend-dot" style="background:${colorOfIndex(i)}"></div>
          ${escapeHtml(item.plotName)}
        </div>
      `
    )
    .join("");

  const gridLabels = (() => {
    const min = chartMinMax.min;
    const max = chartMinMax.max;
    const step = (max - min) / 4;
    return [max, max - step, max - step * 2, max - step * 3, min].map((n) =>
      Number.isFinite(n) ? Number(n.toFixed(2)) : "-"
    );
  })();

  const chartGridHtml = gridLabels
    .map(
      (label) => `
      <div class="chart-grid-line"><span class="chart-grid-label">${escapeHtml(label)}</span></div>
    `
    )
    .join("");

  const chartLinesHtml = [
    `<line x1="0" y1="44" x2="900" y2="44" stroke="rgba(93,184,102,0.12)" stroke-width="1"/>`,
    `<line x1="0" y1="88" x2="900" y2="88" stroke="rgba(93,184,102,0.12)" stroke-width="1"/>`,
    `<line x1="0" y1="132" x2="900" y2="132" stroke="rgba(93,184,102,0.12)" stroke-width="1"/>`,
    `<line x1="0" y1="176" x2="900" y2="176" stroke="rgba(93,184,102,0.12)" stroke-width="1"/>`,
    ...chartSeries.map((series, i) => {
      const safeValues = series.values.map((v) =>
        Number.isFinite(v) ? v : chartMinMax.min
      );
      const points = polylinePoints(safeValues, chartMinMax.min, chartMinMax.max, 900, 220);
      return `<polyline fill="none" stroke="${colorOfIndex(i)}" stroke-width="2.5" stroke-linejoin="round" points="${points}"/>`;
    }),
  ].join("");

  const xLabelsHtml = dateKeys
    .map((d) => `<span class="chart-x-label">${escapeHtml(formatThaiDateLabel(d))}</span>`)
    .join("");

  const plotOptionsHtml = [
    `<option value="all" ${selectedPlotId === "all" ? "selected" : ""}>ทุกแปลง</option>`,
    ...plots.map(
      (plot) =>
        `<option value="${escapeHtml(plot.id)}" ${
          String(selectedPlotId) === String(plot.id) ? "selected" : ""
        }>${escapeHtml(plot.plotName || "ไม่ทราบชื่อแปลง")}</option>`
    ),
  ].join("");

  const quickButtonsHtml = ["วันนี้", "7 วันล่าสุด", "30 วันล่าสุด"]
    .map(
      (label) => `
      <button class="quick-btn ${quickRange === label ? "active" : ""}" onclick="window.historyPageApi.selectQuick('${label}')">
        ${label}
      </button>
    `
    )
    .join("");

  const sensorDropdownLabel =
    selectedSensors.length > 0 ? selectedSensors.join(", ") : "เลือกประเภทเซนเซอร์";

  const sensorCheckboxHtml = sensorOptions
    .map((item, index) => {
      const checked = selectedSensors.includes(item.label);
      const id = `sensor_checkbox_${index}`;
      const safeLabel = escapeJsString(item.label);

      return `
        <label class="sensor-dd-check-row ${checked ? "checked" : ""}" for="${id}">
          <input
            id="${id}"
            class="sensor-dd-check-native"
            type="checkbox"
            ${checked ? "checked" : ""}
            onchange="window.historyPageApi.toggleSensor('${safeLabel}')"
          />
          <span class="sensor-dd-check-box">${checked ? "✓" : ""}</span>
          <span class="sensor-dd-check-main">
            <span class="sensor-dd-check-text">${escapeHtml(item.label)}</span>
            <span class="sensor-dd-check-unit">${escapeHtml(item.unit)}</span>
          </span>
        </label>
      `;
    })
    .join("");

  const summaryBodyHtml = summaryRows
    .map((row) => {
      const val = (label) => {
        const v = row.values[label];
        return Number.isFinite(v) ? Number(v.toFixed(2)) : "—";
      };

      return `
        <tr>
          <td>${escapeHtml(row.plotName)}</td>
          <td><span class="node-type-pill ${row.nodeType === "soil" ? "ntp-soil" : "ntp-air"}">${
        row.nodeType === "soil" ? "Soil Node" : "Air Node"
      }</span></td>
          <td>${val("ความชื้นในดิน")}</td>
          <td>${val("อุณหภูมิ")}</td>
          <td>${val("ความชื้นสัมพัทธ์")}</td>
          <td>${val("N")}</td>
          <td>${val("P")}</td>
          <td>${val("K")}</td>
          <td>${val("ความเข้มแสง")}</td>
          <td>${val("ปริมาณน้ำฝน")}</td>
          <td>${val("ความเร็วลม")}</td>
          <td>${val("การให้น้ำ")}</td>
        </tr>
      `;
    })
    .join("");

  const noteText = `* กราฟนี้เทียบ "แปลง" ด้วย sensor ตัวแรกที่เลือก (${firstSelectedSensor}) • CSV จะ export ทุก sensor ที่เลือก`;

  const loadInfo =
    loading || loadingReadings
      ? `<div style="font-size:12px;color:#64748b;margin-top:8px">กำลังโหลดข้อมูล...</div>`
      : error
      ? `<div style="font-size:12px;color:#b91c1c;margin-top:8px">${escapeHtml(error)}</div>`
      : `<div style="font-size:12px;color:#64748b;margin-top:8px">จำนวนข้อมูลย้อนหลังที่ใช้: ${filteredReadingRows.length} รายการ</div>`;

  const htmlContent = `
  <div id="p2" class="page">
    <style>
      #p2,
      #p2 .page,
      #p2 .filter-bar,
      #p2 .card,
      #p2 .chart-card,
      #p2 .chart-header,
      #p2 .chart-area,
      #p2 .chart-legend,
      #p2 .chart-x-labels {
        overflow: visible !important;
      }

      #p2 .filter-bar{
        position: relative;
        z-index: 2000;
      }

      #p2 .chart-card{
        position: relative;
        z-index: 1;
        overflow: visible !important;
      }

      .sensor-dd-wrap{
        position: relative;
        width: 100%;
        overflow: visible !important;
        z-index: 99999;
      }

      .sensor-dd-trigger{
        width: 100%;
        min-height: 50px;
        padding: 12px 14px;
        border: 1px solid #dfe7dc;
        border-radius: 14px;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        cursor: pointer;
        transition: all .18s ease;
        position: relative;
        z-index: 100000;
      }

      .sensor-dd-trigger:hover{
        border-color:#9ed6a5;
      }

      .sensor-dd-trigger.open{
        border-color:#5db866;
        box-shadow:0 0 0 3px rgba(93,184,102,.10);
      }

      .sensor-dd-trigger-text{
        flex:1;
        min-width:0;
        color:#22352a;
        font-size:14px;
        font-weight:700;
        text-align:left;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .sensor-dd-trigger-arrow{
        flex:0 0 auto;
        color:#64748b;
        font-size:14px;
        transition:transform .18s ease;
      }

      .sensor-dd-trigger.open .sensor-dd-trigger-arrow{
        transform:rotate(180deg);
      }

      .sensor-dd-menu{
        position:absolute;
        top:calc(100% + 8px);
        left:0;
        right:0;
        z-index:100001;
        background:#fff;
        border:1px solid #dfe7dc;
        border-radius:16px;
        box-shadow:0 16px 40px rgba(15,23,42,.18);
        padding:10px;
        display:none;
      }

      .sensor-dd-menu.open{
        display:block;
      }

      .sensor-dd-list{
        display:grid;
        grid-template-columns:1fr;
        gap:8px;
        max-height:260px;
        overflow:auto;
      }

      .sensor-dd-check-row{
        display:flex;
        align-items:center;
        gap:12px;
        min-height:50px;
        padding:10px 12px;
        border:1px solid #e3ebe0;
        border-radius:14px;
        background:#fff;
        cursor:pointer;
        transition:all .18s ease;
      }

      .sensor-dd-check-row:hover{
        border-color:#9ed6a5;
        background:#f8fcf8;
      }

      .sensor-dd-check-row.checked{
        border-color:#5db866;
        background:#eef9ef;
      }

      .sensor-dd-check-native{
        display:none;
      }

      .sensor-dd-check-box{
        width:22px;
        height:22px;
        min-width:22px;
        border:2px solid #bfd3c2;
        border-radius:6px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:13px;
        font-weight:800;
        color:transparent;
        background:#fff;
        transition:all .18s ease;
      }

      .sensor-dd-check-row.checked .sensor-dd-check-box{
        background:#5db866;
        border-color:#5db866;
        color:#fff;
      }

      .sensor-dd-check-main{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        width:100%;
      }

      .sensor-dd-check-text{
        font-size:14px;
        font-weight:700;
        color:#22352a;
      }

      .sensor-dd-check-unit{
        font-size:12px;
        color:#64748b;
        font-weight:700;
        white-space:nowrap;
      }

      .sensor-dd-footer{
        display:flex;
        justify-content:flex-end;
        padding-top:10px;
      }

      .sensor-dd-close-btn{
        border:none;
        border-radius:12px;
        background:#5db866;
        color:#fff;
        padding:10px 16px;
        font-size:13px;
        font-weight:800;
        cursor:pointer;
      }

      @media (max-width: 768px){
        .sensor-dd-check-main{
          align-items:flex-start;
          flex-direction:column;
          gap:4px;
        }
      }
    </style>

    <div class="filter-bar">
      <div class="filter-title">🔍 ฟิลเตอร์ข้อมูลย้อนหลัง</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
        เลือกช่วงวันที่ / เซนเซอร์ / แปลง เพื่อดูข้อมูลย้อนหลังและกราฟ
      </div>

      <div style="margin-bottom:12px">
        <div class="filter-label">ช่วงเวลาเร็ว</div>
        <div class="filter-quick">
          ${quickButtonsHtml}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
        <div>
          <div class="filter-label">วันที่เริ่มต้น</div>
          <input type="date" class="form-input" value="${escapeHtml(
            startDate
          )}" onchange="window.historyPageApi.setStartDate(this.value)">
        </div>
        <div>
          <div class="filter-label">วันที่สิ้นสุด</div>
          <input type="date" class="form-input" value="${escapeHtml(
            endDate
          )}" onchange="window.historyPageApi.setEndDate(this.value)">
        </div>
        <div>
          <div class="filter-label">แปลง</div>
          <select class="form-select" onchange="window.historyPageApi.setPlot(this.value)">
            ${plotOptionsHtml}
          </select>
        </div>
      </div>

      <div>
        <div class="filter-label">ประเภทเซนเซอร์</div>
        <div class="sensor-dd-wrap" id="sensor-type-dropdown-wrap">
          <div
            role="button"
            tabindex="0"
            class="sensor-dd-trigger ${sensorDropdownOpen ? "open" : ""}"
            onclick="window.historyPageApi.toggleSensorDropdown()"
          >
            <span class="sensor-dd-trigger-text">${escapeHtml(sensorDropdownLabel)}</span>
            <span class="sensor-dd-trigger-arrow">▼</span>
          </div>

          <div class="sensor-dd-menu ${sensorDropdownOpen ? "open" : ""}">
            <div class="sensor-dd-list">
              ${
                sensorCheckboxHtml ||
                `<div style="font-size:13px;color:#64748b;padding:8px 4px">ไม่พบประเภทเซนเซอร์</div>`
              }
            </div>
            <div class="sensor-dd-footer">
              <button
                type="button"
                class="sensor-dd-close-btn"
                onclick="window.historyPageApi.closeSensorDropdown()"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      </div>

      ${loadInfo}
    </div>

    <div class="card chart-card" style="position:relative; z-index:1; overflow:visible;">
      <div class="chart-header">
        <div>
          <div class="card-title">📈 กราฟเปรียบเทียบแปลง</div>
          <div class="chart-meta">
            sensor: ${escapeHtml(firstSelectedSensor)} • แปลง: ${escapeHtml(
    filteredPlots.map((p) => p.plotName || "ไม่ทราบชื่อแปลง").join(", ") || "ไม่มีข้อมูล"
  )}
          </div>
        </div>
        <button class="export-btn" onclick="window.historyPageApi.exportCsv()">⬇ EXPORT CSV</button>
      </div>

      <div class="chart-legend">
        ${legendHtml}
      </div>

      <div class="chart-area">
        <div class="chart-grid">
          ${chartGridHtml}
        </div>
        <svg class="chart-svg" viewBox="0 0 900 220" preserveAspectRatio="none">
          ${chartLinesHtml}
        </svg>
      </div>

      <div class="chart-x-labels">
        ${xLabelsHtml}
      </div>

      <div class="chart-note">${escapeHtml(noteText)}</div>
    </div>

    <div class="card">
      <div class="card-title" style="margin-bottom:12px">📋 สรุปการวัดข้อมูล (เฉลี่ยช่วงที่เลือก)</div>
      <div style="overflow-x:auto">
        <table class="summary-table">
          <thead>
            <tr>
              <th>แปลง</th>
              <th>Node</th>
              <th>ความชื้นในดิน (%)</th>
              <th>อุณหภูมิ (°C)</th>
              <th>ความชื้นสัมพัทธ์ (%)</th>
              <th>N</th>
              <th>P</th>
              <th>K</th>
              <th>ความเข้มแสง (lux)</th>
              <th>ปริมาณน้ำฝน (mm)</th>
              <th>ความเร็วลม (m/s)</th>
              <th>การให้น้ำ (L)</th>
            </tr>
          </thead>
          <tbody>
            ${summaryBodyHtml || `<tr><td colspan="12" style="text-align:center">ไม่มีข้อมูล</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  `;

  return <DuwimsStaticPage current="history" htmlContent={htmlContent} />;
}