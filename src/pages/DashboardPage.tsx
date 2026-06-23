import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LoadingState } from "../components/LoadingState";
import { Badge, orderTone } from "../components/Badge";
import { Panel, StatCard } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { request } from "../lib/api";
import { money, number, readError } from "../lib/format";
import type {
  DashboardAlert,
  DashboardStats,
  OrderStatusBreakdown,
  RevenuePoint,
  TopProduct,
} from "../types";

const chartBlue = "oklch(54.6% 0.215 262)";
const chartGreen = "oklch(62% 0.17 148)";
const chartGrid = "oklch(64% 0.025 250 / 0.18)";
const chartMuted = "oklch(50% 0.03 255)";
const tooltipStyle = {
  background: "oklch(99.7% 0.002 260)",
  border: "1px solid oklch(90% 0.014 250)",
  borderRadius: 14,
};
const dashboardPeriods = ["7d", "30d", "90d", "1y"] as const;
type DashboardPeriod = (typeof dashboardPeriods)[number];

export function DashboardPage() {
  const token = useToken();
  const { t } = useI18n();
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [statsQuery, revenueQuery, topQuery, statusQuery, alertsQuery] = useQueries({
    queries: [
      {
        queryKey: ["dashboard", "stats"],
        queryFn: ({ signal }) =>
          request<DashboardStats>("/dashboard/stats", { token, signal }),
      },
      {
        queryKey: ["dashboard", "revenue", period],
        queryFn: ({ signal }) =>
          request<RevenuePoint[]>(`/dashboard/revenue?period=${period}`, { token, signal }),
      },
      {
        queryKey: ["dashboard", "top-products"],
        queryFn: ({ signal }) =>
          request<TopProduct[]>("/dashboard/top-products?limit=8", { token, signal }),
      },
      {
        queryKey: ["dashboard", "order-status"],
        queryFn: ({ signal }) =>
          request<OrderStatusBreakdown[]>("/dashboard/order-status", { token, signal }),
      },
      {
        queryKey: ["dashboard", "alerts"],
        queryFn: ({ signal }) =>
          request<DashboardAlert[]>("/dashboard/alerts", { token, signal }),
      },
    ],
  });

  if (statsQuery.isLoading)
    return <LoadingState label={t.dashboard.loading} />;

  const stats = statsQuery.data;
  const revenue = revenueQuery.data ?? [];
  const topProducts = topQuery.data ?? [];
  const breakdown = statusQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];

  return (
    <div className="dashboard-grid">
      <Panel title={t.dashboard.snapshot} eyebrow={t.dashboard.today} className="hero-panel">
        <p>{t.dashboard.summary}</p>
        <ul className="operation-strip" aria-label={t.dashboard.operations}>
          <li>{t.dashboard.operationOrders}</li>
          <li>{t.dashboard.operationCatalog}</li>
          <li>{t.dashboard.operationPromos}</li>
          <li>{t.dashboard.operationAssets}</li>
        </ul>
      </Panel>
      {stats ? (
        <div className="stat-grid">
          <StatCard
            label={t.dashboard.revenue}
            value={money(stats.totalRevenue)}
            detail={growthLabel(stats.revenueGrowthPercent, "vs previous month")}
          />
          <StatCard
            label={t.dashboard.orders}
            value={number(stats.totalOrders)}
            detail={t.dashboard.orderGrowth(stats.orderGrowthPercent)}
          />
          <StatCard
            label={t.dashboard.customers}
            value={number(stats.totalCustomers)}
            detail={t.dashboard.customersDetail}
          />
          <StatCard
            label={t.dashboard.products}
            value={number(stats.totalProducts)}
            detail={t.dashboard.productsDetail}
          />
        </div>
      ) : statsQuery.error ? (
        // Per-panel gating: a stats failure no longer blanks the whole page.
        <p className="field-error">
          {t.dashboard.statsUnavailable}: {readError(statsQuery.error)}
        </p>
      ) : null}
      <Panel
        title="Operations alerts"
        eyebrow="needs attention"
        className="dashboard-alerts-panel"
      >
        {alertsQuery.error ? (
          <p className="field-error">Alerts unavailable: {readError(alertsQuery.error)}</p>
        ) : alertsQuery.isLoading ? (
          <p className="panel-empty-state">Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <p className="panel-empty-state">No alerts available.</p>
        ) : (
          <div className="dashboard-alert-list">
            {alerts.map((alert) => (
              <Link key={alert.id} to={alert.href} className="dashboard-alert-link">
                <span>
                  <strong>{alert.label}</strong>
                  <small>{alert.count === 0 ? "Clear" : "Open related work"}</small>
                </span>
                <Badge tone={alert.tone}>{number(alert.count)}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Panel>
      <Panel
        title={t.dashboard.revenueTrend}
        eyebrow={`Revenue period: ${period}`}
        className="dashboard-revenue-panel chart-panel"
      >
        <div className="period-toggle" aria-label="Revenue period">
          {dashboardPeriods.map((option) => (
            <button
              key={option}
              className={option === period ? "active" : undefined}
              type="button"
              onClick={() => setPeriod(option)}
            >
              {option}
            </button>
          ))}
        </div>
        {revenueQuery.error ? (
          <p className="field-error">
            {t.dashboard.revenueUnavailable}: {readError(revenueQuery.error)}
          </p>
        ) : (
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue} margin={{ top: 10, right: 28, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartBlue} stopOpacity={0.26} />
                    <stop offset="95%" stopColor={chartBlue} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={chartMuted}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={chartMuted}
                  tickLine={false}
                  axisLine={false}
                  width={86}
                  tickCount={5}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={chartBlue}
                  fill="url(#revenueFill)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
      <Panel
        title={t.dashboard.orderStatus}
        eyebrow={t.dashboard.orderStatusEyebrow}
        className="dashboard-status-panel chart-panel"
      >
        {statusQuery.error ? (
          <p className="field-error">
            {t.dashboard.orderStatusUnavailable}: {readError(statusQuery.error)}
          </p>
        ) : (
          <div className="dashboard-status-content">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={breakdown}
                  layout="vertical"
                  margin={{ top: 8, right: 18, left: 0, bottom: 4 }}
                  barCategoryGap={12}
                >
                  <CartesianGrid stroke={chartGrid} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke={chartMuted}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="status"
                    type="category"
                    stroke={chartMuted}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={chartGreen} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="status-drill-list" aria-label="Order status drill-downs">
              {breakdown.map((item) => (
                <Link key={item.status} to={`/orders?status=${item.status}`}>
                  <Badge tone={orderTone(item.status)}>{item.status}</Badge>
                  <span>{number(item.count)} orders</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Panel>
      <Panel
        title={t.dashboard.topProducts}
        eyebrow={t.dashboard.byQuantity}
        className="dashboard-top-products-panel"
      >
        {topQuery.error ? (
          <p className="field-error">
            {t.dashboard.topUnavailable}: {readError(topQuery.error)}
          </p>
        ) : (
          <div className="stack-list">
            {topQuery.isLoading ? (
              <p className="panel-empty-state">{t.dashboard.loadingTop}</p>
            ) : topProducts.length === 0 ? (
              <p className="panel-empty-state">{t.dashboard.noSold}</p>
            ) : (
              topProducts.map((item, index) => (
                <Link
                  key={item.product?.id ?? `top-${index}`}
                  to={`/catalog?search=${encodeURIComponent(item.product?.name ?? "")}`}
                >
                  <strong>{item.product?.name ?? t.dashboard.unknownProduct}</strong>
                  <span>
                    {number(item.totalSold)} {t.dashboard.sold} · {money(item.revenue)}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}
      </Panel>
      <Panel title="Recent orders" eyebrow="latest activity" className="dashboard-recent-orders-panel">
        {stats?.recentOrders?.length ? (
          <div className="recent-order-list">
            {stats.recentOrders.map((order) => (
              <Link key={order.id} to={`/orders?status=${order.status}`}>
                <span>
                  <strong>{order.orderNumber}</strong>
                  <small>{order.user?.name ?? order.user?.email ?? "Customer unavailable"}</small>
                </span>
                <Badge tone={orderTone(order.status)}>{order.status}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <p className="panel-empty-state">No recent orders yet.</p>
        )}
      </Panel>
    </div>
  );
}

function growthLabel(value: number | undefined, suffix: string) {
  if (value === undefined) return suffix;
  const sign = value > 0 ? "+" : "";
  return `${sign}${number(value)}% ${suffix}`;
}
