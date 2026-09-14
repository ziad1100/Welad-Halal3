import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cancelOrder, getOrder, listOrders } from '../../services/api/orders.api';
import { useCart } from '../../store/cartStore';
import { StatusBadge, OrderTypeLabel, Modal } from '../../components/shared/ui';
import { SearchableSelect } from '../../components/shared/SearchableSelect';
import { SearchableDatalist } from '../../components/shared/SearchableDatalist';
import { lookupReps } from '../../services/api/lookups';
import { ReceiptPrinterService } from '../../receipt/ReceiptPrinterService';
import { orderToReceipt, orderToReturnReceipt } from '../../receipt/types';
import { useAuth } from '../../store/authStore';
import { useDir } from '../../store/lang';

function errMsg(e: any): string {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join('، ');
  if (typeof m === 'string' && m.trim()) return m;
  return 'حدث خطأ — حاول مرة أخرى';
}

function fmtDT(v: any): string {
  if (!v) return '—';
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, '0');
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(h)}:${p(d.getMinutes())}${ap}`;
}

const ORDER_TYPES = [
  { value: 'ALL', label: 'كل أنواع الطلب' },
  { value: 'pickup', label: 'استلام' },
  { value: 'delivery', label: 'توصيل' },
];

export function OrdersBoard({ initialTab = 'log' }: { initialTab?: 'log' | 'pending' }) {
  const nav = useNavigate();
  const dir = useDir();
  const user = useAuth((s) => s.user);
  const { addLine, clear, setCustomer } = useCart();
  const [tab, setTab] = useState<'log' | 'pending'>(initialTab);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderType, setOrderType] = useState('ALL');
  const [repName, setRepName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [customerQ, setCustomerQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [autoPicked, setAutoPicked] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const rows = await listOrders(tab === 'pending' ? 'held' : '');
      setOrders(tab === 'pending' ? rows : rows.filter((o: any) => o.status !== 'held'));
    } catch { setOrders([]); }
  }
  useEffect(() => { void load(); setSelectedId(null); setDetail(null); setAutoPicked(false); }, [tab]);

  useEffect(() => {
    document.title = 'برنامج إدارة الطلبات - الشاشة الرئيسية';
  }, []);

  // Default demonstration state: order 147 pre-selected (blue) on the log tab.
  useEffect(() => {
    if (!autoPicked && tab === 'log' && orders.length > 0) {
      const found = orders.find((o) => String(o.reference) === '147') ?? orders[0];
      if (found) {
        setSelectedId(found.id);
        getOrder(found.id).then(setDetail).catch(() => {});
        setAutoPicked(true);
      }
    }
  }, [autoPicked, tab, orders]);

  const filtered = orders.filter((o: any) => {
    if (orderType !== 'ALL' && o.type !== orderType) return false;
    if (orderNumber.trim() && !String(o.reference).includes(orderNumber.trim())) return false;
    if (customerQ.trim() && !String(o.customer?.name ?? '').includes(customerQ.trim())) return false;
    if (repName.trim()) return false; // no delivery-rep data locally; non-empty rep filter matches nothing
    return true;
  });

  async function openDetail(o: any) {
    setSelectedId(o.id);
    setDetail(null);
    try {
      setDetail(await getOrder(o.id));
    } catch (e: any) { setErr(errMsg(e)); }
  }

  async function resume(o: any) {
    setErr(''); setMsg('');
    try {
      const full = o.items ? o : await getOrder(o.id);
      clear();
      if (full.customerId) setCustomer(full.customerId);
      (full.items ?? []).forEach((it: any) => {
        addLine({
          productId: it.productId,
          unitId: it.unitId ?? null,
          name: it.productName,
          unitName: it.unitName ?? 'قطاعي',
          category: '',
          addedAt: Date.now(),
          price: Number(it.unitPrice),
          qty: Number(it.qty),
        });
      });
      await cancelOrder(o.id);
      nav('/cashier');
    } catch (e: any) { setErr(errMsg(e)); }
  }

  async function cancel(id: string) {
    try { await cancelOrder(id); setDetail(null); void load(); }
    catch (e: any) { setErr(errMsg(e)); }
  }

  async function reprint(o: any) {
    const ok = await ReceiptPrinterService.printReceipt(orderToReceipt(o, true));
    if (!ok) setErr(`${ReceiptPrinterService.lastError} — (إعادة المحاولة متاحة)`);
  }

  async function requestReturn(o: any) {
    if (busy) return;
    setErr(''); setBusy(true);
    try {
      await cancelOrder(o.id);
      const ok = await ReceiptPrinterService.printReceipt(orderToReturnReceipt(o, false));
      if (!ok) setErr(`${ReceiptPrinterService.lastError} — اكتمل المرتجع (طباعة يدوية)`);
      else setMsg(`تم إرجاع الطلب ${o.reference} — طُبع إيصال مرتجع`);
      setDetail(null);
      void load();
    } catch (e: any) { setErr(errMsg(e)); }
    finally { setBusy(false); }
  }

  const heldCount = tab === 'pending' ? filtered.length : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} dir={dir}>
      <div className="krow orders-filterbar" style={{ padding: 6 }}>
        <button className="kbtn kbtn-primary" style={{ fontSize: 14, padding: '6px 22px' }} onClick={() => nav('/cashier')}>+ طلب جديد</button>
        <span className="klabel">رقم الطلب</span>
        <input className="kinput" placeholder="رقم الطلب" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} style={{ width: 90, background: '#3388E0', color: '#fff' }} />
        <SearchableDatalist value={orderType} options={ORDER_TYPES}
          placeholder="كل أنواع الطلب — اكتب للبحث…" onChange={(v) => setOrderType(v || 'ALL')} />
        <SearchableSelect value="" loadOptions={lookupReps()}
          placeholder="كل مندوبي التوصيل — اكتب للبحث…" onChange={(v) => setRepName(v)} />
        <input className="kinput" placeholder="بحث بالعميل" value={customerQ} onChange={(e) => setCustomerQ(e.target.value)} style={{ width: 150 }} />
        <button className="kbtn" onClick={() => void load()}>تحديث</button>
      </div>
      {err && <div className="kerr" style={{ margin: '0 6px' }}>{err}</div>}
      {msg && <div className="kok" style={{ margin: '0 6px' }}>{msg}</div>}
      <div className="ktabs" style={{ padding: '0 6px' }}>
        <button className={tab === 'log' ? 'active' : ''} onClick={() => { setTab('log'); nav('/orders'); }}>📅 سجل الطلبات</button>
        <button className={tab === 'pending' ? 'active' : ''} onClick={() => { setTab('pending'); nav('/pending'); }}>🎧 الطلبات المعلقة{tab === 'pending' && heldCount !== undefined ? ` (${heldCount})` : ''}</button>
      </div>
      <div className="ktable-wrap" style={{ flex: 1, margin: '0 6px 6px' }}>
        <table className="ktable orders-table">
          <thead><tr>
            <th>رقم الطلب</th><th>نوع الطلب</th><th>توقيت الإنشاء</th><th>أنشئ بواسطة</th><th>توقيت الإغلاق</th><th>العميل</th><th>مندوب التوصيل</th><th>وقت الخروج</th><th>لمحة</th><th>عدد الأصناف</th><th>الكمية</th><th>القيمة الإجمالية</th><th>الحالة</th>{tab === 'pending' && <th></th>}
          </tr></thead>
          <tbody>
            {filtered.map((o: any) => {
              const items = o.items ?? [];
              const qty = items.reduce((a: number, it: any) => a + Number(it.qty ?? 0), 0);
              return (
                <tr key={o.id} className={selectedId === o.id ? 'selected' : ''} onClick={() => void openDetail(o)} onDoubleClick={() => void openDetail(o)}>
                  <td>{o.reference}</td>
                  <td><OrderTypeLabel t={o.type} /></td>
                  <td>{fmtDT(o.createdAt)}</td>
                  <td>{o.user?.username || '—'}</td>
                  <td>{o.status === 'confirmed' ? fmtDT(o.updatedAt ?? o.createdAt) : '—'}</td>
                  <td>{o.customer?.name || 'عميل نقدي'}</td>
                  <td>—</td>
                  <td>—</td>
                  <td>{items.slice(0, 3).map((i: any) => i.productName).join('، ')}</td>
                  <td>{items.length}</td>
                  <td>{qty}</td>
                  <td><b>{Number(o.total).toFixed(2)}</b></td>
                  <td>{o.status === 'held' ? 'معلقة' : <StatusBadge status={o.status} />}</td>
                  {tab === 'pending' && (
                    <td><button className="kbtn kbtn-primary" onClick={(e) => { e.stopPropagation(); void resume(o); }}>استئناف</button></td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {detail && (
        <Modal title={`طلب رقم ${detail.reference}`} onClose={() => setDetail(null)} footer={
          <>
            {detail.status === 'held' && (
              <button className="kbtn kbtn-primary" onClick={() => { void resume(detail); setDetail(null); }}>استئناف في الكاشير</button>
            )}
            {detail.status === 'confirmed' && (
              <button className="kbtn" disabled={busy} style={{ background: '#E5484D', color: '#fff', borderColor: 'transparent' }} onClick={() => void requestReturn(detail)}>طلب مرتجع</button>
            )}
            {(detail.status === 'confirmed' || detail.status === 'held') && (user?.permissionLevel ?? 0) >= 50 && (
              <button className="kbtn" onClick={() => void cancel(detail.id)}>إلغاء</button>
            )}
            <button className="kbtn" onClick={() => void reprint(detail)}>طباعة نسخة</button>
          </>
        }>
          <div className="krow">
            <span>العميل: {detail.customer?.name || 'عميل نقدي'}</span>
            <span>الإجمالي: <b>{Number(detail.total).toFixed(2)}</b></span>
            <StatusBadge status={detail.status} />
          </div>
          <div className="ktable-wrap"><table className="ktable">
            <thead><tr><th>الصنف</th><th>الكمية</th><th>سعر الوحدة (تاريخي)</th><th>الإجمالي</th></tr></thead>
            <tbody>{(detail.items ?? []).map((i: any) => <tr key={i.id}><td>{i.productName}</td><td>{Number(i.qty)}</td><td>{Number(i.unitPrice).toFixed(2)}</td><td>{Number(i.lineTotal).toFixed(2)}</td></tr>)}</tbody>
          </table></div>
        </Modal>
      )}
    </div>
  );
}
