import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { barcodeLookup, listCategories, searchProducts } from '../../services/api/products.api';
import { confirmOrder, getOrder, holdOrder, listOrders } from '../../services/api/orders.api';
import { discountsApi, settingsApi } from '../../services/api/erp.api';
import { useCart } from '../../store/cartStore';
import { useOrder } from '../../store/orderStore';
import { useAuth } from '../../store/authStore';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useDir } from '../../store/lang';
import { CustomerModal } from '../../components/pos/CustomerModal';
import { ExpenseModal } from '../../components/pos/ExpenseModal';
import { ReturnModal } from '../../components/pos/ReturnModal';
import { PaymentModal } from '../../components/pos/PaymentModal';
import { ManagerGate } from '../../components/pos/ManagerGate';
import { ProductModal } from '../../components/product/ProductModal';
import { SearchableSelect } from '../../components/shared/SearchableSelect';
import { lookupCategoriesLocal, lookupReps } from '../../services/api/lookups';
import { ReceiptPrinterService } from '../../receipt/ReceiptPrinterService';
import { orderToReceipt, type PrintStatus } from '../../receipt/types';
import { loadPrinterConfig } from '../../receipt/configStore';
import { buildReceiptText, type StyledLine } from '../../receipt/ReceiptTemplate';
import { ReceiptPreview } from '../../receipt/Preview';
import { ShiftGate } from '../../components/pos/ShiftModals';

const PINS_KEY = 'kstore_pins';
function loadPins(): string[] {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || '[]'); } catch { return []; }
}

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

const ORDER_TYPES = [
  { value: 'pickup', label: 'استلام' },
  { value: 'delivery', label: 'توصيل' },
];

export function CashierPage() {
  return (
    <ShiftGate userId={useAuth((s) => s.user?.id ?? '')} allowSkip={(useAuth((s) => s.user?.permissionLevel ?? 0)) >= 50} render={() => <POSBody />} />
  );
}

function POSBody() {
  const nav = useNavigate();
  const dir = useDir();
  const user = useAuth((s) => s.user);
  const setCustomerId = useCart((s) => s.setCustomer);
  const cartCustomerId = useCart((s) => s.customerId);
  const { lines, addLine, setQty, remove, clear, subtotal, count, orderType, setOrderType } = useCart();
  const { lastOrder, setLastOrder } = useOrder();
  const [cats, setCats] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [barcode, setBarcode] = useState('');
  const [showCustomers, setShowCustomers] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showMgr, setShowMgr] = useState<null | { kind: 'discount' }>(null);
  const [approvalToken, setApprovalToken] = useState<string | null>(null);
  const [discThreshold, setDiscThreshold] = useState(200);
  const [prefillBarcode, setPrefillBarcode] = useState('');
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; m: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [pins, setPins] = useState<string[]>(loadPins);
  const [showPins, setShowPins] = useState(true);
  const [gridView, setGridView] = useState(false);
  const [fullCols, setFullCols] = useState(true);
  const [previewLines, setPreviewLines] = useState<StyledLine[] | null>(null);
  const [printStatus, setPrintStatus] = useState<PrintStatus>('idle');
  const [customerName, setCustomerName] = useState('عميل نقدي');
  const [orderNo, setOrderNo] = useState<number | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [codeCheck, setCodeCheck] = useState<any | null>(null);
  const [payment, setPayment] = useState<'cash' | 'card'>('cash');
  const catRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const codeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.title = `(ولاد حلال) شاشة بيانات الطلب - المستخدم: ${user?.username ?? ''}`;
  }, [user?.username]);

  useEffect(() => {
    listCategories().then(setCats).catch(() => {});
    listOrders().then((rows: any[]) => setOrderNo(nextDraftNo(rows ?? []))).catch(() => setOrderNo(1));
    settingsApi.all().then((rows: any[]) => {
      const v = Number((rows || []).find((r: any) => r.key === 'discount_approval_threshold')?.value ?? 200);
      if (Number.isFinite(v) && v >= 0) setDiscThreshold(v);
    }).catch(() => {});
  }, []);
  useEffect(() => ReceiptPrinterService.onChange(setPrintStatus), []);

  const { data: products, refetch: refetchProducts } = useQuery({
    queryKey: ['pos-products', q, cat],
    queryFn: async () => searchProducts(q, cat || undefined),
  });

  const totalsQty = count();
  const totalsTotal = subtotal();
  const discountAmount = codeCheck ? Number(codeCheck.amount ?? codeCheck.discountAmount ?? 0) : 0;
  const payable = Math.max(0, totalsTotal - discountAmount);

  useEffect(() => {
    window.clearTimeout(codeTimer.current);
    const code = discountCode.trim();
    if (!code || !lines.length) { setCodeCheck(null); return; }
    codeTimer.current = window.setTimeout(async () => {
      try {
        const data = await discountsApi.validate(code, totalsTotal);
        setCodeCheck(data);
      } catch { setCodeCheck(null); }
    }, 350);
    return () => window.clearTimeout(codeTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountCode, lines.length, totalsTotal]);

  function flash(t: 'err' | 'ok', m: string) { setMsg({ t, m }); setTimeout(() => setMsg(null), 4000); }

  const addProduct = useCallback((p: any, unit: any | null) => {
    addLine({
      productId: p.id,
      unitId: unit?.id ?? null,
      name: p.name,
      unitName: unit?.unitName ?? 'قطاعي',
      category: p.categoryName ?? p.category?.name ?? '',
      addedAt: Date.now(),
      price: Number(unit?.sellingPrice ?? p.basePrice ?? 0),
      qty: 1,
    });
    setLastAdded(`${p.id}::${unit?.id ?? 'base'}`);
  }, [addLine]);

  function openNewProduct(code: string) {
    setPrefillBarcode(code);
    setShowProduct(true);
  }

  const handleScan = useCallback(async (code: string) => {
    setMsg(null);
    try {
      const { product, unit } = await barcodeLookup(code);
      addProduct(product, unit);
    } catch {
      openNewProduct(code);
    }
  }, [addProduct]);

  useBarcodeScanner(handleScan);

  async function doBarcodeField() {
    if (barcode.trim()) await handleScan(barcode.trim());
    setBarcode('');
  }

  /** Scanner fast-entry: digits-only input goes straight to barcode lookup. */
  const BARCODE_PATTERN = /^[\d\-+]{4,}$/;
  async function searchBarcode() {
    const code = q.trim();
    if (!code) { refetchProducts(); return; }
    if (BARCODE_PATTERN.test(code)) {
      try {
        const { product, unit } = await barcodeLookup(code);
        addProduct(product, unit);
        setQ('');
        return;
      } catch { openNewProduct(code); return; }
    }
    refetchProducts();
  }

  function togglePin(id: string) {
    const next = pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id];
    setPins(next);
    localStorage.setItem(PINS_KEY, JSON.stringify(next));
  }

  const bumpOrderNo = useCallback(() => setOrderNo((n) => (n == null ? n : n + 1)), []);

  /** Open the payment dialog; large discounts detour through manager approval first. */
  function beginPay() {
    if (busy) return;
    if (!lines.length) { flash('err', 'السلة فارغة'); return; }
    if (discountAmount > discThreshold && !approvalToken) { setShowMgr({ kind: 'discount' }); return; }
    setShowPay(true);
  }

  async function doHold() {
    if (busy) return;
    if (!lines.length) { flash('err', 'السلة فارغة'); return; }
    setBusy(true);
    try {
      const order = await holdOrder({
        lines: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, qty: l.qty })),
        type: orderType,
        ...(cartCustomerId ? { customerId: cartCustomerId } : {}),
      });
      flash('ok', `تم تعليق الفاتورة: ${order.reference}`);
      clear();
      bumpOrderNo();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      flash('err', Array.isArray(m) ? m.join('، ') : (m || 'حدث خطأ أثناء حفظ الطلب'));
    } finally { setBusy(false); }
  }

  async function doConfirm(amountPaid: number) {
    if (busy) return;
    if (!lines.length) { flash('err', 'السلة فارغة'); return; }
    setBusy(true);
    setShowPay(false);
    try {
      const order = await confirmOrder({
        lines: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, qty: l.qty })),
        type: orderType,
        paymentMethod: payment,
        ...(cartCustomerId ? { customerId: cartCustomerId } : {}),
        ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
        amountPaid,
        ...(approvalToken ? { approvalToken } : {}),
      });
      const full = await getOrder(order.id).catch(() => order);
      setLastOrder(full);
      const paid = full.payments?.[0];
      flash('ok', `تم تأكيد الطلب: ${full.reference} — ${Number(full.total).toFixed(2)} ج.م${paid ? ` — الباقي ${Number(paid.change).toFixed(2)}` : ''}`);
      const cfg = loadPrinterConfig();
      if (cfg.autoPrint) {
        const ok = await ReceiptPrinterService.printReceipt(orderToReceipt(full, false), cfg);
        if (!ok) flash('err', `${ReceiptPrinterService.lastError} — الطلب محفوظ: ${full.reference} (إعادة المحاولة من طباعة نسخة)`);
      }
      if (cfg.openCashDrawer) void ReceiptPrinterService.kickDrawer(cfg);
      clear();
      setDiscountCode(''); setCodeCheck(null);
      setApprovalToken(null);
      setPayment('cash');
      bumpOrderNo();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      flash('err', Array.isArray(m) ? m.join('، ') : (m || 'حدث خطأ أثناء حفظ الطلب'));
    } finally { setBusy(false); }
  }

  async function printCopy() {
    if (printStatus === 'printing') return;
    if (!lastOrder) { flash('err', 'لا توجد فاتورة للطباعة'); return; }
    const ok = await ReceiptPrinterService.printReceipt(orderToReceipt(lastOrder, true));
    flash(ok ? 'ok' : 'err', ok ? `تم إرسال نسخة الفاتورة ${lastOrder.reference} للطباعة` : `${ReceiptPrinterService.lastError} — (إعادة المحاولة متاحة)`);
  }

  async function kickDrawer() {
    const ok = await ReceiptPrinterService.kickDrawer();
    flash(ok ? 'ok' : 'err', ok ? 'تم إرسال أمر فتح الدرج' : 'فتح الدرج غير مدعوم في المتصفح — يعمل مع طابعة حرارية');
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F2') { e.preventDefault(); setShowCustomers(true); }
      else if (e.key === 'F4') { e.preventDefault(); catRef.current?.focus(); }
      else if (e.key === 'F9') { e.preventDefault(); void doHold(); }
      else if (e.key === 'F10') { e.preventDefault(); beginPay(); }
      else if (e.key === 'F12') { e.preventDefault(); beginPay(); }
      else if (e.key === 'Escape') {
        setShowCustomers(false); setShowProduct(false); setShowReturn(false); setShowExpense(false); setPreviewLines(null);
        setShowPay(false); setShowMgr(null);
        if (lines.length > 0 && (document.activeElement?.tagName !== 'INPUT' || (document.activeElement as HTMLInputElement).type !== 'number')) {
          // Esc on empty focus clears nothing; draft cancel is explicit via button.
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, cartCustomerId, orderType, discountCode, payment, discountAmount, discThreshold, approvalToken]);

  const pinnedCats = cats.filter((c) => pins.includes(c.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} dir={dir}>
      {/* POS header — green order-data bar */}
      <div className="pos-header">
        <button className="kbtn" onClick={() => setShowCustomers(true)} title="F2">👤 اختيار عميل (F2)</button>
        <button className="kbtn" onClick={() => { setCustomerId(null); setCustomerName('عميل نقدي'); }} title="إعادة التعيين إلى عميل نقدي">{customerName}</button>
        <input
          data-barcode
          className="barcode-field"
          placeholder="باركود / بحث سريع"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void doBarcodeField(); }}
          style={{ flex: 1, minWidth: 120 }}
        />
        <span>نوع الطلب:</span>
        <select className="kselect" value={orderType} onChange={(e) => setOrderType(e.target.value as any)}>
          {ORDER_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {orderType === 'delivery' && (
          <SearchableSelect label="المندوب:" value="" loadOptions={lookupReps()}
            placeholder="اكتب أو اختر المندوب…" onChange={() => {}} />
        )}
        <span>رقم الطلب: <b>{orderNo ?? ''}</b></span>
        <span>الكاشير: <b>{user?.username}</b></span>
      </div>

      {/* search row — cream catalog filter bar */}
      <div className="pos-searchbar">
        <button className="kbtn" title="التصنيفات المثبتة (F4)" onClick={() => catRef.current?.focus()}>📍 تصنيفات مثبتة (F4)</button>
        <button className="kbtn" title={showPins ? 'إخفاء المثبتة' : 'إظهار المثبتة'} onClick={() => setShowPins(!showPins)}>{showPins ? '👁' : '👁‍🗨'}</button>
        <button className="kbtn" title="عرض الكل" onClick={() => { setCat(''); setQ(''); }}>الكل</button>
        <span className="klabel">بحث:</span>
        <input ref={searchRef} className="kinput pos-search-tint" placeholder="🔍 باركود / اسم صنف — Enter للبحث" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void searchBarcode(); }} style={{ width: 300 }} />
        <SearchableSelect value={cat} loadOptions={lookupCategoriesLocal(cats || [])} inputRef={catRef}
          placeholder="كل التصنيفات — اكتب للبحث…" onChange={(v) => setCat(v)} />
        <button className="kbtn" title="تبديل عرض شبكي/جدول" onClick={() => setGridView(!gridView)}>{gridView ? '📋' : '⊞'}</button>
        <button className="kbtn" title="مسح باركود (التركيز على البحث)" onClick={() => searchRef.current?.focus()}>📷</button>
        <button className="kbtn" title="إعدادات العرض">⚙</button>
        <button className="kbtn" onClick={() => setFullCols(!fullCols)}>تعديل العرض</button>
        <button className="kbtn kbtn-primary" onClick={() => void searchBarcode()}>بحث</button>
      </div>

      {/* pinned quick categories (F4) */}
      {showPins && !!pinnedCats.length && (
        <div className="krow" style={{ padding: '0 8px 4px' }}>
          {pinnedCats.map((c: any) => (
            <button key={c.id} className="kbtn" style={cat === c.id ? { background: 'var(--k-selected)', color: '#fff' } : {}} onClick={() => setCat(cat === c.id ? '' : c.id)}>
              📍 {c.name}
            </button>
          ))}
        </div>
      )}
      {showPins && !pins.length && (
        <div style={{ padding: '0 8px 4px', color: 'var(--muted)', fontSize: 12 }}>لا توجد تصنيفات مثبتة — اختر من القائمة ثم 📌</div>
      )}

      {msg && <div className={msg.t === 'err' ? 'kerr' : 'kok'} style={{ margin: '0 8px' }}>{msg.m}</div>}

      <div className="pos-stack" style={{ display: 'flex', gap: 6, padding: 6, flex: 1, minHeight: 0, minWidth: 0 }}>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0, minWidth: 0 }}>
          {/* product results */}
          <div className="ktable-wrap" style={{ flex: 1 }}>
            {!gridView ? (
            <table className="ktable">
              <thead><tr><th>التصنيف</th><th>الصنف</th>{fullCols && <th>الوصف</th>}<th>باركود</th>{fullCols && <th>رصيد</th>}<th>قطاعي</th><th>-</th></tr></thead>
              <tbody>{(products || []).map((p: any) => (
                <tr key={p.id} onClick={() => addProduct(p, null)} title="اضغط للإضافة إلى السلة">
                  <td>{p.categoryName || '—'}</td>
                  <td>{p.name}</td>
                  {fullCols && <td>{p.description || '—'}</td>}
                  <td>{p.barcode || '—'}</td>{fullCols && <td>{p.stockQty ?? '—'}</td>}<td>{Number(p.basePrice).toFixed(2)}</td>
                  <td><button className="kbtn" onClick={(e) => { e.stopPropagation(); addProduct(p, null); }}>+ إضافة</button></td>
                </tr>))}
                {!(products || []).length && <tr><td colSpan={7} style={{ textAlign: 'left' }}>..</td></tr>}
              </tbody>
            </table>
            ) : (
            <div className="pos-grid">
              {(products || []).map((p: any) => (
                <button key={p.id} className="pos-card" onClick={() => addProduct(p, null)} title="اضغط للإضافة إلى السلة">
                  <b>{p.name}</b>
                  <span>{Number(p.basePrice).toFixed(2)} ج.م</span>
                  <small>{p.categoryName || ''}</small>
                </button>))}
              {!(products || []).length && <div style={{ padding: 16, color: 'var(--muted)' }}>لا نتائج</div>}
            </div>
            )}
          </div>
          {/* cart */}
          <div className="ktable-wrap" style={{ flex: 1 }}>
            {lines.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontSize: 28 }}>🧾</div>
                <div>السلة فارغة — ابدأ بمسح باركود أو البحث عن صنف</div>
              </div>
            ) : (
            <table className="ktable">
              <thead><tr><th>م</th><th>التصنيف</th><th>الصنف</th><th>التسعير</th><th>السعر</th><th>الكمية</th><th>السعر الكلي</th><th>الوقت</th><th>-</th></tr></thead>
              <tbody>{lines.map((l, i) => (
                <tr key={l.key} className={lastAdded === l.key ? 'recent' : ''}>
                  <td>{i + 1}</td><td>{l.category}</td><td>{l.name}</td><td>{l.unitName}</td><td>{Number(l.price).toFixed(2)}</td>
                  <td><input className="kinput" type="number" min={0.1} step={1} value={l.qty} onChange={(e) => setQty(l.key, Number(e.target.value))} style={{ width: 70 }} /></td>
                  <td><b>{(Number(l.price) * Number(l.qty)).toFixed(2)}</b></td><td style={{ whiteSpace: 'nowrap' }}>{l.addedAt ? fmtTime(l.addedAt) : ''}</td>
                  <td><button className="kbtn" onClick={() => remove(l.key)}>حذف</button></td>
                </tr>))}</tbody>
            </table>
            )}
          </div>
        </div>

        {/* totals */}
        <div className="pos-side" style={{ width: 230, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="kpanel">عدد الوحدات: <b>{lines.length}</b></div>
          <div className="kpanel">عدد الأصناف: <b>{totalsQty}</b></div>
          <div>إجمالي الفاتورة</div>
          <div className="ktotal-box">{payable.toFixed(2)} ج.م</div>
          {discountAmount > 0 && <div className="kok" style={{ fontSize: 12 }}>الخصم: -{discountAmount.toFixed(2)}</div>}
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>كود خصم</div>
            <input className="kinput" placeholder="WELAD10" value={discountCode} onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              style={{ width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }} />
            {discountCode && !codeCheck && <div style={{ fontSize: 11, color: 'var(--muted)' }}>جاري التحقق…</div>}
            {codeCheck && !(codeCheck.amount ?? codeCheck.discountAmount) && <div style={{ fontSize: 11, color: '#E5484D' }}>الكود غير صالح</div>}
            {discountAmount > 0 && <div style={{ fontSize: 11, color: '#2E9E5B' }}>✓ ساري — خصم {discountAmount.toFixed(2)} ج.م</div>}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="kbtn" style={{ flex: 1, fontWeight: payment === 'cash' ? 700 : 400, borderColor: payment === 'cash' ? '#2E9E5B' : undefined }}
              onClick={() => setPayment('cash')}>نقدي</button>
            <button className="kbtn" style={{ flex: 1, fontWeight: payment === 'card' ? 700 : 400, borderColor: payment === 'card' ? '#F5A623' : undefined }}
              onClick={() => setPayment('card')}>بطاقة</button>
          </div>
          {lastOrder && <button className="kbtn" onClick={() => setPreviewLines(buildReceiptText(orderToReceipt(lastOrder, true), loadPrinterConfig(), loadPrinterConfig().paperWidth))}>معاينة الفاتورة</button>}
        </div>
      </div>

      {/* bottom action bar */}
      <div className="pos-actionbar">
        <button className="kbtn" onClick={() => nav('/orders')}>☰ الطلبات ▾</button>
        <button className="kbtn" onClick={() => nav('/purchases')}>📦 المشتريات ▾</button>
        <button className="kbtn" onClick={() => nav('/inventory')}>📏 الأصناف ▾</button>
        <button className="kbtn" onClick={() => setShowReturn(true)}>↩ مرتجع</button>
        <button className="kbtn" onClick={() => setShowExpense(true)}>🪙 المصروفات ▾</button>
        <button className="kbtn" onClick={() => void kickDrawer()}>🗄 فتح الدرج</button>
        <button className="kbtn" disabled={printStatus === 'printing'} onClick={() => void printCopy()}>
          {printStatus === 'printing' ? 'جاري الطباعة…' : '🖨 طباعة نسخة'}
        </button>
        <button className="kbtn" disabled={busy || !lines.length} onClick={() => void doHold()}>⏸ تعليق الفاتورة (F9)</button>
        <button className="kbtn" disabled={busy || !lines.length} onClick={beginPay}>💵 الدفع (F10)</button>
        <button className="kbtn kbtn-primary" disabled={busy || !lines.length} onClick={beginPay} style={{ padding: '8px 22px' }}>✅ تأكيد (F12)</button>
        <span style={{ flex: 1 }} />
        <button className="kbtn" onClick={() => { if (lines.length) { clear(); flash('ok', 'تم إلغاء المسودة'); } }}>إلغاء (Esc)</button>
      </div>

      {showCustomers && <CustomerModal onClose={() => setShowCustomers(false)} onSelect={(c) => {
        if (c) { setCustomerId(c.id); setCustomerName(c.name); }
        else { setCustomerId(null); setCustomerName('عميل نقدي'); }
        setShowCustomers(false);
      }} />}
      {showReturn && <ReturnModal onClose={() => setShowReturn(false)} onDone={(m) => flash('ok', m)} />}
      {showProduct && <ProductModal barcode={prefillBarcode} onClose={() => { setShowProduct(false); setPrefillBarcode(''); }} onSaved={(p) => {
        setShowProduct(false); setPrefillBarcode(''); setQ('');
        addLine({ productId: p.id, unitId: null, name: p.name, unitName: 'قطاعي', category: '', addedAt: Date.now(), price: Number(p.basePrice) || 0, qty: 1 });
        refetchProducts();
      }} />}
      {showExpense && <ExpenseModal onClose={() => setShowExpense(false)} onDone={(m) => flash('ok', m)} />}
      {previewLines && <ReceiptPreview lines={previewLines} onClose={() => setPreviewLines(null)} />}
      {showPay && <PaymentModal subtotal={totalsTotal} discount={discountAmount} total={payable}
        onClose={() => setShowPay(false)} onPay={(amt) => void doConfirm(amt)} />}
      {showMgr && <ManagerGate title="اعتماد خصم كبير" onClose={() => setShowMgr(null)}
        onApproved={(token) => { setApprovalToken(token); setShowMgr(null); setShowPay(true); }} />}
    </div>
  );
}
