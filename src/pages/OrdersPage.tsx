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
import { useI18n, type Language } from "../context/I18nContext";
import { normalizeAssetUrl } from "../lib/asset-url";
import {
  allowedStatusTransitions,
  isOrderStatus,
  orderStatuses,
} from "../lib/constants";
import { request } from "../lib/api";
import { money, readError, shortDate } from "../lib/format";
import type {
  Order,
  OrderStatus,
  Paginated,
  PaymentStatus,
  ShippingMethod,
} from "../types";

const CANCELLABLE_STATUSES: OrderStatus[] = ["PENDING", "PAID"];

type OrdersCopy = {
  updated: string;
  cancelled: string;
  title: string;
  eyebrow: string;
  filtersLabel: string;
  status: string;
  allStatuses: string;
  reset: string;
  ordersCount: (count: number) => string;
  tableCaption: string;
  columns: { label: string; key: string }[];
  itemsCount: (count: number) => string;
  viewOrder: (orderNumber: string) => string;
  viewDetails: string;
  updateStatus: (orderNumber: string) => string;
  moveConfirm: (orderNumber: string, from: string, to: string) => string;
  trackingPrompt: (orderNumber: string) => string;
  cancelOrder: (orderNumber: string) => string;
  cancelOrderTitle: string;
  cancelReasonPrompt: (orderNumber: string) => string;
  cancelConfirm: (orderNumber: string) => string;
  paginationLabel: string;
  previous: string;
  next: string;
  pageOf: (page: number, totalPages: number) => string;
  detailLabel: string;
  detailEyebrow: string;
  copyOrderNumber: string;
  closeOrderDetail: string;
  copied: string;
  couldNotCopy: string;
  loadingDetail: string;
  customer: string;
  noEmail: string;
  noPhone: string;
  delivery: string;
  noTracking: string;
  noAddress: string;
  payment: string;
  methodUnavailable: string;
  paidAt: (date: string) => string;
  notPaidYet: string;
  cancellation: string;
  cancelledLabel: string;
  notCancelled: string;
  noCancellationReason: string;
  noCancellationTime: string;
  cancelledAt: (date: string) => string;
  totals: string;
  subtotalShipping: (subtotal: string, shipping: string) => string;
  voucher: (code: string) => string;
  discount: (value: string) => string;
  itemsUnavailable: string;
  timeline: Record<"created" | "paid" | "shipped" | "delivered" | "cancelled", string>;
  statusLabels: Record<OrderStatus, string>;
  paymentLabels: Record<PaymentStatus, string>;
  shippingLabels: Record<ShippingMethod, string>;
};

const copy: Record<Language, OrdersCopy> = {
  en: {
    updated: "Order status updated",
    cancelled: "Order cancelled",
    title: "Order management",
    eyebrow: "fulfillment",
    filtersLabel: "Order filters",
    status: "Status",
    allStatuses: "All statuses",
    reset: "Reset",
    ordersCount: (count) => `${count} ${count === 1 ? "order" : "orders"}`,
    tableCaption: "Order management table",
    columns: [
      { label: "Invoice", key: "invoice" },
      { label: "Customer", key: "customer" },
      { label: "Date", key: "date" },
      { label: "Status", key: "status" },
      { label: "Payment", key: "payment" },
      { label: "Total", key: "total" },
      { label: "Move", key: "move" },
    ],
    itemsCount: (count) => `${count} item${count === 1 ? "" : "s"}`,
    viewOrder: (orderNumber) => `View order ${orderNumber}`,
    viewDetails: "View details",
    updateStatus: (orderNumber) => `Update status for ${orderNumber}`,
    moveConfirm: (orderNumber, from, to) =>
      `Move order ${orderNumber} from ${from} to ${to}?`,
    trackingPrompt: (orderNumber) => `Tracking number for ${orderNumber}`,
    cancelOrder: (orderNumber) => `Cancel order ${orderNumber}`,
    cancelOrderTitle: "Cancel order",
    cancelReasonPrompt: (orderNumber) => `Cancellation reason for ${orderNumber}`,
    cancelConfirm: (orderNumber) => `Cancel order ${orderNumber}?`,
    paginationLabel: "Orders pagination",
    previous: "Previous",
    next: "Next",
    pageOf: (page, totalPages) => `Page ${page} of ${totalPages}`,
    detailLabel: "Order detail",
    detailEyebrow: "Order detail",
    copyOrderNumber: "Copy order number",
    closeOrderDetail: "Close order detail",
    copied: "Copied",
    couldNotCopy: "Could not copy",
    loadingDetail: "Loading detail...",
    customer: "Customer",
    noEmail: "No email",
    noPhone: "No phone",
    delivery: "Delivery",
    noTracking: "No tracking number",
    noAddress: "No address",
    payment: "Payment",
    methodUnavailable: "Method unavailable",
    paidAt: (date) => `Paid ${date}`,
    notPaidYet: "Not paid yet",
    cancellation: "Cancellation",
    cancelledLabel: "Cancelled",
    notCancelled: "Not cancelled",
    noCancellationReason: "No cancellation reason",
    noCancellationTime: "No cancellation time",
    cancelledAt: (date) => `Cancelled ${date}`,
    totals: "Totals",
    subtotalShipping: (subtotal, shipping) => `Subtotal ${subtotal} · Shipping ${shipping}`,
    voucher: (code) => `Voucher ${code}`,
    discount: (value) => `Discount ${value}`,
    itemsUnavailable: "Items unavailable for this order.",
    timeline: {
      created: "Created",
      paid: "Paid",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
    },
    statusLabels: {
      PENDING: "Pending",
      PAID: "Paid",
      PACKED: "Packed",
      SHIPPED: "Shipped",
      DELIVERED: "Delivered",
      CANCELLED: "Cancelled",
    },
    paymentLabels: {
      UNPAID: "Unpaid",
      PAID: "Paid",
      REFUNDED: "Refunded",
      FAILED: "Failed",
      EXPIRED: "Expired",
    },
    shippingLabels: {
      REGULAR: "Regular",
      EXPRESS: "Express",
      SAME_DAY: "Same day",
    },
  },
  id: {
    updated: "Status pesanan diperbarui",
    cancelled: "Pesanan dibatalkan",
    title: "Manajemen pesanan",
    eyebrow: "fulfillment",
    filtersLabel: "Filter pesanan",
    status: "Status",
    allStatuses: "Semua status",
    reset: "Reset",
    ordersCount: (count) => `${count} pesanan`,
    tableCaption: "Tabel manajemen pesanan",
    columns: [
      { label: "Invoice", key: "invoice" },
      { label: "Pelanggan", key: "customer" },
      { label: "Tanggal", key: "date" },
      { label: "Status", key: "status" },
      { label: "Pembayaran", key: "payment" },
      { label: "Total", key: "total" },
      { label: "Aksi", key: "move" },
    ],
    itemsCount: (count) => `${count} item`,
    viewOrder: (orderNumber) => `Lihat pesanan ${orderNumber}`,
    viewDetails: "Lihat detail",
    updateStatus: (orderNumber) => `Ubah status untuk ${orderNumber}`,
    moveConfirm: (orderNumber, from, to) =>
      `Pindahkan pesanan ${orderNumber} dari ${from} ke ${to}?`,
    trackingPrompt: (orderNumber) => `Nomor resi untuk ${orderNumber}`,
    cancelOrder: (orderNumber) => `Batalkan pesanan ${orderNumber}`,
    cancelOrderTitle: "Batalkan pesanan",
    cancelReasonPrompt: (orderNumber) => `Alasan pembatalan untuk ${orderNumber}`,
    cancelConfirm: (orderNumber) => `Batalkan pesanan ${orderNumber}?`,
    paginationLabel: "Paginasi pesanan",
    previous: "Sebelumnya",
    next: "Berikutnya",
    pageOf: (page, totalPages) => `Halaman ${page} dari ${totalPages}`,
    detailLabel: "Detail pesanan",
    detailEyebrow: "Detail pesanan",
    copyOrderNumber: "Copy nomor pesanan",
    closeOrderDetail: "Tutup detail pesanan",
    copied: "Copied",
    couldNotCopy: "Could not copy",
    loadingDetail: "Memuat detail...",
    customer: "Pelanggan",
    noEmail: "Tidak ada email",
    noPhone: "Tidak ada nomor telepon",
    delivery: "Delivery",
    noTracking: "Belum ada nomor resi",
    noAddress: "Tidak ada alamat",
    payment: "Pembayaran",
    methodUnavailable: "Method unavailable",
    paidAt: (date) => `Paid ${date}`,
    notPaidYet: "Not paid yet",
    cancellation: "Pembatalan",
    cancelledLabel: "Dibatalkan",
    notCancelled: "Tidak dibatalkan",
    noCancellationReason: "Tidak ada alasan pembatalan",
    noCancellationTime: "Tidak ada waktu pembatalan",
    cancelledAt: (date) => `Dibatalkan ${date}`,
    totals: "Total",
    subtotalShipping: (subtotal, shipping) => `Subtotal ${subtotal} · Shipping ${shipping}`,
    voucher: (code) => `Voucher ${code}`,
    discount: (value) => `Diskon ${value}`,
    itemsUnavailable: "Item tidak tersedia untuk pesanan ini.",
    timeline: {
      created: "Created",
      paid: "Paid",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
    },
    statusLabels: {
      PENDING: "Pending",
      PAID: "Paid",
      PACKED: "Packed",
      SHIPPED: "Shipped",
      DELIVERED: "Delivered",
      CANCELLED: "Cancelled",
    },
    paymentLabels: {
      UNPAID: "Unpaid",
      PAID: "Paid",
      REFUNDED: "Refunded",
      FAILED: "Failed",
      EXPIRED: "Expired",
    },
    shippingLabels: {
      REGULAR: "Regular",
      EXPRESS: "Express",
      SAME_DAY: "Same Day",
    },
  },
};

export function OrdersPage() {
  const token = useToken();
  const { language } = useI18n();
  const c = copy[language];
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
      toast.success(c.updated);
    },
    onError: (error) => toast.error(readError(error, language)),
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
      toast.success(c.cancelled);
    },
    onError: (error) => toast.error(readError(error, language)),
  });
  const orderDetailQuery = useQuery({
    queryKey: ["orders", "detail", selectedOrderId],
    enabled: Boolean(selectedOrderId),
    queryFn: ({ signal }) =>
      request<Order>(`/orders/${selectedOrderId}`, { token, signal }),
  });

  if (ordersQuery.isLoading) return <LoadingState />;
  if (ordersQuery.error)
    return <ErrorState message={readError(ordersQuery.error, language)} />;

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
    <Panel title={c.title} eyebrow={c.eyebrow}>
      <div className="orders-toolbar" aria-label={c.filtersLabel}>
        <label htmlFor="order-status-filter">
          {c.status}
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
            <option value="">{c.allStatuses}</option>
            {[...orderStatuses, "CANCELLED" as OrderStatus].map((status) => (
              <option key={status} value={status}>
                {c.statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="ghost-button"
          type="button"
          onClick={() => setSearchParams(new URLSearchParams())}
        >
          {c.reset}
        </button>
        <span className="orders-toolbar-meta">
          {c.ordersCount(ordersQuery.data?.meta.total ?? 0)}
        </span>
      </div>
      <DataTable
        caption={c.tableCaption}
        columns={c.columns}
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
                <span>{c.itemsCount(itemCount)}</span>
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
            shortDate(order.createdAt, language),
            <Badge key={`${order.id}-status`} tone={orderTone(order.status)}>
              {c.statusLabels[order.status]}
            </Badge>,
            <Badge
              key={`${order.id}-payment`}
              tone={paymentTone(order.paymentStatus)}
            >
              {c.paymentLabels[order.paymentStatus]}
            </Badge>,
            <strong className="order-total-cell">{money(order.total)}</strong>,
            <div key={`${order.id}-actions`} className="order-action-cell">
              <button
                className="icon-button"
                type="button"
                aria-label={c.viewOrder(order.orderNumber)}
                title={c.viewDetails}
                onClick={() => setSelectedOrderId(order.id)}
              >
                <Eye size={16} aria-hidden="true" />
              </button>
              <select
                className="order-status-select"
                aria-label={c.updateStatus(order.orderNumber)}
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
                      c.moveConfirm(
                        order.orderNumber,
                        c.statusLabels[order.status],
                        c.statusLabels[value],
                      ),
                    )
                  ) {
                    return;
                  }
                  const trackingNumber = value === "SHIPPED"
                    ? window.prompt(
                        c.trackingPrompt(order.orderNumber),
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
                <option value={order.status}>{c.statusLabels[order.status]}</option>
                {allowedNextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {c.statusLabels[status]}
                  </option>
                ))}
              </select>
              {CANCELLABLE_STATUSES.includes(order.status) && (
                <button
                  className="icon-button icon-button-danger"
                  type="button"
                  aria-label={c.cancelOrder(order.orderNumber)}
                  title={c.cancelOrderTitle}
                  disabled={
                    cancelMutation.isPending &&
                    cancelMutation.variables?.id === order.id
                  }
                  onClick={() => {
                    const reason = window.prompt(
                      c.cancelReasonPrompt(order.orderNumber),
                      order.cancelReason ?? "",
                    );
                    if (reason === null) return;
                    if (window.confirm(c.cancelConfirm(order.orderNumber))) {
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
        <div className="pagination-strip" aria-label={c.paginationLabel}>
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
            {c.previous}
          </button>
          <span>
            {c.pageOf(
              ordersQuery.data.meta.page,
              ordersQuery.data.meta.totalPages || 1,
            )}
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
            {c.next}
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
          language={language}
          c={c}
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
  language,
  c,
  onClose,
}: {
  order?: Order;
  fallback?: Order;
  error: unknown;
  loading: boolean;
  language: Language;
  c: OrdersCopy;
  onClose: () => void;
}) {
  const current = order ?? fallback;
  if (!current) return null;

  return (
    <section className="order-detail-panel" aria-label={c.detailLabel}>
      <div className="order-detail-header">
        <div>
          <span className="eyebrow">{c.detailEyebrow}</span>
          <h3>{current.orderNumber}</h3>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label={c.copyOrderNumber}
          title={c.copyOrderNumber}
          onClick={() => copyText(current.orderNumber, c)}
        >
          <Copy size={16} aria-hidden="true" />
        </button>
        <button className="icon-button" type="button" aria-label={c.closeOrderDetail} onClick={onClose}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {error ? <p className="field-error">{readError(error, language)}</p> : null}
      {loading ? <p className="copy-block">{c.loadingDetail}</p> : null}
      <div className="order-detail-grid">
        <article>
          <strong>{c.customer}</strong>
          <span>{current.user?.name ?? "-"}</span>
          <small>{current.user?.email ?? c.noEmail}</small>
          <small>{current.user?.phone ?? c.noPhone}</small>
        </article>
        <article>
          <strong>{c.delivery}</strong>
          <span>{c.shippingLabels[current.shippingMethod]}</span>
          <small>
            {current.trackingNumber ? (
              <button className="text-copy-button" type="button" onClick={() => copyText(current.trackingNumber!, c)}>
                {current.trackingNumber} <Copy size={12} aria-hidden="true" />
              </button>
            ) : (
              c.noTracking
            )}
          </small>
          <small>{current.address ? `${current.address.city}, ${current.address.province}` : c.noAddress}</small>
        </article>
        <article>
          <strong>{c.payment}</strong>
          <span>{c.paymentLabels[current.paymentStatus]}</span>
          <small>{current.payment?.method ?? current.payment?.provider ?? c.methodUnavailable}</small>
          <small>{current.payment?.paidAt ? c.paidAt(shortDate(current.payment.paidAt, language)) : c.notPaidYet}</small>
        </article>
        <article>
          <strong>{c.cancellation}</strong>
          <span>{current.status === "CANCELLED" ? c.cancelledLabel : c.notCancelled}</span>
          <small>{current.cancelReason ?? c.noCancellationReason}</small>
          <small>{current.cancelledAt ? c.cancelledAt(shortDate(current.cancelledAt, language)) : c.noCancellationTime}</small>
        </article>
        <article>
          <strong>{c.totals}</strong>
          <span>{money(current.total)}</span>
          <small>{c.subtotalShipping(money(current.subtotal), money(current.shippingCost))}</small>
          <small>{current.voucher?.code ? c.voucher(current.voucher.code) : c.discount(money(current.discount))}</small>
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
          <p className="copy-block">{c.itemsUnavailable}</p>
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
        <TimelinePoint label={c.timeline.created} value={current.createdAt} language={language} />
        <TimelinePoint label={c.timeline.paid} value={current.paidAt ?? current.payment?.paidAt} language={language} />
        <TimelinePoint label={c.timeline.shipped} value={current.shippedAt} language={language} />
        <TimelinePoint label={c.timeline.delivered} value={current.deliveredAt} language={language} />
        <TimelinePoint label={c.timeline.cancelled} value={current.cancelledAt} language={language} />
      </div>
    </section>
  );
}

async function copyText(value: string, c: OrdersCopy) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(c.copied);
  } catch {
    toast.error(c.couldNotCopy);
  }
}

function TimelinePoint({
  label,
  value,
  language,
}: {
  label: string;
  value?: string | null;
  language: Language;
}) {
  return (
    <span className={value ? "active" : undefined}>
      <strong>{label}</strong>
      <small>{value ? shortDate(value, language) : "-"}</small>
    </span>
  );
}
