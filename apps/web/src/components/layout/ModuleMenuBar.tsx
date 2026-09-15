import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useAuth } from '../../store/authStore';
import { applyDir, persistLanguage } from '../../lib/i18n';
import { applyTheme, getTheme } from '../../lib/theme';

export function ModuleMenuBar() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState(() => getTheme());
  const level = user?.permissionLevel ?? 10;
  const isStaff = level >= 50;
  function lang(l: string) {
    void i18n.changeLanguage(l);
    applyDir(l);
    persistLanguage(l);
  }
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  }
  return (
    <nav className="app-toolbar wh-header" style={{ flexWrap: 'wrap' }}>
      <Link to="/cashier" style={{ color: 'var(--table-header-text)' }}>{t('nav.cashier')}</Link>
      {isStaff && <Link to="/orders" style={{ color: 'var(--table-header-text)' }}>{t('nav.orders')}</Link>}
      <Link to="/pending" style={{ color: 'var(--table-header-text)' }}>{t('nav.pending')}</Link>
      {isStaff && <Link to="/inventory" style={{ color: 'var(--table-header-text)' }}>{t('nav.inventory')}</Link>}
      {isStaff && <Link to="/purchases" style={{ color: 'var(--table-header-text)' }}>{t('nav.purchases')}</Link>}
      {isStaff && <Link to="/suppliers" style={{ color: 'var(--table-header-text)' }}>{t('nav.suppliers')}</Link>}
      {isStaff && <Link to="/manufacturing" style={{ color: 'var(--table-header-text)' }}>{t('nav.manufacturing')}</Link>}
      {isStaff && <Link to="/expenses" style={{ color: 'var(--table-header-text)' }}>{t('nav.expenses')}</Link>}
      {isStaff && <Link to="/reports" style={{ color: 'var(--table-header-text)' }}>{t('nav.reports')}</Link>}
      {isStaff && <Link to="/hr" style={{ color: 'var(--table-header-text)' }}>{t('nav.hr')}</Link>}
      {isStaff && <Link to="/admin" style={{ color: 'var(--table-header-text)' }}>{t('nav.admin')}</Link>}
      <Link to="/printing" style={{ color: 'var(--table-header-text)' }}>{t('nav.printing')}</Link>
      <Link to="/help" style={{ color: 'var(--table-header-text)' }}>{t('nav.help')}</Link>
      <span style={{ flex: 1 }} />
      <button className="wh-btn app-header-buttons" onClick={() => lang('ar')}>عربي</button>
      <button className="wh-btn app-header-buttons" onClick={() => lang('en')}>EN</button>
      <button className="wh-btn app-header-buttons" onClick={toggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>
      <span style={{ color: 'var(--table-header-text)' }}>{user?.username}</span>
      <button className="wh-btn app-header-buttons" onClick={logout}>{t('nav.logout')}</button>
    </nav>
  );
}
