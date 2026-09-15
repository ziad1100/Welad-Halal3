import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import { buildTextReceipt, generateEscPosReceipt, getStoredPrinter, printViaUSB, toast } from '../lib/printer';

// Routes: desktop bridge > WebUSB direct (if device stored) > browser dialog.
// Copies: USB transports repeat the buffer N times; browser prints once and the
// user sets copies in the system dialog (browsers expose no copies API).
// On USB failure: fall back to browser dialog + toast (never crash).
export function useReceiptPrinter() {
  const { t } = useTranslation();
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
      const timer = setTimeout(() => {
        try {
          (browserPrint as any)?.();
        } finally {
          // onAfterPrint cleans up; safety timeout in case callback missing
          setTimeout(() => document.body.classList.remove('printing-receipt'), 2000);
          setPendingBrowserPrint(false);
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [pendingBrowserPrint, printableOrder, browserPrint]);

  const printOrder = useCallback(async (order: any, copies = 1) => {
    setPrintableOrder(order);
    // Level 3: desktop shell bridge
    const desktop = (window as any).whDesktop;
    if (desktop?.printReceipt) {
      try {
        const text = buildTextReceipt(order);
        for (let i = 0; i < Math.max(1, copies); i++) {
          // eslint-disable-next-line no-await-in-loop
          await desktop.printReceipt(text);
        }
        return 'desktop';
      } catch {
        /* fall through to USB/browser */
      }
    }
    const stored = getStoredPrinter();
    if (stored) {
      try {
        const buf = generateEscPosReceipt(order);
        for (let i = 0; i < Math.max(1, copies); i++) {
          // eslint-disable-next-line no-await-in-loop
          await printViaUSB(buf, stored);
        }
        return 'usb';
      } catch {
        toast(t('pos.printFailed'));
      }
    }
    setPendingBrowserPrint(true);
    return 'browser';
  }, [t]);

  return { receiptRef, printableOrder, setPrintableOrder, printOrder };
}

// Synthetic order object for printer self-test (Arabic header per receipt policy)
export function buildTestPrintOrder(paper: string) {
  return {
    reference: 'TEST',
    createdAt: new Date().toISOString(),
    customerName: '—',
    statusLabel: 'تجربة',
    paymentMethodLabel: '—',
    items: [],
    subtotal: 0,
    total: 0,
    notes: paper === '58mm' ? 'اختبار طابعة 58مم — الطابعة تعمل بشكل صحيح' : 'اختبار طابعة 80مم — الطابعة تعمل بشكل صحيح',
    isTest: true,
  };
}
