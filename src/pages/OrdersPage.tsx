import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, Search, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge, orderTone, paymentTone } from "../components/Badge";
import {
  DataTable,
  type ColumnDef,
  type SortChangeDirection,
  type SortDirection,
} from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PaginationStrip } from "../components/PaginationStrip";
import { Panel } from "../components/Panel";
import { SelectMenu } from "../components/SelectMenu";
import { useToken } from "../context/AuthContext";
import { useI18n, type Language } from "../context/I18nContext";
import { normalizeAssetUrl } from "../lib/asset-url";
import {
  allowedStatusTransitions,
  isPaymentStatus,
  isOrderStatus,
  isShippingMethod,
  orderStatuses,
  paymentStatuses,
  shippingMethods,
} from "../lib/constants";
import { request } from "../lib/api";
import { money, readError, shortDate } from "../lib/format";
import { useDebouncedSearchParam } from "../lib/useDebouncedSearchParam";
import type {
  Order,
  OrderStatus,
  Paginated,
  PaymentStatus,
  ShippingMethod,
} from "../types";

const CANCELLABLE_STATUSES: OrderStatus[] = ["PENDING", "PAID"];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const orderSortKeys = [
  "orderNumber",
  "createdAt",
  "status",
  "paymentStatus",
  "total",
] as const;
type OrderSortKey = (typeof orderSortKeys)[number];

function isOrderSortKey(value: string): value is OrderSortKey {
  return (orderSortKeys as readonly string[]).includes(value);
}

function isSortDirection(value: string): value is SortDirection {
  return value === "asc" || value === "desc";
}

type OrdersCopy = {
  updated: string;
  cancelled: string;
  title: string;
  eyebrow: string;
  filtersLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  status: string;
  allStatuses: string;
  paymentStatus: string;
  allPaymentStatuses: string;
  shippingMethod: string;
  allShippingMethods: string;
  reset: string;
  ordersCount: (count: number) => string;
  tableCaption: string;
  columns: ColumnDef[];
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
  rowsPerPage: string;
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
  address: string;
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
  items: string;
  itemsUnavailable: string;
  timelineTitle: string;
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
    searchLabel: "Search orders",
    searchPlaceholder: "Invoice, customer, product, voucher",
    status: "Status",
    allStatuses: "All statuses",
    paymentStatus: "Payment",
    allPaymentStatuses: "All payments",
    shippingMethod: "Shipping",
    allShippingMethods: "All shipping",
    reset: "Reset",
    ordersCount: (count) => `${count} ${count === 1 ? "order" : "orders"}`,
    tableCaption: "Order management table",
    columns: [
      { label: "Invoice", key: "invoice", sortKey: "orderNumber", sortable: true },
      { label: "Customer", key: "customer" },
      { label: "Date", key: "date", sortKey: "createdAt", sortable: true },
      { label: "Status", key: "status", sortable: true },
      { label: "Payment", key: "payment", sortKey: "paymentStatus", sortable: true },
      { label: "Total", key: "total", sortable: true },
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
    rowsPerPage: "Rows per page",
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
    address: "Shipping address",
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
    items: "Items",
    itemsUnavailable: "Items unavailable for this order.",
    timelineTitle: "Timeline",
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
    searchLabel: "Cari pesanan",
    searchPlaceholder: "Invoice, pelanggan, produk, voucher",
    status: "Status",
    allStatuses: "Semua status",
    paymentStatus: "Pembayaran",
    allPaymentStatuses: "Semua pembayaran",
    shippingMethod: "Pengiriman",
    allShippingMethods: "Semua pengiriman",
    reset: "Reset",
    ordersCount: (count) => `${count} pesanan`,
    tableCaption: "Tabel manajemen pesanan",
    columns: [
      { label: "Invoice", key: "invoice", sortKey: "orderNumber", sortable: true },
      { label: "Pelanggan", key: "customer" },
      { label: "Tanggal", key: "date", sortKey: "createdAt", sortable: true },
      { label: "Status", key: "status", sortable: true },
      { label: "Pembayaran", key: "payment", sortKey: "paymentStatus", sortable: true },
      { label: "Total", key: "total", sortable: true },
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
    rowsPerPage: "Baris per halaman",
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
    delivery: "Pengiriman",
    address: "Alamat pengiriman",
    noTracking: "Belum ada nomor resi",
    noAddress: "Tidak ada alamat",
    payment: "Pembayaran",
    methodUnavailable: "Metode tidak tersedia",
    paidAt: (date) => `Dibayar ${date}`,
    notPaidYet: "Belum dibayar",
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
    items: "Item pesanan",
    itemsUnavailable: "Item tidak tersedia untuk pesanan ini.",
    timelineTitle: "Timeline",
    timeline: {
      created: "Dibuat",
      paid: "Dibayar",
      shipped: "Dikirim",
      delivered: "Selesai",
      cancelled: "Dibatalkan",
    },
    statusLabels: {
      PENDING: "Menunggu",
      PAID: "Dibayar",
      PACKED: "Dikemas",
      SHIPPED: "Dikirim",
      DELIVERED: "Selesai",
      CANCELLED: "Dibatalkan",
    },
    paymentLabels: {
      UNPAID: "Belum bayar",
      PAID: "Dibayar",
      REFUNDED: "Dikembalikan",
      FAILED: "Gagal",
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
  const searchFilter = searchParams.get("search") ?? "";
  const [orderSearchDraft, setOrderSearchDraft] = useDebouncedSearchParam({
    value: searchFilter,
    searchParams,
    setSearchParams,
  });
  const statusParam = searchParams.get("status") ?? "";
  const paymentStatusParam = searchParams.get("paymentStatus") ?? "";
  const shippingMethodParam = searchParams.get("shippingMethod") ?? "";
  const sortByParam = searchParams.get("sortBy") ?? "";
  const sortDirParam = searchParams.get("sortDir") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const pageSizeParam = Number(searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE));
  const statusFilter = isOrderStatus(statusParam) ? statusParam : "";
  const paymentStatusFilter = isPaymentStatus(paymentStatusParam)
    ? paymentStatusParam
    : "";
  const shippingMethodFilter = isShippingMethod(shippingMethodParam)
    ? shippingMethodParam
    : "";
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = PAGE_SIZE_OPTIONS.includes(pageSizeParam)
    ? pageSizeParam
    : DEFAULT_PAGE_SIZE;
  const visibleSortBy = isOrderSortKey(sortByParam) ? sortByParam : "";
  const visibleSortDir = isSortDirection(sortDirParam) ? sortDirParam : "desc";
  const sortBy = visibleSortBy || "createdAt";
  const sortDir = visibleSortBy ? visibleSortDir : "desc";
  const ordersPath = new URLSearchParams({ limit: String(pageSize), page: String(page) });
  if (searchFilter.trim()) ordersPath.set("search", searchFilter.trim());
  if (statusFilter) ordersPath.set("status", statusFilter);
  if (paymentStatusFilter) ordersPath.set("paymentStatus", paymentStatusFilter);
  if (shippingMethodFilter) ordersPath.set("shippingMethod", shippingMethodFilter);
  ordersPath.set("sortBy", sortBy);
  ordersPath.set("sortDir", sortDir);
  const ordersQuery = useQuery({
    queryKey: [
      "orders",
      searchFilter.trim(),
      statusFilter,
      paymentStatusFilter,
      shippingMethodFilter,
      sortBy,
      sortDir,
      page,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      request<Paginated<Order>>(`/orders?${ordersPath.toString()}`, { token, signal }),
    placeholderData: (previousData) => previousData,
  });
  const orderTotalPages = Math.max(ordersQuery.data?.meta.totalPages ?? 1, 1);
  useEffect(() => {
    if (
      !ordersQuery.data ||
      ordersQuery.isPlaceholderData ||
      page <= orderTotalPages
    ) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set("page", String(orderTotalPages));
    setSearchParams(next, { replace: true });
  }, [
    page,
    orderTotalPages,
    ordersQuery.data,
    ordersQuery.isPlaceholderData,
    searchParams,
    setSearchParams,
  ]);
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

  const setOrderParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setSearchParams(next);
  };

  const setOrderSort = (key: string, direction: SortChangeDirection) => {
    const next = new URLSearchParams(searchParams);
    if (direction) {
      next.set("sortBy", key);
      next.set("sortDir", direction);
    } else {
      next.delete("sortBy");
      next.delete("sortDir");
    }
    next.set("page", "1");
    setSearchParams(next);
  };

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

  const moveOrderStatus = (order: Order, value: OrderStatus) => {
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
  };

  return (
    <Panel
      title={c.title}
      eyebrow={c.eyebrow}
      headerMeta={c.ordersCount(ordersQuery.data?.meta.total ?? 0)}
      className={
        selectedOrderId
          ? "orders-list-panel orders-list-panel-with-detail"
          : "orders-list-panel"
      }
    >
      <div className="orders-toolbar" aria-label={c.filtersLabel}>
        <label htmlFor="order-search">
          {c.searchLabel}
          <span className="filter-input-with-icon">
            <Search size={16} aria-hidden="true" />
            <input
              id="order-search"
              name="search"
              type="search"
              autoComplete="off"
              value={orderSearchDraft}
              onChange={(event) => setOrderSearchDraft(event.target.value)}
              placeholder={c.searchPlaceholder}
            />
          </span>
        </label>
        <label htmlFor="order-status-filter">
          {c.status}
          <SelectMenu
            id="order-status-filter"
            value={statusFilter}
            options={[
              { value: "", label: c.allStatuses },
              ...[...orderStatuses, "CANCELLED" as OrderStatus].map((status) => ({
                value: status,
                label: c.statusLabels[status],
              })),
            ]}
            onChange={(value) => setOrderParam("status", value)}
          />
        </label>
        <label htmlFor="order-payment-filter">
          {c.paymentStatus}
          <SelectMenu
            id="order-payment-filter"
            value={paymentStatusFilter}
            options={[
              { value: "", label: c.allPaymentStatuses },
              ...paymentStatuses.map((status) => ({
                value: status,
                label: c.paymentLabels[status],
              })),
            ]}
            onChange={(value) => setOrderParam("paymentStatus", value)}
          />
        </label>
        <label htmlFor="order-shipping-filter">
          {c.shippingMethod}
          <SelectMenu
            id="order-shipping-filter"
            value={shippingMethodFilter}
            options={[
              { value: "", label: c.allShippingMethods },
              ...shippingMethods.map((method) => ({
                value: method,
                label: c.shippingLabels[method],
              })),
            ]}
            onChange={(value) => setOrderParam("shippingMethod", value)}
          />
        </label>
        <button
          className="ghost-button"
          type="button"
          onClick={() => setSearchParams(new URLSearchParams())}
        >
          {c.reset}
        </button>
      </div>
      <DataTable
        caption={c.tableCaption}
        columns={c.columns}
        sort={{ key: visibleSortBy, direction: visibleSortDir, onSort: setOrderSort }}
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
              <OrderStatusMenu
                order={order}
                statuses={allowedNextStatuses}
                disabled={
                  allowedNextStatuses.length === 0 ||
                  (statusMutation.isPending &&
                    statusMutation.variables?.id === order.id)
                }
                c={c}
                onMove={(status) => moveOrderStatus(order, status)}
              />
              <button
                className="order-detail-button"
                type="button"
                aria-label={c.viewOrder(order.orderNumber)}
                title={c.viewDetails}
                onClick={() => setSelectedOrderId(order.id)}
              >
                <Eye size={16} aria-hidden="true" />
                <span>{c.viewDetails}</span>
              </button>
              {CANCELLABLE_STATUSES.includes(order.status) && (
                <button
                  className="icon-button icon-button-danger order-cancel-button"
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
      <PaginationStrip
        meta={ordersQuery.data?.meta}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        label={c.paginationLabel}
        pageSizeLabel={c.rowsPerPage}
        previous={c.previous}
        next={c.next}
        pageOf={c.pageOf}
        onPageChange={(nextPage) => {
          const next = new URLSearchParams(searchParams);
          next.set("page", String(nextPage));
          setSearchParams(next);
        }}
        onPageSizeChange={(nextPageSize) => {
          const next = new URLSearchParams(searchParams);
          next.set("limit", String(nextPageSize));
          next.set("page", "1");
          setSearchParams(next);
        }}
      />
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
  const itemCount = current._count?.items ?? current.items?.length ?? 0;

  return (
    <section className="order-detail-panel" aria-label={c.detailLabel}>
      <div className="order-detail-header">
        <div className="order-detail-title">
          <span className="eyebrow">{c.detailEyebrow}</span>
          <h3>{current.orderNumber}</h3>
          <div className="order-detail-badges">
            <Badge tone={orderTone(current.status)}>
              {c.statusLabels[current.status]}
            </Badge>
            <Badge tone={paymentTone(current.paymentStatus)}>
              {c.paymentLabels[current.paymentStatus]}
            </Badge>
          </div>
        </div>
        <div className="order-detail-header-actions">
          <button
            className="order-detail-copy-button"
            type="button"
            aria-label={c.copyOrderNumber}
            title={c.copyOrderNumber}
            onClick={() => copyText(current.orderNumber, c)}
          >
            <Copy size={15} aria-hidden="true" />
            <span>{c.copyOrderNumber}</span>
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={c.closeOrderDetail}
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      {error ? <p className="field-error">{readError(error, language)}</p> : null}
      {loading ? <p className="copy-block">{c.loadingDetail}</p> : null}
      <div className="order-detail-summary">
        <article className="order-summary-card order-summary-card-total">
          <span>{c.totals}</span>
          <strong>{money(current.total)}</strong>
          <small>
            {c.subtotalShipping(money(current.subtotal), money(current.shippingCost))}
          </small>
        </article>
        <article className="order-summary-card">
          <span>{c.delivery}</span>
          <strong>{c.shippingLabels[current.shippingMethod]}</strong>
          <small>
            {current.trackingNumber ? (
              <button
                className="text-copy-button"
                type="button"
                onClick={() => copyText(current.trackingNumber!, c)}
              >
                {current.trackingNumber} <Copy size={12} aria-hidden="true" />
              </button>
            ) : (
              c.noTracking
            )}
          </small>
        </article>
        <article className="order-summary-card">
          <span>{c.payment}</span>
          <strong>{current.payment?.method ?? current.payment?.provider ?? c.methodUnavailable}</strong>
          <small>
            {current.payment?.paidAt
              ? c.paidAt(shortDate(current.payment.paidAt, language))
              : c.notPaidYet}
          </small>
        </article>
      </div>
      <div className="order-detail-grid">
        <article>
          <strong>{c.customer}</strong>
          <span>{current.user?.name ?? "-"}</span>
          <small>{current.user?.email ?? c.noEmail}</small>
          <small>{current.user?.phone ?? c.noPhone}</small>
        </article>
        <article>
          <strong>{c.cancellation}</strong>
          <span>{current.status === "CANCELLED" ? c.cancelledLabel : c.notCancelled}</span>
          <small>{current.cancelReason ?? c.noCancellationReason}</small>
          <small>{current.cancelledAt ? c.cancelledAt(shortDate(current.cancelledAt, language)) : c.noCancellationTime}</small>
        </article>
      </div>
      {current.address && (
        <div className="order-detail-section order-address-block">
          <div className="order-section-heading">
            <strong>{c.address}</strong>
            <span>{current.address.city}, {current.address.province}</span>
          </div>
          <p>
            {current.address.fullAddress}, {current.address.district}, {current.address.city}, {current.address.province} {current.address.postalCode}
          </p>
          <small>{current.address.recipient} · {current.address.phone}</small>
        </div>
      )}
      <div className="order-detail-section">
        <div className="order-section-heading">
          <strong>{c.items}</strong>
          <span>{c.itemsCount(itemCount)}</span>
        </div>
        <div className="order-items-list">
          {(current.items ?? []).length === 0 ? (
            <p className="copy-block">{c.itemsUnavailable}</p>
          ) : (
            current.items?.map((item) => (
              <article key={item.id}>
                {item.productImage ? (
                  <img src={normalizeAssetUrl(item.productImage)} alt="" loading="lazy" />
                ) : (
                  <span className="order-item-thumb-empty" aria-hidden="true">
                    {item.productName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="order-item-copy">
                  <strong title={item.productName}>{item.productName}</strong>
                  <small>{item.variantName} · {item.quantity}x</small>
                </span>
                <strong className="order-item-total">{money(item.subtotal)}</strong>
              </article>
            ))
          )}
        </div>
      </div>
      <div className="order-detail-section">
        <div className="order-section-heading">
          <strong>{c.timelineTitle}</strong>
        </div>
        <div className="order-timeline">
          <TimelinePoint label={c.timeline.created} value={current.createdAt} language={language} />
          <TimelinePoint label={c.timeline.paid} value={current.paidAt ?? current.payment?.paidAt} language={language} />
          <TimelinePoint label={c.timeline.shipped} value={current.shippedAt} language={language} />
          <TimelinePoint label={c.timeline.delivered} value={current.deliveredAt} language={language} />
          <TimelinePoint label={c.timeline.cancelled} value={current.cancelledAt} language={language} />
        </div>
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

function OrderStatusMenu({
  order,
  statuses,
  disabled,
  c,
  onMove,
}: {
  order: Order;
  statuses: OrderStatus[];
  disabled: boolean;
  c: OrdersCopy;
  onMove: (status: OrderStatus) => void;
}) {
  return (
    <SelectMenu
      className="order-status-menu"
      menuClassName="order-status-menu-list"
      optionClassName="order-status-menu-option"
      value={order.status}
      options={statuses.map((status) => ({
        value: status,
        label: c.statusLabels[status],
      }))}
      triggerLabel={c.statusLabels[order.status]}
      disabled={disabled}
      ariaLabel={c.updateStatus(order.orderNumber)}
      onChange={(value) => onMove(value as OrderStatus)}
      renderOption={(option) => (
        <Badge tone={orderTone(option.value as OrderStatus)}>{option.label}</Badge>
      )}
    />
  );
}
