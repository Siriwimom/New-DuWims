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

function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001").replace(
    /\/+$/,
    ""
  );
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

function toNum(v) {
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

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeDateKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return formatDateInput(d);
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
  const key = String(name).trim().toLowerCase();

  if (
    key.includes("soil") ||
    key.includes("soil_moisture") ||
    key.includes("moisture") ||
    key.includes("ความชื้นในดิน")
  ) {
    return "ความชื้นในดิน";
  }

  if (
    key.includes("temp_rh") ||
    key.includes("temperature") ||
    key.includes("temp") ||
    key === "อุณหภูมิ" ||
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

function sensorRangeText(label = "") {
  switch (label) {
    case "อุณหภูมิ":
      return { min: "20", max: "35" };
    case "ความชื้นสัมพัทธ์":
      return { min: "75", max: "85" };
    case "ความเร็วลม":
      return { min: "< 0.56", max: "0.56 - 1.39" };
    case "ความเข้มแสง":
      return { min: "< 40000", max: "40000 - 60000" };
    case "ปริมาณน้ำฝน":
      return { min: "< 4", max: "4 - 8" };
    case "ความชื้นในดิน":
      return { min: "< 65", max: "65 - 80" };
    case "N":
      return { min: "0.1", max: "1.0" };
    case "P":
      return { min: "25", max: "45" };
    case "K":
      return { min: "0.8", max: "1.4" };
    case "การให้น้ำ":
      return { min: "50", max: "90" };
    default:
      return { min: "-", max: "-" };
  }
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

export default function HistoryPage() {
  const today = useMemo(() => new Date(), []);
  const defaultEnd = formatDateInput(today);
  const defaultStart = formatDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7));

  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [error, setError] = useState("");

  const [quickRange, setQuickRange] = useState("7 วันล่าสุด");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedPlotId, setSelectedPlotId] = useState("all");
  const [selectedSensors, setSelectedSensors] = useState(["ความชื้นในดิน"]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [readingMap, setReadingMap] = useState({});

  const csvRef = useRef("");

  useEffect(() => {
    let alive = true;

    async function loadPlots() {
      setLoading(true);
      setError("");

      try {
        const token = getToken();
        const res = await fetch(`${getApiBase()}/api/plots`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`โหลดข้อมูลแปลงไม่สำเร็จ (${res.status}) ${text || ""}`);
        }

        const data = await res.json();
        if (!alive) return;
        setPlots(Array.isArray(data?.items) ? data.items : []);
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

    for (const plot of plots) {
      const nodes = Array.isArray(plot?.nodes) ? plot.nodes : [];
      for (const node of nodes) {
        const sensors = Array.isArray(node?.sensors) ? node.sensors : [];
        for (const sensor of sensors) {
          const label = canonicalSensorLabel(sensor?.name || sensor?.uid || "");
          if (!map.has(label)) {
            map.set(label, {
              label,
              unit: sensorUnit(label),
            });
          }
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
    return plots.filter((p) => String(p?.id) === String(selectedPlotId));
  }, [plots, selectedPlotId]);

  const sensorTargets = useMemo(() => {
    const targets = [];

    for (const plot of filteredPlots) {
      const nodes = Array.isArray(plot?.nodes) ? plot.nodes : [];
      for (const node of nodes) {
        const sensors = Array.isArray(node?.sensors) ? node.sensors : [];
        for (const sensor of sensors) {
          const label = canonicalSensorLabel(sensor?.name || sensor?.uid || "");
          if (selectedSensors.includes(label)) {
            targets.push({
              plotId: plot?.id,
              plotName: plot?.plotName || "ไม่ทราบชื่อแปลง",
              nodeId: node?._id,
              nodeName: node?.nodeName || node?.uid || "Node",
              nodeType: inferNodeType(node),
              sensorId: sensor?._id,
              sensorUid: sensor?.uid || "",
              sensorName: sensor?.name || sensor?.uid || "Sensor",
              sensorLabel: label,
              status: sensor?.status || "",
            });
          }
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

      try {
        const token = getToken();

        const results = await Promise.all(
          sensorTargets.map(async (t) => {
            const qs = new URLSearchParams({
              sensorId: String(t.sensorId),
              plotId: String(t.plotId),
              nodeId: String(t.nodeId),
              limit: "500",
            });

            const res = await fetch(`${getApiBase()}/api/sensor-readings?${qs.toString()}`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              cache: "no-store",
            });

            if (!res.ok) {
              return [t.sensorId, []];
            }

            const data = await res.json();
            const items = Array.isArray(data?.items) ? data.items : [];
            return [t.sensorId, items];
          })
        );

        if (!alive) return;
        setReadingMap(Object.fromEntries(results));
      } finally {
        if (alive) setLoadingReadings(false);
      }
    }

    loadReadings();
    return () => {
      alive = false;
    };
  }, [sensorTargets]);

  const dateKeys = useMemo(() => buildDateRange(startDate, endDate), [startDate, endDate]);

  const filteredReadingRows = useMemo(() => {
    const rows = [];

    for (const target of sensorTargets) {
      const items = Array.isArray(readingMap[target.sensorId]) ? readingMap[target.sensorId] : [];

      for (const item of items) {
        const dateKey = normalizeDateKey(item?.timestamp);
        if (!dateKey) continue;
        if (dateKey < startDate || dateKey > endDate) continue;

        rows.push({
          plotId: target.plotId,
          plotName: target.plotName,
          nodeId: target.nodeId,
          nodeName: target.nodeName,
          nodeType: target.nodeType,
          sensorId: target.sensorId,
          sensorLabel: target.sensorLabel,
          sensorName: target.sensorName,
          value: toNum(item?.value),
          timestamp: item?.timestamp,
          status: item?.status || "",
          dateKey,
        });
      }
    }

    return rows;
  }, [sensorTargets, readingMap, startDate, endDate]);

  const firstSelectedSensor = selectedSensors[0] || (sensorOptions[0]?.label ?? "ความชื้นในดิน");

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

      toggleSensorDd: () => setDropdownOpen((v) => !v),
      closeSensorDd: () => setDropdownOpen(false),

      toggleSensorItem: (label) => {
        setSelectedSensors((prev) => {
          if (prev.includes(label)) {
            const next = prev.filter((x) => x !== label);
            return next.length ? next : prev;
          }
          return [...prev, label];
        });
      },

      clearAllSensors: () => {
        if (sensorOptions.length) {
          setSelectedSensors([sensorOptions[0].label]);
        }
      },

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

    const onDocClick = (e) => {
      const wrap = document.querySelector(".sensor-dd-wrap");
      if (!wrap) return;
      if (!wrap.contains(e.target)) setDropdownOpen(false);
    };

    document.addEventListener("click", onDocClick);

    return () => {
      document.removeEventListener("click", onDocClick);
      delete window.historyPageApi;
    };
  }, [sensorOptions, startDate, endDate]);

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
      const dash = i === 4 ? `stroke-dasharray="6,3"` : "";
      return `<polyline fill="none" stroke="${colorOfIndex(i)}" stroke-width="2.5" stroke-linejoin="round" ${dash} points="${points}"/>`;
    }),
  ].join("");

  const xLabelsHtml = dateKeys
    .map((d) => `<span class="chart-x-label">${escapeHtml(formatThaiDateLabel(d))}</span>`)
    .join("");

  const sensorItemsHtml = sensorOptions
    .map((item) => {
      const checked = selectedSensors.includes(item.label);
      return `
        <label class="sensor-dd-item ${checked ? "checked" : ""}" onclick="event.stopPropagation(); window.historyPageApi.toggleSensorItem('${escapeHtml(
          item.label
        )}')">
          <span class="sensor-dd-box">${checked ? "✓" : ""}</span>
          <span class="sensor-dd-name">${escapeHtml(item.label)}</span>
          <span class="sensor-dd-unit">${escapeHtml(item.unit)}</span>
        </label>
      `;
    })
    .join("");

  const selectedSensorLabel = selectedSensors.length
    ? selectedSensors.join(", ")
    : "เลือกประเภทเซนเซอร์";

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

  const htmlContent = `<div id="p2" class="page">

  <style>
    #p2,
    .page,
    .filter-bar,
    .card,
    .chart-card{
      overflow: visible !important;
    }

    .filter-bar{
      position: relative;
      z-index: 200;
    }

    .chart-card{
      position: relative;
      z-index: 1;
    }

    .sensor-dd-wrap{
      position: relative;
      overflow: visible;
      z-index: 500;
    }

    .sensor-dd-trigger{
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px;
      border: 1px solid #dfe7dc;
      border-radius: 14px;
      background: #ffffff;
      cursor: pointer;
      user-select: none;
      transition: border-color .18s ease, box-shadow .18s ease, transform .12s ease;
      position: relative;
      z-index: 501;
    }

    .sensor-dd-trigger:hover{
      border-color: #8ccf95;
    }

    .sensor-dd-trigger.open{
      border-color: #5db866;
      box-shadow: 0 0 0 4px rgba(93,184,102,.14);
    }

    .sensor-dd-arrow{
      flex: 0 0 auto;
      font-size: 14px;
      color: #5f6f64;
      transition: transform .18s ease;
    }

    .sensor-dd-trigger.open .sensor-dd-arrow{
      transform: rotate(180deg);
    }

    .sensor-dd-menu{
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      z-index: 9999;
      background: #ffffff;
      border: 1px solid #dfe7dc;
      border-radius: 18px;
      box-shadow: 0 18px 40px rgba(0,0,0,.14);
      overflow: hidden;

      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateY(-4px);
      transition: opacity .18s ease, transform .18s ease, visibility .18s ease;
    }

    .sensor-dd-menu.open{
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translateY(0);
    }

    .sensor-dd-header{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px;
      border-bottom: 1px solid #edf2ea;
      background: #f9fcf8;
    }

    .sensor-dd-header-title{
      font-size: 13px;
      font-weight: 700;
      color: #36523b;
    }

    .sensor-dd-clear{
      border: none;
      background: transparent;
      color: #3f8f4a;
      font-weight: 700;
      cursor: pointer;
    }

    .sensor-dd-grid{
      max-height: 280px;
      overflow-y: auto;
      padding: 10px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .sensor-dd-item{
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 48px;
      padding: 10px 12px;
      border: 1px solid #e4ece1;
      border-radius: 14px;
      background: #fff;
      cursor: pointer;
      transition: background .16s ease, border-color .16s ease, transform .12s ease;
    }

    .sensor-dd-item:hover{
      background: #f6fbf5;
      border-color: #b9dfbe;
    }

    .sensor-dd-item.checked{
      background: #eef9ef;
      border-color: #78c483;
    }

    .sensor-dd-box{
      width: 22px;
      height: 22px;
      border-radius: 7px;
      border: 1.5px solid #c9d8c8;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 800;
      color: transparent;
      background: #fff;
      flex: 0 0 22px;
    }

    .sensor-dd-item.checked .sensor-dd-box{
      background: #5db866;
      border-color: #5db866;
      color: #fff;
    }

    .sensor-dd-name{
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      color: #22352a;
    }

    .sensor-dd-unit{
      font-size: 12px;
      color: #6f8174;
      font-weight: 700;
    }

    .sensor-dd-footer{
      padding: 12px 14px;
      border-top: 1px solid #edf2ea;
      background: #f9fcf8;
      display: flex;
      justify-content: flex-end;
    }

    .sensor-dd-done{
      height: 40px;
      padding: 0 16px;
      border: none;
      border-radius: 12px;
      background: #5db866;
      color: #fff;
      font-weight: 800;
      cursor: pointer;
    }

    @media (max-width: 768px){
      .sensor-dd-grid{
        grid-template-columns: 1fr;
      }
    }
  </style>

  <div class="filter-bar">
    <div class="filter-title">🔍 ฟิลเตอร์ข้อมูลย้อนหลัง</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:12px">เลือกช่วงวันที่ / เซนเซอร์ / แปลง เพื่อดูข้อมูลย้อนหลังและกราฟ</div>

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

    <div class="sensor-dd-wrap">
      <div class="filter-label" style="margin-bottom:6px">ประเภทเซนเซอร์</div>
      <div class="sensor-dd-trigger ${dropdownOpen ? "open" : ""}" id="sensorDdTrigger" onclick="window.historyPageApi.toggleSensorDd()">
        <span id="sensorDdLabel">${escapeHtml(selectedSensorLabel)}</span>
        <span class="sensor-dd-arrow" id="sensorDdArrow">▼</span>
      </div>

      <div class="sensor-dd-menu ${dropdownOpen ? "open" : ""}" id="sensorDdMenu">
        <div class="sensor-dd-header">
          <span class="sensor-dd-header-title">เลือกได้หลายตัว</span>
          <button class="sensor-dd-clear" onclick="event.stopPropagation(); window.historyPageApi.clearAllSensors()">ล้าง</button>
        </div>

        <div class="sensor-dd-grid">
          ${sensorItemsHtml}
        </div>

        <div class="sensor-dd-footer">
          <button class="sensor-dd-done" onclick="window.historyPageApi.closeSensorDd()">Done</button>
        </div>
      </div>
    </div>
    ${loadInfo}
  </div>

  <div class="card chart-card">
    <div class="chart-header">
      <div>
        <div class="card-title">📈 กราฟเปรียบเทียบแปลง</div>
        <div class="chart-meta">sensor: ${escapeHtml(firstSelectedSensor)} • แปลง: ${escapeHtml(
    filteredPlots.map((p) => p.plotName || "ไม่ทราบชื่อแปลง").join(", ") || "ไม่มีข้อมูล"
  )}</div>
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
            <th>แปลง</th><th>Node</th><th>ความชื้นในดิน (%)</th><th>อุณหภูมิ (°C)</th><th>ความชื้นสัมพัทธ์ (%)</th><th>N</th><th>P</th><th>K</th><th>ความเข้มแสง (lux)</th><th>ปริมาณน้ำฝน (mm)</th><th>ความเร็วลม (m/s)</th><th>การให้น้ำ (L)</th>
          </tr>
        </thead>
        <tbody>
          ${summaryBodyHtml || `<tr><td colspan="12" style="text-align:center">ไม่มีข้อมูล</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <div class="card-title" style="margin-bottom:12px">🕒 ค่าล่าสุดของเซนเซอร์ที่เลือก</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
      ${sensorTargets
        .map((t) => {
          const latestItems = (readingMap[t.sensorId] || [])
            .slice()
            .sort((a, b) => new Date(b?.timestamp || 0) - new Date(a?.timestamp || 0));
          const latest = latestItems[0];
          const latestValue = Number.isFinite(toNum(latest?.value)) ? toNum(latest?.value) : null;

          return `
            <div style="border:1px solid #e5ece3;border-radius:16px;padding:14px;background:#fff">
              <div style="font-weight:800;color:#22352a;margin-bottom:6px">${escapeHtml(t.plotName)}</div>
              <div style="font-size:13px;color:#5f6f64;margin-bottom:6px">${escapeHtml(
                t.nodeName
              )} • ${escapeHtml(t.sensorLabel)}</div>
              <div style="font-size:24px;font-weight:800;color:#1f2937;margin-bottom:6px">
                ${latestValue !== null ? escapeHtml(latestValue) : "-"} ${escapeHtml(sensorUnit(t.sensorLabel))}
              </div>
              <div style="font-size:12px;color:#64748b">อัปเดตล่าสุด: ${escapeHtml(
                formatDateTime(latest?.timestamp)
              )}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  </div>

</div>`;

  return <DuwimsStaticPage current="history" htmlContent={htmlContent} />;
}