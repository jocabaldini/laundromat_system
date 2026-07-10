'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '../../_components/PageHeader';
import { deleteCustomer } from '../actions';
import type { Customer } from '@/lib/types';
import type { Dictionary } from '@/lib/i18n';

interface Props {
  customers: Customer[];
  // `count` is a function and can't be passed as a prop to a Client Component
  // (React Server Components can't serialize functions) — it's precomputed
  // server-side into `countLabel` instead.
  dict: Omit<Dictionary['customers'], 'count'>;
  countLabel: string;
}

export default function CustomersClient({ customers, dict, countLabel }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/customers?search=${encodeURIComponent(search)}`);
  }

  function handleDelete(id: string) {
    if (!confirm(`${dict.deleteConfirm}\n\n${dict.deleteConfirmDescription}`)) return;
    startTransition(async () => {
      await deleteCustomer(id);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title={dict.title}
        subtitle={countLabel}
        action={
          <Link
            href="/customers/new"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition"
            style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--text-on-primary)' }}
          >
            + {dict.newCustomer}
          </Link>
        }
      />

      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={dict.searchPlaceholder}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-heading)' }}
        />
        <button
          type="submit"
          className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
          style={{ backgroundColor: 'var(--primary-subtle)', color: 'var(--btn-ghost-text)' }}
        >
          {dict.search}
        </button>
      </form>

      {/* Table */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--primary-subtle)' }}>
              {[dict.code, dict.name, dict.phone, dict.email, dict.actions].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {dict.noResults}
                </td>
              </tr>
            ) : (
              customers.map((c, i) => (
                <tr
                  key={c.id}
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    backgroundColor: i % 2 === 1 ? 'var(--primary-subtle)' : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-bold tracking-wider"
                      style={{
                        backgroundColor: 'var(--primary-subtle)',
                        color: 'var(--text-heading)',
                      }}
                    >
                      {c.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-body)' }}>
                    {c.name}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {c.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {c.email ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/customers/${c.id}/edit`}
                        className="rounded-md px-3 py-1 text-xs font-semibold transition"
                        style={{
                          backgroundColor: 'var(--primary-subtle)',
                          color: 'var(--text-heading)',
                        }}
                      >
                        {dict.edit}
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={isPending}
                        className="rounded-md px-3 py-1 text-xs font-semibold transition disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--color-danger-bg)',
                          color: 'var(--color-danger-text)',
                        }}
                      >
                        {dict.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
