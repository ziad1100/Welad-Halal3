import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listOrders } from '../../services/api/orders.api';
import { LegacyToolbar } from '../../components/layout/LegacyToolbar';
import { OrdersTable } from '../../components/orders/OrdersTable';

export function OrdersLogPage() {
  const nav = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [ref, setRef] = useState('');
  const [type, setType] = useState('');
  const [rep, setRep] = useState('');
  const [customer, setCustomer] = useState('');
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => { listOrders().then(setOrders).catch(() => {}); }, []);
  useEffect(() => {
    document.title = 'برنامج إدارة الطلبات - الشاشة الرئيسية';
  }, []);

  const reps = useMemo(() => {
    const s = new Set<string>();
    orders.forEach((o) => { if (o.deliveryRep) s.add(o.deliveryRep); });
    return [...s];
  }, [orders]);

  const filtered = orders.filter((o) => {
    if (ref.trim() && !String(o.reference).includes(ref.trim())) return false;
    if (type && o.type !== type) return false;
    if (rep && o.deliveryRep !== rep) return false;
    if (customer.trim() && !String(o.customer?.name ?? '').includes(customer.trim())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <LegacyToolbar onAction={(k) => { if (k === 'refresh') listOrders().then(setOrders).catch(() => {}); }} />
      <div className="wh-tabs" style={{ padding: '6px 8px 0' }}>
        <button className="wh-tab wh-tab-active">📅 سجل الطلبات</button>
        <button className="wh-tab" onClick={() => nav('/pending')}>🎧 الطلبات المعلقة</button>
      </div>
      <div className="wh-filterbar">
        <label>رقم الطلب</label>
        <input value={ref} onChange={(e) => setRef(e.target.value)} className="wh-ref-pill" style={{ width: 120 }} placeholder="رقم الطلب" />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">كل أنواع الطلب ▾</option>
          <option value="pickup">استلام</option>
          <option value="delivery">توصيل</option>
        </select>
        <select value={rep} onChange={(e) => setRep(e.target.value)}>
          <option value="">كل مندوبي التوصيل ▾</option>
          {reps.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <span>بحث بالعميل</span>
        <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="اسم العميل" style={{ width: 140 }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 8 }}>
        <OrdersTable orders={filtered} initialReference="147" onSelect={setSelected} />
        {selected && (
          <div className="wh-modal" style={{ marginTop: 8 }}>
            <div className="wh-modal-title">
              <strong>طلب #{selected.reference}</strong>
              <button className="wh-btn" onClick={() => setSelected(null)}>X</button>
            </div>
            <div>النوع: {selected.type === 'delivery' ? 'توصيل' : 'استلام'} | الإجمالي: {Number(selected.total).toFixed(2)} | العميل: {selected.customer?.name ?? 'عميل نقدي'}</div>
            <table className="wh-table" style={{ marginTop: 6 }}>
              <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الكلي</th></tr></thead>
              <tbody>
                {(selected.items ?? []).map((it: any) => (
                  <tr key={it.id} className="wh-pink">
                    <td>{it.productName}</td><td>{it.qty}</td>
                    <td>{Number(it.unitPrice).toFixed(2)}</td><td>{Number(it.lineTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
