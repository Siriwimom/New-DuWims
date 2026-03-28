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

function getSensorThresholdProfile(sensorName = "") {
  const key = String(sensorName).trim().toLowerCase();

  if (key.includes("temp") || key.includes("อุณหภูมิ")) {
    return {
      label: "อุณหภูมิ",
      min: 20,
      max: 35,
      displayMin: "20 °C",
      displayMax: "35 °C",
      lowReason:
        "ต่ำกว่า 20: ต้นชะงักการดึงน้ำ ปากใบปิดทำให้สังเคราะห์แสงหยุดชะงัก",
      highReason:
        "สูงกว่า 35: พืชเครียดจากความร้อนจัด ใบไหม้และดอกร่วงก่อนกำหนด",
    };
  }

  if (
    (key.includes("humidity") && !key.includes("soil")) ||
    key.includes("ความชื้นสัมพัทธ์") ||
    key === "rh"
  ) {
    return {
      label: "ความชื้นสัมพัทธ์",
      min: 75,
      max: 85,
      displayMin: "75 %",
      displayMax: "85 %",
      lowReason:
        "ต่ำกว่า 75: อากาศแห้งเกินไป ดอกและหางแย้สูญเสียน้ำจนแห้งร่วง",
      highReason:
        "สูงกว่า 85: อากาศอิ่มตัว เกสรจับก้อนผสมไม่ติด และเสี่ยงโรคเชื้อรา",
    };
  }

  if (key.includes("wind") || key.includes("ลม")) {
    return {
      label: "ความเร็วลม",
      min: 2,
      max: 5,
      displayMin: "2 กม./ชม.",
      displayMax: "5 กม./ชม.",
      lowReason:
        "ต่ำกว่า 2: อากาศไม่ไหลเวียน ความร้อนสะสมในทรงพุ่มสูงเกินเกณฑ์",
      highReason:
        "สูงกว่า 5: กิ่งฉีกขาดง่าย และใบสูญเสียน้ำเร็วเกินไปจนต้นเหี่ยวเฉา",
    };
  }

  if (key.includes("light") || key.includes("แสง")) {
    return {
      label: "ความเข้มแสง",
      min: 40000,
      max: 60000,
      displayMin: "40,000 Lux",
      displayMax: "60,000 Lux",
      lowReason:
        "ต่ำกว่า 40,000: พลังงานแสงไม่พอต่อการสร้างตาดอกและเลี้ยงผลอ่อน",
      highReason:
        "สูงกว่า 60,000: รังสีความร้อนแรงเกินไป ทำลายเนื้อเยื่อผิวใบและผล (Sunburn)",
    };
  }

  if (key.includes("rain") || key.includes("ฝน")) {
    return {
      label: "ปริมาณน้ำฝน",
      min: 4,
      max: 10,
      displayMin: "4 มม./วัน",
      displayMax: "8 มม./วัน",
      lowReason:
        "ต่ำกว่า 4: ดินแห้งเกินไป กระทบต่อการละลายและการดูดซึมธาตุอาหาร",
      highReason:
        "สูงกว่า 10: กระตุ้นการแตกใบอ่อนแทนการออกดอก และน้ำเกินจนผลร่วง",
    };
  }

  if (
    key.includes("soil") ||
    key.includes("moisture") ||
    key.includes("ความชื้นในดิน") ||
    key.includes("ดิน")
  ) {
    return {
      label: "ความชื้นในดิน",
      min: 65,
      max: 80,
      displayMin: "65 %",
      displayMax: "80 %",
      lowReason:
        "ต่ำกว่า 65: ดินแห้งจนรากฝอยตาย ส่งน้ำไปเลี้ยงผลไม่ต่อเนื่อง",
      highReason:
        "สูงกว่า 80: ดินขาดอากาศ รากหายใจไม่ได้และเน่าตายจากเชื้อราในดิน",
    };
  }

  if (key === "n" || key.includes("ไนโตรเจน")) {
    return {
      label: "ไนโตรเจน (N)",
      min: 0.1,
      max: 1.0,
      displayMin: "0.1",
      displayMax: "1.0",
      lowReason:
        "ต่ำกว่า 0.1: ต้นแคระแกร็น ใบเหลืองซีด ขาดพลังงานเจริญเติบโต",
      highReason:
        "สูงกว่า 1.0: ต้นบ้าใบ จะสลัดลูกทิ้งเพื่อไปเลี้ยงใบอ่อนแทน",
    };
  }

  if (key === "p" || key.includes("ฟอสฟอรัส")) {
    return {
      label: "ฟอสฟอรัส (P)",
      min: 25,
      max: 45,
      displayMin: "25 ppm",
      displayMax: "45 ppm",
      lowReason:
        "ต่ำกว่า 25: พลังงานสะสมไม่พอสร้างตาดอก และระบบรากไม่เดิน",
      highReason:
        "สูงกว่า 45: ธาตุเกินจนไปขัดขวางการดูดซึมธาตุอาหารรองชนิดอื่น",
    };
  }

  if (key === "k" || key.includes("โพแทสเซียม")) {
    return {
      label: "โพแทสเซียม (K)",
      min: 0.8,
      max: 1.4,
      displayMin: "0.8 cmol/kg",
      displayMax: "1.4 cmol/kg",
      lowReason:
        "ต่ำกว่า 0.8: การเคลื่อนย้ายน้ำตาลผิดปกติ ผลบิดเบี้ยว เนื้อไม่หวาน",
      highReason:
        "สูงกว่า 1.4: ดินเค็มและขัดขวางการดูดซึมแคลเซียม ทำให้เปลือกแตก",
    };
  }

  if (key.includes("water") || key.includes("ให้น้ำ")) {
    return {
      label: "การให้น้ำ",
      min: 80,
      max: 150,
      displayMin: "80 ลิตร/วัน/ต้น",
      displayMax: "150 ลิตร/วัน/ต้น",
      lowReason:
        "ต่ำกว่า 80: ปริมาณน้ำไม่พอเลี้ยงผล ทำให้ลูกฝ่อและชะงักการโต",
      highReason:
        "สูงกว่า 150: สิ้นเปลืองน้ำโดยเปล่าประโยชน์ และเสี่ยงเกิดโรครากเน่า",
    };
  }

  return {
    label: sensorName || "Sensor",
    min: null,
    max: null,
    displayMin: "-",
    displayMax: "-",
    lowReason: "",
    highReason: "",
  };
}

function getSensorStatusInfo(sensor = {}, sensorName = "") {
  const latest = getLatestNumericValue(sensor);
  const profile = getSensorThresholdProfile(sensorName);
  const unit = getDisplayUnit(sensor);

  if (latest == null) {
    return {
      latest,
      unit,
      profile,
      isOut: false,
      statusText: "ไม่มีข้อมูลปัจจุบัน",
      reasonText: "ไม่พบค่าปัจจุบันจาก latestValue / value / lastReading",
    };
  }

  if (profile.min != null && latest < profile.min) {
    return {
      latest,
      unit,
      profile,
      isOut: true,
      statusText: "ค่าต่ำเกินช่วงที่กำหนด",
      reasonText: profile.lowReason,
    };
  }

  if (profile.max != null && latest > profile.max) {
    return {
      latest,
      unit,
      profile,
      isOut: true,
      statusText: "ค่าสูงเกินช่วงที่กำหนด",
      reasonText: profile.highReason,
    };
  }

  return {
    latest,
    unit,
    profile,
    isOut: false,
    statusText: "ค่าปกติ",
    reasonText: "ค่าอยู่ในช่วงที่กำหนด",
  };
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
              const sensorStatus = getSensorStatusInfo(sensor, sensorName);
              const range = sensorStatus.profile;
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
                ? "color:#dc2626;font-weight:800;"
                : "color:#166534;font-weight:800;";

              const statusStyle = sensorStatus.isOut
                ? "color:#dc2626;font-weight:800;"
                : "color:#166534;font-weight:800;";

              const reasonStyle = sensorStatus.isOut
                ? "color:#991b1b;font-weight:700;line-height:1.5;"
                : "color:#166534;line-height:1.5;";

              return `
                <div class="sensor-group">
                  <div class="sg-title">${escapeHtml(sensorName)}</div>
                  <div class="sg-grid">
                    <div class="sg-item" style="${sensorBoxStyle}">
                      <div class="sgi-name">${escapeHtml(sensorName)}</div>
                      <div class="sgi-vmm">
                        <div class="sgi-row">
                          <span class="sgi-row-label">ค่าปัจจุบัน</span>
                          <span class="sgi-row-val" style="${valueStyle}">
                            ${escapeHtml(latestValueText)}
                          </span>
                        </div>
                        <div class="sgi-row">
                          <span class="sgi-row-label">MIN</span>
                          <span class="sgi-row-sub">${escapeHtml(range.displayMin)}</span>
                        </div>
                        <div class="sgi-row">
                          <span class="sgi-row-label">MAX</span>
                          <span class="sgi-row-sub">${escapeHtml(range.displayMax)}</span>
                        </div>
                        <div class="sgi-row">
                          <span class="sgi-row-label" style="${statusStyle}">สถานะ</span>
                          <span class="sgi-row-sub" style="${statusStyle}">
                            ${escapeHtml(sensorStatus.statusText)}
                          </span>
                        </div>
                        <div class="sgi-row" style="align-items:flex-start">
                          <span class="sgi-row-label" style="${statusStyle}">เหตุผล</span>
                          <span class="sgi-row-sub" style="${reasonStyle}">
                            ${escapeHtml(sensorStatus.reasonText)}
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
        const info = getSensorStatusInfo(sensor, sensorName);

        if (info.isOut) {
          issues.push({
            plotName: plot?.plotName || "แปลง",
            nodeName: node?.nodeName || node?.uid || "Node",
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
              return `
                <div class="alert-pill" style="display:block;line-height:1.5">
                  <div style="font-weight:800">
                    ${escapeHtml(issue.sensorName)} • ${escapeHtml(issue.statusText)}
                  </div>
                  <div>
                    ค่า ${escapeHtml(formatSensorValue(issue.latestValue, issue.unit))}
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
                    return `<li>${escapeHtml(sensorName)} • ${escapeHtml(
                      latestValue
                    )}</li>`;
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
              <div style="font-weight:700;margin-top:8px;margin-bottom:4px">Sensors ปัจจุบัน</div>
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