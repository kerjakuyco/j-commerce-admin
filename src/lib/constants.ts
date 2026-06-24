import type {
  NotificationType,
  OrderStatus,
  PaymentStatus,
  ShippingMethod,
  VoucherType,
} from "../types";

export const orderStatuses: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
];

const allOrderStatuses: readonly OrderStatus[] = [
  ...orderStatuses,
  "CANCELLED",
];

// Runtime guard so callers don't have to blindly cast string values (e.g. the
// order status <select> onChange) to OrderStatus.
export function isOrderStatus(value: string): value is OrderStatus {
  return (allOrderStatuses as readonly string[]).includes(value);
}

export const paymentStatuses: PaymentStatus[] = [
  "UNPAID",
  "PAID",
  "REFUNDED",
  "FAILED",
  "EXPIRED",
];

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (paymentStatuses as readonly string[]).includes(value);
}

export const shippingMethods: ShippingMethod[] = [
  "REGULAR",
  "EXPRESS",
  "SAME_DAY",
];

export function isShippingMethod(value: string): value is ShippingMethod {
  return (shippingMethods as readonly string[]).includes(value);
}

export const allowedStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID"],
  PAID: ["PACKED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const voucherTypes: VoucherType[] = ["FIXED", "PERCENTAGE"];
export const notificationTypes: NotificationType[] = ["PROMO", "ORDER", "SYSTEM"];
