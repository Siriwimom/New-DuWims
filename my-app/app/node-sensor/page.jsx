"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DuwimsStaticPage from "../components/DuwimsStaticPage";
import { useDuwimsT } from "../components/language-context";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");

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

async function apiFetch(path, { method = "GET", body } = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }

  return data;
}

function safeText(v, fallback = "") {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeCoords(coords) {
  if (!Array.isArray(coords)) return [];
  return coords
    .map((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        const lat = Number(item[0]);
        const lng = Number(item[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      }

      if (item && typeof item === "object") {
        const lat = Number(item.lat);
        const lng = Number(item.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      }

      return null;
    })
    .filter(Boolean);
}

function normalizeSensor(sensor = {}) {
  const uid = safeText(sensor.uid || sensor._id || "");
  const rawName = safeText(sensor.name || sensor.sensorType || uid || "Sensor");
  const sensorKey = canonicalizeSensorName(rawName, uid);
  const defaultLimits = getDefaultSensorLimits(sensorKey, uid);
  const rawMinValue = toNum(sensor.minValue);
  const rawMaxValue = toNum(sensor.maxValue);

  const normalizedMinValue =
    rawMinValue !== null && rawMinValue !== 0
      ? rawMinValue
      : defaultLimits.minValue;
  const normalizedMaxValue =
    rawMaxValue !== null && rawMaxValue !== 0
      ? rawMaxValue
      : defaultLimits.maxValue;

  return {
    _id: safeText(sensor._id || ""),
    uid,
    name: sensorKey,
    rawName,
    sensorKey,
    status: safeText(sensor.status || "NO_DATA"),
    minValue: normalizedMinValue,
    maxValue: normalizedMaxValue,
    minEnabled:
      typeof sensor.minEnabled === "boolean"
        ? sensor.minEnabled
        : normalizedMinValue !== null,
    maxEnabled:
      typeof sensor.maxEnabled === "boolean"
        ? sensor.maxEnabled
        : normalizedMaxValue !== null,
    latestValue: toNum(sensor.latestValue),
    latestTimestamp: safeText(sensor.latestTimestamp || ""),
  };
}

function normalizeNode(node = {}) {
  return {
    _id: safeText(node._id || node.id || ""),
    uid: safeText(node.uid || node._id || node.id || ""),
    nodeName: safeText(node.nodeName || ""),
    status: safeText(node.status || "ACTIVE"),
    lat: toNum(node.lat),
    lng: toNum(node.lng),
    plotId: safeText(node.plotId || ""),
    ownerRef: safeText(node.ownerRef || ""),
    sensors: Array.isArray(node.sensors)
      ? node.sensors.map(normalizeSensor)
      : [],
  };
}

function normalizePlot(plot = {}) {
  const polygon = plot?.polygon?.coords || plot?.polygon || plot?.coords || [];
  const nodes = plot?.nodes || plot?.node_air || plot?.node_soil || [];

  return {
    id: safeText(plot.id || plot._id || ""),
    plotName: safeText(
      plot.plotName || plot.name || plot.alias || "ไม่ระบุชื่อแปลง",
    ),
    polygon: normalizeCoords(polygon),
    caretaker: safeText(plot.caretaker || plot.ownerName || ""),
    nodes: Array.isArray(nodes) ? nodes.map(normalizeNode) : [],
  };
}

function inferNodeTypeFromUid(uid = "", sensors = [], nodeName = "") {
  const value = `${uid} ${nodeName}`.trim().toLowerCase();

  if (value.includes("soil")) return "soil";
  if (value.includes("air")) return "air";

  const sensorKeys = (Array.isArray(sensors) ? sensors : []).map((sensor) =>
    canonicalizeSensorName(
      sensor?.sensorKey || sensor?.name || sensor?.rawName || "",
      sensor?.uid || "",
    ),
  );

  const hasSoilSensor =
    sensorKeys.includes("soil_moisture") ||
    sensorKeys.includes("n") ||
    sensorKeys.includes("p") ||
    sensorKeys.includes("k") ||
    sensorKeys.includes("water_availability");

  return hasSoilSensor ? "soil" : "air";
}

function nodeTypeLabel(type) {
  return type === "soil" ? "Soil Node" : "Air Node";
}

const SENSOR_LABELS = {
  temperature: { th: "อุณหภูมิ", en: "Temperature" },
  humidity: { th: "ความชื้นสัมพัทธ์", en: "Relative Humidity" },
  wind_speed: { th: "ความเร็วลม", en: "Wind Speed" },
  light: { th: "ความเข้มแสง", en: "Light Intensity" },
  rainfall: { th: "ปริมาณน้ำฝน", en: "Rainfall" },
  soil_moisture: { th: "ความชื้นดิน", en: "Soil Moisture" },
  n: { th: "N", en: "Nitrogen" },
  p: { th: "P", en: "Phosphorus" },
  k: { th: "K", en: "Potassium" },
  water_availability: { th: "ความพร้อมใช้น้ำ", en: "Water Availability" },
};

function canonicalizeSensorName(name = "", uid = "") {
  const v = `${name} ${uid}`.trim().toLowerCase();

  if (
    v.includes("temp_rh") ||
    v.includes("temperature") ||
    v.includes("temp") ||
    v.includes("อุณหภูมิ")
  ) {
    return "temperature";
  }

  if (
    v.includes("relative humidity") ||
    v.includes("humidity") ||
    v === "rh" ||
    v.includes("ความชื้นสัมพัทธ์")
  ) {
    return "humidity";
  }

  if (
    v.includes("wind_speed") ||
    v.includes("wind speed") ||
    v.includes("wind") ||
    v.includes("ความเร็วลม") ||
    v.includes("วัดความเร็วลม")
  ) {
    return "wind_speed";
  }

  if (
    v.includes("light intensity") ||
    v.includes("light") ||
    v.includes("lux") ||
    v.includes("ความเข้มแสง") ||
    v.includes("แสง")
  ) {
    return "light";
  }

  if (
    v.includes("rainfall") ||
    v.includes("rain") ||
    v.includes("ปริมาณน้ำฝน") ||
    v.includes("ฝน")
  ) {
    return "rainfall";
  }

  if (
    v.includes("soil_moisture") ||
    v.includes("soil moisture") ||
    v.includes("ความชื้นในดิน") ||
    v.includes("ความชื้นดิน") ||
    v === "moisture"
  ) {
    return "soil_moisture";
  }

  if (v === "n" || v.includes("nitrogen")) return "n";
  if (v === "p" || v.includes("phosphorus")) return "p";
  if (v === "k" || v.includes("potassium")) return "k";

  if (
    v.includes("water availability") ||
    v.includes("water potential") ||
    v.includes("water_level") ||
    v.includes("water level") ||
    v.includes("irrigation") ||
    v.includes("ความพร้อมใช้น้ำ") ||
    v.includes("ให้น้ำ")
  ) {
    return "water_availability";
  }

  return safeText(name || uid || "sensor").trim().toLowerCase() || "sensor";
}

function getSensorLabel(nameOrKey = "", lang = "th", uid = "") {
  const key = canonicalizeSensorName(nameOrKey, uid);
  return SENSOR_LABELS[key]?.[lang === "en" ? "en" : "th"] || nameOrKey || "Sensor";
}

function formatStatus(status) {
  return String(status).toUpperCase() === "ACTIVE" ? "ON" : "OFF";
}

function getDefaultSensorLimits(name = "", uid = "") {
  const key = canonicalizeSensorName(name, uid);

  if (key === "temperature") return { minValue: 20, maxValue: 35 };
  if (key === "humidity") return { minValue: 75, maxValue: 85 };
  if (key === "wind_speed") return { minValue: 2, maxValue: 5 };
  if (key === "light") return { minValue: 40000, maxValue: 60000 };
  if (key === "rainfall") return { minValue: 4, maxValue: 8 };
  if (key === "soil_moisture") return { minValue: 65, maxValue: 80 };
  if (key === "n") return { minValue: 0.1, maxValue: 1.0 };
  if (key === "p") return { minValue: 25, maxValue: 45 };
  if (key === "k") return { minValue: 0.8, maxValue: 1.4 };
  if (key === "water_availability") return { minValue: 8, maxValue: 25 };

  return { minValue: null, maxValue: null };
}

function resolveDisplayLimitValue(sensor = {}, limitType = "min") {
  const rawValue = limitType === "max" ? toNum(sensor?.maxValue) : toNum(sensor?.minValue);

  if (rawValue !== null && rawValue !== 0) return rawValue;

  const defaults = getDefaultSensorLimits(sensor?.sensorKey || sensor?.name || "", sensor?.uid || "");
  return limitType === "max" ? defaults.maxValue : defaults.minValue;
}

function sensorPresetsByType(type) {
  if (type === "soil") {
    return [
      {
        name: "soil_moisture",
        rawName: "soil_moisture",
        sensorKey: "soil_moisture",
        uid: "soil-moisture",
        minValue: 65,
        maxValue: 80,
        latestValue: 8,
        status: "OK",
      },
      {
        name: "n",
        rawName: "N",
        sensorKey: "n",
        uid: "soil-n",
        minValue: 0.1,
        maxValue: 1.0,
        latestValue: 0.5,
        status: "OK",
      },
      {
        name: "p",
        rawName: "P",
        sensorKey: "p",
        uid: "soil-p",
        minValue: 25,
        maxValue: 45,
        latestValue: 35,
        status: "OK",
      },
      {
        name: "k",
        rawName: "K",
        sensorKey: "k",
        uid: "soil-k",
        minValue: 0.8,
        maxValue: 1.4,
        latestValue: 1.1,
        status: "OK",
      },
      {
        name: "water_availability",
        rawName: "water_availability",
        sensorKey: "water_availability",
        uid: "soil-water",
        minValue: 8,
        maxValue: 25,
        latestValue: 72,
        status: "OK",
      },
    ];
  }

  return [
    {
      name: "temperature",
      rawName: "temperature",
      sensorKey: "temperature",
      uid: "air-temp",
      minValue: 20,
      maxValue: 35,
      latestValue: 25,
      status: "OK",
    },
    {
      name: "humidity",
      rawName: "humidity",
      sensorKey: "humidity",
      uid: "air-humidity",
      minValue: 75,
      maxValue: 85,
      latestValue: 76,
      status: "OK",
    },
    {
      name: "wind_speed",
      rawName: "wind_speed",
      sensorKey: "wind_speed",
      uid: "air-wind",
      minValue: 2,
      maxValue: 5,
      latestValue: 3,
      status: "OK",
    },
    {
      name: "light",
      rawName: "light",
      sensorKey: "light",
      uid: "air-light",
      minValue: 40000,
      maxValue: 60000,
      latestValue: 50000,
      status: "OK",
    },
    {
      name: "rainfall",
      rawName: "rainfall",
      sensorKey: "rainfall",
      uid: "air-rain",
      minValue: 4,
      maxValue: 8,
      latestValue: 5,
      status: "OK",
    },
  ];
}

function sensorUnit(name = "", uid = "") {
  const key = canonicalizeSensorName(name, uid);
  if (key === "temperature") return "°C";
  if (key === "humidity") return "%";
  if (key === "soil_moisture") return "%";
  if (key === "n") return "%";
  if (key === "p") return "ppm";
  if (key === "k") return "cmol/kg";
  if (key === "wind_speed") return "km/hr";
  if (key === "light") return "lux";
  if (key === "rainfall") return "mm";
  if (key === "water_availability") return "kPa";
  return "";
}

function formatSensorValue(value, name, uid = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value)))
    return "—";
  return `${value} ${sensorUnit(name, uid)}`.trim();
}

function buildComparableSensors(sensors = []) {
  return (Array.isArray(sensors) ? sensors : []).map((sensor) => ({
    _id: safeText(sensor._id || ""),
    uid: safeText(sensor.uid || ""),
    name: safeText(sensor.sensorKey || sensor.name || ""),
    minValue: toNum(sensor.minValue),
    maxValue: toNum(sensor.maxValue),
    minEnabled: sensor.minEnabled !== false,
    maxEnabled: sensor.maxEnabled !== false,
  }));
}

function buildFormSnapshot({ plotId = "", uid = "", nodeName = "", marker = null, sensors = [] } = {}) {
  return JSON.stringify({
    plotId: safeText(plotId),
    uid: safeText(uid).trim(),
    nodeName: safeText(nodeName).trim(),
    marker:
      Array.isArray(marker) && marker.length >= 2
        ? [toNum(marker[0]), toNum(marker[1])]
        : null,
    sensors: buildComparableSensors(sensors),
  });
}

function pointInPolygon(point, vs) {
  if (!Array.isArray(vs) || vs.length < 3) return true;

  const x = point[1];
  const y = point[0];
  let inside = false;

  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][1];
    const yi = vs[i][0];
    const xj = vs[j][1];
    const yj = vs[j][0];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function useLeafletBundle() {
  const [bundle, setBundle] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const RL = await import("react-leaflet");
      const LModule = await import("leaflet");
      const L = LModule?.default || LModule;

      if (typeof window !== "undefined") {
        window.L = L;
      }

      if (L?.Icon?.Default) {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });
      }

      const redIcon = new L.Icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const greenIcon = new L.Icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      if (alive) {
        setBundle({ RL, L, redIcon, greenIcon });
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return bundle;
}

function FitBounds({
  RL,
  polygons,
  nodes,
  fallbackCenter = [13.112, 100.926],
}) {
  const map = RL.useMap();

  useEffect(() => {
    if (!map) return;

    const bounds = [];

    polygons.forEach((poly) => {
      normalizeCoords(poly).forEach((pt) => bounds.push(pt));
    });

    nodes.forEach((node) => {
      if (Number.isFinite(node.lat) && Number.isFinite(node.lng)) {
        bounds.push([node.lat, node.lng]);
      }
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [20, 20] });
    } else {
      map.setView(fallbackCenter, 16);
    }
  }, [map, polygons, nodes, fallbackCenter]);

  return null;
}

function LockToPolygon({
  RL,
  L,
  polygonCoords = [],
  active = false,
  fallbackCenter = [13.112, 100.926],
}) {
  const map = RL.useMap();

  useEffect(() => {
    if (!map || !active || !L) return;

    const coords = normalizeCoords(polygonCoords);

    if (coords.length >= 3) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [20, 20] });

      const lockedZoom = map.getZoom();
      map.setMinZoom(lockedZoom);
      map.setMaxBounds(bounds.pad(0.1));
    } else {
      map.setView(fallbackCenter, 16);
    }

    return () => {
      try {
        map.setMinZoom(1);
        map.setMaxBounds(null);
      } catch {}
    };
  }, [map, L, polygonCoords, active, fallbackCenter]);

  return null;
}

function CurrentLocationLayer({ RL, locateTick, onStatus, t, lang }) {
  const map = RL.useMap();
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!locateTick) return;
    if (!navigator.geolocation) {
      onStatus(
        t.locationNotSupported ||
          (lang === "en"
            ? "This device does not support geolocation"
            : "อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง"),
      );
      return;
    }

    onStatus(
      t.findingLocation ||
        (lang === "en" ? "Finding location..." : "กำลังค้นหาตำแหน่ง..."),
    );
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        const accuracy = p.coords.accuracy || 0;
        setPos({ lat, lng, accuracy });
        map.setView([lat, lng], Math.max(map.getZoom() || 16, 18), {
          animate: true,
        });
        onStatus(
          t.locationFound ||
            (lang === "en" ? "Location found" : "พบตำแหน่งแล้ว"),
        );
      },
      (err) =>
        onStatus(
          `${t.locationFailed || (lang === "en" ? "Unable to get location" : "ไม่สามารถหาตำแหน่งได้")}: ${err?.message || ""}`,
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [locateTick, map, onStatus]);

  if (!pos) return null;

  return (
    <>
      <RL.Circle
        center={[pos.lat, pos.lng]}
        radius={pos.accuracy}
        pathOptions={{
          color: "#e95a94",
          fillColor: "#e95a94",
          fillOpacity: 0.1,
        }}
      />
      <RL.CircleMarker
        center={[pos.lat, pos.lng]}
        radius={6}
        pathOptions={{
          color: "#e95a94",
          fillColor: "#e95a94",
          fillOpacity: 1,
        }}
      />
    </>
  );
}

function ClickMarkerPicker({
  RL,
  enabled,
  markerPosition,
  onPick,
  polygonCoords = [],
}) {
  const map = RL.useMap();

  useEffect(() => {
    if (!map || !enabled) return;

    const onClick = (e) => {
      const pt = [e.latlng.lat, e.latlng.lng];
      const coords = normalizeCoords(polygonCoords);

      if (coords.length >= 3 && !pointInPolygon(pt, coords)) return;
      onPick(pt);
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, enabled, onPick, polygonCoords]);

  if (!enabled || !markerPosition) return null;

  return <RL.Marker position={markerPosition} draggable={false} />;
}

function NodeMap({
  leaflet,
  t,
  lang,
  polygons = [],
  nodes = [],
  selectable = false,
  markerPosition = null,
  onPickMarker = null,
  locateTick = 0,
  onLocateStatus = () => {},
  mapKey = "map",
  selectedNodeId = "",
  lockToSelectedPolygon = false,
}) {
  if (!leaflet?.RL || !leaflet?.L) {
    return (
      <div className="map-loading">
        {t.loadingMap ||
          (lang === "en" ? "Loading map..." : "กำลังโหลดแผนที่...")}
      </div>
    );
  }

  const { RL, L, redIcon, greenIcon } = leaflet;
  const firstPolygon = polygons?.[0]?.coords || [];

  return (
    <RL.MapContainer
      key={mapKey}
      center={[13.112, 100.926]}
      zoom={16}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={!lockToSelectedPolygon}
      doubleClickZoom={!lockToSelectedPolygon}
      touchZoom={!lockToSelectedPolygon}
      boxZoom={!lockToSelectedPolygon}
      keyboard={!lockToSelectedPolygon}
      dragging
      zoomControl
    >
      <RL.TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CurrentLocationLayer
        RL={RL}
        locateTick={locateTick}
        onStatus={onLocateStatus}
        t={t}
        lang={lang}
      />

      {polygons.map((poly, index) =>
        normalizeCoords(poly.coords).length >= 3 ? (
          <RL.Polygon
            key={`poly-${index}`}
            positions={normalizeCoords(poly.coords)}
            pathOptions={{
              color: poly.color || "#6c8f5d",
              weight: 2,
              fillColor: poly.color || "#6c8f5d",
              fillOpacity: 0.12,
            }}
          />
        ) : null,
      )}

      {nodes.map((node) =>
        Number.isFinite(node.lat) && Number.isFinite(node.lng) ? (
          <RL.Marker
            key={node._id || node.uid}
            position={[node.lat, node.lng]}
            icon={
              String(node._id) === String(selectedNodeId) ? redIcon : greenIcon
            }
          >
            <RL.Popup>
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  {node.uid || node.nodeName || "Node"}
                </div>
                <div>
                  {(t.nodeName || (lang === "en" ? "Node Name" : "ชื่อ Node")) +
                    ": "}
                  {node.nodeName || "-"}
                </div>
                <div>
                  {(t.type || (lang === "en" ? "Type" : "ประเภท")) + ": "}
                  {inferNodeTypeFromUid(node.uid) === "soil"
                    ? t.soilNode || "Soil Node"
                    : t.airNode || "Air Node"}
                </div>
                <div>
                  {(t.status || (lang === "en" ? "Status" : "สถานะ")) + ": "}
                  {formatStatus(node.status || "-")}
                </div>
              </div>
            </RL.Popup>
          </RL.Marker>
        ) : null,
      )}

      <ClickMarkerPicker
        RL={RL}
        enabled={selectable}
        markerPosition={markerPosition}
        onPick={onPickMarker}
        polygonCoords={firstPolygon}
      />

      {lockToSelectedPolygon ? (
        <LockToPolygon
          RL={RL}
          L={L}
          polygonCoords={firstPolygon}
          active={true}
        />
      ) : (
        <FitBounds
          RL={RL}
          polygons={polygons.map((p) => p.coords)}
          nodes={nodes}
        />
      )}
    </RL.MapContainer>
  );
}

function SensorTable({ sensors, t, lang, showLimits = false }) {
  return (
    <table className="node-sensor-table">
      <thead>
        <tr>
          <th>{t.sensorTableSensor || "sensor"}</th>
          <th>{t.sensorTableData || (lang === "en" ? "Data" : "ข้อมูล")}</th>
          {showLimits ? <th>{t.sensorTableMax || "Max"}</th> : null}
          {showLimits ? <th>{t.sensorTableMin || "Min"}</th> : null}
        </tr>
      </thead>
      <tbody>
        {sensors.map((sensor) => {
          const latest = sensor.latestValue;
          const min = resolveDisplayLimitValue(sensor, "min");
          const max = resolveDisplayLimitValue(sensor, "max");
          const bad =
            Number.isFinite(latest) &&
            ((Number.isFinite(min) && latest < min) ||
              (Number.isFinite(max) && latest > max));

          return (
            <tr key={sensor._id || sensor.uid || sensor.name}>
              <td className="sensor-name-cell">
                {getSensorLabel(sensor.sensorKey || sensor.name, lang, sensor.uid)}
              </td>
              <td className={`${bad ? "val-red" : "val-green"} sensor-value-cell data-value-cell`}>
                <span className="data-value-text">
                  {formatSensorValue(latest, sensor.sensorKey || sensor.name, sensor.uid)}
                </span>
              </td>
              {showLimits ? (
                <td className="sensor-value-cell max-col-cell">
                  {formatSensorValue(max, sensor.sensorKey || sensor.name, sensor.uid)}
                </td>
              ) : null}
              {showLimits ? (
                <td className="sensor-value-cell min-col-cell">
                  {formatSensorValue(min, sensor.sensorKey || sensor.name, sensor.uid)}
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EditableSensorTable({
  sensors,
  showLimits = true,
  onChangeMin,
  onChangeMax,
  onToggleMinEnabled,
  onToggleMaxEnabled,
  t,
  lang,
  readOnlyLimits = false,
}) {
  return (
    <table className="node-sensor-table">
      <thead>
        <tr>
          <th>{t.sensorTableSensor || "sensor"}</th>
          <th>{t.sensorTableData || (lang === "en" ? "Data" : "ข้อมูล")}</th>
          {showLimits ? <th>{t.sensorTableMax || "Max"}</th> : null}
          {showLimits ? <th>{t.sensorTableMin || "Min"}</th> : null}
        </tr>
      </thead>
      <tbody>
        {sensors.map((sensor, index) => {
          const latest = sensor.latestValue;
          const min = sensor.minValue;
          const max = sensor.maxValue;
          const minEnabled = sensor.minEnabled !== false;
          const maxEnabled = sensor.maxEnabled !== false;
          const comparableMin = minEnabled ? min : null;
          const comparableMax = maxEnabled ? max : null;
          const bad =
            Number.isFinite(latest) &&
            ((Number.isFinite(comparableMin) && latest < comparableMin) ||
              (Number.isFinite(comparableMax) && latest > comparableMax));

          return (
            <tr key={sensor._id || sensor.uid || index}>
              <td className="sensor-name-cell">
                {getSensorLabel(sensor.sensorKey || sensor.name, lang, sensor.uid)}
              </td>
              <td className={`${bad ? "val-red" : "val-green"} sensor-value-cell data-value-cell`}>
                <span className="data-value-text">
                  {formatSensorValue(latest, sensor.sensorKey || sensor.name, sensor.uid)}
                </span>
              </td>

              {showLimits ? (
                <td className="max-col-cell">
                  <div className="edit-limit-wrap sensor-limit-cell max-limit-cell">
                    {readOnlyLimits ? (
                      <>
                        <span className="limit-readonly-text">
                          {formatSensorValue(max, sensor.sensorKey || sensor.name, sensor.uid)}
                        </span>
                        <label className="sensor-limit-toggle">
                          <input
                            type="checkbox"
                            checked={maxEnabled}
                            onChange={(e) => onToggleMaxEnabled(index, e.target.checked)}
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <input
                          className="limit-input"
                          type="number"
                          step="any"
                          value={sensor.maxValue ?? ""}
                          disabled={!maxEnabled}
                          onChange={(e) => onChangeMax(index, e.target.value)}
                        />
                        <span className="sensor-unit-text">
                          {sensorUnit(sensor.sensorKey || sensor.name, sensor.uid)}
                        </span>
                        <label className="sensor-limit-toggle">
                          <input
                            type="checkbox"
                            checked={maxEnabled}
                            onChange={(e) => onToggleMaxEnabled(index, e.target.checked)}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </td>
              ) : null}

              {showLimits ? (
                <td className="min-col-cell">
                  <div className="edit-limit-wrap sensor-limit-cell min-limit-cell">
                    {readOnlyLimits ? (
                      <>
                        <span className="limit-readonly-text">
                          {formatSensorValue(min, sensor.sensorKey || sensor.name, sensor.uid)}
                        </span>
                        <label className="sensor-limit-toggle">
                          <input
                            type="checkbox"
                            checked={minEnabled}
                            onChange={(e) => onToggleMinEnabled(index, e.target.checked)}
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <input
                          className="limit-input"
                          type="number"
                          step="any"
                          value={sensor.minValue ?? ""}
                          disabled={!minEnabled}
                          onChange={(e) => onChangeMin(index, e.target.value)}
                        />
                        <span className="sensor-unit-text">
                          {sensorUnit(sensor.sensorKey || sensor.name, sensor.uid)}
                        </span>
                        <label className="sensor-limit-toggle">
                          <input
                            type="checkbox"
                            checked={minEnabled}
                            onChange={(e) => onToggleMinEnabled(index, e.target.checked)}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function NodeSensorPage() {
  const { t, lang } = useDuwimsT();
  const leaflet = useLeafletBundle();
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [nodes, setNodes] = useState([]);

  const [view, setView] = useState("view");
  const [plots, setPlots] = useState([]);
  const [selectedMapPlotId, setSelectedMapPlotId] = useState("all");
  const [selectedNodeType, setSelectedNodeType] = useState("all");
  const [locateStatus, setLocateStatus] = useState("");
  const [locateTickCurrent, setLocateTickCurrent] = useState(0);
  const [locateTickCreate, setLocateTickCreate] = useState(0);
  const [locateTickEdit, setLocateTickEdit] = useState(0);
  const [openNodeId, setOpenNodeId] = useState("");

  const [editNodeId, setEditNodeId] = useState("");
  const [editPlotId, setEditPlotId] = useState("");

  const [formPlotId, setFormPlotId] = useState("");
  const [formUid, setFormUid] = useState("");
  const [formNodeName, setFormNodeName] = useState("");
  const [formMarker, setFormMarker] = useState(null);
  const [formSensors, setFormSensors] = useState(sensorPresetsByType("air"));
  const [matchedNode, setMatchedNode] = useState(null);
  const [uidLookupBusy, setUidLookupBusy] = useState(false);
  const [uidLookupMessage, setUidLookupMessage] = useState("");

  const [uidTouched, setUidTouched] = useState(false);
  const [nodeNameTouched, setNodeNameTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [confirmState, setConfirmState] = useState({
    open: false,
    type: "delete",
    title: "",
    sub: "",
    icon: "🗑",
    confirmText: "",
    cancelText: "",
    secondaryText: "",
    confirmClassName: "",
    onConfirm: null,
    onSecondary: null,
  });
  const [initialFormSnapshot, setInitialFormSnapshot] = useState(null);
  const pendingLeaveUrlRef = useRef("");
  const popStateGuardRef = useRef(false);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/");
      return;
    }

    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    loadAll();
  }, [authChecked]);

  const allNodes = useMemo(() => {
  return nodes.map((node) => {
    const plot = plots.find((p) => String(p.id) === String(node.plotId));
    return {
      ...node,
      plotId: node.plotId || "",
      plotName: plot?.plotName || "-",
      nodeType: inferNodeTypeFromUid(node.uid, node.sensors, node.nodeName),
    };
  });
}, [nodes, plots]);

  const filteredPlotsForMap = useMemo(() => {
    if (selectedMapPlotId === "all") return plots;
    return plots.filter((p) => String(p.id) === String(selectedMapPlotId));
  }, [plots, selectedMapPlotId]);

  const filteredNodes = useMemo(() => {
  return allNodes.filter((node) => {
    if (!node.plotId) return false;

    const matchPlot =
      selectedMapPlotId === "all" ||
      String(node.plotId) === String(selectedMapPlotId);

    const matchType =
      selectedNodeType === "all" ||
      String(node.nodeType) === String(selectedNodeType);

    return matchPlot && matchType;
  });
}, [allNodes, selectedMapPlotId, selectedNodeType]);

  const createSelectedPlot = useMemo(
    () => plots.find((p) => String(p.id) === String(formPlotId)) || null,
    [plots, formPlotId],
  );

  const editSelectedPlot = useMemo(
    () =>
      plots.find(
        (p) => String(p.id) === String(formPlotId || editPlotId),
      ) || null,
    [plots, formPlotId, editPlotId],
  );

  const detectedFormNodeType = useMemo(
    () =>
      matchedNode
        ? inferNodeTypeFromUid(
            matchedNode.uid,
            matchedNode.sensors,
            matchedNode.nodeName,
          )
        : "",
    [matchedNode],
  );

  const isUidMatched = !!matchedNode;
  const shouldShowNodeDetails = !!formUid.trim() && isUidMatched;
  const uidInvalid = (submitAttempted || uidTouched) && !formUid.trim();
  const nodeNameInvalid =
    (submitAttempted || nodeNameTouched) && !formNodeName.trim();
  const currentFormSnapshot = useMemo(
    () =>
      buildFormSnapshot({
        plotId: formPlotId,
        uid: formUid,
        nodeName: formNodeName,
        marker: formMarker,
        sensors: formSensors,
      }),
    [formPlotId, formUid, formNodeName, formMarker, formSensors],
  );

  const hasUnsavedChanges =
    (view === "create" || view === "edit") &&
    initialFormSnapshot !== null &&
    currentFormSnapshot !== initialFormSnapshot;

  const isNodeFormView = view === "create" || view === "edit";

  const hasPendingLeaveGuard =
    isNodeFormView ||
    hasUnsavedChanges ||
    (confirmState.open && (confirmState.type === "delete" || confirmState.type === "save"));


  useEffect(() => {
  const cleanUid = String(formUid || "").trim();

  if (!cleanUid) {
    setMatchedNode(null);
    setUidLookupBusy(false);
    setUidLookupMessage("");
    setFormSensors([]);
    return;
  }

  let alive = true;
  setUidLookupBusy(true);

  (async () => {
    try {
      const res = await apiFetch(`/api/nodes/by-uid/${encodeURIComponent(cleanUid)}`);
      const found = normalizeNode(res?.item || {});

      if (!alive) return;

      setMatchedNode(found);
      setFormSensors(
        Array.isArray(found.sensors)
          ? found.sensors.map((s) => {
              const sensorKey = s.sensorKey || canonicalizeSensorName(s.name, s.uid);
              const normalizedMinValue = toNum(s.minValue);
              const normalizedMaxValue = toNum(s.maxValue);
              return {
                ...s,
                sensorKey,
                name: sensorKey,
                rawName: s.rawName || s.name,
                minEnabled:
                  typeof s.minEnabled === "boolean"
                    ? s.minEnabled
                    : normalizedMinValue !== null,
                maxEnabled:
                  typeof s.maxEnabled === "boolean"
                    ? s.maxEnabled
                    : normalizedMaxValue !== null,
              };
            })
          : []
      );
      setUidLookupMessage(
        lang === "en" ? "UID found in database" : "พบ UID ในฐานข้อมูล"
      );
    } catch (e) {
      if (!alive) return;
      setMatchedNode(null);
      setFormSensors([]);
      setUidLookupMessage(
        lang === "en" ? "Node UID not found" : "ไม่พบ UID ของ Node ในฐานข้อมูล"
      );
    } finally {
      if (alive) setUidLookupBusy(false);
    }
  })();

  return () => {
    alive = false;
  };
}, [formUid, lang]);

  useEffect(() => {
    if (!hasPendingLeaveGuard || busy) return;

    const onRequestedNavigation = (event) => {
      const detail = event?.detail || {};
      const href = typeof detail.href === "string" ? detail.href : "";
      const action =
        typeof detail.action === "function"
          ? detail.action
          : href
            ? () => router.push(href)
            : null;

      if (!action) return;

      event.preventDefault?.();
      pendingLeaveUrlRef.current = href || "";
      openConfirm({
        type: "unsaved",
        icon: "⚠️",
        title:
          lang === "en"
            ? "You have unsaved changes"
            : "มีการแก้ไขที่ยังไม่บันทึก",
        sub:
          lang === "en"
            ? "You are currently adding or editing data.\nDo you want to discard the current changes and switch pages, or stay on this page?"
            : "คุณกำลังอยู่ระหว่างเพิ่ม Node หรือแก้ไขข้อมูล\nต้องการยกเลิกการแก้ไขแล้วเปลี่ยนหน้า หรืออยู่หน้าเดิมต่อ",
        secondaryText: lang === "en" ? "Stay on this page" : "อยู่หน้าเดิม",
        confirmText: lang === "en" ? "Discard changes" : "ยกเลิกการแก้ไข",
        confirmClassName: "confirm-warn",
        onSecondary: async () => {
          pendingLeaveUrlRef.current = "";
          closeConfirm();
        },
        onConfirm: async () => {
          const nextAction = action;
          pendingLeaveUrlRef.current = "";
          performCancelForm();
          closeConfirm();
          if (typeof nextAction === "function") nextAction();
        },
      });
    };

    window.addEventListener("duwims:request-navigation", onRequestedNavigation);
    return () => {
      window.removeEventListener("duwims:request-navigation", onRequestedNavigation);
    };
  }, [hasPendingLeaveGuard, busy, lang, router]);

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!hasPendingLeaveGuard || busy) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasPendingLeaveGuard, busy]);

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (!hasPendingLeaveGuard || busy) return;
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.href === currentUrl.href) return;

      event.preventDefault();
      event.stopPropagation();

      pendingLeaveUrlRef.current = nextUrl.href;
      openConfirm({
        type: "unsaved",
        icon: "⚠️",
        title:
          lang === "en"
            ? "You have unsaved changes"
            : "มีการแก้ไขที่ยังไม่บันทึก",
        sub:
          lang === "en"
            ? "You are currently adding or editing data.\nDo you want to discard the current changes and switch pages, or stay on this page?"
            : "คุณกำลังอยู่ระหว่างเพิ่ม Node หรือแก้ไขข้อมูล\nต้องการยกเลิกการแก้ไขแล้วเปลี่ยนหน้า หรืออยู่หน้าเดิมต่อ",
                secondaryText: lang === "en" ? "Stay on this page" : "อยู่หน้าเดิม",
        confirmText: lang === "en" ? "Discard changes" : "ยกเลิกการแก้ไข",
        confirmClassName: "confirm-warn",
        onSecondary: async () => {
          pendingLeaveUrlRef.current = "";
          closeConfirm();
        },
        onConfirm: async () => {
          const target = pendingLeaveUrlRef.current;
          pendingLeaveUrlRef.current = "";
          performCancelForm();
          closeConfirm();
          if (target) window.location.assign(target);
        },
      });
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [hasPendingLeaveGuard, busy, lang]);

  useEffect(() => {
    if (!isNodeFormView) {
      popStateGuardRef.current = false;
      return;
    }

    const shouldGuard = hasPendingLeaveGuard && !busy;
    if (!shouldGuard) {
      popStateGuardRef.current = false;
      return;
    }

    if (!popStateGuardRef.current) {
      window.history.pushState({ nodeGuard: true }, "", window.location.href);
      popStateGuardRef.current = true;
    }

    const onPopState = () => {
      if (!hasPendingLeaveGuard || busy) return;

      window.history.pushState({ nodeGuard: true }, "", window.location.href);

      openConfirm({
        type: "unsaved",
        icon: "⚠️",
        title:
          lang === "en"
            ? "You have unsaved changes"
            : "มีการแก้ไขที่ยังไม่บันทึก",
        sub:
          lang === "en"
            ? "You are currently adding or editing data.\nDo you want to discard the current changes and switch pages, or stay on this page?"
            : "คุณกำลังอยู่ระหว่างเพิ่ม Node หรือแก้ไขข้อมูล\nต้องการยกเลิกการแก้ไขแล้วเปลี่ยนหน้า หรืออยู่หน้าเดิมต่อ",
                secondaryText: lang === "en" ? "Stay on this page" : "อยู่หน้าเดิม",
        confirmText: lang === "en" ? "Discard changes" : "ยกเลิกการแก้ไข",
        confirmClassName: "confirm-warn",
        onSecondary: async () => {
          closeConfirm();
        },
        onConfirm: async () => {
          closeConfirm();
          performCancelForm();
          popStateGuardRef.current = false;
          window.history.back();
        },
      });
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [isNodeFormView, hasPendingLeaveGuard, busy, lang]);

  async function loadAll() {
  setLoading(true);
  setError("");
  setSuccess("");

  try {
    const [plotsRes, nodesRes] = await Promise.all([
      apiFetch("/api/plots"),
      apiFetch("/api/nodes"),
    ]);

    const plotItems = Array.isArray(plotsRes?.items)
      ? plotsRes.items.map(normalizePlot)
      : Array.isArray(plotsRes)
        ? plotsRes.map(normalizePlot)
        : [];

    const nodeItems = Array.isArray(nodesRes?.items)
      ? nodesRes.items.map(normalizeNode)
      : Array.isArray(nodesRes)
        ? nodesRes.map(normalizeNode)
        : [];

    setPlots(plotItems);
    setNodes(nodeItems);

    const firstNode = nodeItems.find((node) => node?.plotId);
    if (firstNode?._id && !openNodeId) {
      setOpenNodeId(firstNode._id);
    }
  } catch (e) {
    setError(
      e?.message ||
        t.loadNodeFailed ||
        (lang === "en"
          ? "Failed to load node data"
          : "โหลดข้อมูล node ไม่สำเร็จ")
    );
  } finally {
    setLoading(false);
  }
}

  function resetValidation() {
    setUidTouched(false);
    setNodeNameTouched(false);
    setSubmitAttempted(false);
  }

  function resetForm() {
    setFormPlotId("");
    setFormUid("");
    setFormNodeName("");
    setFormMarker(null);
    setFormSensors([]);
    setMatchedNode(null);
    setUidLookupBusy(false);
    setUidLookupMessage("");
    resetValidation();
  }

  function performCancelForm() {
    setView("view");
    setEditNodeId("");
    setEditPlotId("");
    setInitialFormSnapshot(null);
    resetForm();
    setError("");
  }

  function requestDiscardChanges(nextAction) {
    openConfirm({
      type: "unsaved",
      icon: "⚠️",
      title:
        lang === "en"
          ? "You have unsaved changes"
          : "มีการแก้ไขที่ยังไม่บันทึก",
      sub:
        lang === "en"
          ? "You are currently adding or editing data.\nDo you want to discard the current changes and switch pages, or stay on this page?"
          : "คุณกำลังอยู่ระหว่างเพิ่ม Node หรือแก้ไขข้อมูล\nต้องการยกเลิกการแก้ไขแล้วเปลี่ยนหน้า หรืออยู่หน้าเดิมต่อ",
            secondaryText: lang === "en" ? "Stay on this page" : "อยู่หน้าเดิม",
      confirmText: lang === "en" ? "Discard changes" : "ยกเลิกการแก้ไข",
      confirmClassName: "confirm-warn",
      onSecondary: async () => {
        closeConfirm();
      },
      onConfirm: async () => {
        performCancelForm();
        if (typeof nextAction === "function") nextAction();
      },
    });
  }

  function doOpenCreate() {
    resetForm();
    setView("create");
    setInitialFormSnapshot(
      buildFormSnapshot({
        plotId: "",
        uid: "",
        nodeName: "",
        marker: null,
        sensors: [],
      }),
    );
    setError("");
    setSuccess("");
  }

  function openCreate() {
    if (hasUnsavedChanges) {
      requestDiscardChanges(() => doOpenCreate());
      return;
    }

    doOpenCreate();
  }

  function doOpenEdit(node) {
    setEditNodeId(node._id);
    setEditPlotId(node.plotId);
    setFormPlotId(node.plotId);
    setFormUid(node.uid || "");
    setFormNodeName(node.nodeName || "");
    setFormMarker(
      Number.isFinite(node.lat) && Number.isFinite(node.lng)
        ? [node.lat, node.lng]
        : null,
    );
    setFormSensors(
      Array.isArray(node.sensors) && node.sensors.length
        ? node.sensors.map((s) => ({
            ...s,
            sensorKey: s.sensorKey || canonicalizeSensorName(s.name, s.uid),
            name: s.sensorKey || canonicalizeSensorName(s.name, s.uid),
            rawName: s.rawName || s.name,
            minEnabled: s.minEnabled !== false,
            maxEnabled: s.maxEnabled !== false,
          }))
        : sensorPresetsByType(inferNodeTypeFromUid(node.uid, node.sensors, node.nodeName)),
    );
    resetValidation();
    setView("edit");
    setInitialFormSnapshot(
      buildFormSnapshot({
        plotId: node.plotId,
        uid: node.uid || "",
        nodeName: node.nodeName || "",
        marker:
          Number.isFinite(node.lat) && Number.isFinite(node.lng)
            ? [node.lat, node.lng]
            : null,
        sensors:
          Array.isArray(node.sensors) && node.sensors.length
            ? node.sensors.map((s) => ({
                ...s,
                sensorKey: s.sensorKey || canonicalizeSensorName(s.name, s.uid),
                name: s.sensorKey || canonicalizeSensorName(s.name, s.uid),
                rawName: s.rawName || s.name,
                minEnabled: s.minEnabled !== false,
                maxEnabled: s.maxEnabled !== false,
              }))
            : sensorPresetsByType(inferNodeTypeFromUid(node.uid, node.sensors, node.nodeName)),
      }),
    );
    setError("");
    setSuccess("");
  }

  function openEdit(node) {
    if (hasUnsavedChanges) {
      requestDiscardChanges(() => doOpenEdit(node));
      return;
    }

    doOpenEdit(node);
  }

  function cancelForm() {
    openConfirm({
      type: "back",
      icon: "⚠️",
      title:
        lang === "en"
          ? "Confirm going back"
          : "ยืนยันการย้อนกลับ",
      sub:
        lang === "en"
          ? "You are currently adding or editing node data. Do you want to go back and leave this form?"
          : "คุณกำลังอยู่ระหว่างเพิ่ม Node หรือแก้ไขข้อมูล ต้องการย้อนกลับและออกจากฟอร์มนี้ใช่หรือไม่?",
      secondaryText: lang === "en" ? "Stay on this page" : "อยู่หน้าเดิม",
      confirmText: lang === "en" ? "Go back" : "ย้อนกลับ",
      confirmClassName: "confirm-warn",
      onSecondary: async () => {
        closeConfirm();
      },
      onConfirm: async () => {
        performCancelForm();
        closeConfirm();
      },
    });
  }

  function validateForm() {
    setSubmitAttempted(true);

    if (!formPlotId) {
      setError(
        t.selectPlotError ||
          (lang === "en" ? "Please select a plot" : "กรุณาเลือกแปลง"),
      );
      return false;
    }
    if (!formUid.trim()) {
      setError(
        t.enterUidError ||
          (lang === "en" ? "Please enter UID" : "กรุณากรอก UID"),
      );
      return false;
    }
    if (!matchedNode) {
      setError(
        t.uidDoesNotExist ||
          (lang === "en"
            ? "This UID does not exist in the database"
            : "UID นี้ไม่มีอยู่ในฐานข้อมูล"),
      );
      return false;
    }
    if (!formNodeName.trim()) {
      setError(
        t.enterNodeNameError ||
          (lang === "en" ? "Please enter node name" : "กรุณากรอกชื่อ Node"),
      );
      return false;
    }
    if (
      !formMarker ||
      !Number.isFinite(formMarker[0]) ||
      !Number.isFinite(formMarker[1])
    ) {
      setError(
        t.pinOnMapError ||
          (lang === "en"
            ? "Please pin a marker on the map"
            : "กรุณาปักหมุดบนแผนที่"),
      );
      return false;
    }
    return true;
  }

  function buildSensorPayload() {
    return formSensors.map((sensor) => {
      const sensorKey = sensor.sensorKey || canonicalizeSensorName(sensor.name, sensor.uid);

      return {
        _id: sensor._id || undefined,
        uid: sensor.uid || sensorKey,
        name: sensorKey,
        sensorKey,
        status: sensor.status || "OK",
        minValue: sensor.minEnabled === false ? null : sensor.minValue,
        maxValue: sensor.maxEnabled === false ? null : sensor.maxValue,
        latestValue: sensor.latestValue,
        latestTimestamp: sensor.latestTimestamp || null,
      };
    });
  }

  function updateSensorMin(index, value) {
    setFormSensors((prev) =>
      prev.map((sensor, i) =>
        i === index
          ? { ...sensor, minValue: value === "" ? null : Number(value) }
          : sensor,
      ),
    );
  }

  function updateSensorMax(index, value) {
    setFormSensors((prev) =>
      prev.map((sensor, i) =>
        i === index
          ? { ...sensor, maxValue: value === "" ? null : Number(value) }
          : sensor,
      ),
    );
  }


  function toggleSensorMinEnabled(index, checked) {
    setFormSensors((prev) =>
      prev.map((sensor, i) =>
        i === index ? { ...sensor, minEnabled: checked } : sensor,
      ),
    );
  }

  function toggleSensorMaxEnabled(index, checked) {
    setFormSensors((prev) =>
      prev.map((sensor, i) =>
        i === index ? { ...sensor, maxEnabled: checked } : sensor,
      ),
    );
  }

  function openConfirm({
    type = "delete",
    title,
    sub,
    icon,
    confirmText = "",
    cancelText = "",
    secondaryText = "",
    confirmClassName = "",
    onConfirm,
    onSecondary,
  }) {
    setConfirmState({
      open: true,
      type,
      title,
      sub,
      icon,
      confirmText,
      cancelText,
      secondaryText,
      confirmClassName,
      onConfirm,
      onSecondary,
    });
  }

  function closeConfirm() {
    if (busy) return;
    setConfirmState({
      open: false,
      type: "delete",
      title: "",
      sub: "",
      icon: "🗑",
      confirmText: "",
      cancelText: "",
      secondaryText: "",
      confirmClassName: "",
      onConfirm: null,
      onSecondary: null,
    });
  }

  async function runConfirm() {
    if (typeof confirmState.onConfirm === "function") {
      await confirmState.onConfirm();
    }
    setConfirmState({
      open: false,
      type: "delete",
      title: "",
      sub: "",
      icon: "🗑",
      confirmText: "",
      cancelText: "",
      secondaryText: "",
      confirmClassName: "",
      onConfirm: null,
      onSecondary: null,
    });
  }

  async function runSecondaryConfirm() {
    if (typeof confirmState.onSecondary === "function") {
      await confirmState.onSecondary();
      return;
    }
    closeConfirm();
  }

  function handleSave() {
  if (!validateForm()) return;

  openConfirm({
    type: "save",
    icon: "💾",
    title:
      view === "create"
        ? t.confirmSaveNodeTitle ||
          (lang === "en" ? "Confirm save" : "ยืนยันการบันทึกข้อมูล")
        : t.confirmEditNodeTitle ||
          (lang === "en" ? "Confirm edit save" : "ยืนยันการบันทึกการแก้ไข"),
    sub:
      view === "create"
        ? t.confirmCreateNodeSub ||
          (lang === "en"
            ? "Do you want to save this node to the system?"
            : "ต้องการบันทึก Node นี้เข้าสู่ระบบใช่หรือไม่?")
        : t.confirmEditNodeSub ||
          (lang === "en"
            ? "Do you want to save changes to this node?"
            : "ต้องการบันทึกการแก้ไข Node นี้ใช่หรือไม่?"),
    onConfirm: async () => {
      setBusy(true);
      setError("");
      setSuccess("");

      try {
        const payload = {
          uid: formUid.trim(),
          nodeName: formNodeName.trim(),
          status:
            matchedNode?.status ||
            allNodes.find((n) => String(n._id) === String(editNodeId))?.status ||
            "ACTIVE",
          plotId: formPlotId,
          lat: formMarker[0],
          lng: formMarker[1],
          sensors: buildSensorPayload(),
        };

        if (view === "create") {
          await apiFetch("/api/nodes/link-by-uid", {
            method: "PATCH",
            body: payload,
          });

          setSuccess(
            t.saveNodeSuccess ||
              (lang === "en"
                ? "Node linked successfully"
                : "ผูก Node กับแปลงสำเร็จ")
          );
        } else if (view === "edit") {
          await apiFetch(`/api/nodes/${editNodeId}`, {
            method: "PATCH",
            body: payload,
          });

          setSuccess(
            t.editNodeSuccess ||
              (lang === "en"
                ? "Node updated successfully"
                : "แก้ไข Node สำเร็จ")
          );
        }

        await loadAll();
        performCancelForm();
      } catch (e) {
        setError(
          e?.message ||
            t.saveNodeFailed ||
            (lang === "en" ? "Failed to save node" : "บันทึก Node ไม่สำเร็จ")
        );
      } finally {
        setBusy(false);
        closeConfirm();
      }
    },
  });
}

  function handleDelete(node) {
  openConfirm({
    type: "delete",
    icon: "🗑",
    title:
      t.confirmDeleteNodeTitle ||
      (lang === "en" ? "Confirm deletion" : "ยืนยันการลบข้อมูล"),
    sub:
      lang === "en"
        ? "Do you want to unlink this node from the plot?"
        : "ต้องการยกเลิกการผูก Node นี้ออกจากแปลงใช่หรือไม่?",
    onConfirm: async () => {
      setBusy(true);
      setError("");
      setSuccess("");

      try {
        await apiFetch(`/api/nodes/${node._id}/unlink`, {
          method: "PATCH",
        });

        setSuccess(
          t.deleteNodeSuccess ||
            (lang === "en"
              ? "Node unlinked successfully"
              : "ยกเลิกการผูก Node สำเร็จ")
        );

        if (String(openNodeId) === String(node._id)) {
          setOpenNodeId("");
        }

        await loadAll();
      } catch (e) {
        setError(
          e?.message ||
            t.deleteNodeFailed ||
            (lang === "en"
              ? "Failed to unlink node"
              : "ยกเลิกการผูก Node ไม่สำเร็จ")
        );
      } finally {
        setBusy(false);
        closeConfirm();
      }
    },
  });
}

  const viewPolygons = filteredPlotsForMap.map((plot) => ({
    coords: plot.polygon,
    color: "#6c8f5d",
  }));

  const createPolygons = createSelectedPlot
    ? [{ coords: createSelectedPlot.polygon, color: "#6c8f5d" }]
    : [];

  const editPolygons = editSelectedPlot
    ? [{ coords: editSelectedPlot.polygon, color: "#6c8f5d" }]
    : [];

  if (!authChecked) {
    return null;
  }

  return (
    <DuwimsStaticPage current="node-sensor" htmlContent="">
      <div className="page-content">
        {error ? (
          <div className="alert-box error">
            <div className="alert-title">
              {t.noticeTitle || (lang === "en" ? "Notice" : "แจ้งเตือน")}
            </div>
            <div className="alert-text">{error}</div>
          </div>
        ) : null}

        {success ? (
          <div className="alert-box success">
            <div className="alert-title">
              {t.successTitle || (lang === "en" ? "Success" : "สำเร็จ")}
            </div>
            <div className="alert-text">{success}</div>
          </div>
        ) : null}

        {view === "view" && (
          <>
            <div className="card" style={{ marginBottom: 13 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 9,
                  flexWrap: "wrap",
                  gap: 7,
                }}
              >
                <div className="card-title">
                  {t.currentMap || "🗺 Current Map"}
                </div>
                <button
                  className="create-btn"
                  style={{ marginBottom: 0 }}
                  onClick={openCreate}
                >
                  {t.addNode ||
                    (lang === "en" ? "＋ Add NODE" : "＋ เพิ่ม NODE")}
                </button>
              </div>

              <div className="map-wrapper">
                <div id="currentMapHost">
                  <div className="leaflet-box">
                    {loading ? (
                      <div className="map-loading">
                        {t.loadingMap ||
                          (lang === "en"
                            ? "Loading map..."
                            : "กำลังโหลดแผนที่...")}
                      </div>
                    ) : (
                      <NodeMap
                        leaflet={leaflet}
                        t={t}
                        lang={lang}
                        polygons={viewPolygons}
                        nodes={filteredNodes}
                        selectable={false}
                        locateTick={locateTickCurrent}
                        onLocateStatus={setLocateStatus}
                        mapKey={`view-${selectedMapPlotId}-${selectedNodeType}-${filteredNodes.length}-${openNodeId}`}
                        selectedNodeId={openNodeId}
                        lockToSelectedPolygon={false}
                      />
                    )}
                  </div>
                </div>
                <button
                  className="locate-btn"
                  onClick={() => setLocateTickCurrent((v) => v + 1)}
                >
                  {t.myLocation ||
                    (lang === "en" ? "📍 My Location" : "📍 ตำแหน่งฉัน")}
                </button>
              </div>
            </div>

            {filteredNodes.map((node) => {
              const isOpen = String(openNodeId) === String(node._id);

              return (
                <div className="node-card open" key={node._id}>
                  <button
                    type="button"
                    className="node-header node-header-btn"
                    onClick={() => setOpenNodeId(isOpen ? "" : node._id)}
                  >
                    <div className="node-header-left">
                      <div className="node-summary-line">
                        <span className="node-summary-item">
                          <span className="node-summary-label">uid :</span>
                          <span className="node-summary-value">
                            {node.uid || "-"}
                          </span>
                        </span>

                        <span className="node-summary-sep">|</span>

                        <span className="node-summary-item node-summary-item-compact">
                          <span className="node-summary-label">
                            {(t.plot || (lang === "en" ? "Plot" : "แปลง")) +
                              " :"}
                          </span>
                          <span className="node-summary-value" title={node.plotName || "-"}>
                            {node.plotName || "-"}
                          </span>
                        </span>

                        <span className="node-summary-sep">|</span>

                        <span className="node-summary-item node-summary-item-compact">
                          <span className="node-summary-label">
                            {(t.node || "Node").toLowerCase()} :
                          </span>
                          <span className="node-summary-value" title={node.nodeName || "-"}>
                            {node.nodeName || "-"}
                          </span>
                        </span>

                        <span className="node-summary-sep">|</span>

                        <span
                          className={`node-type-badge node-type-badge-inline ${
                            node.nodeType === "soil" ? "type-soil" : "type-air"
                          }`}
                        >
                          {nodeTypeLabel(node.nodeType)}
                        </span>

                        <span className="node-summary-sep">|</span>

                        <span
                          className={`node-status-pill-inline ${
                            formatStatus(node.status) === "ON"
                              ? "status-on"
                              : "status-off"
                          }`}
                        >
                          {t.statusText ||
                            (lang === "en" ? "Status :" : "Status :")}{" "}
                          {formatStatus(node.status || "-")}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{ display: "flex", alignItems: "center", gap: 9 }}
                    >
                      <span
                        className={`accordion-arrow ${isOpen ? "open" : ""}`}
                      >
                        ▾
                      </span>
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="node-body" style={{ display: "block" }}>
                      <div className="sensor-section-title">
                        {node.nodeType === "soil" ? "Soil Sensors" : "Air Sensors"}
                      </div>
                      <SensorTable sensors={node.sensors} t={t} lang={lang} showLimits={true} />

                      <div className="node-actions">
                        <button
                          className="btn-sm btn-edit"
                          onClick={() => openEdit(node)}
                        >
                          {t.editNodeButton ||
                            (lang === "en" ? "✏️ Edit" : "✏️ แก้ไข")}
                        </button>
                        <button
                          className="btn-sm btn-del"
                          onClick={() => handleDelete(node)}
                        >
                          {t.deleteNodeButton ||
                            (lang === "en" ? "🗑 Delete" : "🗑 ลบ")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </>
        )}

        {view === "create" && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 14,
              }}
            >
              <button
                className="btn-sm btn-edit"
                style={{ padding: "7px 13px" }}
                onClick={cancelForm}
              >
                {t.back || (lang === "en" ? "< Back" : "< กลับ")}
              </button>
              <div
                style={{ fontSize: 22, fontWeight: 800, color: "var(--soil)" }}
              >
                {t.addNode || (lang === "en" ? "＋ Add NODE" : "＋ เพิ่ม NODE")}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div className="card-title">
                  {t.currentMap || "🗺 Current Map"}{" "}
                  <span style={{ fontSize: 20, color: "var(--muted)" }}>
                    {t.clickMapToPin ||
                      (lang === "en"
                        ? "(click the map to pin a marker)"
                        : "(คลิกแผนที่เพื่อปักหมุด)")}
                  </span>
                </div>
                <div className="map-msg">
                  {formMarker
                    ? t.markerSelected ||
                      (lang === "en" ? "Location selected" : "เลือกตำแหน่งแล้ว")
                    : t.markerNotSelected ||
                      (lang === "en"
                        ? "No marker selected"
                        : "ยังไม่ได้ปักหมุด")}
                </div>
              </div>

              <div id="createMapHost">
                <div className="leaflet-box">
                  <NodeMap
                    leaflet={leaflet}
                    t={t}
                    lang={lang}
                    polygons={createPolygons}
                    nodes={[]}
                    selectable={!!formPlotId}
                    markerPosition={formMarker}
                    onPickMarker={setFormMarker}
                    locateTick={locateTickCreate}
                    onLocateStatus={setLocateStatus}
                    mapKey={`create-${formPlotId}`}
                    selectedNodeId=""
                    lockToSelectedPolygon={!!formPlotId}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 10,
                }}
              >
                <button
                  className="locate-btn-inline"
                  onClick={() => setLocateTickCreate((v) => v + 1)}
                >
                  {t.myLocation ||
                    (lang === "en" ? "📍 My Location" : "📍 ตำแหน่งฉัน")}
                </button>
                <div className="coord-read">
                  lat: {formMarker ? formMarker[0].toFixed(6) : "-"} · lng:{" "}
                  {formMarker ? formMarker[1].toFixed(6) : "-"}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                {t.createNodeTitle ||
                  (lang === "en" ? "📡 Create Node" : "📡 Create Node")}
              </div>

              <div className="filter-field">
                <div className="filter-field-label">
                  {t.plot || (lang === "en" ? "Plot" : "แปลง")}
                </div>
                <select
                  className="form-select"
                  value={formPlotId}
                  onChange={(e) => {
                    setFormPlotId(e.target.value);
                    setFormMarker(null);
                  }}
                >
                  <option value="">
                    {t.selectPlot ||
                      (lang === "en" ? "-- Select Plot --" : "-- เลือกแปลง --")}
                  </option>
                  {plots.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.plotName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="filter-field" style={{ marginBottom: 0 }}>
                  <div
                    className={`filter-field-label ${uidInvalid ? "label-error" : ""}`}
                  >
                    UID <span className="required-star">*</span>
                  </div>
                  <input
                    className={`form-input ${uidInvalid ? "input-error" : ""}`}
                    placeholder={
                      lang === "en"
                        ? "Enter UID that exists in the database only"
                        : "กรอก UID ที่มีอยู่ในฐานข้อมูลเท่านั้น"
                    }
                    value={formUid}
                    onChange={(e) => {
                      setFormUid(e.target.value);
                      setUidTouched(true);
                    }}
                    onBlur={() => setUidTouched(true)}
                  />
                  {uidInvalid ? (
                    <div className="field-error-text">
                      {t.enterUidError ||
                        (lang === "en" ? "Please enter UID" : "กรุณากรอก UID")}
                    </div>
                  ) : null}
                  {formUid.trim() ? (
                    <div
                      className={`uid-lookup-message ${isUidMatched ? "is-success" : "is-error"}`}
                    >
                      {uidLookupBusy
                        ? lang === "en"
                          ? "Checking UID..."
                          : "กำลังตรวจสอบ UID..."
                        : uidLookupMessage}
                    </div>
                  ) : null}
                </div>

                <div className="filter-field" style={{ marginBottom: 0 }}>
                  <div
                    className={`filter-field-label ${nodeNameInvalid ? "label-error" : ""}`}
                  >
                    {(
                      t.nodeNameRequiredLabel ||
                      (lang === "en" ? "Node Name *" : "ชื่อ Node *")
                    ).replace(" *", "")}{" "}
                    <span className="required-star">*</span>
                  </div>
                  <input
                    className={`form-input ${nodeNameInvalid ? "input-error" : ""}`}
                    placeholder={
                      lang === "en" ? "e.g. center field" : "เช่น กลางไร่"
                    }
                    value={formNodeName}
                    onChange={(e) => setFormNodeName(e.target.value)}
                    onBlur={() => setNodeNameTouched(true)}
                  />
                  {nodeNameInvalid ? (
                    <div className="field-error-text">
                      {t.enterNodeNameError ||
                        (lang === "en"
                          ? "Please enter node name"
                          : "กรุณากรอกชื่อ Node")}
                    </div>
                  ) : null}
                </div>
              </div>

              {shouldShowNodeDetails ? (
                <div
                  style={{
                    display: "block",
                    margin: "13px 0",
                    padding: "10px 12px",
                    borderRadius: 11,
                    background: "rgba(76,175,80,.08)",
                    border: "1px solid rgba(76,175,80,.24)",
                    fontSize: 14,
                    color: "var(--soil)",
                    fontWeight: 600,
                  }}
                >
                  {lang === "en" ? "Detected node type" : "ตรวจพบชนิด Node"} :{" "}
                  {detectedFormNodeType === "soil"
                    ? t.soilNode || "Soil Node"
                    : t.airNode || "Air Node"}
                </div>
              ) : null}


              {shouldShowNodeDetails ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      margin: "14px 0 10px",
                    }}
                  >
                    <div className="card-title" style={{ marginBottom: 0, fontSize: 20, fontWeight: 800 }}>
                      {detectedFormNodeType === "soil"
                        ? "Soil Sensors"
                        : "Air Sensors"}
                    </div>

                  </div>

                  <EditableSensorTable
                    sensors={formSensors}
                    showLimits={true}
                    onChangeMin={updateSensorMin}
                    onChangeMax={updateSensorMax}
                    onToggleMinEnabled={toggleSensorMinEnabled}
                    onToggleMaxEnabled={toggleSensorMaxEnabled}
                    t={t}
                    lang={lang}
                    readOnlyLimits={true}
                  />
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "#fff8f8",
                    border: "1px solid #efc8c8",
                    color: "#c62828",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {lang === "en"
                    ? "Please enter a UID that exists in the database first. The system will then show Node and Sensor details."
                    : "กรุณากรอก UID ที่มีอยู่ในฐานข้อมูลก่อน ระบบจึงจะแสดงรายละเอียด Node และ Sensor"}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 14,
                  marginTop: 20,
                }}
              >
                <button className="btn-cancel" onClick={cancelForm}>
                  {t.cancel || (lang === "en" ? "Cancel" : "ยกเลิก")}
                </button>
                <button
                  className="btn-save"
                  onClick={handleSave}
                  disabled={busy}
                >
                  {t.save || (lang === "en" ? "Save" : "บันทึก")}
                </button>
              </div>
            </div>
          </>
        )}

        {view === "edit" && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 14,
              }}
            >
              <button
                className="btn-sm btn-edit"
                style={{ padding: "7px 13px" }}
                onClick={cancelForm}
              >
                {t.back || (lang === "en" ? "< Back" : "< กลับ")}
              </button>
              <div
                style={{ fontSize: 22, fontWeight: 800, color: "var(--soil)" }}
              >
                {t.editNodeTitle ||
                  (lang === "en" ? "✏️ Edit NODE" : "✏️ แก้ไข NODE")}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div className="card-title">
                  {t.currentMap || "🗺 Current Map"}{" "}
                  <span style={{ fontSize: 20, color: "var(--muted)" }}>
                    {lang === "en"
                      ? "(click the map to move the marker)"
                      : "(คลิกแผนที่เพื่อย้ายหมุด)"}
                  </span>
                </div>
                <div className="map-msg">
                  {formMarker
                    ? t.markerSelected ||
                      (lang === "en" ? "Location selected" : "เลือกตำแหน่งแล้ว")
                    : lang === "en"
                      ? "No location selected"
                      : "ยังไม่ได้เลือกตำแหน่ง"}
                </div>
              </div>

              <div id="editMapHost">
                <div className="leaflet-box">
                  <NodeMap
                    leaflet={leaflet}
                    t={t}
                    lang={lang}
                    polygons={editPolygons}
                    nodes={[]}
                    selectable={true}
                    markerPosition={formMarker}
                    onPickMarker={setFormMarker}
                    locateTick={locateTickEdit}
                    onLocateStatus={setLocateStatus}
                    mapKey={`edit-${editPlotId}-${editNodeId}`}
                    selectedNodeId=""
                    lockToSelectedPolygon={!!editPlotId}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 10,
                }}
              >
                <button
                  className="locate-btn-inline"
                  onClick={() => setLocateTickEdit((v) => v + 1)}
                >
                  {t.myLocation ||
                    (lang === "en" ? "📍 My Location" : "📍 ตำแหน่งฉัน")}
                </button>
                <div className="coord-read">
                  lat: {formMarker ? formMarker[0].toFixed(6) : "-"} · lng:{" "}
                  {formMarker ? formMarker[1].toFixed(6) : "-"}
                </div>
              </div>
            </div>

            <div className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <div className="card-title" style={{ marginBottom: 0, fontSize: 15, fontWeight: 700 }}>
                  {t.editNodeTitle ||
                    (lang === "en" ? "✏️ Edit NODE" : "✏️ แก้ไข NODE")}
                </div>
                {shouldShowNodeDetails ? (
                  <span
                    className="node-type-badge"
                    style={{
                      background:
                        detectedFormNodeType === "soil" ? "#6d4c41" : "#1565c0",
                      color: "#fff",
                    }}
                  >
                    {nodeTypeLabel(detectedFormNodeType)}
                  </span>
                ) : null}
              </div>

              <div className="filter-field">
                <div className="filter-field-label">
                  {t.plot || (lang === "en" ? "Plot" : "แปลง")}
                </div>
                <select
                  className="form-select"
                  value={formPlotId}
                  onChange={(e) => {
                    setFormPlotId(e.target.value);
                    setFormMarker(null);
                  }}
                >
                  <option value="">
                    {t.selectPlot ||
                      (lang === "en" ? "-- Select Plot --" : "-- เลือกแปลง --")}
                  </option>
                  {plots.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.plotName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="filter-field" style={{ marginBottom: 0 }}>
                  <div
                    className={`filter-field-label ${uidInvalid ? "label-error" : ""}`}
                  >
                    UID <span className="required-star">*</span>
                  </div>
                  <input
                    className={`form-input form-disabled-gray ${uidInvalid ? "input-error" : ""}`}
                    placeholder={
                      lang === "en"
                        ? "Enter UID that exists in the database only"
                        : "กรอก UID ที่มีอยู่ในฐานข้อมูลเท่านั้น"
                    }
                    value={formUid}
                    disabled
                  />
                  {uidInvalid ? (
                    <div className="field-error-text">
                      {t.enterUidError ||
                        (lang === "en" ? "Please enter UID" : "กรุณากรอก UID")}
                    </div>
                  ) : null}
                  {formUid.trim() ? (
                    <div
                      className={`uid-lookup-message ${isUidMatched ? "is-success" : "is-error"}`}
                    >
                      {uidLookupBusy
                        ? lang === "en"
                          ? "Checking UID..."
                          : "กำลังตรวจสอบ UID..."
                        : uidLookupMessage}
                    </div>
                  ) : null}
                </div>

                <div className="filter-field" style={{ marginBottom: 0 }}>
                  <div
                    className={`filter-field-label ${nodeNameInvalid ? "label-error" : ""}`}
                  >
                    {(
                      t.nodeNameRequiredLabel ||
                      (lang === "en" ? "Node Name *" : "ชื่อ Node *")
                    ).replace(" *", "")}{" "}
                    <span className="required-star">*</span>
                  </div>
                  <input
                    className={`form-input ${nodeNameInvalid ? "input-error" : ""}`}
                    value={formNodeName}
                    onChange={(e) => setFormNodeName(e.target.value)}
                    onBlur={() => setNodeNameTouched(true)}
                  />
                  {nodeNameInvalid ? (
                    <div className="field-error-text">
                      {t.enterNodeNameError ||
                        (lang === "en"
                          ? "Please enter node name"
                          : "กรุณากรอกชื่อ Node")}
                    </div>
                  ) : null}
                </div>
              </div>


              {shouldShowNodeDetails ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      margin: "14px 0 10px",
                    }}
                  >
                    <div className="card-title" style={{ marginBottom: 0, fontSize: 20, fontWeight: 800 }}>
                      {detectedFormNodeType === "soil"
                        ? "Soil Sensors"
                        : "Air Sensors"}
                    </div>

                  </div>

                  <EditableSensorTable
                    sensors={formSensors}
                    showLimits={true}
                    onChangeMin={updateSensorMin}
                    onChangeMax={updateSensorMax}
                    onToggleMinEnabled={toggleSensorMinEnabled}
                    onToggleMaxEnabled={toggleSensorMaxEnabled}
                    t={t}
                    lang={lang}
                  />
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "#fff8f8",
                    border: "1px solid #efc8c8",
                    color: "#c62828",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {lang === "en"
                    ? "The system will show Node and Sensor details only when the UID matches a record in the database."
                    : "ระบบจะแสดงรายละเอียด Node และ Sensor ต่อเมื่อ UID ตรงกับข้อมูลในฐานข้อมูลเท่านั้น"}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 14,
                  marginTop: 20,
                }}
              >
                <button className="btn-cancel" onClick={cancelForm}>
                  {t.cancel || (lang === "en" ? "Cancel" : "ยกเลิก")}
                </button>
                <button
                  className="btn-save"
                  onClick={handleSave}
                  disabled={busy}
                >
                  {t.save || (lang === "en" ? "Save" : "บันทึก")}
                </button>
              </div>
            </div>
          </>
        )}

        {confirmState.open ? (
          <div className="confirm-overlay" onClick={closeConfirm}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-icon">{confirmState.icon}</div>

              <div className="confirm-title">{confirmState.title}</div>

              <div className="confirm-sub">
                {String(confirmState.sub || "")
                  .split("\n")
                  .map((line, index, arr) => (
                    <span key={index}>
                      {line}
                      {index < arr.length - 1 ? <br /> : null}
                    </span>
                  ))}
              </div>

              <div className="confirm-actions">
                {confirmState.secondaryText ? (
                  <>
                    <button
                      type="button"
                      className="confirm-btn secondary"
                      onClick={runSecondaryConfirm}
                      disabled={busy}
                    >
                      {confirmState.secondaryText}
                    </button>

                    <button
                      type="button"
                      className={`confirm-btn primary ${
                        confirmState.confirmClassName ||
                        (confirmState.type === "save"
                          ? "confirm-save"
                          : confirmState.type === "unsaved"
                            ? "confirm-warn"
                            : "confirm-delete")
                      }`}
                      onClick={runConfirm}
                      disabled={busy}
                    >
                      {busy
                        ? lang === "en"
                          ? "Processing..."
                          : "กำลังดำเนินการ..."
                        : confirmState.confirmText ||
                          t.confirm ||
                          (lang === "en" ? "Confirm" : "ยืนยัน")}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="confirm-btn secondary"
                      onClick={closeConfirm}
                      disabled={busy}
                    >
                      {confirmState.cancelText ||
                        t.cancel ||
                        (lang === "en" ? "Cancel" : "ยกเลิก")}
                    </button>

                    <button
                      type="button"
                      className={`confirm-btn primary ${
                        confirmState.confirmClassName ||
                        (confirmState.type === "save"
                          ? "confirm-save"
                          : confirmState.type === "unsaved"
                            ? "confirm-warn"
                            : "confirm-delete")
                      }`}
                      onClick={runConfirm}
                      disabled={busy}
                    >
                      {busy
                        ? lang === "en"
                          ? "Processing..."
                          : "กำลังดำเนินการ..."
                        : confirmState.confirmText ||
                          t.confirm ||
                          (lang === "en" ? "Confirm" : "ยืนยัน")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {locateStatus ? (
          <div className="locate-global-status">{locateStatus}</div>
        ) : null}

<style jsx global>{`
  :root {
    --soil: #254f17;
    --card: #ffffff;
    --muted: #7a8d73;
    --text: #20311c;
    --good: #2e7d32;
    --bad: #d84343;
  }

  * {
    box-sizing: border-box;
  }

  .page-content {
    padding: 16px;
    background: linear-gradient(180deg, #edf6e7 0%, #f8fbf6 100%);
    min-height: calc(100vh - 76px);
    color: var(--text);
    font-family: Arial, Helvetica, sans-serif;
  }

  .card {
    background: var(--card);
    border: 1px solid #dce9d7;
    border-radius: 16px;
    padding: 14px;
    box-shadow: 0 5px 16px rgba(51, 87, 37, 0.08);
  }

  .card-title {
    font-size: 20px !important;
    font-weight: 800 !important;
  }

  .filter-field,
  .filter-label {
    margin-bottom: 12px;
  }

  .filter-label,
  .filter-field-label {
    font-size: 16px;
    font-weight: 800;
    color: #5a6d54;
    margin-bottom: 8px;
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .form-select,
  .form-input {
    width: 100%;
    height: 48px;
    border-radius: 12px;
    border: 1px solid #cfe0c8;
    background: #fbfef9;
    color: #33422d;
    padding: 0 12px;
    outline: none;
    font-size: 18px;
    transition: 0.18s ease;
  }

  .form-disabled-gray {
    color: #8a8f98 !important;
    background: #f3f4f6 !important;
    border-color: #d7dbe0 !important;
    cursor: not-allowed !important;
    pointer-events: none !important;
    -webkit-text-fill-color: #8a8f98 !important;
    opacity: 1 !important;
  }

  .form-input:focus,
  .form-select:focus,
  .limit-input:focus {
    border-color: #7aa46f;
    box-shadow: 0 0 0 3px rgba(122, 164, 111, 0.12);
  }

  .input-error {
    border-color: #d84343 !important;
    background: #fff7f7 !important;
    color: #b71c1c !important;
    box-shadow: 0 0 0 3px rgba(216, 67, 67, 0.1);
  }

  .label-error {
    color: #d84343 !important;
  }

  .required-star {
    color: #d84343;
    margin-left: 2px;
  }

  .field-error-text {
    margin-top: 6px;
    font-size: 18px;
    font-weight: 700;
    color: #d84343;
  }

  .create-btn,
  .btn-save,
  .btn-confirm,
  .locate-btn,
  .locate-btn-inline {
    border: none;
    cursor: pointer;
    border-radius: 12px;
    font-weight: 800;
    font-size: 18px;
  }

  .create-btn {
    background: #1f4d0f;
    color: #fff;
    padding: 10px 16px;
    box-shadow: 0 4px 12px rgba(31, 77, 15, 0.24);
  }

  .locate-btn {
    position: absolute;
    left: 12px;
    bottom: 12px;
    background: #fff;
    color: #26491c;
    padding: 8px 12px;
    box-shadow: 0 4px 12px rgba(44, 78, 31, 0.18);
    z-index: 1000;
  }

  .locate-btn-inline {
    background: #fff;
    color: #26491c;
    padding: 8px 12px;
    box-shadow: 0 4px 12px rgba(44, 78, 31, 0.08);
    border: 1px solid #d7e4d0;
  }

  .btn-save {
    background: #1f4d0f;
    color: #fff;
    padding: 10px 18px;
  }

  .btn-confirm {
    background: #c62828;
    color: #fff;
    padding: 10px 18px;
  }

  .btn-cancel,
  .btn-sm {
    border: 1px solid #d7e4d0;
    background: #fff;
    color: #4a5f43;
    cursor: pointer;
    border-radius: 14px;
    font-size: 18px;
    font-weight: 800;
    line-height: 1.15;
    padding: 7px 13px;
    font-family: inherit;
  }

  .btn-sm.btn-edit {
    color: #2e7d32;
    border-color: #b8d7b2;
    background: #f8fff7;
  }

  .btn-sm.btn-del {
    color: #c62828;
    border-color: #efc8c8;
    background: #fff8f8;
  }

  .map-wrapper {
    position: relative;
    width: 100%;
    min-height: 320px;
  }

  #currentMapHost,
  #createMapHost,
  #editMapHost {
    width: 100%;
    min-height: 320px;
    border-radius: 18px;
    overflow: hidden;
    position: relative;
    background: #dfeecf;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }

  .leaflet-box {
    width: 100%;
    height: 320px !important;
    min-height: 320px !important;
    display: block !important;
    border-radius: 18px;
    overflow: hidden;
    background: #dfeecf;
  }

  .map-loading {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64715d;
    font-size: 18px;
  }

  .node-card {
    margin-bottom: 12px;
    background: #fff;
    border: 1px solid #dce9d7;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 5px 16px rgba(51, 87, 37, 0.06);
    min-width: 0;
  }

  .node-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 8px 12px;
    background: linear-gradient(90deg, #1a430d, #2c6617);
    color: #fff;
  }

  .node-header-btn {
    width: 100%;
    border: none;
    text-align: left;
    cursor: pointer;
    padding: 8px 12px;
  }

  .node-header-left {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
    flex: 1 1 auto;
    overflow: visible;
  }

  .node-summary-line {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
    overflow: visible;
  }

  .node-summary-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    flex-shrink: 0;
  }

  .node-summary-item-compact {
    flex: 0 1 auto;
    min-width: 0;
    overflow: visible;
  }

  .node-summary-ellipsis {
    display: inline-block;
    max-width: none;
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
    vertical-align: bottom;
  }

  .node-summary-label {
    font-size: 13px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.82);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .node-summary-value,
  .coord-read,
  .alert-text,
  .card-title {
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .node-summary-value {
    font-size: 18px;
    font-weight: 800;
    color: #ffffff;
    white-space: normal;
    min-width: 0;
  }

  .node-summary-sep {
    font-size: 16px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.45);
  }

  .node-type-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 13px;
    font-weight: 800;
    color: #fff;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .node-type-badge-inline.type-air {
    background: rgba(25, 118, 210, 0.28);
  }

  .node-type-badge-inline.type-soil {
    background: rgba(109, 76, 65, 0.35);
  }

  .node-status-pill-inline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 24px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    color: #fff;
  }

  .node-status-pill-inline.status-on {
    background: rgba(76, 175, 80, 0.92);
  }

  .node-status-pill-inline.status-off {
    background: rgba(211, 47, 47, 0.92);
  }

  .accordion-arrow {
    font-size: 18px;
    font-weight: 800;
    line-height: 1;
    color: #fff;
    transition: transform 0.2s ease;
  }

  .accordion-arrow.open {
    transform: rotate(180deg);
  }

  .node-body {
    padding: 14px 16px;
    background: #fff;
  }

  .node-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 22px;
    flex-wrap: wrap;
  }

  .node-sensor-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .node-sensor-table th {
    text-align: left;
    background: #eef5ea;
    color: #667a60;
    font-size: 15px !important;
    font-weight: 800 !important;
    line-height: 1.4 !important;
    padding: 16px 30px !important;
    white-space: nowrap;
    font-family: inherit !important;
  }

  .node-sensor-table td {
    border-top: 1px solid #edf3ea;
    font-size: 16px !important;
    line-height: 1.4 !important;
    padding: 21px 30px !important;
    vertical-align: middle;
    white-space: nowrap;
    font-family: inherit !important;
  }

  .node-sensor-table th:nth-child(1),
  .node-sensor-table td:nth-child(1) {
    width: 34%;
    text-align: left;
    padding-left: 34px !important;
    padding-right: 16px !important;
  }

  .node-sensor-table th:nth-child(2) {
    width: 22%;
    text-align: center;
    padding-left: 0 !important;
    padding-right: 56px !important;
  }

  .node-sensor-table td:nth-child(2) {
    width: 22%;
    text-align: center;
    padding-left: 0 !important;
    padding-right: 28px !important;
  }

  .node-sensor-table th:nth-child(3),
  .node-sensor-table td:nth-child(3) {
    width: 22%;
    text-align: center;
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  .node-sensor-table th:nth-child(4),
  .node-sensor-table td:nth-child(4) {
    width: 22%;
    text-align: right;
    padding-left: 12px !important;
    padding-right: 36px !important;
  }

  .node-sensor-table .sensor-name-cell {
    font-size: 15px !important;
    font-weight: 600 !important;
    line-height: 1.4 !important;
    white-space: nowrap;
    font-family: inherit !important;
    text-align: left;
  }

  .node-sensor-table .sensor-value-cell {
    font-size: 15px !important;
    font-weight: 700 !important;
    line-height: 1.4 !important;
    white-space: nowrap;
    font-family: inherit !important;
    text-align: center;
  }

  .node-sensor-table .data-value-cell {
    text-align: center !important;
  }

  .node-sensor-table .data-value-text {
    display: inline-block;
    transform: translateX(-28px);
  }

  .node-sensor-table .sensor-unit-text {
    font-size: 14px !important;
    line-height: 1.3 !important;
    white-space: nowrap;
    font-family: inherit !important;
  }

  .uid-lookup-message {
    margin-top: 8px;
    font-size: 14px;
    line-height: 1.4;
    font-weight: 700;
  }

  .uid-lookup-message.is-success {
    color: #2e7d32;
  }

  .uid-lookup-message.is-error {
    color: #d84343;
  }

    .sensor-section-title {
    margin: 0 0 12px;
    font-size: 20px;
    font-weight: 800;
    color: #355e2d;
  }

  .edit-limit-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: nowrap;
    white-space: nowrap;
    width: 100%;
  }

  .sensor-limit-cell {
    gap: 8px;
    width: 100%;
  }

  .max-col-cell {
    text-align: center !important;
  }

  .max-col-cell .edit-limit-wrap {
    transform: none;
  }

  .min-col-cell {
    text-align: right !important;
  }

  .max-limit-cell {
    justify-content: center;
  }

  .min-limit-cell {
    justify-content: flex-end;
  }

  .sensor-limit-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    cursor: pointer;
  }

  .sensor-limit-toggle input {
    width: 18px;
    height: 18px;
    accent-color: #2e7d32;
    cursor: pointer;
    flex: 0 0 auto;
  }

  .limit-readonly-text {
    font-size: 15px !important;
    font-weight: 700 !important;
    line-height: 1.4 !important;
    color: #203019;
    white-space: nowrap;
    font-family: inherit !important;
  }

  .limit-input {
    width: 108px;
    height: 46px;
    border-radius: 12px;
    border: 1px solid #cfe0c8;
    background: #fbfef9;
    color: #33422d;
    padding: 0 12px;
    outline: none;
    font-size: 18px !important;
    line-height: 1.35 !important;
    font-family: inherit !important;
  }

  .limit-input:disabled {
    background: #eef2ec;
    color: #9aa79a;
    cursor: not-allowed;
  }

  .confirm-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(18, 28, 14, 0.34);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
  }

  .confirm-dialog {
    width: min(470px, calc(100vw - 28px));
    background: #f7f8f2;
    border-radius: 24px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.16);
    padding: 22px 22px 16px;
    text-align: center;
  }

  .confirm-icon {
    width: 82px;
    height: 82px;
    border-radius: 999px;
    margin: 0 auto 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5e4b8;
    color: #f39b2f;
    font-size: 36px;
    line-height: 1;
  }

  .confirm-title {
    font-size: 22px;
    line-height: 1.3;
    font-weight: 800;
    color: #2f4724;
    margin-bottom: 10px;
  }

  .confirm-sub {
    font-size: 18px;
    line-height: 1.75;
    color: #5d6e54;
    white-space: pre-line;
    margin: 0 auto 18px;
    max-width: 370px;
  }

  .confirm-actions {
    display: flex;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .confirm-btn {
    min-width: 154px;
    min-height: 52px;
    border-radius: 16px;
    border: 1px solid transparent;
    font-size: 16px;
    font-weight: 800;
    padding: 0 18px;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  }

  .confirm-btn:hover {
    transform: translateY(-1px);
  }

  .confirm-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .confirm-btn.secondary {
    background: #f7f8f2;
    color: #355126;
    border-color: #cfd8c5;
  }

  .confirm-btn.primary,
  .confirm-btn.confirm-delete,
  .confirm-btn.confirm-save,
  .confirm-btn.confirm-warn {
    color: #fff;
    border-color: transparent;
  }

  .confirm-btn.confirm-delete {
    background: linear-gradient(180deg, #e53935 0%, #c62828 100%);
    box-shadow: 0 10px 22px rgba(198, 40, 40, 0.22);
  }

  .confirm-btn.confirm-save {
    background: linear-gradient(180deg, #2e7d32 0%, #1f6b24 100%);
    box-shadow: 0 10px 22px rgba(31, 107, 36, 0.22);
  }

  .confirm-btn.confirm-warn,
  .confirm-btn.primary {
    background: linear-gradient(180deg, #eb4a3c, #cf2f24);
    box-shadow: 0 10px 22px rgba(207, 47, 36, 0.22);
  }

  @media (max-width: 640px) {
    .confirm-dialog {
      width: min(420px, calc(100vw - 24px));
      border-radius: 22px;
      padding: 20px 18px 14px;
    }

    .confirm-icon {
      width: 74px;
      height: 74px;
      font-size: 32px;
      margin-bottom: 12px;
    }

    .confirm-title {
      font-size: 20px;
    }

    .confirm-sub {
      font-size: 18px;
      max-width: 320px;
    }

    .confirm-btn {
      min-width: 138px;
      min-height: 48px;
      font-size: 18px;
      border-radius: 14px;
    }
  }

  `}</style>
      </div>
    </DuwimsStaticPage>
  );
}
