import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid var(--border-color)', marginBottom: 8, background: 'var(--bg-card)' }}>
      <button className="wh-btn" onClick={() => setOpen((o) => !o)} style={{ width: '100%', textAlign: 'start' }}>
        {open ? '▼' : '▶'} {title}
      </button>
      {open && <div style={{ padding: 12, color: 'var(--text-primary)' }}>{children}</div>}
    </div>
  );
}

export function HelpPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language !== 'en';
  return (
    <div style={{ padding: 12, maxWidth: 800 }}>
      <h3>{ar ? 'مساعدة — دليل الاستخدام' : 'Help — User Guide'}</h3>
      <Section title={ar ? 'الأدوار وتسجيل الدخول' : 'Roles & Login'}>
        {ar ? (
          <p>المالك (Owner) له صلاحية كاملة على النظام بما في ذلك حذف حسابات المديرين. المدير (Manager) يقدر يدير كل الموديولات بما فيها إضافة مستخدمين، لكن لا يقدر يعدل أو يحذف مديرين آخرين أو المالك. الموظف (Employee) يقدر يستخدم شاشة الكاشير فقط.</p>
        ) : (
          <p>Owner has full access including deleting managers. Managers can run all modules including adding users, but cannot edit/delete other managers or the owner. Employees can use the cashier screen only.</p>
        )}
      </Section>
      <Section title={ar ? 'نظام الشيفت' : 'Shift System'}>
        {ar ? (
          <div>
            <p>إدخال العهدة الافتتاحية إجباري للموظفين، واختياري/قابل للتخطي للمديرين.</p>
            <p>الرصيد المتوقع = العهدة الافتتاحية + مبيعات الكاش − المرتجعات النقدية في نفس الوردية.</p>
            <p>الفرق = الفعلي − المتوقع. عرض الفروقات في: الموارد البشرية ← سجل الورديات.</p>
          </div>
        ) : (
          <div>
            <p>Opening cash is mandatory for employees, skippable for managers.</p>
            <p>Expected = opening + cash sales − cash refunds in the shift window.</p>
            <p>View discrepancies at HR → Shift history.</p>
          </div>
        )}
      </Section>
      <Section title={ar ? 'إضافة المستخدمين' : 'Adding Users'}>
        {ar ? (
          <p>من صفحة الإدارة (Admin)، أي مالك أو مدير يقدر يضيف مستخدم جديد بالضغط على 'إضافة مستخدم'، إدخال الاسم واسم المستخدم وكلمة المرور، واختيار النوع (مدير أو موظف).</p>
        ) : (
          <p>From Admin, any owner or manager can add a user via 'Add user', entering name, username, password, and type (manager or employee).</p>
        )}
      </Section>
      <Section title={ar ? 'إضافة الأصناف' : 'Adding Products'}>
        {ar ? (
          <div>
            <p>يدويًا: من المخزن ← زر 'إضافة صنف' واملأ البيانات.</p>
            <p>تلقائيًا: امسح باركود غير معروف في شاشة الكاشير → يفتح نموذج صنف جديد مملوء بالباركود → احفظ ليُضاف للسلة.</p>
          </div>
        ) : (
          <div>
            <p>Manual: Inventory → 'Add item' and fill the form.</p>
            <p>Automatic: scan an unknown barcode at Cashier → new-product form opens prefilled → save to add to cart.</p>
          </div>
        )}
      </Section>
      <Section title={ar ? 'إعداد الطابعة' : 'Printer Setup'}>
        {ar ? (
          <p>من الإدارة ← الإعدادات ← طابعة الإيصالات ← اضغط 'اكتشاف الأجهزة' واختر طابعتك من القائمة التي يعرضها المتصفح. إذا لم تختر طابعة، ستتم الطباعة عبر نافذة الطباعة العادية في المتصفح.</p>
        ) : (
          <p>From Admin → Settings → Receipt printer → 'Discover devices' and pick your printer from the browser list. Without a printer, the normal browser print dialog is used.</p>
        )}
      </Section>
      <Section title={ar ? 'اللغة والمظهر' : 'Language & Theme'}>
        {ar ? (
          <p>زر اللغة يبدّل كل نصوص الواجهة (القوائم والأزرار والجداول) لكن الإيصالات تطبع بالعربية دائمًا regardless. زر القمر/الشمس يبدّل الوضع الداكن ويُحفظ عبر الجلسات.</p>
        ) : (
          <p>The language toggle switches all UI text but receipts always print in Arabic. The moon/sun toggle switches dark mode and persists across sessions.</p>
        )}
      </Section>
    </div>
  );
}
