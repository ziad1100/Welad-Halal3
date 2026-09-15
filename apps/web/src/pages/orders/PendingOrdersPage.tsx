import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { listOrders, resumeOrder } from '../../services/api/orders.api';
import { useCart } from '../../store/cartStore';

export function PendingOrdersPage() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const clear = useCart((s) => s.clear);
  const addLine = useCart((s) => s.addLine);
  const [orders, setOrders] = useState<any[]>([]);
  const load = () => listOrders('held').then(setOrders).catch(() => {});
  useEffect(() => { load(); }, []);
  const locale = i18n.language === 'en' ? 'en-US' : 'ar-EG';

  async function restore(id: string) {
    const held = await resumeOrder(id);
    clear();
    for (const it of held.items ?? []) {
      addLine({
        productId: it.productId,
        unitId: it.unitId ?? null,
        name: it.productName,
        unitName: it.unitName ?? t('common.unit'),
        price: Number(it.unitPrice),
        qty: Number(it.qty),
      });
    }
    nav('/cashier');
  }

  return (
    <div style={{ padding: 8 }}>
      <h3>{t('common.pendingTitle')}</h3>
      {!orders.length && <div style={{ color: 'var(--text-secondary)' }}>{t('orders.pendingEmpty', { defaultValue: 'No held orders.' })}</div>}
      <div className="table-scroll">
      <table className="wh-table">
        <thead><tr><th>{t('common.orderNumber')}</th><th>{t('common.total')}</th><th>{t('common.date')}</th><th></th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} style={{ background: 'var(--wh-row)' }}>
              <td>{o.reference}</td><td>{Number(o.total).toFixed(2)}</td>
              <td>{new Date(o.createdAt).toLocaleString(locale)}</td>
              <td><button className="wh-btn wh-btn-primary" onClick={() => restore(o.id)}>{t('pos.restore')}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
