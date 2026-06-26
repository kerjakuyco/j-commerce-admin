import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
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

const chartBlue = "var(--primary)";
const chart = {
  grid: "var(--line)",
  muted: "var(--muted)",
  tooltip: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 14,
    color: "var(--ink)",
  },
};
const dashboardPeriods = ["7d", "30d", "90d", "1y"] as const;
type DashboardPeriod = (typeof dashboardPeriods)[number];

export function DashboardPage() {
  const token = useToken();
  const { language, t } = useI18n();
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [statsQuery, revenueQuery, topQuery, statusQuery, alertsQuery] =
    useQueries({
      queries: [
        {
          queryKey: ["dashboard", "stats"],
          queryFn: ({ signal }) =>
            request<DashboardStats>("/dashboard/stats", { token, signal }),
        },
        {
          queryKey: ["dashboard", "revenue", period],
          queryFn: ({ signal }) =>
            request<RevenuePoint[]>(`/dashboard/revenue?period=${period}`, {
              token,
              signal,
            }),
        },
        {
          queryKey: ["dashboard", "top-products"],
          queryFn: ({ signal }) =>
            request<TopProduct[]>("/dashboard/top-products?limit=8", {
              token,
              signal,
            }),
        },
        {
          queryKey: ["dashboard", "order-status"],
          queryFn: ({ signal }) =>
            request<OrderStatusBreakdown[]>("/dashboard/order-status", {
              token,
              signal,
            }),
        },
        {
          queryKey: ["dashboard", "alerts"],
          queryFn: ({ signal }) =>
            request<DashboardAlert[]>("/dashboard/alerts", { token, signal }),
        },
      ],
    });

  if (statsQuery.isLoading) return <LoadingState label={t.dashboard.loading} />;

  const stats = statsQuery.data;
  const revenue = revenueQuery.data ?? [];
  const topProducts = topQuery.data ?? [];
  const breakdown = statusQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const alertLabels = t.dashboard.alertLabels as Record<string, string>;
  const statusLabels = t.dashboard.statusLabels as Record<string, string>;

  return (
    <div className="dashboard-grid">
      <Panel
        title={t.dashboard.snapshot}
        eyebrow={t.dashboard.today}
        className="hero-panel"
      >
        <div className="snapshot-content">
          <p>{t.dashboard.summary}</p>
          <ul className="operation-strip" aria-label={t.dashboard.operations}>
            {[
              t.dashboard.operationOrders,
              t.dashboard.operationCatalog,
              t.dashboard.operationPromos,
              t.dashboard.operationAssets,
            ].map((label, index) => (
              <li key={label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{label}</strong>
              </li>
            ))}
          </ul>
        </div>
      </Panel>
      {stats ? (
        <div className="stat-grid">
          <StatCard
            label={t.dashboard.revenue}
            value={money(stats.totalRevenue)}
            detail={growthLabel(
              stats.revenueGrowthPercent,
              t.dashboard.revenueGrowthSuffix,
              language,
            )}
          />
          <StatCard
            label={t.dashboard.orders}
            value={number(stats.totalOrders, language)}
            detail={t.dashboard.orderGrowth(stats.orderGrowthPercent)}
          />
          <StatCard
            label={t.dashboard.customers}
            value={number(stats.totalCustomers, language)}
            detail={t.dashboard.customersDetail}
          />
          <StatCard
            label={t.dashboard.products}
            value={number(stats.totalProducts, language)}
            detail={t.dashboard.productsDetail}
          />
        </div>
      ) : statsQuery.error ? (
        // Per-panel gating: a stats failure no longer blanks the whole page.
        <p className="field-error">
          {t.dashboard.statsUnavailable}: {readError(statsQuery.error, language)}
        </p>
      ) : null}
      <Panel
        title={t.dashboard.operationsAlerts}
        eyebrow={t.dashboard.needsAttention}
        className="dashboard-alerts-panel"
      >
        {alertsQuery.error ? (
          <p className="field-error">
            {t.dashboard.alertsUnavailable}: {readError(alertsQuery.error, language)}
          </p>
        ) : alertsQuery.isLoading ? (
          <p className="panel-empty-state">{t.dashboard.loadingAlerts}</p>
        ) : alerts.length === 0 ? (
          <p className="panel-empty-state">{t.dashboard.noAlerts}</p>
        ) : (
          <div className="dashboard-alert-list">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                to={alert.href}
                className="dashboard-alert-link"
              >
                <span>
                  <strong>{alertLabels[alert.id] ?? alert.label}</strong>
                  <small>
                    {alert.count === 0
                      ? t.dashboard.alertClear
                      : t.dashboard.alertOpenRelated}
                  </small>
                </span>
                <Badge tone={alert.tone}>{number(alert.count, language)}</Badge>
              </Link>
            ))}
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
            {t.dashboard.orderStatusUnavailable}: {readError(statusQuery.error, language)}
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
                  <CartesianGrid stroke={chart.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke={chart.muted}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="status"
                    type="category"
                    stroke={chart.muted}
                    tickFormatter={(status) => statusLabels[status] ?? status}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={chart.tooltip}
                    cursor={{ fill: "var(--surface-3)" }}
                  />
                  <Bar
                    dataKey="count"
                    fillOpacity={0.92}
                    radius={[0, 8, 8, 0]}
                  >
                    {breakdown.map((item) => (
                      <Cell
                        key={item.status}
                        fill={statusBarFill(item.status)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div
              className="status-drill-list"
              aria-label={t.dashboard.orderStatusDrilldowns}
            >
              {breakdown.map((item) => (
                <Link key={item.status} to={`/orders?status=${item.status}`}>
                  <Badge tone={orderTone(item.status)}>
                    {statusLabels[item.status]}
                  </Badge>
                  <span>{t.dashboard.orderCount(number(item.count, language))}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Panel>
      <Panel
        title={t.dashboard.recentOrders}
        eyebrow={t.dashboard.latestActivity}
        className="dashboard-recent-orders-panel"
      >
        {stats?.recentOrders?.length ? (
          <div className="recent-order-list">
            {stats.recentOrders.map((order) => (
              <Link key={order.id} to={`/orders?status=${order.status}`}>
                <span>
                  <strong>{order.orderNumber}</strong>
                  <small>
                    {order.user?.name ??
                      order.user?.email ??
                      t.dashboard.customerUnavailable}
                  </small>
                </span>
                <Badge tone={orderTone(order.status)}>
                  {statusLabels[order.status]}
                </Badge>
              </Link>
            ))}
          </div>
        ) : (
          <p className="panel-empty-state">{t.dashboard.noRecentOrders}</p>
        )}
      </Panel>
      <Panel
        title={t.dashboard.topProducts}
        eyebrow={t.dashboard.byQuantity}
        className="dashboard-top-products-panel"
      >
        {topQuery.error ? (
          <p className="field-error">
            {t.dashboard.topUnavailable}: {readError(topQuery.error, language)}
          </p>
        ) : (
          <div className="top-product-list">
            {topQuery.isLoading ? (
              <p className="panel-empty-state">{t.dashboard.loadingTop}</p>
            ) : topProducts.length === 0 ? (
              <p className="panel-empty-state">{t.dashboard.noSold}</p>
            ) : (
              topProducts.map((item, index) => {
                const productName = item.product?.name ?? t.dashboard.unknownProduct;

                return (
                  <Link
                    key={item.product?.id ?? `top-${index}`}
                    to={`/catalog?search=${encodeURIComponent(item.product?.name ?? "")}`}
                    className="top-product-item"
                  >
                    <span className="top-product-rank">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="top-product-copy">
                      <strong title={productName}>{productName}</strong>
                      <small>
                        {number(item.totalSold, language)} {t.dashboard.sold}
                      </small>
                    </span>
                    <span className="top-product-revenue">{money(item.revenue)}</span>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </Panel>
      <Panel
        title={t.dashboard.revenueTrend}
        eyebrow={t.dashboard.revenuePeriod(period)}
        className="dashboard-revenue-panel chart-panel"
      >
        <div className="period-toggle" aria-label={t.dashboard.revenuePeriodLabel}>
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
            {t.dashboard.revenueUnavailable}: {readError(revenueQuery.error, language)}
          </p>
        ) : (
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenue}
                margin={{ top: 10, right: 28, left: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={chartBlue}
                      stopOpacity={0.26}
                    />
                    <stop
                      offset="95%"
                      stopColor={chartBlue}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={chart.muted}
                  tickFormatter={(value) =>
                    formatRevenueDate(
                      value,
                      period === "1y" ? "month" : "day",
                      language,
                    )
                  }
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={chart.muted}
                  tickLine={false}
                  axisLine={false}
                  width={86}
                  tickCount={5}
                />
                <Tooltip
                  contentStyle={chart.tooltip}
                  labelFormatter={(value) =>
                    formatRevenueDate(value, "full", language)
                  }
                />
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
    </div>
  );
}

function statusBarFill(status: OrderStatusBreakdown["status"]) {
  switch (status) {
    case "PENDING":
      return "var(--chart-order-pending)";
    case "PAID":
      return "var(--chart-order-paid)";
    case "PACKED":
      return "var(--chart-order-packed)";
    case "SHIPPED":
      return "var(--chart-order-shipped)";
    case "DELIVERED":
      return "var(--chart-order-delivered)";
    case "CANCELLED":
      return "var(--chart-order-cancelled)";
    default:
      return "var(--chart-order-fallback)";
  }
}

function growthLabel(value: number | undefined, suffix: string, language: "en" | "id") {
  if (value === undefined) return suffix;
  const sign = value > 0 ? "+" : "";
  return `${sign}${number(value, language)}% ${suffix}`;
}

function formatRevenueDate(
  value: unknown,
  style: "day" | "month" | "full",
  language: "en" | "id",
) {
  const raw = String(value);
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  const locale = language === "id" ? "id-ID" : "en-US";

  if (style === "month") {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: style === "full" ? "numeric" : undefined,
  }).format(date);
}
