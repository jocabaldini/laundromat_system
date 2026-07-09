'use server';

import { redirect } from 'next/navigation';
import { getApiUrl } from '@/lib/api/config';
import { setSession, clearSession, getSession } from './session';
import { NEST_ROUTES } from '@/lib/api/routes';

export type LoginResult = { success: true } | { success: false; message: string };

export async function loginAction(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${getApiUrl()}${NEST_ROUTES.auth.login}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = body?.message ?? 'Credenciais inválidas';
      return { success: false, message };
    }

    const { accessToken, refreshToken } = await res.json();
    await setSession(accessToken, refreshToken);
    return { success: true };
  } catch {
    return { success: false, message: 'Serviço indisponível. Tente novamente em instantes.' };
  }
}

export async function logoutAction() {
  // Notify backend to invalidate the refresh token in the database
  try {
    const token = await getSession();

    if (token) {
      await fetch(`${getApiUrl()}${NEST_ROUTES.auth.logout}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });
    }
  } catch {
    // Continue with local logout even if backend call fails
  }

  await clearSession();
  redirect('/login');
}
