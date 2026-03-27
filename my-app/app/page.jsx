"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DuwimsStaticPage from "./components/DuwimsStaticPage";
import "leaflet/dist/leaflet.css";

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

function plotNameOf(plot, idx) {
  return plot?.plotName || plot?.alias || plot?.name || `แปลง ${idx + 1}`;
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

function sensorRangeText(sensorName = "") {
  const key = String(sensorName).toLowerCase();

  if (key.includes("temp") || key.includes("อุณหภูมิ")) {
    return { min: "20 °C", max: "35 °C" };
  }
  if (
    (key.includes("humidity") && !key.includes("soil")) ||
    key.includes("ความชื้นสัมพัทธ์") ||
    key === "rh"
  ) {
    return { min: "75 %", max: "85 %" };
  }
  if (key.includes("wind") || key.includes("ลม")) {
    return { min: "< 0.56 m/s", max: "0.56 - 1.39 m/s" };
  }
  if (key.includes("light") || key.includes("แสง")) {
    return { min: "< 40000 lux", max: "40000 - 60000 lux" };
  }
  if (key.includes("rain") || key.includes("ฝน")) {
    return { min: "< 4 mm", max: "4 - 8 mm" };
  }
  if (
    key.includes("soil") ||
    key.includes("moisture") ||
    key.includes("ความชื้นในดิน") ||
    key.includes("ดิน")
  ) {
    return { min: "65 %", max: "80 %" };
  }
  if (key === "n" || key.includes("ไนโตรเจน")) {
    return { min: "0.1 %", max: "1.0 %" };
  }
  if (key === "p" || key.includes("ฟอสฟอรัส")) {
    return { min: "25 ppm", max: "45 ppm" };
  }
  if (key === "k" || key.includes("โพแทสเซียม")) {
    return { min: "0.8 cmol/kg", max: "1.4 cmol/kg" };
  }
  if (key.includes("water") || key.includes("ให้น้ำ")) {
    return { min: "50 %", max: "90 %" };
  }

  return { min: "-", max: "-" };
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

function getDisplayUnit(sensor = {}) {
  return sensor?.unit || sensor?.sensorUnit || sensor?.latestUnit || "";
}

function formatSensorValue(value, unit = "") {
  if (value === null || value === undefined || value === "") return "-";
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function getSensorLimitRange(sensor = {}, sensorName = "") {
  const minValue = toNum(sensor?.minValue);
  const maxValue = toNum(sensor?.maxValue);
  const unit = getDisplayUnit(sensor);

  if (minValue != null || maxValue != null) {
    return {
      min: minValue,
      max: maxValue,
      minText: formatSensorValue(minValue ?? "-", unit),
      maxText: formatSensorValue(maxValue ?? "-", unit),
      unit,
      source: "sensor",
    };
  }

  const fallback = sensorRangeText(sensorName);
  return {
    min: null,
    max: null,
    minText: fallback.min,
    maxText: fallback.max,
    unit,
    source: "fallback",
  };
}

function isSensorOutOfRange(sensor = {}, sensorName = "") {
  const latest = getLatestNumericValue(sensor);
  const range = getSensorLimitRange(sensor, sensorName);

  if (latest == null) return false;
  if (range.min != null && latest < range.min) return true;
  if (range.max != null && latest > range.max) return true;
  return false;
}

function buildMapData(plotsRaw) {
  const polygons = [];
  const pins = [];

  (Array.isArray(plotsRaw) ? plotsRaw : []).forEach((plot, plotIndex) => {
    const plotName = plotNameOf(plot, plotIndex);
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
        pinName: node?.nodeName || node?.uid || `Node ${nodeIndex + 1}`,
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

const htmlContent = `<div id="p1" class="page active">

  <div class="grid-top">

    <div class="card">
      <div class="card-title">🌤 พยากรณ์อากาศ 7 วันข้างหน้า</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px">อิงจากพื้นที่แปลงปลูก · Open-Meteo API</div>
      <div class="weather-strip">
        <div class="weather-day"><div class="wd-name">วันนี้</div><div class="wd-icon">🌧️</div><div class="wd-temp">29°</div><div class="wd-rain">ฝน 83%</div></div>
        <div class="weather-day"><div class="wd-name">จ.</div><div class="wd-icon">🌦️</div><div class="wd-temp">28°</div><div class="wd-rain">ฝน 65%</div></div>
        <div class="weather-day"><div class="wd-name">อ.</div><div class="wd-icon">🌧️</div><div class="wd-temp">27°</div><div class="wd-rain">ฝน 72%</div></div>
        <div class="weather-day"><div class="wd-name">พ.</div><div class="wd-icon">🌤️</div><div class="wd-temp">30°</div><div class="wd-rain">ฝน 30%</div></div>
        <div class="weather-day"><div class="wd-name">พฤ.</div><div class="wd-icon">🌤️</div><div class="wd-temp">31°</div><div class="wd-rain">ฝน 20%</div></div>
        <div class="weather-day"><div class="wd-name">ศ.</div><div class="wd-icon">🌦️</div><div class="wd-temp">29°</div><div class="wd-rain">ฝน 45%</div></div>
        <div class="weather-day"><div class="wd-name">ส.</div><div class="wd-icon">🌤️</div><div class="wd-temp">30°</div><div class="wd-rain">ฝน 25%</div></div>
      </div>
    </div>

    <div class="col-stack">
      <div class="metric-card mc-blue">
        <div class="metric-card-label">🌡 อุณหภูมิปัจจุบัน (วันนี้)</div>
        <div class="metric-card-value">22–29°C</div>
        <div class="metric-card-sub">อิงจากพยากรณ์รายวันของพื้นที่แปลง</div>
      </div>
      <div class="metric-card mc-yellow">
        <div class="metric-card-label">🌧 โอกาสฝนตก (วันนี้)</div>
        <div class="metric-card-value">83%</div>
        <div class="metric-card-sub">อิงจาก precipitation probability (รายวัน)</div>
      </div>
    </div>

    <div class="col-stack">
      <div class="metric-card mc-red">
        <div class="metric-card-label">💡 คำแนะนำ</div>
        <div class="metric-card-value" style="font-size:15px;line-height:1.5;font-family:'Sarabun',sans-serif;font-weight:600">มีโอกาสฝนสูงใน 2–3 วันข้างหน้า ควรเตรียมระบบระบายน้ำ/ตรวจร่องน้ำในแปลง</div>
      </div>
      <div class="metric-card mc-green">
        <div class="metric-card-label">🌧 ปริมาณน้ำฝน (7 วัน)</div>
        <div class="metric-card-value">15 mm</div>
        <div class="metric-card-sub">รวมจาก precipitation_sum รายวัน</div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div class="card-title">🗺 แผนที่และทรัพยากร (ทุกแปลง)</div>
      <div style="font-size:11px;color:var(--muted)">แสดง polygon แปลงทั้งหมด + หมุด Node ทั้งหมด</div>
    </div>
    <div id="dashboardMapHost" style="width:100%;min-height:320px;border-radius:18px;overflow:hidden;position:relative;background:#dfeecf;border:1px solid rgba(0,0,0,.08)">
      <div id="dashboardMap" style="width:100%;height:320px;min-height:320px;display:block;border-radius:18px;overflow:hidden;background:#dfeecf"></div>
    </div>
    <div style="margin-top:10px;display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#475569">
      <div id="mapPlotCount">จำนวนแปลง: 0</div>
      <div id="mapPinCount">จำนวนหมุดทั้งหมด: 0</div>
      <div>สีน้ำเงิน = Air Node / สีเขียว = Soil Node</div>
    </div>
  </div>

  <div class="grid-2" style="margin-bottom:16px">
    <div class="status-on">
      <div class="on-label">📡 สถานะการทำงาน</div>
      <div style="font-size:11px;opacity:0.80;margin-bottom:10px">อัปเดตจากระบบล่าสุด</div>
      <div class="on-value">ON <span id="dashboardNodeOnCount" style="font-size:20px">0</span> เครื่อง</div>
      <div class="on-sub">OFF <span id="dashboardNodeOffCount">0</span> เครื่อง</div>
    </div>
    <div class="status-alert">
      <div style="font-size:14px;font-weight:700;color:#7c2d12;margin-bottom:8px">⚠️ ปัญหาที่พบ</div>
      <div id="dashboardIssueCount" style="font-size:13px;font-weight:700;color:#7c2d12;margin-bottom:8px">ตรวจพบความผิดปกติ 0 กลุ่ม</div>
      <div id="dashboardIssueList"></div>
    </div>
  </div>

  <div class="section-title">ข้อมูลเซนเซอร์รายแปลง</div>
  <div id="dashboardSensorCards" class="grid-2"></div>
</div>`;

function buildSensorCards(plots = []) {
  const cards = [];

  for (const plot of plots) {
    const plotName = plot?.plotName || "ไม่ทราบชื่อแปลง";
    const nodes = Array.isArray(plot?.nodes) ? plot.nodes : [];

    for (const node of nodes) {
      const nodeName = node?.nodeName || node?.uid || "Node";
      const nodeType = inferNodeType(node);
      const nodeStatus = String(node?.status || "INACTIVE").toUpperCase();
      const sensors = Array.isArray(node?.sensors) ? node.sensors : [];

      let hasProblemInNode = false;

      const sensorGroups = sensors.length
        ? sensors
            .map((sensor) => {
              const sensorName = sensor?.name || sensor?.uid || "Sensor";
              const latestTs = formatDateTime(
                sensor?.latestTimestamp ||
                  sensor?.lastReadingAt ||
                  sensor?.ts ||
                  sensor?.updatedAt
              );

              const latestNumeric = getLatestNumericValue(sensor);
              const range = getSensorLimitRange(sensor, sensorName);
              const unit = range.unit || getDisplayUnit(sensor);
              const isOut = isSensorOutOfRange(sensor, sensorName);

              if (isOut) hasProblemInNode = true;

              const latestValueText =
                latestNumeric != null
                  ? formatSensorValue(latestNumeric, unit)
                  : displayLatest(sensor);

              const sensorBoxStyle = isOut
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

              const valueStyle = isOut
                ? "color:#dc2626;font-weight:800;"
                : "color:#166534;font-weight:800;";

              const statusText = isOut ? "ค่าสูง/ต่ำเกินช่วงที่กำหนด" : "ค่าปกติ";
              const statusStyle = isOut
                ? "color:#dc2626;font-weight:800;"
                : "color:#166534;font-weight:800;";

              return `
                <div class="sensor-group">
                  <div class="sg-title">${escapeHtml(sensorName)}</div>
                  <div class="sg-grid">
                    <div class="sg-item" style="${sensorBoxStyle}">
                      <div class="sgi-name">${escapeHtml(sensorName)}</div>
                      <div class="sgi-vmm">
                        <div class="sgi-row">
                          <span class="sgi-row-label">Value</span>
                          <span class="sgi-row-val" style="${valueStyle}">
                            ${escapeHtml(latestValueText)}
                          </span>
                        </div>
                        <div class="sgi-row">
                          <span class="sgi-row-label">MIN</span>
                          <span class="sgi-row-sub">${escapeHtml(range.minText)}</span>
                        </div>
                        <div class="sgi-row">
                          <span class="sgi-row-label">MAX</span>
                          <span class="sgi-row-sub">${escapeHtml(range.maxText)}</span>
                        </div>
                        <div class="sgi-row">
                          <span class="sgi-row-label">Updated</span>
                          <span class="sgi-row-sub">${escapeHtml(latestTs)}</span>
                        </div>
                        <div class="sgi-row">
                          <span class="sgi-row-label" style="${statusStyle}">สถานะ</span>
                          <span class="sgi-row-sub" style="${statusStyle}">
                            ${escapeHtml(statusText)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            })
            .join("")
        : `
          <div class="sensor-group">
            <div class="sg-title">ไม่มีเซนเซอร์</div>
            <div class="sg-grid">
              <div class="sg-item" style="
                border:1.5px solid #22c55e;
                background:#f0fdf4;
                box-shadow:0 0 0 1px rgba(34,197,94,.08) inset;
              ">
                <div class="sgi-name">ยังไม่มีข้อมูล sensor</div>
              </div>
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
        <div class="pin-card" style="${cardStyle}">
          <div class="pin-header">
            <div>
              <div class="pin-name">ข้อมูล : ${escapeHtml(plotName)} • ${escapeHtml(
        nodeType === "soil" ? "Soil Node" : "Air Node"
      )} • Node:${escapeHtml(nodeName)}</div>
              <div class="pin-sub">รายละเอียดของอุปกรณ์และเซนเซอร์</div>
            </div>
            <div class="status-badge" style="${badgeStyle}">
              ${hasProblemInNode ? "ผิดปกติ" : "ปกติ"} • ${escapeHtml(nodeStatus)}
            </div>
          </div>
          ${sensorGroups}
        </div>
      `);
    }
  }

  return cards.join("");
}

function buildIssueSummary(plots = []) {
  const issues = [];

  for (const plot of plots) {
    const nodes = Array.isArray(plot?.nodes) ? plot.nodes : [];
    for (const node of nodes) {
      const sensors = Array.isArray(node?.sensors) ? node.sensors : [];
      for (const sensor of sensors) {
        const sensorName = sensor?.name || sensor?.uid || "Sensor";
        const latestNumeric = getLatestNumericValue(sensor);
        const range = getSensorLimitRange(sensor, sensorName);
        const status = String(sensor?.status || "").toUpperCase();

        const outByRange =
          latestNumeric != null &&
          ((range.min != null && latestNumeric < range.min) ||
            (range.max != null && latestNumeric > range.max));

        if (outByRange) {
          issues.push({
            plotName: plot?.plotName || "แปลง",
            nodeName: node?.nodeName || node?.uid || "Node",
            sensorName,
            status: "OUT_OF_RANGE",
            latestValue: latestNumeric,
            min: range.min,
            max: range.max,
            unit: range.unit || getDisplayUnit(sensor),
          });
          continue;
        }

        if (status && status !== "OK") {
          issues.push({
            plotName: plot?.plotName || "แปลง",
            nodeName: node?.nodeName || node?.uid || "Node",
            sensorName,
            status,
            latestValue: latestNumeric,
            min: range.min,
            max: range.max,
            unit: range.unit || getDisplayUnit(sensor),
          });
        }
      }
    }
  }

  return issues;
}

export default function Page() {
  const mapRef = useRef(null);
  const [plots, setPlots] = useState([]);
  const [loadingMap, setLoadingMap] = useState(true);
  const [mapError, setMapError] = useState("");

  const mapData = useMemo(() => buildMapData(plots), [plots]);

  useEffect(() => {
    let alive = true;

    async function loadPlots() {
      setLoadingMap(true);
      setMapError("");

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
        setMapError(err?.message || "ไม่สามารถโหลดข้อมูล dashboard ได้");
      } finally {
        if (alive) setLoadingMap(false);
      }
    }

    loadPlots();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const cardsEl = document.getElementById("dashboardSensorCards");
    const onCountEl = document.getElementById("dashboardNodeOnCount");
    const offCountEl = document.getElementById("dashboardNodeOffCount");
    const issueCountEl = document.getElementById("dashboardIssueCount");
    const issueListEl = document.getElementById("dashboardIssueList");

    if (cardsEl) {
      cardsEl.innerHTML = buildSensorCards(plots);
    }

    const allNodes = plots.flatMap((p) => (Array.isArray(p?.nodes) ? p.nodes : []));
    const onCount = allNodes.filter((n) => {
      const s = String(n?.status || "").toUpperCase();
      return s === "ONLINE" || s === "ACTIVE" || s === "ON";
    }).length;
    const offCount = Math.max(allNodes.length - onCount, 0);

    if (onCountEl) onCountEl.textContent = String(onCount);
    if (offCountEl) offCountEl.textContent = String(offCount);

    const issues = buildIssueSummary(plots);
    if (issueCountEl) {
      issueCountEl.textContent = `ตรวจพบความผิดปกติ ${issues.length} กลุ่ม`;
    }

    if (issueListEl) {
      issueListEl.innerHTML = issues.length
        ? issues
            .map((issue) => {
              const extra =
                issue.status === "OUT_OF_RANGE"
                  ? ` • ${escapeHtml(
                      formatSensorValue(issue.latestValue, issue.unit)
                    )} นอกช่วง (${escapeHtml(
                      formatSensorValue(issue.min, issue.unit)
                    )} - ${escapeHtml(formatSensorValue(issue.max, issue.unit))})`
                  : ` • ${escapeHtml(issue.status)}`;

              return `
                <div class="alert-pill">
                  ${escapeHtml(issue.sensorName)}${extra} • ${escapeHtml(
                issue.plotName
              )} / ${escapeHtml(issue.nodeName)}
                </div>
              `;
            })
            .join("")
        : `<div class="alert-pill">ไม่พบความผิดปกติ</div>`;
    }
  }, [plots]);

  useEffect(() => {
    let mounted = true;
    let mapInstance = null;

    async function initLeaflet() {
      if (loadingMap) return;

      const hostEl = document.getElementById("dashboardMapHost");
      const plotCountEl = document.getElementById("mapPlotCount");
      const pinCountEl = document.getElementById("mapPinCount");

      if (plotCountEl) {
        plotCountEl.textContent = `จำนวนแปลง: ${mapData.polygons.length}`;
      }

      if (pinCountEl) {
        pinCountEl.textContent = `จำนวนหมุดทั้งหมด: ${mapData.pins.length}`;
      }

      if (!hostEl) return;

      if (mapError) {
        if (mapRef.current) {
          mapRef.current.remove();
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

      if (!mapEl) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      if (mapEl._leaflet_id) {
        mapEl._leaflet_id = null;
      }

      try {
        const leafletModule = await import("leaflet");
        const L = leafletModule.default || leafletModule;

        if (!mounted || !L) return;

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
              <div>จำนวนจุด polygon: ${poly.coords.length}</div>
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
                    const sensorName = sensor?.name || sensor?.uid || `Sensor ${i + 1}`;
                    const latestValue = displayLatest(sensor);
                    const latestTs = formatDateTime(
                      sensor?.latestTimestamp ||
                        sensor?.lastReadingAt ||
                        sensor?.ts ||
                        sensor?.updatedAt
                    );
                    return `<li>${escapeHtml(sensorName)} • ${escapeHtml(
                      latestValue
                    )} • ${escapeHtml(latestTs)}</li>`;
                  })
                  .join("")}
               </ul>`
            : `<div>ไม่มี sensor</div>`;

          marker.bindTooltip(pin.pinName, {
            direction: "top",
            offset: [0, -8],
            opacity: 1,
          });

          marker.bindPopup(`
            <div style="min-width:240px">
              <div style="font-weight:800;margin-bottom:6px">${escapeHtml(pin.pinName)}</div>
              <div style="margin-bottom:4px">แปลง: ${escapeHtml(pin.plotName)}</div>
              <div style="margin-bottom:4px">ประเภท: ${escapeHtml(
                nodeType === "soil" ? "Soil Node" : "Air Node"
              )}</div>
              <div style="margin-bottom:4px">สถานะ: ${escapeHtml(node?.status || "-")}</div>
              <div style="margin-bottom:4px">lat ${escapeHtml(pin.lat)}, lng ${escapeHtml(pin.lng)}</div>
              <div style="font-weight:700;margin-top:8px;margin-bottom:4px">Sensors ล่าสุด</div>
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

        setTimeout(() => {
          if (mapInstance) mapInstance.invalidateSize(true);
        }, 250);

        mapRef.current = mapInstance;
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
            โหลด Leaflet ไม่สำเร็จ
          </div>
        `;
      }
    }

    const t = setTimeout(initLeaflet, 100);

    return () => {
      mounted = false;
      clearTimeout(t);

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const mapEl = document.getElementById("dashboardMap");
      if (mapEl && mapEl._leaflet_id) {
        mapEl._leaflet_id = null;
      }
    };
  }, [loadingMap, mapError, mapData]);

  return <DuwimsStaticPage current="dashboard" htmlContent={htmlContent} />;
}