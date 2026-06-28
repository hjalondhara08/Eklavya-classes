'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  UserPlus, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate, parseDDMMYYYY, formatToDDMMYYYY } from '@/lib/utils/dates';
import DatePickerInput from '@/components/ui/DatePickerInput';

const STANDARDS = ['6', '7', '8', '9', '10', '11', '12'];

export default function StudentsPage() {
  const { data: session } = useSession();
  const [students, setStudents] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterStandard, setFilterStandard] = useState('');
  const [filterStatus, setFilterStatus] = useState('true');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<any>(null);

  // Delete confirmation modal state (single)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ── Bulk Selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [formName, setFormName] = useState('');
  const [formBranch, setFormBranch] = useState('');
  const [formBatch, setFormBatch] = useState('');
  const [formStandard, setFormStandard] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formParentMobile, setFormParentMobile] = useState('');
  const [formMonthlyFee, setFormMonthlyFee] = useState('');
  const [formJoinDate, setFormJoinDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!session) return;
    
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => setBranches(data))
      .catch(err => console.error(err));
  }, [session]);

  const sortBatchesNumerically = (data: any[]) => {
    return [...data].sort((a, b) => {
      const numA = parseInt(a.name.match(/^(\d+)/)?.[1] ?? '0', 10);
      const numB = parseInt(b.name.match(/^(\d+)/)?.[1] ?? '0', 10);
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name);
    });
  };

  useEffect(() => {
    if (!session) return;
    const branchId = formBranch || filterBranch;

    if (branchId) {
      fetch(`/api/batches?branchId=${branchId}`)
        .then(res => res.json())
        .then(data => setBatches(sortBatchesNumerically(data)))
        .catch(err => console.error(err));
    } else {
      fetch('/api/batches')
        .then(res => res.json())
        .then(data => setBatches(sortBatchesNumerically(data)))
        .catch(err => console.error(err));
    }
  }, [session, formBranch, filterBranch]);


  const fetchStudents = () => {
    if (!session) return;
    setLoading(true);

    let url = `/api/students?isActive=${filterStatus}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (filterBranch) url += `&branchId=${filterBranch}`;
    if (filterBatch) url += `&batchId=${filterBatch}`;
    if (filterStandard) url += `&standard=${encodeURIComponent(filterStandard)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStudents(data);
        }
        setLoading(false);
        setSelectedIds(new Set()); // clear selection on refetch
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  // ── Bulk helpers ──
  const allVisibleIds = students.map((s: any) => s._id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
  const someSelected = allVisibleIds.some(id => selectedIds.has(id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkStatusChange = async (isActive: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    setBulkError('');
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk status update failed');
      fetchStudents();
    } catch (err: any) {
      setBulkError(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    setBulkError('');
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk delete failed');
      setBulkDeleteOpen(false);
      fetchStudents();
    } catch (err: any) {
      setBulkError(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [session, search, filterBranch, filterBatch, filterStandard, filterStatus]);

  if (!session) return null;

  const role = session.user.role;
  const operatorBranchId = session.user.branchId;

  const handleAddClick = () => {
    setCurrentStudent(null);
    setFormName('');
    setFormBranch(branches[0]?._id || '');
    setFormBatch('');
    setFormStandard(STANDARDS[0]);
    setFormMobile('');
    setFormParentMobile('');
    setFormMonthlyFee('');
    setFormJoinDate(formatToDDMMYYYY(new Date().toISOString().split('T')[0]));
    setFormNotes('');
    setFormIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEditClick = (student: any) => {
    setCurrentStudent(student);
    setFormName(student.name);
    setFormBranch(student.branchId?._id || student.branchId || '');
    setFormBatch(student.batchId?._id || student.batchId || '');
    setFormStandard(student.standard);
    setFormMobile(student.mobileNumber || student.mobile || '');
    setFormParentMobile(student.parentMobile || '');
    setFormMonthlyFee((student.yearlyFees !== undefined ? student.yearlyFees : (student.monthlyFee * 12)).toString());
    setFormJoinDate(formatToDDMMYYYY(student.joinDate));
    setFormNotes(student.notes || '');
    setFormIsActive(student.isActive);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    if (!formName || !formBranch || !formBatch || !formStandard || !formMonthlyFee || !formJoinDate || !formMobile) {
      setFormError('Please fill in all required fields');
      setSubmitting(false);
      return;
    }

    const payload = {
      name: formName,
      branchId: formBranch,
      batchId: formBatch,
      standard: formStandard,
      mobileNumber: formMobile,
      parentMobile: formParentMobile,
      yearlyFees: Number(formMonthlyFee),
      joinDate: parseDDMMYYYY(formJoinDate),
      notes: formNotes,
      isActive: formIsActive
    };

    try {
      let res;
      if (currentStudent) {
        res = await fetch(`/api/students/${currentStudent._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save student');
      }

      setIsModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (student: any) => {
    setStudentToDelete(student);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const handlePermanentDelete = async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/students/${studentToDelete._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete student');
      setDeleteModalOpen(false);
      setStudentToDelete(null);
      fetchStudents();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy">Student Management</h2>
          <p className="text-sm text-slate-500">Manage student records, enrollments, and tuition fees config.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-navy text-white text-sm font-semibold rounded-btn hover:bg-navy-light shadow-md hover:shadow-lg transition-all"
        >
          <UserPlus className="h-4 w-4" /> Add Student
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-card border border-slate-100 shadow-card flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:w-1/4">
          <Search className="absolute inset-y-0 left-3 h-4 w-4 my-auto text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
          />
        </div>

        {/* Standard */}
        <div className="w-full md:w-1/5">
          <select
            value={filterStandard}
            onChange={(e) => setFilterStandard(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
          >
            <option value="">All Standards</option>
            {STANDARDS.map(s => (
              <option key={s} value={s}>Std {s}</option>
            ))}
          </select>
        </div>

        {/* Branch */}
        {(role === 'admin' || role === 'operator') && (
          <div className="w-full md:w-1/5">
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Batch */}
        <div className="w-full md:w-1/5">
          <select
            value={filterBatch}
            onChange={(e) => setFilterBatch(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
          >
            <option value="">All Batches</option>
            {batches.map(b => (
              <option key={b._id} value={b._id}>{b.name} ({b.timing})</option>
            ))}
          </select>
        </div>

        {/* Active/Inactive Status */}
        <div className="w-full md:w-1/6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
          >
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
            <option value="all">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-card shadow-card border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                {/* Select-all checkbox */}
                <th className="pl-5 pr-2 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-navy accent-navy cursor-pointer"
                    title="Select / Deselect all"
                  />
                </th>
                <th className="px-4 py-4">Student Name</th>
                <th className="px-4 py-4">Branch / Batch</th>
                <th className="px-4 py-4">Std.</th>
                <th className="px-4 py-4">Mobiles</th>
                <th className="px-4 py-4">Yearly Fees</th>
                <th className="px-4 py-4">Join Date</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3].map(n => (
                  <tr key={n} className="animate-pulse">
                    <td className="pl-5 pr-2 py-4"><div className="h-4 w-4 bg-slate-100 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-32 bg-slate-100 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-28 bg-slate-100 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-10 bg-slate-100 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-100 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-100 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 bg-slate-100 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-5 w-12 bg-slate-100 rounded-full"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-12 bg-slate-100 rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : students.length > 0 ? (
                students.map((student) => {
                  const isSelected = selectedIds.has(student._id);
                  return (
                    <tr
                      key={student._id}
                      className={`transition-all ${
                        isSelected
                          ? 'bg-blue-50/70 border-l-4 border-l-navy'
                          : 'hover:bg-slate-50/50 border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Row checkbox */}
                      <td className="pl-5 pr-2 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(student._id)}
                          className="w-4 h-4 rounded border-slate-300 accent-navy cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-800">{student.name}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-700">{student.branchId?.name || 'N/A'}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{student.batchId?.name || 'N/A'} ({student.batchId?.timing || 'N/A'})</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 font-medium">{student.standard}</td>
                      <td className="px-4 py-4">
                        <div className="text-slate-700">{student.mobileNumber || student.mobile || '—'}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Parent: {student.parentMobile || '—'}</div>
                      </td>
                      <td className="px-4 py-4 font-bold text-navy">{formatCurrency(student.yearlyFees !== undefined ? student.yearlyFees : (student.monthlyFee * 12))}</td>
                      <td className="px-4 py-4 text-slate-500">{formatDate(student.joinDate)}</td>
                      <td className="px-4 py-4">
                        {student.isActive ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-brand-green bg-green-50 border border-green-200 px-2 py-0.5 rounded-full w-fit">
                            <CheckCircle className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-brand-red bg-red-50 border border-red-200 px-2 py-0.5 rounded-full w-fit">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(student)}
                            className="p-1 text-slate-400 hover:text-navy hover:bg-slate-100 rounded transition-all"
                            title="Edit Student"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {role === 'admin' && (
                            <button
                              onClick={() => openDeleteModal(student)}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-brand-red hover:bg-red-700 rounded transition-all"
                              title="Permanently Delete Student"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-medium font-sans">
                    No students found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Floating Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <div className="flex items-center gap-3 bg-navy text-white px-5 py-3 rounded-full shadow-2xl border border-navy-light">
            {/* Count badge */}
            <div className="flex items-center gap-2 pr-3 border-r border-white/20">
              <Users className="h-4 w-4 text-gold" />
              <span className="text-sm font-bold">{selectedIds.size} selected</span>
            </div>

            {/* Set Active */}
            {(role === 'admin' || role === 'operator') && (
              <button
                onClick={() => handleBulkStatusChange(true)}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-500 hover:bg-green-400 text-white rounded-full transition-all disabled:opacity-50"
                title="Set all selected students to Active"
              >
                <ToggleRight className="h-3.5 w-3.5" />
                Set Active
              </button>
            )}

            {/* Set Inactive */}
            {(role === 'admin' || role === 'operator') && (
              <button
                onClick={() => handleBulkStatusChange(false)}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-500 hover:bg-slate-400 text-white rounded-full transition-all disabled:opacity-50"
                title="Set all selected students to Inactive"
              >
                <ToggleLeft className="h-3.5 w-3.5" />
                Set Inactive
              </button>
            )}

            {/* Delete Selected */}
            {role === 'admin' && (
              <button
                onClick={() => { setBulkError(''); setBulkDeleteOpen(true); }}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-red hover:bg-red-400 text-white rounded-full transition-all disabled:opacity-50"
                title="Permanently delete all selected students"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Selected
              </button>
            )}

            {/* Error inline */}
            {bulkError && (
              <span className="text-[11px] text-red-300 ml-1">⚠ {bulkError}</span>
            )}

            {/* Loading spinner */}
            {bulkLoading && (
              <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white ml-1"></span>
            )}

            {/* Deselect all */}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 p-1 text-white/60 hover:text-white transition-all"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Confirm Modal ── */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-card shadow-2xl w-full max-w-md border border-red-100 overflow-hidden">
            <div className="bg-brand-red text-white px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <h3 className="font-bold text-base">Bulk Delete {selectedIds.size} Students</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                You are about to <strong className="text-brand-red">permanently delete</strong> <strong>{selectedIds.size} student(s)</strong> and <strong>all</strong> of their fee records and payment history.
              </p>
              <p className="text-xs text-slate-500 font-medium">
                ⚠️ This action <strong>cannot be undone</strong>. All data will be erased forever.
              </p>
              {bulkError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-btn text-xs text-brand-red flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />{bulkError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setBulkDeleteOpen(false)}
                  disabled={bulkLoading}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-btn text-xs font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkLoading}
                  className="px-5 py-2 bg-brand-red text-white text-xs font-semibold rounded-btn hover:bg-red-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-75"
                >
                  {bulkLoading ? <span className="animate-spin rounded-full h-3 w-3 border-t border-b border-white"></span> : <Trash2 className="h-3 w-3" />}
                  Yes, Delete All {selectedIds.size} Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Single Delete Confirmation Modal ── */}
      {deleteModalOpen && studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-card shadow-2xl w-full max-w-md border border-red-100 overflow-hidden">
            <div className="bg-brand-red text-white px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <h3 className="font-bold text-base">Permanently Delete Student</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                You are about to <strong className="text-brand-red">permanently delete</strong> the following student and <strong>all</strong> their fee records and payment history:
              </p>
              <div className="bg-red-50 border border-red-200 rounded-btn p-3 text-sm">
                <div className="font-bold text-slate-800">{studentToDelete.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {studentToDelete.branchId?.name} · {studentToDelete.batchId?.name} · {studentToDelete.standard}
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                ⚠️ This action <strong>cannot be undone</strong>. All fee records, payment history, and student data will be erased forever.
              </p>
              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-btn text-xs text-brand-red flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />{deleteError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setDeleteModalOpen(false); setStudentToDelete(null); }}
                  disabled={deleting}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-btn text-xs font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePermanentDelete}
                  disabled={deleting}
                  className="px-5 py-2 bg-brand-red text-white text-xs font-semibold rounded-btn hover:bg-red-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-75"
                >
                  {deleting ? <span className="animate-spin rounded-full h-3 w-3 border-t border-b border-white"></span> : <Trash2 className="h-3 w-3" />}
                  Yes, Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Add / Edit Student */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-card shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="bg-navy text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-base text-gold flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> {currentStudent ? 'Edit Student Details' : 'Enroll New Student'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-navy-light text-slate-300 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-btn flex items-center text-xs text-brand-red">
                  <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Student Name */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Branch */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Branch *</label>
                  <select
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all disabled:opacity-75"
                  >
                    {branches.map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Batch */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Batch *</label>
                  <select
                    required
                    value={formBatch}
                    onChange={(e) => {
                      const selectedBatchId = e.target.value;
                      setFormBatch(selectedBatchId);
                      // Auto-fill standard from the leading number of the batch name
                      const selectedBatch = batches.find((b: any) => b._id === selectedBatchId);
                      if (selectedBatch) {
                        const leadingNum = selectedBatch.name.match(/^(\d+)/)?.[1] || '';
                        setFormStandard(leadingNum);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                  >
                    <option value="" disabled>Select Batch</option>
                    {batches.map(b => (
                      <option key={b._id} value={b._id}>{b.name} ({b.timing})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Standard *</label>
                  <input
                    type="text"
                    required
                    placeholder="Auto-filled from batch"
                    value={formStandard}
                    onChange={(e) => setFormStandard(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                  />
                </div>

                {/* Yearly Fees */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Yearly Fees (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 10000"
                    value={formMonthlyFee}
                    onChange={(e) => setFormMonthlyFee(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Mobile */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Student Mobile *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10 digit number"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                  />
                </div>

                {/* Parent Mobile */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Parent Mobile</label>
                  <input
                    type="tel"
                    placeholder="10 digit number"
                    value={formParentMobile}
                    onChange={(e) => setFormParentMobile(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Join Date */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Admission/Join Date (DD/MM/YYYY) *</label>
                  <DatePickerInput
                    required
                    value={formJoinDate}
                    onChange={setFormJoinDate}
                  />
                </div>

                {/* Status Toggle */}
                <div>
                  {currentStudent && (role === 'admin' || role === 'operator') ? (
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-2">Student Status</label>
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="isActive"
                            checked={formIsActive === true}
                            onChange={() => setFormIsActive(true)}
                            className="mr-2 text-navy focus:ring-navy h-4 w-4"
                          />
                          Active
                        </label>
                        <label className="inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="isActive"
                            checked={formIsActive === false}
                            onChange={() => setFormIsActive(false)}
                            className="mr-2 text-brand-red focus:ring-brand-red h-4 w-4"
                          />
                          Inactive
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Remarks / Notes</label>
                <textarea
                  placeholder="Optional details..."
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-btn text-xs font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-navy text-white text-xs font-semibold rounded-btn hover:bg-navy-light shadow-md transition-all flex items-center justify-center disabled:opacity-75"
                >
                  {submitting ? (
                    <span className="animate-spin rounded-full h-3 w-3 border-t border-b border-white mr-2"></span>
                  ) : null}
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
