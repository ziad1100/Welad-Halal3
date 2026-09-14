import type { PrinterConfig } from './types';

export interface PrintLine {
  text: string;
  style?: { size?: 'xl' | 'lg' | 'normal' | 'sm'; bold?: boolean; align?: 'center' | 'start' };
}

export interface PrintJob {
  lines: PrintLine[];
  cut?: boolean;
  openDrawer?: boolean;
}

export interface Transport {
  readonly kind: string;
  listPrinters(): Promise<string[]>;
  print(job: PrintJob, cfg: PrinterConfig): Promise<void>;
  openDrawer(cfg: PrinterConfig): Promise<void>;
}

const SIZE_PX = { xl: 26, lg: 20, normal: 13, sm: 11 } as const;

/** Browser transport: print-preview window (works today, no hardware needed). */
export class BrowserPrintTransport implements Transport {
  readonly kind = 'browser';
  async listPrinters(): Promise<string[]> {
    return []; // OS discovery requires Electron/Node
  }
  async print(job: PrintJob): Promise<void> {
    const w = window.open('', '_blank', 'width=400,height=760');
    if (!w) throw new Error('blocked');
    // Narrow thermal-width sheet (80mm), monospace, per-line emphasis.
    const body = job.lines
      .map((l) => {
        const st = l.style || {};
        const px = SIZE_PX[st.size || 'normal'];
        const weight = st.bold ? 'bold' : 'normal';
        const align = st.align === 'center' ? 'center' : 'right'; // RTL default: labels right
        const txt = escapeHtml(l.text) || '&nbsp;';
        return `<div style="font-size:${px}px;font-weight:${weight};text-align:${align};min-height:${Math.round(px * 1.35)}px">${txt}</div>`;
      })
      .join('');
    w.document.write(
      `<html dir="rtl"><head><title>معاينة الفاتورة</title><style>` +
        `@page{size:80mm auto;margin:0} body{font-family:'Courier New',monospace;width:280px;margin:0 auto;padding:6px;font-size:13px} div{white-space:pre-wrap}` +
        `</style></head><body>${body}<script>onload=()=>{print();}<\/script></body></html>`,
    );
    w.document.close();
  }
  async openDrawer(): Promise<void> {
    throw new Error('drawer-unsupported');
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Electron/Node transport seam: implemented in apps/desktop via
 * node-thermal-printer (ESC/POS, raster Arabic, cutter, drawer kick).
 * Kept as an interface here so UI/services never change when it lands.
 */
export class NodeThermalTransport implements Transport {
  readonly kind = 'node-thermal';
  async listPrinters(): Promise<string[]> {
    throw new Error('electron-only');
  }
  async print(): Promise<void> {
    throw new Error('electron-only');
  }
  async openDrawer(): Promise<void> {
    throw new Error('electron-only');
  }
}
