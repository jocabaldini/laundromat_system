'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '../../../_components/PageHeader';
import { deleteServiceItem } from '../actions';
import type { ServiceItem } from '@/lib/types';
import type { Dictionary } from '@/lib/i18n';

interface Props {
  items: ServiceItem[];
  countLabel: string;
  dict: Omit<Dictionary['serviceItems'], 'count' | 'priceHint'>;
}

export default function ServiceItemsClient({ items, countLabel, dict }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm(`${dict.deleteConfirm}\n\n${dict.deleteConfirmDescription}`)) return;
    startTransition(async () => {
      await deleteServiceItem(id);
      router.refresh();
    });
  }

  function formatPrice(price: string) {
    return `R$ ${Number(price).toFixed(2).replace('.', ',')}`;
  }

  return (
    <div>
      <PageHeader
        title={dict.title}
        subtitle={countLabel}
        action={
          <Link
            href="/settings/service-items/new"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition"
            style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--text-on-primary)' }}
          >
            + {dict.newItem}
          </Link>
        }
      />

      <div
        className="overflow-hidden rounded-2xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--primary-subtle)' }}>
              {[dict.name, dict.type, dict.price, dict.actions].map((h) => (
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
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {dict.noResults}
                </td>
              </tr>
            ) : (
              items.map((item, i) => (
                <tr
                  key={item.id}
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    backgroundColor: i % 2 === 1 ? 'var(--primary-subtle)' : undefined,
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-body)' }}>
                    {item.name}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {item.type === 'POR_KG' ? dict.typePorKg : dict.typePorUnidade}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-body)' }}>
                    {formatPrice(item.price)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/settings/service-items/${item.id}/edit`}
                        className="rounded-md px-3 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: 'var(--primary-subtle)',
                          color: 'var(--text-heading)',
                        }}
                      >
                        {dict.edit}
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                        className="rounded-md px-3 py-1 text-xs font-semibold disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--color-danger-bg)',
                          color: 'var(--color-danger-text)',
                          border: 'none',
                          cursor: 'pointer',
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
