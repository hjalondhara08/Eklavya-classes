'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Printer,
  IndianRupee,
  RefreshCw,
  BarChart2,
  Search
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate, formatMonthOnly, formatMonthNameOnly, parseDDMMYYYY, formatToDDMMYYYY } from '@/lib/utils/dates';
import DatePickerInput from '@/components/ui/DatePickerInput';
import { generatePagedPdf, PDF_PAGE_W, PDF_PAGE_H, PdfTextItem, PdfLineItem } from '@/lib/utils/pdf';

type ReportTab = 'profit' | 'pending' | 'yearly-collection' | 'students';

const STANDARDS = ['6', '7', '8', '9', '10', '11', '12'];

// Builds a real, multi-page PDF of the pending-fees list. A downloadable file
// is far more reliable than window.print() on phones (Android's web-print often
// fails with "There was a problem printing the page").
function buildPendingFeesPdf(students: any[], grandTotalDue: number, metaLine: string): Blob {
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
      items.push({ text: 'Pending Fees / Dues List', x: LX, y, size: 11, bold: true }); y += 13;
      items.push({ text: metaLine, x: LX, y, size: 8 }); y += 16;
    } else {
      items.push({ text: 'Pending Fees / Dues List (continued)', x: LX, y, size: 10, bold: true }); y += 16;
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
    items.push({ text: formatCurrency(s.yearlyFees), x: C.yearly, y, size: 7 });
    items.push({ text: formatCurrency(s.totalPaidAmount), x: C.paid, y, size: 7 });
    items.push({ text: formatCurrency(s.pendingAmount), x: C.pend, y, size: 8, bold: true });
    y += 13;
  });

  if (y > PDF_PAGE_H - 40) header(false);
  y += 6;
  lines.push({ x1: LX, y1: y - 10, x2: RX, y2: y - 10, width: 0.8 });
  items.push({ text: 'Grand Total Outstanding:', x: C.bb, y, size: 9, bold: true });
  items.push({ text: formatCurrency(grandTotalDue || 0), x: C.pend, y, size: 9, bold: true });
  flush();

  return generatePagedPdf(pages);
}

function getAcademicEndYear() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  return currentMonth >= 5 ? currentYear + 1 : currentYear;
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<ReportTab>('profit');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [reportError, setReportError] = useState('');
  
  const [startDate, setStartDate] = useState('01/05/2026');
  const [endDate, setEndDate] = useState('31/04/2027');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2026-2027');
  const [selectedYear, setSelectedYear] = useState(getAcademicEndYear().toString());
  
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  // Pending-fees list filters (mirrors the Students list filters)
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStandard, setSelectedStandard] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (!session || session.user.role !== 'admin') return;

    fetch('/api/branches')
      .then(res => res.json())
      .then(d => setBranches(d))
      .catch(err => console.error(err));
  }, [session]);

  // Load batches for the selected branch (all batches when no branch picked).
  useEffect(() => {
    if (!session || session.user.role !== 'admin') return;
    const url = selectedBranch ? `/api/batches?branchId=${selectedBranch}` : '/api/batches';
    fetch(url)
      .then(res => res.json())
      .then(d => {
        const sorted = Array.isArray(d)
          ? [...d].sort((a, b) => {
              const na = parseInt(a.name.match(/^(\d+)/)?.[1] ?? '0', 10);
              const nb = parseInt(b.name.match(/^(\d+)/)?.[1] ?? '0', 10);
              return na !== nb ? na - nb : a.name.localeCompare(b.name);
            })
          : [];
        setBatches(sorted);
      })
      .catch(err => console.error(err));
  }, [session, selectedBranch]);

  // Debounce the name search so the heavier pending query isn't re-run per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(pendingSearch), 400);
    return () => clearTimeout(t);
  }, [pendingSearch]);

  const fetchReportData = () => {
    if (!session || session.user.role !== 'admin') return;
    
    setLoading(true);
    setData(null);
    setReportError('');
    let url = `/api/reports?type=${activeTab}`;

    if (activeTab === 'profit') {
      if (startDate) url += `&startDate=${parseDDMMYYYY(startDate)}`;
      if (endDate) url += `&endDate=${parseDDMMYYYY(endDate)}`;
      if (selectedBranch) url += `&branchId=${selectedBranch}`;
    } else if (activeTab === 'yearly-collection') {
      url += `&year=${selectedYear}`;
      if (selectedBranch) url += `&branchId=${selectedBranch}`;
    } else if (activeTab === 'pending') {
      if (selectedBranch) url += `&branchId=${selectedBranch}`;
      if (selectedBatch) url += `&batchId=${selectedBatch}`;
      if (selectedStandard) url += `&standard=${encodeURIComponent(selectedStandard)}`;
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(d => {
        if (d && d.error) {
          setReportError(d.error);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(err => {
        setReportError(err.message || 'Failed to load report data.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, startDate, endDate, selectedYear, selectedBranch, selectedBatch, selectedStandard, debouncedSearch, session]);

  if (!session || session.user.role !== 'admin') {
    return (
      <div className="p-8 text-center bg-white rounded-card border border-slate-100 shadow-card">
        <h3 className="text-lg font-bold text-brand-red font-sans">Access Denied</h3>
        <p className="text-slate-500 text-sm mt-1">This section is restricted to Administrator users only.</p>
      </div>
    );
  }

  const handlePrint = async () => {
    // For the pending list, generate a real downloadable PDF and open it. A PDF file
    // opens in the phone's PDF viewer (reliable print/save), unlike window.print()
    // which fails on mobile ("There was a problem printing the page").
    if (activeTab === 'pending' && data && Array.isArray(data.students)) {
      const branchLabel = selectedBranch ? (branches.find(b => b._id === selectedBranch)?.name || 'Branch') : 'All Branches';
      const metaLine = [
        branchLabel,
        selectedStandard ? `Std ${selectedStandard}` : '',
        debouncedSearch ? `Search: "${debouncedSearch}"` : '',
        `${data.students.length} student(s) with dues`,
        `Generated: ${formatDate(new Date())}`,
      ].filter(Boolean).join('  -  ');

      let blob: Blob;
      try {
        blob = buildPendingFeesPdf(data.students, data.grandTotalDue || 0, metaLine);
      } catch (err) {
        window.print();
        return;
      }

      const file = new File([blob], 'Pending_Fees_List.pdf', { type: 'application/pdf' });
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;

      // Mobile: native share sheet (Save to Files / WhatsApp / etc.) — reliable on phones.
      if (nav?.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: 'Pending Fees List' });
          return;
        } catch (err: any) {
          if (err && err.name === 'AbortError') return; // user cancelled
          // otherwise fall through to download
        }
      }

      // Desktop / unsupported: download the PDF file directly.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Pending_Fees_List.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-navy">Business Reports & Analytics</h2>
          <p className="text-sm text-slate-500">Track company financials, tuition collections, branch profits, and pending dues.</p>
        </div>
        
        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-navy text-white text-sm font-semibold rounded-btn hover:bg-navy-light shadow-md hover:shadow-lg transition-all"
        >
          <Printer className="h-4 w-4" /> Print Report
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 no-print">
        <button
          onClick={() => setActiveTab('profit')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'profit' ? 'border-gold text-navy font-sans' : 'border-transparent text-slate-500 hover:text-slate-700 font-sans'
          }`}
        >
          Profit & Loss Statement
        </button>
        <button
          onClick={() => setActiveTab('yearly-collection')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'yearly-collection' ? 'border-gold text-navy font-sans' : 'border-transparent text-slate-500 hover:text-slate-700 font-sans'
          }`}
        >
          Yearly Fee Collections
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'pending' ? 'border-gold text-navy font-sans' : 'border-transparent text-slate-500 hover:text-slate-700 font-sans'
          }`}
        >
          Pending Fees / Dues List
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'students' ? 'border-gold text-navy font-sans' : 'border-transparent text-slate-500 hover:text-slate-700 font-sans'
          }`}
        >
          Student Demographics
        </button>
      </div>

      {/* Filters block */}
      <div className="bg-white p-4 rounded-card border border-slate-100 shadow-card flex flex-wrap gap-4 items-center no-print">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <BarChart2 className="h-4 w-4 text-gold" /> REPORT FILTER:
        </div>

        {activeTab !== 'students' && (
          <div>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedBatch(''); // batches differ per branch — reset on change
              }}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Pending-fees list — same filters as the Students list */}
        {activeTab === 'pending' && (
          <>
            <div>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                aria-label="Filter by batch"
                title="Filter by batch"
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy"
              >
                <option value="">All Batches</option>
                {batches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedStandard}
                onChange={(e) => setSelectedStandard(e.target.value)}
                aria-label="Filter by standard"
                title="Filter by standard"
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy"
              >
                <option value="">All Standards</option>
                {STANDARDS.map(s => (
                  <option key={s} value={s}>Std {s}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="absolute inset-y-0 left-2.5 h-3.5 w-3.5 my-auto text-slate-400" />
              <input
                type="text"
                placeholder="Search student name..."
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                className="w-48 pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
              />
            </div>

            {(selectedBranch || selectedBatch || selectedStandard || pendingSearch) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedBranch('');
                  setSelectedBatch('');
                  setSelectedStandard('');
                  setPendingSearch('');
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-btn hover:bg-slate-50 transition-all"
              >
                Clear
              </button>
            )}
          </>
        )}

        {activeTab === 'profit' && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium font-sans">Academic Year:</span>
            <select
              value={selectedAcademicYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedAcademicYear(val);
                if (val === '2026-2027') {
                  setStartDate('01/05/2026');
                  setEndDate('31/04/2027');
                } else if (val === '2025-2026') {
                  setStartDate('01/05/2025');
                  setEndDate('30/04/2026');
                } else if (val === '2024-2025') {
                  setStartDate('01/05/2024');
                  setEndDate('30/04/2025');
                } else if (val === '2027-2028') {
                  setStartDate('01/05/2027');
                  setEndDate('30/04/2028');
                }
              }}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy font-semibold text-slate-700 font-sans"
            >
              <option value="2026-2027">2026-2027 (01/05/2026 to 31/04/2027)</option>
              <option value="2025-2026">2025-2026 (01/05/2025 to 30/04/2026)</option>
              <option value="2024-2025">2024-2025 (01/05/2024 to 30/04/2025)</option>
              <option value="2027-2028">2027-2028 (01/05/2027 to 30/04/2028)</option>
            </select>
          </div>
        )}

        {activeTab === 'yearly-collection' && (
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy font-semibold"
            >
              {[0, 1, 2, 3].map(offset => {
                const yr = (getAcademicEndYear() - offset).toString();
                return <option key={yr} value={yr}>{parseInt(yr) - 1}-{yr}</option>;
              })}
            </select>
          </div>
        )}

        <button
          onClick={fetchReportData}
          className="p-1.5 ml-auto text-slate-400 hover:text-navy transition-all"
          title="Refresh Data"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Report content */}
      <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card no-print">
        {loading ? (
          <div className="py-24 text-center">
            <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-navy inline-block"></span>
            <p className="text-sm text-slate-500 mt-3 font-medium">Compiling analytics data...</p>
          </div>
        ) : reportError ? (
          <div className="py-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-card text-sm text-brand-red font-medium">
              <span>⚠️</span> {reportError}
            </div>
            <p className="text-xs text-slate-400 mt-3">Try refreshing or check your connection.</p>
          </div>
        ) : (
          <div>
            {activeTab === 'profit' && data && data.totalFees !== undefined && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-navy">Profit & Loss Statement</h3>
                  <p className="text-xs text-slate-400">Period: {formatDate(data.startDate)} to {formatDate(data.endDate)} · Filter: {selectedBranch ? branches.find(b => b._id === selectedBranch)?.name : 'Consolidated'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 rounded-card border border-green-100 bg-green-50/50 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 block">Total Tuition Revenue</span>
                      <span className="text-2xl font-bold text-brand-green mt-1 block">{formatCurrency(data.totalFees)}</span>
                    </div>
                    <div className="p-3 rounded-full bg-green-100 text-brand-green">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="p-5 rounded-card border border-red-100 bg-red-50/50 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 block">Total Expenditures</span>
                      <span className="text-2xl font-bold text-brand-red mt-1 block">{formatCurrency(data.totalExpenses)}</span>
                    </div>
                    <div className="p-3 rounded-full bg-red-100 text-brand-red">
                      <TrendingDown className="h-6 w-6" />
                    </div>
                  </div>

                  <div className={`p-5 rounded-card border ${data.netProfit >= 0 ? 'border-blue-100 bg-blue-50/50' : 'border-red-100 bg-red-50/50'} flex justify-between items-center`}>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 block">Net Income</span>
                      <span className={`text-2xl font-bold mt-1 block ${data.netProfit >= 0 ? 'text-navy' : 'text-brand-red'}`}>
                        {formatCurrency(data.netProfit)}
                      </span>
                    </div>
                    <div className={`p-3 rounded-full ${data.netProfit >= 0 ? 'bg-blue-100 text-navy' : 'bg-red-100 text-brand-red'}`}>
                      <IndianRupee className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <h4 className="text-sm font-bold text-navy">Visual Budget Allocation</h4>
                  {data.totalFees > 0 ? (
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Expenditure ratio ({Math.round((data.totalExpenses / data.totalFees) * 100)}%)</span>
                        <span>Profit margin ({Math.round((data.netProfit / data.totalFees) * 100)}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="bg-brand-red h-full" style={{ width: `${(data.totalExpenses / data.totalFees) * 100}%` }}></div>
                        <div className="bg-navy h-full" style={{ width: `${(data.netProfit / data.totalFees) * 100}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No revenue recorded in this period to measure ratios.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'yearly-collection' && data && data.collections && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-navy">Yearly Collection Analytics ({data.year})</h3>
                  <p className="text-xs text-slate-400">Total collections tracked month-by-month for the calendar year.</p>
                </div>

                <div className="space-y-4">
                  {Object.entries(data.collections).map(([month, amount]: any) => {
                    const maxVal = Math.max(...(Object.values(data.collections) as number[])) || 1;
                    const pct = (amount / maxVal) * 100;
                    return (
                      <div key={month} className="flex items-center gap-4 text-xs">
                        <div className="w-24 font-bold text-slate-600">{formatMonthNameOnly(month)}</div>
                        <div className="flex-1 bg-slate-50 border border-slate-100 rounded-btn h-6 overflow-hidden relative flex items-center">
                          <div className="bg-gold/20 border-r border-gold/40 h-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                          <span className="absolute left-2 text-[10px] font-bold text-navy">{formatCurrency(amount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'pending' && data && data.students !== undefined && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-navy">Tuition Fees Defaulters List</h3>
                    <p className="text-xs text-slate-400">
                      Active students with unpaid dues up to last completed month.
                      {data.studentCountWithDues > 0 && ` · ${data.studentCountWithDues} student(s) with dues.`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Total Dues Outstanding</span>
                    <span className="text-lg font-bold text-brand-red">{formatCurrency(data.grandTotalDue)}</span>
                  </div>
                </div>

                {data.students.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="text-4xl mb-3">🎉</div>
                    <p className="text-slate-600 font-semibold">Amazing! No pending dues found.</p>
                    <p className="text-slate-400 text-xs mt-1">All students are up to date with their fee payments.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[9px]">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Student Name</th>
                          <th className="px-4 py-3">Branch / Batch</th>
                          <th className="px-4 py-3">Mobile</th>
                          <th className="px-4 py-3">Yearly Fee</th>
                          <th className="px-4 py-3">Total Paid</th>
                          <th className="px-4 py-3 text-right">Pending Fees</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.students.map((stud: any, idx: number) => (
                          <tr key={stud.studentId || idx} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-4 py-3 text-slate-400 font-medium">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800 uppercase">{stud.name}</td>
                            <td className="px-4 py-3 text-slate-600">
                              <div>{stud.branchName}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{stud.batchName}</div>
                            </td>
                            <td className="px-4 py-3">
                              {stud.mobileNumber ? (
                                <a
                                  href={`tel:${stud.mobileNumber}`}
                                  className="flex items-center gap-1 font-semibold text-navy hover:text-gold transition-colors group"
                                  title={`Call ${stud.name}: ${stud.mobileNumber}`}
                                >
                                  <span className="text-[13px] group-hover:scale-110 transition-transform">📞</span>
                                  <span className="underline underline-offset-2">{stud.mobileNumber}</span>
                                </a>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                              {stud.parentMobile && (
                                <a
                                  href={`tel:${stud.parentMobile}`}
                                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-gold transition-colors mt-0.5 group"
                                  title={`Call Parent: ${stud.parentMobile}`}
                                >
                                  <span className="text-[11px]">👨‍👩‍👧</span>
                                  <span className="underline underline-offset-1">{stud.parentMobile}</span>
                                </a>
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">{formatCurrency(stud.yearlyFees)}</td>
                            <td className="px-4 py-3 text-brand-green font-semibold">{formatCurrency(stud.totalPaidAmount)}</td>
                            <td className="px-4 py-3 text-right font-bold text-brand-red text-sm">{formatCurrency(stud.pendingAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td colSpan={6} className="px-4 py-3 font-bold text-slate-700 text-xs text-right">Grand Total Outstanding:</td>
                          <td className="px-4 py-3 text-right font-bold text-brand-red">{formatCurrency(data.grandTotalDue)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'students' && data && data.activeCount !== undefined && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-navy">Student Enrollment Demographics</h3>
                  <p className="text-xs text-slate-400">Total active students: {data.activeCount} · Total deactivated records: {data.inactiveCount}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Students by Branch</h4>
                    <div className="space-y-3">
                      {data.branchBreakdown?.map((b: any) => {
                        const maxCount = Math.max(...data.branchBreakdown.map((x: any) => x.count)) || 1;
                        const pct = (b.count / maxCount) * 100;
                        return (
                          <div key={b.branchName} className="text-xs space-y-1">
                            <div className="flex justify-between font-semibold text-slate-700">
                              <span>{b.branchName}</span>
                              <span>{b.count} students</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                              <div className="bg-navy h-full rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Students by Standard</h4>
                    <div className="space-y-3">
                      {data.standardBreakdown?.map((s: any) => {
                        const maxCount = Math.max(...data.standardBreakdown.map((x: any) => x.count)) || 1;
                        const pct = (s.count / maxCount) * 100;
                        return (
                          <div key={s.standard} className="text-xs space-y-1">
                            <div className="flex justify-between font-semibold text-slate-700">
                              <span>Standard {s.standard}</span>
                              <span>{s.count} students</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                              <div className="bg-gold h-full rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print-only layout overrides */}
      {data && activeTab === 'pending' && (
        <div className="print-only p-6 bg-white text-slate-800 font-sans text-xs">
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <h2 className="text-base font-bold">EKLAVYA CLASSES</h2>
            <p className="text-[10px]">Tuition Dues Outstanding Defaulters List</p>
            <p className="text-[9px] text-slate-500 mt-1">Generated: {formatDate(new Date())}</p>
          </div>

          <table className="min-w-full divide-y divide-slate-300 text-left mt-4 text-[10px]">
            <thead>
              <tr className="font-bold border-b border-slate-300">
                <th className="py-2">Student Name</th>
                <th className="py-2">Branch / Batch</th>
                <th className="py-2">Mobile</th>
                <th className="py-2 text-right">Yearly Fee</th>
                <th className="py-2 text-right">Total Paid</th>
                <th className="py-2 text-right">Pending Fees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.students?.map((s: any, idx: number) => (
                <tr key={s.studentId || idx} className="py-2">
                  <td className="py-1 font-semibold uppercase">{s.name}</td>
                  <td className="py-1">{s.branchName} · {s.batchName}</td>
                  <td className="py-1">
                    {s.mobileNumber ? (
                      <a href={`tel:${s.mobileNumber}`} className="font-semibold text-navy underline">{s.mobileNumber}</a>
                    ) : '—'}
                    {s.parentMobile && (
                      <div>
                        <a href={`tel:${s.parentMobile}`} className="text-slate-500 underline">{s.parentMobile}</a>
                      </div>
                    )}
                  </td>
                  <td className="py-1 text-right">{formatCurrency(s.yearlyFees)}</td>
                  <td className="py-1 text-right">{formatCurrency(s.totalPaidAmount)}</td>
                  <td className="py-1 text-right font-bold">{formatCurrency(s.pendingAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold border-t border-slate-300">
                <td colSpan={5} className="py-3 text-right">Grand Total Outstanding Dues:</td>
                <td className="py-3 text-right font-bold text-sm">{formatCurrency(data.grandTotalDue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
