import { useEffect, useState } from 'react';
import { partiesApi } from '../../services/api/erp.api';

// F2 customer picker — uses existing GET /parties?type=customer. No backend change.
export function CustomerPickerModal({ onClose, onPick }: { onClose: () => void; onPick: (c: any | null) => void }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    partiesApi.list('customer').then(setRows).catch(() => setRows([]));
  }, []);
  const filtered = rows.filter((c) => {
    const s = q.trim();
    if (!s) return true;
    return String(c.name ?? '').includes(s) || String(c.phone ?? '').includes(s);
  });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60, display: 'grid', placeItems: 'center' }}>
      <div className="wh-modal" style={{ width: 480, maxHeight: '85vh', overflow: 'auto' }}>
        <div className="wh-modal-title">
          <strong>اختيار عميل (F2)</strong>
          <span style={{ display: 'flex', gap: 4 }}>
            <button className="wh-btn" title="مساعدة">؟</button>
            <button className="wh-btn" onClick={onClose}>X</button>
          </span>
        </div>
        <input placeholder="بحث بالاسم أو الهاتف" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
        <table className="wh-table">
          <thead><tr><th>العميل</th><th>الهاتف</th><th></th></tr></thead>
          <tbody>
            <tr className="wh-pink">
              <td>عميل نقدي</td><td>—</td>
              <td><button className="wh-btn" onClick={() => { onPick(null); onClose(); }}>اختيار</button></td>
            </tr>
            {filtered.map((c) => (
              <tr key={c.id} className="wh-pink">
                <td>{c.name}</td><td>{c.phone ?? ''}</td>
                <td><button className="wh-btn" onClick={() => { onPick(c); onClose(); }}>اختيار</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button className="wh-btn" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
