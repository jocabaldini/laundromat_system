'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ServiceOrder, ServiceOrderItemStatus } from '@/lib/types';
import type { Dictionary } from '@/lib/i18n';
import {
  updateServiceOrderAndRedirect,
  updateServiceOrderItem,
  deliverServiceOrder,
  cancelServiceOrder,
} from '../../../actions';

// Local (not UTC) YYYY-MM-DD — used as the `min` for the delivery date input,
// so "today" matches the operator's own calendar day regardless of UTC offset.
function todayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// A plain YYYY-MM-DD from a date input is parsed as UTC midnight if given a "Z"
// suffix, which shifts the calendar day backwards in timezones behind UTC
// (e.g. -3). Appending a bare (no "Z") time forces local-timezone parsing, so
// the intended calendar day round-trips correctly through the API.
function dateInputToISOString(value: string): string {
  const withTime = value.includes('T') ? value : `${value}T00:00:00`;
  return new Date(withTime).toISOString();
}

interface Props {
  order: ServiceOrder;
  statusLabels: Record<string, string>;
  itemStatusLabels: Record<string, string>;
  dict: Omit<Dictionary['serviceOrders'], 'count'>;
}

const NEXT_ITEM_STATUS: Record<ServiceOrderItemStatus, ServiceOrderItemStatus | null> = {
  RECEIVED: 'WASHING',
  WASHING: 'IRONING',
  IRONING: 'READY',
  READY: null,
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  RECEIVED: { bg: 'var(--color-info-bg)', text: 'var(--color-info-text)' },
  WASHING: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)' },
  IRONING: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)' },
  READY: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
  DELIVERED: { bg: 'var(--primary-subtle)', text: 'var(--text-heading)' },
  CANCELLED: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
};

function formatMoney(value: string | number) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

interface ItemDraft {
  quantity: string;
  finalPrice: string;
  observations: string;
}

function draftsFromOrder(order: ServiceOrder): Record<string, ItemDraft> {
  const drafts: Record<string, ItemDraft> = {};
  for (const item of order.items) {
    drafts[item.id] = {
      quantity: item.quantity,
      finalPrice: item.finalPrice,
      observations: item.observations ?? '',
    };
  }
  return drafts;
}

export default function ServiceOrderEditClient({
  order: initialOrder,
  statusLabels,
  itemStatusLabels,
  dict,
}: Props) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState(
    initialOrder.estimatedDeliveryAt.slice(0, 10),
  );
  const [observations, setObservations] = useState(initialOrder.observations ?? '');
  const [finalTotal, setFinalTotal] = useState(initialOrder.finalTotal);
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>(draftsFromOrder(initialOrder));
  const [savingHeader, setSavingHeader] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const readOnly = order.status === 'DELIVERED' || order.status === 'CANCELLED';
  const badge = STATUS_BADGE[order.status];

  function applyOrder(updated: ServiceOrder) {
    setOrder(updated);
    setEstimatedDeliveryAt(updated.estimatedDeliveryAt.slice(0, 10));
    setObservations(updated.observations ?? '');
    setFinalTotal(updated.finalTotal);
    setDrafts(draftsFromOrder(updated));
  }

  function handleSaveHeader() {
    setError('');
    const parsedFinalTotal = parseFloat(finalTotal.replace(',', '.'));
    if (isNaN(parsedFinalTotal) || parsedFinalTotal < 0) {
      setError(dict.invalidQuantity);
      return;
    }

    setSavingHeader(true);
    (async () => {
      // Redirects internally on success — the pending flag only needs to be
      // reset for the error case, since a successful call navigates away.
      const result = await updateServiceOrderAndRedirect(order.id, {
        estimatedDeliveryAt: dateInputToISOString(estimatedDeliveryAt),
        observations: observations || undefined,
        finalTotal: parsedFinalTotal,
      });
      setSavingHeader(false);
      if (result?.error) {
        setError(result.error);
      }
    })();
  }

  function commitItem(itemId: string, patch: Partial<ItemDraft>) {
    const draft = { ...drafts[itemId], ...patch };
    setDrafts((prev) => ({ ...prev, [itemId]: draft }));

    const quantity = parseFloat(draft.quantity.replace(',', '.'));
    const finalPrice = parseFloat(draft.finalPrice.replace(',', '.'));
    if (isNaN(quantity) || quantity <= 0 || isNaN(finalPrice) || finalPrice < 0) {
      setError(dict.invalidQuantity);
      return;
    }
    setError('');

    setSavingItemId(itemId);
    (async () => {
      const result = await updateServiceOrderItem(order.id, itemId, {
        quantity,
        finalPrice,
        observations: draft.observations || undefined,
      });
      setSavingItemId(null);
      if (result.success) {
        applyOrder(result.data);
        router.refresh();
      } else {
        setError(result.message);
      }
    })();
  }

  function advanceItemStatus(itemId: string, current: ServiceOrderItemStatus) {
    const next = NEXT_ITEM_STATUS[current];
    if (!next) return;

    setSavingItemId(itemId);
    (async () => {
      const result = await updateServiceOrderItem(order.id, itemId, { status: next });
      setSavingItemId(null);
      if (result.success) {
        applyOrder(result.data);
        router.refresh();
      } else {
        setError(result.message);
      }
    })();
  }

  function handleDeliver() {
    if (!confirm(dict.confirmDeliver)) return;
    (async () => {
      const result = await deliverServiceOrder(order.id);
      if (result.success) {
        applyOrder(result.data);
        router.refresh();
      } else {
        setError(result.message);
      }
    })();
  }

  function handleCancelOrder() {
    if (!confirm(dict.confirmCancel)) return;
    (async () => {
      const result = await cancelServiceOrder(order.id);
      if (result.success) {
        applyOrder(result.data);
        router.refresh();
      } else {
        setError(result.message);
      }
    })();
  }

  const inputStyle = {
    width: '100%',
    border: '1px solid var(--border-input)',
    borderRadius: '10px',
    padding: '8px 10px',
    fontSize: '0.8125rem',
    color: 'var(--text-heading)',
    backgroundColor: 'var(--bg-input)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const readOnlyInputStyle = {
    ...inputStyle,
    backgroundColor: 'var(--primary-subtle)',
    color: 'var(--text-secondary)',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-body)',
    marginBottom: '6px',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span
            className="rounded-md px-3 py-1 text-xs font-bold"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {statusLabels[order.status] ?? order.status}
          </span>
          {!readOnly && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeliver}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  backgroundColor: 'var(--color-success-bg)',
                  color: 'var(--color-success-text)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {dict.deliver}
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger-text)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {dict.cancelOrder}
              </button>
            </div>
          )}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>{dict.customer}</label>
            <input
              value={`${order.customer.code} — ${order.customer.name}`}
              readOnly
              style={readOnlyInputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{dict.estimatedDelivery}</label>
            <input
              type="date"
              value={estimatedDeliveryAt}
              onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
              min={todayLocalDateString()}
              disabled={readOnly}
              style={inputStyle}
            />
          </div>
        </div>

        <div className="mb-4">
          <label style={labelStyle}>{dict.observations}</label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            disabled={readOnly}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' as const }}
          />
        </div>

        {!readOnly && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveHeader}
              disabled={savingHeader}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--text-on-primary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {savingHeader ? '...' : dict.save}
            </button>
          </div>
        )}
      </div>

      {/* Items */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--primary-subtle)' }}>
              {[
                dict.item,
                dict.itemType,
                dict.quantity,
                dict.unitPrice,
                dict.subtotal,
                dict.itemStatus,
                dict.itemObservations,
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => {
              const draft = drafts[item.id];
              const next = NEXT_ITEM_STATUS[item.status];
              const subtotal =
                (parseFloat(draft.quantity.replace(',', '.')) || 0) *
                (parseFloat(draft.finalPrice.replace(',', '.')) || 0);

              return (
                <tr
                  key={item.id}
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    backgroundColor: i % 2 === 1 ? 'var(--primary-subtle)' : undefined,
                  }}
                >
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-body)' }}>
                    {item.serviceItemName}
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                    {item.serviceItemType === 'POR_KG' ? dict.porKg : dict.porUnidade}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={draft.quantity}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], quantity: e.target.value },
                        }))
                      }
                      onBlur={(e) => {
                        // POR_UNIDADE quantities must be whole numbers
                        if (item.serviceItemType === 'POR_UNIDADE') {
                          const rounded = String(Math.max(1, Math.round(Number(e.target.value))));
                          commitItem(item.id, { quantity: rounded });
                        } else {
                          commitItem(item.id, { quantity: e.target.value });
                        }
                      }}
                      disabled={readOnly || savingItemId === item.id}
                      min={item.serviceItemType === 'POR_UNIDADE' ? 1 : 0.001}
                      step={item.serviceItemType === 'POR_UNIDADE' ? 1 : 0.001}
                      style={{ ...inputStyle, width: '80px' }}
                    />
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                    {formatMoney(item.referencePrice)}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={draft.finalPrice}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], finalPrice: e.target.value },
                        }))
                      }
                      onBlur={(e) => commitItem(item.id, { finalPrice: e.target.value })}
                      disabled={readOnly || savingItemId === item.id}
                      inputMode="decimal"
                      style={{ ...inputStyle, width: '90px' }}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-body)' }}>
                    {formatMoney(subtotal)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-bold"
                        style={{
                          backgroundColor: STATUS_BADGE[item.status].bg,
                          color: STATUS_BADGE[item.status].text,
                        }}
                      >
                        {itemStatusLabels[item.status] ?? item.status}
                      </span>
                      {!readOnly && next && (
                        <button
                          type="button"
                          onClick={() => advanceItemStatus(item.id, item.status)}
                          disabled={savingItemId === item.id}
                          className="rounded-md px-2 py-1 text-xs font-semibold transition disabled:opacity-50"
                          style={{
                            backgroundColor: 'var(--primary-subtle)',
                            color: 'var(--text-heading)',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {dict.advanceItemStatus}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={draft.observations}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], observations: e.target.value },
                        }))
                      }
                      onBlur={(e) => commitItem(item.id, { observations: e.target.value })}
                      disabled={readOnly || savingItemId === item.id}
                      style={{ ...inputStyle, width: '140px' }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div
        className="grid grid-cols-3 gap-4 rounded-2xl p-4"
        style={{ backgroundColor: 'var(--primary-subtle)' }}
      >
        <div>
          <label style={labelStyle}>{dict.referenceTotal}</label>
          <input value={formatMoney(order.referenceTotal)} readOnly style={readOnlyInputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{dict.finalTotal}</label>
          <input
            value={finalTotal}
            onChange={(e) => setFinalTotal(e.target.value)}
            disabled={readOnly}
            inputMode="decimal"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>{dict.discount}</label>
          <input value={formatMoney(order.discount)} readOnly style={readOnlyInputStyle} />
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
