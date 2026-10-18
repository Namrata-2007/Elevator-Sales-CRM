import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  PhoneOff,
  PhoneForwarded,
  RefreshCw,
  X,
  Building,
} from 'lucide-react';
import { api, formatDate } from '../../lib/api.ts';
import { CallLog, Lead, User as CRMUser } from '../../types/crm.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

interface CallsViewProps {
  onOpenNewLead?: () => void;
}

const OUTCOME_OPTIONS = [
  'Connected - Interested',
  'Connected - Not Interested',
  'Call Back Requested',
  'Not Reachable',
  'Busy / Call Dropped',
  'Wrong Number',
  'Ringing / No Answer',
];

export const CallsView: React.FC<CallsViewProps> = ({ onOpenNewLead }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [calls, setCalls] = useState<CallLog[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [usersList, setUsersList] = useState<CRMUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [callerFilter, setCallerFilter] = useState('all');

  // Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newCall, setNewCall] = useState({
    leadId: '',
    customerName: '',
    mobileNumber: '',
    callOutcome: 'Connected - Interested',
    callDuration: '3 mins',
    discussionNotes: '',
    nextCallbackDate: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [callsRes, leadsRes, usersRes] = await Promise.all([
        api.getCalls(),
        api.getLeads(),
        api.getUsers(),
      ]);
      setCalls(callsRes || []);
      setLeads(leadsRes || []);
      setUsersList(usersRes || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch call logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLeadSelect = (leadIdStr: string) => {
    const selected = leads.find((l) => String(l.id) === leadIdStr);
    if (selected) {
      setNewCall((prev) => ({
        ...prev,
        leadId: String(selected.id),
        customerName: selected.customerName,
        mobileNumber: selected.mobileNumber,
        discussionNotes: prev.discussionNotes || `Regarding ${selected.projectName} (${selected.requiredLiftQty} lifts)`,
      }));
    } else {
      setNewCall((prev) => ({ ...prev, leadId: leadIdStr }));
    }
  };

  const handleLogCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCall.customerName || !newCall.mobileNumber) {
      showToast('Customer name and mobile number are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let finalLeadId = newCall.leadId;
      // If no lead linked, either find or link first
      if (!finalLeadId && leads.length > 0) {
        finalLeadId = String(leads[0].id);
      }

      await api.createCall({
        ...newCall,
        leadId: finalLeadId ? parseInt(finalLeadId, 10) : 1,
      });

      showToast(`Call record for ${newCall.customerName} logged successfully!`, 'success');
      setIsLogModalOpen(false);
      setNewCall({
        leadId: '',
        customerName: '',
        mobileNumber: '',
        callOutcome: 'Connected - Interested',
        callDuration: '3 mins',
        discussionNotes: '',
        nextCallbackDate: '',
      });
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to log call', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered list
  const filteredCalls = calls.filter((c) => {
    if (outcomeFilter !== 'all' && c.callOutcome !== outcomeFilter) return false;
    if (callerFilter !== 'all' && String(c.callerId) !== callerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchCust = c.customerName.toLowerCase().includes(q);
      const matchMobile = c.mobileNumber.toLowerCase().includes(q);
      const matchNotes = (c.discussionNotes || '').toLowerCase().includes(q);
      if (!matchCust && !matchMobile && !matchNotes) return false;
    }
    return true;
  });

  // Today's date
  const todayStr = new Date().toISOString().split('T')[0];
  const callsToday = calls.filter((c) => c.createdAt && c.createdAt.startsWith(todayStr)).length;
  const interestedCalls = calls.filter((c) => c.callOutcome.includes('Interested')).length;
  const callbacksDue = calls.filter((c) => c.nextCallbackDate && c.nextCallbackDate <= todayStr).length;

  const getOutcomeBadgeClass = (outcome: string) => {
    if (outcome.includes('Interested') && !outcome.includes('Not')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (outcome.includes('Call Back')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (outcome.includes('Not Reachable') || outcome.includes('Busy') || outcome.includes('No Answer')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Telecalling & Phone Call Log
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {calls.length} Total Calls
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Log prospective client phone calls, capture customer requirements, and schedule automated callbacks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <PhoneCall className="w-4 h-4" /> Log Customer Call
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Calls Logged Today</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{callsToday}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dials made on {todayStr}</div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-emerald-800">Connected & Interested</span>
          <div className="mt-1 text-2xl font-bold text-emerald-950">{interestedCalls}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Qualified elevator leads</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-amber-800">Callbacks Scheduled</span>
          <div className="mt-1 text-2xl font-bold text-amber-950">{callbacksDue} Due Today</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Client follow-up queue</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Active Telecalling Reps</span>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {usersList.filter((u) => u.role === 'telecaller' || u.role === 'admin').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Inside sales team</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer, phone, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1 text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Outcome:</span>
          </div>
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-white text-xs"
          >
            <option value="all">All Outcomes</option>
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          {user?.role === 'admin' && (
            <select
              value={callerFilter}
              onChange={(e) => setCallerFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-xl bg-white text-xs"
            >
              <option value="all">All Callers</option>
              {usersList.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer & Mobile</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Discussion & Lift Requirements</th>
                <th className="py-3 px-4">Next Callback</th>
                <th className="py-3 px-4">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading phone records...
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No call logs found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredCalls.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.customerName}</div>
                      <div className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                        <PhoneCall className="w-3 h-3 text-slate-400" />
                        {c.mobileNumber}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getOutcomeBadgeClass(
                          c.callOutcome
                        )}`}
                      >
                        {c.callOutcome}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {c.callDuration || '2 mins'}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-700">
                      <p className="line-clamp-2">{c.discussionNotes || '—'}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {c.nextCallbackDate ? (
                        <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                          {formatDate(c.nextCallbackDate)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <div className="font-medium text-slate-800">{c.caller?.name || 'Self'}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Call Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Log Customer Call</h2>
                  <p className="text-xs text-slate-500">Record conversation notes & auto-schedule callbacks</p>
                </div>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogCallSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Link with Existing Lead (Optional)
                </label>
                <select
                  value={newCall.leadId}
                  onChange={(e) => handleLeadSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">-- Direct Telecalling Call (Select Lead or Type below) --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={String(l.id)}>
                      {l.leadNumber} • {l.customerName} - {l.projectName} ({l.mobileNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Customer / Builder Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCall.customerName}
                    onChange={(e) => setNewCall({ ...newCall, customerName: e.target.value })}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newCall.mobileNumber}
                    onChange={(e) => setNewCall({ ...newCall, mobileNumber: e.target.value })}
                    placeholder="e.g. +91 98201 12345"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Call Outcome</label>
                  <select
                    value={newCall.callOutcome}
                    onChange={(e) => setNewCall({ ...newCall, callOutcome: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                  >
                    {OUTCOME_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Call Duration</label>
                  <select
                    value={newCall.callDuration}
                    onChange={(e) => setNewCall({ ...newCall, callDuration: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="1 min">1 min</option>
                    <option value="2 mins">2 mins</option>
                    <option value="3 mins">3 mins</option>
                    <option value="5 mins">5 mins</option>
                    <option value="8 mins">8 mins</option>
                    <option value="15+ mins">15+ mins (In-depth discussion)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Next Callback Date (Auto-creates follow-up task)
                </label>
                <input
                  type="date"
                  value={newCall.nextCallbackDate}
                  onChange={(e) => setNewCall({ ...newCall, nextCallbackDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Discussion Notes & Customer Lift Requirements
                </label>
                <textarea
                  rows={3}
                  value={newCall.discussionNotes}
                  onChange={(e) => setNewCall({ ...newCall, discussionNotes: e.target.value })}
                  placeholder="e.g. Inquired about 6-passenger automatic door elevator for G+4 residential building. Needs quotation by Friday..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save Call Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
