import { useState } from 'react';
import { expensesApi } from '../../services/api/erp.api';
import { Modal } from '../shared/ui';
import { SearchableDatalist } from '../shared/SearchableDatalist';

const EXPENSE_CATEGORIES = [
  { value: 'general', label: 'عام' },
  { value: 'supplies', label: 'مستلزمات' },
  { value: 'salaries', label: 'رواتب' },
  { value: 'utilities', label: 'مرافق' },
  { value: 'maintenance', label: 'صيانة' },
];

function errMsg(e: any): string {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join('، ');
  if (typeof m === 'string' && m.trim()) return m;
  return 'حدث خطأ — حاول مرة أخرى';
}

/** Quick expense entry from the cashier screen — writes to the expenses table. */
export function ExpenseModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('general');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) { setErr('أدخل عنوان المصروف'); return; }
    if (!(Number(amount) > 0)) { setErr('أدخل مبلغًا صحيحًا'); return; }
    setErr(''); setBusy(true);
    try {
      await expensesApi.create({ category, amount: Number(amount), note: `${title.trim()}${notes.trim() ? ` — ${notes.trim()}` : ''}` });
      onDone(`تم تسجيل المصروف: ${title.trim()} — ${Number(amount)}`);
      onClose();
    } catch (e: any) { setErr(errMsg(e)); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="مصروف سريع" onClose={onClose} footer={<>
      <button className="kbtn kbtn-primary" disabled={busy} onClick={submit}>حفظ المصروف</button>
      <button className="kbtn" onClick={onClose}>إلغاء</button>
    </>}>
      {err && <div className="kerr">{err}</div>}
      <div className="krow"><span className="klabel">العنوان</span>
        <input className="kinput" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1 }} /></div>
      <div className="krow"><span className="klabel">المبلغ</span>
        <input className="kinput" type="number" min={0.01} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: 140 }} /></div>
      <div className="krow"><SearchableDatalist label="التصنيف" value={category}
        options={EXPENSE_CATEGORIES} placeholder="اكتب أو اختر التصنيف…"
        onChange={(v) => setCategory(v || 'general')} /></div>
      <div className="krow"><span className="klabel">ملاحظات</span>
        <input className="kinput" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ flex: 1 }} /></div>
    </Modal>
  );
}
