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

const SENSOR_OPTIONS = [
  { key: "soil", label: "ความชื้นในดิน", unit: "%" },
  { key: "water", label: "ความพร้อมใช้น้ำ", unit: "%" },
  { key: "n", label: "N", unit: "%" },
  { key: "p", label: "P", unit: "ppm" },
  { key: "k", label: "K", unit: "cmol/kg" },
  { key: "temp", label: "อุณหภูมิ", unit: "°C" },
  { key: "rh", label: "ความชื้นสัมพัทธ์", unit: "%" },
  { key: "wind", label: "วัดความเร็วลม", unit: "m/s" },
  { key: "rain", label: "ปริมาณน้ำฝน", unit: "mm" },
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

function formatThaiDateLabel(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
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

function canonicalSensorKey(name = "") {
  const key = String(name || "").trim().toLowerCase();

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
    key.includes("water") ||
    key.includes("ให้น้ำ") ||
    key.includes("irrigation") ||
    key.includes("ความพร้อมใช้น้ำ")
  ) {
    return "water";
  }

  if (
    key.includes("temperature") ||
    key.includes("temp_rh") ||
    key === "temp" ||
    key.includes("อุณหภูมิ")
  ) {
    return "temp";
  }

  if (
    key.includes("humidity") ||
    key === "rh" ||
    key.includes("ความชื้นสัมพัทธ์") ||
    key === "ความชื้น"
  ) {
    return "rh";
  }

  if (key === "n" || key.includes("ไนโตรเจน")) return "n";
  if (key === "p" || key.includes("ฟอสฟอรัส")) return "p";
  if (key === "k" || key.includes("โพแทสเซียม")) return "k";

  if (key.includes("rain") || key.includes("ฝน")) return "rain";

  if (
    key.includes("wind_speed") ||
    key.includes("wind speed") ||
    key.includes("wind") ||
    key.includes("วัดความเร็วลม") ||
    key.includes("ความเร็วลม")
  ) {
    return "wind";
  }

  return "";
}

function sensorLabelFromKey(key) {
  return SENSOR_OPTIONS.find((s) => s.key === key)?.label || key;
}

function inferNodeType(node) {
  const raw = [
    node?.nodeType,
    node?.type,
    node?.nodeName,
    node?.uid,
    ...(Array.isArray(node?.sensors)
      ? node.sensors.map((s) => `${s?.name || ""} ${s?.uid || ""} ${s?.sensorType || ""}`)
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

  const latestValue = toNum(item?.latestValue);
  if (latestValue !== null) return latestValue;

  const lastReading = toNum(item?.lastReading?.value);
  if (lastReading !== null) return lastReading;

  return null;
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

function normalizePlot(plot) {
  return {
    id: getId(plot),
    plotName: plot?.plotName || plot?.name || plot?.alias || "ไม่ทราบชื่อแปลง",
    nodes: Array.isArray(plot?.nodes) ? plot.nodes : [],
  };
}

function normalizeSensor(sensor) {
  const sensorKey = canonicalSensorKey(sensor?.sensorType || sensor?.name || sensor?.uid || "");
  return {
    id: getId(sensor),
    uid: sensor?.uid || "",
    sensorKey,
    label: sensorLabelFromKey(sensorKey),
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
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
  );

  const [plots, setPlots] = useState([]);
  const [loadingPlots, setLoadingPlots] = useState(true);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [error, setError] = useState("");

  const [quickRange, setQuickRange] = useState("30 วันล่าสุด");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedPlotId, setSelectedPlotId] = useState("all");

  const [selectedSensors, setSelectedSensors] = useState([]);
  const [sensorDropdownOpen, setSensorDropdownOpen] = useState(false);

  const [readingMap, setReadingMap] = useState({});
  const csvRef = useRef("");
  const sensorWrapRef = useRef(null);

  useEffect(() => {
    let alive = true;

    async function loadPlots() {
      setLoadingPlots(true);
      setError("");

      try {
        const data = await apiGet("/api/plots");
        if (!alive) return;

        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setPlots(items.map(normalizePlot).filter((p) => p.id));
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "ไม่สามารถโหลดข้อมูลแปลงได้");
        setPlots([]);
      } finally {
        if (alive) setLoadingPlots(false);
      }
    }

    loadPlots();
    return () => {
      alive = false;
    };
  }, []);

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

  const allNodeCount = useMemo(() => {
    return plots.reduce((sum, plot) => sum + (Array.isArray(plot.nodes) ? plot.nodes.length : 0), 0);
  }, [plots]);

  const filteredPlots = useMemo(() => {
    if (selectedPlotId === "all") return plots;
    return plots.filter((p) => String(p.id) === String(selectedPlotId));
  }, [plots, selectedPlotId]);

  const visibleNodes = useMemo(() => {
    const rows = [];
    for (const plot of filteredPlots) {
      const nodes = Array.isArray(plot?.nodes) ? plot.nodes : [];
      for (const node of nodes) {
        rows.push({
          plotId: plot.id,
          plotName: plot.plotName,
          nodeId: getId(node),
          nodeUid: node?.uid || "",
          nodeName: node?.nodeName || node?.name || node?.uid || "Node",
          nodeType: inferNodeType(node),
          sensors: Array.isArray(node?.sensors) ? node.sensors : [],
        });
      }
    }
    return rows;
  }, [filteredPlots]);

  const selectedSensorNames = useMemo(() => {
    return selectedSensors
      .map((key) => SENSOR_OPTIONS.find((s) => s.key === key)?.label)
      .filter(Boolean);
  }, [selectedSensors]);

  const sensorDropdownLabel = useMemo(() => {
    if (!selectedSensorNames.length) return "เลือกประเภทเซนเซอร์";
    if (selectedSensorNames.length === 1) return selectedSensorNames[0];
    return `${selectedSensorNames[0]} +${selectedSensorNames.length - 1}`;
  }, [selectedSensorNames]);

  const sensorTargets = useMemo(() => {
    const targets = [];

    for (const plot of filteredPlots) {
      const nodes = Array.isArray(plot?.nodes) ? plot.nodes : [];
      for (const node of nodes) {
        const sensors = Array.isArray(node?.sensors) ? node.sensors : [];
        for (const rawSensor of sensors) {
          const sensor = normalizeSensor(rawSensor);
          if (!sensor.id) continue;
          if (!sensor.sensorKey) continue;
          if (selectedSensors.length && !selectedSensors.includes(sensor.sensorKey)) continue;

          targets.push({
            plotId: plot.id,
            plotName: plot.plotName,
            nodeId: getId(node),
            nodeUid: node?.uid || "",
            nodeName: node?.nodeName || node?.name || node?.uid || "Node",
            nodeType: inferNodeType(node),
            sensorId: sensor.id,
            sensorKey: sensor.sensorKey,
            sensorLabel: sensor.label,
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
          sensorTargets.map(async (target) => {
            try {
              const qs = new URLSearchParams({
                sensorId: String(target.sensorId),
                plotId: String(target.plotId),
                nodeId: String(target.nodeId),
                limit: "500",
              });

              const data = await apiGet(`/api/sensor-readings?${qs.toString()}`);
              const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
              return [target.sensorId, items.map(normalizeReading)];
            } catch {
              return [target.sensorId, []];
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
          nodeUid: target.nodeUid,
          nodeName: target.nodeName,
          nodeType: target.nodeType,
          sensorId: target.sensorId,
          sensorKey: target.sensorKey,
          sensorLabel: target.sensorLabel,
          value,
          timestamp,
          status: item?.status || "",
          dateKey,
        });
      }
    }

    return rows;
  }, [sensorTargets, readingMap, startDate, endDate]);

  const firstSelectedSensorKey = selectedSensors[0] || "";
  const firstSelectedSensorLabel = firstSelectedSensorKey
    ? sensorLabelFromKey(firstSelectedSensorKey)
    : "ยังไม่ได้เลือกเซนเซอร์";

  const chartSeries = useMemo(() => {
    if (!firstSelectedSensorKey) return [];

    const byPlot = new Map();

    for (const plot of filteredPlots) {
      const valuesByDate = new Map(dateKeys.map((d) => [d, []]));

      filteredReadingRows
        .filter((row) => row.plotId === plot.id && row.sensorKey === firstSelectedSensorKey)
        .forEach((row) => {
          const existing = valuesByDate.get(row.dateKey) || [];
          existing.push(row.value);
          valuesByDate.set(row.dateKey, existing);
        });

      byPlot.set(plot.id, {
        plotId: plot.id,
        plotName: plot.plotName,
        values: dateKeys.map((d) => average(valuesByDate.get(d) || [])),
      });
    }

    return [...byPlot.values()];
  }, [filteredPlots, filteredReadingRows, firstSelectedSensorKey, dateKeys]);

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
    return visibleNodes.map((node) => {
      const nodeRows = filteredReadingRows.filter((r) => r.nodeId === node.nodeId);
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

  const csvRows = useMemo(() => {
    const header = ["plot", "node", "nodeType", "sensor", "value", "timestamp", "status"];
    const body = filteredReadingRows.map((row) => [
      row.plotName,
      row.nodeName,
      row.nodeType,
      row.sensorLabel,
      row.value ?? "",
      row.timestamp ?? "",
      row.status ?? "",
    ]);

    return [header, ...body];
  }, [filteredReadingRows]);

  useEffect(() => {
    csvRef.current = makeCsv(csvRows);
  }, [csvRows]);

  const soilSensors = SENSOR_OPTIONS.filter((s) =>
    ["soil", "water", "n", "p", "k"].includes(s.key)
  );

  const airSensors = SENSOR_OPTIONS.filter((s) =>
    ["temp", "rh", "wind", "rain"].includes(s.key)
  );

  const toggleSensor = (key) => {
    setSelectedSensors((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const resetSensors = () => {
    setSelectedSensors([]);
  };

  const handleQuick = (label) => {
    const now = new Date();
    const end = formatDateInput(now);
    let start = end;

    if (label === "วันนี้") {
      start = end;
    } else if (label === "7 วันล่าสุด") {
      start = formatDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
    } else if (label === "30 วันล่าสุด") {
      start = formatDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
    }

    setQuickRange(label);
    setStartDate(start);
    setEndDate(end);
  };

  const exportCsv = () => {
    const blob = new Blob([csvRef.current], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `history-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const yLabels = (() => {
    const min = chartMinMax.min;
    const max = chartMinMax.max;
    const step = (max - min) / 4;
    return [max, max - step, max - step * 2, max - step * 3, min].map((n) =>
      Number.isFinite(n) ? Number(n.toFixed(2)) : "-"
    );
  })();

  const loadInfo =
    loadingPlots || loadingReadings
      ? "กำลังโหลดข้อมูล..."
      : error
      ? error
      : `พบ ${visibleNodes.length} node ในหน้าที่เลือก • ทั้งหมดจาก backend ${allNodeCount} node • ข้อมูลย้อนหลัง ${filteredReadingRows.length} รายการ`;

  return (
    <DuwimsStaticPage current="history">
      <div id="history-page-root">
        <div className="history-card filter-card">
          <div className="history-title">🔍 ฟิลเตอร์ข้อมูลย้อนหลัง</div>
          <div className="history-sub">เลือกช่วงวันที่ / เซนเซอร์ / แปลง เพื่อดูข้อมูลย้อนหลังและกราฟ</div>

          <div style={{ marginBottom: 12 }}>
            <div className="history-label">ช่วงเวลาเร็ว</div>
            <div className="quick-wrap">
              {["วันนี้", "7 วันล่าสุด", "30 วันล่าสุด"].map((label) => (
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
              <label className="history-label">วันที่เริ่มต้น</label>
              <input
                className="history-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="history-label">วันที่สิ้นสุด</label>
              <input
                className="history-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label className="history-label">แปลง</label>
              <select
                className="history-select"
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(e.target.value)}
              >
                <option value="all">ทุกแปลง</option>
                {plots.map((plot) => (
                  <option key={plot.id} value={plot.id}>
                    {plot.plotName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sensor-wrap-block">
            <label className="history-label">ประเภทเซนเซอร์</label>

            <div className="sensor-dd-wrap" ref={sensorWrapRef}>
              <button
                type="button"
                className={`sensor-dd-trigger ${sensorDropdownOpen ? "open" : ""}`}
                onClick={() => setSensorDropdownOpen((prev) => !prev)}
              >
                <span className="sensor-dd-trigger-text">{sensorDropdownLabel}</span>
                <span>{sensorDropdownOpen ? "▲" : "▼"}</span>
              </button>

              {sensorDropdownOpen && (
                <div className="sensor-dd-menu open" id="sensorDdMenu">
                  <div className="sensor-dd-header">
                    <span className="sensor-dd-header-title">เลือกได้หลายตัว</span>
                    <button
                      type="button"
                      className="sensor-dd-clear"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSensors();
                      }}
                    >
                      ล้าง
                    </button>
                  </div>

                  <div className="sensor-dd-grid">
                    {SENSOR_OPTIONS.map((sensor) => {
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
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mini-info">
              เลือกแล้ว: {selectedSensorNames.length ? selectedSensorNames.join(", ") : "—"}
            </div>
          </div>

          <div className="status-line">{loadInfo}</div>
        </div>

        <div className="history-card chart-card">
          <div className="chart-head">
            <div>
              <div className="history-title" style={{ marginBottom: 4 }}>📈 กราฟเปรียบเทียบแปลง</div>
              <div className="history-sub" style={{ marginBottom: 0 }}>
                sensor: {firstSelectedSensorLabel} • แปลง:{" "}
                {filteredPlots.map((p) => p.plotName || "ไม่ทราบชื่อแปลง").join(", ") || "ไม่มีข้อมูล"}
              </div>
            </div>

            <button type="button" className="export-btn" onClick={exportCsv}>
              ⬇ EXPORT CSV
            </button>
          </div>

          <div className="chart-legend">
            {chartSeries.map((item, i) => (
              <div key={item.plotId} className="legend-item">
                <div className="legend-dot" style={{ background: colorOfIndex(i) }} />
                <span>{item.plotName}</span>
              </div>
            ))}
          </div>

          <div className="chart-wrap">
            <div style={{ position: "relative" }}>
              <svg viewBox="0 0 900 220" preserveAspectRatio="none" style={{ width: "100%", height: 220 }}>
                <line x1="0" y1="44" x2="900" y2="44" stroke="rgba(93,184,102,0.12)" strokeWidth="1" />
                <line x1="0" y1="88" x2="900" y2="88" stroke="rgba(93,184,102,0.12)" strokeWidth="1" />
                <line x1="0" y1="132" x2="900" y2="132" stroke="rgba(93,184,102,0.12)" strokeWidth="1" />
                <line x1="0" y1="176" x2="900" y2="176" stroke="rgba(93,184,102,0.12)" strokeWidth="1" />

                {chartSeries.map((series, i) => {
                  const safeValues = series.values.map((v) =>
                    Number.isFinite(v) ? v : chartMinMax.min
                  );
                  const points = polylinePoints(safeValues, chartMinMax.min, chartMinMax.max, 900, 220);

                  return (
                    <polyline
                      key={series.plotId}
                      fill="none"
                      stroke={colorOfIndex(i)}
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      points={points}
                    />
                  );
                })}
              </svg>

              <div className="chart-y">
                {yLabels.map((label, index) => (
                  <div key={index}>{label}</div>
                ))}
              </div>
            </div>

            <div
              className="chart-x"
              style={{
                gridTemplateColumns: `repeat(${Math.max(dateKeys.length, 1)}, minmax(0,1fr))`,
              }}
            >
              {dateKeys.map((d) => (
                <div key={d}>{formatThaiDateLabel(d)}</div>
              ))}
            </div>
          </div>

          <div className="chart-note">
            * หน้า History เชื่อมข้อมูลจาก /api/plots และ /api/sensor-readings • กราฟนี้เทียบแปลงด้วย sensor ตัวแรกที่เลือก
          </div>
        </div>

        <div className="history-card">
          <div className="history-title" style={{ marginBottom: 12 }}>
            📋 สรุปการวัดข้อมูล (เฉลี่ยช่วงที่เลือก)
          </div>

          <div className="summary-wrap">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>แปลง</th>
                  <th>NODE</th>
                  <th>ประเภท</th>
                  <th>อุณหภูมิ (°C)</th>
                  <th>ความชื้นสัมพัทธ์ (%)</th>
                  <th>วัดความเร็วลม (m/s)</th>
                  <th>ปริมาณน้ำฝน (mm)</th>
                  <th>ความชื้นในดิน (%)</th>
                  <th>ความพร้อมใช้น้ำ (%)</th>
                  <th>N</th>
                  <th>P</th>
                  <th>K</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.length ? (
                  summaryRows.map((row, index) => {
                    const val = (k) =>
                      Number.isFinite(row.values[k]) ? Number(row.values[k].toFixed(2)) : "—";

                    return (
                      <tr key={`${row.nodeName}-${index}`}>
                        <td>{row.plotName}</td>
                        <td>{row.nodeName}</td>
                        <td>
                          <span className="node-pill">
                            {row.nodeType === "soil" ? "Soil Node" : "Air Node"}
                          </span>
                        </td>
                        <td>{val("temp")}</td>
                        <td>{val("rh")}</td>
                        <td>{val("wind")}</td>
                        <td>{val("rain")}</td>
                        <td>{val("soil")}</td>
                        <td>{val("water")}</td>
                        <td>{val("n")}</td>
                        <td>{val("p")}</td>
                        <td>{val("k")}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="12" style={{ textAlign: "center" }}>
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
            padding: 16px;
            z-index: 2;
          }

          .history-card {
            background: #fff;
            border: 1px solid #dfe7dc;
            border-radius: 18px;
            padding: 18px;
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
            overflow: visible !important;
            position: relative;
          }

          .history-card + .history-card {
            margin-top: 18px;
          }

          .history-card.filter-card {
            z-index: 100;
          }

          .history-card.chart-card {
            z-index: 1;
          }

          .history-title {
            font-size: 18px;
            font-weight: 900;
            color: #1f3b22;
            margin-bottom: 6px;
          }

          .history-sub {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 14px;
          }

          .history-label {
            display: block;
            font-size: 13px;
            font-weight: 800;
            color: #334155;
            margin-bottom: 6px;
          }

          .history-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
          }

          .history-input,
          .history-select {
            width: 100%;
            min-height: 48px;
            border: 1px solid #dfe7dc;
            border-radius: 14px;
            padding: 12px 14px;
            font-size: 14px;
            outline: none;
            background: #fff;
          }

          .quick-wrap {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 14px;
          }

          .quick-btn {
            border: none;
            border-radius: 999px;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            background: #edf7ee;
            color: #245b2b;
          }

          .quick-btn.active {
            background: #5db866;
            color: #fff;
          }

          .sensor-wrap-block {
            font-size: 13px;
            min-width: 0;
            position: relative;
            z-index: 300;
          }

          .sensor-dd-wrap {
            position: relative;
            z-index: 5000;
            overflow: visible !important;
          }

          .sensor-dd-trigger {
            width: 100%;
            min-height: 50px;
            padding: 12px 14px;
            border: 1px solid #dfe7dc;
            border-radius: 14px;
            background: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-size: 14px;
            font-weight: 800;
            color: #22352a;
            position: relative;
            z-index: 5001;
          }

          .sensor-dd-trigger.open {
            border-color: #5db866;
            box-shadow: 0 0 0 3px rgba(93, 184, 102, 0.1);
          }

          .sensor-dd-trigger-text {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: left;
          }

          .sensor-dd-menu {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            z-index: 9999;
            background: #fff;
            border: 1px solid #dfe7dc;
            border-radius: 16px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
            padding: 10px;
          }

          .sensor-dd-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 8px;
          }

          .sensor-dd-header-title {
            font-size: 12px;
            font-weight: 900;
            color: #0f172a;
          }

          .sensor-dd-clear {
            border: none;
            background: transparent;
            color: #b91c1c;
            font-weight: 900;
            cursor: pointer;
            font-size: 12px;
          }

          .sensor-dd-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .sensor-dd-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            border-radius: 12px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            background: #fff;
            cursor: pointer;
            min-width: 0;
            user-select: none;
          }

          .sensor-dd-item.checked {
            background: #eef9ef;
            border-color: #9ed6a5;
          }

          .sensor-dd-box {
            width: 18px;
            height: 18px;
            border-radius: 6px;
            border: 1.5px solid #cbd5e1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 900;
            color: #fff;
            background: #fff;
            flex: 0 0 18px;
          }

          .sensor-dd-item.checked .sensor-dd-box {
            background: #22c55e;
            border-color: #22c55e;
          }

          .sensor-dd-name {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .sensor-dd-unit {
            margin-left: auto;
            font-size: 11px;
            color: #64748b;
            white-space: nowrap;
          }

          .sensor-dd-footer {
            margin-top: 10px;
            display: flex;
            justify-content: flex-end;
          }

          .sensor-dd-done {
            border: none;
            border-radius: 999px;
            padding: 8px 12px;
            background: #0f172a;
            color: #fff;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
          }

          .mini-info {
            margin-top: 8px;
            font-size: 12px;
            color: #64748b;
          }

          .status-line {
            margin-top: 12px;
            font-size: 12px;
            color: #334155;
            font-weight: 700;
          }

          .chart-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
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

          .legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .legend-dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
          }

          .chart-wrap {
            position: relative;
            border: 1px solid #e6efe4;
            border-radius: 14px;
            padding: 10px 10px 0;
            background: #fcfffc;
            overflow: hidden;
          }

          .chart-y {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 50px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            pointer-events: none;
            font-size: 11px;
            color: #475569;
            font-weight: 700;
          }

          .chart-x {
            display: grid;
            gap: 0;
            margin-top: 8px;
            padding-bottom: 8px;
            font-size: 11px;
            color: #475569;
            font-weight: 700;
            text-align: center;
          }

          .chart-note {
            margin-top: 8px;
            font-size: 11px;
            color: #64748b;
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

          .summary-wrap {
            overflow-x: auto;
          }

          .summary-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 1100px;
          }

          .summary-table th {
            background: #244f15;
            color: #fff;
            font-size: 12px;
            font-weight: 900;
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

          .node-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 900;
            color: #fff;
            background: #5db866;
          }

          @media (max-width: 900px) {
            .history-grid {
              grid-template-columns: 1fr;
            }

            .sensor-dd-grid {
              grid-template-columns: 1fr;
            }

            .chart-head {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}