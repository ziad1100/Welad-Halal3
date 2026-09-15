import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reportsApi } from '../../services/api/erp.api';

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const [daily, setDaily] = useState<any[]>([]);
  const [top, setTop] = useState<any[]>([]);
  const [inv, setInv] = useState<any>(null);
  const [exp, setExp] = useState<any>(null);
  useEffect(() => {
    reportsApi.daily().then(setDaily).catch(() => {});
    reportsApi.top().then(setTop).catch(() => {});
    reportsApi.invVal().then(setInv).catch(() => {});
    reportsApi.exp().then(setExp).catch(() => {});
  }, []);
  const locale = i18n.language === 'en' ? 'en-US' : 'ar-EG';
  void locale;
  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3>{t('reports.title')}</h3>
        <button className="wh-btn" onClick={() => window.print()}>{t('common.print')}</button>
      </div>
      <div className="printable-content">
      <h4>{t('common.dailySales')}</h4>
      <div className="table-scroll">
      <table className="wh-table">
        <thead><tr><th>{t('common.day')}</th><th>{t('common.count')}</th><th>{t('common.total')}</th></tr></thead>
        <tbody>{daily.map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.count}</td><td>{Number(d.total).toFixed(2)}</td></tr>)}</tbody>
      </table>
      </div>
      <h4>{t('common.topSelling')}</h4>
      <div className="table-scroll">
      <table className="wh-table">
        <thead><tr><th>{t('common.item')}</th><th>{t('common.quantity')}</th><th>{t('common.revenue')}</th></tr></thead>
        <tbody>{top.map((t2) => <tr key={t2.productId}><td>{t2.name}</td><td>{t2.qty}</td><td>{Number(t2.revenue).toFixed(2)}</td></tr>)}</tbody>
      </table>
      </div>
      <h4>{t('common.invValue')}: {inv ? `${Number(inv.totalValue).toFixed(2)} (${inv.lines} ${t('common.entries')})` : '...'}</h4>
      <h4>{t('common.exp30')}: {exp ? `${Number(exp.total).toFixed(2)} (${exp.count})` : '...'}</h4>
      </div>
    </div>
  );
}
