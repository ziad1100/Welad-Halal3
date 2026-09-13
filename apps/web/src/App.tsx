import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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
import { ModuleMenuBar } from './components/layout/ModuleMenuBar';
import { BrandingHeader } from './components/layout/BrandingHeader';
import { SessionInfoBar } from './components/layout/SessionInfoBar';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <SessionInfoBar />
      <BrandingHeader />
      <ModuleMenuBar />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
      <div className="wh-statusbar"><span>اضغط لمعلومات</span><span>ولاد حلال - برنامج إدارة الطلبات</span></div>
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
