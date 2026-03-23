"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const AUTH_KEY = "AUTH_TOKEN_V1";

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setHasToken(!!window.localStorage.getItem(AUTH_KEY));
    } catch {
      setHasToken(false);
    }
  }, []);

  const logout = () => {
    try {
      window.localStorage.removeItem(AUTH_KEY);
      setHasToken(false);
    } catch {}
    router.push("/login");
  };

  const tabs = [
    { key: "dashboard", href: "/", label: "แดชบอร์ด" },
    { key: "history", href: "/history", label: "ประวัติ" },
    { key: "heatmap", href: "/heatmap", label: "🌡 Heat Map" },
    { key: "planting-plot", href: "/planting-plot", label: "แปลงปลูก" },
    { key: "node-sensor", href: "/node-sensor", label: "📡 Node Sensor" },
    { key: "yield", href: "/yield", label: "ผลผลิต" },
  ];

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="topbar-shell">
      <div className="topbar-left">
        <div className="logo">
          <div className="logo-dot" />
          DUWIMS
        </div>
      </div>

      <div className="topbar-center">
        <nav className="nav-tabs" aria-label="Main navigation">
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
        <div className="topbar-auth">
          {!hasToken ? (
            <Link href="/login" className="auth-btn auth-btn-ghost">
              เข้าสู่ระบบ
            </Link>
          ) : (
            <button
              type="button"
              className="auth-btn auth-btn-primary"
              onClick={logout}
            >
              ออกจากระบบ
            </button>
          )}
        </div>

        <div className="topbar-status-text">
          {!mounted
            ? "สถานะ: กำลังตรวจสอบ..."
            : hasToken
            ? "สถานะ: เข้าสู่ระบบแล้ว"
            : "สถานะ: ยังไม่ได้เข้าสู่ระบบ"}
        </div>
      </div>
    </header>
  );
}