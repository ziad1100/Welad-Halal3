import { useEffect, useState } from 'react';

export function ToastHost() {
  const [msgs, setMsgs] = useState<string[]>([]);
  useEffect(() => {
    const h = (e: Event) => {
      const msg = (e as CustomEvent).detail as string;
      setMsgs((m) => [...m, msg]);
      setTimeout(() => setMsgs((m) => m.slice(1)), 3500);
    };
    window.addEventListener('wh-toast', h);
    return () => window.removeEventListener('wh-toast', h);
  }, []);
  if (!msgs.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 12, insetInlineStart: 12, zIndex: 200, display: 'grid', gap: 6 }}>
      {msgs.map((m, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 12px' }}>
          {m}
        </div>
      ))}
    </div>
  );
}
