import { useEffect, useState, type ReactNode } from 'react';
import { shiftsApi } from '../../services/api/erp.api';
import { Modal } from '../shared/ui';
import { useDir } from '../../store/lang';

function errMsg(e: any): string {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join('، ');
  if (typeof m === 'string' && m.trim()) return m;
  return 'حدث خطأ — حاول مرة أخرى';
}

export interface ShiftInfo {
  id: string;
  status: 'open' | 'closed';
  openingCash?: number;
  startedAt?: string;
}

/** Start Shift modal: prompts the actual drawer cash before the POS unlocks. */
export function StartShiftModal({ onStarted, onDismiss, dismissLabel }: { onStarted: (s: ShiftInfo) => void; onDismiss?: () => void; dismissLabel?: string }) {
  const [amount, setAmount] = useState('');
  const dir = useDir();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function start() {
    const v = Number(amount);
    if (!(v >= 0)) { setErr('أدخل المبلغ النقدي الفعلي في الدرج'); return; }
    setBusy(true); setErr('');
    try {
      const data = await shiftsApi.open(Math.round(v * 100) / 100);
      onStarted({ id: data.id, status: 'open', openingCash: v, startedAt: data.openedAt ?? new Date().toISOString() });
    } catch (e: any) { setErr(errMsg(e)); setBusy(false); }
  }
  return (
    <div className="kmodal-back">
      <div className="kmodal" dir={dir} style={{ minWidth: 400, maxWidth: 460 }}>
        <div className="kmodal-title"><span>بدء الشيفت — درج النقدية</span>{onDismiss && <button className="kbtn" onClick={onDismiss}>X</button>}</div>
        <div className="kmodal-body">
          <p>قبل فتح شاشة الكاشير، أدخل المبلغ النقدي الفعلي الموجود في الدرج الآن.</p>
          {err && <div className="kerr">{err}</div>}
          <div className="krow"><span className="klabel">المبلغ النقدي (ج.م)</span>
            <input className="kinput" type="number" min={0} autoFocus value={amount} onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void start(); }} style={{ width: 160 }} /></div>
        </div>
        <div className="kmodal-foot">
          <button className="kbtn kbtn-primary" disabled={busy} onClick={() => void start()}>{busy ? '...' : 'بدء الشيفت'}</button>
          {onDismiss && <button className="kbtn" onClick={onDismiss}>{dismissLabel || 'تخطي (مدير)'}</button>}
        </div>
      </div>
    </div>
  );
}

/** End Shift modal: counted cash closes the shift (server computes expected). */
export function EndShiftModal({ shift, onClosed, onClose }: { shift: ShiftInfo; onClosed: (s: any) => void; onClose: () => void }) {
  const [counted, setCounted] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function end() {
    const v = Number(counted);
    if (!(v >= 0)) { setErr('أدخل المبلغ النقدي المُعدّ فعلياً'); return; }
    setBusy(true); setErr('');
    try {
      const data = await shiftsApi.close(shift.id, Math.round(v * 100) / 100);
      onClosed(data);
    } catch (e: any) { setErr(errMsg(e)); setBusy(false); }
  }

  return (
    <Modal title="إنهاء الشيفت" onClose={onClose} footer={
      <>
        <button className="kbtn kbtn-primary" disabled={busy} onClick={() => void end()}>{busy ? '...' : 'إنهاء الشيفت'}</button>
        <button className="kbtn" onClick={onClose}>إلغاء</button>
      </>
    }>
      <p>عُد النقدية الفعلية في الدرج وأدخل المبلغ قبل الإنهاء.</p>
      {err && <div className="kerr">{err}</div>}
      <div className="kpanel" style={{ marginBottom: 8 }}>
        <div className="krow"><span>افتتاح الشيفت:</span><b>{Number(shift.openingCash ?? 0).toFixed(2)} ج.م</b></div>
      </div>
      <div className="krow"><span className="klabel">النقدية المعدودة فعلياً</span>
        <input className="kinput" type="number" min={0} autoFocus value={counted} onChange={(e) => setCounted(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void end(); }} style={{ width: 160 }} /></div>
      <div className="kpanel" style={{ fontSize: 12, marginTop: 8 }}>الفرق = المعدود − المتوقع. إن تجاوز الحد المسموح يصل تنبيه فوري للمدير/المالك.</div>
    </Modal>
  );
}

export interface ShiftGateProps {
  userId: string;
  allowSkip?: boolean;
  /** Render the actual POS when a shift is open (or after a manager skips). */
  render: (shift: ShiftInfo | null, actions: { requestEnd: () => void; refresh: () => Promise<void> }) => ReactNode;
}

/**
 * Gate: the Cashier screen is usable only while a shift is open. Managers
 * (level ≥50) may skip and open the drawer later from the POS header chip.
 */
export function ShiftGate({ userId, allowSkip, render }: ShiftGateProps) {
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<ShiftInfo | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  async function refresh() {
    try {
      const rows: any[] = await shiftsApi.list();
      const open = (rows || []).find((s: any) => s.status === 'open');
      setShift(open ? { id: open.id, status: 'open', openingCash: Number(open.openingCash ?? 0), startedAt: open.openedAt } : null);
    } catch { setShift(null); }
  }
  useEffect(() => { void refresh().finally(() => setLoading(false)); }, [userId]);

  if (loading) return <div className="kpanel" style={{ padding: 16 }}>جاري التحقق من الشيفت…</div>;

  if (!shift && !(allowSkip && skipped)) {
    return <StartShiftModal
      onStarted={(s) => { setShift(s); setEndOpen(false); }}
      onDismiss={allowSkip ? () => setSkipped(true) : undefined}
    />;
  }

  return (
    <>
      {endOpen && shift && (
        <EndShiftModal shift={shift} onClose={() => setEndOpen(false)} onClosed={() => { setShift(null); setEndOpen(false); setSkipped(false); void refresh(); }} />
      )}
      {render(shift, { requestEnd: () => setEndOpen(true), refresh: async () => { await refresh(); } })}
    </>
  );
}
