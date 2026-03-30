"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    setMounted(true);

    try {
      const token = window.localStorage.getItem(AUTH_KEY);
      setHasToken(!!token);

      if (token) {
        const payload = parseJwt(token);
        const nextRole = String(payload?.role || "").toLowerCase();
        setRole(nextRole);
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

  const logout = () => {
    try {
      window.localStorage.removeItem(AUTH_KEY);
      setHasToken(false);
      setRole("");
    } catch {}
    router.push("/login");
  };

  const allTabs = [
    { key: "dashboard", href: "/", label: t.dashboard },
    { key: "history", href: "/history", label: t.history },
    { key: "heatmap", href: "/heatmap", label: t.heatmap },
    { key: "planting-plot", href: "/planting-plot", label: t.plantingPlot },
    { key: "node-sensor", href: "/node-sensor", label: t.nodeSensor },
    { key: "yield", href: "/yield", label: t.yield },
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
              {t.login}
            </Link>
          ) : (
            <button
              type="button"
              className="auth-btn auth-btn-primary"
              onClick={logout}
            >
              {t.logout}
            </button>
          )}
        </div>

        <div className="topbar-status-text">
          {!mounted
            ? t.statusChecking
            : hasToken
            ? t.statusLoggedIn
            : t.statusLoggedOut}
        </div>
      </div>

      <style jsx>{`
        .topbar-shell,
        .topbar-shell * {
          box-sizing: border-box;
        }

        .topbar-shell {
          width: 100%;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
        }

        .topbar-left,
        .topbar-center,
        .topbar-right-tools {
          min-width: 0;
        }

        .topbar-left {
          display: flex;
          align-items: center;
        }

        .topbar-center {
          min-width: 0;
          width: 100%;
        }

        .topbar-right-tools {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .logo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          white-space: nowrap;
        }

        .logo-dot {
          flex: 0 0 auto;
        }

        .nav-tabs {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .nav-tab {
          white-space: nowrap;
          max-width: 100%;
        }

        .lang-switch {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          border-radius: 999px;
          background: #edf7ee;
          border: 1px solid #cfe5d1;
          flex: 0 0 auto;
          max-width: 100%;
        }

        .lang-btn {
          border: 0;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 999px;
          background: transparent;
          color: #2f5d31;
          font-weight: 700;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .lang-btn:hover {
          background: rgba(47, 93, 49, 0.08);
        }

        .lang-btn.active {
          background: #2f8f46;
          color: #fff;
        }

        .topbar-auth,
        .topbar-status-text {
          min-width: 0;
        }

        .topbar-status-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
        }

        @media (max-width: 1200px) {
          .topbar-shell {
            grid-template-columns: auto minmax(0, 1fr);
            grid-template-areas:
              "left right"
              "center center";
            align-items: start;
          }

          .topbar-left {
            grid-area: left;
          }

          .topbar-center {
            grid-area: center;
          }

          .topbar-right-tools {
            grid-area: right;
          }

          .nav-tabs {
            justify-content: flex-start;
          }
        }

        @media (max-width: 900px) {
          .topbar-shell {
            grid-template-columns: 1fr;
            grid-template-areas:
              "left"
              "right"
              "center";
            gap: 10px;
          }

          .topbar-left {
            justify-content: center;
          }

          .topbar-right-tools {
            justify-content: center;
          }

          .topbar-center {
            width: 100%;
          }

          .nav-tabs {
            justify-content: center;
          }

          .topbar-status-text {
            max-width: 100%;
            text-align: center;
          }
        }

        @media (max-width: 640px) {
          .topbar-shell {
            gap: 8px;
          }

          .topbar-right-tools {
            gap: 8px;
          }

          .lang-switch {
            width: 100%;
            justify-content: center;
          }

          .lang-btn {
            flex: 1 1 0;
            text-align: center;
          }

          .topbar-auth {
            width: 100%;
          }

          .topbar-auth :global(.auth-btn),
          .topbar-auth button {
            width: 100%;
          }

          .nav-tabs {
            gap: 6px;
          }

          .nav-tab {
            flex: 1 1 calc(50% - 6px);
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .logo {
            font-size: 14px;
          }

          .lang-btn {
            padding: 8px 10px;
            font-size: 12px;
          }

          .nav-tab {
            flex: 1 1 100%;
          }

          .topbar-status-text {
            font-size: 12px;
          }
        }
      `}</style>
    </header>
  );
}