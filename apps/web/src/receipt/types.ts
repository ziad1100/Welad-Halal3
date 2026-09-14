/** Receipt data mapped 1:1 from the finalized saved Order — never from cart input. */
export interface ReceiptLine {
  name: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptData {
  invoiceNumber: string;
  /** Order reference as printed, e.g. "143" or "WH-XXXX". */
  orderNumber: string;
  /** Gregorian date DD/MM/YYYY (Latin digits like the reference printout). */
  date: string;
  /** 12h time with Arabic marker: "01:30 م" / "11:05 ص". */
  time: string;
  cashier: string;
  /** Defaults to the generic walk-in label "عميل" (cash-customer flow). */
  customer?: string;
  orderType?: string;
  /** Arabic status label, e.g. "تم التأكيد" once F12 confirm ran. */
  statusAr?: string;
  /** Payment method label, e.g. "نقدي". */
  paymentMethod?: string;
  /** Delivery fee — printed only when > 0 (pickup orders omit the line entirely). */
  deliveryFee?: number;
  /** Cash tendered (from the saved payment row, never the cart). */
  amountPaid?: number;
  /** Change due back. */
  change?: number;
  lines: ReceiptLine[];
  totalItems: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  isCopy: boolean;

  // ── return receipts ─────────────────────────────────────────────────────
  /** True → RETURN RECEIPT variant (إيصال مرتجع) printed from a returned order. */
  isReturn?: boolean;
  /** Link back to the original sale for traceability on the return receipt. */
  originalOrderNumber?: string;
  /** Store contact line, e.g. "01234567890" — printed as للتواصل:. */
  storePhone?: string;
}

/** Helper to turn a returned order into a RETURN RECEIPT. */
export function orderToReturnReceipt(order: any, isCopy = false): ReceiptData {
  const base = orderToReceipt(order, isCopy);
  return {
    ...base,
    isReturn: true,
    originalOrderNumber: String(order.reference ?? ''),
    // Quantities/amounts are shown as negative on the return printout.
    lines: (order.items || []).map((i: any) => ({
      name: i.productName,
      variant: i.unitName || undefined,
      quantity: -Math.abs(Number(i.qty)),
      unitPrice: Number(i.unitPrice),
      lineTotal: -Math.abs(Number(i.lineTotal)),
    })),
    totalItems: (order.items || []).length,
    subtotal: -Math.abs(Number(order.subtotal ?? 0)),
    discount: -Math.abs(Number(order.discountTotal ?? 0)),
    total: -Math.abs(Number(order.total ?? 0)),
  };
}

export type PaperWidth = 58 | 80;

export type OrderRefStyle = 'number' | 'code';

export interface PrinterConfig {
  printerName: string;
  paperWidth: PaperWidth;
  autoPrint: boolean;
  openCashDrawer: boolean;
  /** "طلب #<ref>" (default) or a generated reference code. */
  orderRefStyle: OrderRefStyle;
  // Store branding + footer are hardcoded per the Welad Halal print spec — never configurable.
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  printerName: '',
  paperWidth: 80,
  autoPrint: true,
  openCashDrawer: true,
  orderRefStyle: 'number',
};

/** Hardcoded on receipts per spec — NOT pulled from settings. */
export const STORE_NAME_AR = 'ولاد حلال';
export const FOOTER_AR = 'شكراً لتسوقك من ولاد حلال';
export const FOOTER_EN = 'Thank you for shopping with Welad Halal!';

export type PrintStatus = 'idle' | 'printing' | 'success' | 'failed';

export const ORDER_TYPE_AR: Record<string, string> = { pickup: 'استلام', delivery: 'توصيل', PICKUP: 'استلام', RECEIVE: 'استقبال', DELIVERY: 'توصيل' };

/** Receipt-local status wording (spec: confirmed → "تم التأكيد"). */
export const STATUS_AR: Record<string, string> = {
  pending: 'معلق', held: 'محجوز', confirmed: 'تم التأكيد', cancelled: 'ملغي', returned: 'مرتجع',
  PENDING: 'معلق', HELD: 'محجوز', CONFIRMED: 'تم التأكيد', COMPLETED: 'مكتمل', CANCELLED: 'ملغي', RETURNED: 'مرتجع',
};

function arDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function arTime(d: Date): string {
  const h24 = d.getHours();
  const h = String(h24 % 12 || 12).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${h24 >= 12 ? 'م' : 'ص'}`;
}

/** Map a saved local-backend order onto receipt data. Totals copied verbatim. */
export function orderToReceipt(order: any, isCopy = false, opts?: { storePhone?: string }): ReceiptData {
  const d = new Date(order.createdAt);
  const pay = (order.payments || [])[0];
  return {
    invoiceNumber: String(order.reference ?? ''),
    orderNumber: String(order.reference ?? ''),
    date: arDate(d),
    time: arTime(d),
    cashier: order.user?.fullName || order.user?.username || '—',
    customer: order.customer?.name || 'عميل',
    orderType: order.type ? ORDER_TYPE_AR[order.type] || order.type : undefined,
    statusAr: STATUS_AR[order.status] || order.status,
    paymentMethod: order.paymentMethod === 'card' ? 'بطاقة' : 'نقدي',
    deliveryFee: Number(order.deliveryFee ?? 0) || 0,
    lines: (order.items || []).map((i: any) => ({
      name: i.productName,
      variant: i.unitName || undefined,
      quantity: Number(i.qty),
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.lineTotal),
    })),
    totalItems: (order.items || []).length,
    subtotal: Number(order.subtotal ?? 0),
    discount: Number(order.discountTotal ?? 0),
    tax: 0,
    total: Number(order.total ?? 0),
    isCopy,
    amountPaid: pay ? Number(pay.amount) : undefined,
    change: pay ? Number(pay.change) : undefined,
    storePhone: opts?.storePhone || undefined,
  };
}
