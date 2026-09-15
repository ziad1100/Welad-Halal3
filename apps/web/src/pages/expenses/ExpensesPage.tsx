import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expensesApi } from '../../services/api/erp.api';

export function ExpensesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [cat, setCat] = useState('');
  const [amount, setAmount] = useState(0);
  const load = () => expensesApi.list().then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);
  async function add() {
    if (!cat.trim() || amount <= 0) return;
    await expensesApi.create({ category: cat.trim(), amount });
    setCat(''); setAmount(0); load();
  }
  return (
    <div style={{ padding: 8 }}>
      <h3>{t('common.expTitle')}</h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <input placeholder={t('common.item')} value={cat} onChange={(e) => setCat(e.target.value)} />
        <input type="number" placeholder={t('common.amount')} value={amount} onChange={(e) => setAmount(Number(e.target.value))} style={{ width: 110 }} />
        <button className="wh-btn wh-btn-primary" onClick={add}>{t('common.addExpense')}</button>
      </div>
      <div className="table-scroll">
      <table className="wh-table">
        <thead><tr><th>{t('common.item')}</th><th>{t('common.amount')}</th><th>{t('common.note')}</th><th>{t('common.date')}</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ background: 'var(--wh-row)' }}>
              <td>{r.category}</td><td>{Number(r.amount).toFixed(2)}</td><td>{r.note ?? ''}</td>
              <td>{new Date(r.createdAt).toLocaleString('ar-EG')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
