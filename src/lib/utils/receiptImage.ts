// Renders a styled fee-receipt as a PNG image using the HTML canvas — same look as
// the printed receipt (logo, navy header, ₹ amounts, bordered rows, payment
// history, signatures). An image shares cleanly on WhatsApp and looks identical on
// every phone, unlike the plain text PDF. Zero dependencies.

import { formatCurrency } from './currency';
import { formatDate, formatMonthOnly } from './dates';

export interface ReceiptImageTotals {
  yearlyFee: number;
  totalPaid: number;
  remaining: number;
}

let _logo: HTMLImageElement | null = null;
let _logoTried = false;

// Loads /logo.png once (same-origin, so the canvas stays untainted and exportable).
function loadLogo(): Promise<HTMLImageElement | null> {
  if (_logo || _logoTried) return Promise.resolve(_logo);
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => { _logo = img; _logoTried = true; resolve(img); };
      img.onerror = () => { _logoTried = true; resolve(null); };
      img.src = '/logo.png';
    } catch {
      _logoTried = true;
      resolve(null);
    }
  });
}

// Preload so the image is ready the instant the user taps Share (keeps the share
// within the click gesture on mobile).
export function preloadReceiptLogo(): void {
  void loadLogo();
}

export async function buildReceiptImageBlob(
  payment: any,
  history: any[],
  totals: ReceiptImageTotals
): Promise<Blob> {
  const logo = await loadLogo();
  const student = payment?.studentId || {};
  const receiptId = payment._id ? payment._id.toString().slice(-8).toUpperCase() : '-';
  const paymentMode = payment.paymentType
    ? payment.paymentType.charAt(0).toUpperCase() + payment.paymentType.slice(1)
    : 'N/A';
  const batchLine = `${student.batchId?.name || 'N/A'}${student.batchId?.timing ? ' · ' + student.batchId.timing : ''}`;

  const detail: Array<[string, string]> = [
    ['Receipt ID:', `#${receiptId}`],
    ['Date:', formatDate(payment.transactionDate)],
    ['Student Name:', (student.name || 'Student').toUpperCase()],
    ['Standard / Batch Code:', `Std ${student.standard || 'N/A'} · ${batchLine}`],
    ['Branch:', student.branchId?.name || 'N/A'],
    ['Joined Date:', formatDate(student.joinDate)],
    ['Fee Month:', formatMonthOnly(payment.feeMonth)],
    ['Payment Mode:', paymentMode],
    ['Yearly Fee:', formatCurrency(totals.yearlyFee)],
    ['Total Paid (to date):', formatCurrency(totals.totalPaid)],
    ['Pending Amount:', formatCurrency(totals.remaining)],
  ];
  const hist = Array.isArray(history) ? history : [];

  const scale = 2;            // retina-crisp
  const W = 760;
  const PAD = 44;
  const rowH = 34;
  const headerH = 116;
  const amtH = 92;
  const histH = hist.length ? 56 + hist.length * 28 : 0;
  const sigH = 120;
  const H = headerH + detail.length * rowH + 22 + amtH + histH + sigH + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.scale(scale, scale);

  const NAVY = '#0d1b4b', DARK = '#1a1a1a', GRAY = '#555555', LINE = '#e5e7eb', GOLD = '#b8860b';
  const SERIF = 'Georgia, "Times New Roman", serif';

  // background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  let y = PAD;

  // ── Header ──
  if (logo) { try { ctx.drawImage(logo, PAD, y, 74, 74); } catch {} }
  ctx.textAlign = 'left';
  ctx.fillStyle = NAVY;
  ctx.font = `800 32px ${SERIF}`;
  ctx.fillText('EKLAVYA CLASSES', PAD + 90, y + 30);
  ctx.fillStyle = GRAY;
  ctx.font = `15px "Noto Sans Gujarati", "Nirmala UI", Arial, sans-serif`;
  ctx.fillText('જ્ઞાનથી ઉજ્જવળ ભવિષ્ય તરફ ✨', PAD + 90, y + 52);
  ctx.fillStyle = DARK;
  ctx.font = `700 13px ${SERIF}`;
  ctx.fillText('F E E   R E C E I P T', PAD + 90, y + 72);

  y += headerH - 24;
  ctx.strokeStyle = DARK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();

  // ── Detail rows ──
  for (const [label, value] of detail) {
    y += rowH;
    ctx.fillStyle = GRAY; ctx.textAlign = 'left'; ctx.font = `14px ${SERIF}`;
    ctx.fillText(label, PAD, y - 11);
    ctx.fillStyle = DARK; ctx.textAlign = 'right'; ctx.font = `700 14px ${SERIF}`;
    ctx.fillText(value, W - PAD, y - 11);
    ctx.strokeStyle = LINE; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  }

  // ── Amount Received banner ──
  y += 16;
  ctx.strokeStyle = DARK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  y += 44;
  ctx.fillStyle = DARK; ctx.textAlign = 'left'; ctx.font = `800 21px ${SERIF}`;
  ctx.fillText('Amount Received:', PAD, y);
  ctx.fillStyle = NAVY; ctx.textAlign = 'right'; ctx.font = `800 27px ${SERIF}`;
  ctx.fillText(formatCurrency(payment.amount || 0), W - PAD, y + 2);
  y += 18;
  ctx.strokeStyle = DARK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();

  // ── Payment history ──
  if (hist.length) {
    y += 34;
    ctx.fillStyle = DARK; ctx.textAlign = 'left'; ctx.font = `700 15px ${SERIF}`;
    ctx.fillText('Payment History', PAD, y);
    y += 10;
    ctx.strokeStyle = DARK; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    const cDate = PAD, cAmt = PAD + 150, cMode = PAD + 300, cNote = PAD + 410;
    y += 8;
    ctx.fillStyle = DARK; ctx.font = `700 12px ${SERIF}`;
    ctx.fillText('Date', cDate, y + 11);
    ctx.fillText('Amount', cAmt, y + 11);
    ctx.fillText('Mode', cMode, y + 11);
    ctx.fillText('Note', cNote, y + 11);
    y += 18;
    for (const h of hist) {
      y += 28;
      ctx.fillStyle = DARK; ctx.font = `12px ${SERIF}`;
      ctx.fillText(formatDate(h.transactionDate || h.createdAt), cDate, y - 9);
      ctx.font = `700 12px ${SERIF}`;
      ctx.fillText(formatCurrency(h.amount), cAmt, y - 9);
      ctx.font = `12px ${SERIF}`;
      ctx.fillText(String(h.paymentType || '').toUpperCase(), cMode, y - 9);
      ctx.fillStyle = GRAY;
      ctx.fillText(String(h.notes || `Fee payment of ${formatCurrency(h.amount)}`).slice(0, 30), cNote, y - 9);
      ctx.strokeStyle = LINE; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    }
  }

  // ── Signatures ──
  y += 70;
  ctx.strokeStyle = GRAY; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(PAD + 130, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - PAD - 140, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  ctx.fillStyle = DARK; ctx.textAlign = 'left'; ctx.font = `700 12px ${SERIF}`;
  ctx.fillText(payment.createdBy?.name || 'System Admin', PAD, y + 17);
  ctx.fillStyle = GRAY; ctx.font = `11px ${SERIF}`;
  ctx.fillText('Issuer', PAD, y + 31);
  ctx.textAlign = 'right'; ctx.font = `11px ${SERIF}`;
  ctx.fillText('Authorized Sign', W - PAD, y + 17);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not render receipt image'))),
      'image/png',
      0.95
    );
  });
}
