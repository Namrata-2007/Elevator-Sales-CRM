import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Users,
  ShieldCheck,
  Plus,
  Edit,
  Save,
  CheckCircle2,
  Lock,
  RefreshCw,
  Database,
  Mail,
  Phone,
  MapPin,
  FileText,
  X,
  Check,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { User, CompanySettings, UserRole, RolePermission } from '../../types/crm.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

const ALL_ROLES: { id: UserRole; name: string; dept: string }[] = [
  { id: 'admin', name: 'Super Admin / Owner', dept: 'Management' },
  { id: 'manager', name: 'Sales Manager', dept: 'Sales Management' },
  { id: 'executive', name: 'Sales Executive (Field)', dept: 'Field Sales' },
  { id: 'telecaller', name: 'Telecalling / Lead Gen', dept: 'Inside Sales' },
  { id: 'engineer', name: 'Technical / Design Eng', dept: 'Engineering' },
  { id: 'commercial', name: 'Commercial & Bids', dept: 'Commercial' },
  { id: 'director', name: 'Managing Director', dept: 'Executive Board' },
  { id: 'customer', name: 'Builder / Client Portal', dept: 'Client' },
];

const PERMISSION_DEFINITIONS = [
  { module: 'Leads Management', perm: 'leads.view_all', label: 'View All Leads (Cross-team)' },
  { module: 'Leads Management', perm: 'leads.create', label: 'Create New Leads' },
  { module: 'Leads Management', perm: 'leads.update', label: 'Update Assigned Leads' },
  { module: 'Leads Management', perm: 'leads.delete', label: 'Delete Leads' },
  { module: 'Leads Management', perm: 'leads.assign', label: 'Assign / Reassign Leads' },
  { module: 'Site Visits', perm: 'visits.view_all', label: 'View All Site Visits' },
  { module: 'Site Visits', perm: 'visits.create', label: 'Schedule Site Visit' },
  { module: 'Site Visits', perm: 'visits.update', label: 'Submit Hoistway Survey' },
  { module: 'Site Visits', perm: 'visits.delete', label: 'Cancel / Delete Visits' },
  { module: 'Technical Enquiries', perm: 'enquiries.view_all', label: 'View All Technical Enquiries' },
  { module: 'Technical Enquiries', perm: 'enquiries.create', label: 'Create Lift Enquiry' },
  { module: 'Technical Enquiries', perm: 'enquiries.update_technical', label: 'Edit Technical Specs & Shaft' },
  { module: 'Technical Enquiries', perm: 'enquiries.review', label: 'Engineering Sign-off' },
  { module: 'Quotations & Bids', perm: 'quotations.view_all', label: 'View All Quotation Bids' },
  { module: 'Quotations & Bids', perm: 'quotations.create', label: 'Prepare Quotation' },
  { module: 'Quotations & Bids', perm: 'quotations.revise', label: 'Create Price Revision' },
  { module: 'Quotations & Bids', perm: 'quotations.approve', label: 'Authorize & Approve Quotation' },
  { module: 'Quotations & Bids', perm: 'quotations.delete', label: 'Delete Quotation' },
  { module: 'Telecalling Calls', perm: 'calls.view', label: 'View Call Logs & History' },
  { module: 'Telecalling Calls', perm: 'calls.create', label: 'Log Customer Calls' },
  { module: 'Reports & Analytics', perm: 'reports.view_company', label: 'Company Revenue Dashboard' },
  { module: 'Reports & Analytics', perm: 'reports.view_team', label: 'Team Sales Performance' },
  { module: 'Reports & Analytics', perm: 'reports.export', label: 'Export Data to CSV' },
  { module: 'System & Administration', perm: 'users.manage', label: 'Manage Users & Roles' },
  { module: 'System & Administration', perm: 'settings.manage', label: 'Manage Company & RBAC Matrix' },
  { module: 'System & Administration', perm: 'audit.view', label: 'View Immutable Audit Trail' },
];

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'rbac'>('profile');

  const [company, setCompany] = useState<CompanySettings>({
    companyName: 'Apex Elevators & Escalators Ltd.',
    tagline: 'Elevating Safety, Engineering & Performance',
    address: 'Plot 42, Metro Industrial Estate, Phase II, Bengaluru',
    contactEmail: 'sales@apexelevators.com',
    contactPhone: '+91 98201 55678',
    taxId: 'GSTIN: 29AABCA1234F1Z9',
    currency: 'INR',
    customerPortalEnabled: true,
  });

  const [usersList, setUsersList] = useState<User[]>([]);
  const [matrix, setMatrix] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);

  // New User Form Modal (Admin only)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'executive' as UserRole,
    phone: '',
    department: 'Sales',
    region: 'Bengaluru HQ',
    reportingManagerId: '',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [compRes, usersRes, matrixRes] = await Promise.all([
        api.getSettings(),
        api.getUsers(),
        user?.role === 'admin' ? api.getPermissionMatrix() : Promise.resolve([]),
      ]);
      if (compRes) setCompany(compRes);
      if (usersRes) setUsersList(usersRes);
      if (matrixRes) setMatrix(matrixRes);
    } catch (err: any) {
      showToast(err.message || 'Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [user?.role]);

  const handleCompanySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      showToast('Only Admin can update company details', 'error');
      return;
    }
    setSavingCompany(true);
    try {
      await api.updateSettings(company);
      showToast('Company profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update company', 'error');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        ...newUserData,
        reportingManagerId: newUserData.reportingManagerId ? parseInt(newUserData.reportingManagerId, 10) : null,
      });
      showToast(`User account created for ${newUserData.name}!`, 'success');
      setIsAddUserOpen(false);
      setNewUserData({
        name: '',
        email: '',
        role: 'executive',
        phone: '',
        department: 'Sales',
        region: 'Bengaluru HQ',
        reportingManagerId: '',
      });
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    }
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    if (user?.role !== 'admin') {
      showToast('Only Admin can alter user status', 'error');
      return;
    }
    try {
      await api.updateUser(targetUser.id, { isActive: !targetUser.isActive });
      showToast(`User ${targetUser.name} status updated to ${!targetUser.isActive ? 'Active' : 'Deactivated'}`, 'success');
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    }
  };

  const handleChangeRole = async (targetUser: User, newRole: UserRole) => {
    if (user?.role !== 'admin') {
      showToast('Only Admin can change roles', 'error');
      return;
    }
    try {
      await api.updateUser(targetUser.id, { role: newRole });
      showToast(`Role updated for ${targetUser.name} to ${newRole}`, 'success');
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    }
  };

  const handleChangeReportingManager = async (targetUser: User, mgrIdStr: string) => {
    if (user?.role !== 'admin') {
      showToast('Only Admin can assign managers', 'error');
      return;
    }
    try {
      await api.updateUser(targetUser.id, {
        reportingManagerId: mgrIdStr ? parseInt(mgrIdStr, 10) : null,
      });
      showToast(`Reporting manager updated for ${targetUser.name}`, 'success');
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    }
  };

  const isGranted = (role: string, perm: string): boolean => {
    if (role === 'admin') return true;
    const item = matrix.find((m) => m.role === role && m.permission === perm);
    return item ? item.granted : false;
  };

  const handleTogglePermission = async (role: string, perm: string) => {
    if (user?.role !== 'admin') {
      showToast('Only Admin can edit the permission matrix', 'error');
      return;
    }
    if (role === 'admin') {
      showToast('Administrator permissions cannot be revoked', 'error');
      return;
    }

    const currentVal = isGranted(role, perm);
    const nextVal = !currentVal;

    // Optimistic update
    setMatrix((prev) => {
      const idx = prev.findIndex((m) => m.role === role && m.permission === perm);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], granted: nextVal };
        return copy;
      }
      return [...prev, { id: Date.now(), role: role as UserRole, permission: perm, granted: nextVal }];
    });

    try {
      await api.updatePermissionMatrix(role, perm, nextVal);
      showToast(`Permission '${perm}' for ${role} set to ${nextVal ? 'GRANTED' : 'REVOKED'}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update permission matrix', 'error');
      loadAll();
    }
  };

  const potentialManagers = usersList.filter(
    (u) => u.role === 'admin' || u.role === 'manager' || u.role === 'director'
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Settings & RBAC Administration
            </h1>
            <StatusBadge status={user?.role || 'executive'} />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure company branding, manage staff roles and reporting lines, and enforce granular RBAC matrix policies.
          </p>
        </div>
        <button
          onClick={loadAll}
          className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Company Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts & Team ({usersList.length})</span>
        </button>

        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('rbac')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
              activeTab === 'rbac'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Interactive RBAC Matrix</span>
          </button>
        )}
      </div>

      {/* TAB 1: COMPANY PROFILE */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Elevator Enterprise Profile</h2>
                  <p className="text-xs text-slate-500">Appears on technical proposals, quotes, and reports</p>
                </div>
              </div>
              {user?.role !== 'admin' && (
                <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                  Admin Edit Only
                </span>
              )}
            </div>

            <form onSubmit={handleCompanySave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    disabled={user?.role !== 'admin'}
                    value={company.companyName}
                    onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    disabled={user?.role !== 'admin'}
                    value={company.tagline || ''}
                    onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    disabled={user?.role !== 'admin'}
                    value={company.contactEmail || ''}
                    onChange={(e) => setCompany({ ...company, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    disabled={user?.role !== 'admin'}
                    value={company.contactPhone || ''}
                    onChange={(e) => setCompany({ ...company, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    disabled={user?.role !== 'admin'}
                    value={company.taxId || ''}
                    onChange={(e) => setCompany({ ...company, taxId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Currency</label>
                  <input
                    type="text"
                    disabled={user?.role !== 'admin'}
                    value={company.currency}
                    onChange={(e) => setCompany({ ...company, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Headquarters & Factory Address</label>
                <input
                  type="text"
                  disabled={user?.role !== 'admin'}
                  value={company.address || ''}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl disabled:bg-slate-100"
                />
              </div>

              {user?.role === 'admin' && (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingCompany}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {savingCompany ? 'Saving...' : 'Save Company Profile'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Database Diagnostics */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Database className="w-5 h-5 text-emerald-600" />
              <span>PostgreSQL Relational Storage & Schema Health</span>
            </div>
            <p className="text-slate-500 text-xs">
              Operating on Google Cloud SQL (PostgreSQL) with Drizzle ORM, connection pool, and foreign key cascades.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Relational Tables</span>
                <span className="text-slate-900 font-bold">8 Normalized Tables</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Data Isolation</span>
                <span className="text-slate-900 font-bold">Multi-role RBAC</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Sequence Engine</span>
                <span className="text-slate-900 font-bold">Unique Formatted IDs</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-medium">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Data Integrity</span>
                <span className="text-emerald-700 font-bold">Foreign Keys & Cascades</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">User Management & Reporting Structure</h2>
                  <p className="text-xs text-slate-500">
                    Assign sales executives to managers, configure regions, and manage accounts.
                  </p>
                </div>
              </div>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setIsAddUserOpen(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" /> Add User Account
                </button>
              )}
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Name & Email</th>
                    <th className="py-3 px-4">Role Position</th>
                    <th className="py-3 px-4">Reporting Manager</th>
                    <th className="py-3 px-4">Department / Region</th>
                    <th className="py-3 px-4">Account Status</th>
                    {user?.role === 'admin' && <th className="py-3 px-4 text-right">Admin Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((u) => {
                    const manager = usersList.find((m) => m.id === u.reportingManagerId);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{u.name}</div>
                          <div className="text-slate-500 text-[11px] font-mono">{u.email}</div>
                          {u.phone && <div className="text-slate-400 text-[10px]">{u.phone}</div>}
                        </td>
                        <td className="py-3 px-4">
                          {user?.role === 'admin' ? (
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                              className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium"
                            >
                              {ALL_ROLES.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <StatusBadge status={u.role} size="sm" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {user?.role === 'admin' && u.role !== 'admin' && u.role !== 'director' ? (
                            <select
                              value={u.reportingManagerId ? String(u.reportingManagerId) : ''}
                              onChange={(e) => handleChangeReportingManager(u, e.target.value)}
                              className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs max-w-[160px] truncate"
                            >
                              <option value="">-- No Manager --</option>
                              {potentialManagers
                                .filter((m) => m.id !== u.id)
                                .map((m) => (
                                  <option key={m.id} value={String(m.id)}>
                                    {m.name} ({m.role})
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className="text-slate-600">
                              {manager ? `${manager.name} (${manager.role})` : '—'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-700 font-medium">{u.department || 'Sales'}</div>
                          <div className="text-slate-400 text-[11px]">{u.region || 'Bengaluru HQ'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        {user?.role === 'admin' && (
                          <td className="py-3 px-4 text-right">
                            {u.id !== user.id && (
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                                  u.isActive
                                    ? 'text-rose-600 hover:bg-rose-50'
                                    : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INTERACTIVE RBAC MATRIX (ADMIN ONLY) */}
      {activeTab === 'rbac' && user?.role === 'admin' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Interactive Role-Based Permission Matrix</h2>
                  <p className="text-xs text-slate-500">
                    Click checkboxes to grant or revoke specific operational permissions per job position in real-time.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
                Live Cloud SQL Persistence
              </span>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="py-3 px-3 min-w-[200px]">Permission Capability</th>
                    <th className="py-3 px-2 text-center">Super Admin</th>
                    <th className="py-3 px-2 text-center">Sales Manager</th>
                    <th className="py-3 px-2 text-center">Sales Executive</th>
                    <th className="py-3 px-2 text-center">Telecaller</th>
                    <th className="py-3 px-2 text-center">Tech Engineer</th>
                    <th className="py-3 px-2 text-center">Commercial</th>
                    <th className="py-3 px-2 text-center">Director</th>
                    <th className="py-3 px-2 text-center">Customer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERMISSION_DEFINITIONS.map((def, idx) => {
                    const isNewModule =
                      idx === 0 || PERMISSION_DEFINITIONS[idx - 1].module !== def.module;
                    return (
                      <React.Fragment key={def.perm}>
                        {isNewModule && (
                          <tr className="bg-slate-100/70">
                            <td
                              colSpan={9}
                              className="py-1.5 px-3 font-bold text-slate-700 uppercase tracking-wider text-[10px]"
                            >
                              {def.module}
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-3">
                            <div className="font-medium text-slate-900">{def.label}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{def.perm}</div>
                          </td>

                          {/* Admin: Locked to True */}
                          <td className="py-2 px-2 text-center">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800" title="Admin always granted">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          </td>

                          {/* Manager */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={isGranted('manager', def.perm)}
                              onChange={() => handleTogglePermission('manager', def.perm)}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            />
                          </td>

                          {/* Executive */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={isGranted('executive', def.perm)}
                              onChange={() => handleTogglePermission('executive', def.perm)}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            />
                          </td>

                          {/* Telecaller */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={isGranted('telecaller', def.perm)}
                              onChange={() => handleTogglePermission('telecaller', def.perm)}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            />
                          </td>

                          {/* Engineer */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={isGranted('engineer', def.perm)}
                              onChange={() => handleTogglePermission('engineer', def.perm)}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            />
                          </td>

                          {/* Commercial */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={isGranted('commercial', def.perm)}
                              onChange={() => handleTogglePermission('commercial', def.perm)}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            />
                          </td>

                          {/* Director */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={isGranted('director', def.perm)}
                              onChange={() => handleTogglePermission('director', def.perm)}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            />
                          </td>

                          {/* Customer */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={isGranted('customer', def.perm)}
                              onChange={() => handleTogglePermission('customer', def.perm)}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            />
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Add Staff Account</h2>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                    placeholder="e.g. Anand Kulkarni"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="e.g. anand@apexelevators.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Position</label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reporting Line Manager</label>
                  <select
                    value={newUserData.reportingManagerId}
                    onChange={(e) => setNewUserData({ ...newUserData, reportingManagerId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">-- No Direct Manager --</option>
                    {potentialManagers.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    placeholder="e.g. +91 98333 11223"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={newUserData.department}
                    onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                    placeholder="e.g. Field Sales / Engineering"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Region / Office Branch</label>
                <input
                  type="text"
                  value={newUserData.region}
                  onChange={(e) => setNewUserData({ ...newUserData, region: e.target.value })}
                  placeholder="e.g. Bengaluru HQ, Mumbai Branch, Delhi NCR"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
