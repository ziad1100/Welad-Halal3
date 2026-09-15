import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { purchasesApi, partiesApi } from '../../services/api/erp.api';
import { searchProducts } from '../../services/api/products.api';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

export function PurchasesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supId, setSupId] = useState('');
  const [prodId, setProdId] = useState('');
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState(0);
  const load = () => {
    purchasesApi.list().then(setRows).catch(() => {});
    partiesApi.list('supplier').then(setSuppliers).catch(() => {});
    searchProducts('').then(setProducts).catch(() => {});
  };
  useEffect(load, []);
  async function create() {
    if (!supId || !prodId || qty <= 0) return;
    await purchasesApi.create({ supplierId: supId, items: [{ productId: prodId, qty, unitCost: cost }] });
    load();
  }
  async function receive(id: string) {
    await purchasesApi.receive(id);
    load();
  }
  return (
    <div style={{ padding: 8 }}>
      <h3>{t('purchases.title')}</h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <SearchableSelect options={suppliers.map((s) => ({ value: s.id, label: s.name }))} value={supId} onChange={setSupId} placeholder={`${t('common.supplier')}...`} />
        <SearchableSelect options={products.map((p) => ({ value: p.id, label: p.name }))} value={prodId} onChange={setProdId} placeholder={`${t('common.item')}...`} />
        <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 80 }} placeholder={t('common.quantity')} />
        <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} style={{ width: 90 }} placeholder={t('common.cost')} />
        <button className="wh-btn wh-btn-primary" onClick={create}>{t('purchases.create')}</button>
      </div>
      <table className="wh-table">
        <thead><tr><th>{t('common.supplier')}</th><th>{t('common.total')}</th><th>{t('purchases.received')}</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ background: 'var(--wh-row)' }}>
              <td>{r.supplier?.name}</td><td>{Number(r.total).toFixed(2)}</td><td>{r.isReceived ? t('common.yes') : t('common.no')}</td>
              <td>{!r.isReceived && <button className="wh-btn" onClick={() => receive(r.id)}>{t('common.receive')}</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
