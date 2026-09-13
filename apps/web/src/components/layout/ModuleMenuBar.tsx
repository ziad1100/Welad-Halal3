import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/authStore';
import { applyDir } from '../../lib/i18n';

const ITEMS: { to: string; ar: string; minLevel: number }[] = [
  { to: '/orders', ar: 'المبيعات', minLevel: 50 },
  { to: '/suppliers', ar: 'الموردين والعملاء', minLevel: 50 },
  { to: '/inventory', ar: 'مخزن', minLevel: 50 },
  { to: '/manufacturing', ar: 'تصنيع', minLevel: 50 },
  { to: '/purchases', ar: 'المشتريات', minLevel: 50 },
  { to: '/expenses', ar: 'مصروفات', minLevel: 10 },
  { to: '/reports', ar: 'تقارير العمل', minLevel: 50 },
  { to: '/hr', ar: 'شئون العاملين', minLevel: 50 },
  { to: '/cashier', ar: 'أدوات العمل', minLevel: 10 },
  { to: '/admin', ar: 'الإدارة', minLevel: 50 },
];

export function ModuleMenuBar() {
  const { user, logout } = useAuth();
  const { i18n } = useTranslation();
  const [help, setHelp] = useState(false);
  const level = user?.permissionLevel ?? 10;
  function lang(l: string) {
    i18n.changeLanguage(l);
    applyDir(l);
  }
  return (
    <nav className="wh-menubar">
      <button className="wh-btn" onClick={() => setHelp(true)}>مساعدة</button>
      {ITEMS.filter((i) => level >= i.minLevel).map((i) => (
        <Link key={i.to} to={i.to}>{i.ar}</Link>
      ))}
      <span style={{ flex: 1 }} />
      <button className="wh-btn" onClick={() => lang('ar')}>عربي</button>
      <button className="wh-btn" onClick={() => lang('en')}>EN</button>
      <span>{user?.username}</span>
      <button className="wh-btn" onClick={logout}>خروج</button>
      {help && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60, display: 'grid', placeItems: 'center' }}>
          <div className="wh-modal" style={{ width: 380 }}>
            <div className="wh-modal-title">
              <strong>مساعدة — اختصارات</strong>
              <button className="wh-btn" onClick={() => setHelp(false)}>X</button>
            </div>
            <div>F2 — اختيار عميل<br />F4 — التركيز على البحث<br />F9 — تعليق الفاتورة<br />F12 — تأكيد الطلب</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button className="wh-btn" onClick={() => setHelp(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
