import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Power, PowerOff, Search, TicketPlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ActionSheet } from "../components/ActionSheet";
import {
  DataTable,
  type ColumnDef,
  type SortChangeDirection,
  type SortDirection,
} from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { NumberInput } from "../components/NumberInput";
import { PaginationStrip } from "../components/PaginationStrip";
import { Panel } from "../components/Panel";
import { SelectMenu } from "../components/SelectMenu";
import { useToken } from "../context/AuthContext";
import { useI18n, type Language } from "../context/I18nContext";
import { ApiError, request } from "../lib/api";
import { voucherTypes } from "../lib/constants";
import {
  money,
  parseWholeNumberInput,
  readError,
  readFormError,
  shortDate,
  toNumber,
} from "../lib/format";
import type { Paginated, Voucher, VoucherType } from "../types";

const emptyNumberToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const normalized = parseWholeNumberInput(value);
  return normalized === "" ? undefined : normalized;
};

const emptyNumberToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const normalized = parseWholeNumberInput(value);
  return normalized === "" ? null : normalized;
};

const voucherSchema = z
  .object({
    code: z.string().trim().min(3, "Enter at least 3 characters"),
    type: z.enum(["FIXED", "PERCENTAGE"]),
    value: z.preprocess(
      emptyNumberToUndefined,
      z.coerce.number().min(0, "Enter 0 or a positive number"),
    ),
    minPurchase: z.preprocess(
      emptyNumberToUndefined,
      z.coerce.number().min(0, "Enter 0 or a positive number"),
    ),
    maxDiscount: z.preprocess(
      emptyNumberToNull,
      z.coerce
        .number()
        .min(0, "Enter 0 or a positive number")
        .nullable()
        .optional(),
    ),
    quota: z.preprocess(
      emptyNumberToUndefined,
      z.coerce.number().int("Enter a whole number").min(1, "Enter at least 1"),
    ),
    startsAt: z.string().optional(),
    expiresAt: z.string().min(1, "Choose an expiry date"),
    isActive: z.boolean(),
  })
  // A PERCENTAGE voucher value above 100 would discount more than the
  // purchase amount before the maxDiscount/subtotal caps kick in. The backend
  // also enforces @Max(100) for PERCENTAGE, so reject it client-side too for a
  // clear inline error instead of a 400 round-trip.
  .refine((v) => v.type !== "PERCENTAGE" || v.value <= 100, {
    message: "Use a percentage from 0 to 100",
    path: ["value"],
  })
  .refine(
    (v) => !v.startsAt || !v.expiresAt || new Date(v.expiresAt) > new Date(v.startsAt),
    {
      message: "Expiry must be after the start time",
      path: ["expiresAt"],
    },
  );

type VoucherFormInput = z.input<typeof voucherSchema>;
type VoucherForm = z.output<typeof voucherSchema>;

const emptyVoucherForm: VoucherFormInput = {
  code: "",
  type: "FIXED",
  value: 0,
  minPurchase: 0,
  maxDiscount: "",
  quota: 100,
  startsAt: "",
  expiresAt: "",
  isActive: true,
};
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

type VoucherCopy = {
  created: string;
  updated: string;
  deactivated: string;
  deleted: string;
  statusUpdated: string;
  listTitle: string;
  listEyebrow: string;
  tableCaption: string;
  filtersLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  vouchersCount: (count: number) => string;
  allTypes: string;
  allStatuses: string;
  status: string;
  reset: string;
  columns: ColumnDef[];
  voucherLabel: string;
  typeLabels: Record<VoucherType, string>;
  to: string;
  edit: string;
  disable: string;
  enable: string;
  confirmDisable: (code: string) => string;
  deletePermanent: string;
  deletePermanentVoucher: (code: string) => string;
  deletePermanentDisabled: string;
  confirmDeletePermanent: (code: string) => string;
  formCreate: string;
  formEdit: string;
  formEyebrow: string;
  code: string;
  type: string;
  value: string;
  quota: string;
  minimumPurchase: string;
  maxDiscount: string;
  starts: string;
  expiry: string;
  storedUtc: string;
  active: string;
  inactive: string;
  activeHelp: string;
  scheduled: string;
  expired: string;
  exhausted: string;
  update: string;
  create: string;
  createDialog: string;
  cancel: string;
  paginationLabel: string;
  rowsPerPage: string;
  previous: string;
  next: string;
  pageOf: (page: number, totalPages: number) => string;
};

type VoucherStatusFilter =
  | ""
  | "ACTIVE"
  | "INACTIVE"
  | "SCHEDULED"
  | "EXPIRED"
  | "EXHAUSTED";
type VoucherListData = Paginated<Voucher> & { fetchedAt: number };

const voucherStatusFilters: Exclude<VoucherStatusFilter, "">[] = [
  "ACTIVE",
  "INACTIVE",
  "SCHEDULED",
  "EXPIRED",
  "EXHAUSTED",
];
const voucherSortKeys = [
  "createdAt",
  "code",
  "type",
  "value",
  "quota",
  "minPurchase",
  "expiresAt",
] as const;
type VoucherSortKey = (typeof voucherSortKeys)[number];

const copy: Record<Language, VoucherCopy> = {
  en: {
    created: "Voucher created",
    updated: "Voucher updated",
    deactivated: "Voucher deactivated",
    deleted: "Voucher permanently deleted",
    statusUpdated: "Voucher status updated",
    listTitle: "Vouchers",
    listEyebrow: "promo rules",
    tableCaption: "Voucher rules table",
    filtersLabel: "Voucher filters",
    searchLabel: "Search vouchers",
    searchPlaceholder: "Search code or description",
    vouchersCount: (count) => `${count} ${count === 1 ? "voucher" : "vouchers"}`,
    allTypes: "All types",
    allStatuses: "All statuses",
    status: "Status",
    reset: "Reset",
    columns: [
      { label: "Code", key: "code", sortable: true, defaultSortDirection: "asc" },
      { label: "Type", key: "type", sortable: true, defaultSortDirection: "asc" },
      { label: "Value", key: "value", sortable: true },
      { label: "Quota", key: "quota", sortable: true },
      { label: "Minimum", key: "minimum", sortKey: "minPurchase", sortable: true },
      { label: "Validity", key: "validity", sortKey: "expiresAt", sortable: true },
      { label: "Status", key: "status" },
      { label: "Action", key: "action" },
    ],
    voucherLabel: "voucher",
    typeLabels: { FIXED: "Fixed", PERCENTAGE: "Percentage" },
    to: "to",
    edit: "Edit",
    disable: "Disable",
    enable: "Enable",
    confirmDisable: (code: string) => `Disable voucher ${code}?`,
    deletePermanent: "Delete permanently",
    deletePermanentVoucher: (code: string) => `Delete voucher ${code} permanently`,
    deletePermanentDisabled: "Used vouchers cannot be permanently deleted",
    confirmDeletePermanent: (code: string) =>
      `Permanently delete voucher "${code}"? Only unused vouchers can be deleted. This cannot be undone.`,
    formCreate: "Create voucher",
    formEdit: "Edit voucher",
    formEyebrow: "controlled discount",
    code: "Code",
    type: "Type",
    value: "Value",
    quota: "Quota",
    minimumPurchase: "Minimum purchase",
    maxDiscount: "Max discount",
    starts: "Starts",
    expiry: "Expiry",
    storedUtc: "Stored as UTC",
    active: "Active",
    inactive: "Inactive",
    activeHelp: "Inactive vouchers are hidden from customer voucher lists.",
    scheduled: "Scheduled",
    expired: "Expired",
    exhausted: "Exhausted",
    update: "Update voucher",
    create: "Create voucher",
    createDialog: "Create",
    cancel: "Cancel",
    paginationLabel: "Voucher table pagination",
    rowsPerPage: "Rows per page",
    previous: "Previous",
    next: "Next",
    pageOf: (page, totalPages) => `Page ${page} of ${totalPages}`,
  },
  id: {
    created: "Voucher dibuat",
    updated: "Voucher diperbarui",
    deactivated: "Voucher dinonaktifkan",
    deleted: "Voucher dihapus permanen",
    statusUpdated: "Status voucher diperbarui",
    listTitle: "Voucher",
    listEyebrow: "aturan promo",
    tableCaption: "Tabel aturan voucher",
    filtersLabel: "Filter voucher",
    searchLabel: "Cari voucher",
    searchPlaceholder: "Cari kode atau deskripsi",
    vouchersCount: (count) => `${count} voucher`,
    allTypes: "Semua tipe",
    allStatuses: "Semua status",
    status: "Status",
    reset: "Reset",
    columns: [
      { label: "Kode", key: "code", sortable: true, defaultSortDirection: "asc" },
      { label: "Tipe", key: "type", sortable: true, defaultSortDirection: "asc" },
      { label: "Nilai", key: "value", sortable: true },
      { label: "Kuota", key: "quota", sortable: true },
      { label: "Minimum", key: "minimum", sortKey: "minPurchase", sortable: true },
      { label: "Periode", key: "validity", sortKey: "expiresAt", sortable: true },
      { label: "Status", key: "status" },
      { label: "Aksi", key: "action" },
    ],
    voucherLabel: "voucher",
    typeLabels: { FIXED: "Fixed", PERCENTAGE: "Percentage" },
    to: "sampai",
    edit: "Edit",
    disable: "Nonaktifkan",
    enable: "Aktifkan",
    confirmDisable: (code: string) => `Nonaktifkan voucher ${code}?`,
    deletePermanent: "Hapus permanen",
    deletePermanentVoucher: (code: string) => `Hapus permanen voucher ${code}`,
    deletePermanentDisabled: "Voucher yang sudah digunakan tidak bisa dihapus permanen",
    confirmDeletePermanent: (code: string) =>
      `Hapus permanen voucher "${code}"? Hanya voucher yang belum pernah digunakan yang dapat dihapus. Aksi ini tidak bisa dibatalkan.`,
    formCreate: "Buat voucher",
    formEdit: "Edit voucher",
    formEyebrow: "diskon terkontrol",
    code: "Kode",
    type: "Tipe",
    value: "Nilai",
    quota: "Kuota",
    minimumPurchase: "Minimum pembelian",
    maxDiscount: "Maksimum diskon",
    starts: "Mulai",
    expiry: "Berakhir",
    storedUtc: "Disimpan sebagai UTC",
    active: "Active",
    inactive: "Inactive",
    activeHelp: "Voucher nonaktif disembunyikan dari daftar voucher pelanggan.",
    scheduled: "Scheduled",
    expired: "Expired",
    exhausted: "Exhausted",
    update: "Perbarui voucher",
    create: "Buat voucher",
    createDialog: "Buat",
    cancel: "Batal",
    paginationLabel: "Pagination tabel voucher",
    rowsPerPage: "Baris per halaman",
    previous: "Sebelumnya",
    next: "Berikutnya",
    pageOf: (page, totalPages) => `Halaman ${page} dari ${totalPages}`,
  },
};

export function VouchersPage() {
  const token = useToken();
  const { language } = useI18n();
  const c = copy[language];
  const queryClient = useQueryClient();
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [deletingVoucher, setDeletingVoucher] = useState<Voucher | null>(null);
  const [voucherSheetOpen, setVoucherSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | VoucherType>("");
  const [statusFilter, setStatusFilter] = useState<VoucherStatusFilter>("");
  const [sortBy, setSortBy] = useState<VoucherSortKey | "">("");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const effectiveSortBy = sortBy || "createdAt";
  const effectiveSortDir = sortBy ? sortDir : "desc";
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [search]);
  const vouchersQuery = useQuery({
    queryKey: [
      "vouchers",
      "admin",
      page,
      pageSize,
      debouncedSearch,
      typeFilter,
      statusFilter,
      effectiveSortBy,
      effectiveSortDir,
    ],
    queryFn: ({ signal }) => {
      // Prefer the admin endpoint (includes expired/inactive/exhausted rows).
      // Fall back to the public active list if the API has not shipped it yet.
      const run = async (path: string): Promise<VoucherListData> => {
        const data = await request<Paginated<Voucher>>(path, { token, signal });
        if (!data) throw new Error("Unexpected empty voucher response");
        return { ...data, fetchedAt: Date.now() };
      };
      const params = new URLSearchParams({ limit: String(pageSize), page: String(page) });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("sortBy", effectiveSortBy);
      params.set("sortDir", effectiveSortDir);
      const query = params.toString();
      return run(`/vouchers/admin/all?${query}`).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          return run(`/vouchers?${query}`);
        }
        throw error;
      });
    },
    placeholderData: (previousData) => previousData,
  });
  const setVoucherSort = (key: string, direction: SortChangeDirection) => {
    if (!direction) {
      setSortBy("");
      setSortDir("desc");
      setPage(1);
      return;
    }
    if (!(voucherSortKeys as readonly string[]).includes(key)) return;
    setSortBy(key as VoucherSortKey);
    setSortDir(direction);
    setPage(1);
  };
  const form = useForm<VoucherFormInput, unknown, VoucherForm>({
    resolver: zodResolver(voucherSchema),
    defaultValues: emptyVoucherForm,
  });
  const startsAt = useWatch({ control: form.control, name: "startsAt" });
  const expiresAt = useWatch({ control: form.control, name: "expiresAt" });
  const createVoucher = useMutation({
    mutationFn: (values: VoucherForm) =>
      request<Voucher>("/vouchers", {
        token,
        method: "POST",
        body: JSON.stringify(voucherPayload(values)),
      }),
    onSuccess: async () => {
      setVoucherSheetOpen(false);
      setEditingVoucher(null);
      form.reset(emptyVoucherForm);
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      toast.success(c.created);
    },
    onError: (error) => toast.error(readError(error, language)),
  });
  const updateVoucher = useMutation({
    mutationFn: ({ id, values }: { id: string; values: VoucherForm }) =>
      request<Voucher>(`/vouchers/${id}`, {
        token,
        method: "PATCH",
        body: JSON.stringify(voucherPayload(values)),
      }),
    onSuccess: async () => {
      setVoucherSheetOpen(false);
      setEditingVoucher(null);
      form.reset(emptyVoucherForm);
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      toast.success(c.updated);
    },
    onError: (error) => toast.error(readError(error, language)),
  });
  const deactivateVoucher = useMutation({
    mutationFn: (id: string) =>
      request<{ message: string }>(`/vouchers/${id}`, {
        token,
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      toast.success(c.deactivated);
    },
    onError: (error) => toast.error(readError(error, language)),
  });
  const toggleVoucher = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      request<Voucher>(`/vouchers/${id}`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      toast.success(c.statusUpdated);
    },
    onError: (error) => toast.error(readError(error, language)),
  });
  const permanentDeleteVoucher = useMutation({
    mutationFn: (id: string) =>
      request(`/vouchers/${id}/permanent`, { token, method: "DELETE" }),
    onSuccess: async (_data, id) => {
      setDeletingVoucher(null);
      if (editingVoucher?.id === id) {
        setVoucherSheetOpen(false);
        setEditingVoucher(null);
        form.reset(emptyVoucherForm);
      }
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      toast.success(c.deleted);
    },
    onError: (error) => toast.error(readError(error, language)),
  });

  if (vouchersQuery.isLoading) return <LoadingState />;
  if (vouchersQuery.error)
    return <ErrorState message={readError(vouchersQuery.error, language)} />;

  const vouchers = vouchersQuery.data?.data ?? [];
  const statusNow = vouchersQuery.data?.fetchedAt ?? 0;
  const savingVoucher = createVoucher.isPending || updateVoucher.isPending;

  const startCreatingVoucher = () => {
    setEditingVoucher(null);
    form.reset(emptyVoucherForm);
    setVoucherSheetOpen(true);
  };

  const startEditingVoucher = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    form.reset(voucherToForm(voucher));
    setVoucherSheetOpen(true);
  };

  const cancelEditingVoucher = () => {
    setVoucherSheetOpen(false);
    setEditingVoucher(null);
    form.reset(emptyVoucherForm);
  };

  return (
    <div className="split-layout vouchers-layout">
      <Panel
        title={c.listTitle}
        eyebrow={c.listEyebrow}
        headerMeta={c.vouchersCount(vouchersQuery.data?.meta.total ?? vouchers.length)}
        className="voucher-list-panel"
      >
        <div className="list-filter-bar" aria-label={c.filtersLabel}>
          <label htmlFor="voucher-search">
            {c.searchLabel}
            <span className="filter-input-with-icon">
              <Search size={16} aria-hidden="true" />
              <input
                id="voucher-search"
                name="search"
                type="search"
                autoComplete="off"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={c.searchPlaceholder}
              />
            </span>
          </label>
          <label htmlFor="voucher-type-filter">
            {c.type}
            <SelectMenu
              id="voucher-type-filter"
              value={typeFilter}
              options={[
                { value: "", label: c.allTypes },
                ...voucherTypes.map((type: VoucherType) => ({
                  value: type,
                  label: c.typeLabels[type],
                })),
              ]}
              onChange={(value) => {
                setTypeFilter(value as "" | VoucherType);
                setPage(1);
              }}
            />
          </label>
          <label htmlFor="voucher-status-filter">
            {c.status}
            <SelectMenu
              id="voucher-status-filter"
              value={statusFilter}
              options={[
                { value: "", label: c.allStatuses },
                ...voucherStatusFilters.map((status) => ({
                  value: status,
                  label: voucherStatusLabel(status, c),
                })),
              ]}
              onChange={(value) => {
                setStatusFilter(value as VoucherStatusFilter);
                setPage(1);
              }}
            />
          </label>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setSearch("");
              setDebouncedSearch("");
              setTypeFilter("");
              setStatusFilter("");
              setSortBy("");
              setSortDir("desc");
              setPage(1);
            }}
          >
            {c.reset}
          </button>
        </div>
        <DataTable
          caption={c.tableCaption}
          columns={c.columns}
          sort={{ key: sortBy, direction: sortDir, onSort: setVoucherSort }}
          rows={vouchers.map((voucher) => {
            const hardDeleteDisabled = voucher.usedCount > 0;
            return [
              voucher.code,
              c.typeLabels[voucher.type],
              voucher.type === "PERCENTAGE"
                ? `${toNumber(voucher.value)}%`
                : money(voucher.value),
              `${voucher.usedCount}/${voucher.quota}`,
              money(voucher.minPurchase),
              `${shortDate(voucher.startsAt, language)} ${c.to} ${shortDate(voucher.expiresAt, language)}`,
              <VoucherStatusBadge voucher={voucher} now={statusNow} copy={c} />,
              <div className="table-actions">
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`${c.edit} ${c.voucherLabel} ${voucher.code}`}
                  title={c.edit}
                  onClick={() => startEditingVoucher(voucher)}
                >
                  <Pencil size={16} aria-hidden="true" />
                </button>
                <button
                  className={`icon-button${voucher.isActive ? " icon-button-destructive-glyph" : ""}`}
                  type="button"
                  aria-label={`${voucher.isActive ? c.disable : c.enable} ${c.voucherLabel} ${voucher.code}`}
                  title={voucher.isActive ? c.disable : c.enable}
                  disabled={deactivateVoucher.isPending || toggleVoucher.isPending}
                  onClick={() => {
                    if (voucher.isActive) {
                      if (window.confirm(c.confirmDisable(voucher.code))) {
                        deactivateVoucher.mutate(voucher.id);
                      }
                    } else {
                      toggleVoucher.mutate({ id: voucher.id, isActive: true });
                    }
                  }}
                >
                  {voucher.isActive ? (
                    <PowerOff size={16} aria-hidden="true" />
                  ) : (
                    <Power size={16} aria-hidden="true" />
                  )}
                </button>
                <button
                  className="icon-button icon-button-danger"
                  type="button"
                  aria-label={c.deletePermanentVoucher(voucher.code)}
                  title={hardDeleteDisabled ? c.deletePermanentDisabled : c.deletePermanent}
                  disabled={hardDeleteDisabled || permanentDeleteVoucher.isPending}
                  onClick={() => setDeletingVoucher(voucher)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>,
            ];
          })}
        />
        <PaginationStrip
          meta={vouchersQuery.data?.meta}
          page={page}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          label={c.paginationLabel}
          pageSizeLabel={c.rowsPerPage}
          previous={c.previous}
          next={c.next}
          pageOf={c.pageOf}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      </Panel>
      <div className="panel-external-actions">
        <button
          className="primary-button"
          type="button"
          onClick={startCreatingVoucher}
        >
          <TicketPlus size={17} aria-hidden="true" />
          {c.create}
        </button>
      </div>
      <ActionSheet
        open={voucherSheetOpen}
        title={editingVoucher ? c.formEdit : c.formCreate}
        eyebrow={editingVoucher ? editingVoucher.code : c.formEyebrow}
        closeLabel={c.cancel}
        onClose={() => {
          if (!savingVoucher) cancelEditingVoucher();
        }}
      >
        <form
          id="voucher-form"
          className="control-form action-sheet-form"
          onSubmit={form.handleSubmit((values) =>
            editingVoucher
              ? updateVoucher.mutate({ id: editingVoucher.id, values })
              : createVoucher.mutate(values),
          )}
        >
          <label htmlFor="voucher-code">
            {c.code}
            <input
              id="voucher-code"
              {...form.register("code")}
              placeholder={c.code}
            />
            {form.formState.errors.code && (
              <span className="field-error">
                {readFormError(form.formState.errors.code.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="voucher-type">
            {c.type}
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <SelectMenu
                  id="voucher-type"
                  value={field.value}
                  options={voucherTypes.map((type: VoucherType) => ({
                    value: type,
                    label: c.typeLabels[type],
                  }))}
                  onChange={(value) => field.onChange(value as VoucherType)}
                />
              )}
            />
            {form.formState.errors.type && (
              <span className="field-error">
                {readFormError(form.formState.errors.type.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="voucher-value">
            {c.value}
            <Controller
              control={form.control}
              name="value"
              render={({ field }) => (
                <NumberInput
                  id="voucher-value"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  placeholder={c.value}
                />
              )}
            />
            {form.formState.errors.value && (
              <span className="field-error">
                {readFormError(form.formState.errors.value.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="voucher-minPurchase">
            {c.minimumPurchase}
            <Controller
              control={form.control}
              name="minPurchase"
              render={({ field }) => (
                <NumberInput
                  id="voucher-minPurchase"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  placeholder={c.minimumPurchase}
                />
              )}
            />
            {form.formState.errors.minPurchase && (
              <span className="field-error">
                {readFormError(form.formState.errors.minPurchase.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="voucher-maxDiscount">
            {c.maxDiscount}
            <Controller
              control={form.control}
              name="maxDiscount"
              render={({ field }) => (
                <NumberInput
                  id="voucher-maxDiscount"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  placeholder={c.maxDiscount}
                />
              )}
            />
            {form.formState.errors.maxDiscount && (
              <span className="field-error">
                {readFormError(form.formState.errors.maxDiscount.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="voucher-quota">
            {c.quota}
            <Controller
              control={form.control}
              name="quota"
              render={({ field }) => (
                <NumberInput
                  id="voucher-quota"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  placeholder={c.quota}
                />
              )}
            />
            {form.formState.errors.quota && (
              <span className="field-error">
                {readFormError(form.formState.errors.quota.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="voucher-startsAt">
            {c.starts}
            <input
              id="voucher-startsAt"
              {...form.register("startsAt")}
              type="datetime-local"
            />
            {startsAt && (
              <span className="field-hint">
                {c.storedUtc}: {new Date(startsAt).toISOString()}
              </span>
            )}
            {form.formState.errors.startsAt && (
              <span className="field-error">
                {readFormError(form.formState.errors.startsAt.message, language)}
              </span>
            )}
          </label>
          <label htmlFor="voucher-expiresAt">
            {c.expiry}
            <input
              id="voucher-expiresAt"
              {...form.register("expiresAt")}
              type="datetime-local"
            />
            {/* datetime-local is timezone-naive; we convert to an explicit UTC
              instant before sending (see voucherPayload). Show the admin the
              exact UTC instant that will be stored. */}
            {expiresAt && (
              <span className="field-hint">
                {c.storedUtc}: {new Date(expiresAt).toISOString()}
              </span>
            )}
            {form.formState.errors.expiresAt && (
              <span className="field-error">
                {readFormError(form.formState.errors.expiresAt.message, language)}
              </span>
            )}
          </label>
          <label className="check-row" htmlFor="voucher-isActive">
            <input
              id="voucher-isActive"
              type="checkbox"
              {...form.register("isActive")}
            />
            <span>
              <strong>{c.active}</strong>
              <small>{c.activeHelp}</small>
            </span>
          </label>
          <div className="form-actions">
            <button
              className="ghost-button"
              type="button"
              disabled={savingVoucher}
              onClick={cancelEditingVoucher}
            >
              {c.cancel}
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={savingVoucher}
            >
              <TicketPlus size={17} />
              {editingVoucher ? c.update : c.createDialog}
            </button>
          </div>
        </form>
      </ActionSheet>
      <ActionSheet
        open={Boolean(deletingVoucher)}
        title={c.deletePermanent}
        eyebrow={deletingVoucher?.code}
        closeLabel={c.cancel}
        onClose={() => {
          if (!permanentDeleteVoucher.isPending) setDeletingVoucher(null);
        }}
      >
        <div className="control-form action-sheet-form">
          <p className="copy-block">
            {deletingVoucher ? c.confirmDeletePermanent(deletingVoucher.code) : ""}
          </p>
          <div className="form-actions">
            <button
              className="ghost-button"
              type="button"
              disabled={permanentDeleteVoucher.isPending}
              onClick={() => setDeletingVoucher(null)}
            >
              {c.cancel}
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={
                !deletingVoucher ||
                deletingVoucher.usedCount > 0 ||
                permanentDeleteVoucher.isPending
              }
              onClick={() => {
                if (deletingVoucher) permanentDeleteVoucher.mutate(deletingVoucher.id);
              }}
            >
              <Trash2 size={17} aria-hidden="true" />
              {c.deletePermanent}
            </button>
          </div>
        </div>
      </ActionSheet>
    </div>
  );
}

function voucherPayload(values: VoucherForm) {
  return {
    ...values,
    code: values.code.toUpperCase(),
    startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : undefined,
    expiresAt: values.expiresAt
      ? new Date(values.expiresAt).toISOString()
      : values.expiresAt,
  };
}

function voucherToForm(voucher: Voucher): VoucherFormInput {
  return {
    code: voucher.code,
    type: voucher.type,
    value: toNumber(voucher.value),
    minPurchase: toNumber(voucher.minPurchase),
    maxDiscount:
      voucher.maxDiscount === null || voucher.maxDiscount === undefined
        ? ""
        : toNumber(voucher.maxDiscount),
    quota: voucher.quota,
    startsAt: toDateTimeLocal(voucher.startsAt),
    expiresAt: toDateTimeLocal(voucher.expiresAt),
    isActive: voucher.isActive,
  };
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function VoucherStatusBadge({
  voucher,
  now,
  copy,
}: {
  voucher: Voucher;
  now: number;
  copy: VoucherCopy;
}) {
  if (!voucher.isActive) return <span className="badge badge-neutral">{copy.inactive}</span>;
  if (Date.parse(voucher.expiresAt) < now) {
    return <span className="badge badge-danger">{copy.expired}</span>;
  }
  if (Date.parse(voucher.startsAt) > now) {
    return <span className="badge badge-warn">{copy.scheduled}</span>;
  }
  if (voucher.usedCount >= voucher.quota) {
    return <span className="badge badge-danger">{copy.exhausted}</span>;
  }

  return <span className="badge badge-good">{copy.active}</span>;
}

function voucherStatusLabel(
  status: Exclude<VoucherStatusFilter, "">,
  copy: VoucherCopy,
) {
  if (status === "ACTIVE") return copy.active;
  if (status === "INACTIVE") return copy.inactive;
  if (status === "SCHEDULED") return copy.scheduled;
  if (status === "EXPIRED") return copy.expired;
  return copy.exhausted;
}
