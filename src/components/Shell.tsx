import {
  BadgePercent,
  BellRing,
  Boxes,
  Gauge,
  ImagePlus,
  LogOut,
  PackageCheck,
  RadioTower,
  Users,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LanguageToggle } from "./LanguageToggle";
import { API_BASE_URL, request } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

const nav = [
  { to: "/", key: "dashboard", icon: Gauge },
  { to: "/orders", key: "orders", icon: PackageCheck },
  { to: "/catalog", key: "catalog", icon: Boxes },
  { to: "/users", key: "users", icon: Users },
  { to: "/vouchers", key: "vouchers", icon: BadgePercent },
  { to: "/notifications", key: "messages", icon: BellRing },
  { to: "/banners", key: "banners", icon: RadioTower },
  { to: "/upload", key: "upload", icon: ImagePlus },
] as const;

export function Shell() {
  const { session, logout } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      if (session) {
        await request("/auth/logout", {
          token: session.accessToken,
          method: "POST",
        });
      }
    } finally {
      queryClient.clear();
      logout();
      setLoggingOut(false);
    }
  }, [session, queryClient, logout]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-sigil">J</div>
          <div>
            <strong>j-commerce</strong>
            <span>{t.shell.adminConsole}</span>
          </div>
        </div>
        <nav className="nav-list">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className="nav-link"
              >
                <Icon size={18} />
                <span>
                  <small>{t.nav[item.key].kicker}</small>
                  {t.nav[item.key].label}
                </span>
              </NavLink>
            );
          })}
        </nav>
        <div className="operator-card">
          <span className="eyebrow">{t.shell.operator}</span>
          <strong>{session?.user.name}</strong>
          <small>{session?.user.email}</small>
          <LanguageToggle />
          <button
            type="button"
            className="ghost-button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={16} /> {loggingOut ? t.shell.signingOut : t.shell.logout}
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{t.shell.controlPlane}</span>
            <h1>{t.shell.operationsConsole}</h1>
          </div>
          <div className="api-status" title={API_BASE_URL}>
            <span aria-hidden="true" /> {t.shell.apiTarget}: {API_BASE_URL}
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
