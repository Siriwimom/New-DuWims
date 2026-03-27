"use client";

import { useEffect, useMemo, useState } from "react";
import DuwimsStaticPage from "../components/DuwimsStaticPage";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:3001";

const TOKEN_KEYS = [
  "AUTH_TOKEN_V1",
  "duwims_token",
  "authToken",
  "token",
  "pmtool_token",
];

function getToken() {
  if (typeof window === "undefined") return "";
  for (const key of TOKEN_KEYS) {
    try {
      const value = window.localStorage.getItem(key);
      if (value) return value;
    } catch {}
  }
  return "";
}

function setToken(token) {
  if (typeof window === "undefined" || !token) return;
  TOKEN_KEYS.forEach((key) => {
    try {
      window.localStorage.setItem(key, token);
    } catch {}
  });
}

function formatThaiDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear() + 543;
  return `${dd}/${mm}/${yyyy}`;
}

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatVolume(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("th-TH");
}

function normalizePlantIcon(species = "") {
  const text = String(species).trim().toLowerCase();
  if (text.includes("ทุเรียน") || text.includes("durian")) return "🌵";
  if (text.includes("มังคุด") || text.includes("mangosteen")) return "🟣";
  if (text.includes("ลำไย") || text.includes("longan")) return "🌿";
  if (text.includes("ลิ้นจี่") || text.includes("lychee")) return "🌱";
  return "🌱";
}

function createEmptyForm() {
  return {
    id: "",
    plot: "",
    species: "",
    startDate: "",
    harvestDate: "",
    volume: "",
  };
}

export default function YieldPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [plots, setPlots] = useState([]);
  const [items, setItems] = useState([]);

  const [filterPlot, setFilterPlot] = useState("");
  const [filterSpecies, setFilterSpecies] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const [createForm, setCreateForm] = useState(createEmptyForm());
  const [editForm, setEditForm] = useState(createEmptyForm());

  const [saveMode, setSaveMode] = useState("create");
  const [pendingDelete, setPendingDelete] = useState(null);

  const plotMap = useMemo(() => {
    const map = {};
    plots.forEach((plot, index) => {
      map[String(plot.id)] = {
        ...plot,
        fallbackLabel: `แปลง ${index + 1}`,
      };
    });
    return map;
  }, [plots]);

  const plotOptions = useMemo(() => {
    return plots.map((plot, index) => ({
      id: plot.id,
      label: plot.plotName || plot.alias || plot.name || `แปลง ${index + 1}`,
    }));
  }, [plots]);

  const speciesOptions = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      const value = String(item?.species || "").trim();
      if (value) set.add(value);
    });
    return Array.from(set);
  }, [items]);

  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.message || `Request failed: ${res.status}`);
    }

    return data;
  }

  async function bootstrapAuthFromUrl() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const tokenFromUrl = url.searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
  }

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      await bootstrapAuthFromUrl();

      const [plotsRes, managementRes] = await Promise.all([
        apiFetch("/api/plots"),
        apiFetch("/api/management-plants"),
      ]);

      setPlots(Array.isArray(plotsRes?.items) ? plotsRes.items : []);
      setItems(Array.isArray(managementRes?.items) ? managementRes.items : []);
    } catch (err) {
      setError(err?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!createForm.plot && plotOptions[0]?.id) {
      setCreateForm((prev) => ({ ...prev, plot: plotOptions[0].id }));
    }
  }, [plotOptions, createForm.plot]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterPlot && String(item?.plot || "") !== String(filterPlot)) return false;

      if (filterSpecies) {
        const a = String(item?.species || "").trim().toLowerCase();
        const b = String(filterSpecies || "").trim().toLowerCase();
        if (a !== b) return false;
      }

      if (filterStartDate) {
        const itemStart = item?.startDate ? String(item.startDate).slice(0, 10) : "";
        if (!itemStart || itemStart < filterStartDate) return false;
      }

      if (filterEndDate) {
        const itemHarvest = item?.harvestDate ? String(item.harvestDate).slice(0, 10) : "";
        const fallback = item?.startDate ? String(item.startDate).slice(0, 10) : "";
        const compareDate = itemHarvest || fallback;
        if (!compareDate || compareDate > filterEndDate) return false;
      }

      return true;
    });
  }, [items, filterPlot, filterSpecies, filterStartDate, filterEndDate]);

  function getPlotLabelById(plotId) {
    const plot = plotMap[String(plotId)];
    return (
      plot?.plotName ||
      plot?.alias ||
      plot?.name ||
      plot?.fallbackLabel ||
      String(plotId || "-")
    );
  }

  function openCreatePopup() {
    setCreateForm({
      id: "",
      plot: plotOptions[0]?.id || "",
      species: "",
      startDate: "",
      harvestDate: "",
      volume: "",
    });
    setCreateOpen(true);
  }

  function openEditPopup(item) {
    setEditForm({
      id: item?.id || "",
      plot: item?.plot || "",
      species: item?.species || "",
      startDate: toDateInputValue(item?.startDate),
      harvestDate: toDateInputValue(item?.harvestDate),
      volume:
        item?.volume === null || item?.volume === undefined ? "" : String(item.volume),
    });
    setEditOpen(true);
  }

  function openDeletePopup(item) {
    setPendingDelete(item);
    setConfirmDeleteOpen(true);
  }

  function requestSaveCreate() {
    setSaveMode("create");
    setConfirmSaveOpen(true);
  }

  function requestSaveEdit() {
    setSaveMode("edit");
    setConfirmSaveOpen(true);
  }

  function resetFiltersForView() {
    setFilterPlot("");
    setFilterSpecies("");
    setFilterStartDate("");
    setFilterEndDate("");
  }

  async function handleConfirmSave() {
    setSaving(true);
    setError("");

    try {
      if (saveMode === "create") {
        await apiFetch("/api/management-plants", {
          method: "POST",
          body: JSON.stringify({
            plot: createForm.plot,
            species: createForm.species.trim(),
            startDate: createForm.startDate || null,
            harvestDate: createForm.harvestDate || null,
            volume: createForm.volume === "" ? null : Number(createForm.volume),
          }),
        });
        setCreateOpen(false);
      } else {
        await apiFetch(`/api/management-plants/${editForm.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            plot: editForm.plot,
            species: editForm.species.trim(),
            startDate: editForm.startDate || null,
            harvestDate: editForm.harvestDate || null,
            volume: editForm.volume === "" ? null : Number(editForm.volume),
          }),
        });
        setEditOpen(false);
      }

      setConfirmSaveOpen(false);
      resetFiltersForView();
      await loadAll();
    } catch (err) {
      setError(err?.message || "บันทึกข้อมูลไม่สำเร็จ");
      setConfirmSaveOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete?.id) return;

    setDeleting(true);
    setError("");

    try {
      await apiFetch(`/api/management-plants/${pendingDelete.id}`, {
        method: "DELETE",
      });
      setConfirmDeleteOpen(false);
      setPendingDelete(null);
      resetFiltersForView();
      await loadAll();
    } catch (err) {
      setError(err?.message || "ลบข้อมูลไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DuwimsStaticPage current="yield">
      <div className="page-content">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 13,
            flexWrap: "wrap",
            gap: 9,
          }}
        >
          <div className="card-title" style={{ fontSize: 15 }}>
            🌾 Management Planting
          </div>
          <button
            className="create-btn"
            style={{ marginBottom: 0 }}
            onClick={openCreatePopup}
            type="button"
          >
            ＋ เพิ่มข้อมูลผลผลิต
          </button>
        </div>

        {error ? <div className="yield-error-banner">{error}</div> : null}

        <div className="yield-filters">
          <div className="yield-filter-col">
            <div className="filter-label">แปลง</div>
            <select
              className="form-select"
              style={{ width: 140 }}
              value={filterPlot}
              onChange={(e) => setFilterPlot(e.target.value)}
            >
              <option value="">ทุกแปลง</option>
              {plotOptions.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.label}
                </option>
              ))}
            </select>
          </div>

          <div className="yield-filter-col">
            <div className="filter-label">ชนิดพืช</div>
            <select
              className="form-select"
              style={{ width: 130 }}
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
            >
              <option value="">ทุกชนิด</option>
              {speciesOptions.map((species) => (
                <option key={species} value={species}>
                  {species}
                </option>
              ))}
            </select>
          </div>

          <div className="yield-filter-col">
            <div className="filter-label">วันที่เริ่มต้น</div>
            <input
              type="date"
              className="form-input"
              style={{ width: 148 }}
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>

          <div className="yield-filter-col">
            <div className="filter-label">วันที่สิ้นสุด</div>
            <input
              type="date"
              className="form-input"
              style={{ width: 148 }}
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="card yield-table-card">
          <div style={{ overflowX: "auto" }}>
            <table className="yield-table">
              <thead>
                <tr>
                  <th>แปลง</th>
                  <th>ชนิดของพืช</th>
                  <th>วันที่ปลูก</th>
                  <th>วันที่เก็บเกี่ยว</th>
                  <th>ปริมาณ (ตัน)</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="yield-empty-cell">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="yield-empty-cell">
                      ยังไม่มีข้อมูล
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const plotLabel = getPlotLabelById(item?.plot);
                    const icon = normalizePlantIcon(item?.species);

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{plotLabel}</strong>
                        </td>
                        <td>
                          {icon} {item?.species || "-"}
                        </td>
                        <td>{formatThaiDate(item?.startDate)}</td>
                        <td>{formatThaiDate(item?.harvestDate)}</td>
                        <td>
                          <strong>{formatVolume(item?.volume)}</strong>
                        </td>
                        <td className="yield-actions-cell">
                          <button
                            className="edit-row-btn"
                            type="button"
                            onClick={() => openEditPopup(item)}
                          >
                            ✏️ แก้ไข
                          </button>
                          <button
                            className="del-row-btn"
                            type="button"
                            onClick={() => openDeletePopup(item)}
                          >
                            🗑 ลบ
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {createOpen && (
          <div
            id="createYieldPopup"
            className="popup-overlay open"
            onClick={(e) => {
              if (e.target === e.currentTarget) setCreateOpen(false);
            }}
          >
            <div className="popup-box">
              <div className="popup-title">🌾 เพิ่มข้อมูลผลผลิต</div>
              <button
                className="popup-close"
                type="button"
                onClick={() => setCreateOpen(false)}
              >
                ✕
              </button>

              <div className="form-field">
                <div className="form-field-label">เลือกแปลง</div>
                <select
                  className="form-select"
                  value={createForm.plot}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, plot: e.target.value }))
                  }
                >
                  <option value="">ทุกแปลง</option>
                  {plotOptions.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <div className="form-field-label">ชนิดพืช</div>
                <input
                  className="form-input"
                  placeholder="เช่น ทุเรียน"
                  value={createForm.species}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, species: e.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <div className="form-field-label">วันที่เริ่มปลูก</div>
                <input
                  className="form-input"
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <div className="form-field-label">วันที่เก็บเกี่ยว</div>
                <input
                  className="form-input"
                  type="date"
                  value={createForm.harvestDate}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, harvestDate: e.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <div className="form-field-label">ปริมาณผลผลิต (ตัน)</div>
                <input
                  className="form-input"
                  type="number"
                  placeholder="1000"
                  value={createForm.volume}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, volume: e.target.value }))
                  }
                />
              </div>

              <div className="popup-actions">
                <button
                  className="btn-cancel"
                  type="button"
                  onClick={() => setCreateOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="btn-save"
                  type="button"
                  disabled={
                    saving ||
                    !createForm.plot ||
                    !String(createForm.species || "").trim() ||
                    !createForm.startDate
                  }
                  onClick={requestSaveCreate}
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}

        {editOpen && (
          <div
            id="editYieldPopup"
            className="popup-overlay open"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditOpen(false);
            }}
          >
            <div className="popup-box">
              <div className="popup-title">✏️ แก้ไขข้อมูลผลผลิต</div>
              <button
                className="popup-close"
                type="button"
                onClick={() => setEditOpen(false)}
              >
                ✕
              </button>

              <div className="form-field">
                <div className="form-field-label">
                  แปลง <span style={{ color: "#c62828", fontSize: 9 }}>(ห้ามเปลี่ยน)</span>
                </div>
                <select
                  className="form-select"
                  disabled
                  style={{ opacity: 0.55, cursor: "not-allowed" }}
                  value={editForm.plot}
                  onChange={() => {}}
                >
                  <option value={editForm.plot}>{getPlotLabelById(editForm.plot)}</option>
                </select>
                <div style={{ fontSize: 9, color: "#c62828", marginTop: 3 }}>
                  ⛔ ไม่สามารถเปลี่ยนแปลงแปลงปลูกได้
                </div>
              </div>

              <div className="form-field">
                <div className="form-field-label">ชนิดพืช</div>
                <input
                  className="form-input"
                  value={editForm.species}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, species: e.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <div className="form-field-label">วันที่เริ่มปลูก</div>
                <input
                  className="form-input"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <div className="form-field-label">วันที่เก็บเกี่ยว</div>
                <input
                  className="form-input"
                  type="date"
                  value={editForm.harvestDate}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, harvestDate: e.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <div className="form-field-label">ปริมาณผลผลิต (ตัน)</div>
                <input
                  className="form-input"
                  type="number"
                  value={editForm.volume}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, volume: e.target.value }))
                  }
                />
              </div>

              <div className="popup-actions">
                <button
                  className="btn-cancel"
                  type="button"
                  onClick={() => setEditOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="btn-save"
                  type="button"
                  disabled={
                    saving ||
                    !String(editForm.species || "").trim() ||
                    !editForm.startDate
                  }
                  onClick={requestSaveEdit}
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmSaveOpen && (
          <div
            id="confirmSaveYield"
            className="popup-overlay open"
            onClick={(e) => {
              if (e.target === e.currentTarget) setConfirmSaveOpen(false);
            }}
          >
            <div className="confirm-box">
              <div className="confirm-icon">💾</div>
              <div className="confirm-title">ยืนยันการบันทึกข้อมูล</div>
              <div className="confirm-sub">ต้องการบันทึกข้อมูลผลผลิตนี้ใช่หรือไม่?</div>
              <div className="confirm-actions">
                <button
                  className="btn-cancel"
                  type="button"
                  onClick={() => setConfirmSaveOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="btn-save"
                  type="button"
                  disabled={saving}
                  onClick={handleConfirmSave}
                >
                  {saving ? "กำลังบันทึก..." : "ยืนยัน"}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDeleteOpen && (
          <div
            id="confirmDeleteYield"
            className="popup-overlay open"
            onClick={(e) => {
              if (e.target === e.currentTarget) setConfirmDeleteOpen(false);
            }}
          >
            <div className="confirm-box">
              <div className="confirm-icon">🗑</div>
              <div className="confirm-title">ยืนยันการลบข้อมูล</div>
              <div className="confirm-sub">
                ต้องการลบข้อมูลผลผลิตนี้ออกจากระบบ?
                <br />
                การดำเนินการนี้ไม่สามารถกู้คืนได้
              </div>
              <div className="confirm-actions">
                <button
                  className="btn-cancel"
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="btn-confirm"
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteConfirm}
                >
                  {deleting ? "กำลังลบ..." : "ยืนยัน"}
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .yield-error-banner {
            margin-bottom: 10px;
            border-radius: 12px;
            padding: 10px 12px;
            background: #fff3f3;
            border: 1px solid #ffd1d1;
            color: #b42318;
            font-size: 12px;
            line-height: 1.45;
          }

          .yield-table-card {
            min-height: 200px;
            background: #163d0b !important;
            border: 2px solid #163d0b !important;
            border-radius: 22px !important;
            box-shadow: none !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          .yield-table-card > div {
            width: 100%;
            overflow-x: auto;
            border-radius: 20px;
          }

          .yield-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            table-layout: fixed;
            background: #ffffff;
          }

          .yield-table thead th {
            white-space: nowrap;
            text-align: center;
            vertical-align: middle;
            padding: 16px 18px;
            background: #163d0b;
            color: #ffffff;
            font-weight: 800;
          }

          .yield-table thead th:first-child {
            border-top-left-radius: 18px;
          }

          .yield-table thead th:last-child {
            border-top-right-radius: 18px;
          }

          .yield-table tbody td {
            text-align: center;
            vertical-align: middle;
            padding: 14px 18px;
            background: #ffffff !important;
          }

          .yield-table tbody tr {
            height: 76px;
          }

          .yield-table tbody tr:last-child td:first-child {
            border-bottom-left-radius: 18px;
          }

          .yield-table tbody tr:last-child td:last-child {
            border-bottom-right-radius: 18px;
          }

          .yield-table tbody tr:last-child td {
            border-bottom: none;
          }

          .yield-table th:nth-child(1),
          .yield-table td:nth-child(1) {
            width: 16%;
            text-align: center;
          }

          .yield-table th:nth-child(2),
          .yield-table td:nth-child(2) {
            width: 20%;
            text-align: center;
          }

          .yield-table th:nth-child(3),
          .yield-table td:nth-child(3) {
            width: 15%;
          }

          .yield-table th:nth-child(4),
          .yield-table td:nth-child(4) {
            width: 15%;
          }

          .yield-table th:nth-child(5),
          .yield-table td:nth-child(5) {
            width: 14%;
          }

          .yield-table th:nth-child(6),
          .yield-table td:nth-child(6) {
            width: 20%;
          }

          .yield-empty-cell {
            text-align: center !important;
            vertical-align: middle;
            padding: 54px 18px !important;
            color: #7b8794;
            font-weight: 600;
            background: #ffffff !important;
          }

          .yield-actions-cell {
            display: flex;
            gap: 8px;
            flex-wrap: nowrap;
            align-items: center;
            justify-content: center;
          }

          @media (max-width: 900px) {
            .yield-filters {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
            }

            .yield-filter-col .form-select,
            .yield-filter-col .form-input {
              width: 100% !important;
            }
          }

          @media (max-width: 640px) {
            .yield-filters {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}