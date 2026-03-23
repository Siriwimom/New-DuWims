"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import DuwimsStaticPage from "../components/DuwimsStaticPage";

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

      await import("leaflet-draw");
      const Draw = await import("react-leaflet-draw");

      if (alive) setBundle({ RL, Draw, L });
    })();

    return () => {
      alive = false;
    };
  }, []);

  return bundle;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");

function getToken() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("AUTH_TOKEN_V1") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("pmtool_token") ||
    localStorage.getItem("duwims_token") ||
    ""
  );
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

function normalizePlot(plot = {}) {
  return {
    ...plot,
    id: String(plot.id || plot._id || ""),
    alias: safeText(plot.alias || ""),
    plotName: safeText(plot.plotName || plot.name || ""),
    name: safeText(plot.name || plot.plotName || ""),
    caretaker: safeText(plot.caretaker || plot.ownerName || ""),
    ownerName: safeText(plot.ownerName || plot.caretaker || ""),
  };
}

function normalizeEmployee(user = {}) {
  const role = safeText(user.role, "").trim().toLowerCase();
  const label = safeText(
    user.nickname ||
      user.fullName ||
      user.name ||
      user.displayName ||
      user.email ||
      "",
    ""
  ).trim();

  if (role !== "employee" || !label) return null;

  return { value: label, label };
}

function PolyLayer({ leaflet, poly }) {
  if (!leaflet?.RL) return null;

  return (
    <leaflet.RL.Polygon
      positions={normalizeCoords(poly?.coords || [])}
      pathOptions={{
        color: poly?.color || "#d92d2a",
        fillColor: poly?.color || "#d92d2a",
        fillOpacity: 0.24,
        weight: 3,
      }}
    />
  );
}

function FitBounds({ leaflet, coords }) {
  const map = leaflet.RL.useMap();

  useEffect(() => {
    const safe = normalizeCoords(coords);
    if (!map || safe.length < 3) return;
    map.fitBounds(safe, { padding: [26, 26] });
  }, [map, coords]);

  return null;
}

function CurrentLocationLayer({ leaflet, locateTick, onStatus }) {
  const map = leaflet.RL.useMap();
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
        map.setView([lat, lng], Math.max(map.getZoom() || 16, 17), {
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
      <leaflet.RL.Circle
        center={[pos.lat, pos.lng]}
        radius={pos.accuracy}
        pathOptions={{
          color: "#e95a94",
          fillColor: "#e95a94",
          fillOpacity: 0.1,
        }}
      />
      <leaflet.RL.CircleMarker
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

export default function Page() {
  const leaflet = useLeafletBundle();
  const featureGroupRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locateStatus, setLocateStatus] = useState("");
  const [locateTick, setLocateTick] = useState(0);

  const [plots, setPlots] = useState([]);
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [polygonsByPlot, setPolygonsByPlot] = useState({});
  const [employeeOptions, setEmployeeOptions] = useState([]);

  const [editMode, setEditMode] = useState(false);
  const [plotAlias, setPlotAlias] = useState("");
  const [plotName, setPlotName] = useState("");
  const [caretaker, setCaretaker] = useState("");

  useEffect(() => setMounted(true), []);

  const selectedPlot = useMemo(
    () => plots.find((p) => String(p.id) === String(selectedPlotId)) || null,
    [plots, selectedPlotId]
  );

  const currentPolygon = (polygonsByPlot[selectedPlotId] || [])[0] || null;
  const plotPolygons = polygonsByPlot[selectedPlotId] || [];
  const readOnly = !editMode;

  const caretakerOptions = useMemo(() => {
    const map = new Map();
    for (const item of employeeOptions) {
      const key = safeText(item.value, "").trim();
      if (!key) continue;
      map.set(key, item);
    }
    return Array.from(map.values());
  }, [employeeOptions]);

  useEffect(() => {
    if (!mounted) return;
    loadAll();
  }, [mounted]);

  useEffect(() => {
    if (!selectedPlotId) return;
    loadPolygon(selectedPlotId).catch(() => {});
    setEditMode(false);
  }, [selectedPlotId]);

  useEffect(() => {
    if (!selectedPlot) return;
    setPlotAlias(
      safeText(
        selectedPlot.alias || selectedPlot.plotName || selectedPlot.name || "",
        ""
      )
    );
    setPlotName(safeText(selectedPlot.plotName || selectedPlot.name || "", ""));
    setCaretaker(
      safeText(selectedPlot.caretaker || selectedPlot.ownerName || "", "")
    );
  }, [selectedPlot]);

  async function loadEmployees() {
    try {
      const res = await apiFetch("/api/users?role=employee");
      const raw = Array.isArray(res?.items) ? res.items : [];
      setEmployeeOptions(raw.map(normalizeEmployee).filter(Boolean));
    } catch {
      setEmployeeOptions([]);
    }
  }

  async function loadPlots() {
    const res = await apiFetch("/api/plots");
    const items = (res?.items || []).map(normalizePlot);
    setPlots(items);
    const firstId = items?.[0]?.id || "";
    setSelectedPlotId((prev) => prev || firstId);
    return firstId || "";
  }

  async function loadPolygon(plotId) {
    if (!plotId) return;

    try {
      const res = await apiFetch(`/api/plots/${plotId}/polygon`);
      const coords = normalizeCoords(res?.item?.coords || []);
      const color = safeText(res?.item?.color || "#d92d2a", "#d92d2a");

      setPolygonsByPlot((prev) => ({
        ...prev,
        [plotId]: coords.length ? [{ id: `poly-${plotId}`, color, coords }] : [],
      }));
    } catch {
      setPolygonsByPlot((prev) => ({ ...prev, [plotId]: [] }));
    }
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      await loadEmployees();
      const firstPlotId = await loadPlots();
      if (firstPlotId) await loadPolygon(firstPlotId);
    } catch (e) {
      setError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  function getPlotDisplayName(plot) {
    return (
      safeText(plot?.alias || plot?.plotName || plot?.name || "", "").trim() ||
      "แปลง"
    );
  }

  function ensureEditMode(message) {
    if (editMode) return true;
    setError(message || 'ต้องกด "ลบ / แก้ไข" ก่อน');
    return false;
  }

  async function addPlot() {
    setBusy(true);
    setError("");

    try {
      const newName = `แปลงใหม่ ${new Date().toISOString().slice(0, 10)}`;
      const res = await apiFetch("/api/plots", {
        method: "POST",
        body: {
          plotName: newName,
          name: newName,
          alias: newName,
          caretaker: "",
          ownerName: "",
          plantType: "",
          polygon: {
            color: "#d92d2a",
            coords: [],
            pins: [],
          },
        },
      });

      const item = normalizePlot(res?.item || {});
      if (item?.id) {
        setPlots((prev) => [item, ...prev]);
        setSelectedPlotId(item.id);
        setPolygonsByPlot((prev) => ({ ...prev, [item.id]: [] }));
        setPlotAlias(item.alias || item.plotName || item.name || "");
        setPlotName(item.plotName || item.name || "");
        setCaretaker(item.caretaker || "");
        setEditMode(true);
      }
    } catch (e) {
      setError(e?.message || "เพิ่มแปลงไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function savePlotInfo() {
    if (!selectedPlotId) return;

    setBusy(true);
    setError("");

    try {
      const safeAlias = plotAlias.trim();
      const safePlotName = plotName.trim();
      const safeCaretaker = caretaker.trim();

      const res = await apiFetch(`/api/plots/${selectedPlotId}`, {
        method: "PATCH",
        body: {
          alias: safeAlias,
          plotName: safePlotName,
          name: safePlotName,
          caretaker: safeCaretaker,
          ownerName: safeCaretaker,
        },
      });

      const updated = normalizePlot(res?.item || {});
      if (updated?.id) {
        setPlots((prev) =>
          prev.map((p) => (String(p.id) === String(updated.id) ? updated : p))
        );
      } else {
        setPlots((prev) =>
          prev.map((p) =>
            String(p.id) === String(selectedPlotId)
              ? {
                  ...p,
                  alias: safeAlias,
                  plotName: safePlotName,
                  name: safePlotName,
                  caretaker: safeCaretaker,
                  ownerName: safeCaretaker,
                }
              : p
          )
        );
      }
    } catch (e) {
      setError(e?.message || "บันทึกข้อมูลแปลงไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function savePolygon(coords, color = "#d92d2a") {
    if (!selectedPlotId) return;

    setBusy(true);
    setError("");

    try {
      await apiFetch(`/api/plots/${selectedPlotId}/polygon`, {
        method: "PUT",
        body: {
          color,
          coords: normalizeCoords(coords),
        },
      });

      await loadPolygon(selectedPlotId);
    } catch (e) {
      setError(e?.message || "บันทึก polygon ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function clearPolygon() {
    if (!selectedPlotId) return;

    setBusy(true);
    setError("");

    try {
      await apiFetch(`/api/plots/${selectedPlotId}/polygon`, {
        method: "PUT",
        body: {
          color: "#d92d2a",
          coords: [],
        },
      });

      await loadPolygon(selectedPlotId);
    } catch (e) {
      setError(e?.message || "ลบ polygon ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function deletePolygon() {
    if (!ensureEditMode('ต้องกด "ลบ / แก้ไข" ก่อนถึงจะลบ polygon ได้')) return;
    if (!window.confirm("ต้องการลบ polygon นี้ใช่ไหม?")) return;
    await clearPolygon();
  }

  async function onCreated(e) {
    if (!ensureEditMode('ต้องกด "ลบ / แก้ไข" ก่อนถึงจะวาด polygon ได้')) return;
    const layer = e?.layer;
    if (!layer) return;

    const points = (layer.getLatLngs?.()?.[0] || []).map((p) => [
      Number(p.lat),
      Number(p.lng),
    ]);

    if (points.length >= 3) {
      await savePolygon(points, "#d92d2a");
    }
  }

  async function onEdited(e) {
    if (!ensureEditMode('ต้องกด "ลบ / แก้ไข" ก่อนถึงจะแก้ polygon ได้')) return;
    const layers = e?.layers;
    if (!layers) return;

    let coords = null;

    layers.eachLayer((layer) => {
      const safe = (layer.getLatLngs?.()?.[0] || []).map((p) => [
        Number(p.lat),
        Number(p.lng),
      ]);
      if (safe.length >= 3) coords = safe;
    });

    if (coords) await savePolygon(coords, "#d92d2a");
  }

  async function onDeleted() {
    if (!ensureEditMode('ต้องกด "ลบ / แก้ไข" ก่อนถึงจะลบ polygon ได้')) return;
    await clearPolygon();
  }

  async function handleAliasChange(value) {
    setPlotAlias(value);

    if (!selectedPlotId) return;
    if (!editMode) return;

    try {
      await apiFetch(`/api/plots/${selectedPlotId}`, {
        method: "PATCH",
        body: {
          alias: value.trim(),
          plotName: plotName.trim(),
          name: plotName.trim(),
          caretaker: caretaker.trim(),
          ownerName: caretaker.trim(),
        },
      });

      setPlots((prev) =>
        prev.map((p) =>
          String(p.id) === String(selectedPlotId)
            ? { ...p, alias: value.trim() }
            : p
        )
      );
    } catch {}
  }

  async function handleCaretakerChange(value) {
    setCaretaker(value);

    if (!selectedPlotId) return;
    if (!editMode) return;

    try {
      await apiFetch(`/api/plots/${selectedPlotId}`, {
        method: "PATCH",
        body: {
          alias: plotAlias.trim(),
          plotName: plotName.trim(),
          name: plotName.trim(),
          caretaker: value.trim(),
          ownerName: value.trim(),
        },
      });

      setPlots((prev) =>
        prev.map((p) =>
          String(p.id) === String(selectedPlotId)
            ? { ...p, caretaker: value.trim(), ownerName: value.trim() }
            : p
        )
      );
    } catch {}
  }

  if (!mounted) return null;

  return (
    <DuwimsStaticPage current="planting-plot" htmlContent="">
      <div className="polygon-page">
        {error ? (
          <div className="alert-box">
            <div className="alert-title">แจ้งเตือน</div>
            <div className="alert-text">{error}</div>
          </div>
        ) : null}

        <div className="top-head">
          <div className="page-title">การจัดการ Polygons</div>
          <button
            type="button"
            className="add-btn"
            onClick={addPlot}
            disabled={busy}
          >
            + เพิ่มแปลง
          </button>
        </div>

        <div className="top-select-wrap">
          <div className="top-label">แปลง</div>
          <select
            className="top-select"
            value={selectedPlotId}
            onChange={(e) => setSelectedPlotId(e.target.value)}
            disabled={busy || loading || !plots.length}
          >
            {!plots.length ? (
              <option value="">ไม่มีข้อมูลแปลง</option>
            ) : (
              plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {getPlotDisplayName(plot)}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="edit-row">
          <button
            type="button"
            className={`edit-btn ${editMode ? "active" : ""}`}
            onClick={() => setEditMode((v) => !v)}
            disabled={busy || !selectedPlotId}
          >
            ลบ / แก้ไข
          </button>
        </div>

        <div className="info-card">
          <div className="info-title">กรุณากรอกข้อมูลผู้ดูแลแปลงใหม่</div>

          <div className="form-grid">
            <div className="field">
              <div className="field-label">
                ข้อมูลแปลง <span className="field-sub">{plotName || "แปลง A"}</span>
              </div>
              <input
                className="field-input"
                value={plotAlias}
                onChange={(e) => handleAliasChange(e.target.value)}
                placeholder="แปลง A"
                readOnly={!editMode}
                disabled={busy || !selectedPlotId}
              />
            </div>

            <div className="field">
              <div className="field-label">ข้อมูลผู้ดูแล</div>
              <select
                className="field-select"
                value={caretaker}
                onChange={(e) => handleCaretakerChange(e.target.value)}
                disabled={
                  busy || !selectedPlotId || !editMode || !caretakerOptions.length
                }
              >
                {!caretaker ? <option value="">เลือกผู้ดูแล</option> : null}
                {caretakerOptions.length ? (
                  caretakerOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))
                ) : (
                  <option value="">ยังไม่พบรายชื่อพนักงาน</option>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="map-card">
          <div className="map-title">Draw Polygons on a Map</div>

          <div className="map-shell">
            <div className="map-box">
              {!leaflet?.RL ? (
                <div className="map-loading">กำลังโหลดแผนที่...</div>
              ) : (
                <leaflet.RL.MapContainer
                  key={selectedPlotId || "plot-map"}
                  center={[13.7563, 100.5018]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <leaflet.RL.TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <CurrentLocationLayer
                    leaflet={leaflet}
                    locateTick={locateTick}
                    onStatus={setLocateStatus}
                  />

                  {currentPolygon?.coords?.length ? (
                    <FitBounds leaflet={leaflet} coords={currentPolygon.coords} />
                  ) : null}

                  <leaflet.RL.FeatureGroup ref={featureGroupRef}>
                    {plotPolygons.map((poly) => (
                      <PolyLayer key={poly.id} leaflet={leaflet} poly={poly} />
                    ))}

                    <leaflet.Draw.EditControl
                      position="topright"
                      onCreated={onCreated}
                      onEdited={onEdited}
                      onDeleted={onDeleted}
                      draw={{
                        rectangle: false,
                        circle: false,
                        circlemarker: false,
                        marker: false,
                        polyline: false,
                        polygon: !readOnly && plotPolygons.length === 0,
                      }}
                      edit={{
                        edit: !readOnly && plotPolygons.length > 0,
                        remove: !readOnly && plotPolygons.length > 0,
                      }}
                    />
                  </leaflet.RL.FeatureGroup>
                </leaflet.RL.MapContainer>
              )}
            </div>

            <button
              type="button"
              className="locate-btn"
              onClick={() => setLocateTick((v) => v + 1)}
            >
              📍 ตำแหน่งฉัน
            </button>
          </div>

          {locateStatus ? <div className="locate-status">{locateStatus}</div> : null}
        </div>

        <style jsx>{`
          .polygon-page {
            min-height: 100vh;
            padding: 18px 16px 24px;
            background:
              radial-gradient(circle at top left, rgba(84, 123, 60, 0.14), transparent 24%),
              linear-gradient(180deg, #edf3e8 0%, #e6ece0 100%);
          }

          .top-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
          }

          .page-title {
            font-size: 18px;
            font-weight: 800;
            color: #123f0f;
          }

          .add-btn {
            border: none;
            border-radius: 999px;
            background: #164d0c;
            color: #fff;
            padding: 11px 24px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 6px 16px rgba(22, 77, 12, 0.25);
          }

          .top-select-wrap {
            margin-bottom: 12px;
          }

          .top-label {
            font-size: 12px;
            font-weight: 700;
            color: #66754f;
            margin-bottom: 6px;
          }

          .top-select {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #d8dfd2;
            background: #f7f8f6;
            color: #1c2b18;
            border-radius: 14px;
            padding: 11px 14px;
            font-size: 14px;
            outline: none;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
          }

          .edit-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 14px;
          }

          .edit-btn {
            border: 1px solid #b7c9af;
            background: #eef4e8;
            color: #183915;
            border-radius: 999px;
            padding: 10px 22px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(82, 108, 62, 0.08);
          }

          .edit-btn.active {
            background: #dceada;
            border-color: #8faa82;
          }

          .info-card {
            background: linear-gradient(180deg, #dceada 0%, #d6e6d5 100%);
            border: 1px solid #bfd1b8;
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 10px 22px rgba(81, 103, 63, 0.08);
          }

          .info-title {
            font-size: 14px;
            font-weight: 800;
            color: #223d18;
            margin-bottom: 14px;
          }

          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }

          .field-label {
            font-size: 13px;
            font-weight: 700;
            color: #31492a;
            margin-bottom: 7px;
          }

          .field-sub {
            color: #87917f;
            font-weight: 600;
            margin-left: 6px;
            font-size: 12px;
          }

          .field-input,
          .field-select {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #bfd1b8;
            border-radius: 14px;
            background: #eef5eb;
            color: #33402c;
            padding: 11px 14px;
            font-size: 14px;
            outline: none;
          }

          .field-input[readonly] {
            background: #edf1ea;
          }

          .field-input:focus,
          .field-select:focus {
            border-color: #8fa882;
            box-shadow: 0 0 0 3px rgba(111, 140, 98, 0.12);
          }

          .map-card {
            background: #f5f7f3;
            border-radius: 22px;
            padding: 18px;
            border: 1px solid #d7ddd1;
            box-shadow: 0 12px 26px rgba(75, 95, 60, 0.08);
          }

          .map-title {
            font-size: 14px;
            font-weight: 800;
            color: #183915;
            margin-bottom: 14px;
          }

          .map-shell {
            position: relative;
            background: #dce7d3;
            border-radius: 14px;
            padding: 10px;
          }

          .map-box {
            height: 520px;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #c8d2c0;
            background: #d4e0cb;
          }

          .map-loading {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64715d;
            font-size: 13px;
          }

          .locate-btn {
            position: absolute;
            left: 20px;
            bottom: 20px;
            z-index: 500;
            border: none;
            border-radius: 999px;
            background: #f4f7ef;
            color: #183915;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 6px 16px rgba(90, 99, 84, 0.16);
          }

          .locate-status {
            margin-top: 10px;
            font-size: 12px;
            color: #4f5c47;
          }

          .alert-box {
            background: linear-gradient(180deg, #fff2f2, #ffe0e0);
            border: 1px solid #ffc7c7;
            color: #7f1d1d;
            border-radius: 16px;
            padding: 12px;
            margin-bottom: 14px;
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

          :global(.leaflet-container) {
            font-family: inherit;
            background: #d4e0cb;
          }

          :global(.leaflet-tile-pane) {
            filter: saturate(0.7) hue-rotate(-10deg) brightness(1.03);
          }

          :global(.leaflet-draw-toolbar a) {
            width: 34px;
            height: 34px;
            border-radius: 8px;
          }

          :global(.leaflet-control-zoom a) {
            width: 30px;
            height: 30px;
            line-height: 30px;
          }

          :global(.leaflet-control-container .leaflet-top.leaflet-right) {
            margin-top: 12px;
            margin-right: 12px;
          }

          button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          @media (max-width: 900px) {
            .form-grid {
              grid-template-columns: 1fr;
            }

            .map-box {
              height: 430px;
            }
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}