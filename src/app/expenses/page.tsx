'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { 
  Receipt, 
  Trash2, 
  Edit2, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate, parseDDMMYYYY, formatToDDMMYYYY } from '@/lib/utils/dates';
import DatePickerInput from '@/components/ui/DatePickerInput';

const CATEGORIES = [
  'Rent', 'Electricity', 'Salaries', 'Stationery', 'Maintenance', 'Marketing', 'Others'
];

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [formBranch, setFormBranch] = useState('general');
  const [formCategory, setFormCategory] = useState('Rent');
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!session || session.user.role !== 'admin') return;

    setFormDate(formatToDDMMYYYY(new Date().toISOString().split('T')[0]));

    fetch('/api/branches')
      .then(res => res.json())
      .then(data => setBranches(data))
      .catch(err => console.error(err));

    fetchExpenses();

    // Fetch dynamic financial stats for the top panel
    const statsUrl = `/api/dashboard/stats?startDate=${parseDDMMYYYY(filterStartDate)}&endDate=${parseDDMMYYYY(filterEndDate)}&branchId=${filterBranch}`;
    fetch(statsUrl)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, [session, filterCategory, filterBranch, filterStartDate, filterEndDate]);

  const fetchExpenses = () => {
    setLoading(true);
    let url = `/api/expenses?`;
    if (filterCategory) url += `&category=${filterCategory}`;
    if (filterBranch) url += `&branchId=${filterBranch}`;
    if (filterStartDate) url += `&startDate=${parseDDMMYYYY(filterStartDate)}`;
    if (filterEndDate) url += `&endDate=${parseDDMMYYYY(filterEndDate)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setExpenses(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  if (!session || session.user.role !== 'admin') {
    return (
      <div className="p-8 text-center bg-white rounded-card border border-slate-100 shadow-card">
        <h3 className="text-lg font-bold text-brand-red font-sans">Access Denied</h3>
        <p className="text-slate-500 text-sm mt-1">This section is restricted to Administrator users only.</p>
      </div>
    );
  }

  const handleEditClick = (exp: any) => {
    setEditingExpenseId(exp._id);
    setFormBranch(exp.branchId?._id || 'general');
    setFormCategory(exp.category);
    setFormName(exp.name);
    setFormAmount(exp.amount.toString());
    setFormDate(formatToDDMMYYYY(exp.transactionDate));
    setFormNotes(exp.notes || '');
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setFormBranch('general');
    setFormCategory('Rent');
    setFormName('');
    setFormAmount('');
    setFormDate(formatToDDMMYYYY(new Date().toISOString().split('T')[0]));
    setFormNotes('');
    setMessage(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory || !formName || !formAmount || !formDate) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const payload = {
      branchId: formBranch === 'general' ? null : formBranch,
      category: formCategory,
      name: formName,
      amount: Number(formAmount),
      transactionDate: parseDDMMYYYY(formDate),
      notes: formNotes
    };

    try {
      let res;
      if (editingExpenseId) {
        res = await fetch(`/api/expenses/${editingExpenseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save expense');
      }

      setMessage({
        type: 'success',
        text: editingExpenseId ? 'Expense updated successfully!' : 'Expense recorded successfully!'
      });

      handleCancelEdit();
      fetchExpenses();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete expense');
      }
      fetchExpenses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy">Expense Management</h2>
          <p className="text-sm text-slate-500">Record operational expenditures, rents, utility bills, and salaries.</p>
        </div>
      </div>

      {/* Financial P&L summary panel */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 text-white p-5 rounded-card shadow-card">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Total Collected Fees</span>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.totalCollectedFees || 0)}</div>
          </div>
          <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Total Expenditures</span>
            <div className="text-2xl font-bold text-rose-400">{formatCurrency(stats.totalExpenses || 0)}</div>
          </div>
          <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Net Profit / Margin</span>
            <div className="text-2xl font-bold text-amber-300">{formatCurrency(stats.netProfit || 0)}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Add/Edit Form */}
        <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card space-y-4 lg:col-span-1">
          <h3 className="text-base font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-3">
            <Receipt className="h-5 w-5 text-gold" /> {editingExpenseId ? 'Edit Expenditure' : 'Log Expenditure'}
          </h3>

          {message && (
            <div className={`p-3 rounded-btn flex items-center text-xs ${
              message.type === 'success' ? 'bg-green-50 border border-green-200 text-brand-green' : 'bg-red-50 border border-red-200 text-brand-red'
            }`}>
              {message.type === 'success' ? <CheckCircle className="h-4 w-4 mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Branch */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Branch Association *</label>
              <select
                required
                value={formBranch}
                onChange={(e) => setFormBranch(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
              >
                <option value="general">General (Overall / All Branches)</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Expense Category *</label>
              <select
                required
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Expense Name */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Expense Particulars / Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Anand Nagar Office Rent June"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
              />
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Amount (Rs.) *</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Billing Date (DD/MM/YYYY) *</label>
                <DatePickerInput
                  required
                  value={formDate}
                  onChange={setFormDate}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks / Notes</label>
              <textarea
                placeholder="Optional details, voucher refs..."
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all resize-none"
              />
            </div>

            <div className="flex gap-2">
              {editingExpenseId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-1/3 py-2.5 border border-slate-200 text-slate-500 text-sm font-semibold rounded-btn hover:bg-slate-50 transition-all text-center"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-navy text-white text-sm font-semibold rounded-btn hover:bg-navy-light shadow-md transition-all flex items-center justify-center disabled:opacity-75"
              >
                {submitting ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                ) : null}
                {editingExpenseId ? 'Update Expense' : 'Submit Expense'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Expense Log Table with filters */}
        <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card space-y-4 lg:col-span-2">
          {/* Filters Bar */}
          <div className="flex flex-wrap gap-3 items-center border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-navy mr-auto">Expenditure Registry</h3>
            
            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Branch Filter */}
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy"
            >
              <option value="">All Branches</option>
              <option value="general">General (No branch)</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>

            {/* Date Filters */}
            <div className="flex items-center space-x-1 text-slate-400">
              <DatePickerInput
                value={filterStartDate}
                onChange={setFilterStartDate}
                placeholder="Start Date"
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy w-32"
              />
              <span className="text-[10px]">to</span>
              <DatePickerInput
                value={filterEndDate}
                onChange={setFilterEndDate}
                placeholder="End Date"
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy w-32"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[9px]">
                <tr>
                  <th className="px-4 py-3">Expense Details</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Billing Date</th>
                  <th className="px-4 py-3">Logged By</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [1, 2, 3].map(n => (
                    <tr key={n} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-3.5 w-36 bg-slate-100 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-100 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-100 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-12 bg-slate-100 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-100 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-100 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-12 bg-slate-100 rounded mx-auto"></div></td>
                    </tr>
                  ))
                ) : expenses.length > 0 ? (
                  expenses.map((exp) => (
                    <tr key={exp._id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{exp.name}</div>
                        {exp.notes && <div className="text-[10px] text-slate-400 mt-0.5 italic">{exp.notes}</div>}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600">
                        {exp.branchId?.name || <span className="text-slate-400 italic">General</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200 text-[10px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-brand-red">{formatCurrency(exp.amount)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(exp.transactionDate)}</td>
                      <td className="px-4 py-3 text-slate-500 font-medium">{exp.createdBy?.name || 'System'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            onClick={() => handleEditClick(exp)}
                            className="p-1 text-slate-400 hover:text-navy hover:bg-slate-100 rounded transition-all"
                            title="Edit Expense"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp._id)}
                            className="p-1 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded transition-all"
                            title="Delete Expense"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-medium font-sans">
                      No expenditures found matching search filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
