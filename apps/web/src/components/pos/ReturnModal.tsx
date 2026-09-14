import { useEffect, useState } from 'react';
import { cancelOrder, getOrder, listOrders } from '../../services/api/orders.api';
import { settingsApi } from '../../services/api/erp.api';
import { Modal } from '../shared/ui';
import { ManagerGate } from './ManagerGate';

function errMsg(e: any): string {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join('، ');
  if (typeof m === 'string' && m.trim()) return m;
  return 'حدث خطأ — حاول مرة أخرى';
}

/** In-POS returns flow: find a confirmed order → full return via cancel (restock).
 *  Local backend supports whole-order returns only; per-line partial returns
 *  are not available and are therefore not offered. */
export function ReturnModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [detail, setDetail] = useState<any | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [threshold, setThreshold] = useState(500);
  const [showMgr, setShowMgr] = useState(false);

  useEffect(() => {
    settingsApi.all().then((rows: any[]) => {
      const v = Number((rows || []).find((r: any) => r.key === 'return_approval_threshold')?.value ?? 500);
      if (Number.isFinite(v) && v >= 0) setThreshold(v);
    }).catch(() => {});
  }, []);

  async function runSearch() {
    setErr('');
    try {
      const rows: any[] = await listOrders();
      const s = search.trim();
      setFound(rows.filter((o: any) => {
        if (o.status !== 'confirmed') return false;
        if (!s) return true;
        return String(o.reference).includes(s) || String(o.customer?.name ?? '').includes(s);
      }));
      setSearched(true);
    } catch (e: any) { setErr(errMsg(e)); }
  }

  async function pick(id: string) {
    setErr('');
    try {
      const full = await getOrder(id);
      setOrderId(id);
      setDetail(full);
    } catch (e: any) { setErr(errMsg(e)); }
  }

  async function submit(approvalToken?: string) {
    if (!detail) return;
    if (Number(detail.total) > threshold && !approvalToken) { setShowMgr(true); return; }
    setErr(''); setBusy(true);
    try {
      await cancelOrder(detail.id, approvalToken);
      onDone(`تم إرجاع الطلب ${detail.reference} بالكامل — أُعيدت الأصناف للمخزون`);
      onClose();
    } catch (e: any) { setErr(errMsg(e)); }
    finally { setBusy(false); }
  }

  return (
    <>
    <Modal title="مرتجع — بحث عن طلب مؤكد" onClose={onClose} footer={<>
      <button className="kbtn kbtn-primary" disabled={busy || !detail} onClick={() => void submit()}>تنفيذ المرتجع الكامل</button>
      <button className="kbtn" onClick={onClose}>إلغاء</button>
    </>}>
      {err && <div className="kerr">{err}</div>}
      {!orderId && (
        <>
          <div className="krow">
            <span className="klabel">بحث برقم/عميل</span>
            <input className="kinput" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void runSearch(); }}
              placeholder="رقم الطلب أو اسم العميل" style={{ width: 240 }} />
            <button className="kbtn" onClick={() => void runSearch()}>بحث</button>
          </div>
          <div className="ktable-wrap"><table className="ktable">
            <thead><tr><th>رقم الطلب</th><th>العميل</th><th>الإجمالي</th><th>الحالة</th><th></th></tr></thead>
            <tbody>{found.map((o: any) => (
              <tr key={o.id}>
                <td>{o.reference}</td><td>{o.customer?.name || 'عميل نقدي'}</td>
                <td>{Number(o.total)}</td><td>استلام</td>
                <td><button className="kbtn" onClick={() => pick(o.id)}>اختيار</button></td>
              </tr>))}
            </tbody>
          </table></div>
          {searched && !found.length && <div style={{ color: 'var(--muted)', fontSize: 12 }}>لا توجد طلبات مؤكدة مطابقة</div>}
        </>
      )}
      {orderId && detail && (
        <>
          <div className="krow">
            <span>طلب رقم <b>{detail.reference}</b> — الإجمالي <b>{Number(detail.total)}</b></span>
            <button className="kbtn" onClick={() => { setOrderId(''); setDetail(null); }}>بحث آخر</button>
          </div>
          <div className="ktable-wrap"><table className="ktable">
            <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الكلي</th></tr></thead>
            <tbody>{(detail.items || []).map((l: any) => (
              <tr key={l.id}>
                <td>{l.productName}</td><td>{Number(l.qty)}</td>
                <td>{Number(l.unitPrice).toFixed(2)}</td><td>{Number(l.lineTotal).toFixed(2)}</td>
              </tr>))}
            </tbody>
          </table></div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>سيُرجع الطلب بالكامل وتُعاد كل الأصناف إلى المخزون.
            {detail && Number(detail.total) > threshold && <span> المرتجع فوق {threshold} ج.م — يتطلب اعتماد مدير.</span>}</div>
        </>
      )}
    </Modal>
    {showMgr && detail && <ManagerGate title="اعتماد مرتجع" onClose={() => setShowMgr(false)}
      onApproved={(token) => { setShowMgr(false); void submit(token); }} />}
    </>
  );
}
