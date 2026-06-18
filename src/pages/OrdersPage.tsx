import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge, orderTone, paymentTone } from "../components/Badge";
import { DataTable } from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Panel } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { allowedStatusTransitions, isOrderStatus, orderStatuses } from "../lib/constants";
import { request } from "../lib/api";
import { money, readError, shortDate } from "../lib/format";
import type { Order, OrderStatus, Paginated } from "../types";

const CANCELLABLE_STATUSES: OrderStatus[] = ["PENDING", "PAID"];

export function OrdersPage() {
  const token = useToken();
  const queryClient = useQueryClient();
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: ({ signal }) =>
      request<Paginated<Order>>("/orders?limit=100", { token, signal }),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      request<Order>(`/orders/${id}/status`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order status updated");
    },
    onError: (error) => toast.error(readError(error)),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      request<Order>(`/orders/${id}/cancel`, {
        token,
        method: "PATCH",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled");
    },
    onError: (error) => toast.error(readError(error)),
  });

  if (ordersQuery.isLoading) return <LoadingState />;
  if (ordersQuery.error)
    return <ErrorState message={readError(ordersQuery.error)} />;

  return (
    <Panel title="Order management" eyebrow="fulfillment">
      <DataTable
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
        rows={(ordersQuery.data?.data ?? []).map((order) => [
          order.orderNumber,
          order.user?.name ?? order.user?.email ?? "-",
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
          money(order.total),
          <div key={`${order.id}-actions`} className="table-actions">
            <select
              value={order.status}
              disabled={
                statusMutation.isPending &&
                statusMutation.variables?.id === order.id
              }
              onChange={(event) => {
                const value = event.target.value;
                // Validate before casting; CANCELLED must route through Cancel.
                if (!isOrderStatus(value)) return;
                statusMutation.mutate({ id: order.id, status: value });
              }}
            >
              {orderStatuses.map((status) => (
                <option
                  key={status}
                  disabled={
                    status !== order.status &&
                    !allowedStatusTransitions[order.status].includes(status)
                  }
                >
                  {status}
                </option>
              ))}
              {/* Display-only CANCELLED option so cancelled orders show their
                real status; it is disabled so transitions can't reach it here
                and must go through the Cancel action below. */}
              {order.status === "CANCELLED" && (
                <option value="CANCELLED" disabled>
                  CANCELLED
                </option>
              )}
            </select>
            {CANCELLABLE_STATUSES.includes(order.status) && (
              <button
                className="table-button"
                type="button"
                disabled={
                  cancelMutation.isPending &&
                  cancelMutation.variables === order.id
                }
                onClick={() => {
                  if (window.confirm(`Cancel order ${order.orderNumber}?`)) {
                    cancelMutation.mutate(order.id);
                  }
                }}
              >
                Cancel
              </button>
            )}
          </div>,
        ])}
      />
    </Panel>
  );
}