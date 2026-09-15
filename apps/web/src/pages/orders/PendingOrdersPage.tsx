import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listOrders } from '../../services/api/orders.api';

export function PendingOrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => { listOrders('held').then(setOrders).catch(() => {}); }, []);
  return (
    <div style={{ padding: 8 }}>
      <h3>{t('common.pendingTitle')}</h3>
      <table className="wh-table">
        <thead><tr><th>{t('common.orderNumber')}</th><th>{t('common.total')}</th><th>{t('common.date')}</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} style={{ background: 'var(--wh-row)' }}>
              <td>{o.reference}</td><td>{Number(o.total).toFixed(2)}</td>
              <td>{new Date(o.createdAt).toLocaleString('ar-EG')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
