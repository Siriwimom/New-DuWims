"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import DuwimsStaticPage from "../components/DuwimsStaticPage";

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
  return {
    _id: safeText(sensor._id || ""),
    uid: safeText(sensor.uid || sensor._id || ""),
    name: safeText(sensor.name || sensor.uid || "Sensor"),
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
    status: safeText(node.status || "INACTIVE"),
    lat: toNum(node.lat),
    lng: toNum(node.lng),
    sensors: Array.isArray(node.sensors) ? node.sensors.map(normalizeSensor) : [],
  };
}

function normalizePlot(plot = {}) {
  const polygon =
    plot?.polygon?.coords ||
    plot?.polygon ||
    plot?.coords ||
    [];

  const nodes =
    plot?.nodes ||
    plot?.node_air ||
    plot?.node_soil ||
    [];

  return {
    id: safeText(plot.id || plot._id || ""),
    plotName: safeText(plot.plotName || plot.name || plot.alias || "ไม่ระบุชื่อแปลง"),
    polygon: normalizeCoords(polygon),
    caretaker: safeText(plot.caretaker || plot.ownerName || ""),
    nodes: Array.isArray(nodes) ? nodes.map(normalizeNode) : [],
  };
}

function inferNodeTypeFromUid(uid = "") {
  const value = String(uid || "").trim().toLowerCase();
  if (value.includes("soil")) return "soil";
  return "air";
}

function nodeTypeLabel(type) {
  return type === "soil" ? "Soil Node" : "Air Node";
}

function sensorPresetsByType(type) {
  if (type === "soil") {
    return [
      {
        name: "ความชื้นในดิน",
        uid: "soil-moisture",
        minValue: 65,
        maxValue: 80,
        latestValue: 70,
        status: "OK",
      },
      {
        name: "N",
        uid: "soil-n",
        minValue: 0.1,
        maxValue: 1.0,
        latestValue: 0.5,
        status: "OK",
      },
      {
        name: "P",
        uid: "soil-p",
        minValue: 25,
        maxValue: 45,
        latestValue: 35,
        status: "OK",
      },
      {
        name: "K",
        uid: "soil-k",
        minValue: 0.8,
        maxValue: 1.4,
        latestValue: 1.1,
        status: "OK",
      },
      {
        name: "ความพร้อมใช้น้ำ",
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
      name: "อุณหภูมิ",
      uid: "air-temp",
      minValue: 20,
      maxValue: 35,
      latestValue: 25,
      status: "OK",
    },
    {
      name: "ความชื้นสัมพัทธ์",
      uid: "air-humidity",
      minValue: 75,
      maxValue: 85,
      latestValue: 76,
      status: "OK",
    },
    {
      name: "วัดความเร็วลม",
      uid: "air-wind",
      minValue: 1,
      maxValue: 6,
      latestValue: 3,
      status: "OK",
    },
    {
      name: "ความเข้มแสง",
      uid: "air-light",
      minValue: 15000,
      maxValue: 70000,
      latestValue: 50000,
      status: "OK",
    },
    {
      name: "ปริมาณน้ำฝน",
      uid: "air-rain",
      minValue: 3,
      maxValue: 10,
      latestValue: 5,
      status: "OK",
    },
  ];
}

function sensorUnit(name = "") {
  const v = String(name).toLowerCase();
  if (v.includes("อุณหภูมิ")) return "°C";
  if (v.includes("ความชื้น")) return "%";
  if (v === "n") return "%";
  if (v === "p") return "ppm";
  if (v === "k") return "cmol/kg";
  if (v.includes("ลม")) return "km/hr";
  if (v.includes("แสง")) return "lux";
  if (v.includes("ฝน")) return "mm";
  if (v.includes("น้ำ")) return "%";
  return "";
}

function formatSensorValue(value, name) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${value} ${sensorUnit(name)}`.trim();
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

      if (alive) setBundle({ RL, L });
    })();

    return () => {
      alive = false;
    };
  }, []);

  return bundle;
}

function FitBounds({ RL, polygons, nodes, fallbackCenter = [13.112, 100.926] }) {
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

function CurrentLocationLayer({ RL, locateTick, onStatus }) {
  const map = RL.useMap();
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!locateTick) return;
    if (!navigator.geolocation) {
      onStatus("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง");
      return;
    }

    onStatus("กำลังค้นหาตำแหน่ง...");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        const accuracy = p.coords.accuracy || 0;
        setPos({ lat, lng, accuracy });
        map.setView([lat, lng], Math.max(map.getZoom() || 16, 18), {
          animate: true,
        });
        onStatus("พบตำแหน่งแล้ว");
      },
      (err) => onStatus(`ไม่สามารถหาตำแหน่งได้: ${err?.message || ""}`),
      { enableHighAccuracy: true, timeout: 10000 }
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

function ClickMarkerPicker({ RL, enabled, markerPosition, onPick }) {
  const map = RL.useMap();

  useEffect(() => {
    if (!map || !enabled) return;

    const onClick = (e) => {
      onPick([e.latlng.lat, e.latlng.lng]);
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, enabled, onPick]);

  if (!enabled || !markerPosition) return null;

  return <RL.Marker position={markerPosition} draggable={false} />;
}

function NodeMap({
  leaflet,
  polygons = [],
  nodes = [],
  selectable = false,
  markerPosition = null,
  onPickMarker = null,
  locateTick = 0,
  onLocateStatus = () => {},
  mapKey = "map",
}) {
  if (!leaflet?.RL) {
    return <div className="map-loading">กำลังโหลดแผนที่...</div>;
  }

  const { RL } = leaflet;

  return (
    <RL.MapContainer
      key={mapKey}
      center={[13.112, 100.926]}
      zoom={16}
      style={{ height: "100%", width: "100%" }}
    >
      <RL.TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CurrentLocationLayer RL={RL} locateTick={locateTick} onStatus={onLocateStatus} />

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
        ) : null
      )}

      {nodes.map((node) =>
        Number.isFinite(node.lat) && Number.isFinite(node.lng) ? (
          <RL.Marker key={node._id || node.uid} position={[node.lat, node.lng]}>
            <RL.Popup>
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  {node.uid || node.nodeName || "Node"}
                </div>
                <div>ชื่อ: {node.nodeName || "-"}</div>
                <div>ประเภท: {nodeTypeLabel(inferNodeTypeFromUid(node.uid))}</div>
                <div>สถานะ: {node.status || "-"}</div>
              </div>
            </RL.Popup>
          </RL.Marker>
        ) : null
      )}

      <ClickMarkerPicker
        RL={RL}
        enabled={selectable}
        markerPosition={markerPosition}
        onPick={onPickMarker}
      />

      <FitBounds RL={RL} polygons={polygons.map((p) => p.coords)} nodes={nodes} />
    </RL.MapContainer>
  );
}

function SensorTable({ sensors }) {
  return (
    <table className="node-sensor-table">
      <thead>
        <tr>
          <th>sensor</th>
          <th>ข้อมูล</th>
          <th>Max</th>
          <th>Min</th>
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
              <td>{sensor.name}</td>
              <td className={bad ? "val-red" : "val-green"}>
                {formatSensorValue(latest, sensor.name)}
              </td>
              <td>{formatSensorValue(max, sensor.name)}</td>
              <td>{formatSensorValue(min, sensor.name)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EditableSensorTable({ sensors }) {
  return (
    <table className="node-sensor-table">
      <thead>
        <tr>
          <th>sensor</th>
          <th>ข้อมูล</th>
          <th>Max</th>
          <th>Min</th>
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
              <td>{sensor.name}</td>
              <td className={bad ? "val-red" : "val-green"}>
                {formatSensorValue(latest, sensor.name)}
              </td>
              <td>{formatSensorValue(max, sensor.name)}</td>
              <td>{formatSensorValue(min, sensor.name)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function NodeSensorPage() {
  const leaflet = useLeafletBundle();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [view, setView] = useState("view"); // view | create | edit
  const [plots, setPlots] = useState([]);
  const [selectedMapPlotId, setSelectedMapPlotId] = useState("all");
  const [selectedNodeType, setSelectedNodeType] = useState("all");
  const [locateStatus, setLocateStatus] = useState("");
  const [locateTickCurrent, setLocateTickCurrent] = useState(0);
  const [locateTickCreate, setLocateTickCreate] = useState(0);
  const [locateTickEdit, setLocateTickEdit] = useState(0);

  const [editNodeId, setEditNodeId] = useState("");
  const [editPlotId, setEditPlotId] = useState("");

  const [formPlotId, setFormPlotId] = useState("");
  const [formUid, setFormUid] = useState("");
  const [formNodeName, setFormNodeName] = useState("");
  const [formStatus, setFormStatus] = useState("ACTIVE");
  const [formMarker, setFormMarker] = useState(null);
  const [formSensors, setFormSensors] = useState(sensorPresetsByType("air"));

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
      }))
    );
  }, [plots]);

  const filteredPlotsForMap = useMemo(() => {
    if (selectedMapPlotId === "all") return plots;
    return plots.filter((p) => String(p.id) === String(selectedMapPlotId));
  }, [plots, selectedMapPlotId]);

  const filteredNodes = useMemo(() => {
    return allNodes.filter((node) => {
      const matchPlot =
        selectedMapPlotId === "all" || String(node.plotId) === String(selectedMapPlotId);
      const matchType =
        selectedNodeType === "all" || String(node.nodeType) === String(selectedNodeType);
      return matchPlot && matchType;
    });
  }, [allNodes, selectedMapPlotId, selectedNodeType]);

  const createSelectedPlot = useMemo(
    () => plots.find((p) => String(p.id) === String(formPlotId)) || null,
    [plots, formPlotId]
  );

  const editSelectedPlot = useMemo(
    () => plots.find((p) => String(p.id) === String(editPlotId)) || null,
    [plots, editPlotId]
  );

  const createSelectedPlotNodes = useMemo(() => {
    if (!formPlotId) return [];
    return allNodes.filter((node) => String(node.plotId) === String(formPlotId));
  }, [allNodes, formPlotId]);

  const editSelectedPlotNodes = useMemo(() => {
    if (!editPlotId) return [];
    return allNodes.filter((node) => String(node.plotId) === String(editPlotId));
  }, [allNodes, editPlotId]);

  const detectedFormNodeType = useMemo(
    () => inferNodeTypeFromUid(formUid),
    [formUid]
  );

  useEffect(() => {
    if (view === "create") {
      setFormSensors(sensorPresetsByType(detectedFormNodeType));
    }
  }, [detectedFormNodeType, view]);

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
    } catch (e) {
      setError(e?.message || "โหลดข้อมูล node ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  function resetForm(type = "air") {
    setFormPlotId("");
    setFormUid("");
    setFormNodeName("");
    setFormStatus("ACTIVE");
    setFormMarker(null);
    setFormSensors(sensorPresetsByType(type));
  }

  function openCreate() {
    resetForm("air");
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
        : null
    );
    setFormSensors(
      Array.isArray(node.sensors) && node.sensors.length
        ? node.sensors.map((s) => ({ ...s }))
        : sensorPresetsByType(inferNodeTypeFromUid(node.uid))
    );
    setView("edit");
    setError("");
    setSuccess("");
  }

  function cancelForm() {
    setView("view");
    setEditNodeId("");
    setEditPlotId("");
    resetForm("air");
    setError("");
  }

  function validateForm() {
    if (!formPlotId) {
      setError("กรุณาเลือกแปลง");
      return false;
    }
    if (!formUid.trim()) {
      setError("กรุณากรอก UID");
      return false;
    }
    if (!formNodeName.trim()) {
      setError("กรุณากรอกชื่อ Node");
      return false;
    }
    if (!formMarker || !Number.isFinite(formMarker[0]) || !Number.isFinite(formMarker[1])) {
      setError("กรุณาปักหมุดบนแผนที่");
      return false;
    }
    return true;
  }

  function buildSensorPayload() {
    return formSensors.map((sensor) => ({
      _id: sensor._id || undefined,
      uid: sensor.uid || sensor.name,
      name: sensor.name,
      status: sensor.status || "OK",
      minValue: sensor.minValue,
      maxValue: sensor.maxValue,
      latestValue: sensor.latestValue,
      latestTimestamp: sensor.latestTimestamp || null,
    }));
  }

  async function handleSave() {
    if (!validateForm()) return;

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
        setSuccess("บันทึก Node สำเร็จ");
      } else if (view === "edit") {
        await apiFetch(`/api/plots/${editPlotId}/nodes/${editNodeId}`, {
          method: "PATCH",
          body: payload,
        });
        setSuccess("แก้ไข Node สำเร็จ");
      }

      await loadAll();
      cancelForm();
    } catch (e) {
      setError(e?.message || "บันทึก Node ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(node) {
    const ok = window.confirm("ต้องการลบ Node นี้ใช่หรือไม่?");
    if (!ok) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/api/plots/${node.plotId}/nodes/${node._id}`, {
        method: "DELETE",
      });
      setSuccess("ลบ Node สำเร็จ");
      await loadAll();
    } catch (e) {
      setError(e?.message || "ลบ Node ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
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
            <div className="alert-title">แจ้งเตือน</div>
            <div className="alert-text">{error}</div>
          </div>
        ) : null}

        {success ? (
          <div className="alert-box success">
            <div className="alert-title">สำเร็จ</div>
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
                <div className="card-title">🗺 Current Map</div>
                <button className="create-btn" style={{ marginBottom: 0 }} onClick={openCreate}>
                  ＋ Create Node
                </button>
              </div>

              <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 11 }}>
                <div>
                  <div className="filter-label" style={{ marginBottom: 3 }}>
                    Current Map แปลง
                  </div>
                  <select
                    className="form-select"
                    style={{ width: 185 }}
                    value={selectedMapPlotId}
                    onChange={(e) => setSelectedMapPlotId(e.target.value)}
                  >
                    <option value="all">ทุกแปลง</option>
                    {plots.map((plot) => (
                      <option key={plot.id} value={plot.id}>
                        {plot.plotName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="filter-label" style={{ marginBottom: 3 }}>
                    เลือก Node
                  </div>
                  <select
                    className="form-select"
                    style={{ width: 155 }}
                    value={selectedNodeType}
                    onChange={(e) => setSelectedNodeType(e.target.value)}
                  >
                    <option value="all">ทุก Node</option>
                    <option value="air">Air Node</option>
                    <option value="soil">Soil Node</option>
                  </select>
                </div>
              </div>

              <div className="map-wrapper">
                <div id="currentMapHost">
                  <div className="leaflet-box">
                    {loading ? (
                      <div className="map-loading">กำลังโหลดแผนที่...</div>
                    ) : (
                      <NodeMap
                        leaflet={leaflet}
                        polygons={viewPolygons}
                        nodes={filteredNodes}
                        selectable={false}
                        locateTick={locateTickCurrent}
                        onLocateStatus={setLocateStatus}
                        mapKey={`view-${selectedMapPlotId}-${selectedNodeType}-${filteredNodes.length}`}
                      />
                    )}
                  </div>
                </div>
                <button className="locate-btn" onClick={() => setLocateTickCurrent((v) => v + 1)}>
                  📍 ตำแหน่งฉัน
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 9,
                flexWrap: "wrap",
              }}
            >
              <div className="filter-label" style={{ marginBottom: 0 }}>
                แปลง
              </div>
              <select
                className="form-select"
                style={{ width: 170 }}
                value={selectedMapPlotId}
                onChange={(e) => setSelectedMapPlotId(e.target.value)}
              >
                <option value="all">ทุกแปลง</option>
                {plots.map((plot) => (
                  <option key={plot.id} value={plot.id}>
                    {plot.plotName}
                  </option>
                ))}
              </select>

              <div className="filter-label" style={{ marginBottom: 0, marginLeft: 7 }}>
                ชนิด Node
              </div>
              <select
                className="form-select"
                style={{ width: 145 }}
                value={selectedNodeType}
                onChange={(e) => setSelectedNodeType(e.target.value)}
              >
                <option value="all">ทุก Node</option>
                <option value="air">Air Node</option>
                <option value="soil">Soil Node</option>
              </select>
            </div>

            {filteredNodes.map((node) => (
              <div className="node-card open" key={node._id}>
                <div className="node-header">
                  <div className="node-header-left">
                    <div>
                      <div className="node-uid">{node.uid || "-"}</div>
                      <div className="node-name">Node : {node.nodeName || "-"}</div>
                    </div>
                    <span
                      className="node-type-badge"
                      style={{
                        background:
                          node.nodeType === "soil"
                            ? "rgba(109,76,65,.30)"
                            : "rgba(25,118,210,.28)",
                      }}
                    >
                      {nodeTypeLabel(node.nodeType)}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "#a5d6a7",
                        background: "rgba(76,175,80,.18)",
                        padding: "2px 9px",
                        borderRadius: 20,
                        fontWeight: 600,
                      }}
                    >
                      Status : {node.status || "-"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span className="node-status-on">{node.status || "-"}</span>
                  </div>
                </div>

                <div className="node-body" style={{ display: "block" }}>
                  <SensorTable sensors={node.sensors} />

                  <div className="node-actions">
                    <button className="btn-sm btn-edit" onClick={() => openEdit(node)}>
                      ✏️ แก้ไข
                    </button>
                    <button className="btn-sm btn-del" onClick={() => handleDelete(node)}>
                      🗑 ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {view === "create" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <button
                className="btn-sm btn-edit"
                style={{ padding: "7px 13px" }}
                onClick={cancelForm}
              >
                ← กลับ
              </button>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--soil)" }}>
                ＋ เพิ่ม NODE
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
                  🗺 Current Map{" "}
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    (คลิกแผนที่เพื่อปักหมุด)
                  </span>
                </div>
                <div className="map-msg">{formMarker ? "เลือกตำแหน่งแล้ว" : "ยังไม่ได้ปักหมุด"}</div>
              </div>

              <div id="createMapHost">
                <div className="leaflet-box">
                  <NodeMap
                    leaflet={leaflet}
                    polygons={createPolygons}
                    nodes={createSelectedPlotNodes}
                    selectable={true}
                    markerPosition={formMarker}
                    onPickMarker={setFormMarker}
                    locateTick={locateTickCreate}
                    onLocateStatus={setLocateStatus}
                    mapKey={`create-${formPlotId}-${createSelectedPlotNodes.length}`}
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
                  📍 ตำแหน่งฉัน
                </button>
                <div className="coord-read">
                  lat: {formMarker ? formMarker[0].toFixed(6) : "-"} · lng:{" "}
                  {formMarker ? formMarker[1].toFixed(6) : "-"}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">📡 Create Node</div>

              <div className="filter-field">
                <div className="filter-field-label">แปลง</div>
                <select
                  className="form-select"
                  value={formPlotId}
                  onChange={(e) => {
                    setFormPlotId(e.target.value);
                    setFormMarker(null);
                  }}
                >
                  <option value="">-- เลือกแปลง --</option>
                  {plots.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.plotName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="filter-field" style={{ marginBottom: 0 }}>
                  <div className="filter-field-label">UID</div>
                  <input
                    className="form-input"
                    placeholder="เช่น Air-0000001 หรือ Soil-0000002"
                    value={formUid}
                    onChange={(e) => setFormUid(e.target.value)}
                  />
                </div>

                <div className="filter-field" style={{ marginBottom: 0 }}>
                  <div className="filter-field-label">ชื่อ Node</div>
                  <input
                    className="form-input"
                    placeholder="เช่น กลางไร่"
                    value={formNodeName}
                    onChange={(e) => setFormNodeName(e.target.value)}
                  />
                </div>
              </div>

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
                ตรวจพบชนิด Node : {nodeTypeLabel(detectedFormNodeType)}
              </div>

              <div className="filter-field">
                <div className="filter-field-label">Status</div>
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
                    style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                  >
                    <input
                      type="radio"
                      checked={formStatus === "ACTIVE"}
                      onChange={() => setFormStatus("ACTIVE")}
                    />
                    ON
                  </label>
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
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

              <div>
                <div className="card-title" style={{ margin: "14px 0 8px" }}>
                  {detectedFormNodeType === "soil" ? "Soil Sensors" : "Air Sensors"}
                </div>
                <EditableSensorTable sensors={formSensors} />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                <button className="btn-cancel" onClick={cancelForm}>
                  ยกเลิก
                </button>
                <button className="btn-save" onClick={handleSave} disabled={busy}>
                  บันทึก
                </button>
              </div>
            </div>
          </>
        )}

        {view === "edit" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <button
                className="btn-sm btn-edit"
                style={{ padding: "7px 13px" }}
                onClick={cancelForm}
              >
                ← กลับ
              </button>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--soil)" }}>
                ✏️ แก้ไข NODE
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
                  🗺 Current Map{" "}
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    (คลิกแผนที่เพื่อย้ายหมุด)
                  </span>
                </div>
                <div className="map-msg">{formMarker ? "เลือกตำแหน่งแล้ว" : "ยังไม่ได้เลือกตำแหน่ง"}</div>
              </div>

              <div id="editMapHost">
                <div className="leaflet-box">
                  <NodeMap
                    leaflet={leaflet}
                    polygons={editPolygons}
                    nodes={editSelectedPlotNodes.filter((n) => n._id !== editNodeId)}
                    selectable={true}
                    markerPosition={formMarker}
                    onPickMarker={setFormMarker}
                    locateTick={locateTickEdit}
                    onLocateStatus={setLocateStatus}
                    mapKey={`edit-${editPlotId}-${editNodeId}`}
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
                  📍 ตำแหน่งฉัน
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
                  📡 Edit Node
                </div>
                <span
                  className="node-type-badge"
                  style={{
                    background: detectedFormNodeType === "soil" ? "#6d4c41" : "#1565c0",
                    color: "#fff",
                  }}
                >
                  {nodeTypeLabel(detectedFormNodeType)}
                </span>
              </div>

              <div className="form-grid-2">
                <div className="filter-field" style={{ marginBottom: 0 }}>
                  <div className="filter-field-label">UID</div>
                  <input className="form-input" value={formUid} readOnly />
                </div>

                <div className="filter-field" style={{ marginBottom: 0 }}>
                  <div className="filter-field-label">ชื่อ Node</div>
                  <input
                    className="form-input"
                    value={formNodeName}
                    onChange={(e) => setFormNodeName(e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-field" style={{ marginTop: 13 }}>
                <div className="filter-field-label">Status</div>
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
                    style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                  >
                    <input
                      type="radio"
                      checked={formStatus === "ACTIVE"}
                      onChange={() => setFormStatus("ACTIVE")}
                    />
                    ON
                  </label>
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
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

              <div>
                <div className="card-title" style={{ margin: "14px 0 8px" }}>
                  {detectedFormNodeType === "soil" ? "Soil Sensors" : "Air Sensors"}
                </div>
                <EditableSensorTable sensors={formSensors} />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                <button className="btn-cancel" onClick={cancelForm}>
                  ยกเลิก
                </button>
                <button className="btn-save" onClick={handleSave} disabled={busy}>
                  บันทึก
                </button>
              </div>
            </div>
          </>
        )}

        {locateStatus ? <div className="locate-global-status">{locateStatus}</div> : null}

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

          .node-header-left {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }

          .node-uid {
            font-size: 12px;
            font-weight: 800;
            color: #fff;
          }

          .node-name {
            font-size: 12px;
            font-weight: 700;
            color: #f0f6ec;
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

          .node-status-on {
            background: #4caf50;
            color: #fff;
            padding: 3px 10px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 800;
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

          .node-sensor-table input.form-input {
            height: 30px;
            border-radius: 999px;
            background: #fbfef9;
            font-size: 11px;
            padding: 0 10px;
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
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}