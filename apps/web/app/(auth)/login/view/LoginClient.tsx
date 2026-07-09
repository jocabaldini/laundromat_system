'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/lib/auth/actions';
import { Toast, type ToastVariant } from '@/app/_components/Toast';
import { useTheme } from '@/app/_components/ThemeProvider';
import type { Dictionary } from '@/lib/i18n';

type Props = { dict: Dictionary['login'] };

export default function LoginClient({ dict }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, startTransition] = useTransition();
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<ToastVariant>('info');
  const { theme, cycleTheme } = useTheme();

  function showToast(message: string, variant: ToastVariant) {
    setToastMessage(message);
    setToastVariant(variant);
    setToastOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await loginAction(email, password);
      if (result.success) {
        router.push('/dashboard');
      } else {
        showToast(result.message, 'error');
      }
    });
  }

  const themeIcon = theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻';
  const themeTitle =
    theme === 'light' ? 'Tema: Claro' : theme === 'dark' ? 'Tema: Escuro' : 'Tema: Sistema';

  return (
    <main
      className="relative min-h-screen flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      {/* Theme toggle */}
      <button
        type="button"
        onClick={cycleTheme}
        title={themeTitle}
        className="fixed top-4 right-4 flex items-center justify-center rounded-full p-2.5 text-base transition"
        style={{
          backgroundColor: 'var(--primary-subtle)',
          color: 'var(--primary)',
        }}
      >
        {themeIcon}
      </button>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Image
            src="/logo.svg"
            alt="Lavanderia Visconde"
            width={180}
            height={56}
            className="h-14 w-auto"
          />
          <p
            className="text-xs uppercase tracking-[0.35em] font-semibold"
            style={{ color: 'var(--text-muted)' }}
          >
            Lavanderia
          </p>
          <h1 className="text-3xl font-bold font-display" style={{ color: 'var(--text-heading)' }}>
            Visconde
          </h1>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 shadow-sm"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
          }}
        >
          <h2 className="text-xl font-bold font-display" style={{ color: 'var(--text-heading)' }}>
            {dict.title}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {dict.subtitle}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-semibold"
                style={{ color: 'var(--text-body)' }}
              >
                {dict.email}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={dict.emailPlaceholder}
                className="h-11 rounded-xl px-3 text-sm outline-none transition"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-input)',
                  color: 'var(--text-heading)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--border-input-focus)';
                  e.target.style.boxShadow = '0 0 0 3px var(--ring-input)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-input)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-semibold"
                style={{ color: 'var(--text-body)' }}
              >
                {dict.password}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={dict.passwordPlaceholder}
                className="h-11 rounded-xl px-3 text-sm outline-none transition"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-input)',
                  color: 'var(--text-heading)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--border-input-focus)';
                  e.target.style.boxShadow = '0 0 0 3px var(--ring-input)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-input)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-1 h-11 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--text-on-primary)',
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLButtonElement).style.backgroundColor = 'var(--btn-primary-hover)')
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLButtonElement).style.backgroundColor = 'var(--btn-primary-bg)')
              }
            >
              {isPending ? dict.submitting : dict.submit}
            </button>
          </form>
        </div>
      </div>

      <Toast
        open={toastOpen}
        message={toastMessage}
        variant={toastVariant}
        onClose={() => setToastOpen(false)}
      />
    </main>
  );
}
