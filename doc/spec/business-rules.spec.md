# Business Rules Spec — My Online Ordering System
> Defines calculation rules and format standards that AI must apply consistently.
> When implementing order creation or any financial calculation, READ THIS FIRST.

---

## Order Number Format

**Pattern**: `ORD-{YYYYMMDD}-{4-digit-sequence}`  
**Example**: `ORD-20260504-0001`

- Date part: UTC date at the time of order creation
- Sequence: daily counter, resets to `0001` each day, zero-padded to 4 digits
- Sequence is stored in Redis: key = `order:seq:{YYYYMMDD}`, use `INCR` (atomic)
- If Redis key does not exist, Redis auto-initializes to 0 before INCR → result is 1

```typescript
// Canonical implementation — order-service/src/handlers/create.ts
async function generateOrderNumber(storeId: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // "20260504"
  const seqKey = `order:seq:${today}`;
  const seq = await redis.incr(seqKey);
  if (seq === 1) await redis.expireAt(seqKey, getEndOfDayTimestamp()); // expire at midnight UTC
  return `ORD-${today}-${String(seq).padStart(4, '0')}`;
}

function getEndOfDayTimestamp(): number {
  const now = new Date();
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.floor(endOfDay.getTime() / 1000);
}
```

---

## Tax Calculation

**Tax rate**: Read from env var `TAX_RATE` (decimal string, e.g. `"0.05"` = 5%).  
**Default**: `0.05` (5%) if env var is absent.  
**Rounding**: `Math.round()` — round half up to nearest cent.

```typescript
// config.ts — add to config object
tax: {
  rate: parseFloat(process.env.TAX_RATE ?? '0.05'),
},
```

```typescript
// Canonical calculation in order-create handler
const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0); // cents, integer
const discount = body.discount ?? 0;                                   // cents, integer
const taxableAmount = subtotal - discount;                             // cents, integer
const tax = Math.round(taxableAmount * config.tax.rate);               // cents, integer
const total = taxableAmount + tax;                                     // cents, integer
```

**Rules**:
- Tax is calculated on `subtotal - discount` (discount reduces taxable base)
- `subtotal`, `tax`, `discount`, `total` are ALL stored as **integer cents**
- Never apply tax to a negative base — if `taxableAmount < 0`, set both `tax` and `total` to `0`

---

## `costAtOrder` Snapshot

`OrderItem.costAtOrder` is the COGS (cost of goods sold) at the time of order creation.

- Source: `inventory_items.costPerUnit` (cents) for the ingredient linked via recipe
- If the menu item has **no recipe** (i.e. not tracked in inventory): `costAtOrder = 0`
- For `COMBO_PARENT` items: `costAtOrder = 0` (cost is on the children)
- For `COMBO_CHILD` items: look up `costPerUnit` from each child's inventory recipe

**Simple lookup pattern**:
```typescript
// If no recipe exists for the menuItemId, default to 0
const recipe = await getRecipeForMenuItem(menuItemId); // null if none
const costAtOrder = recipe ? Math.round(recipe.totalCostCents) : 0;
```

---

## Price Snapshot (`priceAtOrder`)

`OrderItem.priceAtOrder` = `menuItem.price` + sum of all selected `customizationOption.priceDelta` values at order time.

```typescript
const priceAtOrder = unitPrice + selectedOptions.reduce((sum, opt) => sum + opt.priceDelta, 0);
```

This is snapshotted — **never recalculate from current menu prices after order creation**.
