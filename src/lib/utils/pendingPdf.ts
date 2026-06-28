// Builds the pending-fees / dues list as a real multi-page PDF (raw bytes).
// Pure JS (no DOM), so it runs on the server (API route) for a reliable native
// browser download on every device.

import { formatCurrency } from './currency';
import { formatDate } from './dates';
import { generatePagedPdfBytes, PDF_PAGE_W, PDF_PAGE_H, PdfTextItem, PdfLineItem } from './pdf';

export interface PendingStudent {
  name?: string;
  branchName?: string;
  batchName?: string;
  mobileNumber?: string;
  parentMobile?: string;
  yearlyFees?: number;
  totalPaidAmount?: number;
  pendingAmount?: number;
}

export function buildPendingFeesPdfBytes(
  students: PendingStudent[],
  grandTotalDue: number,
  metaLine: string,
  heading = 'Pending Fees / Dues List'
): Uint8Array {
  const LX = 36;
  const RX = PDF_PAGE_W - 36;
  const C = { idx: 36, name: 54, bb: 188, mob: 300, yearly: 372, paid: 442, pend: 508 };

  const pages: Array<{ items: PdfTextItem[]; lines: PdfLineItem[] }> = [];
  let items: PdfTextItem[] = [];
  let lines: PdfLineItem[] = [];
  let y = 0;

  const flush = () => { if (items.length || lines.length) pages.push({ items, lines }); items = []; lines = []; };

  const header = (first: boolean) => {
    flush();
    y = 40;
    if (first) {
      items.push({ text: 'EKLAVYA CLASSES', x: LX, y, size: 15, bold: true }); y += 18;
      items.push({ text: heading, x: LX, y, size: 11, bold: true }); y += 13;
      items.push({ text: metaLine, x: LX, y, size: 8 }); y += 16;
    } else {
      items.push({ text: heading + ' (continued)', x: LX, y, size: 10, bold: true }); y += 16;
    }
    items.push({ text: '#', x: C.idx, y, size: 8, bold: true });
    items.push({ text: 'Student', x: C.name, y, size: 8, bold: true });
    items.push({ text: 'Branch / Batch', x: C.bb, y, size: 8, bold: true });
    items.push({ text: 'Mobile', x: C.mob, y, size: 8, bold: true });
    items.push({ text: 'Yearly', x: C.yearly, y, size: 8, bold: true });
    items.push({ text: 'Paid', x: C.paid, y, size: 8, bold: true });
    items.push({ text: 'Pending', x: C.pend, y, size: 8, bold: true });
    y += 4;
    lines.push({ x1: LX, y1: y, x2: RX, y2: y, width: 0.6 });
    y += 12;
  };

  header(true);
  students.forEach((s, i) => {
    if (y > PDF_PAGE_H - 50) header(false);
    items.push({ text: String(i + 1), x: C.idx, y, size: 8 });
    items.push({ text: String(s.name || '').slice(0, 24), x: C.name, y, size: 8 });
    items.push({ text: (String(s.branchName || '') + (s.batchName ? ' / ' + s.batchName : '')).slice(0, 22), x: C.bb, y, size: 7 });
    items.push({ text: String(s.mobileNumber || s.parentMobile || '-').slice(0, 12), x: C.mob, y, size: 7 });
    items.push({ text: formatCurrency(s.yearlyFees || 0), x: C.yearly, y, size: 7 });
    items.push({ text: formatCurrency(s.totalPaidAmount || 0), x: C.paid, y, size: 7 });
    items.push({ text: formatCurrency(s.pendingAmount || 0), x: C.pend, y, size: 8, bold: true });
    y += 13;
  });

  if (y > PDF_PAGE_H - 40) header(false);
  y += 6;
  lines.push({ x1: LX, y1: y - 10, x2: RX, y2: y - 10, width: 0.8 });
  items.push({ text: 'Grand Total Outstanding:', x: C.bb, y, size: 9, bold: true });
  items.push({ text: formatCurrency(grandTotalDue || 0), x: C.pend, y, size: 9, bold: true });
  flush();

  return generatePagedPdfBytes(pages);
}
