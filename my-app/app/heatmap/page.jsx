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

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pad(n) {
  return String(n).padStart(2, "0");
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

function formatTime(date) {
  if (!date) return "-";
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
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

const SENSOR_META = {
  soil_moisture: {
    label: "Rain Intensity",
    unit: "%",
    min: 65,
    max: 80,
    colors: ["#ddd6fe", "#c4b5fd", "#8b5cf6", "#4f46e5"],
  },
  temp_rh_temp: {
    label: "Temperature",
    unit: "°C",
    min: 20,
    max: 35,
    colors: ["#ddd6fe", "#c4b5fd", "#8b5cf6", "#4f46e5"],
  },
  temp_rh_humidity: {
    label: "Humidity",
    unit: "%",
    min: 75,
    max: 85,
    colors: ["#ddd6fe", "#c4b5fd", "#8b5cf6", "#4f46e5"],
  },
  wind_speed: {
    label: "Wind Speed",
    unit: "m/s",
    min: 0.56,
    max: 1.39,
    colors: ["#ddd6fe", "#c4b5fd", "#8b5cf6", "#4f46e5"],
  },
  light: {
    label: "Light",
    unit: "lux",
    min: 40000,
    max: 60000,
    colors: ["#ddd6fe", "#c4b5fd", "#8b5cf6", "#4f46e5"],
  },
  rain: {
    label: "Rain",
    unit: "mm/day",
    min: 4,
    max: 8,
    colors: ["#ddd6fe", "#c4b5fd", "#8b5cf6", "#4f46e5"],
  },
  n: {
    label: "N",
    unit: "%",
    min: 0.1,
    max: 1.0,
    colors: ["#ddd6fe", "#c4b5fd", "#8b5cf6", "#4f46e5"],
  },
  p: {
    label: "P",
    unit: "ppm",
    min: 25,
    max: 45,
    colors: ["#ddd6fe", "#c4b5fd", "#8b5cf6", "#4f46e5"],
  },
  k: {
    label: "K",
    unit: "cmol/kg",
    min: 0.8,
    max: 1.4,
    colors: ["#ddd6fe", "#c4b5fd", "#8b5cf6", "#4f46e5"],
  },
  water_level: {
    label: "Water Level",
    unit: "%",
    min: 50,
    max: 80,
    colors: ["#ddd6fe", "#c4b5fd", "#8b5cf6", "#4f46e5"],
  },
};

const SENSOR_KEYS = Object.keys(SENSOR_META);

function getColor(sensorKey, value) {
  const meta = SENSOR_META[sensorKey];
  if (!meta || value == null || Number.isNaN(value)) return "#cbd5e1";
  const t = clamp((value - meta.min) / (meta.max - meta.min || 1), 0, 0.9999);
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

function extractValue(sensorKey, sensor) {
  const st = String(sensor?.sensorType || "").toLowerCase();
  const raw = sensor?.value ?? sensor?.lastReading?.value ?? null;

  if (sensorKey === "soil_moisture") {
    if (st === "soil_moisture" || st === "soilmoisture" || st === "moisture") {
      return num(raw);
    }
  }

  if (sensorKey === "temp_rh_temp") {
    if (st === "temp_rh" || st === "temperature_humidity" || st === "temphumidity") {
      if (raw && typeof raw === "object") return num(raw.temperature ?? raw.temp ?? raw.t);
    }
    if (st === "temp" || st === "temperature") return num(raw);
  }

  if (sensorKey === "temp_rh_humidity") {
    if (st === "temp_rh" || st === "temperature_humidity" || st === "temphumidity") {
      if (raw && typeof raw === "object") return num(raw.humidity ?? raw.rh ?? raw.h);
    }
    if (st === "humidity" || st === "rh") return num(raw);
  }

  if (sensorKey === "wind_speed") {
    if (st === "wind_speed" || st === "wind" || st === "windspeed") return num(raw);
  }

  if (sensorKey === "light") {
    if (st === "light" || st === "lux" || st === "light_sensor") return num(raw);
  }

  if (sensorKey === "rain") {
    if (st === "rain" || st === "rainfall" || st === "rain_fall") return num(raw);
  }

  if (sensorKey === "water_level") {
    if (st === "water_level" || st === "waterlevel" || st === "irrigation") return num(raw);
  }

  if (sensorKey === "n" || sensorKey === "p" || sensorKey === "k") {
    if (st === "npk") {
      if (raw && typeof raw === "object") {
        return num(raw[sensorKey.toUpperCase()] ?? raw[sensorKey]);
      }
    }
    if (st === sensorKey) return num(raw);
  }

  return null;
}

function hashStr(s) {
  let h = 0;
  const x = String(s || "");
  for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) >>> 0;
  return h;
}

function makeTimeline(baseValue, seedText, count = 24) {
  const seed = hashStr(seedText) % 1000;
  const out = [];
  const base = baseValue == null || Number.isNaN(baseValue) ? 70 : Number(baseValue);
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const wave = Math.sin(t * Math.PI * 2 + seed / 50) * 4;
    const drift = Math.cos(t * Math.PI * 1.3 + seed / 20) * 2;
    const pulse = seed % 6 === 0 && i > 15 ? 7 : 0;

    out.push({
      ts: now - (count - 1 - i) * 60 * 60 * 1000,
      value: Number((base + wave + drift + pulse).toFixed(2)),
    });
  }

  return out;
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
  const [selectedSensor] = useState("soil_moisture");
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  const [startDate, setStartDate] = useState(() =>
    formatDateInput(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
  );
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));

  useEffect(() => {
    let alive = true;

    async function loadPlots() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/plots", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) throw new Error(`โหลดข้อมูลแปลงไม่สำเร็จ (${res.status})`);

        const json = await res.json();
        const rawPlots = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.plots)
          ? json.plots
          : [];

        const normalized = rawPlots.map((plot, i) => {
          const coords = getPlotCoords(plot);
          const pins = Array.isArray(plot?.polygon?.pins)
            ? plot.polygon.pins
            : Array.isArray(plot?.pins)
            ? plot.pins
            : [];

          const sensorPoints = [];

          pins.forEach((pin, pinIndex) => {
            const lat = num(pin?.lat);
            const lng = num(pin?.lng);
            if (lat == null || lng == null) return;

            const nodes = [
              ...(Array.isArray(pin?.node_air) ? pin.node_air : []),
              ...(Array.isArray(pin?.node_soil) ? pin.node_soil : []),
              ...(Array.isArray(pin?.nodes) ? pin.nodes : []),
            ];

            nodes.forEach((node, nodeIndex) => {
              const sensors = Array.isArray(node?.sensors) ? node.sensors : [];
              sensors.forEach((sensor, sensorIndex) => {
                const sensorKey = SENSOR_KEYS.find((key) => extractValue(key, sensor) != null);
                if (!sensorKey) return;

                const baseValue = extractValue(sensorKey, sensor);

                sensorPoints.push({
                  id: `${i}-${pinIndex}-${nodeIndex}-${sensorIndex}`,
                  lat,
                  lng,
                  plotId: getPlotId(plot, i),
                  plotName: getPlotName(plot, i),
                  nodeName: node?.nodeName || node?.uid || `Node ${nodeIndex + 1}`,
                  sensorName: sensor?.name || sensor?.sensorType || `Sensor ${sensorIndex + 1}`,
                  sensorType: sensor?.sensorType || "-",
                  sensorKey,
                  timeline: makeTimeline(
                    baseValue,
                    `${plot?.id}-${pinIndex}-${nodeIndex}-${sensorIndex}`
                  ),
                });
              });
            });
          });

          return {
            id: getPlotId(plot, i),
            name: getPlotName(plot, i),
            coords,
            sensorPoints,
          };
        });

        if (!alive) return;
        setPlots(normalized.filter((p) => p.coords.length >= 3));
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadPlots();
    return () => {
      alive = false;
    };
  }, []);

  const visiblePlots = useMemo(() => {
    if (selectedPlotId === "all") return plots;
    return plots.filter((p) => p.id === selectedPlotId);
  }, [plots, selectedPlotId]);

  const visiblePoints = useMemo(() => {
    return visiblePlots
      .flatMap((p) => p.sensorPoints || [])
      .filter((p) => p.sensorKey === selectedSensor);
  }, [visiblePlots, selectedSensor]);

  const maxFrames = useMemo(() => visiblePoints[0]?.timeline?.length || 24, [visiblePoints]);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = setInterval(() => {
      setFrameIndex((prev) => (prev >= maxFrames - 1 ? 0 : prev + 1));
    }, 700);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [playing, maxFrames]);

  const renderedPoints = useMemo(() => {
    return visiblePoints.map((p) => {
      const current = p.timeline?.[frameIndex] || null;
      const value = current?.value ?? null;
      const status = getStatus(selectedSensor, value);
      return {
        ...p,
        value,
        ts: current?.ts ?? null,
        status,
        color: getColor(selectedSensor, value),
      };
    });
  }, [visiblePoints, frameIndex, selectedSensor]);

  const currentTs = renderedPoints[0]?.ts || null;

  const legendExampleItems = [
    { key: "rain-intensity", title: "Rain Intensity", subtitle: "ช่วงเฉลี่ย 58/100", color: "#8b5cf6" },
    { key: "temperature", title: "Temperature", subtitle: "ช่วงเฉลี่ย 58/100", color: "#c4b5fd" },
    { key: "humidity", title: "Humidity", subtitle: "ช่วงเฉลี่ย 58/100", color: "#c4b5fd" },
    { key: "wind-speed", title: "Wind Speed", subtitle: "ช่วงเฉลี่ย 58/100", color: "#c4b5fd" },
    { key: "light", title: "Light", subtitle: "ช่วงเฉลี่ย 58/100", color: "#c4b5fd" },
    { key: "rain", title: "Rain", subtitle: "ช่วงเฉลี่ย 58/100", color: "#c4b5fd" },
    { key: "n", title: "N", subtitle: "ช่วงเฉลี่ย 58/100", color: "#c4b5fd" },
    { key: "p", title: "P", subtitle: "ช่วงเฉลี่ย 58/100", color: "#c4b5fd" },
    { key: "k", title: "K", subtitle: "ช่วงเฉลี่ย 58/100", color: "#8b5cf6" },
    { key: "water-level", title: "Water Level", subtitle: "ช่วงเฉลี่ย 58/100", color: "#c4b5fd" },
  ];

  return (
    <DuwimsStaticPage current="heatmap">
      <div className="heat-page">
        <div className="heat-shell">
          <div className="heat-left">
            <div className="map-card">
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

                  {visiblePlots.map((plot) => (
                    <Polygon
                      key={plot.id}
                      positions={plot.coords}
                      pathOptions={{
                        color: "#ffffff",
                        weight: 2,
                        fillColor: "#ffffff",
                        fillOpacity: 0.04,
                      }}
                    >
                      <Popup>{plot.name}</Popup>
                    </Polygon>
                  ))}

                  {renderedPoints.map((p) => (
                    <CircleMarker
                      key={`${p.id}-${frameIndex}`}
                      center={[p.lat, p.lng]}
                      radius={10}
                      pathOptions={{
                        color: "#ffffff",
                        weight: 1.5,
                        fillColor: p.color,
                        fillOpacity: 0.95,
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: 220 }}>
                          <div style={{ fontWeight: 800 }}>{p.sensorName}</div>
                          <div>แปลง: {p.plotName}</div>
                          <div>Node: {p.nodeName}</div>
                          <div>
                            ค่า: <strong>{p.value != null ? `${p.value} %` : "-"}</strong>
                          </div>
                          <div>สถานะ: {p.status.text}</div>
                          <div>เวลา: {p.ts ? formatTime(p.ts) : "-"}</div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>

                {loading && <div className="overlay-msg">กำลังโหลดข้อมูล...</div>}
                {!loading && error && <div className="overlay-msg error">{error}</div>}

                <div className="bottom-overlay">
                  <div className="date-row">
                    <div className="date-field">
                      <label>วันที่เริ่มต้น</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="date-input"
                      />
                      <div className="date-chip">{formatDateThai(startDate)}</div>
                    </div>

                    <div className="date-field">
                      <label>วันที่สิ้นสุด</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="date-input"
                      />
                      <div className="date-chip">{formatDateThai(endDate)}</div>
                    </div>
                  </div>

                  <div className="player-row">
                    <button
                      type="button"
                      className="play-btn"
                      onClick={() => setPlaying((v) => !v)}
                    >
                      {playing ? "❚❚" : "▶"}
                    </button>

                    <div className="player-main">
                      <div className="player-top">
                        <span>{playing ? "Play" : "Pause"}</span>
                        <span>{currentTs ? formatTime(currentTs) : "-"}</span>
                      </div>

                      <input
                        className="range"
                        type="range"
                        min={0}
                        max={Math.max(0, maxFrames - 1)}
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
          </div>

          <div className="heat-right">
            <div className="side-card">
              <div className="side-section">
                <div className="side-label">เลือกแปลง</div>
                <select
                  className="plot-select"
                  value={selectedPlotId}
                  onChange={(e) => setSelectedPlotId(e.target.value)}
                >
                  <option value="all">ทุกแปลง</option>
                  {plots.map((plot, i) => (
                    <option key={plot.id} value={plot.id}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="side-title">Legend (Rain Intensity)</div>
              <div className="legend-bar" />
              <div className="legend-scale">
                <span>น้อย</span>
                <span>มาก</span>
              </div>

              <div className="side-subtitle">จุดข้อมูลตัวอย่าง</div>

              <div className="sample-list">
                {legendExampleItems.map((item) => (
                  <div key={item.key} className="sample-item">
                    <span className="sample-dot" style={{ background: item.color }} />
                    <div className="sample-text">
                      <div className={`sample-title ${item.key === "k" ? "sample-title-active" : ""}`}>
                        {item.title}
                      </div>
                      <div className="sample-subtitle">{item.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .heat-page {
            width: 100%;
          }

          .heat-shell {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 330px;
            gap: 14px;
            align-items: stretch;
          }

          .heat-left,
          .heat-right {
            min-width: 0;
          }

          .map-card,
          .side-card {
            background: #dbeceb;
            border: 1px solid #cfe0df;
            border-radius: 16px;
          }

          .map-card {
            padding: 10px;
            height: 100%;
          }

          .map-wrap {
            position: relative;
            height: 520px;
            overflow: hidden;
            border-radius: 14px;
            background: #cedddb;
          }

          .overlay-msg {
            position: absolute;
            top: 14px;
            left: 14px;
            z-index: 600;
            padding: 8px 10px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.96);
            font-size: 12px;
            font-weight: 700;
            color: #16302a;
          }

          .overlay-msg.error {
            color: #9d2323;
          }

          .bottom-overlay {
            position: absolute;
            left: 14px;
            right: 14px;
            bottom: 14px;
            z-index: 500;
            background: linear-gradient(
              180deg,
              rgba(34, 41, 53, 0.12) 0%,
              rgba(34, 41, 53, 0.38) 30%,
              rgba(34, 41, 53, 0.58) 100%
            );
            backdrop-filter: blur(6px);
            border-radius: 14px;
            padding: 12px;
          }

          .date-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 12px;
          }

          .date-field label {
            display: block;
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 6px;
          }

          .date-input {
            width: 100%;
            height: 38px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.28);
            background: rgba(255, 255, 255, 0.96);
            padding: 0 10px;
            font-size: 13px;
            color: #233933;
            outline: none;
          }

          .date-chip {
            margin-top: 6px;
            display: inline-flex;
            align-items: center;
            min-height: 32px;
            padding: 0 10px;
            border-radius: 10px;
            background: #dbe3ff;
            color: #30429f;
            font-size: 12px;
            font-weight: 700;
          }

          .player-row {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .play-btn {
            width: 38px;
            height: 38px;
            border: 0;
            border-radius: 999px;
            background: #ffffff;
            color: #5a6dff;
            font-size: 14px;
            cursor: pointer;
            flex: 0 0 38px;
            font-weight: 700;
          }

          .player-main {
            flex: 1;
            min-width: 0;
          }

          .player-top {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 12px;
            color: #ffffff;
            font-weight: 700;
            margin-bottom: 5px;
          }

          .range {
            width: 100%;
            accent-color: #ffffff;
          }

          .side-card {
            padding: 16px;
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .side-section {
            margin-bottom: 14px;
          }

          .side-label {
            font-size: 12px;
            font-weight: 700;
            color: #29403b;
            margin-bottom: 8px;
          }

          .plot-select {
            width: 100%;
            height: 42px;
            border-radius: 10px;
            border: 1px solid #c9d8d6;
            background: #ffffff;
            padding: 0 12px;
            font-size: 14px;
            color: #233934;
            outline: none;
          }

          .side-title {
            font-size: 14px;
            font-weight: 700;
            color: #203732;
            margin-bottom: 10px;
          }

          .legend-bar {
            width: 100%;
            height: 7px;
            border-radius: 999px;
            background: linear-gradient(
              90deg,
              #ddd6fe 0%,
              #c4b5fd 35%,
              #8b5cf6 65%,
              #4f46e5 100%
            );
            margin-bottom: 6px;
          }

          .legend-scale {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #4b605b;
            margin-bottom: 14px;
          }

          .side-subtitle {
            font-size: 12px;
            font-weight: 700;
            color: #2a423d;
            margin: 6px 0 10px;
          }

          .sample-list {
            display: grid;
            gap: 8px;
            margin-bottom: 14px;
          }

          .sample-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            background: #f4f6f6;
            border: 1px solid #d7e1df;
            border-radius: 10px;
            padding: 10px 12px;
          }

          .sample-dot {
            width: 11px;
            height: 11px;
            border-radius: 999px;
            display: inline-block;
            flex: 0 0 11px;
            margin-top: 3px;
          }

          .sample-text {
            min-width: 0;
          }

          .sample-title {
            font-size: 12px;
            font-weight: 700;
            color: #253a35;
            line-height: 1.2;
          }

          .sample-title-active {
            color: #4f46e5;
          }

          .sample-subtitle {
            font-size: 11px;
            color: #677872;
            margin-top: 2px;
          }

          :global(.leaflet-container) {
            width: 100%;
            height: 100%;
            font-family: inherit;
          }

          @media (max-width: 1100px) {
            .heat-shell {
              grid-template-columns: 1fr;
            }

            .map-wrap {
              height: 480px;
            }
          }

          @media (max-width: 700px) {
            .map-wrap {
              height: 400px;
            }

            .date-row {
              grid-template-columns: 1fr;
              gap: 12px;
            }
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}