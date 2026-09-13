// Legacy colorful toolbar pictograms — inline SVG, early-2010s ERP look.
// Decorative strip; each icon is a button that navigates or is labelled.
const ICONS: { key: string; label: string; svg: React.ReactNode }[] = [
  { key: 'refresh', label: 'تحديث', svg: (<svg width="20" height="20" viewBox="0 0 20 20"><path d="M4 10a6 6 0 0 1 10-4.5" fill="none" stroke="#1E88E5" strokeWidth="2.4" /><path d="M14 2v4h-4" fill="none" stroke="#1E88E5" strokeWidth="2.4" /><path d="M16 10a6 6 0 0 1-10 4.5" fill="none" stroke="#43A047" strokeWidth="2.4" /><path d="M6 18v-4h4" fill="none" stroke="#43A047" strokeWidth="2.4" /></svg>) },
  { key: 'user', label: 'مستخدم', svg: (<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#FFCA28" stroke="#8D6E00" /><path d="M2 18c0-4 3.5-6 8-6s8 2 8 6" fill="#42A5F5" stroke="#1565C0" /></svg>) },
  { key: 'doc', label: 'مستند', svg: (<svg width="20" height="20" viewBox="0 0 20 20"><rect x="4" y="1" width="12" height="18" fill="#fff" stroke="#78909C" /><rect x="6" y="5" width="8" height="2" fill="#90A4AE" /><rect x="6" y="9" width="8" height="2" fill="#90A4AE" /><rect x="6" y="13" width="5" height="2" fill="#90A4AE" /></svg>) },
  { key: 'clock', label: 'تنبيه', svg: (<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="11" r="7" fill="#FFF59D" stroke="#F9A825" strokeWidth="1.6" /><path d="M10 7v4l3 2" stroke="#E65100" strokeWidth="1.8" fill="none" /><path d="M7 1l2 2M13 1l-2 2" stroke="#757575" strokeWidth="1.6" /></svg>) },
  { key: 'tie', label: 'موظف', svg: (<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="5" r="3.4" fill="#FFCCBC" stroke="#BF360C" /><path d="M4 19l2-9h8l2 9z" fill="#37474F" /><path d="M9 10l1 5 1-5 1 2V8H8v4z" fill="#D32F2F" /></svg>) },
  { key: 'cal', label: 'تقويم', svg: (<svg width="20" height="20" viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="14" fill="#fff" stroke="#C62828" /><rect x="2" y="4" width="16" height="4" fill="#C62828" /><rect x="6" y="11" width="2" height="2" fill="#1565C0" /><rect x="9" y="11" width="2" height="2" fill="#1565C0" /><rect x="12" y="11" width="2" height="2" fill="#1565C0" /></svg>) },
  { key: 'gear', label: 'أدوات', svg: (<svg width="20" height="20" viewBox="0 0 20 20"><rect x="1" y="7" width="18" height="9" fill="#D32F2F" stroke="#7F0000" /><rect x="4" y="9" width="12" height="2" fill="#FFCDD2" /><circle cx="15" cy="4" r="2.4" fill="none" stroke="#616161" strokeWidth="1.8" /></svg>) },
  { key: 'fx', label: 'عملات', svg: (<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="7" cy="10" r="5" fill="#FFEB3B" stroke="#F9A825" /><circle cx="14" cy="10" r="5" fill="#C8E6C9" stroke="#2E7D32" /><text x="11.4" y="13" fontSize="7" fill="#000">$</text></svg>) },
  { key: 'pc', label: 'محطة', svg: (<svg width="20" height="20" viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="11" fill="#90CAF9" stroke="#37474F" /><rect x="8" y="16" width="4" height="2" fill="#37474F" /><rect x="5" y="18" width="10" height="1.4" fill="#37474F" /></svg>) },
  { key: 'stack', label: 'أرشيف', svg: (<svg width="20" height="20" viewBox="0 0 20 20"><rect x="3" y="8" width="14" height="9" fill="#FFE0B2" stroke="#EF6C00" /><rect x="3" y="5" width="14" height="4" fill="#fff" stroke="#EF6C00" /><rect x="3" y="2" width="14" height="4" fill="#E1F5FE" stroke="#0277BD" /></svg>) },
  { key: 'check', label: 'مهام', svg: (<svg width="20" height="20" viewBox="0 0 20 20"><rect x="2" y="2" width="16" height="16" fill="#fff" stroke="#2E7D32" /><path d="M5 10l4 4 6-8" fill="none" stroke="#2E7D32" strokeWidth="2.4" /></svg>) },
  { key: 'key', label: 'صلاحيات', svg: (<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="7" cy="7" r="4.4" fill="#FFECB3" stroke="#FF8F00" strokeWidth="1.8" /><path d="M10 10l8 8M15 15l2-2M13 13l1.6-1.6" stroke="#FF8F00" strokeWidth="1.8" /></svg>) },
];

export function LegacyToolbar({ onAction }: { onAction?: (key: string) => void }) {
  return (
    <div className="wh-toolbar" role="toolbar" aria-label="شريط الأدوات">
      {ICONS.map((i) => (
        <button
          key={i.key}
          title={i.label}
          aria-label={i.label}
          onClick={() => onAction?.(i.key)}
          style={{ background: 'transparent', border: 'none', padding: 2, cursor: 'pointer' }}
        >
          {i.svg}
        </button>
      ))}
    </div>
  );
}
