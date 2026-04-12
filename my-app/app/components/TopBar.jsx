"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDuwimsT } from "./language-context";

const AUTH_KEYS = ["AUTH_TOKEN_V1", "token", "authToken", "pmtool_token", "duwims_token"];

function readToken() {
  if (typeof window === "undefined") return "";
  for (const k of AUTH_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v) return v;
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

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function getInitials(name = "") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return String(name || "U").slice(0, 2).toUpperCase();
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

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useDuwimsT();

  const [hasToken, setHasToken] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [displayName, setDisplayName] = useState("ผู้ใช้งาน");
  const [email, setEmail] = useState("user@example.com");
  const [provider, setProvider] = useState("local");
  const [ownerUid, setOwnerUid] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [linkOwnerUid, setLinkOwnerUid] = useState("");
  const [linkingOwner, setLinkingOwner] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const [draftDisplayName, setDraftDisplayName] = useState("ผู้ใช้งาน");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupType, setPopupType] = useState("success");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");

  const menuRef = useRef(null);
  const profileRef = useRef(null);

  const apiBase = getApiBase();

  const syncAuth = async () => {
    try {
      const token = readToken();
      setHasToken(!!token);

      if (token) {
        const payload = parseJwt(token);
        const nextRole = String(payload?.role || "").toLowerCase();

        setRole(nextRole);

        try {
          const me = await requestJson(`${apiBase}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const user = me?.user || {};
          const nextName =
            user?.nickname ||
            payload?.nickname ||
            payload?.displayName ||
            payload?.name ||
            payload?.fullName ||
            payload?.username ||
            "ผู้ใช้งาน";

          setDisplayName(nextName);
          setDraftDisplayName(nextName);
          setEmail(user?.email || payload?.email || "user@example.com");
          setProvider(user?.provider || payload?.provider || "local");
          setRole(String(user?.role || nextRole || "").toLowerCase());
          setOwnerUid(user?.ownerUid || payload?.ownerUid || "");
        } catch {
          const nextName =
            payload?.nickname ||
            payload?.displayName ||
            payload?.name ||
            payload?.fullName ||
            payload?.username ||
            "ผู้ใช้งาน";
          const nextEmail = payload?.email || "user@example.com";
          const nextProvider = payload?.provider || "local";

          setDisplayName(nextName);
          setDraftDisplayName(nextName);
          setEmail(nextEmail);
          setProvider(nextProvider);
          setOwnerUid(payload?.ownerUid || "");
        }
      } else {
        setRole("");
        setDisplayName("ผู้ใช้งาน");
        setDraftDisplayName("ผู้ใช้งาน");
        setEmail("user@example.com");
        setProvider("local");
        setOwnerUid("");
      }
    } catch {
      setHasToken(false);
      setRole("");
      setDisplayName("ผู้ใช้งาน");
      setDraftDisplayName("ผู้ใช้งาน");
      setEmail("user@example.com");
      setProvider("local");
      setOwnerUid("");
    } finally {
      setAuthReady(true);
    }
  };

  const openPopup = (type, title, message) => {
    setPopupType(type);
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupOpen(true);
  };

  useEffect(() => {
    setMounted(true);

    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("focus", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("focus", syncAuth);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const employeeBlockedPaths = ["/heatmap", "/planting-plot", "/node-sensor", "/yield"];

    if (
      role === "employee" &&
      employeeBlockedPaths.some(
        (blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`)
      )
    ) {
      router.replace("/dashboard");
    }
  }, [mounted, pathname, role, router]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
        setIsEditingName(false);
        setIsPasswordOpen(false);
      }
    }

    function handleResize() {
      if (window.innerWidth > 980) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const logout = () => {
    try {
      AUTH_KEYS.forEach((k) => window.localStorage.removeItem(k));
      setHasToken(false);
      setRole("");
      setOwnerUid("");
      setProfileOpen(false);
      setIsEditingName(false);
      setIsPasswordOpen(false);
    } catch {}
    router.push("/");
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    const token = readToken();
    const nextName = String(draftDisplayName || "").trim();

    if (!token) {
      openPopup("error", "บันทึกไม่สำเร็จ", "ไม่พบ token การเข้าสู่ระบบ");
      return;
    }

    if (!nextName) {
      openPopup("error", "บันทึกไม่สำเร็จ", "กรุณากรอกชื่อที่แสดง");
      return;
    }

    setSavingProfile(true);

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

      if (result?.token) {
        writeTokenToAllKeys(result.token);
      }

      const updatedName = result?.user?.nickname || nextName;

      setDisplayName(updatedName);
      setDraftDisplayName(updatedName);
      setIsEditingName(false);
      syncAuth();

      openPopup("success", "บันทึกสำเร็จ", "อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว");
    } catch (err) {
      openPopup("error", "บันทึกไม่สำเร็จ", err?.message || "ไม่สามารถอัปเดตข้อมูลได้");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

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
      openPopup("error", "เปลี่ยนรหัสผ่านไม่สำเร็จ", "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
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

    setSavingPassword(true);

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

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setIsPasswordOpen(false);

      openPopup("success", "เปลี่ยนรหัสผ่านสำเร็จ", "ระบบได้อัปเดตรหัสผ่านของคุณเรียบร้อยแล้ว");
    } catch (err) {
      openPopup(
        "error",
        "เปลี่ยนรหัสผ่านไม่สำเร็จ",
        err?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้"
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLinkOwner = async (e) => {
    e.preventDefault();

    const token = readToken();
    const nextOwnerUid = String(linkOwnerUid || "").trim();

    if (!token) {
      openPopup("error", "เชื่อม Owner ไม่สำเร็จ", "ไม่พบ token การเข้าสู่ระบบ");
      return;
    }

    if (!nextOwnerUid) {
      openPopup("error", "ข้อมูลไม่ครบ", "กรุณากรอก Owner UID");
      return;
    }

    setLinkingOwner(true);

    try {
      const result = await requestJson(`${apiBase}/auth/link-owner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ownerUid: nextOwnerUid,
        }),
      });

      if (result?.token) {
        writeTokenToAllKeys(result.token);
      }

      setLinkOwnerUid("");
      await syncAuth();

      openPopup("success", "เชื่อมสำเร็จ", "เชื่อมบัญชีพนักงานเข้ากับ Owner UID เรียบร้อยแล้ว");
    } catch (err) {
      openPopup("error", "เชื่อม Owner ไม่สำเร็จ", err?.message || "ไม่สามารถเชื่อม Owner UID ได้");
    } finally {
      setLinkingOwner(false);
    }
  };

  const allTabs = [
    { key: "dashboard", href: "/dashboard", label: t.dashboard || "แดชบอร์ด" },
    { key: "history", href: "/history", label: t.history || "ประวัติ" },
    { key: "heatmap", href: "/heatmap", label: t.heatmap || "🌡 Heat Map" },
    { key: "planting-plot", href: "/planting-plot", label: t.plantingPlot || "แปลงปลูก" },
    { key: "node-sensor", href: "/node-sensor", label: t.nodeSensor || "📡 Node Sensor" },
    { key: "yield", href: "/yield", label: t.yield || "ผลผลิต" },
  ];

  const tabs = useMemo(() => {
    if (role === "employee") {
      return allTabs.filter((tab) => tab.href === "/dashboard" || tab.href === "/history");
    }
    return allTabs;
  }, [role, t]);

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header className="topbar-shell">
        <div className="topbar-left">
          <div className="logo">
            <div className="logo-dot" />
            <span className="logo-text">DOEMS</span>
          </div>
        </div>

        <div className="topbar-center">
          <nav className="nav-tabs desktop-nav" aria-label="Main navigation">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={`nav-tab ${isActive(tab.href) ? "active" : ""}`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hdr-right topbar-right-tools">
          <div className="lang-switch">
            <button
              type="button"
              className={`lang-btn ${lang === "th" ? "active" : ""}`}
              onClick={() => setLang("th")}
            >
              ไทย
            </button>
            <button
              type="button"
              className={`lang-btn ${lang === "en" ? "active" : ""}`}
              onClick={() => setLang("en")}
            >
              EN
            </button>
          </div>

          {!authReady ? null : !hasToken ? (
            <div className="topbar-auth">
              <Link href="/" className="auth-btn auth-btn-ghost">
                {t.login || "เข้าสู่ระบบ"}
              </Link>
            </div>
          ) : (
            <div className="profile-wrap" ref={profileRef}>
              <button
                type="button"
                className="profile-trigger"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
              >
                <div className="profile-avatar-mini">{getInitials(displayName)}</div>
                <div className="profile-mini-meta">
                  <div className="profile-mini-name">{displayName}</div>
                  <div className="profile-mini-email">{email}</div>
                </div>
                <span className={`profile-caret ${profileOpen ? "open" : ""}`}>▾</span>
              </button>

              {profileOpen && (
                <div className="profile-panel">
                  <div className="profile-header-card">
                    <div className="profile-avatar">{getInitials(displayName)}</div>
                    <div className="profile-name">{displayName}</div>
                    <div className="profile-email">{email}</div>
                  </div>

                  {role === "owner" && ownerUid && (
                    <div className="profile-card">
                      <div
                        className="profile-row-btn"
                        style={{ cursor: "default", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <div className="profile-icon">#</div>
                          <div className="profile-row-text">
                            <div className="profile-row-title">UID ของ Owner</div>
                            <div className="profile-row-sub" style={{ wordBreak: "break-all" }}>
                              {ownerUid}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="save-btn"
                          style={{ minWidth: 84, padding: "8px 12px" }}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(ownerUid);
                              openPopup("success", "คัดลอกสำเร็จ", "คัดลอก UID เรียบร้อยแล้ว");
                            } catch {
                              openPopup("error", "คัดลอกไม่สำเร็จ", "ไม่สามารถคัดลอก UID ได้");
                            }
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {role === "employee" && (
                    <div className="profile-card">
                      <button
                        type="button"
                        className="profile-row-btn"
                        onClick={() => {
                          setIsEditingName(false);
                          setIsPasswordOpen(false);
                        }}
                        style={{ cursor: "default" }}
                      >
                        <div className="profile-icon">#</div>
                        <div className="profile-row-text">
                          <div className="profile-row-title">เชื่อม Owner UID</div>
                          <div className="profile-row-sub">
                            {ownerUid ? `UID ปัจจุบัน: ${ownerUid}` : "ยังไม่ได้เชื่อมกับ Owner"}
                          </div>
                        </div>
                      </button>

                      <div className="profile-expand" style={{ display: "block" }}>
                        <form onSubmit={handleLinkOwner} className="form-stack">
                          <div>
                            <label className="form-label">Owner UID</label>
                            <input
                              type="text"
                              value={linkOwnerUid}
                              onChange={(e) => setLinkOwnerUid(e.target.value)}
                              className="form-input"
                              placeholder="กรอก UID ของ Owner"
                            />
                          </div>

                          <div className="form-actions">
                            <button type="submit" className="save-btn" disabled={linkingOwner}>
                              {linkingOwner ? "กำลังเชื่อม..." : "เชื่อม Owner"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  <div className="profile-card">
                    <button
                      type="button"
                      className="profile-row-btn"
                      onClick={() => {
                        setIsEditingName((v) => !v);
                        setIsPasswordOpen(false);
                      }}
                    >
                      <div className="profile-icon">◌</div>
                      <div className="profile-row-text">
                        <div className="profile-row-title">ข้อมูลส่วนตัว</div>
                        <div className="profile-row-sub">จัดการชื่อที่แสดงบนระบบ</div>
                      </div>
                    </button>

                    {isEditingName && (
                      <div className="profile-expand">
                        <form onSubmit={handleUpdateProfile} className="form-stack">
                          <div>
                            <label className="form-label">ชื่อที่แสดง</label>
                            <input
                              type="text"
                              value={draftDisplayName}
                              onChange={(e) => setDraftDisplayName(e.target.value)}
                              className="form-input"
                            />
                          </div>

                          <div className="form-actions">
                            <button type="submit" className="save-btn" disabled={savingProfile}>
                              {savingProfile ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                            <button
                              type="button"
                              className="cancel-btn"
                              onClick={() => {
                                setDraftDisplayName(displayName);
                                setIsEditingName(false);
                              }}
                              disabled={savingProfile}
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>

                  <div className="profile-card">
                    <button
                      type="button"
                      className="profile-row-btn"
                      onClick={() => {
                        setIsPasswordOpen((v) => !v);
                        setIsEditingName(false);
                      }}
                    >
                      <div className="profile-icon">⟲</div>
                      <div className="profile-row-text">
                        <div className="profile-row-title">เปลี่ยนรหัสผ่าน</div>
                        <div className="profile-row-sub">อัพเดทรหัสผ่านของคุณ</div>
                      </div>
                    </button>

                    {isPasswordOpen && (
                      <div className="profile-expand">
                        <form onSubmit={handleChangePassword} className="form-stack">
                          <div>
                            <label className="form-label">รหัสผ่านปัจจุบัน</label>
                            <div className="password-wrap">
                              <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="form-input password-input"
                                required
                              />
                              <button
                                type="button"
                                className="toggle-password-btn"
                                onClick={() => setShowCurrentPassword((v) => !v)}
                              >
                                {showCurrentPassword ? "Hide" : "Show"}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="form-label">รหัสผ่านใหม่</label>
                            <div className="password-wrap">
                              <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="form-input password-input"
                                required
                              />
                              <button
                                type="button"
                                className="toggle-password-btn"
                                onClick={() => setShowNewPassword((v) => !v)}
                              >
                                {showNewPassword ? "Hide" : "Show"}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="form-label">ยืนยันรหัสผ่านใหม่</label>
                            <div className="password-wrap">
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="form-input password-input"
                                required
                              />
                              <button
                                type="button"
                                className="toggle-password-btn"
                                onClick={() => setShowConfirmPassword((v) => !v)}
                              >
                                {showConfirmPassword ? "Hide" : "Show"}
                              </button>
                            </div>
                          </div>

                          <div className="form-actions">
                            <button
                              type="submit"
                              className="save-btn"
                              disabled={savingPassword}
                            >
                              {savingPassword ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>

                  <div className="profile-card signout-card">
                    <button type="button" className="profile-row-btn signout-btn" onClick={logout}>
                      <div className="profile-icon signout-icon">↪</div>
                      <div className="profile-row-text">
                        <div className="profile-row-title signout-text">ออกจากระบบ</div>
                        <div className="profile-row-sub">จบการทำงานและออกจากบัญชีนี้</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mobile-menu-box" ref={menuRef}>
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              className="hamburger-btn"
              onClick={() => setMenuOpen((v) => !v)}
            >
              ☰
            </button>

            {menuOpen && (
              <nav className="mobile-dropdown" aria-label="Mobile navigation">
                {tabs.map((tab) => (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    className={`mobile-nav-tab ${isActive(tab.href) ? "active" : ""}`}
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>
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
                ตกลง
              </button>
            </div>
          </div>
        )}

        <style jsx>{`
          .topbar-shell,
          .topbar-shell * {
            box-sizing: border-box;
          }

          .topbar-shell {
            width: 100%;
            min-width: 0;
            display: grid;
            grid-template-columns: minmax(120px, 160px) minmax(0, 1fr) minmax(280px, 420px);
            align-items: center;
            gap: 12px;
            padding: 8px 14px;
            background: linear-gradient(180deg, #082e05 0%, #123b0b 100%);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            position: relative;
            z-index: 1000;
            overflow: visible;
          }

          .topbar-left,
          .topbar-center,
          .topbar-right-tools {
            min-width: 0;
          }

          .topbar-left {
            display: flex;
            align-items: center;
            justify-content: flex-start;
          }

          .topbar-center {
            width: 100%;
            min-width: 0;
          }

          .topbar-right-tools {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            min-width: 0;
            flex-wrap: nowrap;
            position: relative;
          }

          .logo {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            white-space: nowrap;
          }

          .logo-dot {
            width: 14px;
            height: 14px;
            border-radius: 999px;
            background: #49c15b;
            flex: 0 0 auto;
          }

          .logo-text {
            color: #d9ecd8;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 0.16em;
          }

          .desktop-nav {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-width: 0;
            padding: 6px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.06);
            overflow: hidden;
          }

          .nav-tab {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 42px;
            padding: 0 14px;
            border-radius: 14px;
            text-decoration: none;
            white-space: nowrap;
            font-size: 13px;
            font-weight: 800;
            color: #adc3a9;
            transition: all 0.2s ease;
            flex: 1 1 0;
            min-width: 0;
            text-align: center;
          }

          .nav-tab:hover {
            background: rgba(255, 255, 255, 0.08);
            color: #eef8ee;
          }

          .nav-tab.active {
            background: #58c86a;
            color: #fff;
          }

          .lang-switch {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px;
            border-radius: 999px;
            background: #edf7ee;
            border: 1px solid #cfe5d1;
            flex: 0 0 auto;
          }

          .lang-btn {
            border: 0;
            cursor: pointer;
            min-width: 52px;
            height: 34px;
            padding: 0 10px;
            border-radius: 999px;
            background: transparent;
            color: #2f5d31;
            font-size: 12px;
            font-weight: 800;
            white-space: nowrap;
            transition: all 0.18s ease;
          }

          .lang-btn.active {
            background: #2f8f46;
            color: #fff;
          }

          .lang-btn:hover {
            background: rgba(47, 143, 70, 0.12);
          }

          .topbar-auth {
            flex: 0 0 auto;
          }

          .topbar-auth :global(.auth-btn),
          .topbar-auth button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 34px;
            padding: 0 14px;
            border: 0;
            border-radius: 12px;
            text-decoration: none;
            white-space: nowrap;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
            transition: transform 0.18s ease, filter 0.18s ease;
          }

          .topbar-auth :global(.auth-btn:hover),
          .topbar-auth button:hover {
            filter: brightness(1.04);
          }

          .auth-btn-ghost {
            background: #58c86a;
            color: #fff;
          }

          .profile-wrap {
            position: relative;
            flex: 0 0 auto;
          }

          .profile-trigger {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-height: 38px;
            max-width: 270px;
            padding: 4px 10px 4px 6px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
            cursor: pointer;
          }

          .profile-trigger:hover {
            background: rgba(255, 255, 255, 0.18);
          }

          .profile-avatar-mini {
            width: 28px;
            height: 28px;
            border-radius: 999px;
            background: #ff7a00;
            color: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 800;
            flex: 0 0 auto;
          }

          .profile-mini-meta {
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }

          .profile-mini-name {
            max-width: 150px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.1;
            color: #fff;
            text-align: left;
          }

          .profile-mini-email {
            max-width: 150px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 10px;
            color: #dfeadf;
            line-height: 1.1;
            text-align: left;
          }

          .profile-caret {
            font-size: 12px;
            color: #fff;
            transition: transform 0.2s ease;
            margin-left: 2px;
          }

          .profile-caret.open {
            transform: rotate(180deg);
          }

          .profile-panel {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            width: 340px;
            max-width: calc(100vw - 20px);
            background: #efefef;
            border: 1px solid #d6d6d6;
            border-radius: 12px;
            padding: 8px;
            box-shadow: 0 18px 32px rgba(0, 0, 0, 0.22);
            z-index: 1300;
          }

          .profile-header-card,
          .profile-card {
            background: #f7f7f7;
            border: 1px solid #d3d3d3;
            border-radius: 10px;
          }

          .profile-header-card {
            padding: 14px 12px;
            margin-bottom: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 110px;
          }

          .profile-avatar {
            width: 48px;
            height: 48px;
            border-radius: 999px;
            background: #ff7a00;
            color: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 800;
            margin-bottom: 8px;
          }

          .profile-name {
            font-size: 15px;
            font-weight: 700;
            color: #111;
            margin-bottom: 2px;
            text-align: center;
          }

          .profile-email {
            font-size: 11px;
            color: #666;
            text-align: center;
          }

          .profile-card {
            overflow: hidden;
            margin-bottom: 10px;
          }

          .signout-card {
            margin-bottom: 0;
          }

          .profile-row-btn {
            width: 100%;
            border: 0;
            background: transparent;
            padding: 12px 12px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            text-align: left;
            cursor: pointer;
          }

          .profile-row-btn:hover {
            background: #f1f1f1;
          }

          .profile-icon {
            width: 18px;
            min-width: 18px;
            color: #666;
            font-size: 13px;
            line-height: 1.2;
            margin-top: 2px;
            text-align: left;
          }

          .profile-row-text {
            min-width: 0;
            flex: 1;
            text-align: left;
          }

          .profile-row-title {
            font-size: 12px;
            font-weight: 700;
            color: #111;
            line-height: 1.25;
            text-align: left;
          }

          .profile-row-sub {
            font-size: 10px;
            color: #666;
            line-height: 1.3;
            margin-top: 2px;
            text-align: left;
          }

          .profile-expand {
            border-top: 1px solid #d9d9d9;
            padding: 12px;
            background: #f7f7f7;
            text-align: left;
          }

          .form-stack {
            display: grid;
            gap: 12px;
            text-align: left;
          }

          .form-label {
            display: block;
            width: 100%;
            font-size: 11px;
            font-weight: 700;
            color: #333;
            margin-bottom: 6px;
            text-align: left;
          }

          .form-input {
            width: 100%;
            height: 36px;
            border: 1px solid #c9c9c9;
            border-radius: 8px;
            padding: 0 10px;
            font-size: 12px;
            color: #111;
            background: #fff;
            outline: none;
            text-align: left;
          }

          .form-input:focus {
            border-color: #4a90ff;
            box-shadow: 0 0 0 2px rgba(74, 144, 255, 0.12);
          }

          .password-wrap {
            position: relative;
          }

          .password-input {
            padding-right: 68px;
          }

          .toggle-password-btn {
            position: absolute;
            top: 50%;
            right: 8px;
            transform: translateY(-50%);
            border: 0;
            background: transparent;
            color: #1f6fff;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            padding: 4px 6px;
            border-radius: 6px;
          }

          .toggle-password-btn:hover {
            background: rgba(31, 111, 255, 0.08);
          }

          .form-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-start;
          }

          .save-btn,
          .cancel-btn {
            border: 0;
            min-height: 34px;
            padding: 0 14px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
          }

          .save-btn {
            background: #1f6fff;
            color: #fff;
          }

          .save-btn:disabled,
          .cancel-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .cancel-btn {
            background: #d9d9d9;
            color: #333;
          }

          .signout-btn:hover {
            background: #fff3f3;
          }

          .signout-icon,
          .signout-text {
            color: #e53935;
          }

          .mobile-menu-box {
            display: none;
            position: relative;
            flex: 0 0 auto;
          }

          .hamburger-btn {
            width: 34px;
            height: 34px;
            border: 0;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
            font-size: 17px;
            font-weight: 800;
            line-height: 1;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
          }

          .hamburger-btn:hover {
            background: rgba(255, 255, 255, 0.16);
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
          }

          .hamburger-btn:active {
            transform: scale(0.96);
          }

          .mobile-dropdown {
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            left: auto;
            width: min(235px, calc(100vw - 16px));
            display: grid;
            gap: 6px;
            padding: 8px;
            border-radius: 14px;
            background: #0b3107;
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 14px 30px rgba(0, 0, 0, 0.32);
            z-index: 1200;
          }

          .mobile-nav-tab,
          .mobile-dropdown :global(a),
          .mobile-dropdown :global(a:link),
          .mobile-dropdown :global(a:visited) {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            min-height: 38px;
            padding: 9px 11px;
            border-radius: 11px;
            background: transparent;
            text-decoration: none;
            text-align: left;
            color: #ffffff !important;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.2;
            transition: background 0.18s ease, transform 0.18s ease, color 0.18s ease;
          }

          .mobile-nav-tab:hover,
          .mobile-dropdown :global(a:hover) {
            background: rgba(127, 222, 160, 0.24);
            color: #ffffff !important;
          }

          .mobile-nav-tab:active,
          .mobile-dropdown :global(a:active) {
            transform: scale(0.985);
            background: #7fdea0;
            color: #ffffff !important;
          }

          .mobile-nav-tab.active,
          .mobile-nav-tab.active:link,
          .mobile-nav-tab.active:visited,
          .mobile-dropdown :global(a.active),
          .mobile-dropdown :global(a.active:link),
          .mobile-dropdown :global(a.active:visited) {
            background: #7fdea0;
            color: #ffffff !important;
          }

          .popup-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 4000;
            padding: 16px;
          }

          .popup-card {
            width: 100%;
            max-width: 360px;
            background: #ffffff;
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

          .popup-btn {
            border: 0;
            min-width: 110px;
            height: 38px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            color: #fff;
          }

          .popup-btn.success {
            background: #1f6fff;
          }

          .popup-btn.error {
            background: #e53935;
          }

          @media (max-width: 1260px) {
            .topbar-shell {
              grid-template-columns: minmax(110px, 150px) minmax(0, 1fr) auto;
              gap: 10px;
            }

            .nav-tab {
              padding: 0 12px;
              font-size: 12px;
            }
          }

          @media (max-width: 980px) {
            .topbar-shell {
              grid-template-columns: minmax(110px, 1fr) auto;
            }

            .topbar-center {
              display: none;
            }

            .mobile-menu-box {
              display: block;
            }

            .topbar-right-tools {
              justify-content: flex-end;
              gap: 5px;
            }

            .lang-switch {
              padding: 2px;
              gap: 2px;
            }

            .lang-btn {
              min-width: 40px;
              height: 28px;
              padding: 0 7px;
              font-size: 10px;
              border-radius: 999px;
            }

            .profile-mini-meta {
              display: none;
            }

            .profile-trigger {
              max-width: unset;
              min-height: 32px;
              padding: 2px 6px 2px 2px;
            }

            .profile-panel {
              width: min(340px, calc(100vw - 16px));
            }
          }

          @media (max-width: 720px) {
            .topbar-shell {
              padding: 7px 10px;
              gap: 8px;
            }

            .topbar-right-tools {
              gap: 4px;
            }

            .lang-btn {
              min-width: 38px;
              height: 27px;
              padding: 0 6px;
              font-size: 10px;
            }

            .hamburger-btn {
              width: 30px;
              height: 30px;
              font-size: 15px;
              border-radius: 8px;
            }

            .mobile-dropdown {
              right: 0;
              left: auto;
              width: min(220px, calc(100vw - 14px));
            }

            .profile-panel {
              right: -4px;
            }
          }

          @media (max-width: 430px) {
            .topbar-shell {
              padding: 7px 8px;
              gap: 6px;
            }

            .logo-text {
              font-size: 12px;
            }

            .lang-btn {
              min-width: 36px;
              height: 26px;
              font-size: 9px;
            }

            .profile-trigger {
              padding: 2px;
            }

            .profile-caret {
              display: none;
            }

            .hamburger-btn {
              width: 28px;
              height: 28px;
              font-size: 14px;
            }

            .mobile-dropdown {
              right: 0;
              left: auto;
              width: min(210px, calc(100vw - 12px));
            }
          }
        `}</style>
      </header>
    </>
  );
}