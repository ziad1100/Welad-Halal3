import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './lib/i18n';
import { LoginPage } from './pages/login/LoginPage';
import { CashierPage } from './pages/cashier/CashierPage';
import { OrdersLogPage } from './pages/orders/OrdersLogPage';
import { PendingOrdersPage } from './pages/orders/PendingOrdersPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { PurchasesPage } from './pages/purchases/PurchasesPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { ManufacturingPage } from './pages/manufacturing/ManufacturingPage';
import { ExpensesPage } from './pages/expenses/ExpensesPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { HRPage } from './pages/hr/HRPage';
import { AdminPage } from './pages/admin/AdminPage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { TopMenuBar, HeaderBar, Toolbar } from './components/layout/chrome';
import { useAuth } from './store/authStore';

const MENU_ROUTES: Record<string, string> = {
  file: '/cashier',
  sales: '/orders',
  purchases: '/purchases',
  suppliers: '/suppliers',
  manufacturing: '/manufacturing',
  warehouse: '/inventory',
  stocktake: '/inventory',
  workReports: '/reports',
  staff: '/hr',
  tools: '/expenses',
  admin: '/admin',
};

function Shell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const logout = useAuth((s) => s.logout);
  const [help, setHelp] = useState(false);
  function menuNav(m: string) {
    if (m === 'help') { setHelp(true); return; }
    nav(MENU_ROUTES[m] ?? '/cashier');
  }
  function doLogout() { logout(); nav('/login'); }
  return (
    <div className="layout">
      <TopMenuBar onNav={menuNav} />
      <Toolbar
        onRefresh={() => location.reload()}
        onPrint={() => window.print()}
        onUsers={() => nav('/admin')}
        onLock={doLogout}
        onLogout={doLogout}
      />
      <HeaderBar />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
      <div className="wh-statusbar"><span>اضغط لمعلومات</span><span>ولاد حلال - برنامج إدارة الطلبات</span></div>
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
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cashier" element={<ProtectedRoute minLevel={10}><Shell><CashierPage /></Shell></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute minLevel={50}><Shell><OrdersLogPage /></Shell></ProtectedRoute>} />
        <Route path="/pending" element={<ProtectedRoute minLevel={10}><Shell><PendingOrdersPage /></Shell></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute minLevel={50}><Shell><InventoryPage /></Shell></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute minLevel={50}><Shell><PurchasesPage /></Shell></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute minLevel={50}><Shell><SuppliersPage /></Shell></ProtectedRoute>} />
        <Route path="/manufacturing" element={<ProtectedRoute minLevel={50}><Shell><ManufacturingPage /></Shell></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute minLevel={10}><Shell><ExpensesPage /></Shell></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute minLevel={50}><Shell><ReportsPage /></Shell></ProtectedRoute>} />
        <Route path="/hr" element={<ProtectedRoute minLevel={50}><Shell><HRPage /></Shell></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute minLevel={50}><Shell><AdminPage /></Shell></ProtectedRoute>} />
        <Route path="/change-password" element={<div style={{ padding: 16 }}>يرجى تغيير كلمة المرور (شاشة قريباً)</div>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
