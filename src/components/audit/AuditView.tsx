import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  KeyRound,
  FileCheck2,
  Users,
  Settings,
  CalendarCheck,
  FileSpreadsheet,
  AlertCircle,
  Activity,
  Layers,
} from 'lucide-react';
import { api, formatDate } from '../../lib/api.ts';
import { AuditLog } from '../../types/crm.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

const ENTITY_OPTIONS = ['ALL', 'AUTH', 'USER', 'PERMISSION', 'LEAD', 'VISIT', 'ENQUIRY', 'QUOTATION', 'SETTINGS'];

export const AuditView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (entityFilter !== 'ALL' && l.entityType !== entityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchUser = (l.userName || '').toLowerCase().includes(q);
      const matchAction = l.action.toLowerCase().includes(q);
      const matchDetails = (l.details || '').toLowerCase().includes(q);
      const matchEntity = l.entityType.toLowerCase().includes(q);
      if (!matchUser && !matchAction && !matchDetails && !matchEntity) return false;
    }
    return true;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('WON') || action.includes('APPROVE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('DELETE') || action.includes('LOST') || action.includes('DEACTIVATE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (action.includes('PERMISSION') || action.includes('UPDATE')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'AUTH':
        return <KeyRound className="w-3.5 h-3.5 text-purple-600" />;
      case 'USER':
        return <Users className="w-3.5 h-3.5 text-blue-600" />;
      case 'LEAD':
        return <Activity className="w-3.5 h-3.5 text-emerald-600" />;
      case 'VISIT':
        return <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />;
      case 'ENQUIRY':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />;
      case 'QUOTATION':
        return <FileCheck2 className="w-3.5 h-3.5 text-amber-600" />;
      case 'SETTINGS':
      case 'PERMISSION':
        return <Shield className="w-3.5 h-3.5 text-slate-700" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Enterprise Audit Trail & Security Logs
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              {logs.length} Immutable Events
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cryptographically tracked audit trail of all staff logins, role assignments, quotation approvals, and database modifications.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          title="Refresh logs"
          className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 shadow-xs flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Trail
        </button>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Security Events Recorded</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{logs.length}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">100% Traceability</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Logins & Auth Sessions</span>
          <div className="mt-1 text-2xl font-bold text-purple-600">
            {logs.filter((l) => l.entityType === 'AUTH').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Role switch & logins</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Quotation & Bid Approvals</span>
          <div className="mt-1 text-2xl font-bold text-amber-600">
            {logs.filter((l) => l.action.includes('APPROVE') || l.entityType === 'QUOTATION').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Manager sign-offs</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">RBAC Role & User Alterations</span>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {logs.filter((l) => l.entityType === 'USER' || l.entityType === 'PERMISSION').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Access control audits</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by user, action, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <span className="text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Entity:
          </span>
          {ENTITY_OPTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setEntityFilter(e)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                entityFilter === e
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Details & Change Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 font-sans">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Querying PostgreSQL audit tables...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 font-sans">
                    No audit records match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-sans">
                      {formatDate(l.createdAt)}{' '}
                      <span className="text-slate-400 font-mono text-[10px]">
                        {l.createdAt ? new Date(l.createdAt).toLocaleTimeString() : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{l.userName || 'System'}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                        {l.userRole || 'admin'}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeColor(
                          l.action
                        )}`}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-sans">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {getEntityIcon(l.entityType)}
                        <span>{l.entityType}</span>
                        {l.entityId && <span className="text-slate-400 font-mono text-[10px]">#{l.entityId}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-700">
                      <span className="text-slate-800 font-medium">{l.details || '—'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
