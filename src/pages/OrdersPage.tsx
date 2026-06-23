import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, X, XCircle } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge, orderTone, paymentTone } from "../components/Badge";
import { DataTable } from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Panel } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { normalizeAssetUrl } from "../lib/asset-url";
import {
  allowedStatusTransitions,
  isOrderStatus,
  orderStatuses,
} from "../lib/constants";
import { request } from "../lib/api";
import { money, readError, shortDate } from "../lib/format";
import type { Order, OrderStatus, Paginated } from "../types";

const CANCELLABLE_STATUSES: OrderStatus[] = ["PENDING", "PAID"];

export function OrdersPage() {
  const token = useToken();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const statusParam = searchParams.get("status") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const statusFilter = isOrderStatus(statusParam) ? statusParam : "";
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const ordersPath = new URLSearchParams({ limit: "25", page: String(page) });
  if (statusFilter) ordersPath.set("status", statusFilter);
  const ordersQuery = useQuery({
    queryKey: ["orders", statusFilter, page],
    queryFn: ({ signal }) =>
      request<Paginated<Order>>(`/orders?${ordersPath.toString()}`, { token, signal }),
  });
  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      trackingNumber,
    }: {
      id: string;
      status: OrderStatus;
      trackingNumber?: string;
    }) =>
      request<Order>(`/orders/${id}/status`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ status, trackingNumber }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order status updated");
    },
    onError: (error) => toast.error(readError(error)),
  });
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      request<Order>(`/orders/${id}/cancel`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled");
    },
    onError: (error) => toast.error(readError(error)),
  });
  const orderDetailQuery = useQuery({
    queryKey: ["orders", "detail", selectedOrderId],
    enabled: Boolean(selectedOrderId),
    queryFn: ({ signal }) =>
      request<Order>(`/orders/${selectedOrderId}`, { token, signal }),
  });

  if (ordersQuery.isLoading) return <LoadingState />;
  if (ordersQuery.error)
    return <ErrorState message={readError(ordersQuery.error)} />;

  const canMoveOrder = (order: Order, status: OrderStatus) => {
    if (status === order.status) return true;
    if (status === "PAID" && order.paymentStatus !== "PAID") return false;
    return allowedStatusTransitions[order.status].includes(status);
  };

  const nextStatuses = (order: Order) =>
    orderStatuses.filter(
      (status) => status !== order.status && canMoveOrder(order, status),
    );

  return (
    <Panel title="Order management" eyebrow="fulfillment">
      <div className="orders-toolbar" aria-label="Order filters">
        <label htmlFor="order-status-filter">
          Status
          <select
            id="order-status-filter"
            value={statusFilter}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              if (event.target.value) next.set("status", event.target.value);
              else next.delete("status");
              next.set("page", "1");
              setSearchParams(next);
            }}
          >
            <option value="">All statuses</option>
            {[...orderStatuses, "CANCELLED" as OrderStatus].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <button
          className="ghost-button"
          type="button"
          onClick={() => setSearchParams(new URLSearchParams())}
        >
          Reset
        </button>
        <span className="orders-toolbar-meta">
          {ordersQuery.data?.meta.total ?? 0} orders
        </span>
      </div>
      <DataTable
        caption="Order management table"
        columns={[
          { label: "Invoice", key: "invoice" },
          { label: "Customer", key: "customer" },
          { label: "Date", key: "date" },
          { label: "Status", key: "status" },
          { label: "Payment", key: "payment" },
          { label: "Total", key: "total" },
          { label: "Move", key: "move" },
        ]}
        keyExtractor={(_row, index) =>
          ordersQuery.data?.data[index]?.id ?? index
        }
        rows={(ordersQuery.data?.data ?? []).map((order) => {
          const allowedNextStatuses = nextStatuses(order);
          const itemCount = order._count?.items ?? order.items?.length;

          return [
            <div className="order-main-cell">
              <strong title={order.orderNumber}>{order.orderNumber}</strong>
              {itemCount !== undefined && (
                <span>{itemCount} item{itemCount === 1 ? "" : "s"}</span>
              )}
            </div>,
            <div className="order-main-cell">
              <strong title={order.user?.name ?? order.user?.email ?? "-"}>
                {order.user?.name ?? order.user?.email ?? "-"}
              </strong>
              {order.user?.email && order.user?.name && (
                <span title={order.user.email}>{order.user.email}</span>
              )}
            </div>,
            shortDate(order.createdAt),
            <Badge key={`${order.id}-status`} tone={orderTone(order.status)}>
              {order.status}
            </Badge>,
            <Badge
              key={`${order.id}-payment`}
              tone={paymentTone(order.paymentStatus)}
            >
              {order.paymentStatus}
            </Badge>,
            <strong className="order-total-cell">{money(order.total)}</strong>,
            <div key={`${order.id}-actions`} className="order-action-cell">
              <button
                className="icon-button"
                type="button"
                aria-label={`View order ${order.orderNumber}`}
                title="View details"
                onClick={() => setSelectedOrderId(order.id)}
              >
                <Eye size={16} aria-hidden="true" />
              </button>
              <select
                className="order-status-select"
                aria-label={`Update status for ${order.orderNumber}`}
                name={`status-${order.id}`}
                value={order.status}
                disabled={
                  allowedNextStatuses.length === 0 ||
                  (statusMutation.isPending &&
                    statusMutation.variables?.id === order.id)
                }
                onChange={(event) => {
                  const value = event.target.value;
                  if (!isOrderStatus(value)) return;
                  if (value === order.status) return;
                  if (
                    !window.confirm(
                      `Move order ${order.orderNumber} from ${order.status} to ${value}?`,
                    )
                  ) {
                    return;
                  }
                  const trackingNumber = value === "SHIPPED"
                    ? window.prompt(
                        `Tracking number for ${order.orderNumber}`,
                        order.trackingNumber ?? "",
                      )?.trim()
                    : undefined;
                  if (value === "SHIPPED" && trackingNumber === undefined) {
                    return;
                  }
                  statusMutation.mutate({
                    id: order.id,
                    status: value,
                    trackingNumber,
                  });
                }}
              >
                <option value={order.status}>{order.status}</option>
                {allowedNextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {CANCELLABLE_STATUSES.includes(order.status) && (
                <button
                  className="icon-button icon-button-danger"
                  type="button"
                  aria-label={`Cancel order ${order.orderNumber}`}
                  title="Cancel order"
                  disabled={
                    cancelMutation.isPending &&
                    cancelMutation.variables?.id === order.id
                  }
                  onClick={() => {
                    const reason = window.prompt(
                      `Cancellation reason for ${order.orderNumber}`,
                      order.cancelReason ?? "",
                    );
                    if (reason === null) return;
                    if (window.confirm(`Cancel order ${order.orderNumber}?`)) {
                      cancelMutation.mutate({
                        id: order.id,
                        reason: reason.trim() || undefined,
                      });
                    }
                  }}
                >
                  <XCircle size={16} aria-hidden="true" />
                </button>
              )}
            </div>,
          ];
        })}
      />
      {ordersQuery.data?.meta && (
        <div className="pagination-strip" aria-label="Orders pagination">
          <button
            className="ghost-button"
            type="button"
            disabled={page <= 1}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set("page", String(page - 1));
              setSearchParams(next);
            }}
          >
            Previous
          </button>
          <span>
            Page {ordersQuery.data.meta.page} of {ordersQuery.data.meta.totalPages || 1}
          </span>
          <button
            className="ghost-button"
            type="button"
            disabled={page >= ordersQuery.data.meta.totalPages}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set("page", String(page + 1));
              setSearchParams(next);
            }}
          >
            Next
          </button>
        </div>
      )}
      {selectedOrderId && (
        <OrderDetailPanel
          order={orderDetailQuery.data}
          fallback={(ordersQuery.data?.data ?? []).find(
            (order) => order.id === selectedOrderId,
          )}
          error={orderDetailQuery.error}
          loading={orderDetailQuery.isLoading}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </Panel>
  );
}

function OrderDetailPanel({
  order,
  fallback,
  error,
  loading,
  onClose,
}: {
  order?: Order;
  fallback?: Order;
  error: unknown;
  loading: boolean;
  onClose: () => void;
}) {
  const current = order ?? fallback;
  if (!current) return null;

  return (
    <section className="order-detail-panel" aria-label="Order detail">
      <div className="order-detail-header">
        <div>
          <span className="eyebrow">Order detail</span>
          <h3>{current.orderNumber}</h3>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Copy order number"
          title="Copy order number"
          onClick={() => copyText(current.orderNumber)}
        >
          <Copy size={16} aria-hidden="true" />
        </button>
        <button className="icon-button" type="button" aria-label="Close order detail" onClick={onClose}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {error ? <p className="field-error">{readError(error)}</p> : null}
      {loading ? <p className="copy-block">Loading detail…</p> : null}
      <div className="order-detail-grid">
        <article>
          <strong>Customer</strong>
          <span>{current.user?.name ?? "-"}</span>
          <small>{current.user?.email ?? "No email"}</small>
          <small>{current.user?.phone ?? "No phone"}</small>
        </article>
        <article>
          <strong>Delivery</strong>
          <span>{current.shippingMethod}</span>
          <small>
            {current.trackingNumber ? (
              <button className="text-copy-button" type="button" onClick={() => copyText(current.trackingNumber!)}>
                {current.trackingNumber} <Copy size={12} aria-hidden="true" />
              </button>
            ) : (
              "No tracking number"
            )}
          </small>
          <small>{current.address ? `${current.address.city}, ${current.address.province}` : "No address"}</small>
        </article>
        <article>
          <strong>Payment</strong>
          <span>{current.paymentStatus}</span>
          <small>{current.payment?.method ?? current.payment?.provider ?? "Method unavailable"}</small>
          <small>{current.payment?.paidAt ? `Paid ${shortDate(current.payment.paidAt)}` : "Not paid yet"}</small>
        </article>
        <article>
          <strong>Cancellation</strong>
          <span>{current.status === "CANCELLED" ? "Cancelled" : "Not cancelled"}</span>
          <small>{current.cancelReason ?? "No cancellation reason"}</small>
          <small>{current.cancelledAt ? `Cancelled ${shortDate(current.cancelledAt)}` : "No cancellation time"}</small>
        </article>
        <article>
          <strong>Totals</strong>
          <span>{money(current.total)}</span>
          <small>Subtotal {money(current.subtotal)} · Shipping {money(current.shippingCost)}</small>
          <small>{current.voucher?.code ? `Voucher ${current.voucher.code}` : `Discount ${money(current.discount)}`}</small>
        </article>
      </div>
      {current.address && (
        <div className="order-address-block">
          <strong>{current.address.recipient}</strong>
          <span>{current.address.fullAddress}, {current.address.district}, {current.address.city}, {current.address.province} {current.address.postalCode}</span>
        </div>
      )}
      <div className="order-items-list">
        {(current.items ?? []).length === 0 ? (
          <p className="copy-block">Items unavailable for this order.</p>
        ) : (
          current.items?.map((item) => (
            <article key={item.id}>
              {item.productImage && (
                <img src={normalizeAssetUrl(item.productImage)} alt="" loading="lazy" />
              )}
              <span>
                <strong>{item.productName}</strong>
                <small>{item.variantName} · {item.quantity}x</small>
              </span>
              <strong>{money(item.subtotal)}</strong>
            </article>
          ))
        )}
      </div>
      <div className="order-timeline">
        <TimelinePoint label="Created" value={current.createdAt} />
        <TimelinePoint label="Paid" value={current.paidAt ?? current.payment?.paidAt} />
        <TimelinePoint label="Shipped" value={current.shippedAt} />
        <TimelinePoint label="Delivered" value={current.deliveredAt} />
        <TimelinePoint label="Cancelled" value={current.cancelledAt} />
      </div>
    </section>
  );
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  } catch {
    toast.error("Could not copy");
  }
}

function TimelinePoint({ label, value }: { label: string; value?: string | null }) {
  return (
    <span className={value ? "active" : undefined}>
      <strong>{label}</strong>
      <small>{value ? shortDate(value) : "-"}</small>
    </span>
  );
}
