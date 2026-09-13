import { useState } from 'react';

export const ORDER_COLUMNS = [
  'رقم الطلب',
  'نوع الطلب',
  'توقيت الإنشاء',
  'أنشئ بواسطة',
  'توقيت الإغلاق',
  'العميل',
  'مندوب التوصيل',
  'وقت الخروج',
  'لمحة',
  'عدد الأصناف',
  'الكمية',
  'القيمة الإجمالية',
  'الحالة',
] as const;

function glance(o: any): string {
  const items = o.items ?? [];
  return items.slice(0, 2).map((it: any) => it.productName).join('، ');
}
function fmtDT(v: any): string {
  if (!v) return '';
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, '0');
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(h)}:${p(d.getMinutes())}${ap}`;
}

// Dense 13-column orders table: pink rows, blue selected row, 1px grid cells.
export function OrdersTable({ orders, showResume, onSelect, onResume }: {
  orders: any[];
  showResume?: boolean;
  onSelect?: (o: any) => void;
  onResume?: (o: any) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div style={{ overflow: 'auto' }}>
      <table className="wh-table">
        <thead>
          <tr>
            {ORDER_COLUMNS.map((c) => <th key={c}>{c}</th>)}
            {showResume && <th></th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const selected = sel === o.id;
            const itemCount = (o.items ?? []).length;
            const qty = (o.items ?? []).reduce((a: number, it: any) => a + Number(it.qty ?? 0), 0);
            return (
              <tr
                key={o.id}
                onClick={() => { setSel(o.id); onSelect?.(o); }}
                className={selected ? 'wh-selected' : 'wh-pink'}
                style={{ cursor: 'pointer' }}
              >
                <td>{o.reference}</td>
                <td>{o.type === 'delivery' ? 'توصيل' : 'استلام'}</td>
                <td>{fmtDT(o.createdAt)}</td>
                <td>{o.user?.username ?? o.user?.fullName ?? ''}</td>
                <td>{o.status === 'confirmed' ? fmtDT(o.updatedAt ?? o.createdAt) : ''}</td>
                <td>{o.customer?.name ?? 'عميل نقدي'}</td>
                <td>{o.deliveryRep ?? ''}</td>
                <td>{o.exitTime ? fmtDT(o.exitTime) : ''}</td>
                <td>{glance(o)}</td>
                <td>{itemCount}</td>
                <td>{qty}</td>
                <td>{Number(o.total ?? 0).toFixed(2)}</td>
                <td>{o.status === 'held' ? 'معلقة' : o.status === 'confirmed' ? 'استلام' : o.status}</td>
                {showResume && (
                  <td>
                    <button
                      className="wh-btn"
                      onClick={(e) => { e.stopPropagation(); onResume?.(o); }}
                    >
                      استئناف
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
