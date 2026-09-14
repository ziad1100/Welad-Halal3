import { useState } from 'react';
import { Modal } from '../shared/ui';
import { useDir } from '../../store/lang';

/** Cash payment dialog (F10): subtotal/discount/total + amount paid + change.
 *  Paid must cover the total; change is computed here for display but the
 *  backend re-validates and records the authoritative payment row. */
export function PaymentModal({ subtotal, discount, total, onClose, onPay }: {
  subtotal: number;
  discount: number;
  total: number;
  onClose: () => void;
  onPay: (amountPaid: number) => void;
}) {
  const dir = useDir();
  const [paid, setPaid] = useState(total > 0 ? total.toFixed(2) : '');
  const [err, setErr] = useState('');
  const paidNum = Number(paid);
  const valid = paid !== '' && Number.isFinite(paidNum) && paidNum >= 0;
  const change = valid ? Math.max(0, paidNum - total) : 0;
  const short = valid && paidNum < total;

  function submit() {
    if (!valid) { setErr('أدخل مبلغًا صحيحًا'); return; }
    if (paidNum < total) { setErr(`المبلغ أقل من الإجمالي (${total.toFixed(2)})`); return; }
    onPay(Math.round(paidNum * 100) / 100);
  }

  return (
    <Modal title="الدفع نقدًا (F10)" onClose={onClose} footer={<>
      <button className="kbtn kbtn-primary" disabled={!valid || short} onClick={submit}>تأكيد الدفع (F12)</button>
      <button className="kbtn" onClick={onClose}>إلغاء (Esc)</button>
    </>}>
      <div dir={dir}>
        {err && <div className="kerr">{err}</div>}
        <div className="krow"><span className="klabel">المجموع الفرعي</span><b>{subtotal.toFixed(2)} ج.م</b></div>
        {discount > 0 && <div className="krow"><span className="klabel">الخصم</span><b>-{discount.toFixed(2)} ج.م</b></div>}
        <div className="krow"><span className="klabel">الإجمالي</span><b style={{ fontSize: 18 }}>{total.toFixed(2)} ج.م</b></div>
        <div className="krow"><span className="klabel">المدفوع</span>
          <input className="kinput" type="number" min={0} step="any" autoFocus value={paid}
            onChange={(e) => { setPaid(e.target.value); setErr(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} style={{ width: 160 }} />
        </div>
        <div className="krow"><span className="klabel">الباقي</span>
          <b style={{ fontSize: 18, color: short ? '#E5484D' : 'inherit' }}>{change.toFixed(2)} ج.م</b></div>
        {short && <div className="kerr">المبلغ المدفوع أقل من الإجمالي المطلوب</div>}
      </div>
    </Modal>
  );
}
