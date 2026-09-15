import { useEffect, useState } from 'react';
import { employeesApi, usersApi, shiftsApi } from '../../services/api/erp.api';
import { useTranslation } from 'react-i18next';

export function HRPage() {
  const { t } = useTranslation();
  const [emps, setEmps] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [userId, setUserId] = useState('');
  const [openCash, setOpenCash] = useState(0);
  const load = () => {
    employeesApi.list().then(setEmps).catch(() => {});
    usersApi.list().then(setUsers).catch(() => {});
    shiftsApi.list().then(setShifts).catch(() => {});
  };
  useEffect(load, []);
  return (
    <div style={{ padding: 8 }}>
      <h3>{t('hr.title')}</h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <select value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">{t('hr.user')}...</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
        </select>
        <button className="wh-btn wh-btn-primary" onClick={async () => { if (userId) { await employeesApi.create({ userId }); setUserId(''); load(); } }}>{t('hr.link')}</button>
        <input type="number" value={openCash} onChange={(e) => setOpenCash(Number(e.target.value))} style={{ width: 110 }} placeholder={t('common.custody')} />
        <button className="wh-btn wh-btn-primary" onClick={async () => { await shiftsApi.open(openCash); load(); }}>{t('hr.openShift')}</button>
      </div>
      <h4>{t('hr.employees')}</h4>
      <table className="wh-table">
        <thead><tr><th>{t('hr.user')}</th><th>{t('hr.job')}</th><th>{t('hr.phone')}</th></tr></thead>
        <tbody>{emps.map((e) => <tr key={e.id} style={{ background: 'var(--wh-row)' }}><td>{e.user?.username}</td><td>{e.position ?? ''}</td><td>{e.phone ?? ''}</td></tr>)}</tbody>
      </table>
      <h4>{t('hr.shifts')}</h4>
      <table className="wh-table">
        <thead><tr><th>{t('hr.employee')}</th><th>{t('hr.status')}</th><th>{t('hr.opening')}</th><th>{t('hr.closing')}</th><th>{t('hr.expected')}</th><th>{t('hr.diff')}</th><th></th></tr></thead>
        <tbody>
          {shifts.map((s) => {
            const diff = Number(s.discrepancyAmount ?? (s.closingCash != null && s.expectedCash != null ? s.closingCash - s.expectedCash : 0));
            const over = s.status === 'closed' && Math.abs(diff) > 20;
            return (
              <tr key={s.id}>
                <td>{s.employee?.user?.username}</td>
                <td>{s.status === 'open' ? t('common.open') : t('common.closed')}</td><td>{s.openingCash}</td>
                <td>{s.closingCash ?? '—'}</td><td>{s.expectedCash ?? '—'}</td>
                <td style={{ color: over ? 'var(--danger-color)' : 'var(--text-primary)', fontWeight: over ? 'bold' : 'normal' }}>{s.status === 'closed' ? diff.toFixed(2) : '—'}</td>
                <td>{s.status === 'open' && <button className="wh-btn" onClick={async () => { const v = prompt(t('common.actualCash'), '0'); if (v !== null) { await shiftsApi.close(s.id, Number(v)); load(); } }}>{t('common.closeShift')}</button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
