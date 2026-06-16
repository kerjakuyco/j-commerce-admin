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
import { ErrorState } from "../components/ErrorState";
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
        queryFn: () => request<DashboardStats>("/dashboard/stats", { token }),
      },
      {
        queryKey: ["dashboard", "revenue"],
        queryFn: () =>
          request<RevenuePoint[]>("/dashboard/revenue?period=30d", { token }),
      },
      {
        queryKey: ["dashboard", "top-products"],
        queryFn: () =>
          request<TopProduct[]>("/dashboard/top-products?limit=8", { token }),
      },
      {
        queryKey: ["dashboard", "order-status"],
        queryFn: () =>
          request<OrderStatusBreakdown[]>("/dashboard/order-status", { token }),
      },
    ],
  });

  if (statsQuery.isLoading)
    return <LoadingState label="Loading dashboard data..." />;
  if (statsQuery.error)
    return <ErrorState message={readError(statsQuery.error)} />;

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
      <div className="stat-grid">
        <StatCard
          label="Revenue"
          value={money(stats?.totalRevenue ?? 0)}
          detail="this month"
        />
        <StatCard
          label="Orders"
          value={number(stats?.totalOrders ?? 0)}
          detail={`${stats?.orderGrowthPercent ?? 0}% growth`}
        />
        <StatCard
          label="Customers"
          value={number(stats?.totalCustomers ?? 0)}
          detail="active accounts"
        />
        <StatCard
          label="Products"
          value={number(stats?.totalProducts ?? 0)}
          detail="sellable catalog"
        />
      </div>
      <Panel title="Revenue trend" eyebrow="30 days" className="span-2">
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="blueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(95,99,104,.16)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#5f6368"
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="#5f6368" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #dadce0",
                  borderRadius: 14,
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#1a73e8"
                fill="url(#blueFill)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Order status" eyebrow="orders">
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={breakdown} layout="vertical">
              <CartesianGrid stroke="rgba(95,99,104,.16)" horizontal={false} />
              <XAxis
                type="number"
                stroke="#5f6368"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="status"
                type="category"
                stroke="#5f6368"
                tickLine={false}
                axisLine={false}
                width={92}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #dadce0",
                  borderRadius: 14,
                }}
              />
              <Bar dataKey="count" fill="#34a853" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Top products" eyebrow="by quantity">
        <div className="stack-list">
          {topProducts.map((item) => (
            <article key={item.product?.id ?? item.totalSold}>
              <strong>{item.product?.name ?? "Unknown product"}</strong>
              <span>
                {number(item.totalSold)} sold · {money(item.revenue)}
              </span>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
