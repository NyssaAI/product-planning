import { Order } from './model';
import { validateOrder } from './validator';
import type { Result } from '@shared/result';
export { ok } from '@shared/result';

export function createOrder(order: Order): Result<Order> {
  validateOrder(order);
  return { ok: true, value: order };
}

export const loadOrderValidator = () => import('./validator');
