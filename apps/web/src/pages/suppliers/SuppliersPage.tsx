import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { partiesApi } from '../../services/api/erp.api';

export function SuppliersPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('both');
  const [filter, setFilter] = useState('');
  const load = () => partiesApi.list(filter).then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => { const t2 = setTimeout(load, 250); return () => clearTimeout(t2); });
  async function add() {
    if (!name.trim()) return;
    await partiesApi.create({ name: name.trim(), type });
    setName('');
    load();
  }
  return (
    <div style={{ padding: 8 }}>
      <h3>{t('suppliers.title')}</h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">{t('common.all')}</option><option value="supplier">{t('common.supplier')}</option>
          <option value="customer">{t('common.customer')}</option><option value="both">{t('common.both')}</option>
        </select>
        <button className="wh-btn" onClick={load}>{t('common.update')}</button>
        <button className="wh-btn" onClick={() => window.print()}>{t('common.print')}</button>
        <input placeholder={t('common.newSupplierName')} value={name} onChange={(e) => setName(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="supplier">{t('common.supplier')}</option><option value="customer">{t('common.customer')}</option><option value="both">{t('common.both')}</option>
        </select>
        <button className="wh-btn wh-btn-primary" onClick={add}>{t('common.add')}</button>
      </div>
      <div className="printable-content">
      <table className="wh-table">
        <thead><tr><th>{t('common.name')}</th><th>{t('common.type')}</th><th>{t('common.phone')}</th><th>{t('common.points')}</th><th>{t('common.credit')}</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ background: 'var(--wh-row)' }}>
              <td>{r.name}</td><td>{r.type}</td><td>{r.phone ?? ''}</td><td>{r.loyaltyPoints}</td><td>{r.creditBalance}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
