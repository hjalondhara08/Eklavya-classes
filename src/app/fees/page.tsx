'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  CreditCard,
  Search,
  Trash2,
  Printer,
  X,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  Layers,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  MessageCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate, formatMonthOnly, parseDDMMYYYY, formatToDDMMYYYY } from '@/lib/utils/dates';
import DatePickerInput from '@/components/ui/DatePickerInput';
import { generateSimplePdf, PdfTextItem, PdfLineItem } from '@/lib/utils/pdf';

// ──────────────────────────────────────────────────────────────────────────
// Receipt helpers (module-level, pure)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Normalises an Indian mobile number into the international format expected
 * by WhatsApp click-to-chat (digits only, with the 91 country code).
 * Returns null when the input can't be turned into a usable number.
 */
function normalizeIndianPhone(raw: any): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  digits = digits.replace(/^0+/, ''); // drop leading zeros (e.g. 0 98xxxxxxx)
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length > 10) return digits; // assume it already carries a country code
  return null; // too short to be valid
}

interface ReceiptTotals {
  yearlyFee: number;
  totalPaid: number;
  remaining: number;
}

/** Builds the plain-text fee receipt sent through WhatsApp. */
function buildWhatsAppMessage(payment: any, totals?: ReceiptTotals): string {
  const student = payment?.studentId || {};
  const lines: string[] = [];
  lines.push('*EKLAVYA CLASSES*');
  lines.push('જ્ઞાનથી ઉજ્જવળ ભવિષ્ય તરફ');
  lines.push('');
  lines.push('🧾 *Fee Payment Receipt*');
  lines.push(`Receipt No: #${payment._id ? payment._id.toString().slice(-8).toUpperCase() : '—'}`);
  lines.push(`Date: ${formatDate(payment.transactionDate)}`);
  lines.push('');
  lines.push(`👤 Student: ${student.name || 'Student'}`);
  lines.push(`🎓 Std/Batch: Std ${student.standard || 'N/A'} · ${student.batchId?.name || 'N/A'}`);
  lines.push(`🏫 Branch: ${student.branchId?.name || 'N/A'}`);
  lines.push(`🗓 Fee Month: ${formatMonthOnly(payment.feeMonth)}`);
  lines.push(`💳 Mode: ${payment.paymentType || 'N/A'}`);
  lines.push('');
  lines.push(`💰 *Amount Paid: ${formatCurrency(payment.amount || 0)}*`);
  if (totals) {
    lines.push('');
    lines.push('📊 Fee Summary:');
    lines.push(`• Yearly Fee: ${formatCurrency(totals.yearlyFee)}`);
    lines.push(`• Total Paid: ${formatCurrency(totals.totalPaid)}`);
    lines.push(`• Remaining: ${formatCurrency(totals.remaining)}`);
  }
  lines.push('');
  lines.push('Thank you for your payment! 🙏');
  lines.push('- Eklavya Classes');
  return lines.join('\n');
}

/** Currency for the PDF (Helvetica can't render the ₹ glyph, so use "Rs."). */
function formatRs(amount: number): string {
  return 'Rs. ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount || 0);
}

/** Builds the printable fee-receipt PDF as a Blob (zero external dependencies). */
function buildReceiptPdfBlob(payment: any, history: any[], totals?: ReceiptTotals): Blob {
  const student = payment?.studentId || {};
  const items: PdfTextItem[] = [];
  const lines: PdfLineItem[] = [];
  const LX = 40;   // label column
  const VX = 320;  // value column
  const RX = 555;  // right edge
  let y = 60;

  // ── Header ──
  items.push({ text: 'EKLAVYA CLASSES', x: LX, y, size: 22, bold: true });
  y += 18;
  items.push({ text: 'Towards a brighter future through knowledge', x: LX, y, size: 9 });
  y += 14;
  items.push({ text: 'FEE RECEIPT', x: LX, y, size: 11, bold: true });
  y += 8;
  lines.push({ x1: LX, y1: y, x2: RX, y2: y, width: 1.2 });
  y += 22;

  // ── Detail rows ──
  const yearlyFee = totals?.yearlyFee ?? student.yearlyFees ?? (student.monthlyFee || 0) * 12;
  const rows: Array<[string, string]> = [
    ['Receipt ID:', '#' + (payment._id ? payment._id.toString().slice(-8).toUpperCase() : '-')],
    ['Date:', formatDate(payment.transactionDate)],
    ['Student Name:', (student.name || 'Student').toUpperCase()],
    ['Standard / Batch:', `Std ${student.standard || 'N/A'} - ${student.batchId?.name || 'N/A'}`],
    ['Branch:', student.branchId?.name || 'N/A'],
    ['Fee Month:', formatMonthOnly(payment.feeMonth)],
    ['Payment Mode:', payment.paymentType ? payment.paymentType.charAt(0).toUpperCase() + payment.paymentType.slice(1) : 'N/A'],
    ['Yearly Fee:', formatRs(yearlyFee)],
  ];
  if (totals && typeof totals.totalPaid === 'number') {
    rows.push(['Total Paid (to date):', formatRs(totals.totalPaid)]);
    rows.push(['Pending Amount:', formatRs(totals.remaining)]);
  }
  rows.forEach(([label, value]) => {
    items.push({ text: label, x: LX, y, size: 11 });
    items.push({ text: value, x: VX, y, size: 11, bold: true });
    y += 8;
    lines.push({ x1: LX, y1: y, x2: RX, y2: y, width: 0.3 });
    y += 12;
  });

  // ── Amount banner ──
  y += 4;
  lines.push({ x1: LX, y1: y, x2: RX, y2: y, width: 1.2 });
  y += 16;
  items.push({ text: 'Amount Received:', x: LX, y, size: 13, bold: true });
  items.push({ text: formatRs(payment.amount || 0), x: VX, y, size: 15, bold: true });
  y += 8;
  lines.push({ x1: LX, y1: y, x2: RX, y2: y, width: 1.2 });
  y += 26;

  // ── Payment history table ──
  if (history && history.length > 0) {
    items.push({ text: 'Payment History', x: LX, y, size: 12, bold: true });
    y += 16;
    items.push({ text: 'Date', x: LX, y, size: 10, bold: true });
    items.push({ text: 'Amount', x: 180, y, size: 10, bold: true });
    items.push({ text: 'Mode', x: 300, y, size: 10, bold: true });
    items.push({ text: 'Note', x: 390, y, size: 10, bold: true });
    y += 4;
    lines.push({ x1: LX, y1: y, x2: RX, y2: y, width: 0.5 });
    y += 14;
    for (const h of history.slice(0, 15)) {
      if (y > 760) break; // keep to a single page
      items.push({ text: formatDate(h.transactionDate || h.createdAt), x: LX, y, size: 10 });
      items.push({ text: formatRs(h.amount), x: 180, y, size: 10 });
      items.push({ text: (h.paymentType || '').toUpperCase(), x: 300, y, size: 10 });
      items.push({ text: (h.notes || 'Fee payment').slice(0, 26), x: 390, y, size: 9 });
      y += 14;
    }
  }

  // ── Signatures ──
  const sy = 805;
  lines.push({ x1: LX, y1: sy - 4, x2: LX + 120, y2: sy - 4, width: 0.5 });
  items.push({ text: payment.createdBy?.name || 'System Admin', x: LX, y: sy, size: 10 });
  items.push({ text: 'Issuer', x: LX, y: sy + 12, size: 9 });
  lines.push({ x1: RX - 120, y1: sy - 4, x2: RX, y2: sy - 4, width: 0.5 });
  items.push({ text: 'Authorized Sign', x: RX - 110, y: sy, size: 10 });

  return generateSimplePdf(items, lines);
}

function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Builds the styled, print-ready HTML receipt (logo, ₹ symbols, Gujarati tagline,
 * bordered tables). Opened in a new tab so the browser's native print dialog —
 * which offers BOTH "Save as PDF" and a printer — can render it. `docTitle`
 * becomes the page title, which browsers use as the default Save-as-PDF filename.
 */
function buildReceiptHTML(payment: any, history: any[], totals: ReceiptTotals, logoUrl: string, docTitle: string): string {
  const student = payment?.studentId || {};
  const receiptId = payment._id ? payment._id.toString().slice(-8).toUpperCase() : '—';
  const paymentMode = payment.paymentType
    ? payment.paymentType.charAt(0).toUpperCase() + payment.paymentType.slice(1)
    : 'N/A';
  const batchLine = `${student.batchId?.name || 'N/A'}${student.batchId?.timing ? ' · ' + student.batchId.timing : ''}`;

  const detailRows: Array<[string, string]> = [
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

  const detailRowsHtml = detailRows.map(([label, value]) => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px 4px;color:#444;width:55%;">${escapeHtml(label)}</td>
      <td style="padding:8px 4px;font-weight:700;text-align:right;">${escapeHtml(value)}</td>
    </tr>`).join('');

  const historyHtml = (history && history.length > 0) ? `
    <div style="margin-top:18px;">
      <h3 style="font-size:14px;font-weight:700;margin:0 0 8px;">Payment History</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="border-bottom:1.5px solid #1a1a1a;">
            <th style="padding:6px;text-align:left;font-weight:700;">Date</th>
            <th style="padding:6px;text-align:left;font-weight:700;">Amount</th>
            <th style="padding:6px;text-align:left;font-weight:700;">Mode</th>
            <th style="padding:6px;text-align:left;font-weight:700;">Note</th>
          </tr>
        </thead>
        <tbody>
          ${history.map((h: any) => `
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:6px;">${escapeHtml(formatDate(h.transactionDate || h.createdAt))}</td>
              <td style="padding:6px;font-weight:600;">${escapeHtml(formatCurrency(h.amount))}</td>
              <td style="padding:6px;text-transform:uppercase;">${escapeHtml(h.paymentType || '')}</td>
              <td style="padding:6px;color:#555;">${escapeHtml(h.notes || `Fee payment of ${formatCurrency(h.amount)}`)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(docTitle)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #fff; padding: 28px; }
    .receipt { max-width: 700px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; }
    @page { margin: 14mm; }
  </style>
</head>
<body>
  <div class="receipt">
    <div style="display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:2px solid #1a1a1a;">
      <img src="${escapeHtml(logoUrl)}" alt="Eklavya Classes" style="width:72px;height:72px;object-fit:contain;" onerror="this.style.display='none'" />
      <div>
        <h1 style="font-size:28px;font-weight:800;margin:0;letter-spacing:1px;color:#0d1b4b;">EKLAVYA CLASSES</h1>
        <p style="font-size:13px;margin:3px 0 0;color:#555;">જ્ઞાનથી ઉજ્જવળ ભવિષ્ય તરફ ✨</p>
        <p style="font-size:12px;font-weight:700;margin:5px 0 0;letter-spacing:3px;text-transform:uppercase;color:#1a1a1a;">FEE RECEIPT</p>
      </div>
    </div>

    <table style="margin-top:18px;font-size:13px;">
      <tbody>${detailRowsHtml}</tbody>
    </table>

    <div style="border-top:2px solid #1a1a1a;border-bottom:2px solid #1a1a1a;padding:12px 4px;margin:16px 0;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:18px;font-weight:800;">Amount Received:</span>
      <span style="font-size:24px;font-weight:800;">${escapeHtml(formatCurrency(payment.amount || 0))}</span>
    </div>

    ${historyHtml}

    <div style="margin-top:56px;display:flex;justify-content:space-between;font-size:11px;color:#555;">
      <div>
        <div style="width:110px;border-top:1px solid #555;padding-top:4px;"></div>
        <p style="margin:2px 0 0;font-weight:700;">${escapeHtml(payment.createdBy?.name || 'System Admin')}</p>
        <p style="margin:0;">Issuer</p>
      </div>
      <div style="text-align:right;">
        <div style="width:120px;border-top:1px solid #555;padding-top:4px;margin-left:auto;"></div>
        <p style="margin:2px 0 0;">Authorized Sign</p>
      </div>
    </div>
  </div>
  <script>
    // Open the native print dialog (Save as PDF / Print) once the logo has loaded.
    window.onload = function () {
      setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 400);
    };
  </script>
</body>
</html>`;
}


export default function FeesPage() {
  const { data: session } = useSession();
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  const [feeMonth, setFeeMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Cash');
  const [transactionDate, setTransactionDate] = useState('');
  const [notes, setNotes] = useState('');

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [receiptPayment, setReceiptPayment] = useState<any>(null);
  const [searchHistory, setSearchHistory] = useState('');

  // Fee Status & Calendar state
  const [studentFeeStatus, setStudentFeeStatus] = useState<any[]>([]);
  const [loadingFeeStatus, setLoadingFeeStatus] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => {
    const d = new Date();
    return d.getMonth() + 1 >= 5 ? d.getFullYear() + 1 : d.getFullYear();
  });

  const [receiptStudentHistory, setReceiptStudentHistory] = useState<any[]>([]);
  const [loadingReceiptHistory, setLoadingReceiptHistory] = useState(false);


  useEffect(() => {
    if (!session) return;
    
    setTransactionDate(formatToDDMMYYYY(new Date().toISOString().split('T')[0]));

    fetch('/api/students?isActive=true', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStudents(data);
        }
      })
      .catch(err => console.error(err));

    fetchPaymentHistory();
  }, [session]);

  const fetchPaymentHistory = () => {
    setLoadingHistory(true);
    return fetch('/api/fees', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Ensure LIFO: sort by transactionDate desc, then createdAt desc
          const sorted = [...data].sort((a, b) => {
            const dateA = new Date(a.transactionDate || a.createdAt).getTime();
            const dateB = new Date(b.transactionDate || b.createdAt).getTime();
            if (dateB !== dateA) return dateB - dateA;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setPayments(sorted);
        }
        setLoadingHistory(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingHistory(false);
      });
  };

  const fetchStudentFeeStatus = async (studentId: string, year: number) => {
    setLoadingFeeStatus(true);
    try {
      const res = await fetch(`/api/students/${studentId}/fee-status`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setStudentFeeStatus(data);
        const student = students.find(s => s._id === studentId);
        if (student) {
          const yearlyFee = student.yearlyFees || (student.monthlyFee * 12) || 0;
          const totalPaid = data.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
          const remaining = Math.max(0, yearlyFee - totalPaid);
          setAmount(remaining > 0 ? remaining.toString() : '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFeeStatus(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      const student = students.find(s => s._id === selectedStudentId);
      if (student) {
        setSelectedStudent(student);
        fetchStudentFeeStatus(selectedStudentId, calendarYear);
      }
    } else {
      setSelectedStudent(null);
      setAmount('');
      setStudentFeeStatus([]);
    }
  }, [selectedStudentId, calendarYear, students]);

  useEffect(() => {
    if (receiptPayment && receiptPayment.studentId?._id) {
      setLoadingReceiptHistory(true);
      fetch(`/api/students/${receiptPayment.studentId._id}/fee-status`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setReceiptStudentHistory(data);
          }
          setLoadingReceiptHistory(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingReceiptHistory(false);
        });
    } else {
      setReceiptStudentHistory([]);
    }
  }, [receiptPayment]);

  if (!session) return null;


  const handleCollectFee = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard against duplicate submissions (rapid double-click / Enter key) which
    // would otherwise record the same payment twice (a "collision").
    if (submitting) return;
    if (!selectedStudentId || !amount || !transactionDate) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }
    if (Number(amount) <= 0) {
      setMessage({ type: 'error', text: 'Amount must be greater than zero.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const payload = {
      studentId: selectedStudentId,
      amount: Number(amount),
      paymentType,
      transactionDate: parseDDMMYYYY(transactionDate),
      notes: notes || `Yearly fee payment of ₹${amount}`
    };

    try {
      const res = await fetch('/api/fees/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record payment');
      }

      const logRecord = data.paymentLog;

      setMessage({ type: 'success', text: `Fee of ${formatCurrency(Number(amount))} collected successfully!` });

      // Refresh the fee status + history from the server (no-store) BEFORE doing
      // anything else, so the on-screen Total Paid / Pending figures reflect this
      // payment immediately. Clear the amount field afterwards so the same value
      // can't be accidentally re-submitted.
      setNotes('');
      await Promise.all([
        fetchStudentFeeStatus(selectedStudentId, calendarYear),
        fetchPaymentHistory(),
      ]);
      setAmount('');

      const populatedPayment = {
        ...logRecord,
        studentId: selectedStudent,
        createdBy: { name: session.user.name }
      };
      setReceiptPayment(populatedPayment);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete/undo this fee payment record?')) return;

    try {
      const res = await fetch(`/api/fees/${paymentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete payment');
      }
      fetchPaymentHistory();
      if (selectedStudentId) {
        fetchStudentFeeStatus(selectedStudentId, calendarYear);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Opens the styled receipt in a new tab and triggers the browser's native print
  // dialog — which offers BOTH "Save as PDF" and "Print" — working on desktop and
  // mobile alike. The tab title is "StudentName_Fee_Receipt", which browsers use
  // as the default filename when the user chooses Save as PDF.
  const handlePrint = () => {
    if (!receiptPayment) return;
    const safeName = (receiptPayment.studentId?.name || 'Student').trim().replace(/\s+/g, '_') || 'Student';
    const docTitle = `${safeName}_Fee_Receipt`;
    const logoUrl = `${window.location.origin}/logo.png`;
    const html = buildReceiptHTML(
      receiptPayment,
      receiptStudentHistory,
      { yearlyFee: receiptYearlyFee, totalPaid: receiptTotalPaid, remaining: receiptRemaining },
      logoUrl,
      docTitle
    );

    const win = window.open('', '_blank');
    if (!win) {
      setMessage({ type: 'error', text: 'Please allow pop-ups for this site so the receipt can open to print.' });
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  // Opens WhatsApp click-to-chat with a pre-filled text receipt addressed to the
  // student's (or parent's) mobile number. `totals` is optional — when sent from
  // the receipt modal it includes the full fee ledger; from the list rows it's omitted.
  // Generates the receipt PDF in the browser and hands it to WhatsApp.
  //  • Mobile (iOS/Android): opens the native share sheet with the PDF attached —
  //    the operator picks WhatsApp → the student's chat → Send.
  //  • Desktop / unsupported: downloads the PDF and opens the WhatsApp chat with the
  //    text pre-filled, so the operator can attach the just-downloaded file.
  // `totals` is optional — passed from the receipt modal / student log (full ledger),
  // omitted from the Collection History quick-send.
  const shareReceipt = async (payment: any, history: any[], totals?: ReceiptTotals) => {
    const student = payment?.studentId || {};
    const safeName = (student.name || 'Student').trim().replace(/\s+/g, '_');
    const filename = `${safeName}_Fee_Receipt.pdf`;

    let blob: Blob;
    try {
      blob = buildReceiptPdfBlob(payment, history || [], totals);
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not generate the PDF receipt. Please try again.' });
      return;
    }

    const text = buildWhatsAppMessage(payment, totals);
    const file = new File([blob], filename, { type: 'application/pdf' });
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;

    // Native share sheet (mobile) — must run within this click gesture, so the PDF
    // is built synchronously above (no awaits before share()).
    if (nav?.canShare && (nav.canShare({ files: [file], text }) || nav.canShare({ files: [file] }))) {
      try {
        const payload = nav.canShare({ files: [file], text })
          ? { files: [file], text, title: 'Fee Receipt' }
          : { files: [file], title: 'Fee Receipt' };
        await nav.share(payload);
        return;
      } catch (err: any) {
        if (err && err.name === 'AbortError') return; // operator cancelled the share sheet
        // otherwise fall through to the download fallback
      }
    }

    // Desktop fallback: download the PDF + open the WhatsApp chat with prefilled text.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    const phone = normalizeIndianPhone(student.mobileNumber || student.parentMobile || student.mobile);
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    setMessage({
      type: 'success',
      text: 'Receipt PDF downloaded and WhatsApp opened — attach the downloaded PDF to the chat and send.',
    });
  };

  const filteredPayments = payments.filter(p => {
    if (!searchHistory) return true;
    const name = p.studentId?.name || '';
    return name.toLowerCase().includes(searchHistory.toLowerCase());
  });

  const receiptYearlyFee = receiptPayment?.studentId?.yearlyFees || (receiptPayment?.studentId?.monthlyFee * 12) || 0;
  const receiptTotalPaid = receiptStudentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
  const receiptRemaining = Math.max(0, receiptYearlyFee - receiptTotalPaid);

  return (
    <div className="space-y-6">
      {/* Top Welcome Title */}
      <div className="no-print">
        <h2 className="text-2xl font-bold text-navy">Fee Operations</h2>
        <p className="text-sm text-slate-500">Collect monthly tuition fees, generate print receipts, and view collection logs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start no-print">
        {/* Left: Fee Collection Form */}
        <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card space-y-4 lg:col-span-1">
          <h3 className="text-base font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="h-5 w-5 text-gold" /> Collect Fee
          </h3>

          {message && (
            <div className={`p-3 rounded-btn flex items-center text-xs ${
              message.type === 'success' ? 'bg-green-50 border border-green-200 text-brand-green' : 'bg-red-50 border border-red-200 text-brand-red'
            }`}>
              {message.type === 'success' ? <CheckCircle className="h-4 w-4 mr-2" /> : <AlertCircle className="h-4 w-4 mr-2" />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleCollectFee} className="space-y-4">
            {/* Student Dropdown (Searchable Combobox) */}
            <div className="relative">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Select Student *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search student name..."
                  value={studentSearchQuery}
                  onChange={(e) => {
                    setStudentSearchQuery(e.target.value);
                    setIsStudentDropdownOpen(true);
                  }}
                  onFocus={(e) => {
                    // Clear the field on focus so the operator can immediately type a
                    // fresh search (otherwise the previously-selected student's label
                    // stays in the box and filters everything out). Focusing the input
                    // also pops the on-screen keyboard on mobile automatically.
                    setStudentSearchQuery('');
                    setIsStudentDropdownOpen(true);
                  }}
                  className="w-full pl-3 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                />
                <div className="absolute inset-y-0 right-2 flex items-center space-x-1">
                  {selectedStudentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentId('');
                        setSelectedStudent(null);
                        setStudentSearchQuery('');
                        setStudentFeeStatus([]);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  <span className="text-slate-400 pointer-events-none text-[8px]">▼</span>
                </div>
              </div>

              {isStudentDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => {
                      setIsStudentDropdownOpen(false);
                      if (selectedStudent) {
                        setStudentSearchQuery(`${selectedStudent.name} (Std: ${selectedStudent.standard} - ${selectedStudent.branchId?.name || ''})`);
                      } else {
                        setStudentSearchQuery('');
                      }
                    }}
                  />
                  
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-btn shadow-lg max-h-60 overflow-y-auto">
                    {students.filter(s => {
                      const query = studentSearchQuery.toLowerCase();
                      const matchName = s.name.toLowerCase().includes(query);
                      const matchStd = s.standard?.toString().includes(query);
                      const matchBranch = (s.branchId?.name || '').toLowerCase().includes(query);
                      return matchName || matchStd || matchBranch;
                    }).length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 italic">No matching students found</div>
                    ) : (
                      students.filter(s => {
                        const query = studentSearchQuery.toLowerCase();
                        const matchName = s.name.toLowerCase().includes(query);
                        const matchStd = s.standard?.toString().includes(query);
                        const matchBranch = (s.branchId?.name || '').toLowerCase().includes(query);
                        return matchName || matchStd || matchBranch;
                      }).map(s => (
                        <div
                          key={s._id}
                          onClick={() => {
                            setSelectedStudentId(s._id);
                            setSelectedStudent(s);
                            setStudentSearchQuery(`${s.name} (Std: ${s.standard} - ${s.branchId?.name || ''})`);
                            setIsStudentDropdownOpen(false);
                            
                            // Initialize default month & calendar year sync on selection
                            const today = new Date();
                            const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                            setFeeMonth(currentMonth);
                            
                            const [yStr, mStr] = currentMonth.split('-');
                            const yearNum = parseInt(yStr);
                            const monthNum = parseInt(mStr);
                            const calculatedCalendarYear = monthNum >= 5 ? yearNum + 1 : yearNum;
                            setCalendarYear(calculatedCalendarYear);
                          }}
                          className={`p-2.5 text-xs text-left cursor-pointer hover:bg-slate-50 transition-all border-b border-slate-100 last:border-0 flex flex-col ${
                            selectedStudentId === s._id ? 'bg-navy/5 font-semibold text-navy' : 'text-slate-700'
                          }`}
                        >
                          <span className="font-bold">{s.name}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Std: {s.standard} · Branch: {s.branchId?.name || 'N/A'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Selected Student Details Quick View */}
            {selectedStudent && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-btn space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="font-semibold flex items-center gap-1"><User className="h-3 w-3" /> Std / Batch:</span>
                  <span>{selectedStudent.standard} · {selectedStudent.batchId?.name} ({selectedStudent.batchId?.timing})</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold flex items-center gap-1"><Layers className="h-3 w-3" /> Branch:</span>
                  <span>{selectedStudent.branchId?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold flex items-center gap-1"><Calendar className="h-3 w-3" /> Join Date:</span>
                  <span>{formatDate(selectedStudent.joinDate)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 space-y-1.5 font-sans">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="font-semibold">Yearly Fee:</span>
                    <span className="font-bold text-navy">{formatCurrency(selectedStudent.yearlyFees || (selectedStudent.monthlyFee * 12) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="font-semibold">Total Paid:</span>
                    <span className="font-bold text-brand-green">
                      {formatCurrency(studentFeeStatus.reduce((sum, p) => sum + (p.amount || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-navy pt-0.5 border-t border-slate-100">
                    <span>Remaining Fees:</span>
                    <span className={
                      (selectedStudent.yearlyFees || (selectedStudent.monthlyFee * 12) || 0) - studentFeeStatus.reduce((sum, p) => sum + (p.amount || 0), 0) > 0
                        ? 'text-red-550 font-bold'
                        : 'text-brand-green font-bold'
                    }>
                      {formatCurrency(Math.max(0, (selectedStudent.yearlyFees || (selectedStudent.monthlyFee * 12) || 0) - studentFeeStatus.reduce((sum, p) => sum + (p.amount || 0), 0)))}
                    </span>
                  </div>
                </div>
              </div>
            )}


            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Amount (Rs.) *</label>
              <input
                type="number"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
              />
            </div>

            {/* Payment Mode & Transaction Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Payment Method *</label>
                <select
                  required
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Receipt Date (DD/MM/YYYY) *</label>
                <DatePickerInput
                  required
                  value={transactionDate}
                  onChange={setTransactionDate}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks / Notes</label>
              <textarea
                placeholder="Optional payment notes..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-navy text-white text-sm font-semibold rounded-btn hover:bg-navy-light shadow-md transition-all flex items-center justify-center disabled:opacity-75"
            >
              {submitting ? (
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
              ) : null}
              Submit Payment
            </button>
          </form>
        </div>

        {/* Right Column: Dynamic Fee Status Summary Calendar & Collection History */}
        <div className="space-y-6 lg:col-span-2">
          {selectedStudent && (
            <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-navy text-sm font-sans flex items-center gap-2">
                    <User className="h-4 w-4 text-gold" /> Fee Status & Payment History for {selectedStudent.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Summary of all yearly fees and payments recorded for this student.</p>
                </div>
              </div>

              {loadingFeeStatus ? (
                <div className="py-8 text-center text-slate-400">
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-navy inline-block"></span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Financial Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-card p-4 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Yearly Expected Fee</span>
                      <span className="text-xl font-extrabold text-navy mt-1 block">
                        {formatCurrency(selectedStudent.yearlyFees || (selectedStudent.monthlyFee * 12) || 0)}
                      </span>
                    </div>

                    <div className="bg-green-50/40 border border-green-100 rounded-card p-4 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Paid So Far</span>
                      <span className="text-xl font-extrabold text-brand-green mt-1 block">
                        {formatCurrency(studentFeeStatus.reduce((sum, p) => sum + (p.amount || 0), 0))}
                      </span>
                    </div>

                    <div className="bg-red-50/40 border border-red-100 rounded-card p-4 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Remaining / Pending</span>
                      <span className={`text-xl font-extrabold mt-1 block ${
                        (selectedStudent.yearlyFees || (selectedStudent.monthlyFee * 12) || 0) - studentFeeStatus.reduce((sum, p) => sum + (p.amount || 0), 0) > 0
                          ? 'text-red-550'
                          : 'text-brand-green'
                      }`}>
                        {formatCurrency(Math.max(0, (selectedStudent.yearlyFees || (selectedStudent.monthlyFee * 12) || 0) - studentFeeStatus.reduce((sum, p) => sum + (p.amount || 0), 0)))}
                      </span>
                    </div>
                  </div>

                  {/* Student Specific Payments Log */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payments Recorded</h4>
                    {studentFeeStatus.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No payments recorded for this student yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {studentFeeStatus.map((p: any) => (
                          <div key={p._id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-btn hover:bg-slate-100/50 transition-all">
                            <div className="space-y-1">
                              <div className="text-xs font-bold text-navy">
                                {formatCurrency(p.amount)} <span className="font-semibold text-slate-400">· {p.paymentType}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                <span>Date: {formatDate(p.transactionDate || p.createdAt)}</span>
                                {p.notes && <span className="text-slate-400">({p.notes})</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => shareReceipt({ ...p, studentId: selectedStudent }, studentFeeStatus, { yearlyFee: selectedStudent.yearlyFees || (selectedStudent.monthlyFee * 12) || 0, totalPaid: studentFeeStatus.reduce((sum, x) => sum + (x.amount || 0), 0), remaining: Math.max(0, (selectedStudent.yearlyFees || (selectedStudent.monthlyFee * 12) || 0) - studentFeeStatus.reduce((sum, x) => sum + (x.amount || 0), 0)) })}
                                className="p-1 text-slate-400 hover:text-[#25D366] hover:bg-slate-250 rounded transition-all"
                                title="Send Receipt on WhatsApp"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setReceiptPayment({ ...p, studentId: selectedStudent })}
                                className="p-1 text-slate-400 hover:text-navy hover:bg-slate-250 rounded transition-all"
                                title="Print Receipt"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(p._id)}
                                className="p-1 text-slate-400 hover:text-brand-red hover:bg-slate-250 rounded transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Collection History */}
          <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-navy">Collection History</h3>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">↓ Latest first</span>
              </div>
              
              {/* Search History */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute inset-y-0 left-3 h-4 w-4 my-auto text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student name..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[9px]">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Fee Month</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Logged By</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingHistory ? (
                    [1, 2, 3].map(n => (
                      <tr key={n} className="animate-pulse">
                        <td className="px-4 py-3"><div className="h-3.5 w-24 bg-slate-100 rounded"></div></td>
                        <td className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-100 rounded"></div></td>
                        <td className="px-4 py-3"><div className="h-3.5 w-12 bg-slate-100 rounded"></div></td>
                        <td className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-100 rounded"></div></td>
                        <td className="px-4 py-3"><div className="h-4.5 w-10 bg-slate-100 rounded"></div></td>
                        <td className="px-4 py-3"><div className="h-3.5 w-20 bg-slate-100 rounded"></div></td>
                        <td className="px-4 py-3"><div className="h-3.5 w-12 bg-slate-100 rounded mx-auto"></div></td>
                      </tr>
                    ))
                  ) : filteredPayments.length > 0 ? (
                    filteredPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{p.studentId?.name || 'Deleted Student'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Std {p.studentId?.standard || 'N/A'} · Batch: {p.studentId?.batchId?.name || 'N/A'} · {p.studentId?.branchId?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{formatMonthOnly(p.feeMonth)}</td>
                        <td className="px-4 py-3 font-bold text-navy">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(p.transactionDate)}</td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200 capitalize text-[10px]">
                            {p.paymentType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-medium">{p.createdBy?.name || 'System'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => shareReceipt(p, [])}
                              className="p-1 text-slate-400 hover:text-[#25D366] hover:bg-green-50 rounded transition-all"
                              title="Send Receipt on WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setReceiptPayment(p)}
                              className="p-1 text-slate-400 hover:text-navy hover:bg-slate-100 rounded transition-all"
                              title="Print Receipt"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(p._id)}
                              className="p-1 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded transition-all"
                              title="Delete Payment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-medium">
                        No fee payments logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {receiptPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 z-50 no-print overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-card shadow-2xl w-full max-w-md my-8 overflow-hidden border border-slate-100 relative">
            {/* Modal Actions Header */}
            <div className="bg-navy text-white px-6 py-3 flex justify-between items-center no-print">
              <h4 className="font-bold text-sm text-gold flex items-center gap-2">
                <FileText className="h-4 w-4" /> Tuition Receipt
              </h4>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => shareReceipt(receiptPayment, receiptStudentHistory, { yearlyFee: receiptYearlyFee, totalPaid: receiptTotalPaid, remaining: receiptRemaining })}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#25D366] text-white font-bold rounded-btn text-xs hover:bg-[#1ebe5b] transition-all"
                  title="Send receipt to student on WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1 bg-gold text-navy font-bold rounded-btn text-xs hover:bg-gold-light transition-all"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptPayment(null)}
                  className="p-1 rounded-full hover:bg-navy-light text-slate-300 hover:text-white transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Slip content */}
            <div className="p-8 space-y-6 bg-white font-sans text-slate-800" id="printable-receipt">
              <div className="text-center pb-4 border-b border-dashed border-slate-200">
                <h2 className="text-xl font-bold text-navy tracking-wide">EKLAVYA CLASSES</h2>
                <p className="text-[10px] text-slate-500 font-gujarati mt-0.5">જ્ઞાનથી ઉજ્જવળ ભવિષ્ય તરફ</p>
                <p className="text-[11px] text-slate-600 mt-1 font-semibold">
                  {receiptPayment.studentId?.branchId?.name || 'Tuition Center'}
                </p>
                <span className="text-[9px] px-2 py-0.5 mt-2 inline-block rounded-full bg-slate-100 font-bold border border-slate-200 uppercase tracking-widest text-slate-500">
                  Fee Payment Receipt
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Receipt No:</span>
                  <span className="font-mono font-semibold text-slate-700">#{receiptPayment._id.toString().slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span className="font-medium text-slate-700">{formatDate(receiptPayment.transactionDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Student Name:</span>
                  <span className="font-bold text-slate-800">{receiptPayment.studentId?.name || 'Student'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Standard / Batch:</span>
                  <span className="font-medium text-slate-700">
                    Std {receiptPayment.studentId?.standard || 'N/A'} · {receiptPayment.studentId?.batchId?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Branch Name:</span>
                  <span className="font-semibold text-slate-700">
                    {receiptPayment.studentId?.branchId?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fee Period Month:</span>
                  <span className="font-semibold text-slate-700">{formatMonthOnly(receiptPayment.feeMonth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Mode:</span>
                  <span className="font-semibold text-slate-700 capitalize">{receiptPayment.paymentType}</span>
                </div>
                {receiptPayment.notes && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Remarks:</span>
                    <span className="text-slate-600 italic">{receiptPayment.notes}</span>
                  </div>
                )}
              </div>

              {/* Ledger Summary Grid & History Timeline */}
              <div className="border-t border-slate-200 pt-4 space-y-3 font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-navy uppercase tracking-wider">Payment Ledger Summary</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2.5 rounded-btn border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Total Fees</span>
                    <span className="font-extrabold text-slate-800 text-xs">{formatCurrency(receiptYearlyFee)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Total Paid</span>
                    <span className="font-extrabold text-brand-green text-xs">{formatCurrency(receiptTotalPaid)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Remaining</span>
                    <span className="font-extrabold text-red-550 text-xs">{formatCurrency(receiptRemaining)}</span>
                  </div>
                </div>

                {/* History Timeline */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Payment History Timeline</span>
                  {loadingReceiptHistory ? (
                    <div className="text-[10px] text-slate-400 italic text-center py-2">Loading payment ledger...</div>
                  ) : receiptStudentHistory.length === 0 ? (
                    <div className="text-[10px] text-slate-400 italic text-center py-2">No other payments recorded</div>
                  ) : (
                    <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 text-[10px]">
                      {receiptStudentHistory.map((h: any) => (
                        <div key={h._id} className="flex justify-between items-center bg-slate-50/50 p-1.5 rounded border border-slate-100/50">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700">{formatDate(h.transactionDate || h.createdAt)}</span>
                            <span className="text-[8px] text-slate-400">{h.paymentType} {h.notes ? `· ${h.notes}` : ''}</span>
                          </div>
                          <span className="font-bold text-navy">{formatCurrency(h.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-navy text-white rounded-btn text-center flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-gold tracking-widest">Amount Paid</span>
                <span className="text-2xl font-bold mt-1 text-white">{formatCurrency(receiptPayment.amount)}</span>
              </div>

              <div className="pt-8 flex justify-between items-end text-[10px] text-slate-500">
                <div className="text-left">
                  <p className="border-t border-slate-200 pt-1 font-semibold">{receiptPayment.createdBy?.name || 'Operator'}</p>
                  <p className="text-[9px]">Issued By</p>
                </div>
                <div className="text-right">
                  <div className="h-6"></div>
                  <p className="border-t border-slate-200 pt-1 font-semibold">Authorized Sign</p>
                  <p className="text-[9px]">Eklavya Classes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
