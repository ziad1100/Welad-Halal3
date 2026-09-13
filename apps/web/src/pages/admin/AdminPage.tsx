import { useEffect, useState } from 'react';
import { usersApi, auditApi, settingsApi, discountsApi } from '../../services/api/erp.api';
import { PasswordInput } from '../../components/ui/PasswordInput';

export function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const load = () => {
    usersApi.list().then(setUsers).catch(() => {});
    auditApi.list().then(setAudit).catch(() => {});
    settingsApi.all().then(setSettings).catch(() => {});
    discountsApi.list().then(setCodes).catch(() => {});
  };
  useEffect(load, []);
  async function addUser() {
    if (!username.trim() || password.length < 4) return;
    await usersApi.create({ fullName: fullName.trim() || username.trim(), username: username.trim(), password, role });
    setFullName(''); setUsername(''); setPassword(''); load();
  }
  return (
    <div style={{ padding: 8 }}>
      <h3>الإدارة — المستخدمون</h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <input placeholder="الاسم الكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input placeholder="اسم المستخدم" value={username} onChange={(e) => setUsername(e.target.value)} />
        <PasswordInput placeholder="كلمة المرور" value={password} onChange={setPassword} autoComplete="new-password" />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="employee">موظف</option><option value="manager">مدير</option>
        </select>
        <button className="wh-btn" onClick={addUser}>إضافة مستخدم</button>
      </div>
      <table className="wh-table">
        <thead><tr><th>المستخدم</th><th>الدور</th><th>مستوى</th><th>مالك</th><th>نشط</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ background: '#EDDDE7' }}>
              <td>{u.username}</td><td>{u.role}</td><td>{u.permissionLevel}</td>
              <td>{u.isOwner ? 'نعم' : 'لا'}</td><td>{u.isActive ? 'نعم' : 'لا'}</td>
              <td style={{ display: 'flex', gap: 4 }}>
                <button className="wh-btn" onClick={async () => { await usersApi.update(u.id, { isActive: !u.isActive }); load(); }}>{u.isActive ? 'تعطيل' : 'تفعيل'}</button>
                <button className="wh-btn" onClick={async () => { const v = prompt('كلمة مرور جديدة:'); if (v) { await usersApi.resetPw(u.id, v); alert('تم'); } }}>تصفير</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>الإعدادات</h3>
      <table className="wh-table">
        <thead><tr><th>المفتاح</th><th>القيمة</th><th></th></tr></thead>
        <tbody>
          {settings.map((s) => (
            <tr key={s.key}>
              <td>{s.key}</td>
              <td><input defaultValue={s.value} id={`set-${s.key}`} style={{ width: '100%' }} /></td>
              <td><button className="wh-btn" onClick={async () => { const el = document.getElementById(`set-${s.key}`) as HTMLInputElement; await settingsApi.set(s.key, el.value); load(); }}>حفظ</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>سجل التدقيق (أحدث 300)</h3>
      <table className="wh-table">
        <thead><tr><th>المستخدم</th><th>الإجراء</th><th>الكيان</th><th>التاريخ</th></tr></thead>
        <tbody>
          {audit.slice(0, 100).map((a) => (
            <tr key={a.id}><td>{a.user?.username ?? '-'}</td><td>{a.action}</td><td>{a.entity}</td><td>{new Date(a.createdAt).toLocaleString('ar-EG')}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
