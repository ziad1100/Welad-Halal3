import { useState } from 'react';

interface PasswordInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  id?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

// Password field with show/hide (eye) toggle. RTL-safe: toggle follows flex
// direction so it lands at the inline-end in both ar (rtl) and en (ltr).
export function PasswordInput({ value, onChange, placeholder, autoComplete, id, style, ariaLabel }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const label = show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور';
  return (
    <span style={{ display: 'flex', alignItems: 'stretch', gap: 0, ...style }}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={ariaLabel ?? placeholder ?? label}
        style={{ flex: 1, minWidth: 0 }}
      />
      <button
        type="button"
        className="wh-btn"
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
        aria-label={label}
        title={label}
        style={{ padding: '6px 8px', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {show ? (
            <>
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.16 3.19" />
              <path d="M6.61 6.61A17.5 17.5 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4.39-.92" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </>
          ) : (
            <>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </span>
  );
}
