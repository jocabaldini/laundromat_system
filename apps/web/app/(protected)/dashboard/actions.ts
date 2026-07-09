'use server';

import { serverApi } from '@/lib/api/server-client';
import { NEST_ROUTES } from '@/lib/api/routes';
import type { User } from '@/lib/types';

export async function getMe(): Promise<User | null> {
  const result = await serverApi.get<User>(NEST_ROUTES.auth.me);
  if (!result.success) return null;
  return result.data;
}
