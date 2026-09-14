import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { barcodeLookup, listCategories, searchProducts } from '../../services/api/products.api';
import { cancelOrder, confirmOrder, getOrder, holdOrder, listOrders } from '../../services/api/orders.api';
import { shiftsApi } from '../../services/api/erp.api';
import { useCart } from '../../store/cartStore';
import { useOrder } from '../../store/orderStore';
import { useAuth } from '../../store/authStore';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { NewProductModal } from '../../components/cashier/NewProductModal';
import { CustomerPickerModal } from '../../components/cashier/CustomerPickerModal';
import { ExpenseQuickModal } from '../../components/cashier/ExpenseQuickModal';
import { ReceiptPrintView } from '../../components/receipt/ReceiptPrintView';

function nextDraftNo(rows: any[]): number {
  for (const r of rows) {
    const ref = String(r?.reference ?? '').trim();
    if (/^\d+$/.test(ref)) return Number(ref) + 1;
  }
  return 1;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(h)}:${p(d.getMinutes())}${ap}`;
}

export function CashierPage() {
  const nav = useNavigate();
  const { lines, addLine, setQty, remove, clear, subtotal, count, orderType, setOrderType, customerId, setCustomer } = useCart();
  const { lastOrder, setLastOrder } = useOrder();
  const username = useAuth((s) => s.user?.username ?? '');
  const [catalog, setCatalog] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [search, setSearch] = useState('');
  const [catId, setCatId] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [barcode, setBarcode] = useState('');
  const [msg, setMsg] = useState('');
  const [customerName, setCustomerName] = useState('عميل نقدي');
  const [orderNo, setOrderNo] = useState<number | null>(null);
  const [showNewProduct, setShowNewProduct] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [printOrder, setPrintOrder] = useState<any | null>(null);
  const printRef = useRef(false);

  const load = useCallback(async () => {
    const data = await searchProducts(search, catId);
    setCatalog(data);
  }, [search, catId]);

  useEffect(() => {
    listCategories().then(setCats).catch(() => {});
    listOrders().then((rows: any[]) => {
      setOrderNo(nextDraftNo(rows ?? []));
    }).catch(() => setOrderNo(1));
  }, []);
  useEffect(() => {
    document.title = `(ولاد حلال) شاشة بيانات الطلب - المستخدم: ${username}`;
  }, [username]);
  useEffect(() => {
    const t = setTimeout(() => { load().catch(() => {}); }, 200);
    return () => clearTimeout(t);
  }, [load]);

  const addProduct = useCallback((p: any, unit: any | null) => {
    addLine({
      productId: p.id,
      unitId: unit?.id ?? null,
      name: p.name,
      unitName: unit?.unitName ?? 'قطاعي',
      category: p.categoryName ?? '',
      addedAt: Date.now(),
      price: unit?.sellingPrice ?? p.basePrice,
      qty: 1,
    });
  }, [addLine]);

  const handleScan = useCallback(async (code: string) => {
    setMsg('');
    try {
      const { product, unit } = await barcodeLookup(code);
      addProduct(product, unit);
    } catch {
      setShowNewProduct(code);
    }
  }, [addProduct]);

  useBarcodeScanner(handleScan);

  async function doBarcodeField() {
    if (barcode.trim()) await handleScan(barcode.trim());
    setBarcode('');
  }

  const bumpOrderNo = useCallback(() => setOrderNo((n) => (n == null ? n : n + 1)), []);

  const doConfirm = useCallback(async () => {
    if (lines.length === 0) { setMsg('السلة فارغة'); return; }
    setMsg('');
    try {
      const order = await confirmOrder({
        lines: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, qty: l.qty })),
        type: orderType,
        paymentMethod: 'cash',
        ...(customerId ? { customerId } : {}),
      });
      setLastOrder(order);
      clear();
      bumpOrderNo();
      setMsg(`تم التأكيد: ${order.reference} — ${Number(order.total).toFixed(2)} ج.م`);
      setPrintOrder(order);
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Confirm failed');
    }
  }, [lines, orderType, customerId, clear, setLastOrder, bumpOrderNo]);

  const doHold = useCallback(async () => {
    if (lines.length === 0) { setMsg('السلة فارغة'); return; }
    setMsg('');
    try {
      const order = await holdOrder({
        lines: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, qty: l.qty })),
        type: orderType,
        ...(customerId ? { customerId } : {}),
      });
      clear();
      bumpOrderNo();
      setMsg(`تم التعليق: ${order.reference}`);
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Hold failed');
    }
  }, [lines, orderType, customerId, clear, bumpOrderNo]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F9') { e.preventDefault(); void doHold(); }
      else if (e.key === 'F12') { e.preventDefault(); void doConfirm(); }
      else if (e.key === 'F2') { e.preventDefault(); setShowPicker(true); }
      else if (e.key === 'F4') { e.preventDefault(); document.getElementById('search-input')?.focus(); }
      else if (e.key === 'Escape') {
        if (lines.length > 0) { clear(); setMsg('تم إلغاء المسودة'); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [doHold, doConfirm, lines.length, clear]);

  // Print receipt whenever a fresh order is set for printing.
  useEffect(() => {
    if (printOrder && !printRef.current) {
      printRef.current = true;
      const t = setTimeout(() => {
        window.print();
        printRef.current = false;
      }, 100);
      return () => clearTimeout(t);
    }
  }, [printOrder]);

  async function doReprint() {
    setMsg('');
    try {
      if (printOrder) { setPrintOrder({ ...printOrder }); return; }
      if (lastOrder?.id) {
        const full = await getOrder(lastOrder.id);
        setPrintOrder(full);
        return;
      }
      setMsg('لا توجد فاتورة للطباعة بعد');
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Print failed');
    }
  }

  async function doDrawer() {
    setMsg('');
    try {
      await shiftsApi.open(0);
      setMsg('تم إرسال أمر فتح الدرج');
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Drawer failed');
    }
  }

  async function doReturn() {
    const ref = prompt('رقم الطلب المرتجع (reference):');
    if (!ref?.trim()) return;
    setMsg('');
    try {
      const rows: any[] = await listOrders();
      const found = rows.find((o) => String(o.reference) === ref.trim());
      if (!found) { setMsg('الطلب غير موجود'); return; }
      await cancelOrder(found.id);
      setMsg(`تم إرجاع الطلب: ${found.reference}`);
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Return failed');
    }
  }

  const pinnedCats = cats.filter((c) => c.isPinned);
  const visibleCatalog = catalog.filter((p) => {
    if (pinnedOnly && pinnedCats.length > 0 && !pinnedCats.some((c) => c.id === (p.categoryId ?? p.category_id))) {
      // Fall back to name match when only categoryName is available.
      if (!pinnedCats.some((c) => c.name === p.categoryName)) return false;
    }
    if (unitFilter && unitFilter !== 'الكل') return (p.unitName ?? 'قطاعي') === unitFilter;
    return true;
  });

  return (
    <div className="layout">
      {/* HEADER BAR */}
      <div className="wh-header">
        <button className="wh-btn" onClick={() => setShowPicker(true)}>👤 اختيار عميل (F2)</button>
        <button
          className="wh-btn"
          onClick={() => { setCustomer(null); setCustomerName('عميل نقدي'); }}
          title="إعادة التعيين إلى عميل نقدي"
        >
          {customerName}
        </button>
        <input
          id="barcode-input"
          data-barcode
          className="barcode-field"
          placeholder="باركود / بحث سريع"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void doBarcodeField(); }}
          style={{ flex: 1 }}
        />
        <label>نوع الطلب</label>
        <select value={orderType} onChange={(e) => setOrderType(e.target.value as any)}>
          <option value="pickup">استلام</option>
          <option value="delivery">توصيل</option>
        </select>
        <span
          className="wh-avatar"
          style={{ width: 22, height: 22, background: '#3388E0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
          title="المستخدم"
        >
          👤
        </span>
        <label>رقم الطلب</label>
        <input value={orderNo ?? ''} readOnly style={{ width: 70 }} aria-label="رقم الطلب" />
      </div>

      {/* SEARCH/FILTER BAR */}
      <div className="wh-filterbar">
        <button className="wh-btn" onClick={() => setPinnedOnly((v) => !v)} title="تصفية بالتصنيفات المثبتة">
          📍 تصنيفات مثبتة (F4)
        </button>
        <button className="wh-btn" onClick={() => setShowPins((v) => !v)} title="إظهار/إخفاء التصنيفات" aria-pressed={showPins}>
          👁
        </button>
        <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} aria-label="وحدة التسعير">
          <option value="">الكل ▾</option>
          <option value="قطاعي">قطاعي</option>
        </select>
        <input
          id="search-input"
          className="wh-search-tint"
          placeholder="🔍 بحث في الأصناف"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <label>بحث: ▾</label>
        <select value={catId} onChange={(e) => setCatId(e.target.value)} aria-label="كل التصنيفات">
          <option value="">كل التصنيفات</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span title="عرض شبكي">▦</span>
        <span title="ماسح">📷</span>
        <span title="إعدادات العرض">⚙</span>
        <span style={{ fontSize: 12 }}>تعديل العرض</span>
      </div>
      {showPins && pinnedCats.length > 0 && (
        <div className="pinchips">
          {pinnedCats.map((c) => (
            <button
              key={c.id}
              className={`wh-btn${catId === c.id ? ' wh-chip-on' : ''}`}
              onClick={() => setCatId((v) => (v === c.id ? '' : c.id))}
            >
              📍 {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="cashier-grid">
        <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* CATALOG TABLE */}
          <table className="wh-table">
            <thead><tr><th>التصنيف</th><th>الصنف</th><th>الوصف</th><th>باركود</th><th>رصيد</th><th>قطاعي</th><th>-</th></tr></thead>
            <tbody>
              {visibleCatalog.map((p) => (
                <tr key={p.id} onClick={() => addProduct(p, null)} style={{ cursor: 'pointer' }} className="wh-pink">
                  <td>{p.categoryName ?? ''}</td><td>{p.name}</td><td>{p.description ?? ''}</td>
                  <td>{p.barcode ?? ''}</td><td>{p.stockQty}</td><td>{Number(p.basePrice).toFixed(2)}</td>
                  <td>-</td>
                </tr>
              ))}
              {visibleCatalog.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'left' }}>..</td></tr>
              )}
            </tbody>
          </table>

          {/* CART TABLE */}
          <table className="wh-table">
            <thead><tr><th>م</th><th>التصنيف</th><th>الصنف</th><th>التسعير</th><th>السعر</th><th>الكمية</th><th>السعر الكلي</th><th>الوقت</th><th>-</th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.key} className="wh-active">
                  <td>{i + 1}</td><td>{l.category ?? ''}</td><td>{l.name}</td><td>{l.unitName}</td>
                  <td>{Number(l.price).toFixed(2)}</td>
                  <td><input type="number" min={0.1} step={1} value={l.qty} onChange={(e) => setQty(l.key, Number(e.target.value))} style={{ width: 70 }} /></td>
                  <td>{(Number(l.price) * Number(l.qty)).toFixed(2)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{l.addedAt ? fmtTime(l.addedAt) : ''}</td>
                  <td><button className="wh-btn" onClick={() => remove(l.key)}>x</button></td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={9}>&nbsp;</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* LEFT SIDEBAR */}
        <div>
          <label>عدد الوحدات:</label>
          <div className="wh-count-box">{lines.length}</div>
          <label style={{ display: 'block', marginTop: 8 }}>عدد الأصناف:</label>
          <div className="wh-count-box">{count()}</div>
          <label style={{ display: 'block', marginTop: 8 }}>إحمالي الفاتورة:</label>
          <div className="wh-total-box">{subtotal().toFixed(2)} ج.م</div>
          {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
        </div>
      </div>

      {/* BOTTOM ACTION BAR — row 1 */}
      <div className="bottom-bar">
        <button className="wh-btn" onClick={() => nav('/orders')}>☰ الطلبات ▾</button>
        <button className="wh-btn" onClick={() => nav('/purchases')}>📦 المشتريات ▾</button>
        <button className="wh-btn" onClick={() => nav('/inventory')}>📏 الأصناف ▾</button>
        <button className="wh-btn" onClick={doReturn}><span className="wh-icon-return">↩</span> مرتجع</button>
        <button className="wh-btn" onClick={() => setShowExpense(true)}>🪙 المصروفات ▾</button>
        <button className="wh-btn" onClick={doDrawer}>🗄 فتح الدرج</button>
      </div>
      {/* BOTTOM ACTION BAR — row 2 */}
      <div className="bottom-bar bottom-bar-row2">
        <button className="wh-btn" onClick={doReprint}>🖨 طباعة نسخة</button>
        <button className="wh-btn" onClick={doHold}>⏸ تعليق الفاتورة (F9)</button>
        <button className="wh-btn wh-primary" onClick={doConfirm}><span className="wh-confirm-dot" style={{ display: 'inline-flex', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>✓</span> تأكيد (F12)</button>
        <span style={{ flex: 1 }} />
        <button className="wh-btn" onClick={() => { if (lines.length > 0) { clear(); setMsg('تم إلغاء المسودة'); } }}>إلغاء (Esc)</button>
      </div>

      {showPicker && (
        <CustomerPickerModal
          onClose={() => setShowPicker(false)}
          onPick={(c) => {
            if (c) { setCustomer(c.id); setCustomerName(c.name); }
            else { setCustomer(null); setCustomerName('عميل نقدي'); }
          }}
        />
      )}
      {showExpense && <ExpenseQuickModal onClose={() => setShowExpense(false)} />}
      {showNewProduct && (
        <NewProductModal
          barcode={showNewProduct}
          onClose={() => setShowNewProduct(null)}
          onSaved={(p) => {
            addLine({ productId: p.id, unitId: null, name: p.name, unitName: 'قطاعي', category: p.categoryName ?? '', addedAt: Date.now(), price: p.basePrice, qty: 1 });
            load().catch(() => {});
          }}
        />
      )}

      {/* Hidden print area */}
      <div className="print-only" style={{ display: 'none' }}>
        {printOrder && <ReceiptPrintView order={printOrder} />}
      </div>
    </div>
  );
}
