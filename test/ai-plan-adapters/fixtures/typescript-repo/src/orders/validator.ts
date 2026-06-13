import type { Order } from './model';

export function validateOrder(order: Order): boolean {
  return order.total >= 0;
}
