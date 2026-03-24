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
  return plot?.alias || plot?.plotName || plot?.name || `แปลง ${idx + 1}`;
}

function pinNameOf(pin, idx) {
  return pin?.pinName || pin?.name || pin?.number || `Pin ${idx + 1}`;
}

function buildMapData(plotsRaw) {
  const polygons = [];
  const pins = [];

  (Array.isArray(plotsRaw) ? plotsRaw : []).forEach((plot, plotIndex) => {
    const plotName = plotNameOf(plot, plotIndex);
    const polygonCoords = normalizeCoords(plot?.polygon?.coords || plot?.coords || []);

    if (polygonCoords.length >= 3) {
      polygons.push({
        id: plot?.id || plot?._id || `plot-${plotIndex}`,
        name: plotName,
        color: plot?.polygon?.color || "#6c8f5d",
        coords: polygonCoords,
      });
    }

    const sourcePins = [
      ...(Array.isArray(plot?.polygon?.pins) ? plot.polygon.pins : []),
      ...(Array.isArray(plot?.pins) ? plot.pins : []),
    ];

    sourcePins.forEach((pin, pinIndex) => {
      const lat = toNum(pin?.lat);
      const lng = toNum(pin?.lng);
      if (lat == null || lng == null) return;

      const airNodes = Array.isArray(pin?.node_air) ? pin.node_air : [];
      const soilNodes = Array.isArray(pin?.node_soil) ? pin.node_soil : [];
      const nodes = [...airNodes, ...soilNodes];

      pins.push({
        id:
          pin?.id ||
          pin?._id ||
          `${plotIndex}-${pinIndex}-${lat.toFixed(6)}-${lng.toFixed(6)}`,
        pinName: pinNameOf(pin, pinIndex),
        plotName,
        lat,
        lng,
        nodes,
      });
    });
  });

  return { polygons, pins };
}

const htmlContent = `<div id="p1" class="page active">

  <!-- TOP GRID: Weather + Metrics -->
  <div class="grid-top">

    <!-- Weather 7 Days -->
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

    <!-- Mid: Temp + Rain -->
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

    <!-- Right: Advice + Rain sum -->
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

  <!-- MAP -->
  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div class="card-title">🗺 แผนที่และทรัพยากร (ทุกแปลง)</div>
      <div style="font-size:11px;color:var(--muted)">แสดง polygon แปลง + หมุด Node ทั้งหมด</div>
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

  <!-- STATUS + ISSUES -->
  <div class="grid-2" style="margin-bottom:16px">
    <div class="status-on">
      <div class="on-label">📡 สถานะการทำงาน</div>
      <div style="font-size:11px;opacity:0.80;margin-bottom:10px">อัปเดตจากระบบ • อัปเดต: 22/03/2569 00:30</div>
      <div class="on-value">ON <span style="font-size:20px">5</span> เครื่อง</div>
      <div class="on-sub">OFF 0 เครื่อง</div>
    </div>
    <div class="status-alert">
      <div style="font-size:14px;font-weight:700;color:#7c2d12;margin-bottom:8px">⚠️ ปัญหาที่พบ</div>
      <div style="font-size:13px;font-weight:700;color:#7c2d12;margin-bottom:8px">ตรวจพบความผิดปกติ 4 กลุ่ม</div>
      <div class="alert-pill">🌬️ วัดความเร็วลม ต่ำเกิน (&lt; 0.56 m/s)</div>
      <div class="alert-pill">☀️ ความเข้มแสง ต่ำเกิน (&lt; 40000 lux)</div>
      <div class="alert-pill">🌧 ปริมาณน้ำฝน ต่ำเกิน (&lt; 4 mm)</div>
      <div class="alert-pill">🌱 ความชื้นในดิน ต่ำเกิน (&lt; 65 %)</div>
    </div>
  </div>

  <!-- PIN CARDS -->
  <div class="section-title">ข้อมูลเซนเซอร์รายแปลง</div>
  <div class="grid-2">

    <!-- AIR NODE -->
    <div class="pin-card alert-card">
      <div class="pin-header">
        <div>
          <div class="pin-name">ข้อมูล : แปลงองุ่น 1 • Air Node • Node:กลางไร่</div>
          <div class="pin-sub">รายละเอียดของอุปกรณ์และเซนเซอร์</div>
        </div>
        <div class="status-badge">ON</div>
      </div>

      <div class="sensor-group">
        <div class="sg-title">🌡 อุณหภูมิ</div>
        <div class="sg-grid">
          <div class="sg-item">
            <div class="sgi-name">อุณหภูมิ</div>
            <div class="sgi-vmm">
              <div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">20 °C</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">35 °C</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="sensor-group">
        <div class="sg-title">💧 ความชื้น</div>
        <div class="sg-grid">
          <div class="sg-item">
            <div class="sgi-name">ความชื้น</div>
            <div class="sgi-vmm">
              <div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">75 %</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">85 %</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="sensor-group">
        <div class="sg-title">🌬 วัดความเร็วลม</div>
        <div class="sg-grid">
          <div class="sg-item alert-item">
            <div class="sgi-name alert">วัดความเร็วลม</div>
            <div class="sgi-vmm">
              <div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val av">-</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">&lt; 0.56 m/s</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">0.56 - 1.39 m/s</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="sensor-group">
        <div class="sg-title">☀️ ความเข้มแสง</div>
        <div class="sg-grid">
          <div class="sg-item alert-item">
            <div class="sgi-name alert">ความเข้มแสง</div>
            <div class="sgi-vmm">
              <div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val av">-</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">&lt; 40000 lux</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">40000 - 60000 lux</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="sensor-group">
        <div class="sg-title">🌧 ปริมาณน้ำฝน</div>
        <div class="sg-grid">
          <div class="sg-item alert-item">
            <div class="sgi-name alert">ปริมาณน้ำฝน</div>
            <div class="sgi-vmm">
              <div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val av">-</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">&lt; 4 mm</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">4 - 8 mm</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SOIL NODE -->
    <div class="pin-card alert-card">
      <div class="pin-header">
        <div>
          <div class="pin-name">ข้อมูล : แปลงองุ่น 1 • Soil Node • Node:กลางไร่</div>
          <div class="pin-sub">รายละเอียดของอุปกรณ์และเซนเซอร์</div>
        </div>
        <div class="status-badge">ON</div>
      </div>

      <div class="sensor-group">
        <div class="sg-title">🌡 อุณหภูมิ</div>
        <div class="sg-grid">
          <div class="sg-item">
            <div class="sgi-name">อุณหภูมิ</div>
            <div class="sgi-vmm">
              <div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">20 °C</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">35 °C</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="sensor-group">
        <div class="sg-title">🌱 ความชื้นในดิน</div>
        <div class="sg-grid">
          <div class="sg-item alert-item">
            <div class="sgi-name alert">ความชื้นในดิน</div>
            <div class="sgi-vmm">
              <div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val av">-</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">&lt; 65 %</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">65 - 80 %</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="sensor-group">
        <div class="sg-title">🧪 ความเข้มข้นธาตุอาหาร (N,P,K)</div>

        <div class="sg-grid" style="grid-template-columns:1fr;gap:12px;">
          <div class="sg-item" style="width:32%;min-height:80px;display:flex;flex-direction:column;justify-content:flex-start;">
            <div class="sgi-name">N</div>
            <div class="sgi-vmm">
              <div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">0.1 %</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">1.0 %</span></div>
            </div>
          </div>

          <div class="sg-item" style="width:32%;min-height:80px;display:flex;flex-direction:column;justify-content:flex-start;">
            <div class="sgi-name">P</div>
            <div class="sgi-vmm">
              <div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">25 ppm</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">45 ppm</span></div>
            </div>
          </div>

          <div class="sg-item" style="width:32%;min-height:80px;display:flex;flex-direction:column;justify-content:flex-start;">
            <div class="sgi-name">K</div>
            <div class="sgi-vmm">
              <div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">0.8 cmol/kg</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">1.4 cmol/kg</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="sensor-group">
        <div class="sg-title">🚿 การให้น้ำ / ความพร้อมใช้น้ำ</div>
        <div class="sg-grid">
          <div class="sg-item">
            <div class="sgi-name">การให้น้ำ</div>
            <div class="sgi-vmm">
              <div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">50 %</span></div>
              <div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">90 %</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>`;

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
        const res = await fetch(`${getApiBase()}/api/plots`, {
          headers: {
            "Content-Type": "application/json",
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
          },
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`โหลดข้อมูลแปลงไม่สำเร็จ (${res.status})`);
        }

        const data = await res.json();
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.plots)
          ? data.plots
          : Array.isArray(data?.data)
          ? data.data
          : [];

        if (!alive) return;
        setPlots(rows);
      } catch (err) {
        if (!alive) return;
        setPlots([]);
        setMapError(err?.message || "ไม่สามารถโหลดแผนที่ได้");
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
    let mounted = true;
    let L = null;
    let mapInstance = null;

    async function initLeaflet() {
      if (loadingMap) return;

      const mapEl = document.getElementById("dashboardMap");
      const hostEl = document.getElementById("dashboardMapHost");
      const plotCountEl = document.getElementById("mapPlotCount");
      const pinCountEl = document.getElementById("mapPinCount");

      if (plotCountEl) plotCountEl.textContent = `จำนวนแปลง: ${mapData.polygons.length}`;
      if (pinCountEl) pinCountEl.textContent = `จำนวนหมุดทั้งหมด: ${mapData.pins.length}`;

      if (!mapEl || !hostEl) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      if (mapError) {
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
            ${mapError}
          </div>
        `;
        return;
      }

      if (loadingMap) {
        hostEl.innerHTML = `
          <div style="
            height:320px;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#64748b;
            font-weight:700;
            background:linear-gradient(135deg,#eef6ff 0%,#f8fbff 50%,#eefaf3 100%);
          ">
            กำลังโหลดข้อมูลแผนที่...
          </div>
        `;
        return;
      }

      hostEl.innerHTML = `<div id="dashboardMap" style="width:100%;height:320px;min-height:320px;display:block;border-radius:18px;overflow:hidden;background:#dfeecf"></div>`;
      const freshMapEl = document.getElementById("dashboardMap");
      if (!freshMapEl) return;

      try {
        const leafletModule = await import("leaflet");
        L = leafletModule.default;
      } catch (err) {
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
        return;
      }

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

      mapInstance = L.map(freshMapEl, {
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
            <div style="font-weight:800;margin-bottom:6px">${poly.name}</div>
            <div>จำนวนจุด polygon: ${poly.coords.length}</div>
          </div>
        `);

        poly.coords.forEach((pt) => bounds.push(pt));
      });

      mapData.pins.forEach((pin, idx) => {
        const hasAir = pin.nodes.some(
          (n) => String(n?.nodeType || "").toLowerCase() === "air"
        );
        const hasSoil = pin.nodes.some(
          (n) => String(n?.nodeType || "").toLowerCase() === "soil"
        );

        const marker = L.marker([pin.lat, pin.lng], {
          icon: hasSoil && !hasAir ? soilIcon : airIcon,
        }).addTo(mapInstance);

        const nodeListHtml = pin.nodes.length
          ? `<ul style="padding-left:18px;margin:6px 0 0 0">
              ${pin.nodes
                .map((node, i) => {
                  const nodeName = node?.nodeName || node?.uid || `Node ${i + 1}`;
                  const nodeType = node?.nodeType || "-";
                  return `<li>${nodeName} • ${nodeType}</li>`;
                })
                .join("")}
             </ul>`
          : `<div>ไม่มี node</div>`;

        marker.bindTooltip(pin.pinName, {
          direction: "top",
          offset: [0, -8],
          opacity: 1,
        });

        marker.bindPopup(`
          <div style="min-width:220px">
            <div style="font-weight:800;margin-bottom:6px">${pin.pinName}</div>
            <div style="margin-bottom:4px">แปลง: ${pin.plotName}</div>
            <div style="margin-bottom:4px">lat ${pin.lat}, lng ${pin.lng}</div>
            <div style="font-weight:700;margin-top:8px;margin-bottom:4px">Nodes</div>
            ${nodeListHtml}
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
        mapInstance.invalidateSize(true);
      }, 250);

      mapRef.current = mapInstance;
    }

    const t = setTimeout(initLeaflet, 200);

    return () => {
      mounted = false;
      clearTimeout(t);
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [loadingMap, mapError, mapData]);

  return <DuwimsStaticPage current="dashboard" htmlContent={htmlContent} />;
}