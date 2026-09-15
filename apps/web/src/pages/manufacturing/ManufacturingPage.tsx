import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mfgApi } from '../../services/api/erp.api';
import { searchProducts } from '../../services/api/products.api';

export function ManufacturingPage() {
  const { t } = useTranslation();
  const [boms, setBoms] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [comp, setComp] = useState('');
  const [raw, setRaw] = useState('');
  const [need, setNeed] = useState(1);
  const [qty, setQty] = useState(1);
  const load = () => {
    mfgApi.boms().then(setBoms).catch(() => {});
    mfgApi.orders().then(setOrders).catch(() => {});
    searchProducts('').then(setProducts).catch(() => {});
  };
  useEffect(load, []);
  const opts = products.map((p) => ({ value: p.id, label: p.name }));
  return (
    <div style={{ padding: 8 }}>
      <h3>{t('common.bomTitle')}</h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <select value={comp} onChange={(e) => setComp(e.target.value)}><option value="">{t('manufacturing.finished')}</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select value={raw} onChange={(e) => setRaw(e.target.value)}><option value="">{t('manufacturing.raw')}</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <input type="number" value={need} onChange={(e) => setNeed(Number(e.target.value))} style={{ width: 80 }} />
        <button className="wh-btn wh-btn-primary" onClick={async () => { if (comp && raw) { await mfgApi.addBom({ compositeId: comp, rawId: raw, qtyNeeded: need }); load(); } }}>{t('common.addBom')}</button>
      </div>
      <table className="wh-table">
        <thead><tr><th>{t('common.product')}</th><th>{t('manufacturing.raw')}</th><th>{t('common.quantity')}</th></tr></thead>
        <tbody>{boms.map((b, i) => <tr key={i}><td>{b.composite?.name}</td><td>{b.raw?.name}</td><td>{b.qtyNeeded}</td></tr>)}</tbody>
      </table>
      <h3>{t('common.mfgOrders')}</h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <select value={comp} onChange={(e) => setComp(e.target.value)}><option value="">{t('common.product')}</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 80 }} />
        <button className="wh-btn wh-btn-primary" onClick={async () => { if (comp) { await mfgApi.create({ productId: comp, qty }); load(); } }}>{t('common.newMfgOrder')}</button>
      </div>
      <table className="wh-table">
        <thead><tr><th>{t('common.product')}</th><th>{t('common.quantity')}</th><th>{t('common.status')}</th><th></th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} style={{ background: 'var(--wh-row)' }}>
              <td>{o.product?.name}</td><td>{o.qty}</td><td>{o.status}</td>
              <td>{o.status !== 'done' && <button className="wh-btn" onClick={async () => { await mfgApi.complete(o.id); load(); }}>{t('common.complete')}</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
