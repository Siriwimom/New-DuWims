"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../components/TopBar";
import { useDuwimsT } from "../components/language-context";

const AUTH_KEYS = ["AUTH_TOKEN_V1", "token", "authToken", "pmtool_token", "duwims_token"];
const DIRTY_KEY = "DUWIMS_UNSAVED_PROFILE";
const PROFILE_UPDATED_EVENT = "duwims-profile-updated";

function readToken() {
  if (typeof window === "undefined") return "";
  for (const k of AUTH_KEYS) {
    try {
      const v = window.localStorage.getItem(k);
      if (v) return v;
    } catch {}
  }
  return "";
}

function writeTokenToAllKeys(token) {
  if (typeof window === "undefined" || !token) return;
  for (const k of AUTH_KEYS) {
    try {
      window.localStorage.setItem(k, token);
    } catch {}
  }
}

function getApiBase() {
  if (typeof window === "undefined") return "";
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    window.localStorage.getItem("NEXT_PUBLIC_API_BASE_URL") ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.detail ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

function getUserIdentity(user = {}) {
  return String(
    user?._id ||
      user?.id ||
      user?.uid ||
      user?.userId ||
      user?.email ||
      user?.ownerUid ||
      ""
  ).trim();
}

function getBackendDisplayName(user = {}) {
  return String(
    user?.nickname ||
      user?.displayName ||
      user?.name ||
      user?.fullName ||
      user?.username ||
      ""
  ).trim();
}

export default function AccountProfilePage() {
  const router = useRouter();
  const apiBase = getApiBase();
  const { lang } = useDuwimsT();

  const txt = {
    back: lang === "en" ? "← Back" : "← กลับ",
    title: lang === "en" ? "Profile Settings" : "ตั้งค่าโปรไฟล์",
    subtitle: lang === "en" ? "Manage your profile information" : "จัดการข้อมูลโปรไฟล์",
    edit: lang === "en" ? "Edit" : "แก้ไข",
    loading: lang === "en" ? "Loading..." : "กำลังโหลดข้อมูล...",
    noNameTitle: lang === "en" ? "No profile name yet" : "ยังไม่มีชื่อผู้ใช้",
    noNameText: lang === "en" ? "Please enter your name" : "กรุณากรอกชื่อ",
    name: lang === "en" ? "Name" : "ชื่อ",
    namePlaceholder: lang === "en" ? "Please enter your name" : "กรุณากรอกชื่อ",
    save: lang === "en" ? "Save" : "บันทึก",
    saving: lang === "en" ? "Saving..." : "กำลังบันทึก...",
    cancel: lang === "en" ? "Cancel" : "ยกเลิก",
    ok: lang === "en" ? "OK" : "ตกลง",
    stayHere: lang === "en" ? "Stay on this page" : "อยู่หน้าเดิม",
    discardEdit: lang === "en" ? "Discard changes" : "ยกเลิกการแก้ไข",

    unsavedTitle: lang === "en" ? "You have unsaved changes" : "มีการแก้ไขที่ยังไม่บันทึก",
    unsavedMessage:
      lang === "en"
        ? "You are currently editing your profile name.\nDo you want to discard your changes and leave this page, or stay here?"
        : "คุณกำลังอยู่ระหว่างแก้ไขชื่อผู้ใช้\nต้องการยกเลิกการแก้ไขแล้วเปลี่ยนหน้า หรืออยู่หน้าเดิมต่อ",

    cancelEditTitle: lang === "en" ? "Cancel editing" : "ยกเลิกการแก้ไข",
    cancelEditMessage:
      lang === "en"
        ? "Do you want to cancel editing and restore the previous name?"
        : "ต้องการยกเลิกการแก้ไขชื่อและกลับไปใช้ข้อมูลเดิมหรือไม่",

    saveFailedTitle: lang === "en" ? "Save failed" : "บันทึกไม่สำเร็จ",
    saveSuccessTitle: lang === "en" ? "Saved successfully" : "บันทึกสำเร็จ",
    saveSuccessMessage:
      lang === "en" ? "Your profile name has been saved." : "บันทึกชื่อเรียบร้อยแล้ว",
    tokenMissing:
      lang === "en" ? "Login token not found." : "ไม่พบ token การเข้าสู่ระบบ",
    nameRequired:
      lang === "en" ? "Please enter your name." : "กรุณากรอกชื่อ",
    saveFailedFallback:
      lang === "en" ? "Unable to save your name." : "ไม่สามารถบันทึกชื่อได้",
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [savedName, setSavedName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [profileIdentity, setProfileIdentity] = useState("");

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupType, setPopupType] = useState("success");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState("");
  const [pendingHref, setPendingHref] = useState("");

  const dirty = useMemo(() => {
    return editMode && String(draftName || "").trim() !== String(savedName || "").trim();
  }, [draftName, savedName, editMode]);

  const hasProfileData = useMemo(() => {
    return Boolean(String(savedName || "").trim());
  }, [savedName]);

  const confirmContent = useMemo(() => {
    if (confirmMode === "reset") {
      return {
        title: txt.cancelEditTitle,
        message: txt.cancelEditMessage,
      };
    }

    return {
      title: txt.unsavedTitle,
      message: txt.unsavedMessage,
    };
  }, [confirmMode, txt.cancelEditMessage, txt.cancelEditTitle, txt.unsavedMessage, txt.unsavedTitle]);

  const openPopup = (type, title, message) => {
    setPopupType(type);
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupOpen(true);
  };

  useEffect(() => {
    const token = readToken();
    if (!token) {
      router.replace("/");
      return;
    }

    let active = true;

    async function loadMe() {
      try {
        const me = await requestJson(`${apiBase}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!active) return;

        const user = me?.user || {};
        const identity = getUserIdentity(user);
        const backendName = getBackendDisplayName(user);

        setProfileIdentity(identity);

        if (backendName) {
          setSavedName(backendName);
          setDraftName(backendName);
          setEditMode(false);
        } else {
          setSavedName("");
          setDraftName("");
          setEditMode(true);
        }
      } catch {
        if (!active) return;

        setProfileIdentity("");
        setSavedName("");
        setDraftName("");
        setEditMode(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMe();

    return () => {
      active = false;
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(DIRTY_KEY);
      }
    };
  }, [apiBase, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (dirty) window.sessionStorage.setItem(DIRTY_KEY, "1");
    else window.sessionStorage.removeItem(DIRTY_KEY);
  }, [dirty]);

  useEffect(() => {
    const beforeUnload = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const askBeforeLeave = (href) => {
    if (!dirty) {
      router.push(href);
      return;
    }

    setPendingHref(href);
    setConfirmMode("leave");
    setConfirmOpen(true);
  };

  const discardAndLeave = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(DIRTY_KEY);
    }
    setDraftName(savedName);
    setEditMode(false);
    setConfirmOpen(false);

    const href = pendingHref;
    setPendingHref("");
    setConfirmMode("");
    if (href) router.push(href);
  };

  const cancelEdit = () => {
    if (!hasProfileData) {
      askBeforeLeave("/dashboard");
      return;
    }

    if (dirty) {
      setPendingHref("__RESET__");
      setConfirmMode("reset");
      setConfirmOpen(true);
      return;
    }

    setDraftName(savedName);
    setEditMode(false);
  };

  const onConfirmPopup = () => {
    if (pendingHref === "__RESET__" || confirmMode === "reset") {
      setDraftName(savedName);
      setEditMode(false);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(DIRTY_KEY);
      }
      setConfirmOpen(false);
      setPendingHref("");
      setConfirmMode("");
      return;
    }

    discardAndLeave();
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setPendingHref("");
    setConfirmMode("");
  };

  const handleSave = async () => {
    const token = readToken();

    if (!token) {
      openPopup("error", txt.saveFailedTitle, txt.tokenMissing);
      return;
    }

    const nextName = String(draftName || "").trim();

    if (!nextName) {
      openPopup("error", txt.saveFailedTitle, txt.nameRequired);
      return;
    }

    setSaving(true);

    try {
      const result = await requestJson(`${apiBase}/auth/update-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nickname: nextName,
        }),
      });

      const updatedUser = result?.user || {};
      const confirmedName = String(
        getBackendDisplayName(updatedUser) || nextName
      ).trim();
      const nextIdentity = getUserIdentity(updatedUser) || profileIdentity;

      if (result?.token) {
        writeTokenToAllKeys(result.token);
      }

      setProfileIdentity(nextIdentity);
      setSavedName(confirmedName);
      setDraftName(confirmedName);
      setEditMode(false);

      if (typeof window !== "undefined") {
        sessionStorage.removeItem(DIRTY_KEY);
        window.dispatchEvent(
          new CustomEvent(PROFILE_UPDATED_EVENT, {
            detail: { name: confirmedName, identity: nextIdentity },
          })
        );
      }

      openPopup("success", txt.saveSuccessTitle, txt.saveSuccessMessage);
    } catch (err) {
      openPopup("error", txt.saveFailedTitle, err?.message || txt.saveFailedFallback);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar />

      <div className="page-shell">
        <div className="page-card">
          <div className="page-head">
            <button
              type="button"
              className="back-btn"
              onClick={() => askBeforeLeave("/dashboard")}
            >
              {txt.back}
            </button>

            <div className="head-copy">
              <div className="page-title">{txt.title}</div>
              <div className="page-subtitle">{txt.subtitle}</div>
            </div>

            {hasProfileData && !loading && !editMode ? (
              <button
                type="button"
                className="top-edit-btn"
                onClick={() => setEditMode(true)}
              >
                {txt.edit}
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="loading-box">{txt.loading}</div>
          ) : !hasProfileData ? (
            <div className="content-wrap">
              <div className="empty-note-card">
                <div className="empty-note-title">{txt.noNameTitle}</div>
                <div className="empty-note-list">{txt.noNameText}</div>
              </div>

              <div className="form-grid one-col">
                <div className="field">
                  <label className="label">
                    {txt.name} <span className="required-star">*</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    disabled={saving}
                    placeholder={txt.namePlaceholder}
                  />
                </div>
              </div>

              <div className="action-row centered-actions">
                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? txt.saving : txt.save}
                </button>

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => askBeforeLeave("/dashboard")}
                  disabled={saving}
                >
                  {txt.cancel}
                </button>
              </div>
            </div>
          ) : !editMode ? (
            <div className="content-wrap">
              <div className="view-grid one-col">
                <div className="view-card">
                  <div className="view-label">{txt.name}</div>
                  <div className="view-value">{savedName || "-"}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="content-wrap">
              <div className="form-grid one-col">
                <div className="field">
                  <label className="label">
                    {txt.name} <span className="required-star">*</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    disabled={saving}
                    placeholder={txt.namePlaceholder}
                  />
                </div>
              </div>

              <div className="action-row centered-actions">
                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? txt.saving : txt.save}
                </button>

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  {txt.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {popupOpen && (
        <div className="popup-overlay" onClick={() => setPopupOpen(false)}>
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>
            <div className={`popup-icon ${popupType}`}>
              {popupType === "success" ? "✓" : "!"}
            </div>
            <div className="popup-title">{popupTitle}</div>
            <div className="popup-message">{popupMessage}</div>
            <button
              type="button"
              className={`popup-btn ${popupType}`}
              onClick={() => setPopupOpen(false)}
            >
              {txt.ok}
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="popup-overlay" onClick={closeConfirm}>
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon warn">!</div>
            <div className="popup-title">{confirmContent.title}</div>
            <div className="popup-message">{confirmContent.message}</div>
            <div className="popup-actions">
              <button
                type="button"
                className="popup-btn ghost"
                onClick={closeConfirm}
              >
                {txt.stayHere}
              </button>
              <button
                type="button"
                className="popup-btn danger"
                onClick={onConfirmPopup}
              >
                {txt.discardEdit}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-shell {
          min-height: calc(100vh - 68px);
          background: #f4f7f3;
          padding: 28px 20px 40px;
        }

        .page-card {
          max-width: 980px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #d9e2d7;
          border-radius: 26px;
          padding: 28px 42px 34px;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
        }

        .page-head {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 28px;
        }

        .head-copy {
          min-width: 0;
          padding-top: 2px;
          flex: 1;
        }

        .back-btn {
          border: 0;
          background: #e6ede4;
          color: #1d5124;
          min-width: 108px;
          height: 54px;
          border-radius: 16px;
          font-size: 18px;
          font-weight: 800;
          cursor: pointer;
          padding: 0 18px;
          flex: 0 0 auto;
        }

        .top-edit-btn {
          border: 0;
          background: #2f9445;
          color: #fff;
          min-width: 120px;
          height: 48px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          padding: 0 18px;
          flex: 0 0 auto;
        }

        .page-title {
          font-size: 30px;
          line-height: 1.2;
          font-weight: 900;
          color: #15381a;
        }

        .page-subtitle {
          margin-top: 6px;
          font-size: 16px;
          color: #58705c;
          font-weight: 600;
        }

        .loading-box {
          min-height: 220px;
          display: grid;
          place-items: center;
          font-size: 20px;
          font-weight: 800;
          color: #315c39;
        }

        .content-wrap {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
        }

        .empty-note-card,
        .view-card {
          background: #f7faf6;
          border: 1px solid #dbe7d8;
          border-radius: 18px;
          padding: 18px 20px;
        }

        .empty-note-title,
        .view-label {
          font-size: 18px;
          font-weight: 900;
          color: #214b29;
          margin-bottom: 8px;
        }

        .empty-note-list,
        .view-value,
        .field-hint {
          font-size: 16px;
          color: #39553d;
          line-height: 1.6;
        }

        .form-grid,
        .view-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          width: 100%;
        }

        .one-col {
          grid-template-columns: 1fr;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 100%;
        }

        .label {
          font-size: 16px;
          font-weight: 800;
          color: #1f4626;
        }

        .required-star {
          color: #d93a3a;
        }

        .input {
          width: 100%;
          min-width: 0;
          height: 76px;
          border-radius: 20px;
          border: 1px solid #cdd9ca;
          padding: 0 22px;
          font-size: 20px;
          font-weight: 700;
          outline: none;
          background: #fff;
          box-sizing: border-box;
        }

        .input::placeholder {
          color: #8a9688;
          font-weight: 600;
        }

        .action-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .centered-actions {
          justify-content: center;
          align-items: center;
          width: 100%;
          margin-top: 4px;
        }

        .save-btn,
        .delete-btn,
        .cancel-btn {
          border: 0;
          min-width: 168px;
          height: 58px;
          border-radius: 18px;
          padding: 0 24px;
          font-size: 18px;
          font-weight: 800;
          cursor: pointer;
        }

        .save-btn {
          background: #2f9445;
          color: #fff;
        }

        .delete-btn {
          background: #f1e3c8;
          color: #7a4b00;
        }

        .cancel-btn {
          background: #e9ece8;
          color: #304235;
        }

        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .popup-card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 22px;
          padding: 24px 22px;
          box-shadow: 0 18px 50px rgba(0,0,0,0.18);
          text-align: center;
        }

        .popup-icon {
          width: 58px;
          height: 58px;
          border-radius: 999px;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          font-size: 28px;
          font-weight: 900;
        }

        .popup-icon.success {
          background: #e4f7e8;
          color: #1f8b39;
        }

        .popup-icon.error,
        .popup-icon.warn {
          background: #fde8e8;
          color: #c73636;
        }

        .popup-title {
          font-size: 22px;
          font-weight: 900;
          color: #1d3421;
          margin-bottom: 8px;
        }

        .popup-message {
          white-space: pre-line;
          font-size: 16px;
          line-height: 1.6;
          color: #425847;
          margin-bottom: 16px;
        }

        .popup-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .popup-btn {
          border: 0;
          min-width: 120px;
          height: 46px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          padding: 0 16px;
        }

        .popup-btn.success {
          background: #2f9445;
          color: #fff;
        }

        .popup-btn.error,
        .popup-btn.danger {
          background: #d64a4a;
          color: #fff;
        }

        .popup-btn.ghost {
          background: #ecefed;
          color: #314436;
        }

        @media (max-width: 768px) {
          .form-grid,
          .view-grid {
            grid-template-columns: 1fr;
          }

          .page-head {
            flex-wrap: wrap;
          }

          .page-card {
            padding: 22px 18px 24px;
          }

          .input {
            height: 64px;
            font-size: 18px;
            border-radius: 16px;
            padding: 0 18px;
          }

          .save-btn,
          .cancel-btn,
          .delete-btn {
            min-width: 140px;
            height: 54px;
          }
        }
      `}</style>
    </>
  );
}
