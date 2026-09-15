import { useState } from 'react';

// Dense gridded legacy table: pink rows, blue selected row (replica spec).
export function LegacyDataTable({ columns, rows, rowKey }: { columns: string[]; rows: any[]; rowKey: (r: any) => string }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <table className="wh-table">
      <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.map((r) => {
          const k = rowKey(r);
          const selected = sel === k;
          return (
            <tr key={k} onClick={() => setSel(k)}
              style={selected ? { background: 'var(--wh-row-sel)', color: '#fff' } : { background: 'var(--wh-row)' }}>
              {columns.map((c) => <td key={c}>{String(r[c] ?? '')}</td>)}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
