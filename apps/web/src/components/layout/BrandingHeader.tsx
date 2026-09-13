export function BrandingHeader() {
  return (
    <div className="wh-branding">
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: '#E85528', fontWeight: 'bold', fontSize: 20 }}>برنامج إدارة الطلبات</div>
        <div style={{ color: '#555', fontSize: 12 }}>إصدار محدث</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <span title="محطة">🖥</span>
          <span title="طباعة">🖨</span>
          <span title="تحديث">🔄</span>
        </div>
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontWeight: 'bold', fontSize: 22 }}>
          <span style={{ color: '#E85528' }}>◤</span> ولاد حلال
        </div>
        <div style={{ fontSize: 11, color: '#555' }}>WELAD HALAL SOLUTIONS</div>
      </div>
    </div>
  );
}
