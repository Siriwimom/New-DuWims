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

function coordsToPolygonPayload(coords) {
  return normalizeCoords(coords).map(([lat, lng]) => ({ lat, lng }));
}

function polygonArea(coords = []) {
  const pts = normalizeCoords(coords);
  if (pts.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function normalizePlot(plot = {}) {
  return {
    ...plot,
    id: String(plot.id || plot._id || ""),
    plotName: safeText(plot.plotName || plot.name || plot.alias || ""),
    alias: safeText(plot.alias || plot.plotName || plot.name || ""),
    name: safeText(plot.name || plot.plotName || plot.alias || ""),
    caretaker: safeText(plot.caretaker || ""),
    polygon: normalizeCoords(plot.polygon || []),
    createdAt: safeText(plot.createdAt || ""),
    updatedAt: safeText(plot.updatedAt || ""),
  };
}

function normalizeEmployee(user = {}) {
  const role = safeText(user.role, "").trim().toLowerCase();
  const id = safeText(user.id || user._id || "", "").trim();
  const label = safeText(
    user.nickname ||
      user.fullName ||
      user.name ||
      user.displayName ||
      user.email ||
      "",
    ""
  ).trim();

  if (role !== "employee" || !id || !label) return null;

  return { value: id, label, email: safeText(user.email || "") };
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

function DrawGuide({ leaflet }) {
  const map = leaflet.RL.useMap();

  useEffect(() => {
    if (!map) return;
    map.doubleClickZoom.disable();
    return () => {
      map.doubleClickZoom.enable();
    };
  }, [map]);

  return null;
}

export default function Page() {
  const leaflet = useLeafletBundle();
  const featureGroupRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [locateStatus, setLocateStatus] = useState("");
  const [locateTick, setLocateTick] = useState(0);

  const [plots, setPlots] = useState([]);
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);

  const [mode, setMode] = useState("view"); // view | create | edit
  const [draftPlotName, setDraftPlotName] = useState("");
  const [draftCaretaker, setDraftCaretaker] = useState("");
  const [draftPolygon, setDraftPolygon] = useState([]);

  useEffect(() => setMounted(true), []);

  const selectedPlot = useMemo(
    () => plots.find((p) => String(p.id) === String(selectedPlotId)) || null,
    [plots, selectedPlotId]
  );

  const caretakerOptions = useMemo(() => employeeOptions, [employeeOptions]);

  const selectedCaretakerLabel = useMemo(() => {
    return (
      caretakerOptions.find((x) => String(x.value) === String(draftCaretaker))
        ?.label || ""
    );
  }, [caretakerOptions, draftCaretaker]);

  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";
  const isEditable = isCreateMode || isEditMode;

  const displayedPolygon = useMemo(() => {
    if (isCreateMode || isEditMode) return normalizeCoords(draftPolygon);
    return normalizeCoords(selectedPlot?.polygon || []);
  }, [isCreateMode, isEditMode, draftPolygon, selectedPlot]);

  useEffect(() => {
    if (!mounted) return;
    loadAll();
  }, [mounted]);

  useEffect(() => {
    if (!selectedPlot || isCreateMode || isEditMode) return;

    setDraftPlotName(safeText(selectedPlot.plotName || "", ""));
    setDraftCaretaker(safeText(selectedPlot.caretaker || "", ""));
    setDraftPolygon(normalizeCoords(selectedPlot.polygon || []));
  }, [selectedPlot, isCreateMode, isEditMode]);

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

  async function loadAll() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await Promise.all([loadEmployees(), loadPlots()]);
    } catch (e) {
      setError(e?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  function getPlotDisplayName(plot) {
    return (
      safeText(plot?.plotName || plot?.alias || plot?.name || "", "").trim() ||
      "แปลง"
    );
  }

  function resetDraft() {
    setDraftPlotName("");
    setDraftCaretaker("");
    setDraftPolygon([]);
  }

  function enterCreateMode() {
    setError("");
    setSuccess("");
    resetDraft();
    setMode("create");
  }

  function enterEditMode() {
    if (!selectedPlotId || !selectedPlot) {
      setError("กรุณาเลือกแปลงก่อน");
      return;
    }

    setError("");
    setSuccess("");
    setDraftPlotName(safeText(selectedPlot.plotName || "", ""));
    setDraftCaretaker(safeText(selectedPlot.caretaker || "", ""));
    setDraftPolygon(normalizeCoords(selectedPlot.polygon || []));
    setMode("edit");
  }

  function cancelEditOrCreate() {
    setError("");
    setSuccess("");
    setMode("view");

    if (selectedPlot) {
      setDraftPlotName(safeText(selectedPlot.plotName || "", ""));
      setDraftCaretaker(safeText(selectedPlot.caretaker || "", ""));
      setDraftPolygon(normalizeCoords(selectedPlot.polygon || []));
    } else {
      resetDraft();
    }
  }

  function validateBeforeSave() {
    const plotName = draftPlotName.trim();
    const caretaker = draftCaretaker.trim();
    const coords = normalizeCoords(draftPolygon);

    if (!plotName) {
      setError("กรุณากรอกข้อมูลแปลง");
      return false;
    }

    if (!caretaker) {
      setError("กรุณาเลือกข้อมูลผู้ดูแลแปลง");
      return false;
    }

    if (coords.length < 3) {
      setError("กรุณา Draw Polygons on a Map ก่อนกด Save");
      return false;
    }

    if (polygonArea(coords) < 0.00000001) {
      setError("Polygon เล็กเกินไปหรือจุดเกือบอยู่ในเส้นเดียวกัน กรุณาวาดใหม่ให้ครอบพื้นที่จริง");
      return false;
    }

    return true;
  }

  async function saveNewPlot() {
    if (!validateBeforeSave()) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const safePlotName = draftPlotName.trim();
      const safeCaretaker = draftCaretaker.trim();
      const safePolygon = coordsToPolygonPayload(draftPolygon);

      const payload = {
        plotName: safePlotName,
        caretaker: safeCaretaker,
        polygon: safePolygon,
        nodes: [],
      };

      const createdRes = await apiFetch("/api/plots", {
        method: "POST",
        body: payload,
      });

      const created = normalizePlot(createdRes?.item || {});
      if (!created?.id) {
        throw new Error("สร้างแปลงไม่สำเร็จ");
      }

      setPlots((prev) => [created, ...prev]);
      setSelectedPlotId(String(created.id));
      setDraftPlotName(created.plotName);
      setDraftCaretaker(created.caretaker);
      setDraftPolygon(created.polygon);
      setMode("view");
      setSuccess("บันทึกแปลงใหม่สำเร็จ");
    } catch (e) {
      setError(e?.message || "บันทึกแปลงใหม่ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function saveExistingPlot() {
    if (!selectedPlotId) {
      setError("กรุณาเลือกแปลงก่อน");
      return;
    }

    if (!validateBeforeSave()) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const safePlotName = draftPlotName.trim();
      const safeCaretaker = draftCaretaker.trim();
      const safePolygon = coordsToPolygonPayload(draftPolygon);

      const res = await apiFetch(`/api/plots/${selectedPlotId}`, {
        method: "PATCH",
        body: {
          plotName: safePlotName,
          caretaker: safeCaretaker,
          polygon: safePolygon,
        },
      });

      const updated = normalizePlot(res?.item || {});
      const updatedPlot = {
        ...updated,
        id: String(selectedPlotId),
      };

      setPlots((prev) =>
        prev.map((p) =>
          String(p.id) === String(selectedPlotId) ? updatedPlot : p
        )
      );

      setDraftPlotName(updatedPlot.plotName);
      setDraftCaretaker(updatedPlot.caretaker);
      setDraftPolygon(updatedPlot.polygon);
      setMode("view");
      setSuccess("บันทึกการแก้ไขสำเร็จ");
    } catch (e) {
      setError(e?.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (isCreateMode) {
      await saveNewPlot();
      return;
    }

    if (isEditMode) {
      await saveExistingPlot();
      return;
    }

    setError('กรุณากด "+ เพิ่มแปลง" หรือ "ลบ / แก้ไข" ก่อน');
  }

  async function handleDeletePlot() {
    if (!selectedPlotId) {
      setError("กรุณาเลือกแปลงก่อน");
      return;
    }

    const ok = window.confirm("ต้องการลบแปลงนี้ใช่หรือไม่?");
    if (!ok) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/api/plots/${selectedPlotId}`, {
        method: "DELETE",
      });

      const nextPlots = plots.filter((p) => String(p.id) !== String(selectedPlotId));
      setPlots(nextPlots);
      setSelectedPlotId(nextPlots[0]?.id || "");
      setMode("view");
      setSuccess("ลบแปลงสำเร็จ");
    } catch (e) {
      setError(e?.message || "ลบแปลงไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  function requireEditable(actionText) {
    if (isEditable) return true;
    setError(`🔒 กด "ลบ / แก้ไข" หรือ "+ เพิ่มแปลง" ก่อน${actionText}`);
    return false;
  }

  function onCreated(e) {
    if (!requireEditable("เพื่อวาด polygon")) return;

    const layer = e?.layer;
    if (!layer) return;

    const latlngs = layer.getLatLngs?.() || [];
    const ring = Array.isArray(latlngs?.[0]) ? latlngs[0] : latlngs;

    const points = ring
      .map((p) => [Number(p.lat), Number(p.lng)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (points.length >= 3) {
      setDraftPolygon(points);
      setError("");
    }
  }

  function onEdited(e) {
    if (!requireEditable("เพื่อแก้ polygon")) return;

    const layers = e?.layers;
    if (!layers) return;

    let coords = null;

    layers.eachLayer((layer) => {
      const latlngs = layer.getLatLngs?.() || [];
      const ring = Array.isArray(latlngs?.[0]) ? latlngs[0] : latlngs;

      const safe = ring
        .map((p) => [Number(p.lat), Number(p.lng)])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

      if (safe.length >= 3) coords = safe;
    });

    if (coords) {
      setDraftPolygon(coords);
      setError("");
    }
  }

  function onDeleted() {
    if (!requireEditable("เพื่อลบ polygon")) return;
    setDraftPolygon([]);
  }

  const formTitle = isCreateMode
    ? "กรุณากรอกข้อมูลผู้ดูแลแปลงใหม่"
    : isEditMode
    ? "แก้ไขข้อมูลแปลงและ Polygon"
    : "ข้อมูลแปลงปลูก";

  const infoPlotLabel = draftPlotName || "แปลง A";

  if (!mounted) return null;

  return (
    <DuwimsStaticPage current="planting-plot" htmlContent="">
      <div className="polygon-page">
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

        <div className="top-head">
          <div className="page-title">การจัดการ Polygons</div>

          <div className="head-actions">
            {(isCreateMode || isEditMode) && (
              <button
                type="button"
                className="cancel-btn"
                onClick={cancelEditOrCreate}
                disabled={busy}
              >
                ยกเลิก
              </button>
            )}

            <button
              type="button"
              className="add-btn"
              onClick={enterCreateMode}
              disabled={busy}
            >
              + เพิ่มแปลง
            </button>
          </div>
        </div>

        <div className="top-select-wrap">
          <div className="top-label">แปลง</div>
          <select
            className="top-select"
            value={isCreateMode ? "__creating__" : selectedPlotId}
            onChange={(e) => {
              if (e.target.value === "__creating__") return;
              setMode("view");
              setError("");
              setSuccess("");
              setSelectedPlotId(String(e.target.value));
            }}
            disabled={busy || loading || (!plots.length && !isCreateMode)}
          >
            {isCreateMode ? (
              <option value="__creating__">กำลังสร้างแปลงใหม่...</option>
            ) : null}

            {!plots.length && !isCreateMode ? (
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
            className={`edit-btn ${isEditMode ? "active" : ""}`}
            onClick={enterEditMode}
            disabled={busy || isCreateMode || !selectedPlotId}
          >
            ลบ / แก้ไข
          </button>

          <button
            type="button"
            className="delete-btn"
            onClick={handleDeletePlot}
            disabled={busy || !selectedPlotId || isCreateMode}
          >
            ลบแปลง
          </button>
        </div>

        <div className="info-card">
          <div className="info-title">{formTitle}</div>

          <div className="form-grid">
            <div className="field">
              <div className="field-label">
                ข้อมูลแปลง <span className="field-sub">{infoPlotLabel}</span>
              </div>
              <input
                className="field-input"
                value={draftPlotName}
                onChange={(e) => setDraftPlotName(e.target.value)}
                placeholder="แปลง A"
                readOnly={!isEditable}
                disabled={busy}
              />
            </div>

            <div className="field field-full">
              <div className="field-label">ข้อมูลผู้ดูแล</div>
              <select
                className="field-select"
                value={draftCaretaker}
                onChange={(e) => setDraftCaretaker(e.target.value)}
                disabled={busy || !isEditable}
              >
                <option value="">เลือกผู้ดูแล</option>
                {caretakerOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              {!isEditable && selectedCaretakerLabel ? (
                <div className="caretaker-hint">ผู้ดูแลปัจจุบัน: {selectedCaretakerLabel}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="map-card">
          <div className="map-head">
            <div className="map-title">Draw Polygons on a Map</div>

            <div className={`lock-hint ${isEditable ? "unlock" : "lock"}`}>
              {isEditable
                ? "✏️ โหมดแก้ไข เปิดอยู่"
                : '🔒 กด "ลบ / แก้ไข" หรือ "+ เพิ่มแปลง" ก่อน'}
            </div>
          </div>

          <div className="map-shell">
            <div className="map-box">
              {!leaflet?.RL ? (
                <div className="map-loading">กำลังโหลดแผนที่...</div>
              ) : (
                <leaflet.RL.MapContainer
                  key={
                    isCreateMode
                      ? "create-map"
                      : isEditMode
                      ? `edit-${selectedPlotId || "none"}`
                      : `plot-map-${selectedPlotId || "none"}`
                  }
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

                  <DrawGuide leaflet={leaflet} />

                  {displayedPolygon.length >= 3 ? (
                    <FitBounds leaflet={leaflet} coords={displayedPolygon} />
                  ) : null}

                  <leaflet.RL.FeatureGroup
                    ref={featureGroupRef}
                    key={`${selectedPlotId}-${mode}-${JSON.stringify(displayedPolygon)}`}
                  >
                    {displayedPolygon.length >= 3 ? (
                      <leaflet.RL.Polygon
                        key={JSON.stringify(displayedPolygon)}
                        positions={displayedPolygon}
                        pathOptions={{
                          color: isEditable ? "#0f766e" : "#d92d2a",
                          fillColor: isEditable ? "#0f766e" : "#d92d2a",
                          fillOpacity: isEditable ? 0.28 : 0.22,
                          weight: isEditable ? 4 : 3,
                        }}
                      />
                    ) : null}

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
                        polygon: isEditable && displayedPolygon.length === 0,
                      }}
                      edit={{
                        edit: isEditable && displayedPolygon.length > 0,
                        remove: isEditable && displayedPolygon.length > 0,
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

        {(isCreateMode || isEditMode) && (
          <div className="save-row">
            <button
              type="button"
              className="save-btn"
              onClick={handleSave}
              disabled={busy}
            >
              Save
            </button>
          </div>
        )}

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

          .head-actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .page-title {
            font-size: 18px;
            font-weight: 800;
            color: #123f0f;
          }

          .add-btn,
          .cancel-btn,
          .save-btn,
          .delete-btn {
            border: none;
            border-radius: 999px;
            padding: 11px 24px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }

          .add-btn:hover,
          .cancel-btn:hover,
          .save-btn:hover,
          .delete-btn:hover {
            transform: translateY(-1px);
          }

          .add-btn {
            background: #164d0c;
            color: #fff;
            box-shadow: 0 6px 16px rgba(22, 77, 12, 0.25);
          }

          .cancel-btn {
            background: #eef4e8;
            color: #183915;
            border: 1px solid #c9d7c0;
            box-shadow: 0 6px 16px rgba(88, 110, 68, 0.12);
          }

          .save-btn {
            background: linear-gradient(180deg, #2f7d1d 0%, #1b5d10 100%);
            color: #fff;
            min-width: 150px;
            box-shadow: 0 10px 24px rgba(27, 93, 16, 0.24);
          }

          .delete-btn {
            background: #b42318;
            color: #fff;
            box-shadow: 0 6px 16px rgba(180, 35, 24, 0.2);
            margin-left: 10px;
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
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
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
            transition: transform 0.15s ease, background 0.15s ease;
          }

          .edit-btn:hover {
            transform: translateY(-1px);
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
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .field-full {
            grid-column: 1 / -1;
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

          .caretaker-hint {
            margin-top: 8px;
            font-size: 12px;
            color: #5a6852;
          }

          .field-input:focus,
          .field-select:focus,
          .top-select:focus {
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

          .map-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
            flex-wrap: wrap;
          }

          .map-title {
            font-size: 14px;
            font-weight: 800;
            color: #183915;
          }

          .lock-hint {
            font-size: 12px;
            font-weight: 800;
            padding: 7px 12px;
            border-radius: 999px;
          }

          .lock-hint.lock {
            color: #6b4f10;
            background: #fff4d6;
            border: 1px solid #f3ddb0;
          }

          .lock-hint.unlock {
            color: #0f5132;
            background: #dcfce7;
            border: 1px solid #b7ebc6;
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

          .save-row {
            display: flex;
            justify-content: flex-end;
            margin-top: 18px;
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

          button:disabled,
          select:disabled,
          input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          @media (max-width: 900px) {
            .map-box {
              height: 430px;
            }

            .top-head,
            .map-head {
              align-items: flex-start;
            }

            .edit-row {
              gap: 10px;
              flex-wrap: wrap;
            }

            .delete-btn {
              margin-left: 0;
            }
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}