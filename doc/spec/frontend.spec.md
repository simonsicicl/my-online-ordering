# Frontend Spec — My Online Ordering System
> Defines patterns for all 5 React + Vite apps. All generated frontend code MUST follow these patterns.

---

## Apps Overview

| App | Path | Type | Primary Users |
|-----|------|------|---------------|
| `user-client` | `frontend/user-client` | PWA (React + Vite) | End customers |
| `merchant-dashboard` | `frontend/merchant-dashboard` | Web App | Merchants, Managers |
| `kiosk` | `frontend/kiosk` | Electron + React | In-store self-order |
| `pos` | `frontend/pos` | Electron + React | Cashiers |
| `kds` | `frontend/kds` | Web App | Kitchen staff |

---

## State Management

**Library**: Redux Toolkit (`@reduxjs/toolkit`) + RTK Query for API calls.

- Use **RTK Query** for all server state (fetching, caching, mutations).
- Use **Redux slices** for client-only UI state (e.g. cart, selected store, active order).
- Do NOT use `useState` for data that needs to persist across routes or components.

### Slice Template

```typescript
// src/store/cartSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem } from '@myordering/shared-types';

interface CartState {
  items: CartItem[];
  storeId: string | null;
}

const initialState: CartState = { items: [], storeId: null };

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      state.items.push(action.payload);
    },
    clearCart(state) {
      state.items = [];
      state.storeId = null;
    },
  },
});

export const { addItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
```

### RTK Query API Slice Template

```typescript
// src/services/menuApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { StoreMenu, MenuItem } from '@myordering/shared-types';
import { getAccessToken } from '../lib/auth';

export const menuApi = createApi({
  reducerPath: 'menuApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const token = await getAccessToken(); // returns null for public endpoints
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Menu'],
  endpoints: (builder) => ({
    getMenu: builder.query<StoreMenu, string>({
      query: (storeId) => `/api/v1/menu/${storeId}`,
      transformResponse: (res: { data: StoreMenu }) => res.data,
      providesTags: (_, __, storeId) => [{ type: 'Menu', id: storeId }],
    }),
    createMenuItem: builder.mutation<MenuItem, Partial<MenuItem>>({
      query: (body) => ({ url: '/api/v1/menu/items', method: 'POST', body }),
      transformResponse: (res: { data: MenuItem }) => res.data,
      invalidatesTags: (_, __, { storeId }) => [{ type: 'Menu', id: storeId }],
    }),
  }),
});

export const { useGetMenuQuery, useCreateMenuItemMutation } = menuApi;
```

---

## Auth (AWS Cognito)

**Library**: `amazon-cognito-identity-js` or `aws-amplify/auth` (Auth module only — do NOT import full Amplify).

### `src/lib/auth.ts` Pattern

```typescript
import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserSession } from 'amazon-cognito-identity-js';

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId:   import.meta.env.VITE_COGNITO_CLIENT_ID,
});

// Returns current valid access token, refreshing automatically if expired
export async function getAccessToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve(session.getAccessToken().getJwtToken());
    });
  });
}

export async function signIn(email: string, password: string): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    user.authenticateUser(authDetails, {
      onSuccess: resolve,
      onFailure: reject,
    });
  });
}

export function signOut(): void {
  userPool.getCurrentUser()?.signOut();
}
```

### Token refresh
Cognito SDK handles token refresh automatically inside `getSession()`. Do NOT implement manual refresh logic. Token expiry = 1 hour (access token), 30 days (refresh token).

---

## Environment Variables

All frontend env vars MUST use `VITE_` prefix. Read via `import.meta.env.VITE_*`.

| Variable | Example Value |
|----------|--------------|
| `VITE_API_BASE_URL` | `https://api.myonlineordering.com` |
| `VITE_COGNITO_USER_POOL_ID` | `us-east-1_XXXXXXXXX` |
| `VITE_COGNITO_CLIENT_ID` | `xxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `VITE_COGNITO_REGION` | `us-east-1` |
| `VITE_WS_URL` | `wss://ws.myonlineordering.com` |

Never use `process.env` in frontend code — Vite does not support it.

---

## Folder Structure (per app)

```
src/
  pages/          # Route-level components (one file per route)
  components/     # Reusable UI components
  store/          # Redux store setup + slices
  services/       # RTK Query API slices (one file per domain: menuApi.ts, orderApi.ts…)
  hooks/          # Custom React hooks (useCart, useAuth, useWebSocket…)
  lib/            # auth.ts · ws.ts · utils.ts
  types/          # App-local types only (extend @myordering/shared-types, never redefine)
```

---

## API Response Handling

All API responses follow the envelope: `{ success, data, timestamp }`.  
RTK Query `transformResponse` MUST unwrap `res.data` before returning:

```typescript
// ✅ Correct
transformResponse: (res: { data: Order }) => res.data,

// ❌ Wrong — components would need to access .data.data
transformResponse: (res) => res,
```

Error handling is automatic via RTK Query's `isError` / `error` flags. For mutations, handle in the component:

```typescript
const [createOrder, { isLoading, error }] = useCreateOrderMutation();

const handleSubmit = async () => {
  try {
    await createOrder(payload).unwrap(); // .unwrap() throws on error
  } catch (err) {
    // err.data.error.message from API envelope
    console.error(JSON.stringify({ level: 'error', message: 'Order failed', err }));
  }
};
```

---

## WebSocket (Notification Service)

Used in: `kds` (live order updates), `pos` (payment confirmation), `merchant-dashboard` (order alerts).

```typescript
// src/lib/ws.ts
export function createWebSocket(userId: string, token: string): WebSocket {
  const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}?userId=${userId}&token=${token}`);
  ws.onopen    = () => console.log(JSON.stringify({ level: 'info', message: 'WS connected' }));
  ws.onclose   = () => console.log(JSON.stringify({ level: 'info', message: 'WS disconnected' }));
  ws.onerror   = (e) => console.error(JSON.stringify({ level: 'error', message: 'WS error', e }));
  return ws;
}
```

Use a `useWebSocket` custom hook to manage lifecycle (connect on mount, disconnect on unmount, reconnect on close).

---

## Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Page components | `PascalCase` | `OrderDetailPage.tsx` |
| Reusable components | `PascalCase` | `MenuItemCard.tsx` |
| Hooks | `camelCase` with `use` prefix | `useCart.ts` |
| Redux slices | `camelCase` + `Slice` suffix | `cartSlice.ts` |
| RTK Query APIs | `camelCase` + `Api` suffix | `menuApi.ts` |
| Route paths | `kebab-case` | `/order-history` |

---

## What NOT to Do in Frontend

- ❌ `any` type — use types from `@myordering/shared-types`
- ❌ `process.env` — use `import.meta.env.VITE_*`
- ❌ Axios directly — use RTK Query (only exception: file uploads)
- ❌ `localStorage` for tokens — Cognito SDK manages token storage internally
- ❌ Manual JWT decode — use Cognito SDK's `getSession()`
- ❌ Redefining API response types locally — import from `@myordering/shared-types`
- ❌ Inline styles — use Tailwind CSS utility classes
