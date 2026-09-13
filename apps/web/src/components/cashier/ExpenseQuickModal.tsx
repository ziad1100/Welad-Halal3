import { useState } from 'react';
import { expensesApi } from '../../services/api/erp.api';

// Quick expense entry — uses existing POST /expenses.
export function ExpenseQuickModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [category, setCategory] = useState('عام');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  async function save() {
    setMsg('');
    try {
      await expensesApi.create({ category, amount: Number(amount), note: note || undefined });
      onSaved?.();
      onClose();
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Save failed');
    }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60, display: 'grid', placeItems: 'center' }}>
      <div className="wh-modal" style={{ width: 400 }}>
        <div className="wh-modal-title">
          <strong>المصروفات — إدخال سريع</strong>
          <button className="wh-btn" onClick={onClose}>X</button>
        </div>
        <label>البند:</label>
        <input value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
        <label>المبلغ:</label>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} style={{ width: '100%', marginBottom: 6 }} />
        <label>ملاحظة:</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
        {msg && <div style={{ color: 'red', marginBottom: 6 }}>{msg}</div>}
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="wh-btn" onClick={save}>💾 حفظ</button>
          <button className="wh-btn" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
