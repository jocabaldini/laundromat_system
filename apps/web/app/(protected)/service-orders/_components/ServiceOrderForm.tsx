'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Customer, PricingType, ServiceItem } from '@/lib/types';
import type { Dictionary } from '@/lib/i18n';
import { createServiceOrderAndRedirect } from '../actions';

interface Props {
  customers: Customer[];
  serviceItems: ServiceItem[];
  dict: Omit<Dictionary['serviceOrders'], 'count'>;
}

interface ItemRow {
  serviceItemId: string;
  serviceItemType: PricingType | undefined;
  referencePrice: number;
  // quantity/finalPrice/subtotal are kept as strings (not numbers) so the
  // inputs stay controllable while typing (e.g. "12," or an empty value).
  quantity: string;
  finalPrice: string;
  subtotal: string;
  observations: string;
}

function emptyRow(): ItemRow {
  return {
    serviceItemId: '',
    serviceItemType: undefined,
    referencePrice: 0,
    quantity: '',
    finalPrice: '',
    subtotal: '',
    observations: '',
  };
}

function parseNumber(value: string): number {
  const parsed = parseFloat(value.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}

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

export default function ServiceOrderForm({ customers, serviceItems, dict }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const customerMenuRef = useRef<HTMLDivElement>(null);

  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState('');
  const [observations, setObservations] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [finalTotal, setFinalTotal] = useState('0.00');
  const [finalTotalTouched, setFinalTotalTouched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerMenuRef.current && !customerMenuRef.current.contains(e.target as Node)) {
        setCustomerMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [customers, customerQuery]);

  // Reference total uses each row's snapshotted referencePrice — the catalog
  // price at the time the item was selected — not the editable finalPrice.
  const referenceTotal = useMemo(
    () => rows.reduce((sum, row) => sum + row.referencePrice * parseNumber(row.quantity), 0),
    [rows],
  );

  // itemsTotal is the sum of the (editable) per-row subtotals.
  const itemsTotal = useMemo(
    () => rows.reduce((sum, row) => sum + parseNumber(row.subtotal), 0),
    [rows],
  );

  // Final total defaults to the items total until the operator edits it directly.
  // Editing it directly only affects the discount, never the item prices/subtotals.
  useEffect(() => {
    if (!finalTotalTouched) {
      setFinalTotal(itemsTotal.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsTotal]);

  const discount = referenceTotal - parseNumber(finalTotal);

  function updateRow(index: number, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleServiceItemChange(index: number, serviceItemId: string) {
    const serviceItem = serviceItems.find((si) => si.id === serviceItemId);
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (!serviceItem) return { ...row, ...emptyRow(), observations: row.observations };
        const price = Number(serviceItem.price);
        const quantity = parseNumber(row.quantity);
        return {
          ...row,
          serviceItemId: serviceItem.id,
          serviceItemType: serviceItem.type,
          referencePrice: price,
          finalPrice: price.toFixed(2),
          subtotal: (price * quantity).toFixed(2),
        };
      }),
    );
  }

  // quantity changes recompute the subtotal from the current unit price
  function handleQuantityChange(index: number, value: string) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              quantity: value,
              subtotal: (parseNumber(row.finalPrice) * parseNumber(value)).toFixed(2),
            }
          : row,
      ),
    );
  }

  // unit price changes recompute the subtotal: subtotal = finalPrice × quantity
  function handleItemPriceChange(index: number, value: string) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              finalPrice: value,
              subtotal: (parseNumber(value) * parseNumber(row.quantity)).toFixed(2),
            }
          : row,
      ),
    );
  }

  // subtotal changes recompute the unit price: finalPrice = subtotal ÷ quantity
  function handleItemSubtotalChange(index: number, value: string) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const quantity = parseNumber(row.quantity);
        return {
          ...row,
          subtotal: value,
          finalPrice: quantity > 0 ? (parseNumber(value) / quantity).toFixed(2) : row.finalPrice,
        };
      }),
    );
  }

  // POR_UNIDADE quantities must be whole numbers — enforced on blur
  function handleQuantityBlur(index: number) {
    const row = rows[index];
    if (row.serviceItemType !== 'POR_UNIDADE') return;
    const rounded = Math.max(1, Math.round(parseNumber(row.quantity)));
    const roundedStr = String(rounded);
    updateRow(index, {
      quantity: roundedStr,
      subtotal: (parseNumber(row.finalPrice) * rounded).toFixed(2),
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Removing an item invalidates any manually-entered final total, since it
      // was based on a different set of items — snap back to the new items sum.
      const newItemsTotal = updated.reduce((sum, row) => sum + parseNumber(row.subtotal), 0);
      setFinalTotalTouched(false);
      setFinalTotal(newItemsTotal.toFixed(2));
      return updated;
    });
  }

  function selectCustomer(customer: Customer) {
    setCustomerId(customer.id);
    setCustomerQuery(`${customer.code} — ${customer.name}`);
    setCustomerMenuOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customerId) {
      setError(dict.selectCustomer);
      return;
    }
    if (rows.length === 0) {
      setError(dict.itemsRequired);
      return;
    }
    for (const row of rows) {
      if (!row.serviceItemId) {
        setError(dict.selectServiceItem);
        return;
      }
      const quantity = parseNumber(row.quantity);
      if (quantity <= 0) {
        setError(dict.invalidQuantity);
        return;
      }
      if (row.serviceItemType === 'POR_UNIDADE' && !Number.isInteger(quantity)) {
        setError(dict.invalidQuantity);
        return;
      }
    }
    setError('');

    setIsPending(true);
    (async () => {
      // Redirects internally on success — the pending flag only needs to be
      // reset for the error case, since a successful call navigates away.
      const result = await createServiceOrderAndRedirect({
        customerId,
        estimatedDeliveryAt: dateInputToISOString(estimatedDeliveryAt),
        observations: observations || undefined,
        items: rows.map((row) => ({
          serviceItemId: row.serviceItemId,
          quantity: parseNumber(row.quantity),
          finalPrice: parseNumber(row.finalPrice),
          observations: row.observations || undefined,
        })),
      });

      setIsPending(false);
      if (result?.error) {
        setError(result.error);
      }
    })();
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

  function formatMoney(value: number) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="max-w-5xl rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
      >
        {/* Customer + delivery date */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="relative" ref={customerMenuRef}>
            <label style={labelStyle}>
              {dict.customer} <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              value={customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setCustomerId('');
                setCustomerMenuOpen(true);
              }}
              onFocus={() => setCustomerMenuOpen(true)}
              placeholder={dict.searchCustomerPlaceholder}
              style={inputStyle}
            />
            {customerMenuOpen && filteredCustomers.length > 0 && (
              <div
                className="absolute left-0 right-0 z-10 mt-1 max-h-52 overflow-y-auto rounded-xl py-1 shadow-lg"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                }}
              >
                {filteredCustomers.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="block w-full px-3 py-2 text-left text-sm transition"
                    style={{ color: 'var(--text-body)', background: 'none', border: 'none' }}
                    onMouseEnter={(e) =>
                      ((e.target as HTMLButtonElement).style.backgroundColor =
                        'var(--primary-subtle)')
                    }
                    onMouseLeave={(e) =>
                      ((e.target as HTMLButtonElement).style.backgroundColor = 'transparent')
                    }
                  >
                    <span className="font-bold" style={{ color: 'var(--text-heading)' }}>
                      {c.code}
                    </span>{' '}
                    — {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>
              {dict.estimatedDelivery} <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="date"
              value={estimatedDeliveryAt}
              onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
              min={todayLocalDateString()}
              required
              style={inputStyle}
            />
          </div>
        </div>

        {/* Observations */}
        <div className="mb-6">
          <label style={labelStyle}>{dict.observations}</label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' as const }}
          />
        </div>

        {/* Items */}
        <div className="mb-6">
          <label style={labelStyle}>{dict.items}</label>
          <div className="flex flex-col gap-3">
            {rows.map((row, index) => {
              const type = row.serviceItemType;
              return (
                <div
                  key={index}
                  className="rounded-xl p-3"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4">
                      <select
                        value={row.serviceItemId}
                        onChange={(e) => handleServiceItemChange(index, e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">{dict.selectServiceItem}</option>
                        {serviceItems.map((si) => (
                          <option key={si.id} value={si.id}>
                            {si.name} ({si.type === 'POR_KG' ? dict.porKg : dict.porUnidade})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        onBlur={() => handleQuantityBlur(index)}
                        min={type === 'POR_UNIDADE' ? 1 : 0.001}
                        step={type === 'POR_UNIDADE' ? 1 : 0.001}
                        placeholder={type === 'POR_KG' ? '0,000' : '0'}
                        style={inputStyle}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        value={row.finalPrice}
                        onChange={(e) => handleItemPriceChange(index, e.target.value)}
                        inputMode="decimal"
                        disabled={!row.serviceItemId}
                        style={inputStyle}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        value={row.subtotal}
                        onChange={(e) => handleItemSubtotalChange(index, e.target.value)}
                        inputMode="decimal"
                        disabled={!row.serviceItemId}
                        style={inputStyle}
                      />
                    </div>
                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="w-full rounded-lg px-2 py-2 text-xs font-semibold transition"
                        style={{
                          backgroundColor: 'var(--color-danger-bg)',
                          color: 'var(--color-danger-text)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {dict.removeItem}
                      </button>
                    </div>
                  </div>
                  <input
                    value={row.observations}
                    onChange={(e) => updateRow(index, { observations: e.target.value })}
                    placeholder={dict.itemObservations}
                    className="mt-2"
                    style={inputStyle}
                  />
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addRow}
            className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold transition"
            style={{
              backgroundColor: 'var(--primary-subtle)',
              color: 'var(--text-heading)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            + {dict.addItem}
          </button>
        </div>

        {/* Totals */}
        <div
          className="mb-6 grid grid-cols-3 gap-4 rounded-xl p-4"
          style={{ backgroundColor: 'var(--primary-subtle)' }}
        >
          <div>
            <label style={labelStyle}>{dict.referenceTotal}</label>
            <input value={formatMoney(referenceTotal)} readOnly style={readOnlyInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{dict.finalTotal}</label>
            <input
              value={finalTotal}
              onChange={(e) => {
                setFinalTotalTouched(true);
                setFinalTotal(e.target.value);
              }}
              inputMode="decimal"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{dict.discount}</label>
            <input value={formatMoney(discount)} readOnly style={readOnlyInputStyle} />
          </div>
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
            onClick={() => router.push('/service-orders')}
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
            disabled={isPending}
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
