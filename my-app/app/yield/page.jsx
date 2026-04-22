"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DuwimsStaticPage from "../components/DuwimsStaticPage";
import { useDuwimsT } from "../components/language-context";

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

function formatDisplayDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
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

function getDateDisplayText(value) {
  const formatted = formatDisplayDate(value);
  return formatted === "-" ? "dd/mm/yyyy" : formatted;
}

function formatVolume(value, lang = "th") {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(lang === "en" ? "en-US" : "th-TH");
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

function isHarvestBeforeStart(startDate, harvestDate) {
  if (!startDate || !harvestDate) return false;
  return String(harvestDate) < String(startDate);
}

function escapeCsvValue(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toExcelTextValue(value) {
  const text = value === null || value === undefined ? "" : String(value).trim();
  if (!text) return "";
  return `="${text.replace(/"/g, '""')}"`;
}

function toExcelDateValue(value) {
  const formatted = formatDisplayDate(value);
  if (formatted === "-") return "";
  return toExcelTextValue(formatted);
}

function toExcelNumberValue(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return toExcelTextValue(String(n));
}

function encodeUtf16LE(text) {
  const bytes = new Uint8Array(2 + text.length * 2);
  bytes[0] = 0xff;
  bytes[1] = 0xfe;

  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    bytes[2 + i * 2] = code & 0xff;
    bytes[3 + i * 2] = code >> 8;
  }

  return bytes;
}

function createLocalCsvTimestamp(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}_${hh}.${mi}.${ss}`;
}

export default function YieldPage() {
  const { lang, t } = useDuwimsT();

  const tx = useMemo(
    () => ({
      title: lang === "en" ? "🌾 Management Planting" : "🌾 Management Planting",
      addYield: lang === "en" ? "＋ Add Yield Data" : "＋ เพิ่มข้อมูลผลผลิต",
      exportCsv: lang === "en" ? "⬇ Export CSV" : "⬇ Export CSV",

      plot: lang === "en" ? "Plot" : "แปลง",
      allPlots: lang === "en" ? "All Plots" : "ทุกแปลง",

      species: lang === "en" ? "Plant Type" : "ชนิดพืช",
      allSpecies: lang === "en" ? "All Types" : "ทุกชนิด",

      startDate: lang === "en" ? "Start Date" : "วันที่เริ่มต้น",
      endDate: lang === "en" ? "End Date" : "วันที่สิ้นสุด",

      plantingDate: lang === "en" ? "Planting Date" : "วันที่ปลูก",
      harvestDate: lang === "en" ? "Harvest Date" : "วันที่เก็บเกี่ยว",
      volume: lang === "en" ? "Volume (tons)" : "ปริมาณ (ตัน)",
      manage: lang === "en" ? "Manage" : "จัดการ",

      loading: lang === "en" ? "Loading data..." : "กำลังโหลดข้อมูล...",
      noData: lang === "en" ? "No data yet" : "ยังไม่มีข้อมูล",

      createPopupTitle: lang === "en" ? "🌾 Add Yield Data" : "🌾 เพิ่มข้อมูลผลผลิต",
      editPopupTitle: lang === "en" ? "✏️ Edit Yield Data" : "✏️ แก้ไขข้อมูลผลผลิต",

      selectPlot: lang === "en" ? "Select Plot" : "เลือกแปลง",
      plantType: lang === "en" ? "Plant Type" : "ชนิดพืช",
      plantTypePlaceholder: lang === "en" ? "e.g. Durian" : "เช่น ทุเรียน",
      startPlantingDate: lang === "en" ? "Planting Start Date" : "วันที่เริ่มปลูก",
      harvestDateField: lang === "en" ? "Harvest Date" : "วันที่เก็บเกี่ยว",
      yieldVolume: lang === "en" ? "Yield Volume (tons)" : "ปริมาณผลผลิต (ตัน)",

      cancel: t.cancel || (lang === "en" ? "Cancel" : "ยกเลิก"),
      save: t.save || (lang === "en" ? "Save" : "บันทึก"),
      confirm: t.confirm || (lang === "en" ? "Confirm" : "ยืนยัน"),

      edit: lang === "en" ? "✏️ Edit" : "✏️ แก้ไข",
      delete: lang === "en" ? "🗑 Delete" : "🗑 ลบ",

      plotLocked: lang === "en" ? "Plot" : "แปลง",
      cannotChange: lang === "en" ? "(cannot change)" : "(ห้ามเปลี่ยน)",
      cannotChangePlot:
        lang === "en"
          ? "⛔ Plot cannot be changed"
          : "⛔ ไม่สามารถเปลี่ยนแปลงแปลงปลูกได้",

      confirmSaveTitle:
        lang === "en" ? "Confirm Saving Data" : "ยืนยันการบันทึกข้อมูล",
      confirmSaveSub:
        lang === "en"
          ? "Do you want to save this yield data?"
          : "ต้องการบันทึกข้อมูลผลผลิตนี้ใช่หรือไม่?",

      confirmDeleteTitle:
        lang === "en" ? "Confirm Deletion" : "ยืนยันการลบข้อมูล",
      confirmDeleteSub1:
        lang === "en"
          ? "Do you want to remove this yield data from the system?"
          : "ต้องการลบข้อมูลผลผลิตนี้ออกจากระบบ?",
      confirmDeleteSub2:
        lang === "en"
          ? "This action cannot be undone."
          : "การดำเนินการนี้ไม่สามารถกู้คืนได้",

      saving: lang === "en" ? "Saving..." : "กำลังบันทึก...",
      deleting: lang === "en" ? "Deleting..." : "กำลังลบ...",

      loadFailed: lang === "en" ? "Failed to load data" : "โหลดข้อมูลไม่สำเร็จ",
      saveFailed: lang === "en" ? "Failed to save data" : "บันทึกข้อมูลไม่สำเร็จ",
      deleteFailed: lang === "en" ? "Failed to delete data" : "ลบข้อมูลไม่สำเร็จ",

      leaveTitle:
        lang === "en" ? "Unsaved changes" : "มีการแก้ไขที่ยังไม่บันทึก",
      leaveSub1:
        lang === "en"
          ? "You are currently creating or editing yield data."
          : "คุณกำลังอยู่ระหว่างเพิ่มหรือแก้ไขข้อมูลผลผลิต",
      leaveSub2:
        lang === "en"
          ? "Do you want to cancel editing and leave this page?"
          : "ต้องการยกเลิกการแก้ไขแล้วเปลี่ยนหน้า หรืออยู่หน้าเดิมต่อ",
      stayHere: lang === "en" ? "Stay" : "อยู่หน้าเดิม",
      leavePage: lang === "en" ? "Leave page" : "ยกเลิกการแก้ไขและเปลี่ยนหน้า",
      loginRequired:
        lang === "en"
          ? "Please log in before accessing this page."
          : "กรุณาเข้าสู่ระบบก่อนเข้าใช้งานหน้านี้",

      harvestInvalid:
        lang === "en"
          ? "Harvest date cannot be earlier than planting date."
          : "วันที่เก็บเกี่ยวห้ามก่อนวันที่ปลูก",

      exportNoData:
        lang === "en"
          ? "No data available for CSV export."
          : "ไม่มีข้อมูลสำหรับ Export CSV",
    }),
    [lang, t]
  );

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
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const [createForm, setCreateForm] = useState(createEmptyForm());
  const [editForm, setEditForm] = useState(createEmptyForm());

  const [saveMode, setSaveMode] = useState("create");
  const [pendingDelete, setPendingDelete] = useState(null);

  const pendingNavigationRef = useRef(null);
  const allowNavigationRef = useRef(false);

  const isEditing = createOpen || editOpen;

  const createDateInvalid = isHarvestBeforeStart(createForm.startDate, createForm.harvestDate);
  const editDateInvalid = isHarvestBeforeStart(editForm.startDate, editForm.harvestDate);

  const plotMap = useMemo(() => {
    const map = {};
    plots.forEach((plot, index) => {
      map[String(plot.id)] = {
        ...plot,
        fallbackLabel: lang === "en" ? `Plot ${index + 1}` : `แปลง ${index + 1}`,
      };
    });
    return map;
  }, [plots, lang]);

  const plotOptions = useMemo(() => {
    return plots.map((plot, index) => ({
      id: plot.id,
      label:
        plot.plotName ||
        plot.alias ||
        plot.name ||
        (lang === "en" ? `Plot ${index + 1}` : `แปลง ${index + 1}`),
    }));
  }, [plots, lang]);

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

  function redirectToLogin() {
    if (typeof window === "undefined") return;
    try {
      window.location.replace("/");
    } catch {
      window.location.replace("/");
    }
  }

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      await bootstrapAuthFromUrl();

      const token = getToken();
      if (!token) {
        redirectToLogin();
        return;
      }

      const [plotsRes, managementRes] = await Promise.all([
        apiFetch("/api/plots"),
        apiFetch("/api/management-plants"),
      ]);

      setPlots(Array.isArray(plotsRes?.items) ? plotsRes.items : []);
      setItems(Array.isArray(managementRes?.items) ? managementRes.items : []);
    } catch (err) {
      const message = err?.message || tx.loadFailed;

      if (
        /401|403|unauthorized|forbidden|jwt|token/i.test(String(message || ""))
      ) {
        redirectToLogin();
        return;
      }

      setError(message);
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

  useEffect(() => {
    if (!isEditing) {
      pendingNavigationRef.current = null;
      allowNavigationRef.current = false;
      setConfirmLeaveOpen(false);
    }
  }, [isEditing]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = (e) => {
      if (!isEditing || allowNavigationRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isEditing]);

  useEffect(() => {
    if (typeof window === "undefined" || !isEditing) return;

    window.history.pushState({ yieldGuard: true }, "", window.location.href);

    const handlePopState = () => {
      if (allowNavigationRef.current) return;
      pendingNavigationRef.current = { type: "back" };
      setConfirmLeaveOpen(true);
      window.history.pushState({ yieldGuard: true }, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isEditing]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleDocumentClick = (e) => {
      if (!isEditing || allowNavigationRef.current) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = e.target?.closest?.("a[href]");
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href") || "";
      if (!rawHref) return;
      if (rawHref.startsWith("#")) return;
      if (rawHref.startsWith("javascript:")) return;
      if (rawHref.startsWith("mailto:")) return;
      if (rawHref.startsWith("tel:")) return;
      if (anchor.getAttribute("target") === "_blank") return;
      if (anchor.hasAttribute("download")) return;

      const targetUrl = new URL(rawHref, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (targetUrl.href === currentUrl.href) return;

      e.preventDefault();
      pendingNavigationRef.current = { type: "href", href: targetUrl.href };
      setConfirmLeaveOpen(true);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [isEditing]);

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
    setError("");
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
    setError("");
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
    if (createDateInvalid) {
      setError(tx.harvestInvalid);
      return;
    }
    setSaveMode("create");
    setConfirmSaveOpen(true);
  }

  function requestSaveEdit() {
    if (editDateInvalid) {
      setError(tx.harvestInvalid);
      return;
    }
    setSaveMode("edit");
    setConfirmSaveOpen(true);
  }

  function resetFiltersForView() {
    setFilterPlot("");
    setFilterSpecies("");
    setFilterStartDate("");
    setFilterEndDate("");
  }

  function closeCreatePopup() {
    setCreateOpen(false);
  }

  function closeEditPopup() {
    setEditOpen(false);
  }

  function handleStayOnPage() {
    pendingNavigationRef.current = null;
    setConfirmLeaveOpen(false);
  }

  function handleLeavePage() {
    const pending = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setConfirmLeaveOpen(false);
    allowNavigationRef.current = true;
    setCreateOpen(false);
    setEditOpen(false);

    if (typeof window === "undefined") return;

    if (pending?.type === "back") {
      window.history.back();
      return;
    }

    if (pending?.type === "href" && pending.href) {
      window.location.href = pending.href;
    }
  }

  function handleExportCsv() {
    try {
      if (!filteredItems.length) {
        setError(tx.exportNoData);
        return;
      }

      setError("");

      const delimiter = "\t";
      const header = [
        lang === "en" ? "Plot" : "แปลง",
        lang === "en" ? "Plant Species" : "ชนิดของพืช",
        lang === "en" ? "Planting Date" : "วันที่ปลูก",
        lang === "en" ? "Harvest Date" : "วันที่เก็บเกี่ยว",
        lang === "en" ? "Volume (tons)" : "ปริมาณ (ตัน)",
      ];

      const rows = filteredItems.map((item) => [
        getPlotLabelById(item?.plot),
        item?.species || "",
        formatDisplayDate(item?.startDate) === "-" ? "" : formatDisplayDate(item?.startDate),
        formatDisplayDate(item?.harvestDate) === "-" ? "" : formatDisplayDate(item?.harvestDate),
        item?.volume === null || item?.volume === undefined || item?.volume === ""
          ? ""
          : String(Number(item.volume)),
      ]);

      const exportRows = [
        header,
        ...rows.map((row) => [
          row[0],
          row[1],
          row[2] ? `="${row[2]}"` : "",
          row[3] ? `="${row[3]}"` : "",
          row[4] === "" ? "" : `="${row[4]}"`,
        ]),
      ];

      const csv = exportRows
        .map((row) => row.map(escapeCsvValue).join(delimiter))
        .join("\r\n");

      const encoded = encodeUtf16LE(csv);
      const blob = new Blob([encoded], {
        type: "text/tab-separated-values;charset=utf-16le;",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yield-data-${createLocalCsvTimestamp()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError(tx.exportNoData);
    }
  }

  async function handleConfirmSave() {
    const form = saveMode === "create" ? createForm : editForm;

    if (isHarvestBeforeStart(form.startDate, form.harvestDate)) {
      setError(tx.harvestInvalid);
      setConfirmSaveOpen(false);
      return;
    }

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
      setError(err?.message || tx.saveFailed);
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
      setError(err?.message || tx.deleteFailed);
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
            marginBottom: 18,
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div className="card-title yield-page-title">
            {tx.title}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              className="export-btn"
              style={{ marginBottom: 0 }}
              onClick={handleExportCsv}
              type="button"
            >
              {tx.exportCsv}
            </button>
            <button
              className="create-btn yield-create-btn"
              style={{ marginBottom: 0 }}
              onClick={openCreatePopup}
              type="button"
            >
              {tx.addYield}
            </button>
          </div>
        </div>

        {error ? <div className="yield-error-banner">{error}</div> : null}

        <div className="yield-filters responsive-yield-filters">
          <div className="yield-filter-col">
            <div className="filter-label yield-filter-label">{tx.plot}</div>
            <select
              className="form-select yield-filter-input"
              
              value={filterPlot}
              onChange={(e) => setFilterPlot(e.target.value)}
            >
              <option value="">{tx.allPlots}</option>
              {plotOptions.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.label}
                </option>
              ))}
            </select>
          </div>

          <div className="yield-filter-col">
            <div className="filter-label yield-filter-label">{tx.species}</div>
            <select
              className="form-select yield-filter-input"
              
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
            >
              <option value="">{tx.allSpecies}</option>
              {speciesOptions.map((species) => (
                <option key={species} value={species}>
                  {species}
                </option>
              ))}
            </select>
          </div>

          <div className="yield-filter-col">
            <div className="filter-label yield-filter-label">{tx.startDate}</div>
            <input
              type="date"
              className="form-input date-input-clean yield-filter-input"
              data-display={getDateDisplayText(filterStartDate)}
              
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>

          <div className="yield-filter-col">
            <div className="filter-label yield-filter-label">{tx.endDate}</div>
            <input
              type="date"
              className="form-input date-input-clean yield-filter-input"
              data-display={getDateDisplayText(filterEndDate)}
              
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
                  <th>{tx.plot}</th>
                  <th>{lang === "en" ? "Plant Species" : "ชนิดของพืช"}</th>
                  <th>{tx.plantingDate}</th>
                  <th>{tx.harvestDate}</th>
                  <th>{tx.volume}</th>
                  <th>{tx.manage}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="yield-empty-cell">
                      {tx.loading}
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="yield-empty-cell">
                      {tx.noData}
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
                        <td>{formatDisplayDate(item?.startDate)}</td>
                        <td>{formatDisplayDate(item?.harvestDate)}</td>
                        <td>
                          <strong>{formatVolume(item?.volume, lang)}</strong>
                        </td>
                        <td className="yield-actions-cell">
                          <div className="yield-actions-inner">
                            <button
                              className="edit-row-btn"
                              type="button"
                              onClick={() => openEditPopup(item)}
                            >
                              {tx.edit}
                            </button>
                            <button
                              className="del-row-btn"
                              type="button"
                              onClick={() => openDeletePopup(item)}
                            >
                              {tx.delete}
                            </button>
                          </div>
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
              if (e.target === e.currentTarget) closeCreatePopup();
            }}
          >
            <div className="popup-box">
              <div className="popup-title">{tx.createPopupTitle}</div>
              <button
                className="popup-close"
                type="button"
                onClick={closeCreatePopup}
              >
                ✕
              </button>

              <div className="form-field">
                <div className="form-field-label">{tx.selectPlot}</div>
                <select
                  className="form-select"
                  value={createForm.plot}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, plot: e.target.value }))
                  }
                >
                  {plotOptions.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <div className="form-field-label">{tx.plantType}</div>
                <input
                  className="form-input"
                  placeholder={tx.plantTypePlaceholder}
                  value={createForm.species}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, species: e.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <div className="form-field-label">{tx.startPlantingDate}</div>
                <input
                  className="form-input date-input-clean"
                  type="date"
                  data-display={getDateDisplayText(createForm.startDate)}
                  value={createForm.startDate}
                  onChange={(e) =>
                    setCreateForm((prev) => {
                      const nextStartDate = e.target.value;
                      const nextHarvestDate =
                        prev.harvestDate && prev.harvestDate < nextStartDate
                          ? ""
                          : prev.harvestDate;

                      return {
                        ...prev,
                        startDate: nextStartDate,
                        harvestDate: nextHarvestDate,
                      };
                    })
                  }
                />
              </div>

              <div className="form-field">
                <div className="form-field-label">{tx.harvestDateField}</div>
                <input
                  className="form-input date-input-clean"
                  type="date"
                  data-display={getDateDisplayText(createForm.harvestDate)}
                  min={createForm.startDate || undefined}
                  value={createForm.harvestDate}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, harvestDate: e.target.value }))
                  }
                />
                {createDateInvalid ? (
                  <div className="date-error-text">{tx.harvestInvalid}</div>
                ) : null}
              </div>

              <div className="form-field">
                <div className="form-field-label">{tx.yieldVolume}</div>
                <input
                  className="form-input"
                  type="number"
                  placeholder=""
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
                  onClick={closeCreatePopup}
                >
                  {tx.cancel}
                </button>
                <button
                  className="btn-save"
                  type="button"
                  disabled={
                    saving ||
                    !createForm.plot ||
                    !String(createForm.species || "").trim() ||
                    !createForm.startDate ||
                    createDateInvalid
                  }
                  onClick={requestSaveCreate}
                >
                  {tx.save}
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
              if (e.target === e.currentTarget) closeEditPopup();
            }}
          >
            <div className="popup-box">
              <div className="popup-title">{tx.editPopupTitle}</div>
              <button
                className="popup-close"
                type="button"
                onClick={closeEditPopup}
              >
                ✕
              </button>

              <div className="form-field">
                <div className="form-field-label">
                  {tx.plotLocked}{" "}
                  <span style={{ color: "#c62828", fontSize: 9 }}>{tx.cannotChange}</span>
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
                  {tx.cannotChangePlot}
                </div>
              </div>

              <div className="form-field">
                <div className="form-field-label">{tx.plantType}</div>
                <input
                  className="form-input"
                  value={editForm.species}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, species: e.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <div className="form-field-label">{tx.startPlantingDate}</div>
                <input
                  className="form-input date-input-clean"
                  type="date"
                  data-display={getDateDisplayText(editForm.startDate)}
                  value={editForm.startDate}
                  onChange={(e) =>
                    setEditForm((prev) => {
                      const nextStartDate = e.target.value;
                      const nextHarvestDate =
                        prev.harvestDate && prev.harvestDate < nextStartDate
                          ? ""
                          : prev.harvestDate;

                      return {
                        ...prev,
                        startDate: nextStartDate,
                        harvestDate: nextHarvestDate,
                      };
                    })
                  }
                />
              </div>

              <div className="form-field">
                <div className="form-field-label">{tx.harvestDateField}</div>
                <input
                  className="form-input date-input-clean"
                  type="date"
                  data-display={getDateDisplayText(editForm.harvestDate)}
                  min={editForm.startDate || undefined}
                  value={editForm.harvestDate}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, harvestDate: e.target.value }))
                  }
                />
                {editDateInvalid ? (
                  <div className="date-error-text">{tx.harvestInvalid}</div>
                ) : null}
              </div>

              <div className="form-field">
                <div className="form-field-label">{tx.yieldVolume}</div>
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
                  onClick={closeEditPopup}
                >
                  {tx.cancel}
                </button>
                <button
                  className="btn-save"
                  type="button"
                  disabled={
                    saving ||
                    !String(editForm.species || "").trim() ||
                    !editForm.startDate ||
                    editDateInvalid
                  }
                  onClick={requestSaveEdit}
                >
                  {tx.save}
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
              <div className="confirm-title">{tx.confirmSaveTitle}</div>
              <div className="confirm-sub">{tx.confirmSaveSub}</div>
              <div className="confirm-actions">
                <button
                  className="btn-cancel"
                  type="button"
                  onClick={() => setConfirmSaveOpen(false)}
                >
                  {tx.cancel}
                </button>
                <button
                  className="btn-save"
                  type="button"
                  disabled={saving}
                  onClick={handleConfirmSave}
                >
                  {saving ? tx.saving : tx.confirm}
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
              <div className="confirm-title">{tx.confirmDeleteTitle}</div>
              <div className="confirm-sub">
                {tx.confirmDeleteSub1}
                <br />
                {tx.confirmDeleteSub2}
              </div>
              <div className="confirm-actions">
                <button
                  className="btn-cancel"
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                >
                  {tx.cancel}
                </button>
                <button
                  className="btn-confirm"
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteConfirm}
                >
                  {deleting ? tx.deleting : tx.confirm}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmLeaveOpen && (
          <div
            id="confirmLeaveYield"
            className="popup-overlay open"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleStayOnPage();
            }}
          >
            <div className="confirm-box">
              <div className="confirm-icon">⚠️</div>
              <div className="confirm-title">{tx.leaveTitle}</div>
              <div className="confirm-sub">
                {tx.leaveSub1}
                <br />
                {tx.leaveSub2}
              </div>
              <div className="confirm-actions">
                <button
                  className="btn-cancel"
                  type="button"
                  onClick={handleStayOnPage}
                >
                  {tx.stayHere}
                </button>
                <button
                  className="btn-confirm"
                  type="button"
                  onClick={handleLeavePage}
                >
                  {tx.leavePage}
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .yield-page-title {
            font-size: 21px !important;
            font-weight: 800;
            line-height: 1.35;
          }

          .yield-error-banner {
            margin-bottom: 12px;
            border-radius: 12px;
            padding: 12px 14px;
            background: #fff3f3;
            border: 1px solid #ffd1d1;
            color: #b42318;
            font-size: 14px;
            line-height: 1.5;
            word-break: break-word;
            overflow-wrap: break-word;
          }

          .yield-filter-label {
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 0.04em;
            margin-bottom: 6px;
          }

          .yield-filter-input {
            width: 100%;
            width: 100%;
            min-width: 240px;
            font-size: 17px;
            min-height: 56px;
            padding-left: 18px;
            padding-right: 18px;
            border-radius: 20px;
          }

          .date-error-text {
            margin-top: 6px;
            color: #c62828;
            font-size: 13px;
            font-weight: 700;
            line-height: 1.45;
          }

          .date-input-clean {
            position: relative;
            color: transparent !important;
            caret-color: transparent;
          }

          .date-input-clean::-webkit-datetime-edit,
          .date-input-clean::-webkit-datetime-edit-text,
          .date-input-clean::-webkit-datetime-edit-month-field,
          .date-input-clean::-webkit-datetime-edit-day-field,
          .date-input-clean::-webkit-datetime-edit-year-field {
            color: transparent !important;
          }

           .date-input-clean::before {
            content: attr(data-display);
            position: absolute;
            left: 18px;
            top: 50%;
            transform: translateY(-50%);
            color: #111827;
            pointer-events: none;
            white-space: nowrap;
            font-size: 17px;
          }

          .date-input-clean:focus::before {
            color: #111827;
          }

          .date-input-clean::-webkit-calendar-picker-indicator {
            opacity: 1;
            cursor: pointer;
            position: relative;
            z-index: 1;
          }

          .date-input-clean::-ms-value {
            color: transparent;
          }

          .export-btn,
          .yield-create-btn {
            font-size: 18px;
            font-weight: 800;
            min-height: 50px;
            padding: 12px 20px;
            border-radius: 18px;
          }

          .export-btn {
            border: none;
            background: #ffffff;
            color: #163d0b;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          }

          .yield-table-card {
            min-height: auto;
            background: #ffffff !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 22px !important;
            box-shadow: none !important;
            padding: 0 !important;
            overflow: hidden !important;
            width: 100%;
            min-width: 0;
          }

          .yield-table-card > div {
            width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            border-radius: 20px;
          }

          .yield-table {
            width: 100%;
            min-width: 1120px;
            border-collapse: separate;
            border-spacing: 0;
            table-layout: fixed;
            background: #ffffff;
          }

           .yield-table thead th {
            white-space: nowrap;
            text-align: center;
            vertical-align: middle;
            font-size: 17px;
            line-height: 1.3;
            padding: 22px 20px;
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
            font-size: 17px;
            line-height: 1.35;
            padding: 16px 14px;
            background: #ffffff !important;
            word-break: break-word;
            overflow-wrap: break-word;
          }

           .yield-table tbody td strong {
            font-size: 17px;
            font-weight: 800;
          }

          .yield-table tbody tr {
            height: 96px;
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

          .yield-table th,
          .yield-table td {
            width: calc(100% / 6);
          }

          .yield-table th:nth-child(1),
          .yield-table td:nth-child(1),
          .yield-table th:nth-child(2),
          .yield-table td:nth-child(2),
          .yield-table th:nth-child(3),
          .yield-table td:nth-child(3),
          .yield-table th:nth-child(4),
          .yield-table td:nth-child(4),
          .yield-table th:nth-child(5),
          .yield-table td:nth-child(5),
          .yield-table th:nth-child(6),
          .yield-table td:nth-child(6) {
            width: calc(100% / 6);
          }

          .yield-table th:nth-child(1) {
            text-align: left;
            padding-left: 28px;
          }

          .yield-table td:nth-child(1) {
            text-align: left;
            padding-left: 28px;
          }

          .yield-table th:nth-child(2),
          .yield-table td:nth-child(2),
          .yield-table th:nth-child(3),
          .yield-table td:nth-child(3),
          .yield-table th:nth-child(4),
          .yield-table td:nth-child(4),
          .yield-table th:nth-child(5),
          .yield-table td:nth-child(5),
          .yield-table th:nth-child(6),
          .yield-table td:nth-child(6) {
            text-align: center;
          }

          .yield-empty-cell {
            text-align: center !important;
            vertical-align: middle;
            padding: 58px 18px !important;
            color: #7b8794;
            font-weight: 600;
            font-size: 18px;
            background: #ffffff !important;
          }

          .yield-actions-cell {
            text-align: center;
            vertical-align: middle;
          }

          .yield-actions-inner {
            display: flex;
            flex-direction: row;
            gap: 10px;
            align-items: center;
            justify-content: center;
            width: 100%;
            flex-wrap: nowrap;
          }

          .yield-actions-inner :global(.edit-row-btn),
          .yield-actions-inner :global(.del-row-btn) {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 76px;
            min-width: 76px;
            min-height: 38px;
            padding: 7px 10px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 12px;
            white-space: nowrap;
            box-sizing: border-box;
          }

          .yield-filters {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
            align-items: end;
            margin-bottom: 20px;
          }

          .yield-filter-col {
            min-width: 0;
          }

          @media (max-width: 1200px) {
             .yield-filters {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
            }

            .yield-filter-col {
              min-width: 0;
            }

            .yield-filter-col .form-select,
            .yield-filter-col .form-input {
              width: 100% !important;
              min-width: 0;
            }

             .yield-table {
              min-width: 1040px;
            }
          }

          @media (max-width: 900px) {
             .yield-page-title {
              font-size: 19px !important;
            }

             .yield-filters {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
            }

            .yield-filter-col {
              min-width: 0;
            }

            .yield-filter-col .form-select,
            .yield-filter-col .form-input {
              width: 100% !important;
              min-width: 0;
            }

             .yield-table {
              min-width: 980px;
            }

            .yield-table thead th {
              font-size: 18px;
              padding: 18px 16px;
            }

            .yield-table tbody td {
              font-size: 14px;
              padding: 16px 14px;
            }

            .yield-table tbody tr {
              height: 88px;
            }
          }

          @media (max-width: 640px) {
            .yield-filters {
              display: grid;
              grid-template-columns: 1fr;
              gap: 10px;
            }

            .yield-filter-col {
              min-width: 0;
            }

            .yield-filter-col .form-select,
            .yield-filter-col .form-input {
              width: 100% !important;
              min-width: 0;
            }

             .yield-table {
              min-width: 900px;
            }

            .yield-table thead th {
              padding: 14px 12px;
              font-size: 13px;
            }

            .yield-table tbody td {
              padding: 14px 12px;
              font-size: 13px;
            }

            .yield-actions-inner {
              flex-direction: row;
              gap: 8px;
              justify-content: center;
            }

            .yield-actions-inner > * {
              width: auto;
              min-width: 92px;
            }
          }

          @media (max-width: 480px) {
             .yield-table {
              min-width: 860px;
            }

            .yield-table thead th,
            .yield-table tbody td {
              padding: 12px 10px;
              font-size: 12px;
            }

            .yield-empty-cell {
              padding: 40px 12px !important;
              font-size: 12px;
            }
          }
        `}</style>
      </div>
    </DuwimsStaticPage>
  );
}
