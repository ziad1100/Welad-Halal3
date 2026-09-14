import { useEffect, useRef, useState } from 'react';
import { partiesApi } from '../../services/api/erp.api';
import { validateOptionalPhone } from '../../utils/phone';
import { Modal } from '../shared/ui';

function errMsg(e: any): string {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join('، ');
  if (typeof m === 'string' && m.trim()) return m;
  return 'حدث خطأ — حاول مرة أخرى';
}

export function CustomerModal({ onClose, onSelect }: { onClose: () => void; onSelect: (c: any) => void }) {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [err, setErr] = useState('');
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  async function load(q: string) {
    setFetching(true);
    try {
      const all = await partiesApi.list('customer');
      const s = q.trim();
      setRows(!s ? all : all.filter((c: any) => String(c.name ?? '').includes(s) || String(c.phone ?? '').includes(s)));
    } catch {
      setRows([]);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => { searchRef.current?.focus(); void load(''); }, []);
  useEffect(() => { setActive(0); }, [search]);

  async function create() {
    setErr('');
    if (!form.name.trim()) { setErr('أدخل اسم العميل'); return; }
    const phoneErr = validateOptionalPhone(form.phone);
    if (phoneErr) { setErr(phoneErr); return; }
    try {
      const c = await partiesApi.create({ name: form.name.trim(), phone: form.phone.trim() || undefined, address: form.address.trim() || undefined });
      onSelect(c);
    } catch (e: any) { setErr(errMsg(e)); }
  }

  return (
    <Modal title="اختيار عميل (F2)" onClose={onClose}>
      {err && <div className="kerr">{err}</div>}
      <div className="krow">
        <input ref={searchRef} className="kinput" placeholder="اكتب اسم العميل أو رقم الهاتف… (↑↓ + Enter للاختيار)"
          value={search} onChange={(e) => { setSearch(e.target.value); void load(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, rows.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); const c = rows[active]; if (c) onSelect(c); }
          }}
          style={{ width: 260 }} />
        <button className="kbtn" onClick={() => load(search)}>{fetching ? '...' : 'بحث'}</button>
      </div>
      <div className="ktable-wrap" style={{ maxHeight: 220 }}>
        <table className="ktable">
          <thead><tr><th>الاسم</th><th>الهاتف</th><th>العنوان</th><th></th></tr></thead>
          <tbody>
            <tr className={rows.length === 0 && active === 0 ? 'selected' : ''} onDoubleClick={() => onSelect(null)}>
              <td>عميل نقدي</td><td>—</td><td>—</td>
              <td><button className="kbtn" onClick={() => onSelect(null)}>اختيار</button></td>
            </tr>
            {rows.map((c: any, i: number) => (
              <tr key={c.id} className={i + 1 === active ? 'selected' : ''} onMouseEnter={() => setActive(i + 1)} onDoubleClick={() => onSelect(c)}>
                <td>{c.name}</td><td>{c.phone}</td><td>{c.address}</td>
                <td><button className="kbtn" onClick={() => onSelect(c)}>اختيار</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h4>عميل جديد</h4>
      <div className="krow">
        <input className="kinput" placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="kinput" placeholder="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="kinput" placeholder="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <button className="kbtn kbtn-primary" onClick={create}>حفظ واختيار</button>
      </div>
    </Modal>
  );
}
