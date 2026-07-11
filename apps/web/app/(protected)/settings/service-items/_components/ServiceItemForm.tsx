'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PricingType, ServiceItem } from '@/lib/types';
import type { Dictionary } from '@/lib/i18n';
import { createServiceItem, updateServiceItem } from '../actions';

interface Props {
  item?: ServiceItem;
  // `priceHint` is a function of the pricing type — both possible outcomes are
  // computed server-side since functions can't be passed to a Client Component.
  priceHints: Record<PricingType, string>;
  dict: Omit<Dictionary['serviceItems'], 'count' | 'priceHint'>;
}

export default function ServiceItemForm({ item, priceHints, dict }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(item?.name ?? '');
  const [type, setType] = useState<PricingType>(item?.type ?? 'POR_UNIDADE');
  const [price, setPrice] = useState(item ? Number(item.price).toString() : '');
  const [error, setError] = useState('');

  // Price hint changes with type selection
  const priceHint = priceHints[type];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError(dict.invalidPrice);
      return;
    }
    setError('');

    startTransition(async () => {
      const dto = { name, type, price: parsedPrice };
      const result = item ? await updateServiceItem(item.id, dto) : await createServiceItem(dto);

      if (result.success) {
        router.push('/settings/service-items');
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
    fontSize: '13px',
    color: 'var(--text-heading)',
    backgroundColor: 'var(--bg-input)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-body)',
    marginBottom: '6px',
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="max-w-lg rounded-2xl p-6"
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

        {/* Type */}
        <div className="mb-4">
          <label style={labelStyle}>
            {dict.type} <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PricingType)}
            style={inputStyle}
          >
            <option value="POR_UNIDADE">{dict.typePorUnidade}</option>
            <option value="POR_KG">{dict.typePorKg}</option>
          </select>
        </div>

        {/* Price */}
        <div className="mb-6">
          <label style={labelStyle}>
            {dict.price} <span style={{ color: 'var(--color-danger)' }}>*</span>
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>
              — {priceHint}
            </span>
          </label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            // POR_KG allows decimals (comma or dot), POR_UNIDADE allows only integers
            inputMode={type === 'POR_KG' ? 'decimal' : 'numeric'}
            pattern={type === 'POR_KG' ? '[0-9]+([.,][0-9]{1,2})?' : '[0-9]+'}
            required
            style={inputStyle}
            placeholder={type === 'POR_KG' ? '0,00' : '0'}
          />
        </div>

        {error && (
          <p className="mb-4 text-sm" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        <div
          className="flex justify-end gap-3 border-t pt-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={() => router.push('/settings/service-items')}
            style={{
              background: 'transparent',
              color: 'var(--btn-secondary-text)',
              border: '1.5px solid var(--btn-secondary-border)',
              borderRadius: '10px',
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {dict.cancel}
          </button>
          <button
            type="submit"
            disabled={isPending}
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--text-on-primary)',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 600,
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
