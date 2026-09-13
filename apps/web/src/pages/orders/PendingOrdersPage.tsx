import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cancelOrder, getOrder, listOrders } from '../../services/api/orders.api';
import { useCart } from '../../store/cartStore';
import { LegacyToolbar } from '../../components/layout/LegacyToolbar';
import { OrdersTable } from '../../components/orders/OrdersTable';

export function PendingOrdersPage() {
  const nav = useNavigate();
  const { addLine, clear, setCustomer } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  function load() {
    listOrders('held').then(setOrders).catch(() => {});
  }
  useEffect(load, []);

  async function resume(o: any) {
    setMsg('');
    try {
      const full = await getOrder(o.id);
      clear();
      if (full.customerId) setCustomer(full.customerId);
      (full.items ?? []).forEach((it: any) => {
        addLine({
          productId: it.productId,
          unitId: it.unitId ?? null,
          name: it.productName,
          unitName: it.unitName ?? 'قطاعي',
          category: '',
          addedAt: Date.now(),
          price: Number(it.unitPrice),
          qty: Number(it.qty),
        });
      });
      await cancelOrder(o.id);
      nav('/cashier');
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Resume failed');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <LegacyToolbar onAction={(k) => { if (k === 'refresh') load(); }} />
      <div className="wh-tabs" style={{ padding: '6px 8px 0' }}>
        <button className="wh-tab" onClick={() => nav('/orders')}>📅 سجل الطلبات</button>
        <button className="wh-tab wh-tab-active">🎧 الطلبات المعلقة</button>
      </div>
      <div style={{ padding: 8, overflow: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>الطلبات المعلقة (F9)</h3>
        {msg && <div style={{ marginBottom: 6 }}>{msg}</div>}
        <OrdersTable orders={orders} showResume onResume={(o) => void resume(o)} />
      </div>
    </div>
  );
}
