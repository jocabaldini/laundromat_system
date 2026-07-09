'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import Image from 'next/image';
import { logoutAction } from '@/lib/auth/actions';
import { setLocaleAction } from '@/lib/i18n/actions';
import { useTheme } from '@/app/_components/ThemeProvider';
import type { Dictionary, Locale } from '@/lib/i18n';

interface NavbarProps {
  userName: string;
  dict: Dictionary['navbar'];
  currentLocale: Locale;
}

export default function Navbar({ userName, dict, currentLocale }: NavbarProps) {
  const [isPending, startTransition] = useTransition();
  const { theme, cycleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    setMenuOpen(false);
    startTransition(async () => {
      await logoutAction();
    });
  }

  function handleLocaleToggle() {
    const next = currentLocale === 'pt-BR' ? 'en-US' : 'pt-BR';
    startTransition(async () => {
      await setLocaleAction(next);
    });
  }

  const themeIcon = theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻';
  const themeTitle =
    theme === 'light' ? 'Tema: Claro' : theme === 'dark' ? 'Tema: Escuro' : 'Tema: Sistema';
  const localeLabel = currentLocale === 'pt-BR' ? '🇧🇷 PT' : '🇺🇸 EN';

  const pillStyle = {
    backgroundColor: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.18)',
    color: '#fff',
    borderRadius: '9999px',
    padding: '5px 12px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'background 0.15s',
  } as const;

  return (
    <header style={{ backgroundColor: 'var(--navbar-bg)' }} className="w-full shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="Lavanderia Visconde"
            width={120}
            height={37}
            priority
            className="h-8 w-auto brightness-0 invert"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Locale toggle */}
          <button
            type="button"
            onClick={handleLocaleToggle}
            disabled={isPending}
            title="Alternar idioma"
            style={pillStyle}
          >
            {localeLabel}
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={cycleTheme}
            title={themeTitle}
            style={{ ...pillStyle, padding: '5px 10px' }}
          >
            {themeIcon}
          </button>

          {/* User dropdown */}
          <div className="relative" ref={menuRef}>
            <button type="button" onClick={() => setMenuOpen((v) => !v)} style={pillStyle}>
              {userName}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 2 }}>
                <path
                  d="M2 4l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-44 rounded-xl py-1 shadow-lg z-50"
                style={{
                  backgroundColor: 'var(--navbar-bg)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <button
                  onClick={handleLogout}
                  disabled={isPending}
                  className="w-full px-4 py-2 text-left text-sm transition"
                  style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontFamily: 'system-ui, sans-serif',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLButtonElement).style.backgroundColor =
                      'rgba(255,255,255,0.1)')
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLButtonElement).style.backgroundColor = 'transparent')
                  }
                >
                  {isPending ? dict.loggingOut : dict.logout}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
