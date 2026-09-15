import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { barcodeLookup, listCategories, searchProducts } from '../../services/api/products.api';
import { confirmOrder, holdOrder } from '../../services/api/orders.api';
import { shiftsApi } from '../../services/api/erp.api';
import { useCart } from '../../store/cartStore';
import { useOrder } from '../../store/orderStore';
import { useAuth } from '../../store/authStore';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useReceiptPrinter } from '../../hooks/useReceiptPrinter';
import { requestEndShift } from '../../components/shift/ShiftGate';
import { getStoredPrinter } from '../../lib/printer';
import { ReceiptPrintView } from '../../components/receipt/ReceiptPrintView';
import { ReturnReceiptView } from '../../components/receipt/ReturnReceiptView';
import { NewProductModal } from '../../components/cashier/NewProductModal';

declare global {
  interface Window {
    whDesktop?: { printReceipt: (text: string) => Promise<any>; openDrawer: () => Promise<any> };
  }
}

export function CashierPage() {
  const { t, i18n } = useTranslation();
  const user = useAuth((s) => s.user);
  const { lines, addLine, setQty, remove, clear, subtotal, count, orderType, setOrderType } = useCart();
  const setLastOrder = useOrder((s) => s.setLastOrder);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [catId, setCatId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [msg, setMsg] = useState('');
  const [searching, setSearching] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [shiftInfo, setShiftInfo] = useState<any>(null);
  const { receiptRef, printableOrder, setPrintableOrder, printOrder } = useReceiptPrinter();

  // payment panel
  const [showPay, setShowPay] = useState(false);
  const [method, setMethod] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [tendered, setTendered] = useState('');
  const [cashAmt, setCashAmt] = useState('');
  const [cardAmt, setCardAmt] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const tenderedRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const data = await searchProducts(search, catId);
    setCatalog(data);
  }, [search, catId]);

  useEffect(() => {
    listCategories().then(setCats).catch(() => {});
    shiftsApi.current().then(setShiftInfo).catch(() => setShiftInfo(null));
  }, []);
  useEffect(() => {
    const t2 = setTimeout(load, 200);
    return () => clearTimeout(t2);
  }, [load]);
  useEffect(() => {
    if (showPay) setTimeout(() => tenderedRef.current?.focus(), 60);
  }, [showPay, method]);

  const printerKind = window.whDesktop ? 'desktop' : getStoredPrinter() ? 'connected' : 'browser';
  const printerLabel =
    printerKind === 'desktop' ? t('pos.desktopPrinting') : printerKind === 'connected' ? t('pos.connected') : t('pos.browserPrinting');

  const addProduct = useCallback((p: any, unit: any | null) => {
    addLine({
      productId: p.id,
      unitId: unit?.id ?? null,
      name: p.name,
      unitName: unit?.unitName ?? t('common.unit'),
      price: unit?.sellingPrice ?? p.basePrice,
      qty: 1,
    });
  }, [addLine, t]);

  const handleScan = useCallback(async (code: string) => {
    setMsg('');
    setSearching(true);
    try {
      const { product, unit } = await barcodeLookup(code);
      addProduct(product, unit);
      setBarcode('');
      document.getElementById('barcode-input')?.focus();
    } catch {
      setMsg(`${t('pos.notFound')} — ${t('pos.notFoundBarcode')} ${code}`);
      setShowNewProduct(code);
    } finally {
      setSearching(false);
    }
  }, [addProduct, t]);

  useBarcodeScanner(handleScan);

  async function doBarcodeField() {
    if (barcode.trim()) await handleScan(barcode.trim());
  }

  function friendlyError(e: any): string {
    const status = e?.response?.status;
    const server = e?.response?.data?.message as string | undefined;
    if (status === 409 || server?.startsWith('Insufficient stock')) return t('pos.insufficientStock');
    if (server === 'Payment amount is insufficient') return t('pos.insufficientPayment');
    if (server === 'Cash + card must equal the order total') return t('pos.insufficientPayment');
    return t('pos.saleFailed');
  }

  function openPay() {
    if (!lines.length || submitting) return;
    setMsg('');
    setTendered('');
    setCashAmt('');
    setCardAmt('');
    setShowPay(true);
  }

  async function submitPay() {
    if (submitting || !lines.length) return;
    setSubmitting(true);
    setMsg('');
    try {
      const payload: any = {
        lines: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, qty: l.qty })),
        type: orderType,
        paymentMethod: method,
        deliveryFee: orderType === 'delivery' ? Number(deliveryFee) : 0,
        discountCode: discountCode.trim() || undefined,
      };
      if (method === 'cash') payload.paid = Number(tendered);
      if (method === 'mixed') {
        payload.cashAmount = Number(cashAmt);
        payload.cardAmount = Number(cardAmt);
      }
      const order = await confirmOrder(payload);
      setLastOrder(order);
      setLastSale(order);
      clear();
      setShowPay(false);
      // kick drawer on cash sales when running inside desktop shell
      if (method !== 'card') window.whDesktop?.openDrawer().catch(() => undefined);
    } catch (e: any) {
      setMsg(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function doHold() {
    if (!lines.length || submitting) return;
    setMsg('');
    try {
      const order = await holdOrder({
        lines: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, qty: l.qty })),
        type: orderType,
      });
      clear();
      setMsg(`${t('pos.heldOk')} #${order.reference}`);
    } catch (e: any) {
      setMsg(friendlyError(e));
    }
  }

  function closeTop() {
    if (lastSale) return; // success screen closes only via its buttons
    if (showPay) setShowPay(false);
    else if (showNewProduct) setShowNewProduct(null);
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F9') { e.preventDefault(); if (!showPay && !lastSale) doHold(); }
      else if (e.key === 'F12') { e.preventDefault(); if (!showPay && !lastSale) openPay(); }
      else if (e.key === 'Escape') { closeTop(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedKey) {
        const el = document.activeElement as HTMLElement | null;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
        e.preventDefault();
        remove(selectedKey);
        setSelectedKey(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const locale = i18n.language === 'en' ? 'en-US' : 'ar-EG';
  const total = subtotal() + (orderType === 'delivery' ? Number(deliveryFee) : 0);
  const changePreview = method === 'cash' && tendered !== '' ? Number(tendered) - total : 0;

  return (
    <div className="layout">
      <div className="wh-header">
        <span>{t('common.walkin')}</span>
        <select value={orderType} onChange={(e) => setOrderType(e.target.value as any)}>
          <option value="pickup">{t('common.pickup')}</option>
          <option value="delivery">{t('common.delivery')}</option>
        </select>
        <input id="barcode-input" data-barcode className="barcode-field" placeholder={t('common.barcode')} value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') doBarcodeField(); }} style={{ flex: 1 }} />
      </div>
      <div className="wh-subheader" style={{ display: 'flex', gap: 12, padding: '2px 8px', fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
        <span>{t('pos.cashier')}: {user?.username ?? '—'}</span>
        <span>{t('pos.shift')}: {shiftInfo ? `${t('pos.open')} (${new Date(shiftInfo.openedAt).toLocaleTimeString(locale)})` : t('pos.noShift')}</span>
        {shiftInfo && <span>{t('pos.openingCash')}: {Number(shiftInfo.openingCash).toFixed(2)}</span>}
        <span>{t('pos.printer')}: {printerLabel}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 6, flexWrap: 'wrap' }}>
        <input id="search-input" placeholder={t('common.searchPh')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
        <select value={catId} onChange={(e) => setCatId(e.target.value)}>
          <option value="">{t('common.allCats')}</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="cashier-grid">
        <div className="table-scroll" style={{ overflow: 'auto' }}>
          {searching && <div style={{ padding: 4 }}>{t('pos.searching')}</div>}
          <table className="wh-table">
            <thead><tr><th>{t('common.category')}</th><th>{t('common.item')}</th><th>{t('common.description')}</th><th>{t('common.barcode')}</th><th>{t('common.stock')}</th><th>{t('common.unit')}</th></tr></thead>
            <tbody>
              {catalog.map((p) => (
                <tr key={p.id} onClick={() => addProduct(p, null)} style={{ cursor: 'pointer' }}>
                  <td>{p.categoryName ?? ''}</td><td>{p.name}</td><td>{p.description ?? ''}</td>
                  <td>{p.barcode ?? ''}</td><td>{p.stockQty}</td><td>{Number(p.basePrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>{t('common.cart')}</h4>
          <table className="wh-table">
            <thead><tr><th>{t('common.item')}</th><th>{t('common.pricing')}</th><th>{t('common.price')}</th><th>{t('common.quantity')}</th><th>{t('common.grandTotal')}</th><th></th></tr></thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.key} className="wh-active" onClick={() => setSelectedKey(l.key)}
                  style={selectedKey === l.key ? { outline: '2px solid var(--link-color)' } : undefined}>
                  <td>{l.name}</td><td>{l.unitName}</td><td>{l.price.toFixed(2)}</td>
                  <td>
                    <button className="wh-btn" onClick={(ev) => { ev.stopPropagation(); setQty(l.key, l.qty - 1); }} style={{ minWidth: 30 }}>−</button>
                    <input type="number" min={0.1} step={1} value={l.qty} onChange={(e) => setQty(l.key, Number(e.target.value))} style={{ width: 60, textAlign: 'center' }} onClick={(ev) => ev.stopPropagation()} />
                    <button className="wh-btn" onClick={(ev) => { ev.stopPropagation(); setQty(l.key, l.qty + 1); }} style={{ minWidth: 30 }}>+</button>
                  </td>
                  <td>{(l.price * l.qty).toFixed(2)}</td>
                  <td><button className="wh-btn" onClick={() => remove(l.key)}>x</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="wh-total-box">{t('common.items')} {count()}<br />{t('common.invoiceTotal')} {subtotal().toFixed(2)} ج.م</div>
          {orderType === 'delivery' && (
            <div style={{ marginTop: 6 }}>{t('pos.delivery')}: <input type="number" min={0} value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value))} style={{ width: 90 }} /></div>
          )}
          {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
        </div>
      </div>
      <div className="bottom-bar">
        <button className="wh-btn">{t('common.ordersBtn')}</button>
        <button className="wh-btn">{t('common.purchasesBtn')}</button>
        <button className="wh-btn">{t('common.itemsBtn')}</button>
        <button className="wh-btn">{t('cashier.returns')}</button>
        <button className="wh-btn">{t('common.expensesBtn')}</button>
        <button className="wh-btn" onClick={() => window.whDesktop?.openDrawer().catch(() => setMsg(t('pos.noPrinter')))}>{t('cashier.openDrawer')}</button>
        <button className="wh-btn" onClick={() => { if (printableOrder) printOrder(printableOrder); }}>{t('cashier.printCopy')}</button>
        <button className="wh-btn" onClick={() => requestEndShift()}>{t('common.endShift')}</button>
        <button className="wh-btn" onClick={doHold}>F9 {t('common.holdBtn')}</button>
        <button className="wh-btn wh-btn-primary" onClick={openPay}>F12 {t('common.confirmBtn')}</button>
      </div>

      {showPay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60, display: 'grid', placeItems: 'center', padding: 12, overflow: 'auto' }}>
          <div className="wh-modal" style={{ width: 'min(440px, calc(100vw - 24px))', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{t('pos.payTitle')}</strong>
              <button className="wh-btn" onClick={() => setShowPay(false)}>X</button>
            </div>
            <div style={{ margin: '8px 0' }}>{t('common.total')}: <strong>{total.toFixed(2)} EGP</strong></div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
              {(['cash', 'card', 'mixed'] as const).map((m) => (
                <button key={m} className="wh-btn" onClick={() => setMethod(m)}
                  style={method === m ? { background: 'var(--bg-surface)', fontWeight: 'bold' } : {}}>
                  {t(`pos.${m}`)}
                </button>
              ))}
            </div>
            {method === 'cash' && (
              <div style={{ marginBottom: 8 }}>
                <label>{t('pos.tendered')}</label>
                <input ref={tenderedRef} type="number" min={0} value={tendered} onChange={(e) => setTendered(e.target.value)}
                  style={{ width: '100%' }} onKeyDown={(e) => { if (e.key === 'Enter') submitPay(); }} />
                <div>{t('pos.change')}: <strong>{(tendered === '' ? 0 : changePreview).toFixed(2)}</strong></div>
              </div>
            )}
            {method === 'mixed' && (
              <div style={{ marginBottom: 8, display: 'grid', gap: 6 }}>
                <div><label>{t('pos.cashAmt')}</label><input type="number" min={0} value={cashAmt} onChange={(e) => setCashAmt(e.target.value)} style={{ width: '100%' }} /></div>
                <div><label>{t('pos.cardAmt')}</label><input type="number" min={0} value={cardAmt} onChange={(e) => setCardAmt(e.target.value)} style={{ width: '100%' }} onKeyDown={(e) => { if (e.key === 'Enter') submitPay(); }} /></div>
              </div>
            )}
            <div style={{ marginBottom: 8 }}>
              <label>{t('pos.discountCode')}</label>
              <input value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} style={{ width: '100%' }} />
            </div>
            <button className="wh-btn wh-btn-primary" onClick={submitPay} disabled={submitting} style={{ width: '100%' }}>
              {submitting ? t('pos.completing') : `F12 ${t('common.confirmBtn')}`}
            </button>
          </div>
        </div>
      )}

      {lastSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60, display: 'grid', placeItems: 'center', padding: 12, overflow: 'auto' }}>
          <div className="wh-modal" style={{ width: 'min(420px, calc(100vw - 24px))', maxHeight: '90vh', overflowY: 'auto', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0 }}>{t('pos.saleDone')}</h3>
            <div>{t('pos.orderNo')} {lastSale.reference}</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', margin: '8px 0' }}>{t('common.total')}: {Number(lastSale.total).toFixed(2)} EGP</div>
            {lastSale.changeAmount > 0 && <div>{t('pos.change')}: {Number(lastSale.changeAmount).toFixed(2)}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="wh-btn wh-btn-primary" style={{ flex: 1 }} onClick={() => printOrder(lastSale)}>{t('pos.printReceipt')}</button>
              <button className="wh-btn" style={{ flex: 1 }} onClick={() => { setLastSale(null); setPrintableOrder(null); }}>{t('pos.newSale')}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', left: -9999, top: 0 }} aria-hidden>
        {printableOrder?.isReturn ? (
          <ReturnReceiptView ref={receiptRef} order={printableOrder} />
        ) : (
          <ReceiptPrintView ref={receiptRef} order={printableOrder} />
        )}
      </div>
      {showNewProduct && (
        <NewProductModal
          barcode={showNewProduct}
          onClose={() => setShowNewProduct(null)}
          onSaved={(p) => {
            addLine({ productId: p.id, unitId: null, name: p.name, unitName: t('common.unit'), price: p.basePrice, qty: 1 });
            setShowNewProduct(null);
            setMsg('');
            load();
          }}
        />
      )}
    </div>
  );
}
