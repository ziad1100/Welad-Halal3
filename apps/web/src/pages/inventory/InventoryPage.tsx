import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { inventoryApi } from '../../services/api/erp.api';
import { NewProductModal } from '../../components/cashier/NewProductModal';

export function InventoryPage() {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [moves, setMoves] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const load = () => {
    inventoryApi.live().then(setRows).catch(() => {});
    inventoryApi.movements().then(setMoves).catch(() => {});
  };
  useEffect(load, []);
  const locale = i18n.language === 'en' ? 'en-US' : 'ar-EG';
  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3>{t('common.invTitle')}</h3>
        <button className="wh-btn wh-btn-primary" onClick={() => setShowNew(true)}>{t('common.addItem')}</button>
        <button className="wh-btn" onClick={() => window.print()}>{t('common.printReport')}</button>
      </div>
      <div className="printable-content">
      <div className="table-scroll">
      <table className="wh-table">
        <thead><tr><th>{t('common.liveStock')}</th><th>{t('common.quantity')}</th><th>{t('common.avgCost')}</th><th>{t('common.value')}</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ background: 'var(--wh-row)' }}>
              <td>{r.product?.name}</td><td>{r.quantity}</td><td>{Number(r.avgCost).toFixed(2)}</td>
              <td>{(r.quantity * r.avgCost).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <h3>{t('common.movements')}</h3>
      <div className="table-scroll">
      <table className="wh-table">
        <thead><tr><th>{t('common.moveType')}</th><th>{t('common.change')}</th><th>{t('common.date')}</th></tr></thead>
        <tbody>
          {moves.map((m) => (
            <tr key={m.id}><td>{m.type}</td><td>{m.qtyDelta}</td><td>{new Date(m.createdAt).toLocaleString(locale)}</td></tr>
          ))}
        </tbody>
      </table>
      </div>
      </div>
      {showNew && <NewProductModal prefillBarcode={undefined} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
    </div>
  );
}
