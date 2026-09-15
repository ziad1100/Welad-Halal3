import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function ShiftStartModal({ role, onStart, onSkip }: { role: string; onStart: (cash: number) => Promise<void>; onSkip: () => void }) {
  const { t } = useTranslation();
  const [cash, setCash] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const canSkip = role === 'manager' || role === 'owner';
  async function start() {
    setErr('');
    setBusy(true);
    try {
      await onStart(Number(cash));
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Failed to start shift');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'grid', placeItems: 'center' }}>
      <div className="wh-modal" style={{ width: 420 }}>
        <h3 style={{ marginTop: 0 }}>{t('shift.startTitle')}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('shift.hint')}</p>
        <label>{t('shift.amount')}</label>
        <input type="number" min={0} value={cash} onChange={(e) => setCash(Number(e.target.value))} style={{ width: '100%', margin: '6px 0' }} />
        {err && <div style={{ color: 'var(--danger-color)', marginBottom: 6 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="wh-btn wh-btn-primary" onClick={start} disabled={busy}>{t('shift.start')}</button>
          {canSkip && <button className="wh-btn" onClick={onSkip}>{t('shift.skip')}</button>}
        </div>
      </div>
    </div>
  );
}

export function ShiftEndModal({ onSubmit, onClose }: { onSubmit: (cash: number) => Promise<any>; onClose: () => void }) {
  const { t } = useTranslation();
  const [cash, setCash] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      const r = await onSubmit(Number(cash));
      setResult(r);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'grid', placeItems: 'center' }}>
      <div className="wh-modal" style={{ width: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>{t('shift.end')}</strong>
          <button className="wh-btn" onClick={onClose}>X</button>
        </div>
        {!result ? (
          <>
            <label>{t('shift.closingHint')}</label>
            <input type="number" value={cash} onChange={(e) => setCash(Number(e.target.value))} style={{ width: '100%', margin: '6px 0' }} />
            <button className="wh-btn wh-btn-primary" onClick={submit} disabled={busy}>{t('shift.end')}</button>
          </>
        ) : (
          <div style={{ color: result.alert ? 'var(--warning-color)' : 'var(--text-primary)' }}>
            <div>{t('shift.result', { expected: Number(result.expectedCash ?? 0).toFixed(2), actual: Number(result.closingCash ?? 0).toFixed(2), diff: Number(result.discrepancy ?? 0).toFixed(2) })}</div>
            {result.alert && <div style={{ fontWeight: 'bold' }}>{t('shift.overThreshold')}</div>}
            <div style={{ marginTop: 8 }}><button className="wh-btn" onClick={onClose}>{t('common.close')}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
