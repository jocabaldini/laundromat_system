# Prompt — Service Orders Bug Fixes + Font Size rem Conversion

Leia o CLAUDE.md antes de começar. Não faça commit ao final — o desenvolvedor revisa e commita manualmente.

---

## 1. Convert hardcoded px fontSize to rem in all web components

The FontSizeProvider sets `font-size` on the `<html>` element, but inline styles using `px`
units ignore this. Convert ALL `fontSize: 'Npx'` occurrences in inline styles across the
entire `apps/web/` directory to `rem` equivalents.

Conversion table:
- `'10px'` → `'0.625rem'`
- `'11px'` → `'0.6875rem'`
- `'12px'` → `'0.75rem'`
- `'13px'` → `'0.8125rem'`
- `'14px'` → `'0.875rem'`
- `'15px'` → `'0.9375rem'`
- `'16px'` → `'1rem'`

Run this to find all occurrences:
```bash
grep -rn "fontSize: '" apps/web/app --include="*.tsx" --include="*.ts"
```

Replace every `fontSize: 'Npx'` with the corresponding `rem` value.
Also check for `font-size: Npx` in `globals.css` if any exist (convert those too).

After converting, verify that changing the font size via A+/A− in the navbar now scales
text inside tables, forms, and all other content areas — not just the sidebar menu.

---

## 2. Recalculate OS final total when removing an item

**File:** `apps/web/app/(protected)/service-orders/_components/ServiceOrderForm.tsx`

When the user removes an item from the list, the `finalTotal` displayed in the footer must
be recalculated from the remaining items' subtotals.

Find the `removeItem` handler (or equivalent) and ensure it triggers a recalculation:

```ts
function handleRemoveItem(index: number) {
  setItems((prev) => {
    const updated = prev.filter((_, i) => i !== index);
    // Recalculate finalTotal from remaining items
    const newItemsTotal = updated.reduce((sum, item) => sum + item.subtotal, 0);
    setFinalTotal(newItemsTotal);
    return updated;
  });
}
```

If `finalTotal` is derived state (computed from items), this may already work — verify by
removing an item and checking if the footer total updates correctly. Fix only if broken.

---

## 3. Prevent past dates in estimated delivery date input

**File:** `apps/web/app/(protected)/service-orders/_components/ServiceOrderForm.tsx`

Add a `min` attribute to the estimated delivery date input equal to today's date:

```tsx
<input
  type="date"
  min={new Date().toISOString().split('T')[0]}
  ...
/>
```

Apply the same constraint in `ServiceOrderEditClient.tsx` if the delivery date is editable there.

---

## 4. Fix timezone offset causing date to appear one day earlier

**Problem:** `new Date('2026-07-20')` is parsed as UTC midnight, which in São Paulo (UTC-3)
becomes `2026-07-19T21:00:00` — displaying one day earlier.

**Fix:** append `T00:00:00` (no Z) when constructing Date from a date string, forcing local
timezone interpretation:

```ts
// Before
new Date(dto.estimatedDeliveryAt)

// After
new Date(dto.estimatedDeliveryAt.includes('T') ? dto.estimatedDeliveryAt : `${dto.estimatedDeliveryAt}T00:00:00`)
```

Apply this fix everywhere a date string from an `<input type="date">` is converted to a
`Date` object and sent to the API:

- `apps/web/app/(protected)/service-orders/_components/ServiceOrderForm.tsx` — on submit
- `apps/web/app/(protected)/service-orders/[id]/edit/view/ServiceOrderEditClient.tsx` — on save

Also fix the **display** of dates from the API (ISO strings like `2026-07-20T00:00:00.000Z`)
back to local date strings. When formatting dates for display (e.g. in the list table or
edit form), use local date parsing:

```ts
function formatLocalDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR'); // or use toISOString().split('T')[0] for input value
}

function toInputDate(isoString: string): string {
  // Convert ISO string to YYYY-MM-DD in local timezone for date input value
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

Use `toInputDate()` when setting the default value of the date input in edit mode.
Use `formatLocalDate()` when displaying dates in the list table.

---

## 5. Fix redirect after creating/editing a service order

**File:** `apps/web/app/(protected)/service-orders/_components/ServiceOrderForm.tsx`

After a successful `createServiceOrder` call, the form should redirect to `/service-orders`.
Find the submit handler and ensure it calls `router.push('/service-orders')` on success:

```ts
const result = await createServiceOrder(dto);
if (result.success) {
  router.push('/service-orders');
  router.refresh();
} else {
  setError(result.message);
}
```

**File:** `apps/web/app/(protected)/service-orders/[id]/edit/view/ServiceOrderEditClient.tsx`

After a successful update (save button), redirect to `/service-orders`:

```ts
const result = await updateServiceOrder(order.id, dto);
if (result.success) {
  router.push('/service-orders');
  router.refresh();
} else {
  setError(result.message);
}
```

> Note: for the edit page, it may make more sense to stay on the page after saving (since
> operators often make multiple edits). Check how the current behavior feels — if the save
> button currently does nothing visible on success, at minimum add a success toast or
> visual confirmation. Only redirect if there is no other feedback mechanism.

---

## 6. Verify

```bash
npm run -w apps/web build
npm run lint:web
```

Fix any errors before finishing.