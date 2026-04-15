"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../components/TopBar";

const AUTH_KEYS = ["AUTH_TOKEN_V1", "token", "authToken", "pmtool_token", "duwims_token"];
const DIRTY_KEY = "DUWIMS_UNSAVED_PASSWORD";

function readToken() {
  if (typeof window === "undefined") return "";
  for (const k of AUTH_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v) return v;
  }
  return "";
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

export default function ChangePasswordPage() {
  const router = useRouter();
  const apiBase = getApiBase();

  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState("local");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupType, setPopupType] = useState("success");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingHref, setPendingHref] = useState("");

  const dirty = useMemo(() => {
    return Boolean(
      currentPassword.trim() ||
        newPassword.trim() ||
        confirmPassword.trim()
    );
  }, [currentPassword, newPassword, confirmPassword]);

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
        setProvider(me?.user?.provider || "local");
      } catch (err) {
        if (!active) return;
        openPopup("error", "โหลดข้อมูลไม่สำเร็จ", err?.message || "ไม่สามารถดึงข้อมูลผู้ใช้ได้");
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

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const askBeforeLeave = (href) => {
    if (!dirty) {
      router.push(href);
      return;
    }

    setPendingHref(href);
    setConfirmTitle("มีการแก้ไขที่ยังไม่บันทึก");
    setConfirmMessage(
      "คุณกำลังอยู่ระหว่างกรอกรหัสผ่าน\nต้องการยกเลิกข้อมูลที่กรอกแล้วเปลี่ยนหน้า หรืออยู่หน้าเดิมต่อ"
    );
    setConfirmOpen(true);
  };

  const onConfirmPopup = () => {
    resetForm();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(DIRTY_KEY);
    }
    setConfirmOpen(false);

    const href = pendingHref;
    setPendingHref("");
    if (href) router.push(href);
  };

  const handleSave = async () => {
    const token = readToken();

    if (!token) {
      openPopup("error", "เปลี่ยนรหัสผ่านไม่สำเร็จ", "ไม่พบ token การเข้าสู่ระบบ");
      return;
    }

    if (provider === "google") {
      openPopup(
        "error",
        "เปลี่ยนรหัสผ่านไม่ได้",
        "บัญชี Google ไม่สามารถเปลี่ยนรหัสผ่านด้วยวิธีนี้ได้"
      );
      return;
    }

    if (!currentPassword.trim()) {
      openPopup("error", "ข้อมูลไม่ครบ", "กรุณากรอกรหัสผ่านปัจจุบัน");
      return;
    }

    if (!newPassword.trim()) {
      openPopup("error", "ข้อมูลไม่ครบ", "กรุณากรอกรหัสผ่านใหม่");
      return;
    }

    if (!confirmPassword.trim()) {
      openPopup("error", "ข้อมูลไม่ครบ", "กรุณากรอกยืนยันรหัสผ่านใหม่");
      return;
    }

    if (newPassword !== confirmPassword) {
      openPopup("error", "เปลี่ยนรหัสผ่านไม่สำเร็จ", "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (newPassword.length < 8) {
      openPopup("error", "เปลี่ยนรหัสผ่านไม่สำเร็จ", "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (currentPassword === newPassword) {
      openPopup("error", "เปลี่ยนรหัสผ่านไม่สำเร็จ", "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม");
      return;
    }

    setSaving(true);

    try {
      await requestJson(`${apiBase}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      resetForm();
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(DIRTY_KEY);
      }

      openPopup("success", "เปลี่ยนรหัสผ่านสำเร็จ", "ระบบได้อัปเดตรหัสผ่านของคุณเรียบร้อยแล้ว");
    } catch (err) {
      openPopup(
        "error",
        "เปลี่ยนรหัสผ่านไม่สำเร็จ",
        err?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้"
      );
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
              ← กลับ
            </button>

            <div className="head-copy">
              <div className="page-title">เปลี่ยนรหัสผ่าน</div>
              <div className="page-subtitle">จัดการรหัสผ่านของบัญชีผู้ใช้งาน</div>
            </div>
          </div>

          {loading ? (
            <div className="state-box">กำลังโหลดข้อมูล...</div>
          ) : provider === "google" ? (
            <div className="state-box">
              บัญชี Google ไม่สามารถเปลี่ยนรหัสผ่านผ่านหน้านี้ได้
            </div>
          ) : (
            <div className="content-wrap">
              <div className="form-grid">
                <div className="field">
                  <label className="label">รหัสผ่านปัจจุบัน</label>
                  <div className="password-wrap">
                    <input
                      className="input"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={saving}
                      placeholder="กรอกรหัสผ่านปัจจุบัน"
                    />
                    <button
                      type="button"
                      className="show-btn"
                      onClick={() => setShowCurrentPassword((v) => !v)}
                      disabled={saving}
                    >
                      {showCurrentPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label className="label">รหัสผ่านใหม่</label>
                  <div className="password-wrap">
                    <input
                      className="input"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={saving}
                      placeholder="กรอกรหัสผ่านใหม่"
                    />
                    <button
                      type="button"
                      className="show-btn"
                      onClick={() => setShowNewPassword((v) => !v)}
                      disabled={saving}
                    >
                      {showNewPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label className="label">ยืนยันรหัสผ่านใหม่</label>
                  <div className="password-wrap">
                    <input
                      className="input"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={saving}
                      placeholder="กรอกยืนยันรหัสผ่านใหม่"
                    />
                    <button
                      type="button"
                      className="show-btn"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      disabled={saving}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="action-row">
                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={resetForm}
                  disabled={saving}
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {popupOpen && (
        <div className="popup-overlay" onClick={() => setPopupOpen(false)}>
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>
            <div className={`popup-icon ${popupType}`}>{popupType === "success" ? "✓" : "!"}</div>
            <div className="popup-title">{popupTitle}</div>
            <div className="popup-message">{popupMessage}</div>
            <button
              type="button"
              className={`popup-btn ${popupType}`}
              onClick={() => setPopupOpen(false)}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="popup-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon warn">!</div>
            <div className="popup-title">{confirmTitle}</div>
            <div className="popup-message">{confirmMessage}</div>
            <div className="popup-actions">
              <button
                type="button"
                className="popup-btn ghost"
                onClick={() => setConfirmOpen(false)}
              >
                อยู่หน้าเดิม
              </button>
              <button
                type="button"
                className="popup-btn danger"
                onClick={onConfirmPopup}
              >
                ยกเลิกการกรอก
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
          max-width: 1420px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #d9e2d7;
          border-radius: 26px;
          padding: 28px 40px 30px;
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

        .page-title {
          font-size: 34px;
          line-height: 1.15;
          font-weight: 900;
          color: #163a19;
        }

        .page-subtitle {
          margin-top: 6px;
          font-size: 16px;
          color: #667564;
        }

        .state-box {
          min-height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #5f6d5c;
          font-size: 16px;
          font-weight: 700;
          text-align: center;
          padding: 12px;
        }

        .content-wrap {
          width: 100%;
        }

        .form-grid {
          display: grid;
          gap: 28px;
        }

        .field {
          display: grid;
          gap: 10px;
        }

        .label {
          font-size: 17px;
          font-weight: 800;
          color: #122812;
        }

        .password-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
        }

        .input {
          flex: 1;
          width: 100%;
          height: 66px;
          border: 1px solid #cdd7ca;
          border-radius: 18px;
          padding: 0 22px;
          font-size: 18px;
          color: #111;
          outline: none;
          background: #fff;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          min-width: 0;
        }

        .input::placeholder {
          color: #7f8a7c;
        }

        .input:focus {
          border-color: #76a97c;
          box-shadow: 0 0 0 4px rgba(118, 169, 124, 0.12);
        }

        .input:disabled {
          background: #f3f6f2;
          color: #556453;
        }

        .show-btn {
          flex: 0 0 124px;
          width: 124px;
          height: 56px;
          border: 0;
          border-radius: 16px;
          background: #edf4ed;
          color: #6f8d6e;
          font-size: 17px;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: auto;
        }

        .show-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .action-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          margin-top: 40px;
        }

        .save-btn,
        .cancel-btn {
          border: 0;
          min-width: 196px;
          height: 58px;
          border-radius: 18px;
          font-size: 20px;
          font-weight: 800;
          cursor: pointer;
          padding: 0 26px;
        }

        .save-btn {
          background: #2f9445;
          color: #fff;
        }

        .cancel-btn {
          background: #e5e5e5;
          color: #333;
        }

        .save-btn:disabled,
        .cancel-btn:disabled,
        .back-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5000;
          padding: 16px;
        }

        .popup-card {
          width: 100%;
          max-width: 390px;
          background: #fff;
          border-radius: 18px;
          padding: 22px 18px 18px;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
          text-align: center;
        }

        .popup-icon {
          width: 58px;
          height: 58px;
          border-radius: 999px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 800;
          color: #fff;
        }

        .popup-icon.success {
          background: #22b35f;
        }

        .popup-icon.error {
          background: #e53935;
        }

        .popup-icon.warn {
          background: #ff9800;
        }

        .popup-title {
          font-size: 18px;
          font-weight: 800;
          color: #111;
          margin-bottom: 8px;
        }

        .popup-message {
          font-size: 13px;
          line-height: 1.55;
          color: #555;
          margin-bottom: 16px;
          white-space: pre-line;
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
          height: 40px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          color: #fff;
        }

        .popup-btn.success {
          background: #1f6fff;
        }

        .popup-btn.danger,
        .popup-btn.error {
          background: #e53935;
        }

        .popup-btn.ghost {
          background: #e3e3e3;
          color: #333;
        }

        @media (max-width: 768px) {
          .page-shell {
            padding: 16px 12px 28px;
          }

          .page-card {
            padding: 18px 16px 20px;
            border-radius: 18px;
          }

          .page-head {
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
          }

          .back-btn {
            min-width: 94px;
            height: 46px;
            font-size: 16px;
          }

          .page-title {
            font-size: 28px;
          }

          .page-subtitle {
            font-size: 15px;
          }

          .label {
            font-size: 16px;
          }

          .password-wrap {
            gap: 10px;
          }

          .input {
            height: 58px;
            font-size: 17px;
            border-radius: 14px;
            padding: 0 16px;
          }

          .show-btn {
            flex: 0 0 88px;
            width: 88px;
            height: 46px;
            font-size: 15px;
            border-radius: 12px;
          }

          .save-btn,
          .cancel-btn {
            min-width: 140px;
            height: 50px;
            font-size: 17px;
          }
        }
      `}</style>
    </>
  );
}