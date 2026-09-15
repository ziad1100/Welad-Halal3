import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { generateEscPosReceipt, getStoredPrinter, printViaUSB, toast } from '../lib/printer';

// Routes: WebUSB direct if a printer is stored, else browser dialog via react-to-print.
// On USB failure: fall back to browser dialog + toast (never crash).
export function useReceiptPrinter() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [printableOrder, setPrintableOrder] = useState<any>(null);
  const [pendingBrowserPrint, setPendingBrowserPrint] = useState(false);

  const browserPrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: printableOrder ? `receipt-${printableOrder.reference ?? printableOrder.id}` : 'receipt',
    onAfterPrint: () => {
      document.body.classList.remove('printing-receipt');
      setPendingBrowserPrint(false);
    },
  } as any);

  // When order is set and browser fallback requested, fire after paint so hidden ref is mounted
  useEffect(() => {
    if (pendingBrowserPrint && printableOrder) {
      document.body.classList.add('printing-receipt');
      const t = setTimeout(() => {
        try {
          (browserPrint as any)?.();
        } finally {
          // onAfterPrint cleans up; safety timeout in case callback missing
          setTimeout(() => document.body.classList.remove('printing-receipt'), 2000);
          setPendingBrowserPrint(false);
        }
      }, 120);
      return () => clearTimeout(t);
    }
  }, [pendingBrowserPrint, printableOrder, browserPrint]);

  const printOrder = useCallback(async (order: any) => {
    setPrintableOrder(order);
    const stored = getStoredPrinter();
    if (stored) {
      try {
        await printViaUSB(generateEscPosReceipt(order), stored);
        return;
      } catch {
        toast('تعذر الطباعة المباشرة، تم فتح نافذة الطباعة العادية');
      }
    }
    setPendingBrowserPrint(true);
  }, []);

  return { receiptRef, printableOrder, setPrintableOrder, printOrder };
}
