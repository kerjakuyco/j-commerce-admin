import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TicketPlus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Panel } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { voucherTypes } from "../lib/constants";
import { ApiError, request } from "../lib/api";
import { money, readError, shortDate, toNumber } from "../lib/format";
import type { Paginated, Voucher, VoucherType } from "../types";

const voucherSchema = z
  .object({
    code: z.string().min(3),
    type: z.enum(["FIXED", "PERCENTAGE"]),
    value: z.coerce.number().min(0),
    minPurchase: z.coerce.number().min(0),
    maxDiscount: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().optional(),
    ),
    quota: z.coerce.number().int().min(1),
    expiresAt: z.string().min(1),
  })
  // A PERCENTAGE voucher value above 100 would discount more than the
  // purchase amount before the maxDiscount/subtotal caps kick in. The backend
  // also enforces @Max(100) for PERCENTAGE, so reject it client-side too for a
  // clear inline error instead of a 400 round-trip.
  .refine((v) => v.type !== "PERCENTAGE" || v.value <= 100, {
    message: "Percentage value must be 0–100",
    path: ["value"],
  });

type VoucherFormInput = z.input<typeof voucherSchema>;
type VoucherForm = z.output<typeof voucherSchema>;

export function VouchersPage() {
  const token = useToken();
  const queryClient = useQueryClient();
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
    defaultValues: {
      code: "",
      type: "FIXED",
      value: 0,
      minPurchase: 0,
      maxDiscount: "",
      quota: 100,
      expiresAt: "",
    },
  });
  const expiresAt = useWatch({ control: form.control, name: "expiresAt" });
  const createVoucher = useMutation({
    mutationFn: (values: VoucherForm) =>
      request<Voucher>("/vouchers", {
        token,
        method: "POST",
        body: JSON.stringify({
          ...values,
          code: values.code.toUpperCase(),
          // datetime-local yields a timezone-naive local string; convert to an
          // explicit UTC instant so the backend stores exactly what the admin
          // picked in their local time, instead of re-interpreting the naive
          // string in the server's local timezone.
          expiresAt: values.expiresAt
            ? new Date(values.expiresAt).toISOString()
            : values.expiresAt,
        }),
      }),
    onSuccess: async () => {
      form.reset({
        code: "",
        type: "FIXED",
        value: 0,
        minPurchase: 0,
        maxDiscount: "",
        quota: 100,
        expiresAt: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      toast.success("Voucher created");
    },
    onError: (error) => toast.error(readError(error)),
  });

  if (vouchersQuery.isLoading) return <LoadingState />;
  if (vouchersQuery.error)
    return <ErrorState message={readError(vouchersQuery.error)} />;

  return (
    <div className="split-layout">
      <Panel title="Vouchers" eyebrow="promo rules">
        <DataTable
          columns={["Code", "Type", "Value", "Quota", "Minimum", "Expires"]}
          rows={(vouchersQuery.data?.data ?? []).map((voucher) => [
            voucher.code,
            voucher.type,
            voucher.type === "PERCENTAGE"
              ? `${toNumber(voucher.value)}%`
              : money(voucher.value),
            `${voucher.usedCount}/${voucher.quota}`,
            money(voucher.minPurchase),
            shortDate(voucher.expiresAt),
          ])}
        />
      </Panel>
      <Panel title="Create voucher" eyebrow="controlled discount">
        <form
          className="control-form"
          onSubmit={form.handleSubmit((values) => createVoucher.mutate(values))}
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
          <label htmlFor="voucher-expiresAt">
            Expiry
            <input
              id="voucher-expiresAt"
              {...form.register("expiresAt")}
              type="datetime-local"
            />
            {/* datetime-local is timezone-naive; we convert to an explicit UTC
              instant before sending (see createVoucher). Show the admin the
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
          <button className="primary-button" disabled={createVoucher.isPending}>
            <TicketPlus size={17} /> Create voucher
          </button>
        </form>
      </Panel>
    </div>
  );
}
