import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listOrders } from '../../services/api/orders.api';
import { getStoredPrinter } from '../../lib/printer';
import { buildTestPrintOrder, useReceiptPrinter } from '../../hooks/useReceiptPrinter';
import { ReceiptPrintView } from '../../components/receipt/ReceiptPrintView';
import { ReturnReceiptView } from '../../components/receipt/ReturnReceiptView';

declare global {
  interface Window {
    whDesktop?: { printReceipt: (text: string) => Promise<any>; openDrawer: () => Promise<any> };
  }
}

export function PrintingCenterPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [paper, setPaper] = useState<'58mm' | '80mm'>('80mm');
  const [copies, setCopies] = useState(1);
  const [status, setStatus] = useState('');
  const [printing, setPrinting] = useState(false);
  const { receiptRef, printableOrder, setPrintableOrder, printOrder } = useReceiptPrinter();

  useEffect(() => {
    listOrders().then((rows) => {
      setOrders(rows);
      if (rows.length) {
        setSelected(rows[0]);
        setPrintableOrder(rows[0]);
      }
    }).catch(() => {});
  }, [setPrintableOrder]);

  const stored = getStoredPrinter();
  const transport = window.whDesktop ? 'desktop' : stored ? 'usb' : 'browser';
  const transportLabel =
    transport === 'desktop' ? t('pos.desktopPrinting') : transport === 'usb' ? t('pos.connected') : t('pos.browserPrinting');

  async function pick(o: any) {
    setSelected(o);
    setPrintableOrder(o);
    setStatus('');
  }

  async function doPrint() {
    if (!selected || printing) return;
    setPrinting(true);
    setStatus(t('pos.printing'));
    try {
      const how = await printOrder(selected, copies);
      setStatus(how === 'browser' ? t('pos.useSystemDialog') : `${transportLabel} ✓`);
    } catch {
      setStatus(t('pos.printFailed'));
    } finally {
      setPrinting(false);
    }
  }

  async function doTest() {
    if (printing) return;
    setPrinting(true);
    setStatus(t('pos.printing'));
    try {
      const how = await printOrder(buildTestPrintOrder(paper), 1);
      setStatus(how === 'browser' ? t('pos.useSystemDialog') : `${transportLabel} ✓`);
    } catch {
      setStatus(t('pos.printFailed'));
    } finally {
      setPrinting(false);
      if (selected) setPrintableOrder(selected);
    }
  }

  return (
    <div style={{ padding: 8 }}>
      <h3>{t('pos.centerTitle')}</h3>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>{t('pos.printer')}: <strong style={{ color: transport === 'browser' ? 'var(--warning-color)' : 'var(--success-color)' }}>{transportLabel}</strong></span>
        {!stored && !window.whDesktop && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('pos.noPrinter')} — {t('pos.useSystemDialog')}</span>}
      </div>
      <div className="printing-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: 12 }}>
        <div>
          <h4>{t('pos.recentOrders')}</h4>
          <div className="table-scroll" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          <table className="wh-table">
            <thead><tr><th>#</th><th>{t('common.total')}</th><th></th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} onClick={() => pick(o)}
                  style={selected?.id === o.id ? { background: 'var(--wh-row-sel)', color: '#fff', cursor: 'pointer' } : { cursor: 'pointer' }}>
                  <td>{o.reference}</td><td>{Number(o.total).toFixed(2)}</td>
                  <td>{o.status === 'returned' ? t('pos.returnReceipt') : t('pos.saleReceipt')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {!orders.length && <div style={{ color: 'var(--text-secondary)' }}>{t('orders.pendingEmpty', { defaultValue: 'No orders.' })}</div>}
        </div>
        <div>
          <h4>{t('common.print')} — {t('pos.paper')}</h4>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label><input type="radio" checked={paper === '58mm'} onChange={() => setPaper('58mm')} /> 58mm</label>
            <label><input type="radio" checked={paper === '80mm'} onChange={() => setPaper('80mm')} /> 80mm</label>
            <span>{t('pos.copies')}:
              <button className="wh-btn" onClick={() => setCopies((c) => Math.max(1, c - 1))}>-</button>
              <strong style={{ margin: '0 8px' }}>{copies}</strong>
              <button className="wh-btn" onClick={() => setCopies((c) => Math.min(9, c + 1))}>+</button>
            </span>
          </div>
          <div style={{ border: '1px dashed var(--border-color)', padding: 12, marginBottom: 8, overflowX: 'auto', background: '#fff' }}>
            {!selected && <div style={{ color: '#555' }}>{t('pos.selectOrder')}</div>}
            {selected && (selected.status === 'returned'
              ? <ReturnReceiptView order={{ ...selected, isReturn: true }} paper={paper} />
              : <ReceiptPrintView order={selected} paper={paper} />)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="wh-btn" onClick={doTest} disabled={printing}>{t('pos.testPrint')}</button>
            <button className="wh-btn wh-btn-primary" onClick={doPrint} disabled={!selected || printing}>{t('pos.printNow')}</button>
          </div>
          {status && <div style={{ marginTop: 8 }}>{status}</div>}
        </div>
      </div>
      {/* hidden isolated print target */}
      <div style={{ position: 'fixed', left: -9999, top: 0 }} aria-hidden>
        {printableOrder?.isReturn || printableOrder?.status === 'returned' ? (
          <ReturnReceiptView ref={receiptRef} order={printableOrder} paper={paper} />
        ) : (
          <ReceiptPrintView ref={receiptRef} order={printableOrder} paper={paper} />
        )}
      </div>
    </div>
  );
}
