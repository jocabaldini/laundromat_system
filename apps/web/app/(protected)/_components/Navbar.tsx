'use client';

import { useTransition } from 'react';
import { logoutAction } from '@/app/(protected)/dashboard/actions';
import { setLocaleAction } from '@/lib/i18n/actions';
import type { Dictionary, Locale } from '@/lib/i18n';

interface NavbarProps {
  userName: string;
  dict: Dictionary['navbar'];
  currentLocale: Locale;
}

export default function Navbar({ userName, dict, currentLocale }: NavbarProps) {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
    });
  }

  function handleLocaleChange(locale: Locale) {
    startTransition(async () => {
      await setLocaleAction(locale);
    });
  }

  return (
    <header className="w-full border-b border-gray-800 bg-gray-900 px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <span className="text-lg font-semibold text-white">{dict.appName}</span>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm">
            {(['pt-BR', 'en-US'] as Locale[]).map((locale) => (
              <button
                key={locale}
                onClick={() => handleLocaleChange(locale)}
                disabled={isPending || currentLocale === locale}
                className="rounded px-2 py-1 text-gray-400 transition hover:text-white disabled:font-semibold disabled:text-white cursor-pointer"
              >
                {locale === 'pt-BR' ? 'PT' : 'EN'}
              </button>
            ))}
          </div>

          <span className="text-sm text-gray-400">{userName}</span>

          <button
            onClick={handleLogout}
            disabled={isPending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? dict.loggingOut : dict.logout}
          </button>
        </div>
      </div>
    </header>
  );
}
