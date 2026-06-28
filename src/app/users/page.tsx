'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  UserPlus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Mail,
  User
} from 'lucide-react';
import { formatDate } from '@/lib/utils/dates';

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formBranch, setFormBranch] = useState('none');
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    if (!session || session.user.role !== 'admin') return;

    fetch('/api/branches')
      .then(res => res.json())
      .then(data => setBranches(data))
      .catch(err => console.error(err));

    fetchUsers();
  }, [session]);

  const fetchUsers = () => {
    setLoading(true);
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
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

  const handleEditClick = (u: any) => {
    setEditingUserId(u._id);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword('');
    setFormBranch(u.branchId?._id || 'none');
    setFormIsActive(u.isActive);
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormBranch('none');
    setFormIsActive(true);
    setMessage(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || (!editingUserId && !formPassword)) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const payload: any = {
      name: formName,
      email: formEmail,
      branchId: formBranch === 'none' ? null : formBranch,
      isActive: formIsActive
    };

    if (formPassword) {
      payload.password = formPassword;
    }

    try {
      let res;
      if (editingUserId) {
        res = await fetch(`/api/users/${editingUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save operator profile');
      }

      setMessage({
        type: 'success',
        text: editingUserId ? 'Operator profile updated!' : 'New Operator user created!'
      });

      handleCancelEdit();
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (user.email === 'admin@eklavya.in') return;
    if (!window.confirm(`Are you sure you want to permanently delete operator "${user.name}" (${user.email})? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete operator');
      }
      // If the deleted operator was being edited, reset the form.
      if (editingUserId === user._id) {
        handleCancelEdit();
      }
      setMessage({ type: 'success', text: `Operator "${user.name}" deleted successfully.` });
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const toggleUserStatus = async (user: any) => {
    if (user.email === 'admin@eklavya.in') return;
    const newStatus = !user.isActive;

    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle status');
      }
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-navy">Fee Operator Management</h2>
        <p className="text-sm text-slate-500">Manage operator profiles, credentials, and their assigned branches.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Add / Edit form */}
        <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card space-y-4 lg:col-span-1">
          <h3 className="text-base font-bold text-navy flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserPlus className="h-5 w-5 text-gold" /> {editingUserId ? 'Edit Operator Profile' : 'Register New Operator'}
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
            {/* Operator Name */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Operator Full Name *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raj Patel"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Email Address *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@eklavya.in"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                {editingUserId ? 'Update Password (leave blank to keep current)' : 'Password *'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required={!editingUserId}
                  placeholder={editingUserId ? '••••••••' : 'Enter password'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Branch Assignment */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Assigned Branch Association</label>
              <select
                value={formBranch}
                onChange={(e) => setFormBranch(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-btn focus:outline-none focus:border-navy focus:bg-white transition-all"
              >
                <option value="none">None (Overall Management)</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Active Switch */}
            {editingUserId && formEmail !== 'admin@eklavya.in' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Operator Status</label>
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
                    Deactivated / Blocked
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {editingUserId && (
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
                {editingUserId ? 'Update Profile' : 'Create Operator'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Operators List */}
        <div className="bg-white p-6 rounded-card border border-slate-100 shadow-card space-y-4 lg:col-span-2">
          <h3 className="text-base font-bold text-navy border-b border-slate-100 pb-3">Operator Accounts</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[9px]">
                <tr>
                  <th className="px-4 py-3">Operator Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Assigned Branch</th>
                  <th className="px-4 py-3">Registered On</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [1, 2].map(n => (
                    <tr key={n} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-3.5 w-24 bg-slate-100 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-32 bg-slate-100 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-12 bg-slate-100 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-100 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-16 bg-slate-100 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-4.5 w-10 bg-slate-100 rounded"></div></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-12 bg-slate-100 rounded mx-auto"></div></td>
                    </tr>
                  ))
                ) : users.length > 0 ? (
                  users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-4 py-3 font-semibold text-slate-800">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          u.role === 'admin' 
                            ? 'bg-gold/10 text-gold-dark border border-gold/20' 
                            : 'bg-blue-50 text-brand-blue border border-blue-100'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-medium">
                        {u.branchId?.name || <span className="text-slate-400 italic">Global / All</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        {u.email === 'admin@eklavya.in' ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-brand-green bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full w-fit">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => toggleUserStatus(u)}
                            className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border transition-all ${
                              u.isActive 
                                ? 'text-brand-green bg-green-50 border-green-200 hover:bg-green-100' 
                                : 'text-brand-red bg-red-50 border-red-200 hover:bg-red-100'
                            }`}
                            title="Toggle Status"
                          >
                            {u.isActive ? (
                              <><CheckCircle className="h-3 w-3" /> Active</>
                            ) : (
                              <><XCircle className="h-3 w-3" /> Blocked</>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-3">
                          {u.email !== 'admin@eklavya.in' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditClick(u)}
                                className="p-1 text-slate-400 hover:text-navy hover:bg-slate-100 rounded transition-all"
                                title="Edit Operator Settings"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded transition-all"
                                title="Delete Operator"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-300" title="System administrator is protected">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 font-medium font-sans">
                      No operator logs registered.
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
