import { NextResponse, type NextRequest } from 'next/server';
import { getLocaleFromRequest, LOCALE_COOKIE } from './lib/i18n';
import { getApiUrl } from './lib/api/config';
import { NEST_ROUTES } from './lib/api/routes';
import { env } from './lib/env';

const PUBLIC_PATHS = ['/login'];

const ACCESS_COOKIE = 'auth_token';
const REFRESH_COOKIE = 'refresh_token';
const ACCESS_MAX_AGE = env.ACCESS_TOKEN_MAX_AGE;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

async function tryRefresh(
  req: NextRequest,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${getApiUrl()}${NEST_ROUTES.auth.refresh}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.accessToken || !data?.refreshToken) return null;

    return data;
  } catch {
    return null;
  }
}

function applyTokensToResponse(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  isProd: boolean,
) {
  const base = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
  };

  response.cookies.set(ACCESS_COOKIE, accessToken, {
    ...base,
    maxAge: ACCESS_MAX_AGE,
  });

  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    ...base,
    maxAge: REFRESH_MAX_AGE,
  });
}

function clearTokensFromResponse(response: NextResponse) {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProd = process.env.NODE_ENV === 'production';
  const isPublic = isPublicPath(pathname);

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  // Usuário autenticado tentando acessar rota pública (ex: /login)
  if (isPublic && accessToken) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Protected route with no access token
  if (!isPublic && !accessToken) {
    // Attempt to renew via refresh token before redirecting to login
    if (refreshToken) {
      const tokens = await tryRefresh(req);

      if (tokens) {
        // Renewed successfully — continue to the page with updated cookies
        const response = NextResponse.next();
        applyTokensToResponse(response, tokens.accessToken, tokens.refreshToken, isProd);
        setLocaleCookie(req, response);
        return response;
      }
    }

    // Invalid or missing refresh token — clear cookies and redirect to login
    const response = NextResponse.redirect(new URL('/login', req.url));
    clearTokensFromResponse(response);
    return response;
  }

  const response = NextResponse.next();
  setLocaleCookie(req, response);
  return response;
}

function setLocaleCookie(req: NextRequest, response: NextResponse) {
  if (!req.cookies.get(LOCALE_COOKIE)) {
    const locale = getLocaleFromRequest(req);
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      sameSite: 'lax',
    });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
