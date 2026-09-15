// Print routing: browser fallback (react-to-print) vs direct WebUSB thermal.
// Thermal printer is OUTPUT ONLY — no barcode logic here (see useBarcodeScanner).

export type StoredPrinter = { vendorId: number; productId: number; name: string };

const KEY = 'receipt_printer_device';

export function getStoredPrinter(): StoredPrinter | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.vendorId !== 'number') return null;
    return p;
  } catch {
    return null;
  }
}

export function supportsWebUSB(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as any).usb;
}

// Minimal ESC/POS: init, center, bold, text (latin/transliterated), feed, cut.
// Arabic glyphs depend on printer firmware; HTML fallback covers full Arabic.
export function generateEscPosReceipt(order: any): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const push = (...bytes: number[]) => chunks.push(new Uint8Array(bytes));
  const text = (s: string) => chunks.push(enc.encode(s + '\n'));
  push(0x1b, 0x40); // init
  push(0x1b, 0x61, 0x01); // center
  push(0x1b, 0x45, 0x01); // bold on
  text('WELAD HALAL');
  push(0x1b, 0x45, 0x00);
  text('--------------------------------');
  push(0x1b, 0x61, 0x00); // left
  text(`Order #${order.reference ?? order.id ?? ''}`);
  text(`Total: ${Number(order.total ?? 0).toFixed(2)} EGP`);
  text(`Date: ${order.createdAt ?? ''}`);
  for (const it of order.items ?? order.lines ?? []) {
    const qty = it.qty ?? it.quantity ?? 1;
    const nm = String(it.productName ?? it.name ?? 'item').slice(0, 24);
    const amt = Number(it.lineTotal ?? (it.price ?? 0) * qty).toFixed(2);
    text(`${qty}x ${nm}  ${amt}`);
  }
  text('--------------------------------');
  text('Thank you - Shokran!');
  push(0x0a, 0x0a, 0x0a);
  push(0x1d, 0x56, 0x00); // cut
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export async function printViaUSB(data: Uint8Array, printer: StoredPrinter): Promise<void> {
  const usb = (navigator as any).usb;
  if (!usb) throw new Error('WebUSB unsupported');
  const device = await usb.requestDevice({ filters: [{ vendorId: printer.vendorId }] });
  await device.open();
  try {
    await device.selectConfiguration(1);
    await device.claimInterface(0);
    // endpoint 1 is conventional for bulk-out thermal printers
    await device.transferOut(1, data);
  } finally {
    try {
      await device.close();
    } catch {
      /* ignore */
    }
  }
}

export function toast(msg: string) {
  // lightweight toast hook point — falls back to alert-free inline event
  window.dispatchEvent(new CustomEvent('wh-toast', { detail: msg }));
}
