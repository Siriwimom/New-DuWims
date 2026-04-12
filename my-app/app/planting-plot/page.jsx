"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DuwimsStaticPage from "../components/DuwimsStaticPage";
import { useDuwimsT } from "../components/language-context";

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
    polygon: normalizeCoords(plot.polygon || plot?.polygon?.coords || []),
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

function CurrentLocationLayer({ leaflet, locateTick, onStatus, t }) {
  const map = leaflet.RL.useMap();
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!locateTick) return;

    if (!navigator.geolocation) {
      onStatus(t.locationNotSupported || "อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง");
      return;
    }

    onStatus(t.findingLocation || "กำลังค้นหาตำแหน่ง...");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        const accuracy = p.coords.accuracy || 0;
        setPos({ lat, lng, accuracy });
        map.setView([lat, lng], Math.max(map.getZoom() || 16, 17), {
          animate: true,
        });
        onStatus(t.locationFound || "พบตำแหน่งแล้ว");
      },
      (err) =>
        onStatus(
          `${t.locationFailed || "ไม่สามารถหาตำแหน่งได้"}: ${
            err?.message || ""
          }`
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [locateTick, map, onStatus, t]);

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
  const mapRef = useRef(null);
  const { t } = useDuwimsT();
  const router = useRouter();

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

  const [mode, setMode] = useState("view");
  const [draftPlotName, setDraftPlotName] = useState("");
  const [draftCaretaker, setDraftCaretaker] = useState("");
  const [draftPolygon, setDraftPolygon] = useState([]);

  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [showLeavePopup, setShowLeavePopup] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

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

  const plotNameTrimmed = draftPlotName.trim();
  const showPlotNameError = isEditable && !plotNameTrimmed;
  const shouldShowDetails = isCreateMode || isEditMode || !!selectedPlotId;

  const hasUnsavedWork = useMemo(() => {
    return isEditable;
  }, [isEditable]);

  useEffect(() => {
    if (!mounted) return;

    const token = getToken();
    if (!token) {
      router.replace("/");
      return;
    }

    loadAll();
  }, [mounted]);

  useEffect(() => {
    if (!selectedPlot || !selectedPlotId || isCreateMode || isEditMode) return;

    setDraftPlotName(safeText(selectedPlot.plotName || "", ""));
    setDraftCaretaker(safeText(selectedPlot.caretaker || "", ""));
    setDraftPolygon(normalizeCoords(selectedPlot.polygon || []));
  }, [selectedPlot, selectedPlotId, isCreateMode, isEditMode]);

  useEffect(() => {
    if (!hasUnsavedWork) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedWork]);

  useEffect(() => {
    if (!mounted) return;

    const onDocumentClick = (e) => {
      if (!hasUnsavedWork) return;

      const anchor = e.target?.closest?.("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";
      if (!href) return;
      if (href.startsWith("#")) return;
      if (href.startsWith("javascript:")) return;
      if (href.startsWith("mailto:")) return;
      if (href.startsWith("tel:")) return;

      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl) return;

      e.preventDefault();
      requestLeave(() => router.push(href));
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [mounted, hasUnsavedWork, router]);

  async function loadEmployees() {
    try {
      const res = await apiFetch("/api/users?role=employee");
      const raw = Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
          ? res
          : [];
      setEmployeeOptions(raw.map(normalizeEmployee).filter(Boolean));
    } catch {
      setEmployeeOptions([]);
    }
  }

  async function loadPlots() {
    const res = await apiFetch("/api/plots");
    const raw = Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res)
        ? res
        : [];
    const items = raw.map(normalizePlot);
    setPlots(items);
    setSelectedPlotId("");
    return "";
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await Promise.all([loadEmployees(), loadPlots()]);
    } catch (e) {
      const msg = e?.message || t.loadDataFailed || "โหลดข้อมูลไม่สำเร็จ";

      if (
        /401|unauthorized|missing token|jwt|forbidden/i.test(String(msg || ""))
      ) {
        router.replace("/");
        return;
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function getPlotDisplayName(plot) {
    return (
      safeText(plot?.plotName || plot?.alias || plot?.name || "", "").trim() ||
      t.plotWord ||
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
      setError(t.selectPlotFirst || "กรุณาเลือกแปลงก่อน");
      return;
    }

    setError("");
    setSuccess("");
    setDraftPlotName(safeText(selectedPlot.plotName || "", ""));
    setDraftCaretaker(safeText(selectedPlot.caretaker || "", ""));
    setDraftPolygon(normalizeCoords(selectedPlot.polygon || []));
    setMode("edit");
  }

  function goBackToView() {
    setError("");
    setSuccess("");
    setShowDeletePopup(false);
    setShowSavePopup(false);
    setShowLeavePopup(false);
    setPendingAction(null);
    setMode("view");

    if (selectedPlot) {
      setDraftPlotName(safeText(selectedPlot.plotName || "", ""));
      setDraftCaretaker(safeText(selectedPlot.caretaker || "", ""));
      setDraftPolygon(normalizeCoords(selectedPlot.polygon || []));
    } else {
      resetDraft();
    }
  }

  function cancelEditOrCreate() {
    goBackToView();
  }

  function requestLeave(action) {
    if (hasUnsavedWork) {
      setPendingAction(() => action);
      setShowLeavePopup(true);
      return;
    }

    if (typeof action === "function") {
      action();
    }
  }

  function confirmLeaveAndProceed() {
    const action = pendingAction;
    goBackToView();

    if (typeof action === "function") {
      setTimeout(() => {
        action();
      }, 0);
    }
  }

  function stayOnCurrentPage() {
    setShowLeavePopup(false);
    setPendingAction(null);
  }

  function validateBeforeSave() {
    const plotName = draftPlotName.trim();
    const coords = normalizeCoords(draftPolygon);

    if (!plotName) {
      setError("กรุณาตั้งชื่อแปลง");
      return false;
    }

    if (coords.length < 3) {
      setError(t.drawPolygonFirst || "กรุณาวาดขอบเขตแปลงก่อน");
      return false;
    }

    if (polygonArea(coords) < 0.00000001) {
      setError(t.polygonTooSmall || "พื้นที่ polygon เล็กเกินไป");
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
        polygon: safePolygon,
        nodes: [],
        ...(safeCaretaker ? { caretaker: safeCaretaker } : {}),
      };

      const createdRes = await apiFetch("/api/plots", {
        method: "POST",
        body: payload,
      });

      const created = normalizePlot(createdRes?.item || createdRes || {});
      if (!created?.id) {
        throw new Error(t.createPlotFailed || "เพิ่มแปลงไม่สำเร็จ");
      }

      setPlots((prev) => [created, ...prev]);
      setSelectedPlotId(String(created.id));
      setDraftPlotName(created.plotName);
      setDraftCaretaker(created.caretaker);
      setDraftPolygon(created.polygon);
      setMode("view");
      setSuccess(t.createPlotSuccess || "เพิ่มแปลงสำเร็จ");
    } catch (e) {
      const msg = e?.message || t.createPlotFailed || "เพิ่มแปลงไม่สำเร็จ";
      if (/401|unauthorized|missing token|jwt|forbidden/i.test(String(msg))) {
        router.replace("/");
        return;
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function saveExistingPlot() {
    if (!selectedPlotId) {
      setError(t.selectPlotFirst || "กรุณาเลือกแปลงก่อน");
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

      const payload = {
        plotName: safePlotName,
        polygon: safePolygon,
        ...(safeCaretaker ? { caretaker: safeCaretaker } : {}),
      };

      const res = await apiFetch(`/api/plots/${selectedPlotId}`, {
        method: "PATCH",
        body: payload,
      });

      const updated = normalizePlot(res?.item || res || {});
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
      setSuccess(t.saveSuccess || "บันทึกสำเร็จ");
    } catch (e) {
      const msg = e?.message || t.saveFailed || "บันทึกไม่สำเร็จ";
      if (/401|unauthorized|missing token|jwt|forbidden/i.test(String(msg))) {
        router.replace("/");
        return;
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function doSaveConfirmed() {
    setShowSavePopup(false);

    if (isCreateMode) {
      await saveNewPlot();
      return;
    }

    if (isEditMode) {
      await saveExistingPlot();
      return;
    }

    setError(t.needPressAddOrEditFirst || "กรุณากดเพิ่มหรือแก้ไขก่อน");
  }

  function handleSaveClick() {
    setError("");
    setSuccess("");
    setShowSavePopup(true);
  }

  function handleDeleteClick() {
    if (!selectedPlotId) {
      setError(t.selectPlotFirst || "กรุณาเลือกแปลงก่อน");
      return;
    }

    setError("");
    setSuccess("");
    setShowDeletePopup(true);
  }

  async function doDeleteConfirmed() {
    if (!selectedPlotId) {
      setShowDeletePopup(false);
      setError(t.selectPlotFirst || "กรุณาเลือกแปลงก่อน");
      return;
    }

    setShowDeletePopup(false);
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/api/plots/${selectedPlotId}`, {
        method: "DELETE",
      });

      const nextPlots = plots.filter(
        (p) => String(p.id) !== String(selectedPlotId)
      );
      setPlots(nextPlots);
      setSelectedPlotId("");
      resetDraft();
      setMode("view");
      setSuccess(t.deleteSuccess || "ลบข้อมูลสำเร็จ");
    } catch (e) {
      const msg = e?.message || t.deleteFailed || "ลบข้อมูลไม่สำเร็จ";
      if (/401|unauthorized|missing token|jwt|forbidden/i.test(String(msg))) {
        router.replace("/");
        return;
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function requireEditable(message) {
    if (isEditable) return true;
    setError(message);
    return false;
  }

  function onCreated(e) {
    if (!requireEditable(t.needEditBeforeDraw || "กรุณากดเพิ่มหรือแก้ไขก่อน")) {
      return;
    }

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
    if (
      !requireEditable(
        t.needEditBeforeEditPolygon || "กรุณากดเพิ่มหรือแก้ไขก่อน"
      )
    ) {
      return;
    }

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
    if (
      !requireEditable(
        t.needEditBeforeDeletePolygon || "กรุณากดเพิ่มหรือแก้ไขก่อน"
      )
    ) {
      return;
    }
    setDraftPolygon([]);
  }

  const formTitle = isCreateMode
    ? "เพิ่มแปลงปลูก"
    : isEditMode
      ? "แก้ไขแปลงปลูก"
      : t.plotInfo || "ข้อมูลแปลง";

  const pageTitleText = isCreateMode
    ? "เพิ่มแปลงปลูก"
    : isEditMode
      ? "แก้ไขแปลงปลูก"
      : "🗺 แปลงปลูก";

  const infoPlotLabel = plotNameTrimmed || "กรุณาตั้งชื่อแปลง";

  if (!mounted) return null;

  return (
    <DuwimsStaticPage current="planting-plot" htmlContent="">
      <div className="polygon-page">
        {error ? (
          <div className="alert-box error">
            <div className="alert-title">{t.noticeTitle || "แจ้งเตือน"}</div>
            <div className="alert-text">{error}</div>
          </div>
        ) : null}

        {success ? (
          <div className="alert-box success">
            <div className="alert-title">{t.successTitle || "สำเร็จ"}</div>
            <div className="alert-text">{success}</div>
          </div>
        ) : null}

        <div className="top-head">
          {isEditable ? (
            <div className="title-row">
              <button
                type="button"
                className="back-btn"
                onClick={() => requestLeave(() => goBackToView())}
                disabled={busy}
                aria-label="back"
              >
                &lt;
              </button>
              <div className="page-title">{pageTitleText}</div>
            </div>
          ) : (
            <>
              <div className="page-title">{pageTitleText}</div>

              <div className="head-actions">
                <button
                  type="button"
                  className="add-btn"
                  onClick={enterCreateMode}
                  disabled={busy}
                >
                  + เพิ่มแปลง
                </button>

                {selectedPlotId ? (
                  <>
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={enterEditMode}
                      disabled={busy}
                    >
                      แก้ไข
                    </button>

                    <button
                      type="button"
                      className="delete-btn"
                      onClick={handleDeleteClick}
                      disabled={busy}
                    >
                      ลบ
                    </button>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div className="top-select-wrap">
          <div className="top-label">เลือกแปลง</div>
          <select
            className="top-select"
            value={isCreateMode ? "__creating__" : selectedPlotId}
            onChange={(e) => {
              const nextValue = e.target.value;
              if (nextValue === "__creating__") return;

              requestLeave(() => {
                setMode("view");
                setError("");
                setSuccess("");
                setSelectedPlotId(String(nextValue));
              });
            }}
            disabled={busy || loading || false}
          >
            {isCreateMode ? (
              <option value="__creating__">กำลังเพิ่มแปลงใหม่</option>
            ) : (
              <option value="">กรุณาเลือกแปลง</option>
            )}

            {plots.map((plot) => (
              <option key={plot.id} value={plot.id}>
                {getPlotDisplayName(plot)}
              </option>
            ))}
          </select>
        </div>

        {shouldShowDetails ? (
          <>
            <div className="info-card">
              <div className="info-title">{formTitle}</div>

              <div className="form-grid">
                <div className="field">
                  <div
                    className={`field-label ${showPlotNameError ? "error-text" : ""}`}
                  >
                    {t.plotInfoLabel || "ชื่อแปลง"}{" "}
                    <span
                      className={`field-sub ${showPlotNameError ? "error-text" : ""}`}
                    >
                      {infoPlotLabel}
                    </span>
                  </div>

                  <input
                    className={`field-input ${showPlotNameError ? "input-error" : ""}`}
                    value={draftPlotName}
                    onChange={(e) => {
                      setDraftPlotName(e.target.value);
                      if (error === "กรุณาตั้งชื่อแปลง") setError("");
                    }}
                    placeholder="กรุณาตั้งชื่อแปลง"
                    disabled={busy || !isEditable}
                    readOnly={!isEditable}
                  />
                </div>

                <div className="field field-full">
                  <div className="field-label">
                    {t.caretakerInfoLabel || "ผู้ดูแล"}
                  </div>
                  <select
                    className="field-select"
                    value={draftCaretaker}
                    onChange={(e) => setDraftCaretaker(e.target.value)}
                    disabled={busy || !isEditable}
                  >
                    <option value="">ไม่เลือก</option>
                    {caretakerOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  {!isEditable && selectedCaretakerLabel ? (
                    <div className="caretaker-hint">
                      {t.currentCaretaker || "ผู้ดูแลปัจจุบัน"}: {selectedCaretakerLabel}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="map-card">
              <div className="map-head">
                <div className="map-title">
                  {t.drawPolygonOnMap || "วาดขอบเขตแปลงบนแผนที่"}
                </div>

                <div className={`lock-hint ${isEditable ? "unlock" : "lock"}`}>
                  {isEditable
                    ? t.editModeOn || "โหมดแก้ไขเปิดอยู่"
                    : t.pressEditOrAddFirst || "กด +เพิ่มแปลง หรือ ลบ/แก้ไข ก่อน"}
                </div>
              </div>

              <div className="map-shell">
                <div className="map-box">
                  {!leaflet?.RL ? (
                    <div className="map-loading">{t.loadingMap || "กำลังโหลดแผนที่..."}</div>
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
                      ref={mapRef}
                    >
                      <leaflet.RL.TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <CurrentLocationLayer
                        leaflet={leaflet}
                        locateTick={locateTick}
                        onStatus={setLocateStatus}
                        t={t}
                      />

                      <DrawGuide leaflet={leaflet} />

                      {displayedPolygon.length >= 3 ? (
                        <FitBounds leaflet={leaflet} coords={displayedPolygon} />
                      ) : null}

                      <leaflet.RL.FeatureGroup
                        ref={featureGroupRef}
                        key={`${selectedPlotId}-${mode}-${JSON.stringify(
                          displayedPolygon
                        )}`}
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
                  {t.myLocation || "ตำแหน่งของฉัน"}
                </button>
              </div>

              {locateStatus ? (
                <div className="locate-status">{locateStatus}</div>
              ) : null}
            </div>

            {isEditable ? (
              <div className="bottom-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => requestLeave(() => cancelEditOrCreate())}
                  disabled={busy}
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSaveClick}
                  disabled={busy}
                >
                  บันทึก
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {showDeletePopup ? (
          <div
            className="confirm-overlay open"
            onClick={() => !busy && setShowDeletePopup(false)}
          >
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-icon">🗑</div>
              <div className="confirm-title">{t.confirmDeleteTitle || "ยืนยันการลบ"}</div>
              <div className="confirm-sub">
                {t.confirmDeleteSub1 || "คุณต้องการลบข้อมูลนี้ใช่หรือไม่"}
                <br />
                {t.confirmDeleteSub2 || "เมื่อยืนยันแล้วจะไม่สามารถย้อนกลับได้"}
              </div>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowDeletePopup(false)}
                  disabled={busy}
                >
                  {t.cancel || "ยกเลิก"}
                </button>
                <button
                  type="button"
                  className="btn-confirm danger"
                  onClick={doDeleteConfirmed}
                  disabled={busy}
                >
                  {t.confirm || "ยืนยัน"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showSavePopup ? (
          <div
            className="confirm-overlay open"
            onClick={() => !busy && setShowSavePopup(false)}
          >
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-icon">💾</div>
              <div className="confirm-title">{t.confirmSaveTitle || "ยืนยันการบันทึก"}</div>
              <div className="confirm-sub">
                {t.confirmSaveSub1 || "ตรวจสอบข้อมูลเรียบร้อยแล้วใช่หรือไม่"}
                <br />
                {t.confirmSaveSub2 || "กดยืนยันเพื่อบันทึกข้อมูล"}
              </div>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowSavePopup(false)}
                  disabled={busy}
                >
                  {t.cancel || "ยกเลิก"}
                </button>
                <button
                  type="button"
                  className="btn-confirm"
                  onClick={doSaveConfirmed}
                  disabled={busy}
                >
                  {t.confirm || "ยืนยัน"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showLeavePopup ? (
          <div className="confirm-overlay open" onClick={stayOnCurrentPage}>
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-icon warn">⚠️</div>
              <div className="confirm-title">มีการแก้ไขที่ยังไม่บันทึก</div>
              <div className="confirm-sub">
                คุณกำลังอยู่ระหว่างเพิ่มแปลงหรือแก้ไขข้อมูล
                <br />
                ต้องการยกเลิกการแก้ไขแล้วเปลี่ยนหน้า หรืออยู่หน้าเดิมต่อ
              </div>
              <div className="confirm-actions two-line">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={stayOnCurrentPage}
                  disabled={busy}
                >
                  อยู่หน้าเดิม
                </button>
                <button
                  type="button"
                  className="btn-confirm danger"
                  onClick={confirmLeaveAndProceed}
                  disabled={busy}
                >
                  ยกเลิกการแก้ไข
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <style jsx>{`
          .polygon-page {
            min-height: 100vh;
            padding: 18px 16px 28px;
            background:
              radial-gradient(
                circle at top left,
                rgba(84, 123, 60, 0.14),
                transparent 24%
              ),
              linear-gradient(180deg, #eff2eb 0%, #eff2eb 100%);
          }

          .top-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
            flex-wrap: wrap;
          }

          .title-row {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .head-actions {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }

          .page-title {
            font-size: 18px;
            font-weight: 800;
            color: #123f0f;
          }

          .back-btn,
          .add-btn,
          .edit-btn,
          .cancel-btn,
          .save-btn,
          .delete-btn,
          .btn-cancel,
          .btn-confirm {
            border: none;
            border-radius: 12px;
            padding: 12px 22px;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            transition:
              transform 0.15s ease,
              box-shadow 0.15s ease,
              background 0.15s ease,
              border-color 0.15s ease;
          }

          .back-btn:hover,
          .add-btn:hover,
          .edit-btn:hover,
          .cancel-btn:hover,
          .save-btn:hover,
          .delete-btn:hover,
          .btn-cancel:hover,
          .btn-confirm:hover {
            transform: translateY(-1px);
          }

          .back-btn {
            min-width: 52px;
            padding: 12px 0;
            background: #eef4e8;
            color: #183915;
            border: 1px solid #c9d7c0;
            box-shadow: 0 6px 16px rgba(88, 110, 68, 0.12);
          }

          .add-btn {
            background: linear-gradient(180deg, #2f7d1d 0%, #1b5d10 100%);
            color: #fff;
            box-shadow: 0 10px 24px rgba(237, 241, 236, 0.24);
          }

          .edit-btn {
            background: #eef4e8;
            color: #183915;
            border: 1px solid #c9d7c0;
            box-shadow: 0 6px 16px rgba(88, 110, 68, 0.12);
            min-width: 120px;
          }

          .cancel-btn {
            background: #eef4e8;
            color: #183915;
            border: 1px solid #c9d7c0;
            box-shadow: 0 6px 16px rgba(88, 110, 68, 0.12);
            min-width: 122px;
          }

          .save-btn {
            background: linear-gradient(180deg, #2f7d1d 0%, #1b5d10 100%);
            color: #fff;
            min-width: 160px;
            box-shadow: 0 10px 24px rgba(27, 93, 16, 0.24);
          }

          .delete-btn {
            background: #d77063;
            color: #fff;
            box-shadow: 0 6px 16px rgba(180, 35, 24, 0.2);
            min-width: 100px;
          }

          .bottom-actions {
            display: flex;
            justify-content: flex-end;
            gap: 14px;
            margin-top: 18px;
            flex-wrap: wrap;
          }

          .top-select-wrap {
            margin-bottom: 16px;
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
            padding: 14px 16px;
            font-size: 14px;
            outline: none;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
          }

          .info-card {
            background: linear-gradient(180deg, #ffffff 0%, #ffffff 100%);
            border: 1px solid #f7faf5;
            border-radius: 20px;
            padding: 22px;
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

          .error-text {
            color: #d92d20 !important;
          }

          .field-input,
          .field-select {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #bfd1b8;
            border-radius: 14px;
            background: #eef5eb;
            color: #33402c;
            padding: 14px 16px;
            font-size: 14px;
            outline: none;
          }

          .input-error {
            border-color: #d92d20 !important;
            background: #fff4f2 !important;
            color: #8a1c14;
            box-shadow: 0 0 0 3px rgba(217, 45, 32, 0.1);
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
            padding: 8px 14px;
            border-radius: 14px;
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
            border-radius: 16px;
            padding: 12px;
          }

          .map-box {
            height: 520px;
            border-radius: 14px;
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
            left: 22px;
            bottom: 22px;
            z-index: 500;
            border: none;
            border-radius: 12px;
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
            border: 1px solid #f0f6f2;
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

          .confirm-overlay {
            position: fixed;
            inset: 0;
            z-index: 5000;
            background: rgba(23, 33, 20, 0.42);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            backdrop-filter: blur(2px);
          }

          .confirm-box {
            width: 100%;
            max-width: 430px;
            background: linear-gradient(180deg, #f7faf4 0%, #edf3e8 100%);
            border: 1px solid #d7e0d0;
            border-radius: 24px;
            padding: 26px 22px 20px;
            box-shadow: 0 18px 44px rgba(34, 58, 28, 0.2);
            text-align: center;
          }

          .confirm-icon {
            width: 70px;
            height: 70px;
            margin: 0 auto 14px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            background: linear-gradient(180deg, #fde8e8 0%, #fbd5d5 100%);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
          }

          .confirm-icon.warn {
            background: linear-gradient(180deg, #fff4d6 0%, #fde7a9 100%);
          }

          .confirm-title {
            font-size: 20px;
            font-weight: 900;
            color: #20351a;
            margin-bottom: 10px;
          }

          .confirm-sub {
            font-size: 14px;
            line-height: 1.7;
            color: #55634f;
            margin-bottom: 18px;
          }

          .confirm-actions {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
          }

          .btn-cancel {
            background: #eef4e8;
            color: #183915;
            border: 1px solid #c9d7c0;
          }

          .btn-confirm {
            background: linear-gradient(180deg, #2f7d1d 0%, #1b5d10 100%);
            color: #fff;
            box-shadow: 0 10px 20px rgba(27, 93, 16, 0.24);
          }

          .btn-confirm.danger {
            background: linear-gradient(180deg, #d93f32 0%, #b42318 100%);
            box-shadow: 0 10px 20px rgba(180, 35, 24, 0.24);
          }

          :global(.leaflet-container) {
            font-family: inherit;
            background: #d4e0cb;
          }

          :global(.leaflet-tile-pane) {
            filter: saturate(0.7) hue-rotate(-10deg) brightness(1.03);
          }

          :global(.leaflet-draw-toolbar a) {
            width: 36px;
            height: 36px;
            border-radius: 10px;
          }

          :global(.leaflet-control-zoom a) {
            width: 32px;
            height: 32px;
            line-height: 32px;
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
            .map-head,
            .bottom-actions {
              align-items: flex-start;
            }

            .head-actions,
            .bottom-actions,
            .title-row {
              width: 100%;
            }

            .bottom-actions {
              justify-content: stretch;
            }

            .cancel-btn,
            .save-btn,
            .btn-cancel,
            .btn-confirm,
            .add-btn,
            .edit-btn,
            .delete-btn {
              width: 100%;
            }

            .confirm-actions {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}
