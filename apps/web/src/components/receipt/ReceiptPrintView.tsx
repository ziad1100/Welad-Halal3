// 80mm thermal receipt — Arabic always, EGP only (NEVER use i18n t() here)
import { forwardRef } from 'react';

type StoreSettings = { storeName?: string; storePhone?: string };
type Props = { order: any; storeSettings?: StoreSettings; storePhone?: string };

// Arabic ص/م date marker
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

export const ReceiptPrintView = forwardRef<HTMLDivElement, Props>(function ReceiptPrintView(
  { order, storeSettings, storePhone },
  ref,
) {
  if (!order) return null;
  const phone = storeSettings?.storePhone ?? storePhone ?? '';
  const name = storeSettings?.storeName ?? 'ولاد حلال';
  const showDelivery = Number(order.deliveryFee ?? 0) > 0;
  const customer = order.customer?.name ?? order.customerName ?? 'عميل';
  const status = order.statusLabel ?? 'تم التأكيد';
  const payMethod = order.paymentMethodLabel ?? order.paymentMethod ?? 'نقدي';
  return (
    <div
      ref={ref}
      className="receipt-print-area"
      style={{ width: '80mm', fontFamily: 'Tahoma', textAlign: 'center', direction: 'rtl', color: '#000', background: '#fff' }}
    >
      <h2 style={{ margin: 0, fontWeight: 'bold' }}>{name}</h2>
      {phone ? <div>{phone}</div> : null}
      <div>--------------------------------</div>
      <div>طلب #{order.reference ?? order.id}</div>
      <div>{fmtArDate(order.createdAt)}</div>
      <div>--------------------------------</div>
      <div>العميل: {customer}</div>
      <div>الحالة: {status}</div>
      <div>--------------------------------</div>
      <div style={{ textAlign: 'right' }}>
        {(order.items ?? order.lines ?? []).map((it: any, i: number) => (
          <div key={it.id ?? i} className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{it.qty ?? it.quantity ?? 1}x {it.productName ?? it.name}</span>
            <span>{Number(it.lineTotal ?? (it.price ?? 0) * (it.qty ?? 1)).toFixed(2)} EGP</span>
          </div>
        ))}
      </div>
      <div>--------------------------------</div>
      <div>المجموع الفرعي: {Number(order.subtotal ?? order.total ?? 0).toFixed(2)} EGP</div>
      {showDelivery && <div>التوصيل: {Number(order.deliveryFee).toFixed(2)} EGP</div>}
      <div>================================</div>
      <div style={{ fontWeight: 'bold', fontSize: 20 }}>الإجمالي: {Number(order.total ?? 0).toFixed(2)} EGP</div>
      <div>الدفع: {payMethod}</div>
      <div>شكراً لتسوقك من ولاد حلال</div>
      <div>Thank you for shopping with Welad Halal!</div>
      <div>• • •</div>
    </div>
  );
});
