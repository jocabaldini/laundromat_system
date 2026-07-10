'use server';

import { serverApi } from '@/lib/api/server-client';
import { NEST_ROUTES } from '@/lib/api/routes';
import type { Customer } from '@/lib/types';
import type { ApiResult, ApiMutationResult } from '@/lib/api/server-client';

export interface CreateCustomerDto {
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export type UpdateCustomerDto = Partial<CreateCustomerDto>;

export async function listCustomers(search?: string): Promise<ApiResult<Customer[]>> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return serverApi.get<Customer[]>(`${NEST_ROUTES.customers.list}${query}`);
}

export async function getCustomer(id: string): Promise<ApiResult<Customer>> {
  return serverApi.get<Customer>(NEST_ROUTES.customers.findOne(id));
}

export async function checkCodeAvailability(
  code: string,
): Promise<ApiResult<{ available: boolean }>> {
  return serverApi.get<{ available: boolean }>(NEST_ROUTES.customers.checkAvailability(code));
}

export async function suggestCode(name: string): Promise<ApiResult<{ code: string }>> {
  return serverApi.get<{ code: string }>(NEST_ROUTES.customers.suggestCode(name));
}

export async function createCustomer(dto: CreateCustomerDto): Promise<ApiResult<Customer>> {
  return serverApi.post<Customer>(NEST_ROUTES.customers.create, dto);
}

export async function updateCustomer(
  id: string,
  dto: UpdateCustomerDto,
): Promise<ApiResult<Customer>> {
  return serverApi.patch<Customer>(NEST_ROUTES.customers.update(id), dto);
}

export async function deleteCustomer(id: string): Promise<ApiMutationResult> {
  const result = await serverApi.delete(NEST_ROUTES.customers.remove(id));
  return result.success ? { success: true } : result;
}
