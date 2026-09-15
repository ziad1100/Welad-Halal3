import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

// Legacy flat keys kept for LoginPage compat
const legacyAr = {
  username: 'اسم المستخدم',
  password: 'كلمة المرور',
  login: 'دخول',
  cashier: 'الكاشير',
  orders: 'الطلبات',
  pending: 'المعلقة',
  confirm: 'تأكيد (F12)',
  hold: 'تعليق الفاتورة (F9)',
  total: 'الإجمالي',
  search: 'بحث',
};
const legacyEn = {
  username: 'Username',
  password: 'Password',
  login: 'Login',
  cashier: 'Cashier',
  orders: 'Orders',
  pending: 'Pending',
  confirm: 'Confirm (F12)',
  hold: 'Hold (F9)',
  total: 'Total',
  search: 'Search',
};

let initial = 'ar';
try {
  initial = localStorage.getItem('appLanguage') || 'ar';
} catch {
  /* ignore */
}

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: { ...(ar as any), ...legacyAr } },
    en: { translation: { ...(en as any), ...legacyEn } },
  },
  lng: initial,
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
});

export default i18n;
export function applyDir(lang: string) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
}
export function persistLanguage(lang: string) {
  try {
    localStorage.setItem('appLanguage', lang);
  } catch {
    /* ignore */
  }
}
