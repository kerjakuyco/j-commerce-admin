import { useQueries } from "@tanstack/react-query";
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
import { Panel, StatCard } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { request } from "../lib/api";
import { money, number, readError } from "../lib/format";
import type {
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

export function DashboardPage() {
  const token = useToken();
  const { t } = useI18n();
  const [statsQuery, revenueQuery, topQuery, statusQuery] = useQueries({
    queries: [
      {
        queryKey: ["dashboard", "stats"],
        queryFn: ({ signal }) =>
          request<DashboardStats>("/dashboard/stats", { token, signal }),
      },
      {
        queryKey: ["dashboard", "revenue"],
        queryFn: ({ signal }) =>
          request<RevenuePoint[]>("/dashboard/revenue?period=30d", { token, signal }),
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
    ],
  });

  if (statsQuery.isLoading)
    return <LoadingState label={t.dashboard.loading} />;

  const stats = statsQuery.data;
  const revenue = revenueQuery.data ?? [];
  const topProducts = topQuery.data ?? [];
  const breakdown = statusQuery.data ?? [];

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
            detail={t.dashboard.revenueDetail}
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
      <Panel title={t.dashboard.revenueTrend} eyebrow={t.dashboard.thirtyDays} className="span-2">
        {revenueQuery.error ? (
          <p className="field-error">
            {t.dashboard.revenueUnavailable}: {readError(revenueQuery.error)}
          </p>
        ) : (
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenue}>
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
                <YAxis stroke={chartMuted} tickLine={false} axisLine={false} />
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
      <Panel title={t.dashboard.orderStatus} eyebrow={t.dashboard.orderStatusEyebrow}>
        {statusQuery.error ? (
          <p className="field-error">
            {t.dashboard.orderStatusUnavailable}: {readError(statusQuery.error)}
          </p>
        ) : (
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={breakdown} layout="vertical">
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
                  width={92}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={chartGreen} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
      <Panel title={t.dashboard.topProducts} eyebrow={t.dashboard.byQuantity}>
        {topQuery.error ? (
          <p className="field-error">
            {t.dashboard.topUnavailable}: {readError(topQuery.error)}
          </p>
        ) : (
          <div className="stack-list">
            {topQuery.isLoading ? (
              <p className="copy-block">{t.dashboard.loadingTop}</p>
            ) : topProducts.length === 0 ? (
              <p className="copy-block">{t.dashboard.noSold}</p>
            ) : (
              topProducts.map((item, index) => (
                <article key={item.product?.id ?? `top-${index}`}>
                  <strong>{item.product?.name ?? t.dashboard.unknownProduct}</strong>
                  <span>
                    {number(item.totalSold)} {t.dashboard.sold} · {money(item.revenue)}
                  </span>
                </article>
              ))
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
