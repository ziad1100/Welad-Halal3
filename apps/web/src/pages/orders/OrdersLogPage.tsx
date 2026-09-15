import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listOrders, returnOrder } from '../../services/api/orders.api';
import { useReceiptPrinter } from '../../hooks/useReceiptPrinter';
import { ReceiptPrintView } from '../../components/receipt/ReceiptPrintView';
import { ReturnReceiptView } from '../../components/receipt/ReturnReceiptView';
import { toast } from '../../lib/printer';

export function OrdersLogPage() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const { receiptRef, printableOrder, printOrder } = useReceiptPrinter();
  useEffect(() => { listOrders().then(setOrders).catch(() => {}); }, []);
  async function refresh() {
    try { setOrders(await listOrders()); } catch { /* ignore */ }
  }
  async function handleReturn(o: any) {
    // Real backend return: restock + return_in movement + audit, then return receipt
    const reason = prompt(t('pos.returnReason'), '') ?? '';
    try {
      const ret = await returnOrder(o.id, { reason: reason || undefined });
      const receipt = { ...ret, isReturn: true, returnReason: reason || undefined };
      toast(t('orders.returnedMessage', { orderNumber: o.reference ?? o.id }));
      await refresh();
      await printOrder(receipt);
    } catch (e: any) {
      toast(e?.response?.data?.message ?? t('pos.saleFailed'));
    }
  }
  const locale = i18n.language === 'en' ? 'en-US' : 'ar-EG';
  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3>{t('orders.log')}</h3>
        <button className="wh-btn" onClick={() => window.print()}>{t('common.print')}</button>
        <button className="wh-btn" onClick={refresh}>{t('common.refresh')}</button>
      </div>
      <div className="printable-content">
      <div className="table-scroll">
      <table className="wh-table">
        <thead><tr><th>{t('common.orderNumber')}</th><th>{t('common.status')}</th><th>{t('common.orderType')}</th><th>{t('common.total')}</th><th>{t('common.orderDate')}</th><th></th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.reference}</td><td>{o.status}</td><td>{o.type}</td>
              <td>{Number(o.total).toFixed(2)}</td><td>{new Date(o.createdAt).toLocaleString(locale)}</td>
              <td><button className="wh-btn" onClick={() => printOrder(o)}>{t('common.printCopy')}</button>{' '}
                <button className="wh-btn" onClick={() => handleReturn(o)}>{t('common.returnAction')}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      </div>
      <div style={{ position: 'absolute', left: -9999, top: 0 }} aria-hidden>
        {printableOrder?.isReturn ? (
          <ReturnReceiptView ref={receiptRef} order={printableOrder} />
        ) : (
          <ReceiptPrintView ref={receiptRef} order={printableOrder} />
        )}
      </div>
    </div>
  );
}
