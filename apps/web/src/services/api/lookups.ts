import type { SSelectOption } from '../../components/shared/SearchableSelect';
import { partiesApi } from './erp.api';
import { searchProducts } from './products.api';
import { employeesApi } from './erp.api';
import { listCategories } from './products.api';

/** Backend-efficient option loaders (server search, small takes). */
export const lookupCustomers = (take = 20) =>
  async (q: string): Promise<SSelectOption[]> => {
    const rows = await partiesApi.list('customer');
    const needle = (q || '').trim();
    return (rows || [])
      .filter((c: any) => !needle || String(c.name ?? '').includes(needle) || String(c.phone ?? '').includes(needle))
      .slice(0, take)
      .map((c: any) => ({ value: c.id, label: c.name, hint: c.phone || '', data: c }));
  };

export const lookupProducts = (take = 20) =>
  async (q: string): Promise<SSelectOption[]> => {
    const rows = await searchProducts(q || '');
    return (rows || []).slice(0, take).map((p: any) => ({
      value: p.id, label: p.name,
      hint: [p.barcode, p.basePrice !== undefined ? `${Number(p.basePrice)} ج.م` : ''].filter(Boolean).join(' · '),
      data: p,
    }));
  };

export const lookupSuppliers = (take = 20) =>
  async (q: string): Promise<SSelectOption[]> => {
    const rows = await partiesApi.list('supplier');
    const needle = (q || '').trim();
    return (rows || [])
      .filter((s: any) => !needle || String(s.name ?? '').includes(needle))
      .slice(0, take)
      .map((s: any) => ({ value: s.id, label: s.name, hint: s.phone || '', data: s }));
  };

export const lookupReps = () =>
  async (q: string): Promise<SSelectOption[]> => {
    const rows = await employeesApi.list().catch(() => []);
    const needle = (q || '').trim().toLowerCase();
    return (rows || [])
      .filter((r: any) => !needle
        || String(r.user?.fullName ?? '').toLowerCase().includes(needle)
        || String(r.user?.username ?? '').toLowerCase().includes(needle))
      .map((r: any) => ({ value: r.userId || r.id, label: r.user?.fullName || r.user?.username || r.id, hint: r.user?.username || '', data: r }));
  };

/** Categories have no backend search (small list) — local filter over one fetch. */
export function lookupCategoriesLocal(cats: any[]) {
  return async (q: string): Promise<SSelectOption[]> => {
    const needle = (q || '').trim().toLowerCase();
    return (cats || [])
      .filter((c: any) => !needle
        || String(c.nameAr ?? '').toLowerCase().includes(needle)
        || String(c.name ?? '').toLowerCase().includes(needle))
      .map((c: any) => ({ value: c.id, label: c.nameAr || c.name, data: c }));
  };
}

export async function fetchCategories() {
  return listCategories();
}
