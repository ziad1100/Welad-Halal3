import { useEffect, useState } from 'react';
import { barcodeLookup, listCategories } from '../../services/api/products.api';
import { productsApi } from '../../services/api/erp.api';
import { useTranslation } from 'react-i18next';

type Tab = 'pricing' | 'units' | 'tax' | 'inventory' | 'options';

type Props = {
  barcode?: string;
  prefillBarcode?: string;
  isOpen?: boolean;
  onClose: () => void;
  onSaved?: (p: any) => void;
  onCreated?: (p: any) => void;
};

const UNIT_OPTIONS = ['قطعة', 'كجم', 'لتر', 'علبة', 'كرتونة'];

// بيانات صنف — extended 5-tab modal, spec 7-field order preserved in main form.
export function NewProductModal({ barcode, prefillBarcode, onClose, onSaved, onCreated }: Props) {
  const { t } = useTranslation();
  const initialBarcode = prefillBarcode ?? barcode ?? '';
  const [tab, setTab] = useState<Tab>('pricing');
  const [cats, setCats] = useState<any[]>([]);
  const [kind, setKind] = useState('stock');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [catId, setCatId] = useState('');
  const [unit, setUnit] = useState('قطعة');
  const [price, setPrice] = useState(0);
  const [tax, setTax] = useState(0);
  const [qty, setQty] = useState(0);
  const [code, setCode] = useState(initialBarcode);
  const [units, setUnits] = useState<{ unitName: string; barcode: string; sellingPrice: number }[]>([]);
  const [uName, setUName] = useState('');
  const [uPrice, setUPrice] = useState(0);
  const [err, setErr] = useState('');
  const [barcodeTaken, setBarcodeTaken] = useState(false);

  useEffect(() => { listCategories().then(setCats).catch(() => {}); }, []);

  // OFF fallback: prefill name from Open Food Facts (non-blocking)
  useEffect(() => {
    if (!initialBarcode) return;
    let cancelled = false;
    fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(initialBarcode)}.json`)
      .then((r) => r.json())
      .then((j) => {
        const n = j?.product?.product_name as string | undefined;
        if (!cancelled && n && !name) setName(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBarcode]);

  // debounced barcode uniqueness check
  useEffect(() => {
    setBarcodeTaken(false);
    const c = code.trim();
    if (!c) return;
    const t = setTimeout(() => {
      barcodeLookup(c)
        .then(() => setBarcodeTaken(true))
        .catch(() => setBarcodeTaken(false));
    }, 400);
    return () => clearTimeout(t);
  }, [code]);

  async function save() {
    setErr('');
    if (!name.trim()) { setErr(t('product.nameRequired')); return; }
    if (Number(price) < 0) { setErr(t('product.priceInvalid')); return; }
    if (barcodeTaken) { setErr(t('product.barcodeTaken')); return; }
    try {
      const p = await productsApi.create({
        name: name.trim(), description: desc || null, barcode: code.trim() || null,
        type: kind === 'service' ? 'service' : kind === 'composite' ? 'composite' : 'stock',
        basePrice: Number(price), retailPrice: Number(price), unit,
        taxRate: tax, categoryId: catId || null,
        initialQuantity: Number(qty),
        units: units.length
          ? units.map((u) => ({ unitName: u.unitName, barcode: u.barcode || null, sellingPrice: u.sellingPrice, conversionFactor: 1 }))
          : [{ unitName: unit, barcode: code.trim() || null, sellingPrice: Number(price), conversionFactor: 1 }],
      });
      (onCreated ?? onSaved)?.(p);
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Save failed');
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pricing', label: t('product.tabPricing') },
    { id: 'units', label: t('product.tabUnits') },
    { id: 'tax', label: t('product.tabTax') },
    { id: 'inventory', label: t('product.tabInventory') },
    { id: 'options', label: t('product.tabOptions') },
  ];
  const kinds: [string, string][] = [
    ['stock', t('product.stock')],
    ['service', t('product.service')],
    ['raw', t('product.raw')],
    ['composite', t('product.composite')],
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'grid', placeItems: 'center' }}>
      <div className="wh-modal" style={{ width: 560, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>{t('product.title')}</strong>
          <button className="wh-btn" onClick={onClose}>X</button>
        </div>
        <div style={{ margin: '8px 0' }}>
          <span>{t('product.kind')} </span>
          {kinds.map(([v, l]) => (
            <label key={v} style={{ marginInlineEnd: 10 }}>
              <input type="radio" checked={kind === v} onChange={() => setKind(v)} /> {l}
            </label>
          ))}
        </div>
        <label>{t('product.name')}</label>
        <input className="wh-required" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
        <label>{t('product.description')}</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
        <label>{t('product.category')}</label>
        <select value={catId} onChange={(e) => setCatId(e.target.value)} style={{ width: '100%', marginBottom: 6 }}>
          <option value="">—</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label>{t('product.unit')}</label>
        <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: '100%', marginBottom: 6 }}>
          {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <label>{t('product.price')}</label>
        <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} style={{ width: '100%', marginBottom: 6 }} />
        <label>{t('product.openingQty')}</label>
        <input type="number" min={0} value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: '100%', marginBottom: 6 }} />
        <label>{t('product.barcode')}</label>
        <input value={code} onChange={(e) => setCode(e.target.value)} style={{ width: '100%', marginBottom: 2, direction: 'ltr' }} />
        <div className="barcode-field" style={{ padding: 8, marginBottom: 6, direction: 'ltr', textAlign: 'left' }}>{code || '—'}</div>
        {barcodeTaken && <div style={{ color: 'var(--danger-color)', marginBottom: 6 }}>{t('product.barcodeTaken')}</div>}
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          {tabs.map((t) => (
            <button key={t.id} className="wh-btn" onClick={() => setTab(t.id)} style={tab === t.id ? { background: 'var(--bg-surface)' } : {}}>{t.label}</button>
          ))}
        </div>
        {tab === 'pricing' && (
          <div>{t('product.retail')} <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} style={{ width: 120 }} /> <label><input type="checkbox" checked readOnly /> {t('product.refreshPrices')}</label></div>
        )}
        {tab === 'units' && (
          <div>
            {units.map((u, i) => <div key={i}>{u.unitName} — {u.sellingPrice}</div>)}
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <input placeholder={t('product.unitNamePh')} value={uName} onChange={(e) => setUName(e.target.value)} />
              <input type="number" placeholder={t('product.pricePh')} value={uPrice} onChange={(e) => setUPrice(Number(e.target.value))} style={{ width: 90 }} />
              <button className="wh-btn" onClick={() => { if (uName.trim()) { setUnits([...units, { unitName: uName.trim(), barcode: '', sellingPrice: uPrice }]); setUName(''); setUPrice(0); } }}>{t('product.addUnit')}</button>
            </div>
          </div>
        )}
        {tab === 'tax' && <div>{t('product.taxRate')} <input type="number" value={tax} onChange={(e) => setTax(Number(e.target.value))} style={{ width: 100 }} /></div>}
        {tab === 'inventory' && <div>{t('product.openingStock')} <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 100 }} /> {t('product.mainBranch')}</div>}
        {tab === 'options' && <div>{t('product.noOptions')}</div>}
        {err && <div style={{ color: 'var(--danger-color)', marginTop: 6 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button className="wh-btn wh-btn-primary" onClick={save} disabled={barcodeTaken}>{t('common.save')}</button>
          <button className="wh-btn" onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
