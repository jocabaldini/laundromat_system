'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '../../_components/PageHeader';
import { deleteServiceOrder } from '../actions';
import type { ServiceOrder, ServiceOrderStatus } from '@/lib/types';
import type { Dictionary } from '@/lib/i18n';

interface Filters {
  customerId?: string;
  status?: string;
  from?: string;
  to?: string;
}

interface Props {
  orders: ServiceOrder[];
  countLabel: string;
  statusLabels: Record<string, string>;
  filters: Filters;
  dict: Omit<Dictionary['serviceOrders'], 'count'>;
}

const STATUS_BADGE: Record<ServiceOrderStatus, { bg: string; text: string }> = {
  RECEIVED: { bg: 'var(--color-info-bg)', text: 'var(--color-info-text)' },
  WASHING: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)' },
  IRONING: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)' },
  READY: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
  DELIVERED: { bg: 'var(--primary-subtle)', text: 'var(--text-heading)' },
  CANCELLED: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
};

function formatCurrency(value: string) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

// Reads the date part directly from the ISO string instead of going through a
// `Date` object — sidesteps any local-timezone shift entirely (see
// ServiceOrderForm.tsx's dateInputToISOString for the write-side half of this fix).
function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export default function ServiceOrdersClient({
  orders,
  countLabel,
  statusLabels,
  filters,
  dict,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(filters.status ?? '');
  const [from, setFrom] = useState(filters.from ?? '');
  const [to, setTo] = useState(filters.to ?? '');

  function pushFilters(next: { status?: string; from?: string; to?: string }) {
    const query = new URLSearchParams();
    if (filters.customerId) query.set('customerId', filters.customerId);
    if (next.status) query.set('status', next.status);
    if (next.from) query.set('from', next.from);
    if (next.to) query.set('to', next.to);
    const qs = query.toString();
    router.push(`/service-orders${qs ? `?${qs}` : ''}`);
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    pushFilters({ status: value, from, to });
  }

  function handleFromChange(value: string) {
    setFrom(value);
    pushFilters({ status, from: value, to });
  }

  function handleToChange(value: string) {
    setTo(value);
    pushFilters({ status, from, to: value });
  }

  function handleClearFilters() {
    setStatus('');
    setFrom('');
    setTo('');
    router.push('/service-orders');
  }

  function handleDelete(id: string) {
    if (!confirm(`${dict.deleteConfirm}\n\n${dict.deleteConfirmDescription}`)) return;
    startTransition(async () => {
      await deleteServiceOrder(id);
      router.refresh();
    });
  }

  const hasFilters = Boolean(status || from || to);
  const inputStyle = {
    border: '1px solid var(--border-input)',
    borderRadius: '10px',
    padding: '7px 10px',
    fontSize: '0.8125rem',
    color: 'var(--text-heading)',
    backgroundColor: 'var(--bg-input)',
    outline: 'none',
  };
  const labelStyle = {
    display: 'block',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '4px',
  };

  return (
    <div>
      <PageHeader
        title={dict.title}
        subtitle={countLabel}
        action={
          <Link
            href="/service-orders/new"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition"
            style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--text-on-primary)' }}
          >
            + {dict.newOrder}
          </Link>
        }
      />

      {/* Filters */}
      <div
        className="mb-4 flex flex-wrap items-end gap-4 rounded-xl px-4 py-3"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div>
          <label style={labelStyle}>{dict.filterStatus}</label>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={inputStyle}
          >
            <option value="">{dict.filterAll}</option>
            <option value="RECEIVED">{dict.statusReceived}</option>
            <option value="WASHING">{dict.statusWashing}</option>
            <option value="IRONING">{dict.statusIroning}</option>
            <option value="READY">{dict.statusReady}</option>
            <option value="DELIVERED">{dict.statusDelivered}</option>
            <option value="CANCELLED">{dict.statusCancelled}</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>{dict.filterDeliveryFrom}</label>
          <input
            type="date"
            value={from}
            onChange={(e) => handleFromChange(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>{dict.filterDeliveryTo}</label>
          <input
            type="date"
            value={to}
            onChange={(e) => handleToChange(e.target.value)}
            style={inputStyle}
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
            style={{
              backgroundColor: 'var(--primary-subtle)',
              color: 'var(--btn-ghost-text)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {dict.clearFilters}
          </button>
        )}
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--primary-subtle)' }}>
              {[
                dict.status,
                dict.customer,
                dict.estimatedDelivery,
                dict.finalTotal,
                dict.actions,
              ].map((h) => (
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
            {orders.length === 0 ? (
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
              orders.map((order, i) => {
                const badge = STATUS_BADGE[order.status];
                return (
                  <tr
                    key={order.id}
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      backgroundColor: i % 2 === 1 ? 'var(--primary-subtle)' : undefined,
                    }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-bold"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-body)' }}>
                      <span className="font-bold" style={{ color: 'var(--text-heading)' }}>
                        {order.customer.code}
                      </span>{' '}
                      {order.customer.name}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(order.estimatedDeliveryAt)}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-body)' }}>
                      {formatCurrency(order.finalTotal)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/service-orders/${order.id}/edit`}
                          className="rounded-md px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: 'var(--primary-subtle)',
                            color: 'var(--text-heading)',
                          }}
                        >
                          {dict.edit}
                        </Link>
                        <button
                          onClick={() => handleDelete(order.id)}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
