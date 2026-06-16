import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge, orderTone, paymentTone } from "../components/Badge";
import { DataTable } from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Panel } from "../components/Panel";
import { useToken } from "../context/AuthContext";
import { orderStatuses } from "../lib/constants";
import { request } from "../lib/api";
import { money, readError, shortDate } from "../lib/format";
import type { Order, OrderStatus, Paginated } from "../types";

export function OrdersPage() {
  const token = useToken();
  const queryClient = useQueryClient();
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => request<Paginated<Order>>("/orders?limit=100", { token }),
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
          "Invoice",
          "Customer",
          "Date",
          "Status",
          "Payment",
          "Total",
          "Move",
        ]}
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
              onChange={(event) =>
                statusMutation.mutate({
                  id: order.id,
                  status: event.target.value as OrderStatus,
                })
              }
            >
              {orderStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            {(order.status === "PENDING" || order.status === "PAID") && (
              <button
                className="table-button"
                type="button"
                disabled={cancelMutation.isPending}
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
