// Shared types used across the web app.
// These mirror the API response shapes — keep in sync with the API DTOs.

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'OPERATOR' | 'USER';
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  code: string; // 3-digit unique identifier written on garments
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PricingType = 'POR_KG' | 'POR_UNIDADE';

export interface ServiceItem {
  id: string;
  name: string;
  type: PricingType;
  price: string; // Decimal serialized as string by Prisma
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ServiceOrderStatus =
  | 'RECEIVED'
  | 'WASHING'
  | 'IRONING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export type ServiceOrderItemStatus = 'RECEIVED' | 'WASHING' | 'IRONING' | 'READY';

export interface ServiceOrderItem {
  id: string;
  serviceItemId: string;
  serviceItemName: string;
  serviceItemType: PricingType;
  referencePrice: string;
  finalPrice: string;
  quantity: string;
  status: ServiceOrderItemStatus;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOrder {
  id: string;
  customerId: string;
  customer: Pick<Customer, 'id' | 'code' | 'name'>;
  status: ServiceOrderStatus;
  estimatedDeliveryAt: string;
  observations: string | null;
  referenceTotal: string;
  finalTotal: string;
  discount: string;
  items: ServiceOrderItem[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  serviceOrderId: string;
  serviceOrder: Pick<ServiceOrder, 'id' | 'finalTotal'>;
  customer: Pick<Customer, 'id' | 'code' | 'name'>;
  issuedAt: string;
}

// Pagination wrapper for list endpoints
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
