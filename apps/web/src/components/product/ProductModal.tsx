import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCategories, barcodeLookup } from '../../services/api/products.api';
import { inventoryApi, productsApi } from '../../services/api/erp.api';
import { Modal } from '../shared/ui';
import { SearchableSelect } from '../shared/SearchableSelect';
import { SearchableDatalist } from '../shared/SearchableDatalist';
import { lookupSuppliers, lookupCategoriesLocal } from '../../services/api/lookups';

const TYPES = [
  { v: 'composite', l: 'صنف مجموع' },
  { v: 'stock-raw', l: 'خامات' },
  { v: 'service', l: 'صنف خدمي' },
  { v: 'stock', l: 'صنف مخزوني' },
];

const PURCHASE_UNITS = ['قطعة', 'كيلو', 'جرام', 'لتر', 'علبة', 'كرتونة', 'شوال', 'متر', 'وحدة'];

function errMsg(e: any): string {
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join('، ');
  if (typeof m === 'string' && m.trim()) return m;
  return 'حدث خطأ — حاول مرة أخرى';
}

export function ProductModal({ barcode, initialName, onClose, onSaved }: { barcode?: string; initialName?: string; onClose: () => void; onSaved: (p: any) => void }) {
  const [tab, setTab] = useState('pricing');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: initialName || '', unit: 'وحدة', barcode: barcode || '',
    supplierCode: '', supplierId: '', description: '', retailPrice: 0, taxRate: 0,
    quantity: 0, productType: 'stock', categoryId: '',
  });
  const [tiers, setTiers] = useState<{ tier: string; price: number }[]>([{ tier: 'قطاعي', price: 0 }]);
  const [units, setUnits] = useState<{ unit: string; factor: number; price: number }[]>([]);
  // Pricing tab: "تحديث" links the قطاعي tier price to the real retail price.
  const [syncTierPrice, setSyncTierPrice] = useState(true);
  const [defaultUnit, setDefaultUnit] = useState(true);
  const { data: cats } = useQuery({ queryKey: ['cats'], queryFn: async () => listCategories() });

  async function save() {
    setErr('');
    if (!f.name.trim()) { setErr('اسم الصنف مطلوب'); return; }
    // New-product check: verify barcode doesn't already exist locally.
    if (f.barcode.trim()) {
      try {
        const hit = await barcodeLookup(f.barcode.trim());
        if (hit?.product?.id) { setErr(`الباركود "${f.barcode.trim()}" مسجل مسبقاً للصنف: ${hit.product.name}`); return; }
      } catch { /* not found → free to use */ }
    }
    setBusy(true);
    try {
      const created = await productsApi.create({
        name: f.name.trim(),
        description: f.description.trim() || null,
        barcode: f.barcode.trim() || null,
        type: f.productType === 'service' ? 'service' : f.productType === 'composite' ? 'composite' : 'stock',
        basePrice: Number(f.retailPrice) || 0,
        taxRate: Number(f.taxRate) || 0,
        categoryId: f.categoryId || null,
        units: units.filter((u) => u.unit.trim() && u.factor > 0).map((u) => ({
          unitName: u.unit.trim(), barcode: null, sellingPrice: Number(u.price) || 0, conversionFactor: Number(u.factor) || 1,
        })),
      });
      if (Number(f.quantity) > 0) {
        try { await inventoryApi.adjust({ productId: created.id, branchId: 'branch-main', newQty: Number(f.quantity), note: 'opening stock' }); } catch { /* branch may differ */ }
      }
      onSaved({ ...created, basePrice: Number(f.retailPrice) || 0 });
    } catch (e: any) { setErr(errMsg(e)); }
    finally { setBusy(false); }
  }

  function setTierPrice(i: number, price: number) {
    setTiers(tiers.map((x, j) => j === i ? { ...x, price } : x));
    // "تحديث": the قطاعي row drives the real retail price.
    if (syncTierPrice && i === 0) setF((prev) => ({ ...prev, retailPrice: price }));
  }

  return (
    <Modal title="بيانات صنف" onClose={onClose} modalClass="product-modal" footer={<><button className="kbtn kbtn-primary" disabled={busy} onClick={() => void save()}>💾 حفظ</button><button className="kbtn" onClick={onClose}>إلغاء (ESC)</button></>}>
      {err && <div className="kerr">{err}</div>}
      {/* item-type radio group, right-to-left: مجموع | خامات | خدمي | مخزوني */}
      <div className="krow" role="radiogroup" aria-label="نوع الصنف">
        <span className="klabel">النوع:</span>
        {TYPES.map((t) => (
          <label key={t.v} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginInlineEnd: 10 }}>
            <input type="radio" name="product-type" checked={f.productType === t.v} onChange={() => setF({ ...f, productType: t.v })} />
            {t.l}
          </label>
        ))}
      </div>
      <div className="krow">
        <span className="klabel">اسم الصنف *</span>
        <input className="kinput product-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={{ width: 220 }} />
        <span className="klabel">وحدة الشراء</span>
        <SearchableDatalist value={f.unit} options={PURCHASE_UNITS.map((u) => ({ value: u, label: u }))}
          placeholder="اكتب أو اختر الوحدة…" onChange={(v) => setF({ ...f, unit: v })} />
        <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
          <input type="checkbox" checked={defaultUnit} onChange={(e) => setDefaultUnit(e.target.checked)} />
          وحدة شراء افتراضية
        </label>
      </div>
      <div className="krow">
        <span className="klabel">الباركود</span>
        <input className="kinput product-barcode" value={f.barcode} dir="ltr" readOnly={!!barcode} onChange={(e) => setF({ ...f, barcode: e.target.value })} />
        <button className="kbtn" title="مسح باركود">📷</button>
        <span className="klabel">كود المورد</span><input className="kinput" value={f.supplierCode} onChange={(e) => setF({ ...f, supplierCode: e.target.value })} style={{ width: 110 }} />
      </div>
      <div className="krow">
        <SearchableSelect label="التصنيف" value={f.categoryId} loadOptions={lookupCategoriesLocal(cats || [])}
          placeholder="اكتب أو اختر التصنيف…" onChange={(v) => setF({ ...f, categoryId: v })} />
        <SearchableSelect label="المورد" value={f.supplierId} loadOptions={lookupSuppliers()}
          placeholder="اكتب أو اختر المورد…" onChange={(v) => setF({ ...f, supplierId: v })} />
      </div>
      <div className="krow">
        <span className="klabel">الوصف</span><input className="kinput" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} style={{ width: '100%' }} />
      </div>
      <div className="ktabs">
        {['pricing|التسعير', 'units|وحدات القياس الفرعية', 'tax|إعدادات ضريبة', 'inventory|المخزون', 'options|خيارات'].map((t) => {
          const [v, l] = t.split('|');
          return <button key={v} className={tab === v ? 'active' : ''} onClick={() => setTab(v)}>{l}</button>;
        })}
      </div>
      {tab === 'pricing' && (
        <>
          <div className="krow">
            <span className="klabel">قطاعي</span>
            <input className="kinput" type="number" value={tiers[0]?.price ?? 0} onChange={(e) => setTierPrice(0, Number(e.target.value))} style={{ width: 110 }} />
            <label style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
              <input type="checkbox" checked={syncTierPrice} onChange={(e) => setSyncTierPrice(e.target.checked)} />
              تحديث
            </label>
          </div>
          <h4>شرائح سعرية إضافية (قطاعي/جملة…)</h4>
          {tiers.slice(1).map((t, k) => {
            const i = k + 1;
            return (
              <div className="krow" key={i}>
                <input className="kinput" placeholder="الشريحة" value={t.tier} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, tier: e.target.value } : x))} style={{ width: 110 }} />
                <input className="kinput" type="number" value={t.price} onChange={(e) => setTierPrice(i, Number(e.target.value))} style={{ width: 100 }} />
                <button className="kbtn" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>حذف</button>
              </div>
            );
          })}
          <button className="kbtn" onClick={() => setTiers([...tiers, { tier: '', price: 0 }])}>+ شريحة</button>
        </>
      )}
      {tab === 'units' && (
        <>
          {units.map((u, i) => (
            <div className="krow" key={i}>
              <input className="kinput" placeholder="الوحدة (كرتونة…)" value={u.unit} onChange={(e) => setUnits(units.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} style={{ width: 130 }} />
              <input className="kinput" type="number" title="المعامل" value={u.factor} onChange={(e) => setUnits(units.map((x, j) => j === i ? { ...x, factor: Number(e.target.value) } : x))} style={{ width: 80 }} />
              <input className="kinput" type="number" title="السعر" value={u.price} onChange={(e) => setUnits(units.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} style={{ width: 100 }} />
              <button className="kbtn" onClick={() => setUnits(units.filter((_, j) => j !== i))}>حذف</button>
            </div>
          ))}
          <button className="kbtn" onClick={() => setUnits([...units, { unit: '', factor: 1, price: 0 }])}>+ وحدة فرعية</button>
        </>
      )}
      {tab === 'tax' && (
        <div className="krow">
          <span className="klabel">نسبة الضريبة %</span><input className="kinput" type="number" value={f.taxRate} onChange={(e) => setF({ ...f, taxRate: Number(e.target.value) })} style={{ width: 110 }} />
        </div>
      )}
      {tab === 'inventory' && (
        <div className="krow">
          <span className="klabel">رصيد افتتاحي</span><input className="kinput" type="number" value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} style={{ width: 110 }} />
        </div>
      )}
      {tab === 'options' && <div className="kpanel">خيارات إضافية للصنف — تُحفظ مع البطاقة.</div>}
    </Modal>
  );
}
