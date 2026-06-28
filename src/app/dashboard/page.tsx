'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useMemo } from 'react';
import { 
  Users, 
  IndianRupee, 
  Search,
  TrendingUp, 
  Receipt, 
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  Plus,
  MapPin,
  Phone,
  BookOpen,
  Clock,
  Calendar,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Check,
  AlertCircle,
  ArrowRightLeft,
  UserCheck,
  UserX,
  CreditCard,
  GraduationCap,
  Edit,
  Trash2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate, parseDDMMYYYY, formatToDDMMYYYY } from '@/lib/utils/dates';
import DatePickerInput from '@/components/ui/DatePickerInput';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [cachedBranches, setCachedBranches] = useState<any[]>([]);
  const [cachedBatches, setCachedBatches] = useState<any[]>([]);
  const [cachedStudents, setCachedStudents] = useState<any[]>([]);
  const [cachedPayments, setCachedPayments] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [filterType, setFilterType] = useState('year');
  const [refreshKey, setRefreshKey] = useState(0);
  const [batchSearchQuery, setBatchSearchQuery] = useState('');

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [branchError, setBranchError] = useState('');

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBranchIdForBatch, setSelectedBranchIdForBatch] = useState('');
  const [batchName, setBatchName] = useState('');
  const [batchTiming, setBatchTiming] = useState('');
  const [batchDays, setBatchDays] = useState('');
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [batchError, setBatchError] = useState('');

  const [showEditBatchModal, setShowEditBatchModal] = useState(false);
  const [editBatchId, setEditBatchId] = useState('');
  const [editBatchName, setEditBatchName] = useState('');
  const [editBatchTiming, setEditBatchTiming] = useState('');
  const [editBatchDays, setEditBatchDays] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);
  const [editBatchError, setEditBatchError] = useState('');

  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

  // Dynamic Batch & Student Drawer state
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchDetails, setBatchDetails] = useState<any>(null);
  const [loadingBatchDetails, setLoadingBatchDetails] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [studentFeeStatus, setStudentFeeStatus] = useState<any[]>([]);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => {
    const d = new Date();
    return d.getMonth() + 1 >= 5 ? d.getFullYear() + 1 : d.getFullYear();
  });

  // Interactive student action forms
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentMobile, setNewStudentMobile] = useState('');
  const [newStudentParentMobile, setNewStudentParentMobile] = useState('');
  const [newStudentStandard, setNewStudentStandard] = useState('');
  const [newStudentFee, setNewStudentFee] = useState('10000');
  const [newStudentJoinDate, setNewStudentJoinDate] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  const [showQuickCollectMonth, setShowQuickCollectMonth] = useState<string | null>(null);
  const [collectingFee, setCollectingFee] = useState(false);

  // Custom fee payment panel
  const [showCustomCollect, setShowCustomCollect] = useState(true);
  const [customAmount, setCustomAmount] = useState('');
  const [customCollectResult, setCustomCollectResult] = useState<any>(null);
  const [collectingCustomFee, setCollectingCustomFee] = useState(false);

  const [transferBranchId, setTransferBranchId] = useState('');
  const [transferBatchId, setTransferBatchId] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Manage Branches state
  const [showManageBranches, setShowManageBranches] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [editBranchName, setEditBranchName] = useState('');
  const [editBranchPhone, setEditBranchPhone] = useState('');
  const [editBranchAddress, setEditBranchAddress] = useState('');
  const [savingBranch, setSavingBranch] = useState(false);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);

  const toggleBranchExpand = (id: string) => {
    setExpandedBranches(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleBatchExpand = (id: string) => {
    setExpandedBatches(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (!session) return;
    
    setLoading(true);
    setLoadingHierarchy(true);
    const today = new Date();
    let startDate = '';
    let endDate = '';

    if (filterType === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      startDate = firstDay.toISOString().split('T')[0];
      endDate = lastDay.toISOString().split('T')[0];
    } else if (filterType === 'year') {
      startDate = '2026-05-01';
      endDate = '2027-04-30';
    }

    let url = `/api/dashboard/preload?filterType=${filterType}`;
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error(data.error);
          setLoading(false);
          setLoadingHierarchy(false);
          return;
        }
        setStats(data.stats);
        setCachedBranches(data.branches || []);
        setCachedBatches(data.batches || []);
        setCachedStudents(data.students || []);
        setCachedPayments(data.payments || []);

        // Compute hierarchy tree in-memory
        const studentsList = data.students || [];
        const studentCountMap: Record<string, number> = {};
        studentsList.filter((s: any) => s.isActive).forEach((s: any) => {
          const bId = s.batchId?.toString();
          if (bId) {
            studentCountMap[bId] = (studentCountMap[bId] || 0) + 1;
          }
        });

        const naturalSort = (a: string, b: string) => {
          const numA = parseInt(a.match(/^(\d+)/)?.[1] ?? '0', 10);
          const numB = parseInt(b.match(/^(\d+)/)?.[1] ?? '0', 10);
          if (numA !== numB) return numA - numB;
          return a.localeCompare(b);
        };

        let filteredBranches = [...(data.branches || [])];
        if (session.user.role !== 'admin' && session.user.branchId) {
          filteredBranches = filteredBranches.filter((b: any) => b._id.toString() === session.user.branchId);
        }

        const hierarchyData = filteredBranches.map((branch: any) => {
          const branchBatches = (data.batches || [])
            .filter((b: any) => b.branchId?.toString() === branch._id.toString())
            .map((batch: any) => ({
              ...batch,
              studentsCount: studentCountMap[batch._id.toString()] || 0,
              students: []
            }));
          branchBatches.sort((a: any, b: any) => naturalSort(a.name, b.name));
          return { ...branch, batches: branchBatches };
        }).sort((a: any, b: any) => a.name.localeCompare(b.name));

        setHierarchy(hierarchyData);

        // Auto-expand all branches by default
        const defaultExpanded: Record<string, boolean> = {};
        hierarchyData.forEach((branch: any) => {
          defaultExpanded[branch._id] = true;
        });
        setExpandedBranches(defaultExpanded);

        setLoading(false);
        setLoadingHierarchy(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        setLoadingHierarchy(false);
      });
  }, [session, filterType, refreshKey]);

  // Load Batch Details dynamically in-memory when clicked
  const loadBatchDetails = (id: string) => {
    const batch = cachedBatches.find(b => b._id === id);
    if (!batch) return;

    const branch = cachedBranches.find(br => br._id === batch.branchId);
    const studentsInBatch = cachedStudents.filter(s => s.batchId === id && s.isActive);

    const paymentsMap: Record<string, number> = {};
    cachedPayments.forEach(p => {
      const studId = p.studentId?._id || p.studentId;
      if (studId) {
        const studentIdStr = studId.toString();
        paymentsMap[studentIdStr] = (paymentsMap[studentIdStr] || 0) + (p.amount || 0);
      }
    });

    let expected = 0;
    let collected = 0;

    const studentsWithStatus = studentsInBatch.map((s: any) => {
      const yearlyExpected = s.yearlyFees || 0;
      const yearlyPaid = paymentsMap[s._id.toString()] || 0;
      const yearlyPending = Math.max(0, yearlyExpected - yearlyPaid);
      const isPaid = yearlyPending <= 0;

      expected += yearlyExpected;
      collected += yearlyPaid;

      return {
        ...s,
        yearlyExpected,
        yearlyPaid,
        yearlyPending,
        isPaid
      };
    }).sort((a: any, b: any) => a.name.localeCompare(b.name));

    const pending = expected - collected;

    setBatchDetails({
      batch: {
        id: batch._id,
        name: batch.name,
        timing: batch.timing,
        days: batch.days,
        branchName: branch?.name
      },
      stats: {
        studentsCount: studentsInBatch.length,
        expected,
        collected,
        pending
      },
      students: studentsWithStatus
    });
  };

  useEffect(() => {
    if (selectedBatchId && cachedBatches.length > 0) {
      loadBatchDetails(selectedBatchId);
    }
  }, [selectedBatchId, cachedBatches, cachedStudents, cachedPayments]);

  // Load Student details and Calendar dynamically
  const loadStudentDetails = async (id: string) => {
    const student = cachedStudents.find(s => s._id === id);
    if (!student) return;

    const branch = cachedBranches.find(br => br._id === student.branchId);
    const batch = cachedBatches.find(b => b._id === student.batchId);

    setStudentDetails({
      ...student,
      branchId: branch ? { _id: branch._id, name: branch.name } : null,
      batchId: batch ? { _id: batch._id, name: batch.name, timing: batch.timing, days: batch.days } : null
    });
    setTransferBranchId(student.branchId || '');
    setTransferBatchId(student.batchId || '');

    setLoadingStudentDetails(true);
    try {
      const feeRes = await fetch(`/api/students/${id}/fee-status?year=${calendarYear}`);
      const feeData = await feeRes.json();
      if (feeRes.ok) {
        setStudentFeeStatus(feeData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudentDetails(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId && cachedStudents.length > 0) {
      loadStudentDetails(selectedStudentId);
    }
  }, [selectedStudentId, calendarYear, cachedStudents]);

  const filteredHierarchy = useMemo(() => {
    return hierarchy.map(branch => {
      if (!batchSearchQuery.trim()) return branch;

      const query = batchSearchQuery.toLowerCase();
      
      // A branch matches if the branch name matches the query,
      // OR if any of its batches match the query.
      const branchMatches = branch.name.toLowerCase().includes(query);
      
      const matchingBatches = (branch.batches || []).filter((batch: any) => 
        batch.name.toLowerCase().includes(query) || 
        (batch.timing && batch.timing.toLowerCase().includes(query)) ||
        (batch.days && batch.days.toLowerCase().includes(query))
      );

      if (branchMatches) {
        return branch;
      } else if (matchingBatches.length > 0) {
        return {
          ...branch,
          batches: matchingBatches
        };
      }
      return null;
    }).filter(Boolean);
  }, [hierarchy, batchSearchQuery]);

  if (!session) return null;

  const role = session.user.role;

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName) {
      setBranchError('Branch Name is required');
      return;
    }

    setCreatingBranch(true);
    setBranchError('');

    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: branchName,
          address: branchAddress,
          phone: branchPhone
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create branch');
      }

      setBranchName('');
      setBranchAddress('');
      setBranchPhone('');
      setShowBranchModal(false);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      setBranchError(err.message);
    } finally {
      setCreatingBranch(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName || !selectedBranchIdForBatch) {
      setBatchError('Batch name and branch assignment are required');
      return;
    }

    setCreatingBatch(true);
    setBatchError('');

    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedBranchIdForBatch,
          name: batchName,
          timing: batchTiming,
          days: batchDays
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create batch');
      }

      setBatchName('');
      setBatchTiming('');
      setBatchDays('');
      setShowBatchModal(false);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      setBatchError(err.message);
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleEditBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBatchName || !editBatchId) {
      setEditBatchError('Batch name is required');
      return;
    }

    setSavingBatch(true);
    setEditBatchError('');

    try {
      const res = await fetch(`/api/batches/${editBatchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editBatchName,
          timing: editBatchTiming,
          days: editBatchDays
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update batch');
      }

      setShowEditBatchModal(false);
      
      // Update batchDetails state to reflect changes instantly
      if (batchDetails && batchDetails.batch.id === editBatchId) {
        setBatchDetails((prev: any) => ({
          ...prev,
          batch: {
            ...prev.batch,
            name: editBatchName,
            timing: editBatchTiming,
            days: editBatchDays
          }
        }));
      }
      
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      setEditBatchError(err.message);
    } finally {
      setSavingBatch(false);
    }
  };

  const handleDeleteBatch = async (batchId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the batch "${name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete batch');
      }

      setSelectedBatchId(null);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Student inside Batch Drawer
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !newStudentName || !newStudentStandard || !newStudentFee || !newStudentJoinDate) {
      alert('Please fill in all required fields');
      return;
    }

    setAddingStudent(true);
    try {
      // Find branchId for this batch
      let foundBranchId = '';
      for (const b of hierarchy) {
        if (b.batches.some((bat: any) => bat._id === selectedBatchId)) {
          foundBranchId = b._id;
          break;
        }
      }

      if (!foundBranchId && role === 'operator' && session.user.branchId) {
        foundBranchId = session.user.branchId;
      }

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: foundBranchId,
          batchId: selectedBatchId,
          name: newStudentName,
          mobileNumber: newStudentMobile,
          parentMobile: newStudentParentMobile,
          standard: newStudentStandard,
          yearlyFees: Number(newStudentFee),
          joinDate: parseDDMMYYYY(newStudentJoinDate)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to enroll student');
      }

      setNewStudentName('');
      setNewStudentMobile('');
      setNewStudentParentMobile('');
      setNewStudentStandard('');
      setNewStudentFee('10000');
      setShowAddStudentForm(false);
      loadBatchDetails(selectedBatchId);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingStudent(false);
    }
  };

  // Quick Fee Collection
  const handleQuickCollectFee = async () => {
    if (!selectedStudentId || !showQuickCollectMonth || !studentDetails) return;
    setCollectingFee(true);
    try {
      const [yearStr, monthStr] = showQuickCollectMonth.split('-');
      const res = await fetch('/api/fees/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          year: parseInt(yearStr),
          month: parseInt(monthStr),
          amount: Number(studentDetails.monthlyFee || 800),
          paymentType: 'full',
          notes: `Quick pay via dashboard calendar`
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit payment');
      }

      setShowQuickCollectMonth(null);
      loadStudentDetails(selectedStudentId);
      if (selectedBatchId) loadBatchDetails(selectedBatchId);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCollectingFee(false);
    }
  };

  // Custom amount fee collection (greedy distribution)
  const handleCustomCollectFee = async () => {
    if (!selectedStudentId || !customAmount || !studentDetails) return;
    const amt = Number(customAmount);
    if (isNaN(amt) || amt <= 0) return;
    setCollectingCustomFee(true);
    setCustomCollectResult(null);
    try {
      const res = await fetch('/api/fees/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          amount: amt,
          paymentType: 'full',
          notes: `Fee payment of ₹${amt} via dashboard`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCustomCollectResult(data);
      setCustomAmount('');
      loadStudentDetails(selectedStudentId);
      if (selectedBatchId) loadBatchDetails(selectedBatchId);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCollectingCustomFee(false);
    }
  };

  // Student batch/branch transfers
  const handleTransferStudent = async () => {
    if (!selectedStudentId) return;
    setTransferring(true);
    try {
      const res = await fetch(`/api/students/${selectedStudentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: transferBranchId,
          batchId: transferBatchId
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to transfer student');
      }

      alert('Student transferred successfully!');
      loadStudentDetails(selectedStudentId);
      if (selectedBatchId) {
        loadBatchDetails(selectedBatchId);
      }
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransferring(false);
    }
  };

  // Toggle student status (Active / Inactive)
  const handleToggleStatus = async () => {
    if (!selectedStudentId || !studentDetails) return;
    const newActive = !studentDetails.isActive;
    if (!window.confirm(`Are you sure you want to mark this student as ${newActive ? 'Active' : 'Inactive'}?`)) return;

    try {
      const res = await fetch(`/api/students/${selectedStudentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: newActive
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update student status');
      }

      loadStudentDetails(selectedStudentId);
      if (selectedBatchId) {
        loadBatchDetails(selectedBatchId);
      }
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Manage Branches: Edit a branch
  const handleEditBranch = async () => {
    if (!editingBranch || !editBranchName.trim()) return;
    setSavingBranch(true);
    try {
      const res = await fetch(`/api/branches/${editingBranch._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editBranchName.trim(), phone: editBranchPhone.trim(), address: editBranchAddress.trim() })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setEditingBranch(null);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingBranch(false);
    }
  };

  // Manage Branches: Delete a branch
  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    if (!window.confirm(`Delete branch "${branchName}"? This cannot be undone.`)) return;
    setDeletingBranchId(branchId);
    try {
      const res = await fetch(`/api/branches/${branchId}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingBranchId(null);
    }
  };

  // Format PDF print for pending list
  const handlePrintDefaulters = (batch: any, students: any[]) => {
    const pendingStudents = students.filter(s => !s.isPaid);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Defaulters List - ${batch.name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; }
            h2 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .meta { font-size: 14px; color: #64748b; margin-bottom: 20px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; }
            .total { margin-top: 30px; font-weight: bold; font-size: 16px; text-align: right; }
          </style>
        </head>
        <body>
          <h2>Pending Fees Defaulters List</h2>
          <div class="meta">
            <strong>Branch:</strong> ${batch.branchName || '-'}<br/>
            <strong>Batch:</strong> ${batch.name} (${batch.timing || 'N/A'})<br/>
            <strong>Defaulter Students:</strong> ${pendingStudents.length}<br/>
            <strong>Generated Date:</strong> ${formatDate(new Date())}
          </div>
          <table>
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Student Name</th>
                <th>Mobile</th>
                <th>Standard</th>
                <th>Yearly Fee</th>
                <th>Paid Fee</th>
                <th>Pending Fee</th>
              </tr>
            </thead>
            <tbody>
              ${pendingStudents.map((s, index) => {
                const mobileNum = s.mobileNumber || s.mobile || '';
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${s.name}</td>
                    <td>${mobileNum ? `<a href="tel:${mobileNum}" style="color: #1e3a8a; text-decoration: none; font-weight: bold;">${mobileNum}</a>` : '-'}</td>
                    <td>${s.standard}</td>
                    <td>₹${s.yearlyExpected || 0}</td>
                    <td>₹${s.yearlyPaid || 0}</td>
                    <td>₹${s.yearlyPending || 0}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div class="total">
            Total Pending Deficit: ₹${pendingStudents.reduce((sum, s) => sum + (s.yearlyPending || 0), 0)}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const monthsList = [
    { label: 'Jan', value: '01' },
    { label: 'Feb', value: '02' },
    { label: 'Mar', value: '03' },
    { label: 'Apr', value: '04' },
    { label: 'May', value: '05' },
    { label: 'Jun', value: '06' },
    { label: 'Jul', value: '07' },
    { label: 'Aug', value: '08' },
    { label: 'Sep', value: '09' },
    { label: 'Oct', value: '10' },
    { label: 'Nov', value: '11' },
    { label: 'Dec', value: '12' }
  ];


  if (role === 'operator') {
    return (
      <div className="space-y-6 bg-gradient-to-br from-[#060d26] via-[#0D1B4B] to-[#060d26] text-slate-100 p-6 min-h-screen rounded-card relative overflow-hidden shadow-premium">
        {/* Ambient background glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1e2f6b]/15 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Header Branding Section */}
        <div className="flex flex-col items-center text-center space-y-4 pt-4 pb-6 border-b border-white/5">
          {/* Logo Container */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] to-[#ffd700] rounded-2xl blur-md opacity-25 group-hover:opacity-45 transition-all duration-300"></div>
            <div className="relative bg-white p-2.5 rounded-2xl shadow-lg flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 overflow-hidden">
              <img 
                src="/logo.png" 
                alt="Eklavya Classes Logo" 
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          </div>

          {/* Brand Title and Tagline */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-widest text-[#D4AF37] font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              EKLAVYA CLASSES
            </h1>
            <p className="text-xs sm:text-sm font-gujarati text-slate-300 font-semibold tracking-wider">
              જ્ઞાનથી ઉજ્જવળ ભવિષ્ય તરફ ✨
            </p>
          </div>
        </div>

        {/* User Welcome Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-navy-dark/80 via-navy/90 to-navy-dark/80 backdrop-blur-md border-l-4 border-l-[#D4AF37] border-y border-r border-white/10 p-6 md:p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(13,27,75,0.3)] flex flex-col md:flex-row md:items-center md:justify-between gap-4 z-10 transition-all duration-300 hover:shadow-[0_12px_40px_0_rgba(212,175,55,0.08)]">
          {/* Decorative ambient radial glow inside card */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-sans tracking-tight">
                Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#FFE494] to-[#D4AF37]">{session.user.name}</span>
              </h2>
            </div>
            <div className="flex items-center gap-3 text-slate-200 text-sm md:text-base font-medium tracking-wide">
              <span className="leading-snug select-none">Welcome to the Eklavya Classes Administration Portal.</span>
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/25 text-[#D4AF37] shadow-sm flex-shrink-0">
                <GraduationCap className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Layout (Grid with 2 columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          {/* 1. Branch & Batch Hierarchy Explorer (2 cols width) */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-premium space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#D4AF37] font-sans flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-[#D4AF37] rounded-full inline-block"></span>
                  Branch & Batch Hierarchy Explorer
                </h3>
                <p className="text-xs text-slate-300 mt-1">Expand branches and click batches to view detailed student fee grids.</p>
              </div>
              <button
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="p-1.5 text-slate-300 hover:text-[#D4AF37] hover:bg-white/5 rounded-lg transition-all"
                title="Reload Hierarchy"
              >
                <RefreshCw className={`h-4 w-4 ${loadingHierarchy ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Global Search Option */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search batch or branch globally..."
                value={batchSearchQuery}
                onChange={(e) => setBatchSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 text-white placeholder-slate-400 rounded-xl focus:outline-none focus:border-[#D4AF37] text-sm transition-all"
              />
            </div>

            {loadingHierarchy ? (
              <div className="py-16 text-center text-slate-300">
                <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D4AF37] inline-block"></span>
                <p className="text-xs mt-3 font-semibold">Loading organization structure...</p>
              </div>
            ) : filteredHierarchy.length > 0 ? (
              <div className="space-y-4">
                {filteredHierarchy.map((branch: any) => {
                  const isBranchExpanded = batchSearchQuery.trim() !== '' || !!expandedBranches[branch._id];
                  return (
                    <div key={branch._id} className="border border-white/5 rounded-xl bg-white/[0.01] overflow-hidden transition-all duration-300 hover:border-white/10">
                      {/* Branch Node */}
                      <div 
                        className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all border-b border-white/5"
                        onClick={() => toggleBranchExpand(branch._id)}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-[#D4AF37]">
                            {isBranchExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </span>
                          <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20 font-bold text-sm">
                            {branch.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm flex items-center gap-1.5 font-sans">
                              {branch.name}
                              <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold text-[9px] uppercase tracking-wider border border-[#D4AF37]/30">
                                Branch
                              </span>
                            </h4>
                            <div className="flex items-center gap-3 text-[10px] text-slate-300 mt-1">
                              {branch.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-[#D4AF37]" /> {branch.phone}
                                </span>
                              )}
                              {branch.address && (
                                <span className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-[200px]">
                                  <MapPin className="h-3 w-3 text-[#D4AF37]" /> {branch.address}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3" onClick={e => e.stopPropagation()}>
                          <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/15 border border-[#D4AF37]/25 px-2.5 py-0.75 rounded-lg">
                            {branch.batches?.length || 0} Batches
                          </span>
                        </div>
                      </div>

                      {/* Batches Sub-tree */}
                      {isBranchExpanded && (
                        <div className="p-4 space-y-3 bg-black/20 border-t border-white/5 pl-8 transition-all">
                          {branch.batches && branch.batches.length > 0 ? (
                            branch.batches.map((batch: any) => {
                              return (
                                <div 
                                  key={batch._id} 
                                  className={`bg-white/[0.01] border rounded-xl overflow-hidden transition-all hover:bg-white/[0.03] hover:border-[#D4AF37]/45 ${selectedBatchId === batch._id ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]' : 'border-white/5'}`}
                                >
                                  <div
                                    className="flex items-center justify-between p-3 cursor-pointer transition-all"
                                    onClick={() => setSelectedBatchId(batch._id)}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <BookOpen className="h-4 w-4 text-[#D4AF37]" />
                                      <div>
                                        <h5 className="font-semibold text-white text-xs font-sans">{batch.name}</h5>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-0.5">
                                          {batch.timing && (
                                            <span className="flex items-center gap-0.5">
                                              <Clock className="h-2.5 w-2.5 text-[#D4AF37]" /> {batch.timing}
                                            </span>
                                          )}
                                          {batch.days && (
                                            <span className="flex items-center gap-0.5">
                                              <Calendar className="h-2.5 w-2.5 text-[#D4AF37]" /> {batch.days}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-slate-300 bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">
                                        {batch.studentsCount || 0} Enrolled
                                      </span>
                                      <span className="text-[9px] text-[#D4AF37] font-bold hover:underline">
                                        View Info &rarr;
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-slate-300 italic py-2">No batches registered under this branch.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-300 text-center py-6">No branches available in the system.</p>
            )}
          </div>

          {/* 2. Recent Payments (1 col width) */}
          <div className="lg:col-span-1 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-premium space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-lg font-bold text-[#D4AF37] font-sans flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#D4AF37] rounded-full inline-block"></span>
                Recent Payments
              </h3>
              <Link href="/fees" className="text-xs font-bold text-[#D4AF37] hover:text-white transition-all bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/25 px-3 py-1 rounded-lg">
                Collect Fees
              </Link>
            </div>

            <div className="divide-y divide-white/5 overflow-hidden">
              {stats?.recentFees?.length > 0 ? (
                stats.recentFees.map((fee: any) => (
                  <div key={fee._id} className="py-3.5 flex justify-between items-center first:pt-0 last:pb-0 hover:bg-white/[0.01] px-1 rounded-lg transition-all">
                    <div>
                      <p className="text-xs font-bold text-white">{fee.studentId?.name || 'Deleted Student'}</p>
                      <p className="text-[10px] text-slate-300 mt-1 font-medium flex items-center gap-1.5">
                        <span>Month: {fee.feeMonth}</span>
                        <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                        <span>Std {fee.studentId?.standard || 'N/A'}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-[#D4AF37] block font-sans">+{formatCurrency(fee.amount)}</span>
                      <span className="text-[9px] px-2 py-0.5 mt-1 inline-block font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize tracking-wide font-sans">
                        {fee.paymentType}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-300 py-6 text-center italic">No fee payments found for this period.</p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BATCH INFO & DETAILS PANEL DRAWER (CUSTOM STYLED FOR OPERATOR) */}
        {/* ========================================================================= */}
        {selectedBatchId && batchDetails && (
          <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-[#060d26] text-white shadow-2xl border-l border-white/10 flex flex-col animate-slide-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0d1b4b] via-[#10246a] to-[#0d1b4b] p-5 text-white flex items-center justify-between border-b border-white/10 shadow-lg">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedBatchId(null)} 
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-[#D4AF37] transition-all hover:scale-105 active:scale-95"
                  title="Back"
                >
                  <ChevronRight className="h-5 w-5 transform rotate-180" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-md border border-[#D4AF37]/30 font-extrabold uppercase tracking-wider font-sans">
                      Batch Details
                    </span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-white font-sans mt-1 uppercase">
                    {batchDetails.batch?.name || 'Batch'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-300 font-medium font-sans">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-[#D4AF37]/70" />
                      {batchDetails.batch?.branchName || 'Unknown'} Branch
                    </span>
                    {batchDetails.batch?.timing && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/30"></span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#D4AF37]/70" />
                          {batchDetails.batch?.timing}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBatchId(null)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 text-slate-300 hover:text-red-400 transition-all hover:scale-105 active:scale-95"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Roster & Fee Status */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#D4AF37]">Student Information & Fee Status</h4>
                  <button
                    onClick={() => {
                      setNewStudentJoinDate(formatToDDMMYYYY(new Date().toISOString().split('T')[0]));
                      setNewStudentStandard(batchDetails.batch.name.match(/^(\d+)/)?.[1] || '');
                      setShowAddStudentForm(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold rounded-lg transition-all"
                  >
                    <Plus className="h-3 w-3" /> Add Student
                  </button>
                </div>

                {/* Add Student inline Form */}
                {showAddStudentForm && (
                  <form onSubmit={handleAddStudent} className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3 animate-slide-up text-xs font-sans">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2">
                      <h5 className="font-bold text-xs text-[#D4AF37] uppercase">Quick Register Student</h5>
                      <button type="button" onClick={() => setShowAddStudentForm(false)} className="text-slate-400 hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Student Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Student Name"
                          value={newStudentName}
                          onChange={e => setNewStudentName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#D4AF37] text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Standard / Class *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 10A1"
                          value={newStudentStandard}
                          onChange={e => setNewStudentStandard(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#D4AF37] text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Student Mobile</label>
                        <input
                          type="text"
                          placeholder="Mobile"
                          value={newStudentMobile}
                          onChange={e => setNewStudentMobile(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#D4AF37] text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Parent Mobile</label>
                        <input
                          type="text"
                          placeholder="Parent Mobile"
                          value={newStudentParentMobile}
                          onChange={e => setNewStudentParentMobile(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#D4AF37] text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Yearly Fees (₹) *</label>
                        <input
                          type="number"
                          required
                          placeholder="10000"
                          value={newStudentFee}
                          onChange={e => setNewStudentFee(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#D4AF37] text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 block mb-1">Date Joined (DD/MM/YYYY) *</label>
                        <DatePickerInput
                          required
                          value={newStudentJoinDate}
                          onChange={setNewStudentJoinDate}
                          theme="dark"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => setShowAddStudentForm(false)}
                        className="px-3 py-1.5 bg-white/5 text-slate-300 border border-white/10 rounded-lg hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addingStudent}
                        className="px-3 py-1.5 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-slate-950 font-bold rounded-lg hover:from-[#E5C158] hover:to-[#AA8611] disabled:opacity-50"
                      >
                        {addingStudent ? 'Adding...' : 'Enroll Student'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Students List Details */}
                {loadingBatchDetails ? (
                  <div className="py-8 text-center text-slate-300">
                    <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#D4AF37] inline-block"></span>
                  </div>
                ) : batchDetails.students && batchDetails.students.length > 0 ? (
                  <div className="space-y-3">
                    {batchDetails.students.map((student: any) => (
                      <div 
                        key={student._id} 
                        onClick={() => setSelectedStudentId(student._id)}
                        className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 cursor-pointer transition-all hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 font-bold rounded-full flex items-center justify-center font-sans">
                            {student.name.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="font-bold text-xs text-slate-200 uppercase font-sans">{student.name}</h5>
                            <p className="text-[10px] text-slate-300 mt-0.5 font-medium">
                              Yearly Fee: ₹{student.yearlyFees || (student.monthlyFee * 12)} · Paid: ₹{student.yearlyPaid} / ₹{student.yearlyExpected}
                            </p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                          student.isPaid 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-red-500/10 border-red-500/25 text-red-400'
                        }`}>
                          {student.isPaid ? 'PAID' : `Pending: ₹${student.yearlyPending}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-300 italic">
                    No active students found in this batch.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STUDENT PROFILE & HISTORY DRAWER (CUSTOM STYLED FOR OPERATOR) */}
        {/* ========================================================================= */}
        {selectedStudentId && studentDetails && (
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#060d26] text-white shadow-2xl border-l border-white/10 flex flex-col animate-slide-in">
            {/* Header */}
            <div className="bg-[#0D1B4B] p-5 text-white flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedStudentId(null)} 
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-all"
                  title="Back"
                >
                  <ChevronRight className="h-5 w-5 transform rotate-180 text-[#D4AF37]" />
                </button>
                <div>
                  <h3 className="font-bold text-sm font-sans flex items-center gap-2">
                    Student Profile
                  </h3>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    Viewing details for {studentDetails.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudentId(null)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-300 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile summary */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#D4AF37]/10 text-[#D4AF37] border-2 border-[#D4AF37]/25 text-lg font-bold rounded-full flex items-center justify-center font-sans shadow-md">
                    {studentDetails.name.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-white uppercase flex items-center gap-2 font-sans">
                      {studentDetails.name}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        studentDetails.isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-white/10 text-slate-400'
                      }`}>
                        {studentDetails.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </h4>
                    <p className="text-xs font-bold text-emerald-400 mt-1">Yearly Fee: ₹{studentDetails.yearlyFees || (studentDetails.monthlyFee * 12)}</p>
                  </div>
                </div>

                <button
                  onClick={handleToggleStatus}
                  className={`p-2 rounded-xl border transition-all ${
                    studentDetails.isActive 
                      ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' 
                      : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                  title={studentDetails.isActive ? 'Mark Inactive' : 'Mark Active'}
                >
                  {studentDetails.isActive ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                </button>
              </div>

              {/* Student Metadata Table */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="font-semibold text-slate-400">Branch Office</span>
                  <span className="font-bold text-white">{studentDetails.branchId?.name || '-'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="font-semibold text-slate-400">Batch Code</span>
                  <span className="font-bold text-white">{studentDetails.batchId?.name || '-'} ({studentDetails.batchId?.timing || ''})</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="font-semibold text-slate-400">Joined Date</span>
                  <span className="font-bold text-white">
                    {formatDate(studentDetails.joinDate)}
                  </span>
                </div>
                {(studentDetails.mobile || studentDetails.parentMobile) && (
                  <div className="flex justify-between py-1.5">
                    <span className="font-semibold text-slate-400">Contact Mobiles</span>
                    <span className="font-bold text-white">
                      {studentDetails.mobile || '-'} {studentDetails.parentMobile ? `(P: ${studentDetails.parentMobile})` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Yearly Fee Stats Summary */}
              <div className="space-y-4">
                <h4 className="font-bold text-[#D4AF37] text-sm font-sans">Fee Status Summary</h4>
                
                {loadingStudentDetails ? (
                  <div className="py-8 text-center text-slate-300">
                    <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#D4AF37] inline-block"></span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 font-sans mt-2">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-center">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Yearly Fees</span>
                        <span className="text-sm font-black text-white block mt-1">₹{studentDetails.yearlyFees || (studentDetails.monthlyFee * 12) || 0}</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-center">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Paid</span>
                        <span className="text-sm font-black text-emerald-400 block mt-1">
                          ₹{studentFeeStatus.reduce((sum, p) => sum + (p.amount || 0), 0)}
                        </span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-center">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Pending</span>
                        <span className={`text-sm font-black block mt-1 ${
                          (studentDetails.yearlyFees - studentFeeStatus.reduce((sum, p) => sum + (p.amount || 0), 0)) > 0
                            ? 'text-red-400 animate-pulse'
                            : 'text-emerald-400'
                        }`}>
                          ₹{Math.max(0, (studentDetails.yearlyFees || (studentDetails.monthlyFee * 12) || 0) - studentFeeStatus.reduce((sum, p) => sum + (p.amount || 0), 0))}
                        </span>
                      </div>
                    </div>

                    {/* Payment History (LIFO) */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 font-sans">
                      <h5 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Payment History</h5>
                      {studentFeeStatus.length > 0 ? (
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                          {studentFeeStatus.map((pay) => (
                            <div key={pay._id} className="flex justify-between items-center py-2 border-b border-white/5 text-xs text-slate-300">
                              <div>
                                <p className="font-bold text-white">₹{pay.amount}</p>
                                <p className="text-[10px] text-slate-400">{new Date(pay.transactionDate).toLocaleDateString('en-IN')}</p>
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-0.5 rounded bg-white/10 text-[9px] uppercase font-bold text-slate-300">{pay.paymentType}</span>
                                {pay.notes && <p className="text-[10px] text-slate-400 mt-0.5 italic max-w-[150px] truncate">{pay.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No payments recorded yet.</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Collect Custom Fee Panel */}
              <div className="bg-[#0D1B4B]/30 border border-[#D4AF37]/20 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="font-bold text-xs text-[#D4AF37] uppercase tracking-wider font-sans">Collect Fee Payment</h5>
                </div>

                <div className="space-y-3 text-xs font-sans">
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-sans">₹</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 5000"
                        value={customAmount}
                        onChange={e => setCustomAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-sm bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:border-[#D4AF37] transition-all font-sans"
                      />
                    </div>
                    <button
                      onClick={handleCustomCollectFee}
                      disabled={collectingCustomFee || !customAmount}
                      className="px-4 py-2 bg-[#D4AF37] hover:bg-yellow-400 text-slate-950 font-bold rounded-lg disabled:opacity-50 whitespace-nowrap transition-all shadow-md"
                    >
                      {collectingCustomFee ? 'Processing…' : 'Collect'}
                    </button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {[1000, 2000, 5000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setCustomAmount(String(amt))}
                        className="px-2.5 py-1 bg-white/5 border border-white/10 text-slate-300 text-[10px] font-semibold rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all font-sans"
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>

                  {customCollectResult && (
                    <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 space-y-1 text-slate-300 text-xs">
                      <p className="text-[10px] font-bold text-emerald-400 font-sans">✓ Payment recorded</p>
                      <p className="text-[10px] font-sans">
                        Payment of <span className="text-white font-semibold">₹{customCollectResult.paymentLog?.amount}</span> successfully recorded.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-navy text-white p-6 rounded-card shadow-premium relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-2xl pointer-events-none"></div>
        <div>
          <h2 className="text-2xl font-bold text-white font-sans">Hello, {session.user.name}</h2>
          <p className="text-slate-300 text-sm mt-1 font-medium">
            {role === 'admin' 
              ? 'Here is an overview of Eklavya Classes statistics and operations.' 
              : `Welcome to the Operator Panel for Eklavya Classes branch: ${session.user.branchName || 'Assigned'}.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 z-10">
          {role === 'admin' && (
            <>
              <button
                onClick={() => setShowBranchModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gold text-navy text-xs font-bold rounded-btn hover:bg-gold-light shadow-md transition-all uppercase tracking-wider"
              >
                <Plus className="h-4 w-4" /> Create Branch
              </button>
              <button
                onClick={() => setShowManageBranches(v => !v)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-btn shadow-md transition-all uppercase tracking-wider border ${
                  showManageBranches
                    ? 'bg-white text-navy border-white'
                    : 'bg-navy-light border-navy-light/50 text-slate-200 hover:text-white'
                }`}
              >
                <MapPin className="h-4 w-4" /> Manage Branches
              </button>
            </>
          )}

          <div className="flex bg-navy-light p-1 rounded-btn border border-navy-light/50">
            <button
              onClick={() => setFilterType('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-btn transition-all ${
                filterType === 'month' ? 'bg-gold text-navy shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setFilterType('year')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-btn transition-all ${
                filterType === 'year' ? 'bg-gold text-navy shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              This Year
            </button>
          </div>
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="p-2.5 bg-navy-light hover:bg-navy-light/85 border border-navy-light/50 rounded-btn text-slate-300 hover:text-white transition-all"
            title="Refresh statistics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-white p-6 rounded-card border border-slate-100 shadow-card animate-pulse">
              <div className="flex justify-between items-center mb-4">
                <div className="h-4 w-20 bg-slate-200 rounded"></div>
                <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
              </div>
              <div className="h-8 w-28 bg-slate-200 rounded mb-2"></div>
              <div className="h-3 w-32 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Active Students Card */}
            <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card hover:shadow-md transition-all flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Active Students</span>
                <span className="text-3xl font-bold text-navy mt-1 block">
                  {stats?.activeStudentsCount ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                  Out of {stats?.totalStudentsCount ?? 0} registered
                </span>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                <Users className="h-6 w-6" />
              </div>
            </div>

            {/* Expected Fees Card (New!) */}
            <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card hover:shadow-md transition-all flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Expected Fees</span>
                <span className="text-3xl font-bold text-amber-500 mt-1 block">
                  {formatCurrency(stats?.totalExpectedFees ?? 0)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                  {filterType === 'month' ? 'Active monthly projected' : 'Active yearly projected'}
                </span>
              </div>
              <div className="p-3 bg-amber-50 text-amber-500 rounded-full">
                <IndianRupee className="h-6 w-6" />
              </div>
            </div>

            {/* Collected Fees Card */}
            <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card hover:shadow-md transition-all flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Collected Fees</span>
                <span className="text-3xl font-bold text-brand-green mt-1 block">
                  {formatCurrency(stats?.totalCollectedFees ?? 0)}
                </span>
                <span className="text-[11px] text-brand-green font-semibold mt-1 block">
                  {stats?.totalExpectedFees ? `${Math.round((stats.totalCollectedFees / stats.totalExpectedFees) * 100)}% recovery rate` : 'In selected period'}
                </span>
              </div>
              <div className="p-3 bg-green-50 text-brand-green rounded-full">
                <IndianRupee className="h-6 w-6" />
              </div>
            </div>

            {/* Pending Balance Card (New!) */}
            <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card hover:shadow-md transition-all flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Pending Balance</span>
                <span className="text-3xl font-bold text-red-500 mt-1 block">
                  {formatCurrency(stats?.totalPendingFees ?? 0)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                  Outstanding for period
                </span>
              </div>
              <div className="p-3 bg-red-50 text-red-500 rounded-full">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {role === 'admin' && (
              <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card hover:shadow-md transition-all flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">Total Expenditures</span>
                  <span className="text-3xl font-bold text-brand-red mt-1 block">
                    {formatCurrency(stats?.totalExpenses ?? 0)}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                    Office operational costs
                  </span>
                </div>
                <div className="p-3 bg-red-50 text-brand-red rounded-full">
                  <IndianRupee className="h-6 w-6" />
                </div>
              </div>
            )}

            {role === 'admin' && (
              <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card hover:shadow-md transition-all flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">Net Profit / Margin</span>
                  <span className={`text-3xl font-bold mt-1 block ${stats?.netProfit >= 0 ? 'text-navy' : 'text-brand-red'}`}>
                    {formatCurrency(stats?.netProfit ?? 0)}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                    Collected fees minus expenses
                  </span>
                </div>
                <div className={`p-3 rounded-full ${stats?.netProfit >= 0 ? 'bg-gold/10 text-gold-dark' : 'bg-red-50 text-brand-red'}`}>
                  {stats?.netProfit >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                </div>
              </div>
            )}
          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── MANAGE BRANCHES PANEL ── */}
            {showManageBranches && role === 'admin' && (
              <div className="bg-white rounded-card border border-slate-200 shadow-card overflow-hidden lg:col-span-3">
                <div className="bg-navy px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gold" /> Manage Branches
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">Edit branch name, contact, or delete a branch.</p>
                  </div>
                  <button onClick={() => setShowManageBranches(false)} className="text-slate-400 hover:text-white p-1 transition-all">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {editingBranch ? (
                  /* Edit Form */
                  <div className="p-6 space-y-4">
                    <h4 className="text-xs font-bold text-navy uppercase tracking-wider">Editing: {editingBranch.name}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Branch Name *</label>
                        <input
                          type="text"
                          value={editBranchName}
                          onChange={e => setEditBranchName(e.target.value)}
                          placeholder="e.g. Main Branch"
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-navy transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Phone / Mobile</label>
                        <input
                          type="text"
                          value={editBranchPhone}
                          onChange={e => setEditBranchPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-navy transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Address</label>
                        <input
                          type="text"
                          value={editBranchAddress}
                          onChange={e => setEditBranchAddress(e.target.value)}
                          placeholder="e.g. 123 Main Street"
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-navy transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleEditBranch}
                        disabled={savingBranch || !editBranchName.trim()}
                        className="px-5 py-2 bg-navy text-white text-xs font-bold rounded-btn hover:bg-navy-light disabled:opacity-50 transition-all"
                      >
                        {savingBranch ? 'Saving…' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditingBranch(null)}
                        className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-btn hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Branch List */
                  <div className="divide-y divide-slate-100">
                    {hierarchy.map((branch: any) => (
                      <div key={branch._id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-navy" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-800">{branch.name}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {branch.phone && (
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {branch.phone}
                                </span>
                              )}
                              {branch.address && (
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {branch.address}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {branch.batches?.length || 0} batch(es) · {branch.studentsCount || 0} students
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => {
                              setEditingBranch(branch);
                              setEditBranchName(branch.name);
                              setEditBranchPhone(branch.phone || '');
                              setEditBranchAddress(branch.address || '');
                            }}
                            className="px-3 py-1.5 bg-navy text-white text-[10px] font-bold rounded-btn hover:bg-navy-light transition-all flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBranch(branch._id, branch.name)}
                            disabled={deletingBranchId === branch._id}
                            className="px-3 py-1.5 bg-red-50 text-brand-red border border-red-200 text-[10px] font-bold rounded-btn hover:bg-red-100 disabled:opacity-50 transition-all flex items-center gap-1"
                          >
                            <X className="h-3 w-3" /> {deletingBranchId === branch._id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {hierarchy.length === 0 && (
                      <div className="px-6 py-8 text-center text-slate-400 text-xs">No branches found.</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Hierarchy tree explorer */}
            <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-navy font-sans">Branch & Batch Hierarchy Explorer</h3>
                  <p className="text-xs text-slate-400">Expand branches and click batches to view detailed student fee grids.</p>
                </div>
                <button
                  onClick={() => setRefreshKey(prev => prev + 1)}
                  className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-50 rounded transition-all"
                  title="Reload Hierarchy"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingHierarchy ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Global Search Option */}
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search batch or branch globally..."
                  value={batchSearchQuery}
                  onChange={(e) => setBatchSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl focus:outline-none focus:border-navy text-sm transition-all"
                />
              </div>

              {loadingHierarchy ? (
                <div className="py-12 text-center text-slate-400">
                  <span className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-navy inline-block"></span>
                  <p className="text-xs mt-2 font-medium">Loading organization structure...</p>
                </div>
              ) : filteredHierarchy.length > 0 ? (
                <div className="space-y-4">
                  {filteredHierarchy.map((branch: any) => {
                    const isBranchExpanded = batchSearchQuery.trim() !== '' || !!expandedBranches[branch._id];
                    return (
                      <div key={branch._id} className="border border-slate-100 rounded-card bg-slate-50/20 overflow-hidden transition-all">
                        {/* Branch Node */}
                        <div 
                          className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 cursor-pointer transition-all border-b border-slate-100"
                          onClick={() => toggleBranchExpand(branch._id)}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-slate-400">
                              {isBranchExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                            <div className="w-10 h-10 bg-navy/5 rounded-full flex items-center justify-center text-navy font-bold text-sm">
                              {branch.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-navy text-sm flex items-center gap-1.5 font-sans">
                                {branch.name}
                                <span className="px-1.5 py-0.5 rounded-full bg-navy/10 text-navy font-bold text-[9px] uppercase tracking-wider">
                                  Branch
                                </span>
                              </h4>
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                                {branch.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {branch.phone}
                                  </span>
                                )}
                                {branch.address && (
                                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                                    <MapPin className="h-3 w-3" /> {branch.address}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3" onClick={e => e.stopPropagation()}>
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {branch.batches?.length || 0} Batches
                            </span>
                            {role === 'admin' && (
                              <button
                                onClick={() => {
                                  setSelectedBranchIdForBatch(branch._id);
                                  setShowBatchModal(true);
                                }}
                                className="p-1 hover:bg-gold/10 text-gold hover:text-gold-dark rounded transition-all"
                                title="Add Batch to Branch"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Batches Sub-tree */}
                        {isBranchExpanded && (
                          <div className="p-4 space-y-3 bg-slate-50/40 border-t border-slate-100/50 pl-8 transition-all">
                            {branch.batches && branch.batches.length > 0 ? (
                              branch.batches.map((batch: any) => {
                                return (
                                  <div 
                                    key={batch._id} 
                                    className={`bg-white border rounded-card overflow-hidden transition-all hover:border-navy/30 ${selectedBatchId === batch._id ? 'border-navy ring-1 ring-navy' : 'border-slate-100'}`}
                                  >
                                    <div
                                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50/50 transition-all"
                                      onClick={() => setSelectedBatchId(batch._id)}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <BookOpen className="h-4 w-4 text-gold" />
                                        <div>
                                          <h5 className="font-semibold text-slate-800 text-xs font-sans">{batch.name}</h5>
                                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                            {batch.timing && (
                                              <span className="flex items-center gap-0.5">
                                                <Clock className="h-2.5 w-2.5" /> {batch.timing}
                                              </span>
                                            )}
                                            {batch.days && (
                                              <span className="flex items-center gap-0.5">
                                                <Calendar className="h-2.5 w-2.5" /> {batch.days}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-navy bg-navy/5 px-2 py-0.5 rounded-full">
                                          {batch.studentsCount || 0} Enrolled
                                        </span>
                                        <span className="text-[9px] text-gold font-bold hover:underline">
                                          View Info &rarr;
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-slate-400 italic py-2">No batches registered under this branch.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">No branches available in the system.</p>
              )}
            </div>

            {/* Right Feed Panel */}
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card space-y-4">
                <h3 className="text-base font-bold text-navy border-b border-slate-100 pb-3 font-sans">Financial Performance</h3>
                <div className="space-y-4">
                  {stats?.branchStats?.map((b: any) => (
                    <div key={b.branchId} className="border border-slate-100 rounded-card p-4 hover:shadow-sm transition-all bg-slate-50/30">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-xs text-navy font-sans">{b.name}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{b.studentsCount} Students</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Expected</span>
                          <span className="text-xs font-bold text-amber-600">{formatCurrency(b.expected || 0)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Collected</span>
                          <span className="text-xs font-bold text-brand-green">{formatCurrency(b.collected || 0)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Pending</span>
                          <span className="text-xs font-bold text-red-500">{formatCurrency(b.pending || 0)}</span>
                        </div>
                      </div>
                      {role === 'admin' && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center mt-2">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Expenses</span>
                            <span className="text-xs font-bold text-brand-red">{formatCurrency(b.expenses || 0)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Net Profit</span>
                            <span className={`text-xs font-bold ${b.net >= 0 ? 'text-navy' : 'text-brand-red'}`}>{formatCurrency(b.net || 0)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-navy font-sans">Recent Payments</h3>
                  <Link href="/fees" className="text-xs font-semibold text-gold hover:text-gold-dark transition-all">
                    Collect Fees
                  </Link>
                </div>

                <div className="divide-y divide-slate-100 overflow-hidden">
                  {stats?.recentFees?.length > 0 ? (
                    stats.recentFees.map((fee: any) => (
                      <div key={fee._id} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{fee.studentId?.name || 'Deleted Student'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            Month: {fee.feeMonth} · Std {fee.studentId?.standard || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-brand-green block">+{formatCurrency(fee.amount)}</span>
                          <span className="text-[9px] px-1.5 py-0.5 mt-0.5 inline-block font-bold rounded bg-green-50 text-brand-green border border-green-200 capitalize">
                            {fee.paymentType}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">No fee payments found for this period.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* SECOND IMAGE: BATCH INFO & DETAILS PANEL DRAWER */}
      {/* ========================================================================= */}
      {selectedBatchId && batchDetails && (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-slide-in">
          {/* Header */}
          <div className="bg-navy p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedBatchId(null)} 
                className="p-1.5 hover:bg-navy-light rounded-btn transition-all"
                title="Back"
              >
                <ChevronRight className="h-5 w-5 transform rotate-180" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white font-sans">{batchDetails.batch.name}</h3>
                  <button
                    onClick={() => {
                      setEditBatchId(batchDetails.batch.id);
                      setEditBatchName(batchDetails.batch.name);
                      setEditBatchTiming(batchDetails.batch.timing || '');
                      setEditBatchDays(batchDetails.batch.days || '');
                      setEditBatchError('');
                      setShowEditBatchModal(true);
                    }}
                    className="p-1 text-gold hover:text-white transition-all hover:bg-navy-light rounded"
                    title="Edit Batch"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBatch(batchDetails.batch.id, batchDetails.batch.name)}
                    className="p-1 text-rose-400 hover:text-rose-600 transition-all hover:bg-navy-light rounded"
                    title="Delete Batch"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {batchDetails.batch.timing || 'No set timing'} {batchDetails.batch.days ? `· ${batchDetails.batch.days}` : ''} · {batchDetails.batch.branchName}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedBatchId(null)} 
              className="p-1.5 hover:bg-navy-light rounded-btn transition-all text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Dark Navy Stats Box */}
            <div className="bg-slate-900 rounded-card p-5 text-white space-y-4 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-xl pointer-events-none"></div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">{batchDetails.batch.name} Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/40 p-3 rounded-btn border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Students</span>
                  <span className="text-2xl font-bold text-white block mt-0.5">{batchDetails.stats.studentsCount}</span>
                </div>
                <div className="bg-slate-800/40 p-3 rounded-btn border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Expected</span>
                  <span className="text-2xl font-bold text-amber-400 block mt-0.5">₹{batchDetails.stats.expected}</span>
                </div>
                <div className="bg-slate-800/40 p-3 rounded-btn border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Collected</span>
                  <span className="text-2xl font-bold text-emerald-400 block mt-0.5">₹{batchDetails.stats.collected}</span>
                </div>
                <div className="bg-slate-800/40 p-3 rounded-btn border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Pending</span>
                  <span className="text-2xl font-bold text-rose-400 block mt-0.5">₹{batchDetails.stats.pending}</span>
                </div>
              </div>
            </div>

            {/* Students List Header with Print */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-navy text-sm font-sans">Enrolled Students</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintDefaulters(batchDetails.batch, batchDetails.students)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-btn transition-all"
                >
                  <FileText className="h-3.5 w-3.5" /> 
                  Pending PDF ({batchDetails.students.filter((s: any) => !s.isPaid).length})
                </button>
                <button
                  onClick={() => {
                    setNewStudentJoinDate(formatToDDMMYYYY(new Date().toISOString().split('T')[0]));
                    setNewStudentStandard(batchDetails.batch.name.match(/^(\d+)/)?.[1] || '');
                    setShowAddStudentForm(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gold hover:bg-gold-light text-navy text-xs font-bold rounded-btn transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Student
                </button>
              </div>
            </div>

            {/* Add Student inline Form */}
            {showAddStudentForm && (
              <form onSubmit={handleAddStudent} className="bg-slate-50 border border-slate-200 p-4 rounded-card space-y-3 animate-slide-up">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                  <h5 className="font-bold text-xs text-navy uppercase font-sans">Quick Register Student</h5>
                  <button type="button" onClick={() => setShowAddStudentForm(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Student Name"
                      value={newStudentName}
                      onChange={e => setNewStudentName(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-navy"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Standard / Class *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10A1"
                      value={newStudentStandard}
                      onChange={e => setNewStudentStandard(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-navy"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Student Mobile</label>
                    <input
                      type="text"
                      placeholder="Mobile"
                      value={newStudentMobile}
                      onChange={e => setNewStudentMobile(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-navy"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Parent Mobile</label>
                    <input
                      type="text"
                      placeholder="Parent Mobile"
                      value={newStudentParentMobile}
                      onChange={e => setNewStudentParentMobile(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-navy"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Yearly Fees (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="10000"
                      value={newStudentFee}
                      onChange={e => setNewStudentFee(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-navy"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Date Joined (DD/MM/YYYY) *</label>
                    <DatePickerInput
                      required
                      value={newStudentJoinDate}
                      onChange={setNewStudentJoinDate}
                      theme="light"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddStudentForm(false)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded text-xs font-semibold hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingStudent}
                    className="px-3 py-1.5 bg-navy text-white rounded text-xs font-semibold hover:bg-navy-light"
                  >
                    {addingStudent ? 'Adding...' : 'Enroll Student'}
                  </button>
                </div>
              </form>
            )}

            {/* Students List Details */}
            {loadingBatchDetails ? (
              <div className="py-8 text-center text-slate-400">
                <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-navy inline-block"></span>
              </div>
            ) : batchDetails.students && batchDetails.students.length > 0 ? (
              <div className="space-y-3">
                {batchDetails.students.map((student: any) => (
                  <div 
                    key={student._id} 
                    onClick={() => setSelectedStudentId(student._id)}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-card border border-slate-200/50 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-navy/5 text-navy font-bold rounded-full flex items-center justify-center font-sans">
                        {student.name.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-slate-800 uppercase font-sans">{student.name}</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Yearly Fee: ₹{student.yearlyFees || (student.monthlyFee * 12)} · Paid: ₹{student.yearlyPaid} / ₹{student.yearlyExpected}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                      student.isPaid 
                        ? 'bg-green-50 border-green-200 text-brand-green' 
                        : 'bg-red-50 border-red-200 text-brand-red'
                    }`}>
                      {student.isPaid ? 'PAID' : `DUE: ₹${student.yearlyPending}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 italic">
                No active students found in this batch.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FIRST IMAGE: STUDENT DETAIL CALENDAR VIEW DRAWER */}
      {/* ========================================================================= */}
      {selectedStudentId && studentDetails && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-slide-in">
          {/* Header */}
          <div className="bg-navy p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedStudentId(null)} 
                className="p-1.5 hover:bg-navy-light rounded-btn transition-all"
                title="Back"
              >
                <ChevronRight className="h-5 w-5 transform rotate-180" />
              </button>
              <h3 className="font-bold text-base text-white font-sans">Student Profile</h3>
            </div>
            <button 
              onClick={() => setSelectedStudentId(null)} 
              className="p-1.5 hover:bg-navy-light rounded-btn transition-all text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Student Basic Card */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-navy text-white text-lg font-bold rounded-full flex items-center justify-center font-sans shadow-md border-2 border-white">
                  {studentDetails.name.substring(0, 1).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-800 uppercase flex items-center gap-2 font-sans">
                    {studentDetails.name}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      studentDetails.isActive ? 'bg-green-100 text-brand-green' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {studentDetails.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </h4>
                  <p className="text-xs font-semibold text-brand-green mt-1">Yearly Fee: ₹{studentDetails.yearlyFees || (studentDetails.monthlyFee * 12)}</p>
                </div>
              </div>

              {(role === 'admin' || role === 'operator') && (
                <button
                  onClick={handleToggleStatus}
                  className={`p-2 rounded-full border transition-all ${
                    studentDetails.isActive 
                      ? 'border-red-200 text-brand-red hover:bg-red-50' 
                      : 'border-green-200 text-brand-green hover:bg-green-50'
                  }`}
                  title={studentDetails.isActive ? 'Mark Inactive' : 'Mark Active'}
                >
                  {studentDetails.isActive ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                </button>
              )}
            </div>

            {/* Info Table */}
            <div className="bg-white border border-slate-100 rounded-card p-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="font-semibold text-slate-400">Branch Office</span>
                <span className="font-bold text-slate-800">{studentDetails.branchId?.name || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="font-semibold text-slate-400">Batch Code</span>
                <span className="font-bold text-slate-800">{studentDetails.batchId?.name || '-'} ({studentDetails.batchId?.timing || ''})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="font-semibold text-slate-400">Joined Date</span>
                <span className="font-bold text-slate-800">
                  {formatDate(studentDetails.joinDate)}
                </span>
              </div>
              {(studentDetails.mobile || studentDetails.parentMobile) && (
                <div className="flex justify-between py-1.5">
                  <span className="font-semibold text-slate-400">Contact Mobiles</span>
                  <span className="font-bold text-slate-800">
                    {studentDetails.mobile || '-'} {studentDetails.parentMobile ? `(P: ${studentDetails.parentMobile})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Yearly Fee Stats Summary */}
            <div className="space-y-4">
              <h4 className="font-bold text-navy text-sm font-sans">Fee Status Summary</h4>
              
              {loadingStudentDetails ? (
                <div className="py-8 text-center text-slate-400">
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-navy inline-block"></span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 font-sans mt-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-card p-3.5 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Yearly Fees</span>
                      <span className="text-sm font-black text-navy block mt-1">₹{studentDetails.yearlyFees || (studentDetails.monthlyFee * 12) || 0}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-card p-3.5 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Paid</span>
                      <span className="text-sm font-black text-brand-green block mt-1">
                        ₹{studentFeeStatus.reduce((sum, p) => sum + (p.amount || 0), 0)}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-card p-3.5 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Pending</span>
                      <span className={`text-sm font-black block mt-1 ${
                        (studentDetails.yearlyFees - studentFeeStatus.reduce((sum, p) => sum + (p.amount || 0), 0)) > 0
                          ? 'text-red-500 animate-pulse'
                          : 'text-brand-green'
                      }`}>
                        ₹{Math.max(0, (studentDetails.yearlyFees || (studentDetails.monthlyFee * 12) || 0) - studentFeeStatus.reduce((sum, p) => sum + (p.amount || 0), 0))}
                      </span>
                    </div>
                  </div>

                  {/* Payment History (LIFO) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-card p-4 space-y-3 font-sans">
                    <h5 className="font-bold text-xs text-slate-600 uppercase tracking-wider">Payment History</h5>
                    {studentFeeStatus.length > 0 ? (
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                        {studentFeeStatus.map((pay) => (
                          <div key={pay._id} className="flex justify-between items-center py-2 border-b border-slate-100 text-xs text-slate-600">
                            <div>
                              <p className="font-bold text-slate-800">₹{pay.amount}</p>
                              <p className="text-[10px] text-slate-400">{new Date(pay.transactionDate).toLocaleDateString('en-IN')}</p>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-0.5 rounded bg-slate-200 text-[9px] uppercase font-bold text-slate-600">{pay.paymentType}</span>
                              {pay.notes && <p className="text-[10px] text-slate-400 mt-0.5 italic max-w-[150px] truncate">{pay.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No payments recorded yet.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Collect Custom Fee Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-card p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h5 className="font-bold text-xs text-navy uppercase tracking-wider font-sans">Collect Fee Payment</h5>
              </div>

              <div className="space-y-3 text-xs font-sans">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-sans">₹</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 5000"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-200 text-slate-800 rounded focus:outline-none focus:border-navy transition-all font-sans"
                    />
                  </div>
                  <button
                    onClick={handleCustomCollectFee}
                    disabled={collectingCustomFee || !customAmount}
                    className="px-4 py-2 bg-navy hover:bg-slate-800 text-white font-bold rounded disabled:opacity-50 whitespace-nowrap transition-all shadow"
                  >
                    {collectingCustomFee ? 'Processing…' : 'Collect'}
                  </button>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {[1000, 2000, 5000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setCustomAmount(String(amt))}
                      className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold rounded hover:border-navy hover:text-navy transition-all font-sans"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {customCollectResult && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 space-y-1 text-slate-600 text-xs">
                    <p className="text-[10px] font-bold text-brand-green font-sans">✓ Payment recorded</p>
                    <p className="text-[10px] font-sans">
                      Payment of <span className="text-slate-800 font-semibold">₹{customCollectResult.paymentLog?.amount}</span> successfully recorded.
                    </p>
                  </div>
                )}
              </div>
            </div>


            {/* Student Transfer Panel */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-card space-y-4">
              <h4 className="font-bold text-navy text-xs uppercase tracking-wider font-sans flex items-center gap-1.5">
                <ArrowRightLeft className="h-4 w-4" /> Transfer Branch or Batch
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Target Branch</label>
                  <select
                    value={transferBranchId}
                    onChange={e => {
                      setTransferBranchId(e.target.value);
                      // Clear batch when branch changes
                      setTransferBatchId('');
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none"
                  >
                    <option value="">Select Branch</option>
                    {hierarchy.map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Target Batch</label>
                  <select
                    value={transferBatchId}
                    onChange={e => setTransferBatchId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none"
                  >
                    <option value="">Select Batch</option>
                    {hierarchy
                      .find(b => b._id === transferBranchId)
                      ?.batches?.map((bat: any) => (
                        <option key={bat._id} value={bat._id}>{bat.name} ({bat.timing || 'N/A'})</option>
                      ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleTransferStudent}
                    disabled={transferring || !transferBranchId || !transferBatchId}
                    className="px-4 py-2 bg-navy text-white text-xs font-bold rounded hover:bg-navy-light disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer Student
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE BRANCH MODAL (ADMIN ONLY) */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-card shadow-premium border border-slate-100 w-full max-w-md overflow-hidden animate-slide-up">
            <div className="bg-navy p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm text-gold flex items-center gap-2 font-sans">
                <Plus className="h-4 w-4" /> Create New Branch Office
              </h3>
              <button onClick={() => setShowBranchModal(false)} className="p-1 hover:bg-navy-light rounded text-white transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
              {branchError && (
                <div className="p-3 bg-red-50 border border-red-200 text-brand-red rounded-btn text-xs font-semibold">
                  {branchError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Nagar"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Office Address</label>
                <input
                  type="text"
                  placeholder="e.g. L.I.G - 472, Anandnagar"
                  value={branchAddress}
                  onChange={e => setBranchAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 8469966983"
                  value={branchPhone}
                  onChange={e => setBranchPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all font-sans"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-btn text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBranch}
                  className="px-4 py-2 bg-navy text-white rounded-btn text-xs font-bold hover:bg-navy-light transition-all flex items-center justify-center gap-1.5"
                >
                  {creatingBranch ? (
                    <>
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
                      Registering...
                    </>
                  ) : 'Register Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BATCH MODAL (ADMIN ONLY) */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-card shadow-premium border border-slate-100 w-full max-w-md overflow-hidden animate-slide-up">
            <div className="bg-navy p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm text-gold flex items-center gap-2 font-sans">
                <Plus className="h-4 w-4" /> Create New Batch
              </h3>
              <button onClick={() => setShowBatchModal(false)} className="p-1 hover:bg-navy-light rounded text-white transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-6 space-y-4">
              {batchError && (
                <div className="p-3 bg-red-50 border border-red-200 text-brand-red rounded-btn text-xs font-semibold">
                  {batchError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Batch Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Std 10 Morning"
                  value={batchName}
                  onChange={e => setBatchName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Timings (e.g., 7:00 AM - 9:00 AM)</label>
                <input
                  type="text"
                  placeholder="e.g. 7:00 AM - 9:00 AM"
                  value={batchTiming}
                  onChange={e => setBatchTiming(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Lecture Days (e.g., Mon, Wed, Fri)</label>
                <input
                  type="text"
                  placeholder="e.g. Mon, Wed, Fri"
                  value={batchDays}
                  onChange={e => setBatchDays(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all font-sans"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-btn text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBatch}
                  className="px-4 py-2 bg-navy text-white rounded-btn text-xs font-bold hover:bg-navy-light transition-all flex items-center justify-center gap-1.5"
                >
                  {creatingBatch ? (
                    <>
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
                      Registering...
                    </>
                  ) : 'Register Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BATCH MODAL (ADMIN ONLY) */}
      {showEditBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-card shadow-premium border border-slate-100 w-full max-w-md overflow-hidden animate-slide-up">
            <div className="bg-navy p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm text-gold flex items-center gap-2 font-sans">
                <Edit className="h-4 w-4" /> Edit Batch
              </h3>
              <button onClick={() => setShowEditBatchModal(false)} className="p-1 hover:bg-navy-light rounded text-white transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditBatchSubmit} className="p-6 space-y-4">
              {editBatchError && (
                <div className="p-3 bg-red-50 border border-red-200 text-brand-red rounded-btn text-xs font-semibold">
                  {editBatchError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Batch Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Std 10 Morning"
                  value={editBatchName}
                  onChange={e => setEditBatchName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Timings (e.g., 7:00 AM - 9:00 AM)</label>
                <input
                  type="text"
                  placeholder="e.g. 7:00 AM - 9:00 AM"
                  value={editBatchTiming}
                  onChange={e => setEditBatchTiming(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Lecture Days (e.g., Mon, Wed, Fri)</label>
                <input
                  type="text"
                  placeholder="e.g. Mon, Wed, Fri"
                  value={editBatchDays}
                  onChange={e => setEditBatchDays(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all font-sans"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditBatchModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-btn text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBatch}
                  className="px-4 py-2 bg-navy text-white rounded-btn text-xs font-bold hover:bg-navy-light transition-all flex items-center justify-center gap-1.5"
                >
                  {savingBatch ? (
                    <>
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></span>
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
