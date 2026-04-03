"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDuwimsT } from "./language-context";

const AUTH_KEY = "AUTH_TOKEN_V1";

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

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useDuwimsT();

  const [hasToken, setHasToken] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    setMounted(true);

    try {
      const token = window.localStorage.getItem(AUTH_KEY);
      setHasToken(!!token);

      if (token) {
        const payload = parseJwt(token);
        setRole(String(payload?.role || "").toLowerCase());
      } else {
        setRole("");
      }
    } catch {
      setHasToken(false);
      setRole("");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const employeeBlockedPaths = [
      "/heatmap",
      "/planting-plot",
      "/node-sensor",
      "/yield",
    ];

    if (
      role === "employee" &&
      employeeBlockedPaths.some(
        (blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`)
      )
    ) {
      router.replace("/");
    }
  }, [mounted, pathname, role, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false);
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
      window.localStorage.removeItem(AUTH_KEY);
      setHasToken(false);
      setRole("");
    } catch {}
    router.push("/login");
  };

  const allTabs = [
    { key: "dashboard", href: "/", label: t.dashboard || "แดชบอร์ด" },
    { key: "history", href: "/history", label: t.history || "ประวัติ" },
    { key: "heatmap", href: "/heatmap", label: t.heatmap || "🌡 Heat Map" },
    {
      key: "planting-plot",
      href: "/planting-plot",
      label: t.plantingPlot || "แปลงปลูก",
    },
    {
      key: "node-sensor",
      href: "/node-sensor",
      label: t.nodeSensor || "📡 Node Sensor",
    },
    { key: "yield", href: "/yield", label: t.yield || "ผลผลิต" },
  ];

  const tabs = useMemo(() => {
    if (role === "employee") {
      return allTabs.filter(
        (tab) => tab.href === "/" || tab.href === "/history"
      );
    }
    return allTabs;
  }, [role, t]);

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
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

        <div className="topbar-auth">
          {!hasToken ? (
            <Link href="/login" className="auth-btn auth-btn-ghost">
              {t.login || "เข้าสู่ระบบ"}
            </Link>
          ) : (
            <button
              type="button"
              className="auth-btn auth-btn-primary"
              onClick={logout}
            >
              {t.logout || "ออกจากระบบ"}
            </button>
          )}
        </div>

       

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

      <style jsx>{`
        .topbar-shell,
        .topbar-shell * {
          box-sizing: border-box;
        }

        .topbar-shell {
          width: 100%;
          min-width: 0;
          display: grid;
          grid-template-columns: minmax(120px, 160px) minmax(0, 1fr) minmax(240px, 320px);
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

        .auth-btn-primary {
          background: #ef2b2b;
          color: #fff;
        }

        .auth-btn-ghost {
          background: #58c86a;
          color: #fff;
        }

        .topbar-status-text {
          color: #93ae8f;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 170px;
          min-width: 0;
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
          transition: background 0.18s ease, transform 0.18s ease,
            box-shadow 0.18s ease;
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
          transition: background 0.18s ease, transform 0.18s ease,
            color 0.18s ease;
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

        @media (max-width: 1260px) {
          .topbar-shell {
            grid-template-columns: minmax(110px, 150px) minmax(0, 1fr) auto;
            gap: 10px;
          }

          .nav-tab {
            padding: 0 12px;
            font-size: 12px;
          }

          .topbar-status-text {
            display: none;
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

          .topbar-auth :global(.auth-btn),
          .topbar-auth button {
            min-height: 28px;
            padding: 0 9px;
            font-size: 10px;
            border-radius: 9px;
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

          .topbar-auth :global(.auth-btn),
          .topbar-auth button {
            min-height: 27px;
            padding: 0 8px;
            font-size: 10px;
            border-radius: 8px;
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

          .topbar-auth :global(.auth-btn),
          .topbar-auth button {
            min-height: 26px;
            padding: 0 7px;
            font-size: 9px;
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
  );
}