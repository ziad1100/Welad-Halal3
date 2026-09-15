import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { shiftsApi } from '../../services/api/erp.api';
import { ShiftEndModal, ShiftStartModal } from './ShiftModals';

// Post-login gate: employees MUST open a shift (non-dismissible, no skip);
// managers/owners see skip. End-shift button exposed via window event for Cashier bar.
export function ShiftGate() {
  const user = useAuth((s) => s.user);
  const loc = useLocation();
  const [openShift, setOpenShift] = useState<any>(null);
  const [checked, setChecked] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  useEffect(() => {
    setSkipped(false);
    setChecked(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user || loc.pathname === '/login') return;
    let cancelled = false;
    shiftsApi
      .current()
      .then((s) => {
        if (!cancelled) {
          setOpenShift(s);
          setChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loc.pathname]);

  useEffect(() => {
    const h = () => setShowEnd(true);
    window.addEventListener('wh:end-shift', h);
    return () => window.removeEventListener('wh:end-shift', h);
  }, []);

  if (!user || loc.pathname === '/login' || !checked || skipped) return showEnd && openShift ? (
    <ShiftEndModal
      onClose={() => setShowEnd(false)}
      onSubmit={async (cash) => {
        const r = await shiftsApi.close(openShift.id, cash);
        setOpenShift(null);
        return r;
      }}
    />
  ) : null;

  const role = user.role ?? (user.permissionLevel >= 100 ? 'owner' : user.permissionLevel >= 50 ? 'manager' : 'employee');
  const needsShift = !openShift && role === 'employee';
  const suggestShift = !openShift && !skipped && role !== 'employee';

  return (
    <>
      {(needsShift || suggestShift) && (
        <ShiftStartModal
          role={role}
          onStart={async (cash) => {
            const s = await shiftsApi.open(cash);
            setOpenShift(s);
          }}
          onSkip={() => setSkipped(true)}
        />
      )}
      {showEnd && openShift && (
        <ShiftEndModal
          onClose={() => setShowEnd(false)}
          onSubmit={async (cash) => {
            const r = await shiftsApi.close(openShift.id, cash);
            setOpenShift(null);
            return r;
          }}
        />
      )}
    </>
  );
}

export function requestEndShift() {
  window.dispatchEvent(new Event('wh:end-shift'));
}
