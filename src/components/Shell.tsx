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
import { API_BASE_URL, request } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const nav = [
  { to: "/", label: "Dashboard", kicker: "overview", icon: Gauge },
  { to: "/orders", label: "Orders", kicker: "fulfillment", icon: PackageCheck },
  { to: "/catalog", label: "Catalog", kicker: "products", icon: Boxes },
  { to: "/users", label: "Users", kicker: "access", icon: Users },
  { to: "/vouchers", label: "Vouchers", kicker: "promo", icon: BadgePercent },
  {
    to: "/notifications",
    label: "Messages",
    kicker: "broadcast",
    icon: BellRing,
  },
  { to: "/banners", label: "Banners", kicker: "home", icon: RadioTower },
  { to: "/upload", label: "Upload", kicker: "assets", icon: ImagePlus },
];

export function Shell() {
  const { session, logout } = useAuth();
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
            <span>admin console</span>
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
                  <small>{item.kicker}</small>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
        <div className="operator-card">
          <span className="eyebrow">operator</span>
          <strong>{session?.user.name}</strong>
          <small>{session?.user.email}</small>
          <button
            type="button"
            className="ghost-button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={16} /> {loggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">live control plane</span>
            <h1>Run storefront operations with clarity.</h1>
          </div>
          <div className="api-status">API target: {API_BASE_URL}</div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
