'use server';

import { serverApi } from '@/lib/api/server-client';
import { NEST_ROUTES } from '@/lib/api/routes';
import type { ServiceItem } from '@/lib/types';
import type { ApiResult, ApiMutationResult } from '@/lib/api/server-client';

export interface CreateServiceItemDto {
  name: string;
  type: 'POR_KG' | 'POR_UNIDADE';
  price: number;
}

export type UpdateServiceItemDto = Partial<CreateServiceItemDto>;

export async function listServiceItems(): Promise<ApiResult<ServiceItem[]>> {
  return serverApi.get<ServiceItem[]>(NEST_ROUTES.serviceItems.list);
}

export async function getServiceItem(id: string): Promise<ApiResult<ServiceItem>> {
  return serverApi.get<ServiceItem>(NEST_ROUTES.serviceItems.findOne(id));
}

export async function createServiceItem(
  dto: CreateServiceItemDto,
): Promise<ApiResult<ServiceItem>> {
  return serverApi.post<ServiceItem>(NEST_ROUTES.serviceItems.create, dto);
}

export async function updateServiceItem(
  id: string,
  dto: UpdateServiceItemDto,
): Promise<ApiResult<ServiceItem>> {
  return serverApi.patch<ServiceItem>(NEST_ROUTES.serviceItems.update(id), dto);
}

export async function deleteServiceItem(id: string): Promise<ApiMutationResult> {
  const result = await serverApi.delete(NEST_ROUTES.serviceItems.remove(id));
  return result.success ? { success: true } : result;
}
