import { useState } from 'react';
import { approveApi } from '../../services/api/auth.api';
import { Modal } from '../shared/ui';

/** Manager authorization gate: verifies a manager/owner's credentials against
 *  the real auth system and returns a short-lived approval token. Used for
 *  above-threshold returns, large discounts and whole-order cancels. */
export function ManagerGate({ title, onClose, onApproved }: {
  title: string;
  onClose: () => void;
  onApproved: (approvalToken: string, manager: any) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!username.trim() || !password) { setErr('أدخل اسم المدير وكلمة المرور'); return; }
    setErr(''); setBusy(true);
    try {
      const { approvalToken, manager } = await approveApi(username.trim(), password);
      onApproved(approvalToken, manager);
    } catch (e: any) {
      const m = e?.response?.data?.message;
      setErr(Array.isArray(m) ? m.join('، ') : (m || 'فشل اعتماد المدير'));
    } finally { setBusy(false); }
  }

  return (
    <Modal title={title} onClose={onClose} footer={<>
      <button className="kbtn kbtn-primary" disabled={busy} onClick={() => void submit()}>اعتماد</button>
      <button className="kbtn" onClick={onClose}>إلغاء (Esc)</button>
    </>}>
      {err && <div className="kerr">{err}</div>}
      <div className="krow"><span className="klabel">مدير/مالك</span>
        <input className="kinput" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" style={{ flex: 1 }} /></div>
      <div className="krow"><span className="klabel">كلمة المرور</span>
        <input className="kinput" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
          autoComplete="current-password" style={{ flex: 1 }} /></div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>يتطلب صلاحية مدير (50) أو أعلى. تُسجَّل كل محاولة في سجل التدقيق.</div>
    </Modal>
  );
}
