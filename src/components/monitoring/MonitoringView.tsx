import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Clock,
  Activity,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ban,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  LogOut,
  X,
  FileSpreadsheet,
  FileCheck2,
  PhoneCall,
  Settings,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { api, formatDate, formatDateTime, formatDuration } from '../../lib/api.ts';
import { UserSession, UserActivityLog, MonitoringSummary, SecurityEvent } from '../../types/crm.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

export const MonitoringView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'sessions' | 'activities' | 'security'>('sessions');

  const [summary, setSummary] = useState<MonitoringSummary>({
    totalRegisteredUsers: 0,
    activeSessions: 0,
    usersLoggedInToday: 0,
    loginEventsToday: 0,
    avgSessionDurationMinutes: 0,
    totalActiveUsageMinutesToday: 0,
    failedLoginAttempts: 0,
    suspiciousAccessAttempts: 0,
  });

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [activities, setActivities] = useState<UserActivityLog[]>([]);
  const [securityEventsList, setSecurityEventsList] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Sessions
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Selected User for Timeline Modal (Section 7)
  const [selectedUserTimeline, setSelectedUserTimeline] = useState<{
    userId: number;
    userName: string;
    email: string;
    role: string;
  } | null>(null);
  const [timelineLogs, setTimelineLogs] = useState<UserActivityLog[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineModuleFilter, setTimelineModuleFilter] = useState('all');

  const loadAllMonitoringData = async () => {
    setLoading(true);
    try {
      const [sumRes, sessRes, actRes, secRes] = await Promise.all([
        api.getMonitoringSummary(),
        api.getMonitoringSessions({
          search,
          role: roleFilter,
          status: statusFilter,
          date: dateFilter,
        }),
        api.getMonitoringActivities(),
        api.getSecurityEvents(),
      ]);
      setSummary(sumRes);
      setSessions(sessRes || []);
      setActivities(actRes || []);
      setSecurityEventsList(secRes || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load monitoring data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMonitoringData();
  }, [roleFilter, statusFilter, dateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAllMonitoringData();
  };

  const handleRevokeSession = async (sessId: number, targetName: string) => {
    if (!confirm(`Are you sure you want to revoke the active session for ${targetName}?`)) {
      return;
    }
    try {
      await api.revokeSession(sessId);
      showToast(`Active session for ${targetName} was revoked successfully`, 'success');
      loadAllMonitoringData();
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke session', 'error');
    }
  };

  const openUserTimeline = async (u: { userId: number; userName: string; email: string; role: string }) => {
    setSelectedUserTimeline(u);
    setTimelineLoading(true);
    try {
      const data = await api.getMonitoringActivities({ userId: String(u.userId) });
      setTimelineLogs(data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load user timeline', 'error');
    } finally {
      setTimelineLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'Logged Out':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Logged Out
          </span>
        );
      case 'Expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Expired
          </span>
        );
      case 'Revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Revoked
          </span>
        );
      default:
        return <span className="text-slate-500 text-xs">{status}</span>;
    }
  };

  const filteredTimeline = timelineLogs.filter((l) => {
    if (timelineModuleFilter !== 'all' && l.moduleName !== timelineModuleFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              User Activity & Session Monitoring
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Live Auditing
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor real-time employee sessions, active interaction time vs idle duration, and page navigation history.
          </p>
        </div>

        <button
          onClick={loadAllMonitoringData}
          title="Refresh metrics"
          className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 shadow-xs flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
        </button>
      </div>

      {/* Summary KPI Cards (Section 6) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-medium">Registered Staff</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{summary.totalRegisteredUsers}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Company accounts</div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-xs">
          <span className="text-emerald-800 font-semibold">Active Sessions Now</span>
          <div className="mt-1 text-2xl font-bold text-emerald-950 flex items-center gap-2">
            <span>{summary.activeSessions}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Users currently connected</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-medium">Logged In Today</span>
          <div className="mt-1 text-2xl font-bold text-blue-600">{summary.usersLoggedInToday}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{summary.loginEventsToday} login events</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-medium">Avg Session Duration</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{summary.avgSessionDurationMinutes}m</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total active & idle combined</div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl shadow-xs">
          <span className="text-indigo-900 font-semibold">Active Usage Today</span>
          <div className="mt-1 text-2xl font-bold text-indigo-950">{summary.totalActiveUsageMinutesToday}m</div>
          <div className="text-[11px] text-indigo-700 mt-0.5">Estimated interaction time</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-medium">Failed Logins Today</span>
          <div className="mt-1 text-2xl font-bold text-rose-600">{summary.failedLoginAttempts}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Password mismatches</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs">
          <span className="text-amber-900 font-semibold">Security Denials</span>
          <div className="mt-1 text-2xl font-bold text-amber-950">{summary.suspiciousAccessAttempts}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Access denied or locked</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-medium">Recorded Activities</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{activities.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Database audit events</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
            activeTab === 'sessions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>User Sessions ({sessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activities')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
            activeTab === 'activities'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Page & Business Activities ({activities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
            activeTab === 'security'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Security & Failed Logins ({securityEventsList.length})</span>
        </button>
      </div>

      {/* TAB 1: SESSIONS TABLE */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, email, session ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1 text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Role:</span>
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-white text-xs"
              >
                <option value="all">All Roles</option>
                <option value="admin">Super Admin</option>
                <option value="manager">Sales Manager</option>
                <option value="executive">Sales Executive</option>
                <option value="telecaller">Telecaller</option>
                <option value="engineer">Technical Engineer</option>
                <option value="commercial">Commercial Bids</option>
                <option value="director">Director</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-white text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Logged Out">Logged Out</option>
                <option value="Expired">Expired</option>
                <option value="Revoked">Revoked</option>
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-white text-xs"
              />
            </div>
          </form>

          {/* Sessions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Login Time</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-4">Logout Time</th>
                    <th className="py-3 px-4">Session Duration</th>
                    <th className="py-3 px-4">Active Usage</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Pages Visited</th>
                    <th className="py-3 px-4">Last Module</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="text-center py-10 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading session records...
                      </td>
                    </tr>
                  ) : sessions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-10 text-slate-400">
                        No user sessions found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() =>
                              openUserTimeline({
                                userId: s.userId,
                                userName: s.user?.name || `User #${s.userId}`,
                                email: s.user?.email || '',
                                role: s.user?.role || 'executive',
                              })
                            }
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                              <span>{s.user?.name || `User #${s.userId}`}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                            </div>
                            <div className="text-slate-400 text-[10px] font-mono">{s.user?.email}</div>
                          </button>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBadge status={s.user?.role || 'executive'} size="sm" />
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {formatDateTime(s.loginAt)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {formatDateTime(s.lastActivityAt)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {s.logoutAt ? (
                            <span>{formatDateTime(s.logoutAt)}</span>
                          ) : s.sessionStatus === 'Active' ? (
                            <span className="text-emerald-600 font-semibold font-sans">Still Active</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                          {formatDuration(s.sessionDurationSeconds)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                            {formatDuration(s.activeDurationSeconds)}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(s.sessionStatus)}
                        </td>

                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {s.pageViewsCount || 1}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                          {s.lastModule || 'Dashboard'}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() =>
                              openUserTimeline({
                                userId: s.userId,
                                userName: s.user?.name || `User #${s.userId}`,
                                email: s.user?.email || '',
                                role: s.user?.role || 'executive',
                              })
                            }
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-600 text-slate-500"
                            title="View Activity Timeline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {s.sessionStatus === 'Active' && user?.role === 'admin' && (
                            <button
                              onClick={() => handleRevokeSession(s.id, s.user?.name || `User #${s.userId}`)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                              title="Revoke Active Session"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVITIES STREAM */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Real-Time CRM Module & Page Navigation Log
            </h2>
            <span className="text-xs text-slate-400">Total events: {activities.length}</span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Action Summary</th>
                  <th className="py-3 px-4">Page Path</th>
                  <th className="py-3 px-4">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {formatDateTime(a.eventTimestamp)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{a.user?.name || `User #${a.userId}`}</div>
                      <div className="text-[10px] text-slate-400 uppercase">{a.user?.role}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                      {a.moduleName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {a.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {a.actionName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {a.pagePath}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.result === 'Success'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {a.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY EVENTS */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Security Incidents, Failed Logins & Lockouts
            </h2>
            <span className="text-xs text-rose-600 font-semibold">{securityEventsList.length} Events</span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Security Incident</th>
                  <th className="py-3 px-4">Target Email</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {securityEventsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      No security incidents or failed logins recorded.
                    </td>
                  </tr>
                ) : (
                  securityEventsList.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatDateTime(e.createdAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          {e.eventType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {e.email || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {e.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {e.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INDIVIDUAL USER ACTIVITY TIMELINE MODAL (Section 7) */}
      {selectedUserTimeline && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {selectedUserTimeline.userName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{selectedUserTimeline.userName}</h2>
                    <StatusBadge status={selectedUserTimeline.role} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{selectedUserTimeline.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserTimeline(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter */}
            <div className="flex items-center justify-between text-xs pb-1 shrink-0">
              <span className="font-semibold text-slate-700">Chronological Event Timeline</span>
              <select
                value={timelineModuleFilter}
                onChange={(e) => setTimelineModuleFilter(e.target.value)}
                className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All Modules</option>
                <option value="Authentication">Authentication</option>
                <option value="Dashboard">Dashboard</option>
                <option value="Leads">Leads</option>
                <option value="Site Visits">Site Visits</option>
                <option value="Enquiries">Enquiries</option>
                <option value="Quotations">Quotations</option>
                <option value="Follow-ups">Follow-ups</option>
                <option value="Calls">Calls</option>
                <option value="Reports">Reports</option>
                <option value="Settings">Settings</option>
              </select>
            </div>

            {/* Timeline Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs">
              {timelineLoading ? (
                <div className="text-center py-10 text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                  Fetching user activity records...
                </div>
              ) : filteredTimeline.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  No activity events found for this employee under selected filter.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-4 py-2">
                  {filteredTimeline.map((item) => {
                    const d = new Date(item.eventTimestamp);
                    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = formatDate(item.eventTimestamp);

                    return (
                      <div key={item.id} className="relative pl-6">
                        {/* Dot indicator */}
                        <div
                          className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                            item.eventType === 'Login'
                              ? 'bg-blue-600 ring-2 ring-blue-100'
                              : item.eventType === 'Logout'
                              ? 'bg-slate-400'
                              : item.eventType === 'Create'
                              ? 'bg-emerald-500'
                              : item.eventType === 'Access Denied'
                              ? 'bg-rose-500'
                              : 'bg-indigo-400'
                          }`}
                        />

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{item.actionName}</span>
                            <span className="font-mono text-slate-400 text-[11px]">
                              {timeStr} • {dateStr}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                              {item.moduleName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">{item.pagePath}</span>
                            {item.result !== 'Success' && (
                              <span className="text-rose-600 font-bold">{item.result}</span>
                            )}
                          </div>

                          {item.metadata && (
                            <div className="text-[10px] text-slate-500 bg-white p-1.5 rounded-lg border border-slate-100 font-mono mt-1">
                              {item.metadata}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedUserTimeline(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
