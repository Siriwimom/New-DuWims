"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
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

  return {
    _id: safeText(sensor._id || ""),
    uid,
    name: sensorKey,
    rawName,
    sensorKey,
    status: safeText(sensor.status || "NO_DATA"),
    minValue: toNum(sensor.minValue),
    maxValue: toNum(sensor.maxValue),
    latestValue: toNum(sensor.latestValue),
    latestTimestamp: safeText(sensor.latestTimestamp || ""),
  };
}

function normalizeNode(node = {}) {
  return {
    _id: safeText(node._id || ""),
    uid: safeText(node.uid || node._id || ""),
    nodeName: safeText(node.nodeName || ""),
    status: safeText(node.status || "ACTIVE"),
    lat: toNum(node.lat),
    lng: toNum(node.lng),
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

function inferNodeTypeFromUid(uid = "") {
  const value = String(uid || "")
    .trim()
    .toLowerCase();
  if (value.includes("soil")) return "soil";
  return "air";
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
  n: { th: "N", en: "N" },
  p: { th: "P", en: "P" },
  k: { th: "K", en: "K" },
  water_availability: { th: "ความพร้อมใช้น้ำ", en: "Water Availability" },
};

function canonicalizeSensorName(name = "", uid = "") {
  const v = `${name} ${uid}`.trim().toLowerCase();

  if (v.includes("temp_rh") || v.includes("temperature") || v.includes("temp") || v.includes("อุณหภูมิ")) {
    return "temperature";
  }

  if (v.includes("relative humidity") || v.includes("humidity") || v === "rh" || v.includes("ความชื้นสัมพัทธ์")) {
    return "humidity";
  }

  if (v.includes("wind_speed") || v.includes("wind speed") || v.includes("wind") || v.includes("ความเร็วลม") || v.includes("วัดความเร็วลม")) {
    return "wind_speed";
  }

  if (v.includes("light intensity") || v.includes("light") || v.includes("lux") || v.includes("ความเข้มแสง") || v.includes("แสง")) {
    return "light";
  }

  if (v.includes("rainfall") || v.includes("rain") || v.includes("ปริมาณน้ำฝน") || v.includes("ฝน")) {
    return "rainfall";
  }

  if (v.includes("soil_moisture") || v.includes("soil moisture") || v.includes("ความชื้นในดิน") || v.includes("ความชื้นดิน") || v == "moisture") {
    return "soil_moisture";
  }

  if (v == "n") return "n";
  if (v == "p") return "p";
  if (v == "k") return "k";

  if (v.includes("water availability") || v.includes("water_level") || v.includes("water level") || v.includes("irrigation") || v.includes("ความพร้อมใช้น้ำ") || v.includes("ให้น้ำ")) {
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
        minValue: 50,
        maxValue: 90,
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
      minValue: 1,
      maxValue: 6,
      latestValue: 3,
      status: "OK",
    },
    {
      name: "light",
      rawName: "light",
      sensorKey: "light",
      uid: "air-light",
      minValue: 15000,
      maxValue: 70000,
      latestValue: 50000,
      status: "OK",
    },
    {
      name: "rainfall",
      rawName: "rainfall",
      sensorKey: "rainfall",
      uid: "air-rain",
      minValue: 3,
      maxValue: 10,
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
  if (key === "water_availability") return "%";
  return "";
}

function formatSensorValue(value, name, uid = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value)))
    return "—";
  return `${value} ${sensorUnit(name, uid)}`.trim();
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

function SensorTable({ sensors, t, lang }) {
  return (
    <table className="node-sensor-table">
      <thead>
        <tr>
          <th>{t.sensorTableSensor || "sensor"}</th>
          <th>{t.sensorTableData || (lang === "en" ? "Data" : "ข้อมูล")}</th>
          <th>{t.sensorTableMax || "Max"}</th>
          <th>{t.sensorTableMin || "Min"}</th>
        </tr>
      </thead>
      <tbody>
        {sensors.map((sensor) => {
          const latest = sensor.latestValue;
          const min = sensor.minValue;
          const max = sensor.maxValue;
          const bad =
            Number.isFinite(latest) &&
            ((Number.isFinite(min) && latest < min) ||
              (Number.isFinite(max) && latest > max));

          return (
            <tr key={sensor._id || sensor.uid || sensor.name}>
              <td>{getSensorLabel(sensor.sensorKey || sensor.name, lang, sensor.uid)}</td>
              <td className={bad ? "val-red" : "val-green"}>
                {formatSensorValue(latest, sensor.sensorKey || sensor.name, sensor.uid)}
              </td>
              <td>{formatSensorValue(max, sensor.sensorKey || sensor.name, sensor.uid)}</td>
              <td>{formatSensorValue(min, sensor.sensorKey || sensor.name, sensor.uid)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EditableSensorTable({
  sensors,
  canEditLimits,
  onChangeMin,
  onChangeMax,
  t,
  lang,
}) {
  return (
    <table className="node-sensor-table">
      <thead>
        <tr>
          <th>{t.sensorTableSensor || "sensor"}</th>
          <th>{t.sensorTableData || (lang === "en" ? "Data" : "ข้อมูล")}</th>
          <th>{t.sensorTableMax || "Max"}</th>
          <th>{t.sensorTableMin || "Min"}</th>
        </tr>
      </thead>
      <tbody>
        {sensors.map((sensor, index) => {
          const latest = sensor.latestValue;
          const min = sensor.minValue;
          const max = sensor.maxValue;
          const bad =
            Number.isFinite(latest) &&
            ((Number.isFinite(min) && latest < min) ||
              (Number.isFinite(max) && latest > max));

          return (
            <tr key={sensor._id || sensor.uid || index}>
              <td>{getSensorLabel(sensor.sensorKey || sensor.name, lang, sensor.uid)}</td>
              <td className={bad ? "val-red" : "val-green"}>
                {formatSensorValue(latest, sensor.sensorKey || sensor.name, sensor.uid)}
              </td>
              <td>
                {canEditLimits ? (
                  <div className="edit-limit-wrap">
                    <input
                      className="limit-input"
                      type="number"
                      step="any"
                      value={sensor.maxValue ?? ""}
                      onChange={(e) => onChangeMax(index, e.target.value)}
                    />
                    <span>{sensorUnit(sensor.sensorKey || sensor.name, sensor.uid)}</span>
                  </div>
                ) : (
                  formatSensorValue(max, sensor.sensorKey || sensor.name, sensor.uid)
                )}
              </td>
              <td>
                {canEditLimits ? (
                  <div className="edit-limit-wrap">
                    <input
                      className="limit-input"
                      type="number"
                      step="any"
                      value={sensor.minValue ?? ""}
                      onChange={(e) => onChangeMin(index, e.target.value)}
                    />
                    <span>{sensorUnit(sensor.sensorKey || sensor.name, sensor.uid)}</span>
                  </div>
                ) : (
                  formatSensorValue(min, sensor.sensorKey || sensor.name, sensor.uid)
                )}
              </td>
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

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
  const [formStatus, setFormStatus] = useState("ACTIVE");
  const [formMarker, setFormMarker] = useState(null);
  const [formSensors, setFormSensors] = useState(sensorPresetsByType("air"));
  const [canEditSensorLimit, setCanEditSensorLimit] = useState(false);
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
    onConfirm: null,
  });

  useEffect(() => {
    loadAll();
  }, []);

  const allNodes = useMemo(() => {
    return plots.flatMap((plot) =>
      plot.nodes.map((node) => ({
        ...node,
        plotId: plot.id,
        plotName: plot.plotName,
        nodeType: inferNodeTypeFromUid(node.uid),
      })),
    );
  }, [plots]);

  const filteredPlotsForMap = useMemo(() => {
    if (selectedMapPlotId === "all") return plots;
    return plots.filter((p) => String(p.id) === String(selectedMapPlotId));
  }, [plots, selectedMapPlotId]);

  const filteredNodes = useMemo(() => {
    return allNodes.filter((node) => {
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
    () => plots.find((p) => String(p.id) === String(editPlotId)) || null,
    [plots, editPlotId],
  );

  const detectedFormNodeType = useMemo(
    () => (matchedNode ? inferNodeTypeFromUid(matchedNode.uid) : ""),
    [matchedNode],
  );

  const isUidMatched = !!matchedNode;
  const shouldShowNodeDetails = !!formUid.trim() && isUidMatched;
  const uidInvalid = (submitAttempted || uidTouched) && !formUid.trim();
  const nodeNameInvalid =
    (submitAttempted || nodeNameTouched) && !formNodeName.trim();

  useEffect(() => {
    const cleanUid = String(formUid || "")
      .trim()
      .toLowerCase();

    if (!cleanUid) {
      setMatchedNode(null);
      setUidLookupBusy(false);
      setUidLookupMessage("");
      setFormSensors([]);
      return;
    }

    setUidLookupBusy(true);

    const found = allNodes.find(
      (node) =>
        String(node.uid || "")
          .trim()
          .toLowerCase() === cleanUid,
    );

    if (!found) {
      setMatchedNode(null);
      setFormSensors([]);
      setUidLookupMessage(
        t.uidNotFoundInDb ||
          (lang === "en"
            ? "UID not found in database"
            : "ไม่พบ UID นี้ในฐานข้อมูล"),
      );
      setUidLookupBusy(false);
      return;
    }

    setMatchedNode(found);
    setFormSensors(
      Array.isArray(found.sensors) ? found.sensors.map((s) => ({ ...s, sensorKey: s.sensorKey || canonicalizeSensorName(s.name, s.uid), name: s.sensorKey || canonicalizeSensorName(s.name, s.uid), rawName: s.rawName || s.name })) : [],
    );
    setUidLookupMessage(
      t.uidFoundInDb ||
        (lang === "en" ? "UID found in database" : "พบ UID ในฐานข้อมูล"),
    );
    setUidLookupBusy(false);
  }, [formUid, allNodes]);

  async function loadAll() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiFetch("/api/plots");
      const items = Array.isArray(res?.items)
        ? res.items.map(normalizePlot)
        : Array.isArray(res)
          ? res.map(normalizePlot)
          : [];

      setPlots(items);

      const firstNode = items.flatMap((plot) => plot.nodes).find(Boolean);
      if (firstNode?._id && !openNodeId) {
        setOpenNodeId(firstNode._id);
      }
    } catch (e) {
      setError(
        e?.message ||
          t.loadNodeFailed ||
          (lang === "en"
            ? "Failed to load node data"
            : "โหลดข้อมูล node ไม่สำเร็จ"),
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
    setFormStatus("ACTIVE");
    setFormMarker(null);
    setFormSensors([]);
    setCanEditSensorLimit(false);
    setMatchedNode(null);
    setUidLookupBusy(false);
    setUidLookupMessage("");
    resetValidation();
  }

  function openCreate() {
    resetForm();
    setView("create");
    setError("");
    setSuccess("");
  }

  function openEdit(node) {
    setEditNodeId(node._id);
    setEditPlotId(node.plotId);
    setFormPlotId(node.plotId);
    setFormUid(node.uid || "");
    setFormNodeName(node.nodeName || "");
    setFormStatus(node.status || "ACTIVE");
    setFormMarker(
      Number.isFinite(node.lat) && Number.isFinite(node.lng)
        ? [node.lat, node.lng]
        : null,
    );
    setFormSensors(
      Array.isArray(node.sensors) && node.sensors.length
        ? node.sensors.map((s) => ({ ...s, sensorKey: s.sensorKey || canonicalizeSensorName(s.name, s.uid), name: s.sensorKey || canonicalizeSensorName(s.name, s.uid), rawName: s.rawName || s.name }))
        : sensorPresetsByType(inferNodeTypeFromUid(node.uid)),
    );
    setCanEditSensorLimit(false);
    resetValidation();
    setView("edit");
    setError("");
    setSuccess("");
  }

  function cancelForm() {
    setView("view");
    setEditNodeId("");
    setEditPlotId("");
    resetForm();
    setError("");
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
        minValue: sensor.minValue,
        maxValue: sensor.maxValue,
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

  function openConfirm({ type = "delete", title, sub, icon, onConfirm }) {
    setConfirmState({
      open: true,
      type,
      title,
      sub,
      icon,
      onConfirm,
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
      onConfirm: null,
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
      onConfirm: null,
    });
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
            status: formStatus,
            lat: formMarker[0],
            lng: formMarker[1],
            sensors: buildSensorPayload(),
          };

          if (view === "create") {
            await apiFetch(`/api/plots/${formPlotId}/nodes`, {
              method: "POST",
              body: payload,
            });
            setSuccess(
              t.saveNodeSuccess ||
                (lang === "en"
                  ? "Node saved successfully"
                  : "บันทึก Node สำเร็จ"),
            );
          } else if (view === "edit") {
            await apiFetch(`/api/plots/${editPlotId}/nodes/${editNodeId}`, {
              method: "PATCH",
              body: payload,
            });
            setSuccess(
              t.editNodeSuccess ||
                (lang === "en"
                  ? "Node updated successfully"
                  : "แก้ไข Node สำเร็จ"),
            );
          }

          await loadAll();
          cancelForm();
        } catch (e) {
          setError(
            e?.message ||
              t.saveNodeFailed ||
              (lang === "en" ? "Failed to save node" : "บันทึก Node ไม่สำเร็จ"),
          );
        } finally {
          setBusy(false);
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
      sub: "ต้องการลบข้อมูล Node นี้ออกจากระบบ?\nการดำเนินการนี้ไม่สามารถกู้คืนได้",
      onConfirm: async () => {
        setBusy(true);
        setError("");
        setSuccess("");

        try {
          await apiFetch(`/api/plots/${node.plotId}/nodes/${node._id}`, {
            method: "DELETE",
          });
          setSuccess(
            t.deleteNodeSuccess ||
              (lang === "en" ? "Node deleted successfully" : "ลบ Node สำเร็จ"),
          );
          if (String(openNodeId) === String(node._id)) {
            setOpenNodeId("");
          }
          await loadAll();
        } catch (e) {
          setError(
            e?.message ||
              t.deleteNodeFailed ||
              (lang === "en" ? "Failed to delete node" : "ลบ Node ไม่สำเร็จ"),
          );
        } finally {
          setBusy(false);
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

                        <span className="node-summary-item">
                          <span className="node-summary-label">
                            {(t.plot || (lang === "en" ? "Plot" : "แปลง")) +
                              " :"}
                          </span>
                          <span className="node-summary-value">
                            {node.plotName || "-"}
                          </span>
                        </span>

                        <span className="node-summary-sep">|</span>

                        <span className="node-summary-item">
                          <span className="node-summary-label">
                            {(t.node || "Node").toLowerCase()} :
                          </span>
                          <span className="node-summary-value">
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
                      <SensorTable sensors={node.sensors} t={t} lang={lang} />

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
                {t.back || (lang === "en" ? "← Back" : "← กลับ")}
              </button>
              <div
                style={{ fontSize: 15, fontWeight: 700, color: "var(--soil)" }}
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
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
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
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        color: isUidMatched ? "#2e7d32" : "#d84343",
                      }}
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
                    fontSize: 12,
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

              <div className="filter-field">
                <div className="filter-field-label">
                  {t.statusLabel || "Status"}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    fontSize: 12,
                    color: "var(--text)",
                    fontWeight: 600,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      checked={formStatus === "ACTIVE"}
                      onChange={() => setFormStatus("ACTIVE")}
                    />
                    ON
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      checked={formStatus !== "ACTIVE"}
                      onChange={() => setFormStatus("INACTIVE")}
                    />
                    OFF
                  </label>
                </div>
              </div>

              {shouldShowNodeDetails ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      flexWrap: "wrap",
                      margin: "14px 0 8px",
                    }}
                  >
                    <div className="card-title" style={{ marginBottom: 0 }}>
                      {detectedFormNodeType === "soil"
                        ? lang === "en"
                          ? "Soil Sensors"
                          : "Soil Sensors"
                        : lang === "en"
                          ? "Air Sensors"
                          : "Air Sensors"}
                    </div>
                    <button
                      className="btn-sm btn-edit"
                      type="button"
                      onClick={() => setCanEditSensorLimit((v) => !v)}
                    >
                      {canEditSensorLimit
                        ? lang === "en"
                          ? "Close Max/Min edit"
                          : "ปิดแก้ไข Max/Min"
                        : lang === "en"
                          ? "Edit Max/Min"
                          : "แก้ไข Max/Min"}
                    </button>
                  </div>

                  <EditableSensorTable
                    sensors={formSensors}
                    canEditLimits={canEditSensorLimit}
                    onChangeMin={updateSensorMin}
                    onChangeMax={updateSensorMax}
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
                    fontSize: 12,
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
                  gap: 8,
                  marginTop: 14,
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
                {t.back || (lang === "en" ? "← Back" : "← กลับ")}
              </button>
              <div
                style={{ fontSize: 15, fontWeight: 700, color: "var(--soil)" }}
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
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
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
                <div className="card-title" style={{ marginBottom: 0 }}>
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
                  className="form-select form-disabled-gray"
                  value={formPlotId}
                  disabled
                >
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
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        color: isUidMatched ? "#2e7d32" : "#d84343",
                      }}
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

              <div className="filter-field" style={{ marginTop: 13 }}>
                <div className="filter-field-label">
                  {t.statusLabel || "Status"}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    fontSize: 12,
                    color: "var(--text)",
                    fontWeight: 600,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      checked={formStatus === "ACTIVE"}
                      onChange={() => setFormStatus("ACTIVE")}
                    />
                    ON
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      checked={formStatus !== "ACTIVE"}
                      onChange={() => setFormStatus("INACTIVE")}
                    />
                    OFF
                  </label>
                </div>
              </div>

              {shouldShowNodeDetails ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      flexWrap: "wrap",
                      margin: "14px 0 8px",
                    }}
                  >
                    <div className="card-title" style={{ marginBottom: 0 }}>
                      {detectedFormNodeType === "soil"
                        ? lang === "en"
                          ? "Soil Sensors"
                          : "Soil Sensors"
                        : lang === "en"
                          ? "Air Sensors"
                          : "Air Sensors"}
                    </div>
                  </div>

                  <EditableSensorTable
                    sensors={formSensors}
                    canEditLimits={true}
                    onChangeMin={updateSensorMin}
                    onChangeMax={updateSensorMax}
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
                    fontSize: 12,
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
                  gap: 8,
                  marginTop: 14,
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
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
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
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeConfirm}
                  disabled={busy}
                >
                  {t.cancel || (lang === "en" ? "Cancel" : "ยกเลิก")}
                </button>

                <button
                  type="button"
                  className={`btn-confirm ${
                    confirmState.type === "save"
                      ? "confirm-save"
                      : "confirm-delete"
                  }`}
                  onClick={runConfirm}
                  disabled={busy}
                >
                  {busy
                    ? lang === "en"
                      ? "Processing..."
                      : "กำลังดำเนินการ..."
                    : t.confirm || (lang === "en" ? "Confirm" : "ยืนยัน")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {locateStatus ? (
          <div className="locate-global-status">{locateStatus}</div>
        ) : null}

        <style jsx>{`
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
            font-size: 14px;
            font-weight: 800;
            color: var(--soil);
          }

          .filter-label,
          .filter-field-label {
            font-size: 11px;
            font-weight: 800;
            color: #5a6d54;
            margin-bottom: 6px;
          }

          .filter-field {
            margin-bottom: 12px;
          }

          .form-select,
          .form-input {
            width: 100%;
            height: 40px;
            border-radius: 12px;
            border: 1px solid #cfe0c8;
            background: #fbfef9;
            color: #33422d;
            padding: 0 12px;
            outline: none;
            font-size: 12px;
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
            font-size: 11px;
            font-weight: 700;
            color: #d84343;
          }

          .form-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
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
            font-size: 12px;
          }

          .create-btn {
            background: #1f4d0f;
            color: #fff;
            padding: 10px 14px;
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
            border-radius: 12px;
            font-size: 12px;
            font-weight: 700;
            padding: 10px 16px;
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
            font-size: 13px;
          }

          .node-card {
            margin-bottom: 12px;
            background: #fff;
            border: 1px solid #dce9d7;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 5px 16px rgba(51, 87, 37, 0.06);
          }

          .node-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            background: linear-gradient(90deg, #1a430d, #2c6617);
            color: #fff;
          }

          .node-header-btn {
            width: 100%;
            border: none;
            text-align: left;
            cursor: pointer;
          }

          .node-header-left {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            min-width: 0;
            flex: 1;
          }

          .node-summary-line {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
            row-gap: 6px;
            min-width: 0;
          }

          .node-summary-item {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            min-width: 0;
          }

          .node-summary-label {
            font-size: 11px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.82);
            white-space: nowrap;
          }

          .node-summary-value {
            font-size: 12px;
            font-weight: 800;
            color: #ffffff;
            white-space: nowrap;
          }

          .node-summary-sep {
            font-size: 12px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.45);
          }

          .node-type-badge {
            display: inline-flex;
            align-items: center;
            border-radius: 999px;
            padding: 3px 10px;
            font-size: 10px;
            font-weight: 800;
            color: #fff;
          }

          .node-type-badge-inline {
            padding: 4px 10px;
            font-size: 10px;
            white-space: nowrap;
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
            font-size: 10px;
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
            font-size: 14px;
            font-weight: 800;
            transition: transform 0.2s ease;
          }

          .accordion-arrow.open {
            transform: rotate(180deg);
          }

          .node-body {
            padding: 12px 14px;
            background: #fff;
          }

          .node-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
          }

          .node-sensor-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          .node-sensor-table th {
            text-align: left;
            background: #eef5ea;
            color: #667a60;
            font-size: 10px;
            font-weight: 800;
            padding: 10px 10px;
          }

          .node-sensor-table td {
            border-top: 1px solid #edf3ea;
            padding: 10px 10px;
            vertical-align: middle;
          }

          .val-green {
            color: var(--good);
            font-weight: 800;
          }

          .val-red {
            color: var(--bad);
            font-weight: 800;
          }

          .map-msg {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(21, 101, 192, 0.08);
            color: #1565c0;
            border: 1px solid rgba(21, 101, 192, 0.2);
            font-size: 11px;
            font-weight: 700;
          }

          .coord-read {
            font-size: 12px;
            color: #546e7a;
            font-weight: 600;
          }

          .alert-box {
            border-radius: 16px;
            padding: 12px;
            margin-bottom: 14px;
          }

          .alert-box.error {
            background: linear-gradient(180deg, #fff2f2, #ffe0e0);
            border: 1px solid #ffc7c7;
            color: #7f1d1d;
          }

          .alert-box.success {
            background: linear-gradient(180deg, #eefcf1, #dcfce7);
            border: 1px solid #b7ebc6;
            color: #14532d;
          }

          .alert-title {
            font-weight: 800;
            font-size: 12px;
            margin-bottom: 4px;
          }

          .alert-text {
            font-size: 12px;
            line-height: 1.5;
          }

          .locate-global-status {
            margin-top: 10px;
            font-size: 12px;
            color: #4f5c47;
          }

          .edit-limit-wrap {
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }

          .limit-input {
            width: 84px;
            height: 30px;
            border-radius: 999px;
            border: 1px solid #cfe0c8;
            background: #fbfef9;
            color: #33422d;
            padding: 0 10px;
            outline: none;
            font-size: 12px;
          }

          .confirm-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(18, 28, 14, 0.42);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            backdrop-filter: blur(3px);
          }

          .confirm-box {
            width: min(100%, 420px);
            background: #ffffff;
            border-radius: 22px;
            padding: 22px 20px 18px;
            box-shadow: 0 20px 60px rgba(19, 35, 14, 0.22);
            border: 1px solid #e4eee0;
            text-align: center;
            animation: confirmPop 0.18s ease-out;
          }

          .confirm-icon {
            width: 62px;
            height: 62px;
            margin: 0 auto 12px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            background: linear-gradient(180deg, #fff4f4 0%, #ffe6e6 100%);
            border: 1px solid #ffd3d3;
          }

          .confirm-title {
            font-size: 20px;
            font-weight: 800;
            color: #1f2f1a;
            margin-bottom: 8px;
            line-height: 1.25;
          }

          .confirm-sub {
            font-size: 14px;
            line-height: 1.65;
            color: #60705a;
            margin-bottom: 18px;
          }

          .confirm-actions {
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
          }

          .confirm-actions .btn-cancel {
            min-width: 120px;
            height: 42px;
            border-radius: 12px;
            border: 1px solid #d8e4d2;
            background: #ffffff;
            color: #496141;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
          }

          .confirm-actions .btn-confirm {
            min-width: 120px;
            height: 42px;
            border: none;
            border-radius: 12px;
            color: #fff;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
          }

          .confirm-actions .btn-confirm.confirm-delete {
            background: linear-gradient(180deg, #e53935 0%, #c62828 100%);
          }

          .confirm-actions .btn-confirm.confirm-save {
            background: linear-gradient(180deg, #2e7d32 0%, #1f6b24 100%);
          }

          .confirm-actions button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          @keyframes confirmPop {
            from {
              transform: translateY(8px) scale(0.98);
              opacity: 0;
            }
            to {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
          }

          :global(.leaflet-container) {
            width: 100% !important;
            height: 100% !important;
            min-height: 320px !important;
            z-index: 1;
          }

          @media (max-width: 900px) {
            .form-grid-2 {
              grid-template-columns: 1fr;
            }

            .node-summary-line {
              gap: 6px;
            }

            .node-summary-sep {
              display: none;
              /* ===== FIX RESPONSIVE เพิ่ม ===== */

.page-content,
.card,
.node-card {
  min-width: 0;
}

/* ป้องกัน text ล้น */
.card-title,
.alert-text,
.coord-read,
.node-summary-value {
  word-break: break-word;
  overflow-wrap: break-word;
}

/* ===== NODE FLEX FIX ===== */
.node-header-left {
  min-width: 0;
}

.node-summary-item {
  max-width: 100%;
}

/* ===== ACTION BUTTON ===== */
.node-actions {
  flex-wrap: wrap;
}

/* ===== TABLE SCROLL ===== */
.node-sensor-table {
  display: block;
  overflow-x: auto;
  width: 100%;
}

/* ===== MAP RESPONSIVE ===== */
@media (max-width: 768px) {
  .map-wrapper {
    min-height: 260px;
  }

  #currentMapHost,
  #createMapHost,
  #editMapHost {
    min-height: 260px;
  }

  .leaflet-box {
    height: 260px !important;
    min-height: 260px !important;
  }
}

/* ===== MOBILE ===== */
@media (max-width: 640px) {

  .page-content {
    padding: 12px;
  }

  .create-btn {
    width: 100%;
    text-align: center;
  }

  .node-actions {
    flex-direction: column;
  }

  .node-actions .btn-sm {
    width: 100%;
  }

  .node-summary-item {
    width: 100%;
  }

  .node-summary-sep {
    display: none;
  }

  .coord-read {
    width: 100%;
  }
}

/* ===== SMALL MOBILE ===== */
@media (max-width: 480px) {

  .map-wrapper {
    min-height: 220px;
  }

  #currentMapHost,
  #createMapHost,
  #editMapHost {
    min-height: 220px;
  }

  .leaflet-box {
    height: 220px !important;
    min-height: 220px !important;
  }

  .node-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .node-header-btn {
    padding: 12px;
  }
}
            }
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}
