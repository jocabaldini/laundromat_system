'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Customer } from '@/lib/types';
import type { Dictionary } from '@/lib/i18n';
import { suggestCode, checkCodeAvailability, createCustomer, updateCustomer } from '../actions';

interface Props {
  customer?: Customer;
  // `count` is a function and can't be passed as a prop to a Client Component
  // (React Server Components can't serialize functions).
  dict: Omit<Dictionary['customers'], 'count'>;
}

export default function CustomerForm({ customer, dict }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(customer?.name ?? '');
  const [code, setCode] = useState(customer?.code ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'available' | 'unavailable'>('idle');
  const [error, setError] = useState('');

  async function handleSuggestCode() {
    if (!name.trim()) return;
    const result = await suggestCode(name);
    if (result.success) {
      setCode(result.data.code);
      handleCodeBlur(result.data.code);
    }
  }

  async function handleCodeBlur(value?: string) {
    const check = value ?? code;
    if (check.length !== 3) {
      setCodeStatus('idle');
      return;
    }
    // Skip check if code hasn't changed in edit mode
    if (customer && check.toUpperCase() === customer.code) {
      setCodeStatus('available');
      return;
    }
    const result = await checkCodeAvailability(check);
    if (result.success) {
      setCodeStatus(result.data.available ? 'available' : 'unavailable');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(dict.codeRequired);
      return;
    }
    setError('');

    startTransition(async () => {
      const dto = {
        code: code.toUpperCase(),
        name,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
      };

      const result = customer ? await updateCustomer(customer.id, dto) : await createCustomer(dto);

      if (result.success) {
        router.push('/customers');
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  const inputStyle = {
    width: '100%',
    border: '1px solid var(--border-input)',
    borderRadius: '10px',
    padding: '9px 12px',
    fontSize: '0.8125rem',
    color: 'var(--text-heading)',
    backgroundColor: 'var(--bg-input)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-body)',
    marginBottom: '6px',
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="max-w-5xl rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
      >
        {/* Name */}
        <div className="mb-4">
          <label style={labelStyle}>
            {dict.name} <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {/* Code */}
        <div className="mb-4">
          <label style={labelStyle}>
            {dict.code} <span style={{ color: 'var(--color-danger)' }}>*</span>
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>
              — {dict.codeHint}
            </span>
          </label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setCodeStatus('idle');
              }}
              onBlur={() => handleCodeBlur()}
              maxLength={3}
              required
              style={{
                ...inputStyle,
                width: '100px',
                textAlign: 'center',
                fontWeight: 700,
                letterSpacing: '0.1em',
              }}
            />
            <button
              type="button"
              onClick={handleSuggestCode}
              disabled={!name.trim()}
              className="rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-40"
              style={{
                backgroundColor: 'var(--primary-subtle)',
                color: 'var(--text-heading)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {dict.suggestCode}
            </button>
          </div>
          {codeStatus === 'available' && (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-success)' }}>
              {dict.codeAvailable}
            </p>
          )}
          {codeStatus === 'unavailable' && (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
              {dict.codeUnavailable}
            </p>
          )}
        </div>

        {/* Phone + Email */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>{dict.phone}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label style={labelStyle}>{dict.email}</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              style={inputStyle}
              placeholder="cliente@email.com"
            />
          </div>
        </div>

        {/* Address */}
        <div className="mb-6">
          <label style={labelStyle}>{dict.address}</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            style={inputStyle}
            placeholder="Rua, número, bairro..."
          />
        </div>

        {error && (
          <p className="mb-4 text-sm" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div
          className="flex justify-end gap-3 border-t pt-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={() => router.push('/customers')}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--btn-secondary-text)',
              border: '1.5px solid var(--btn-secondary-border)',
              cursor: 'pointer',
            }}
          >
            {dict.cancel}
          </button>
          <button
            type="submit"
            disabled={isPending || codeStatus === 'unavailable'}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60"
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--text-on-primary)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isPending ? '...' : dict.save}
          </button>
        </div>
      </div>
    </form>
  );
}
