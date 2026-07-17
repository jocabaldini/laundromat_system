'use server';

import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api/server-client';
import { NEST_ROUTES } from '@/lib/api/routes';
import type { ServiceOrder, ServiceOrderItemStatus } from '@/lib/types';
import type { ApiResult, ApiMutationResult } from '@/lib/api/server-client';

export interface CreateServiceOrderItemDto {
  serviceItemId: string;
  quantity: number;
  finalPrice?: number;
  observations?: string;
}

export interface CreateServiceOrderDto {
  customerId: string;
  estimatedDeliveryAt: string;
  observations?: string;
  items: CreateServiceOrderItemDto[];
}

export interface UpdateServiceOrderDto {
  estimatedDeliveryAt?: string;
  observations?: string;
  finalTotal?: number;
}

export interface UpdateServiceOrderItemDto {
  finalPrice?: number;
  quantity?: number;
  status?: ServiceOrderItemStatus;
  observations?: string;
}

export async function listServiceOrders(params?: {
  customerId?: string;
  status?: string;
  estimatedDeliveryFrom?: string;
  estimatedDeliveryTo?: string;
}): Promise<ApiResult<ServiceOrder[]>> {
  const query = new URLSearchParams();
  if (params?.customerId) query.set('customerId', params.customerId);
  if (params?.status) query.set('status', params.status);
  if (params?.estimatedDeliveryFrom) {
    query.set('estimatedDeliveryFrom', params.estimatedDeliveryFrom);
  }
  if (params?.estimatedDeliveryTo) query.set('estimatedDeliveryTo', params.estimatedDeliveryTo);
  const qs = query.toString();
  return serverApi.get<ServiceOrder[]>(`${NEST_ROUTES.serviceOrders.list}${qs ? `?${qs}` : ''}`);
}

export async function getServiceOrder(id: string): Promise<ApiResult<ServiceOrder>> {
  return serverApi.get<ServiceOrder>(NEST_ROUTES.serviceOrders.findOne(id));
}

// Redirects internally to the list on success, so the caller only needs to
// handle the error case — there is nothing to do after a successful redirect.
export async function createServiceOrderAndRedirect(
  dto: CreateServiceOrderDto,
): Promise<{ error: string } | never> {
  const result = await serverApi.post<ServiceOrder>(NEST_ROUTES.serviceOrders.create, dto);
  if (!result.success) return { error: result.message };
  redirect('/service-orders');
}

export async function updateServiceOrderAndRedirect(
  id: string,
  dto: UpdateServiceOrderDto,
): Promise<{ error: string } | never> {
  const result = await serverApi.patch<ServiceOrder>(NEST_ROUTES.serviceOrders.update(id), dto);
  if (!result.success) return { error: result.message };
  redirect('/service-orders');
}

export async function updateServiceOrderItem(
  orderId: string,
  itemId: string,
  dto: UpdateServiceOrderItemDto,
): Promise<ApiResult<ServiceOrder>> {
  return serverApi.patch<ServiceOrder>(NEST_ROUTES.serviceOrders.updateItem(orderId, itemId), dto);
}

export async function deliverServiceOrder(id: string): Promise<ApiResult<ServiceOrder>> {
  return serverApi.post<ServiceOrder>(NEST_ROUTES.serviceOrders.deliver(id));
}

export async function cancelServiceOrder(id: string): Promise<ApiResult<ServiceOrder>> {
  return serverApi.post<ServiceOrder>(NEST_ROUTES.serviceOrders.cancel(id));
}

export async function deleteServiceOrder(id: string): Promise<ApiMutationResult> {
  const result = await serverApi.delete(NEST_ROUTES.serviceOrders.remove(id));
  return result.success ? { success: true } : result;
}
