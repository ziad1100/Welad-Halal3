import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { barcodeLookup, listCategories, searchProducts } from '../../services/api/products.api';
import { confirmOrder, holdOrder } from '../../services/api/orders.api';
import { useCart } from '../../store/cartStore';
import { useOrder } from '../../store/orderStore';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useReceiptPrinter } from '../../hooks/useReceiptPrinter';
import { requestEndShift } from '../../components/shift/ShiftGate';
import { ReceiptPrintView } from '../../components/receipt/ReceiptPrintView';
import { ReturnReceiptView } from '../../components/receipt/ReturnReceiptView';
import { NewProductModal } from '../../components/cashier/NewProductModal';

export function CashierPage() {
  const { t } = useTranslation();
  const { lines, addLine, setQty, remove, clear, subtotal, count, orderType, setOrderType } = useCart();
  const setLastOrder = useOrder((s) => s.setLastOrder);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [catId, setCatId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [msg, setMsg] = useState('');
  const [showNewProduct, setShowNewProduct] = useState<string | null>(null);
  const { receiptRef, printableOrder, printOrder } = useReceiptPrinter();

  const load = useCallback(async () => {
    const data = await searchProducts(search, catId);
    setCatalog(data);
  }, [search, catId]);

  useEffect(() => {
    listCategories().then(setCats).catch(() => {});
  }, []);
  useEffect(() => {
    const t2 = setTimeout(load, 200);
    return () => clearTimeout(t2);
  }, [load]);

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

  async function doConfirm() {
    setMsg('');
    try {
      const order = await confirmOrder({
        lines: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, qty: l.qty })),
        type: orderType,
        paymentMethod: 'cash',
      });
      setLastOrder(order);
      clear();
      setMsg(t('cashier.confirmedMsg', { reference: order.reference, total: Number(order.total).toFixed(2) }));
      // Part 1.4: receipt print after successful F12 confirm
      await printOrder(order);
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Confirm failed');
    }
  }

  async function doHold() {
    setMsg('');
    try {
      const order = await holdOrder({
        lines: lines.map((l) => ({ productId: l.productId, unitId: l.unitId, qty: l.qty })),
        type: orderType,
      });
      clear();
      setMsg(t('cashier.heldMsg', { reference: order.reference }));
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Hold failed');
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F9') { e.preventDefault(); doHold(); }
      if (e.key === 'F12') { e.preventDefault(); doConfirm(); }
      if (e.key === 'F2') { e.preventDefault(); document.getElementById('barcode-input')?.focus(); }
      if (e.key === 'F4') { e.preventDefault(); document.getElementById('search-input')?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

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
      <div style={{ display: 'flex', gap: 8, padding: 6 }}>
        <input id="search-input" placeholder={t('common.searchPh')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select value={catId} onChange={(e) => setCatId(e.target.value)}>
          <option value="">{t('common.allCats')}</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="cashier-grid">
        <div style={{ overflow: 'auto' }}>
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
                <tr key={l.key} className="wh-active">
                  <td>{l.name}</td><td>{l.unitName}</td><td>{l.price.toFixed(2)}</td>
                  <td><input type="number" min={0.1} step={1} value={l.qty} onChange={(e) => setQty(l.key, Number(e.target.value))} style={{ width: 70 }} /></td>
                  <td>{(l.price * l.qty).toFixed(2)}</td>
                  <td><button className="wh-btn" onClick={() => remove(l.key)}>x</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="wh-total-box">{t('common.items')} {count()}<br />{t('common.invoiceTotal')} {subtotal().toFixed(2)} ج.م</div>
          {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
        </div>
      </div>
      <div className="bottom-bar">
        <button className="wh-btn">{t('common.ordersBtn')}</button>
        <button className="wh-btn">{t('common.purchasesBtn')}</button>
        <button className="wh-btn">{t('common.itemsBtn')}</button>
        <button className="wh-btn">{t('cashier.returns')}</button>
        <button className="wh-btn">{t('common.expensesBtn')}</button>
        <button className="wh-btn">{t('cashier.openDrawer')}</button>
        <button className="wh-btn" onClick={() => { if (printableOrder) printOrder(printableOrder); }}>{t('cashier.printCopy')}</button>
        <button className="wh-btn" onClick={() => requestEndShift()}>{t('common.endShift')}</button>
        <button className="wh-btn" onClick={doHold}>{t('common.holdBtn')}</button>
        <button className="wh-btn" onClick={doConfirm}>{t('common.confirmBtn')}</button>
      </div>
      {/* hidden isolated receipt (Part 1.4) — off-screen, only for print */}
      <div style={{ position: 'absolute', left: -9999, top: 0 }} aria-hidden>
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
            load();
          }}
        />
      )}
    </div>
  );
}
