import { useEffect, useState } from 'react';
import { usersApi, auditApi, settingsApi, discountsApi } from '../../services/api/erp.api';
import { api } from '../../services/api/api';
import { getStoredPrinter, supportsWebUSB, toast, type StoredPrinter } from '../../lib/printer';
import { useAuth } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

export function AdminPage() {
  const { t, i18n } = useTranslation();
  const currentUser = useAuth((s) => s.user);
  const myRole = currentUser?.role ?? (currentUser?.permissionLevel >= 100 ? 'owner' : currentUser?.permissionLevel >= 50 ? 'manager' : 'employee');
  const canAddUsers = myRole === 'owner' || myRole === 'manager';
  const [users, setUsers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [nameTaken, setNameTaken] = useState(false);
  const [createdCreds, setCreatedCreds] = useState('');
  const [selectedPrinter, setSelectedPrinter] = useState<StoredPrinter | null>(() => getStoredPrinter());
  async function detectPrinter() {
    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      const info = {
        vendorId: device.vendorId,
        productId: device.productId,
        name: device.productName || 'Unknown USB Device',
      };
      setSelectedPrinter(info);
      localStorage.setItem('receipt_printer_device', JSON.stringify(info));
      await saveDeviceToSettings(info.vendorId, info.productId, info.name);
    } catch {
      toast(t('common.noDevice', { defaultValue: 'لم يتم اختيار أي جهاز' }));
    }
  }
  async function saveDeviceToSettings(vendorId: number, productId: number, name: string) {
    await settingsApi.set('receipt_printer_device', JSON.stringify({ vendorId, productId, name }));
    settingsApi.all().then(setSettings).catch(() => {});
  }
  async function clearPrinter() {
    setSelectedPrinter(null);
    localStorage.removeItem('receipt_printer_device');
    await settingsApi.set('receipt_printer_device', '');
    settingsApi.all().then(setSettings).catch(() => {});
  }
  const load = () => {
    usersApi.list().then(setUsers).catch(() => {});
    auditApi.list().then(setAudit).catch(() => {});
    settingsApi.all().then(setSettings).catch(() => {});
    discountsApi.list().then(setCodes).catch(() => {});
  };
  useEffect(load, []);
  useEffect(() => {
    setNameTaken(false);
    const u = username.trim();
    if (!u) return;
    const t = setTimeout(() => {
      api
        .get('/users/check-username', { params: { username: u } })
        .then((r) => setNameTaken(!r.data.available))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [username]);
  async function addUser() {
    if (!username.trim() || password.length < 4 || nameTaken) return;
    const created = await usersApi.create({ fullName: fullName.trim() || username.trim(), username: username.trim(), password, role });
    setCreatedCreds(`${t('admin.created')} : ${created.username} / ${password}`);
    setFullName('');
    setUsername('');
    setPassword('');
    load();
  }
  function canActOn(target: any) {
    if (target.role === 'owner') return target.id === currentUser?.id;
    if (target.role === 'manager') return myRole === 'owner' || target.id === currentUser?.id;
    return myRole === 'owner' || myRole === 'manager';
  }
  return (
    <div style={{ padding: 8 }}>
      <h3>{t('common.adminTitle')}</h3>
      {canAddUsers && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder={t('admin.fullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input placeholder={t('admin.username')} value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="password" placeholder={t('admin.password')} value={password} onChange={(e) => setPassword(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="employee">{t('admin.employee')}</option><option value="manager">{t('admin.manager')}</option>
          </select>
          <button className="wh-btn wh-btn-primary" onClick={addUser} disabled={nameTaken}>{t('admin.addUser')}</button>
          {nameTaken && <span style={{ color: 'var(--danger-color)' }}>{t('admin.usernameTaken')}</span>}
          {createdCreds && <span style={{ color: 'var(--success-color)' }}>{createdCreds}</span>}
        </div>
      )}
      <table className="wh-table">
        <thead><tr><th>{t('common.userCol')}</th><th>{t('common.role')}</th><th>{t('common.level')}</th><th>{t('common.ownerCol')}</th><th>{t('common.active')}</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ background: 'var(--wh-row)' }}>
              <td>{u.username}</td><td>{u.role}</td><td>{u.permissionLevel}</td>
              <td>{u.isOwner ? t('common.yes') : t('common.no')}</td><td>{u.isActive ? t('common.yes') : t('common.no')}</td>
              <td style={{ display: 'flex', gap: 4 }}>
                {canActOn(u) && (
                  <>
                    <button className="wh-btn" onClick={async () => { await usersApi.update(u.id, { isActive: !u.isActive }); load(); }}>{u.isActive ? t('common.disable') : t('common.enable')}</button>
                    <button className="wh-btn" onClick={async () => { const v = prompt(t('common.newPassword')); if (v) { await usersApi.resetPw(u.id, v); alert(t('common.done')); } }}>{t('common.reset')}</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>{t('admin.settings')}</h3>
      <fieldset style={{ marginBottom: 12 }}>
        <legend>{t('common.printerTitle')}</legend>
        {!supportsWebUSB() ? (
          <div>{t('common.printerUnsupported')}</div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="wh-btn" onClick={detectPrinter}>{t('common.printerDiscover')}</button>
            {selectedPrinter && (
              <>
                <span>{selectedPrinter.name} (VID:{selectedPrinter.vendorId} PID:{selectedPrinter.productId})</span>
                <button className="wh-btn" onClick={clearPrinter}>{t('common.printerClear')}</button>
              </>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }} title="help">
              {t('common.printerHelp')}
            </span>
          </div>
        )}
      </fieldset>
      <table className="wh-table">
        <thead><tr><th>{t('admin.key')}</th><th>{t('admin.value')}</th><th></th></tr></thead>
        <tbody>
          {settings.map((s) => (
            <tr key={s.key}>
              <td>{s.key}</td>
              <td><input defaultValue={s.value} id={`set-${s.key}`} style={{ width: '100%' }} /></td>
              <td><button className="wh-btn" onClick={async () => { const el = document.getElementById(`set-${s.key}`) as HTMLInputElement; await settingsApi.set(s.key, el.value); load(); }}>{t('common.save')}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>{t('admin.audit')} (300)</h3>
      <table className="wh-table">
        <thead><tr><th>{t('common.userCol')}</th><th>{t('common.action')}</th><th>{t('common.entity')}</th><th>{t('common.date')}</th></tr></thead>
        <tbody>
          {audit.slice(0, 100).map((a) => (
            <tr key={a.id}><td>{a.user?.username ?? '-'}</td><td>{a.action}</td><td>{a.entity}</td><td>{new Date(a.createdAt).toLocaleString(i18n.language === 'en' ? 'en-US' : 'ar-EG')}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
