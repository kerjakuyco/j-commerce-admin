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
import { request } from "../lib/api";
import { money, number, readError } from "../lib/format";
import type {
  DashboardStats,
  OrderStatusBreakdown,
  RevenuePoint,
  TopProduct,
} from "../types";

export function DashboardPage() {
  const token = useToken();
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
    return <LoadingState label="Loading dashboard data..." />;

  const stats = statsQuery.data;
  const revenue = revenueQuery.data ?? [];
  const topProducts = topQuery.data ?? [];
  const breakdown = statusQuery.data ?? [];

  return (
    <div className="dashboard-grid">
      <Panel title="Store overview" eyebrow="today" className="hero-panel">
        <p>
          Track revenue, orders, inventory movement, promos, broadcasts,
          Midtrans callbacks, and uploaded assets from one reliable workspace.
        </p>
      </Panel>
      {stats ? (
        <div className="stat-grid">
          <StatCard
            label="Revenue"
            value={money(stats.totalRevenue)}
            detail="this month"
          />
          <StatCard
            label="Orders"
            value={number(stats.totalOrders)}
            detail={`${stats.orderGrowthPercent}% growth`}
          />
          <StatCard
            label="Customers"
            value={number(stats.totalCustomers)}
            detail="active accounts"
          />
          <StatCard
            label="Products"
            value={number(stats.totalProducts)}
            detail="sellable catalog"
          />
        </div>
      ) : statsQuery.error ? (
        // Per-panel gating: a stats failure no longer blanks the whole page.
        <p className="field-error">
          Stats unavailable: {readError(statsQuery.error)}
        </p>
      ) : null}
      <Panel title="Revenue trend" eyebrow="30 days" className="span-2">
        {revenueQuery.error ? (
          <p className="field-error">
            Revenue trend unavailable: {readError(revenueQuery.error)}
          </p>
        ) : (
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(100,116,139,.16)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#64748B"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#64748B" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#FEFEFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: 14,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#2563EB"
                  fill="url(#revenueFill)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
      <Panel title="Order status" eyebrow="orders">
        {statusQuery.error ? (
          <p className="field-error">
            Order status unavailable: {readError(statusQuery.error)}
          </p>
        ) : (
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={breakdown} layout="vertical">
                <CartesianGrid stroke="rgba(100,116,139,.16)" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#64748B"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="status"
                  type="category"
                  stroke="#64748B"
                  tickLine={false}
                  axisLine={false}
                  width={92}
                />
                <Tooltip
                  contentStyle={{
                    background: "#FEFEFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: 14,
                  }}
                />
                <Bar dataKey="count" fill="#16A34A" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
      <Panel title="Top products" eyebrow="by quantity">
        {topQuery.error ? (
          <p className="field-error">
            Top products unavailable: {readError(topQuery.error)}
          </p>
        ) : (
          <div className="stack-list">
            {topProducts.map((item, index) => (
              <article key={item.product?.id ?? `top-${index}`}>
                <strong>{item.product?.name ?? "Unknown product"}</strong>
                <span>
                  {number(item.totalSold)} sold · {money(item.revenue)}
                </span>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
