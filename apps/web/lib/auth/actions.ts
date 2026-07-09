'use server';

import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/api/server-client';
import { setSession, clearSession, getSession } from './session';
import { NEST_ROUTES } from '@/lib/api/routes';

export type LoginResult = { success: true } | { success: false; message: string };

export async function loginAction(email: string, password: string): Promise<LoginResult> {
  const result = await serverApi.post<{ accessToken: string; refreshToken: string }>(
    NEST_ROUTES.auth.login,
    { email, password },
  );

  if (!result.success) {
    return { success: false, message: result.message };
  }

  await setSession(result.data.accessToken, result.data.refreshToken);
  return { success: true };
}

export async function logoutAction() {
  const token = await getSession();

  if (token) {
    // Best-effort: invalidate refresh token on the server
    // Continue with local logout even if this fails
    await serverApi.post(NEST_ROUTES.auth.logout);
  }

  await clearSession();
  redirect('/login');
}
