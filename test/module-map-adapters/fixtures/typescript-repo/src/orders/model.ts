export interface Order {
  id: string;
  total: number;
}

export type OrderStatus = 'open' | 'closed';
