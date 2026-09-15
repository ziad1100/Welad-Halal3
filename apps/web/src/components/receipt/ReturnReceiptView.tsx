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

export const ReturnReceiptView = forwardRef<HTMLDivElement, { order: any; storeSettings?: any }>(
  function ReturnReceiptView({ order, storeSettings }, ref) {
    if (!order) return null;
    const name = storeSettings?.storeName ?? 'ولاد حلال';
    return (
      <div
        ref={ref}
        className="receipt-print-area"
        style={{ width: '80mm', fontFamily: 'Tahoma', textAlign: 'center', direction: 'rtl', color: '#000', background: '#fff' }}
      >
        <h2 style={{ margin: 0, fontWeight: 'bold' }}>{name}</h2>
        <div style={{ border: '2px solid #000', display: 'inline-block', padding: '2px 12px', margin: '6px 0', fontWeight: 'bold' }}>
          إيصال مرتجع
        </div>
        <div>--------------------------------</div>
        <div>طلب #{order.reference ?? order.id}</div>
        <div>{fmtArDate(order.createdAt)}</div>
        <div>--------------------------------</div>
        <div>العميل: {order.customer?.name ?? order.customerName ?? 'عميل'}</div>
        <div>الحالة: مرتجع</div>
        <div>--------------------------------</div>
        <div style={{ textAlign: 'right' }}>
          {(order.items ?? order.lines ?? []).map((it: any, i: number) => (
            <div key={it.id ?? i} className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>-{Math.abs(it.qty ?? it.quantity ?? 1)}x {it.productName ?? it.name} (مرتجع)</span>
              <span>{Number(it.lineTotal ?? 0).toFixed(2)} EGP</span>
            </div>
          ))}
        </div>
        <div>--------------------------------</div>
        <div style={{ fontWeight: 'bold', fontSize: 20 }}>الإجمالي المرتجع: {Number(order.total ?? 0).toFixed(2)} EGP</div>
        <div>شكراً لتسوقك من ولاد حلال</div>
        <div>Thank you for shopping with Welad Halal!</div>
        <div>• • •</div>
      </div>
    );
  },
);
