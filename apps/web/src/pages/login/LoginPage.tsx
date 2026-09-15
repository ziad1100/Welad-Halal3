import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loginApi } from '../../services/api/auth.api';
import { routeForRole } from '../../lib/routing';
import { useAuth } from '../../store/authStore';

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
      setErr(t('auth.invalid'));
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', padding: 16 }}>
      <form onSubmit={submit} className="wh-modal" style={{ width: 'min(360px, calc(100vw - 32px))' }}>
        <h2 style={{ marginTop: 0 }}>ولاد حلال</h2>
        <label>{t('username')}</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" style={{ width: '100%', marginBottom: 8 }} />
        <label>{t('password')}</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={{ width: '100%', marginBottom: 8 }} />
        {err && <div style={{ color: 'var(--danger-color)', marginBottom: 8 }}>{err}</div>}
        <button className="wh-btn" type="submit" style={{ width: '100%' }}>{t('login')}</button>
      </form>
    </div>
  );
}
