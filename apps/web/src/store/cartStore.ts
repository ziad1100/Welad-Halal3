import { create } from 'zustand';

export interface CartLine {
  key: string;
  productId: string;
  unitId?: string | null;
  name: string;
  unitName: string;
  category?: string;
  addedAt?: number;
  price: number;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  customerId?: string | null;
  orderType: 'pickup' | 'delivery';
  addLine: (l: Omit<CartLine, 'key'>) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setCustomer: (id: string | null) => void;
  setOrderType: (t: 'pickup' | 'delivery') => void;
  subtotal: () => number;
  count: () => number;
}

const key = (p: string, u?: string | null) => `${p}::${u ?? 'base'}`;

export const useCart = create<CartState>()((set, get) => ({
  lines: [],
  customerId: null,
  orderType: 'pickup',
  addLine: (l) =>
    set((s) => {
      const k = key(l.productId, l.unitId);
      const ex = s.lines.find((x) => x.key === k);
      if (ex) return { lines: s.lines.map((x) => (x.key === k ? { ...x, qty: x.qty + l.qty } : x)) };
      return { lines: [...s.lines, { ...l, key: k }] };
    }),
  setQty: (k, qty) => set((s) => ({ lines: qty <= 0 ? s.lines.filter((x) => x.key !== k) : s.lines.map((x) => (x.key === k ? { ...x, qty } : x)) })),
  remove: (k) => set((s) => ({ lines: s.lines.filter((x) => x.key !== k) })),
  clear: () => set({ lines: [] }),
  setCustomer: (customerId) => set({ customerId }),
  setOrderType: (orderType) => set({ orderType }),
  subtotal: () => get().lines.reduce((a, l) => a + l.price * l.qty, 0),
  count: () => get().lines.reduce((a, l) => a + l.qty, 0),
}));
