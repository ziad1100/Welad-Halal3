// Return receipt variant — Arabic always, NEVER use i18n t() here
import { forwardRef } from 'react';

function fmtArDate(v: any) {
  try {
    const d = new Date(v);
    const date = d.toLocaleDateString('ar-EG');
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const marker = h < 12 ? 'ص' : 'م';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${date} ${h12}:${m} ${marker}`;
  } catch {
    return '';
  }
}

export const ReturnReceiptView = forwardRef<HTMLDivElement, { order: any; storeSettings?: any; paper?: '58mm' | '80mm' }>(
  function ReturnReceiptView({ order, storeSettings, paper = '80mm' }, ref) {
    if (!order) return null;
    const narrow = paper === '58mm';
    const width = narrow ? '58mm' : '80mm';
    const fs = narrow ? 11 : 13;
    const name = storeSettings?.storeName ?? 'ولاد حلال';
    const cashier = order.user?.username ?? order.user?.fullName ?? order.cashierName ?? '';
    const rule = narrow ? '--------------------------' : '--------------------------------';
    return (
      <div
        ref={ref}
        className="receipt-print-area"
        style={{ width, fontFamily: 'Tahoma', textAlign: 'center', direction: 'rtl', color: '#000', background: '#fff', fontSize: fs, lineHeight: 1.5, padding: '2mm' }}
      >
        <div style={{ fontWeight: 'bold', fontSize: fs + 4 }}>{name}</div>
        <div style={{ border: '2px solid #000', display: 'inline-block', padding: '2px 12px', margin: '6px 0', fontWeight: 'bold' }}>
          مرتجع RETURN
        </div>
        <div>{rule}</div>
        <div>رقم الفاتورة الأصلية: #{order.reference ?? order.id}</div>
        <div>{fmtArDate(order.createdAt)}</div>
        {cashier ? <div>الكاشير: {cashier}</div> : null}
        <div>الحالة: مرتجع</div>
        <div>{rule}</div>
        <div style={{ textAlign: 'right' }}>
          {(order.items ?? order.lines ?? []).map((it: any, i: number) => (
            <div key={it.id ?? i} className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
              <span style={{ overflowWrap: 'anywhere' }}>-{Math.abs(it.qty ?? it.quantity ?? 1)}x {it.productName ?? it.name} (مرتجع)</span>
              <span style={{ whiteSpace: 'nowrap' }}>{Number(it.lineTotal ?? 0).toFixed(2)} EGP</span>
            </div>
          ))}
        </div>
        <div>{rule}</div>
        <div style={{ fontWeight: 'bold', fontSize: fs + 4 }}>المبلغ المسترد: {Number(order.total ?? 0).toFixed(2)} EGP</div>
        {order.returnReason && <div>سبب الإرجاع: {order.returnReason}</div>}
        <div>شكراً لتسوقك من ولاد حلال</div>
        <div>Thank you for shopping with Welad Halal!</div>
        <div>• • •</div>
      </div>
    );
  },
);
