import { useEffect, useState } from 'react';
import { listCategories } from '../../services/api/products.api';
import { productsApi, inventoryApi } from '../../services/api/erp.api';

type Tab = 'pricing' | 'units' | 'tax' | 'inventory' | 'options';

// بيانات صنف — 5-tab replica: mint bg, salmon required name, navy barcode bar.
export function NewProductModal({ barcode, onClose, onSaved }: { barcode: string; onClose: () => void; onSaved: (p: any) => void }) {
  const [tab, setTab] = useState<Tab>('pricing');
  const [cats, setCats] = useState<any[]>([]);
  const [kind, setKind] = useState('stock');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [catId, setCatId] = useState('');
  const [price, setPrice] = useState(0);
  const [tax, setTax] = useState(0);
  const [qty, setQty] = useState(0);
  const [purchaseUnit, setPurchaseUnit] = useState('وحدة');
  const [defaultPurchase, setDefaultPurchase] = useState(true);
  const [supplierCode, setSupplierCode] = useState('');
  const [units, setUnits] = useState<{ unitName: string; barcode: string; sellingPrice: number }[]>([]);
  const [uName, setUName] = useState('');
  const [uPrice, setUPrice] = useState(0);
  const [err, setErr] = useState('');

  useEffect(() => { listCategories().then(setCats).catch(() => {}); }, []);

  async function save() {
    setErr('');
    if (!name.trim()) { setErr('اسم الصنف مطلوب'); return; }
    try {
      const p = await productsApi.create({
        name: name.trim(), description: desc || null, barcode,
        type: kind === 'service' ? 'service' : kind === 'composite' ? 'composite' : 'stock',
        basePrice: price, taxRate: tax, categoryId: catId || null,
        units: units.map((u) => ({ unitName: u.unitName, barcode: u.barcode || null, sellingPrice: u.sellingPrice, conversionFactor: 1 })),
      });
      if (qty > 0) {
        try { await inventoryApi.adjust({ productId: p.id, branchId: 'branch-main', newQty: qty, note: 'opening stock' }); } catch { /* branch may differ */ }
      }
      onSaved(p);
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Save failed');
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pricing', label: 'التسعير' },
    { id: 'units', label: 'وحدات القياس الفرعية' },
    { id: 'tax', label: 'إعدادات ضريبة' },
    { id: 'inventory', label: 'المخزون' },
    { id: 'options', label: 'خيارات' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'grid', placeItems: 'center' }}>
      <div className="wh-modal" style={{ width: 560, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="wh-modal-title">
          <strong>بيانات صنف</strong>
          <span style={{ display: 'flex', gap: 4 }}>
            <button className="wh-btn" title="مساعدة">؟</button>
            <button className="wh-btn" onClick={onClose}>X</button>
          </span>
        </div>
        <div style={{ margin: '8px 0' }}>
          {[['composite', 'صنف مجموع'], ['raw', 'خامات'], ['service', 'صنف خدمي'], ['stock', 'صنف مخزوني']].map(([v, l]) => (
            <label key={v} style={{ marginInlineEnd: 10 }}>
              <input type="radio" checked={kind === v} onChange={() => setKind(v)} /> {l}
            </label>
          ))}
        </div>
        <label>اسم الصنف:</label>
        <input className="wh-required" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
        <label>الوصف:</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
        <label>التصنيف:</label>
        <select value={catId} onChange={(e) => setCatId(e.target.value)} style={{ width: '100%', marginBottom: 6 }}>
          <option value="">—</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label>وحدة الشراء:</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <select value={purchaseUnit} onChange={(e) => setPurchaseUnit(e.target.value)} style={{ width: 160 }}>
            <option value="وحدة">وحدة</option>
            <option value="كرتونة">كرتونة</option>
            <option value="كيلو">كيلو</option>
          </select>
          <label><input type="radio" checked={defaultPurchase} onChange={() => setDefaultPurchase(true)} /> وحدة شراء افتراضية</label>
        </div>
        <label>باركود:</label>
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          <div className="barcode-field" style={{ padding: 8, direction: 'ltr', textAlign: 'left', flex: 1, fontFamily: 'monospace' }}>{barcode}</div>
          <button className="wh-btn" title="مسح باركود">📷</button>
        </div>
        <label>كود المورد:</label>
        <input value={supplierCode} onChange={(e) => setSupplierCode(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
        <div className="wh-tabs">
          {tabs.map((t) => (
            <button key={t.id} className={`wh-tab${tab === t.id ? ' wh-tab-active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        {tab === 'pricing' && (
          <div>قطاعي: <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} style={{ width: 120 }} /> <label><input type="checkbox" checked readOnly /> تحديث</label></div>
        )}
        {tab === 'units' && (
          <div>
            {units.map((u, i) => <div key={i}>{u.unitName} — {u.sellingPrice}</div>)}
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <input placeholder="اسم الوحدة" value={uName} onChange={(e) => setUName(e.target.value)} />
              <input type="number" placeholder="السعر" value={uPrice} onChange={(e) => setUPrice(Number(e.target.value))} style={{ width: 90 }} />
              <button className="wh-btn" onClick={() => { if (uName.trim()) { setUnits([...units, { unitName: uName.trim(), barcode: '', sellingPrice: uPrice }]); setUName(''); setUPrice(0); } }}>إضافة وحدة</button>
            </div>
          </div>
        )}
        {tab === 'tax' && <div>الضريبة %: <input type="number" value={tax} onChange={(e) => setTax(Number(e.target.value))} style={{ width: 100 }} /></div>}
        {tab === 'inventory' && <div>رصيد افتتاحي: <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 100 }} /> (الفرع الرئيسي)</div>}
        {tab === 'options' && <div>لا خيارات إضافية بعد.</div>}
        {err && <div style={{ color: 'red', marginTop: 6 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-start' }}>
          <button className="wh-btn" onClick={save}>💾 حفظ</button>
          <button className="wh-btn" onClick={onClose}>إلغاء/بعد ذلك</button>
        </div>
      </div>
    </div>
  );
}
