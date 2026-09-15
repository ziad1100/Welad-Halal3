// 58/80mm thermal receipt — Arabic always, EGP only (NEVER use i18n t() here)
import { forwardRef } from 'react';

type Props = {
  order: any;
  storeSettings?: { storeName?: string; storePhone?: string };
  storePhone?: string;
  paper?: '58mm' | '80mm';
};

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
  { order, storeSettings, storePhone, paper = '80mm' },
  ref,
) {
  if (!order) return null;
  const narrow = paper === '58mm';
  const width = narrow ? '58mm' : '80mm';
  const fs = narrow ? 11 : 13;
  const totalFs = narrow ? 15 : 20;
  const phone = storeSettings?.storePhone ?? storePhone ?? '';
  const name = storeSettings?.storeName ?? 'ولاد حلال';
  const showDelivery = Number(order.deliveryFee ?? 0) > 0;
  const showDiscount = Number(order.discountTotal ?? 0) > 0;
  const customer = order.customer?.name ?? order.customerName ?? 'عميل';
  const cashier = order.user?.username ?? order.user?.fullName ?? order.cashierName ?? '';
  const branch = order.branch?.name ?? order.branchName ?? '';
  const payMethod = order.paymentMethodLabel ?? order.paymentMethod ?? 'نقدي';
  const rule = narrow ? '--------------------------' : '--------------------------------';
  const heavy = narrow ? '==========================' : '================================';
  return (
    <div
      ref={ref}
      className="receipt-print-area"
      style={{ width, fontFamily: 'Tahoma', textAlign: 'center', direction: 'rtl', color: '#000', background: '#fff', fontSize: fs, lineHeight: 1.5, padding: '2mm' }}
    >
      <div style={{ fontWeight: 'bold', fontSize: fs + 4 }}>{name}</div>
      <div style={{ fontSize: fs - 1 }}>WELAD HALAL POS</div>
      {phone ? <div>{phone}</div> : null}
      {branch ? <div>الفرع: {branch}</div> : null}
      <div>{rule}</div>
      <div>طلب #{order.reference ?? order.id}</div>
      <div>{fmtArDate(order.createdAt)}</div>
      {cashier ? <div>الكاشير: {cashier}</div> : null}
      <div>{rule}</div>
      <div>العميل: {customer}</div>
      <div>الحالة: {order.statusLabel ?? 'تم التأكيد'}</div>
      <div>{rule}</div>
      <div style={{ textAlign: 'right' }}>
        {(order.items ?? order.lines ?? []).map((it: any, i: number) => (
          <div key={it.id ?? i} className="receipt-line" style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
            <span style={{ overflowWrap: 'anywhere' }}>{it.qty ?? it.quantity ?? 1}x {it.productName ?? it.name}{it.unitName ? ` (${it.unitName})` : ''}</span>
            <span style={{ whiteSpace: 'nowrap' }}>{Number(it.lineTotal ?? (it.price ?? 0) * (it.qty ?? 1)).toFixed(2)} EGP</span>
          </div>
        ))}
      </div>
      <div>{rule}</div>
      <div>المجموع الفرعي: {Number(order.subtotal ?? order.total ?? 0).toFixed(2)} EGP</div>
      {showDiscount && <div>الخصم: {Number(order.discountTotal).toFixed(2)} EGP</div>}
      {showDelivery && <div>التوصيل: {Number(order.deliveryFee).toFixed(2)} EGP</div>}
      <div>{heavy}</div>
      <div style={{ fontWeight: 'bold', fontSize: totalFs }}>الإجمالي: {Number(order.total ?? 0).toFixed(2)} EGP</div>
      <div>الدفع: {payMethod}</div>
      {order.paidAmount != null && <div>المدفوع: {Number(order.paidAmount).toFixed(2)}</div>}
      {Number(order.changeAmount ?? 0) > 0 && <div>الباقي: {Number(order.changeAmount).toFixed(2)}</div>}
      {order.notes && <div>ملاحظات: {order.notes}</div>}
      <div>شكراً لتسوقك من ولاد حلال</div>
      <div>Thank you for shopping with Welad Halal!</div>
      <div>• • •</div>
    </div>
  );
});
