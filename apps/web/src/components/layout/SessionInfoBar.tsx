import { useEffect, useState } from 'react';
import { useAuth } from '../../store/authStore';

// Session info strip: current user | branch | station | live clock | date.
export function SessionInfoBar() {
  const user = useAuth((s) => s.user);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('ar-EG');
  return (
    <div className="wh-sessionbar">
      المستخدم الحالي: {user?.username ?? '—'} | جهة: {user?.branchId ?? 'الفرع الرئيسي'} | (المحطة: 1) - الساعة: {time} - بتاريخ: {date}
    </div>
  );
}
