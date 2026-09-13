import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loginApi } from '../../services/api/auth.api';
import { routeForRole } from '../../lib/routing';
import { useAuth } from '../../store/authStore';
import { PasswordInput } from '../../components/ui/PasswordInput';

export function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const data = await loginApi(username, password);
      setAuth(data.accessToken, data.user);
      nav(routeForRole(data.user.role, data.user.forcePasswordChange));
    } catch {
      setErr('Invalid credentials');
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <form onSubmit={submit} className="wh-modal" style={{ minWidth: 320 }}>
        <h2 style={{ marginTop: 0 }}>ولاد حلال</h2>
        <label>{t('username')}</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" style={{ width: '100%', marginBottom: 8 }} />
        <label>{t('password')}</label>
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" ariaLabel={t('password')} style={{ width: '100%', marginBottom: 8 }} />
        {err && <div style={{ color: 'red', marginBottom: 8 }}>{err}</div>}
        <button className="wh-btn" type="submit" style={{ width: '100%' }}>{t('login')}</button>
      </form>
    </div>
  );
}
