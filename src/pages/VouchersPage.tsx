import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Power, PowerOff, TicketPlus } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Panel } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { ApiError, request } from "../lib/api";
import { voucherTypes } from "../lib/constants";
import { money, readError, shortDate, toNumber } from "../lib/format";
import type { Paginated, Voucher, VoucherType } from "../types";

const voucherSchema = z
  .object({
    code: z.string().trim().min(3),
    type: z.enum(["FIXED", "PERCENTAGE"]),
    value: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().min(0),
    ),
    minPurchase: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().min(0),
    ),
    maxDiscount: z.preprocess(
      (value) => (value === "" ? null : value),
      z.coerce.number().min(0).nullable().optional(),
    ),
    quota: z.coerce.number().int().min(1),
    startsAt: z.string().optional(),
    expiresAt: z.string().min(1),
    isActive: z.boolean(),
  })
  // A PERCENTAGE voucher value above 100 would discount more than the
  // purchase amount before the maxDiscount/subtotal caps kick in. The backend
  // also enforces @Max(100) for PERCENTAGE, so reject it client-side too for a
  // clear inline error instead of a 400 round-trip.
  .refine((v) => v.type !== "PERCENTAGE" || v.value <= 100, {
    message: "Percentage value must be 0-100",
    path: ["value"],
  })
  .refine(
    (v) => !v.startsAt || new Date(v.expiresAt) > new Date(v.startsAt),
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

export function VouchersPage() {
  const token = useToken();
  const queryClient = useQueryClient();
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const vouchersQuery = useQuery({
    queryKey: ["vouchers", "admin"],
    queryFn: ({ signal }) => {
      // Prefer the admin endpoint (includes expired/inactive/exhausted rows).
      // Fall back to the public active list if the API has not shipped it yet.
      const run = (path: string) =>
        request<Paginated<Voucher>>(path, { token, signal });
      return run("/vouchers/admin/all?limit=80").catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          return run("/vouchers?limit=80");
        }
        throw error;
      });
    },
  });
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
      setEditingVoucher(null);
      form.reset(emptyVoucherForm);
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      toast.success("Voucher created");
    },
    onError: (error) => toast.error(readError(error)),
  });
  const updateVoucher = useMutation({
    mutationFn: ({ id, values }: { id: string; values: VoucherForm }) =>
      request<Voucher>(`/vouchers/${id}`, {
        token,
        method: "PATCH",
        body: JSON.stringify(voucherPayload(values)),
      }),
    onSuccess: async () => {
      setEditingVoucher(null);
      form.reset(emptyVoucherForm);
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      toast.success("Voucher updated");
    },
    onError: (error) => toast.error(readError(error)),
  });
  const deactivateVoucher = useMutation({
    mutationFn: (id: string) =>
      request<{ message: string }>(`/vouchers/${id}`, {
        token,
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      toast.success("Voucher deactivated");
    },
    onError: (error) => toast.error(readError(error)),
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
      toast.success("Voucher status updated");
    },
    onError: (error) => toast.error(readError(error)),
  });

  if (vouchersQuery.isLoading) return <LoadingState />;
  if (vouchersQuery.error)
    return <ErrorState message={readError(vouchersQuery.error)} />;

  const vouchers = vouchersQuery.data?.data ?? [];
  const statusNow = vouchersQuery.dataUpdatedAt;
  const savingVoucher = createVoucher.isPending || updateVoucher.isPending;

  const startEditingVoucher = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    form.reset(voucherToForm(voucher));
    document
      .getElementById("voucher-form")
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const cancelEditingVoucher = () => {
    setEditingVoucher(null);
    form.reset(emptyVoucherForm);
  };

  return (
    <div className="split-layout">
      <Panel title="Vouchers" eyebrow="promo rules">
        <DataTable
          caption="Voucher rules table"
          columns={[
            "Code",
            "Type",
            "Value",
            "Quota",
            "Minimum",
            "Validity",
            "Status",
            "Action",
          ]}
          rows={vouchers.map((voucher) => [
            voucher.code,
            voucher.type,
            voucher.type === "PERCENTAGE"
              ? `${toNumber(voucher.value)}%`
              : money(voucher.value),
            `${voucher.usedCount}/${voucher.quota}`,
            money(voucher.minPurchase),
            `${shortDate(voucher.startsAt)} to ${shortDate(voucher.expiresAt)}`,
            <VoucherStatusBadge voucher={voucher} now={statusNow} />,
            <div className="table-actions">
              <button
                className="icon-button"
                type="button"
                aria-label={`Edit voucher ${voucher.code}`}
                title="Edit"
                onClick={() => startEditingVoucher(voucher)}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                className={`icon-button${voucher.isActive ? " icon-button-danger" : ""}`}
                type="button"
                aria-label={`${voucher.isActive ? "Disable" : "Enable"} voucher ${voucher.code}`}
                title={voucher.isActive ? "Disable" : "Enable"}
                disabled={deactivateVoucher.isPending || toggleVoucher.isPending}
                onClick={() => {
                  if (voucher.isActive) {
                    if (window.confirm(`Disable voucher ${voucher.code}?`)) {
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
            </div>,
          ])}
        />
      </Panel>
      <Panel
        title={editingVoucher ? "Edit voucher" : "Create voucher"}
        eyebrow={editingVoucher ? editingVoucher.code : "controlled discount"}
      >
        <form
          id="voucher-form"
          className="control-form"
          onSubmit={form.handleSubmit((values) =>
            editingVoucher
              ? updateVoucher.mutate({ id: editingVoucher.id, values })
              : createVoucher.mutate(values),
          )}
        >
          <label htmlFor="voucher-code">
            Code
            <input
              id="voucher-code"
              {...form.register("code")}
              placeholder="Code"
            />
            {form.formState.errors.code && (
              <span className="field-error">
                {form.formState.errors.code.message}
              </span>
            )}
          </label>
          <label htmlFor="voucher-type">
            Type
            <select id="voucher-type" {...form.register("type")}>
              {voucherTypes.map((type: VoucherType) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            {form.formState.errors.type && (
              <span className="field-error">
                {form.formState.errors.type.message}
              </span>
            )}
          </label>
          <label htmlFor="voucher-value">
            Value
            <input
              id="voucher-value"
              {...form.register("value")}
              type="number"
              placeholder="Value"
            />
            {form.formState.errors.value && (
              <span className="field-error">
                {form.formState.errors.value.message}
              </span>
            )}
          </label>
          <label htmlFor="voucher-minPurchase">
            Minimum purchase
            <input
              id="voucher-minPurchase"
              {...form.register("minPurchase")}
              type="number"
              placeholder="Minimum purchase"
            />
            {form.formState.errors.minPurchase && (
              <span className="field-error">
                {form.formState.errors.minPurchase.message}
              </span>
            )}
          </label>
          <label htmlFor="voucher-maxDiscount">
            Max discount
            <input
              id="voucher-maxDiscount"
              {...form.register("maxDiscount")}
              type="number"
              placeholder="Max discount"
            />
            {form.formState.errors.maxDiscount && (
              <span className="field-error">
                {form.formState.errors.maxDiscount.message}
              </span>
            )}
          </label>
          <label htmlFor="voucher-quota">
            Quota
            <input
              id="voucher-quota"
              {...form.register("quota")}
              type="number"
              placeholder="Quota"
            />
            {form.formState.errors.quota && (
              <span className="field-error">
                {form.formState.errors.quota.message}
              </span>
            )}
          </label>
          <label htmlFor="voucher-startsAt">
            Starts
            <input
              id="voucher-startsAt"
              {...form.register("startsAt")}
              type="datetime-local"
            />
            {startsAt && (
              <span className="field-hint">
                Stored as UTC: {new Date(startsAt).toISOString()}
              </span>
            )}
            {form.formState.errors.startsAt && (
              <span className="field-error">
                {form.formState.errors.startsAt.message}
              </span>
            )}
          </label>
          <label htmlFor="voucher-expiresAt">
            Expiry
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
                Stored as UTC: {new Date(expiresAt).toISOString()}
              </span>
            )}
            {form.formState.errors.expiresAt && (
              <span className="field-error">
                {form.formState.errors.expiresAt.message}
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
              <strong>Active</strong>
              <small>Inactive vouchers are hidden from customer voucher lists.</small>
            </span>
          </label>
          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={savingVoucher}
            >
              <TicketPlus size={17} /> {editingVoucher ? "Update" : "Create"}
              voucher
            </button>
            {editingVoucher && (
              <button
                className="ghost-button"
                type="button"
                disabled={savingVoucher}
                onClick={cancelEditingVoucher}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </Panel>
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

function VoucherStatusBadge({ voucher, now }: { voucher: Voucher; now: number }) {
  if (!voucher.isActive) return <span className="badge badge-neutral">Inactive</span>;
  if (Date.parse(voucher.expiresAt) < now) {
    return <span className="badge badge-danger">Expired</span>;
  }
  if (Date.parse(voucher.startsAt) > now) {
    return <span className="badge badge-warn">Scheduled</span>;
  }
  if (voucher.usedCount >= voucher.quota) {
    return <span className="badge badge-danger">Exhausted</span>;
  }

  return <span className="badge badge-good">Active</span>;
}
