"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDuwimsT } from "./language-context";

const AUTH_KEY = "AUTH_TOKEN_V1";

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useDuwimsT();

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
    { key: "dashboard", href: "/", label: t.dashboard },
    { key: "history", href: "/history", label: t.history },
    { key: "heatmap", href: "/heatmap", label: t.heatmap },
    { key: "planting-plot", href: "/planting-plot", label: t.plantingPlot },
    { key: "node-sensor", href: "/node-sensor", label: t.nodeSensor },
    { key: "yield", href: "/yield", label: t.yield },
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
        .lang-switch {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          border-radius: 999px;
          background: #edf7ee;
          border: 1px solid #cfe5d1;
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
        }

        .lang-btn:hover {
          background: rgba(47, 93, 49, 0.08);
        }

        .lang-btn.active {
          background: #2f8f46;
          color: #fff;
        }
      `}</style>
    </header>
  );
}