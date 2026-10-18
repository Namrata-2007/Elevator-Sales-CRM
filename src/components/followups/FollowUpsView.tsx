import React, { useState, useEffect } from 'react';
import {
  ClockAlert,
  Plus,
  CheckCircle2,
  Calendar,
  Clock,
  Building,
  UserCheck,
  AlertCircle,
  RefreshCw,
  X,
  ArrowRight,
  PhoneCall,
  Check,
  Trash2,
} from 'lucide-react';
import { api, formatDate } from '../../lib/api.ts';
import { FollowUp, Lead, Quotation, User } from '../../types/crm.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

export const FollowUpsView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab: 'today' | 'upcoming' | 'overdue' | 'completed' | 'all'
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'overdue' | 'completed' | 'all'>('today');

  // Modals
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<FollowUp | null>(null);

  // Schedule Follow-up Form
  const [formData, setFormData] = useState({
    leadId: '',
    quotationId: '',
    customerName: '',
    projectName: '',
    assignedUserId: '',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '11:00 AM',
    followUpNotes: '',
    nextAction: 'Call customer to discuss technical requirements',
  });

  // Complete Follow-up Form
  const [completeData, setCompleteData] = useState({
    completedNotes: '',
    scheduleNext: true,
    nextDueDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    nextDueTime: '11:00 AM',
    nextNotes: 'Follow-up discussion on revised commercial offer',
    nextNextAction: 'Submit revised proposal',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fData, lData, qData, uData] = await Promise.all([
        api.getFollowUps(),
        api.getLeads(),
        api.getQuotations(),
        api.getUsers(),
      ]);
      setFollowUps(fData);
      setLeads(lData);
      setQuotations(qData);
      setUsersList(uData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load follow-ups', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openScheduleModal = () => {
    const firstLead = leads[0];
    setFormData({
      leadId: firstLead ? String(firstLead.id) : '',
      quotationId: '',
      customerName: firstLead ? firstLead.customerName : '',
      projectName: firstLead ? firstLead.projectName : '',
      assignedUserId: user?.id ? String(user.id) : '',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '11:00 AM',
      followUpNotes: 'Call customer to review elevator hoistway details.',
      nextAction: 'Schedule technical site inspection',
    });
    setIsScheduleOpen(true);
  };

  const handleLeadSelect = (leadIdStr: string) => {
    const selected = leads.find((l) => String(l.id) === leadIdStr);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        leadId: leadIdStr,
        customerName: selected.customerName,
        projectName: selected.projectName,
        assignedUserId: selected.assignedUserId ? String(selected.assignedUserId) : prev.assignedUserId,
      }));
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createFollowUp(formData);
      showToast(`Follow-up ${created.followUpNumber} scheduled!`, 'success');
      setIsScheduleOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule', 'error');
    }
  };

  const openCompleteModal = (task: FollowUp) => {
    setCompletingTask(task);
    setCompleteData({
      completedNotes: 'Spoke with client. Discussed elevator speed and cabin finishes.',
      scheduleNext: true,
      nextDueDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
      nextDueTime: '11:00 AM',
      nextNotes: `Next follow-up for ${task.projectName}`,
      nextNextAction: 'Finalize quotation proposal',
    });
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;
    try {
      await api.updateFollowUp(completingTask.id, {
        status: 'Completed',
        completedNotes: completeData.completedNotes,
        scheduleNext: completeData.scheduleNext,
        nextDueDate: completeData.nextDueDate,
        nextDueTime: completeData.nextDueTime,
        nextNotes: completeData.nextNotes,
        nextNextAction: completeData.nextNextAction,
      });
      showToast(
        completeData.scheduleNext
          ? `Follow-up completed & next session scheduled!`
          : `Follow-up ${completingTask.followUpNumber} completed!`,
        'success'
      );
      setCompletingTask(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this follow-up?')) return;
    try {
      await api.deleteFollowUp(id);
      showToast('Follow-up deleted', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  const todayList = followUps.filter((f) => f.bucket === 'Today');
  const upcomingList = followUps.filter((f) => f.bucket === 'Upcoming');
  const overdueList = followUps.filter((f) => f.bucket === 'Overdue');
  const completedList = followUps.filter((f) => f.bucket === 'Completed');

  const filteredTasks =
    activeTab === 'today'
      ? todayList
      : activeTab === 'upcoming'
      ? upcomingList
      : activeTab === 'overdue'
      ? overdueList
      : activeTab === 'completed'
      ? completedList
      : followUps;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Follow-up Task Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Never miss an elevator client callback, quotation revision deadline, or closing meeting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openScheduleModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Schedule Follow-up
          </button>
        </div>
      </div>

      {/* Overdue Alert Banner if tasks exist */}
      {overdueList.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600 text-white rounded-xl">
              <ClockAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-rose-950">
                {overdueList.length} Overdue Follow-up {overdueList.length > 1 ? 'Tasks' : 'Task'}!
              </div>
              <div className="text-rose-700">
                Action is urgently required to prevent elevator sales leads from cooling off.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('overdue')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs"
          >
            Review Overdue ({overdueList.length})
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
            activeTab === 'today'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>Today's Follow-ups</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'today' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {todayList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
            activeTab === 'upcoming'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>Upcoming</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'upcoming' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {upcomingList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
            activeTab === 'overdue'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>Overdue Tasks</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'overdue' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {overdueList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-colors ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>Completed History</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'completed' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {completedList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 ml-auto`}
        >
          All Records ({followUps.length})
        </button>
      </div>

      {/* Task List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && followUps.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
            Loading follow-up tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No follow-ups in this section!
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-2xl border bg-white shadow-xs space-y-3 transition-all ${
                task.bucket === 'Overdue'
                  ? 'border-rose-300 ring-1 ring-rose-500/20 bg-rose-50/20'
                  : task.bucket === 'Today'
                  ? 'border-blue-300 ring-1 ring-blue-500/20'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {task.followUpNumber}
                  </span>
                  <StatusBadge status={task.bucket || task.status} size="sm" />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDate(task.dueDate)}</span>
                  {task.dueTime && <span>• {task.dueTime}</span>}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900">{task.customerName}</h3>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{task.projectName}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5">
                <div className="text-slate-800 font-medium">{task.followUpNotes}</div>
                {task.nextAction && (
                  <div className="text-[11px] text-blue-700 font-semibold flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 text-blue-500" /> Next: {task.nextAction}
                  </div>
                )}
                {task.completedNotes && (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 mt-2">
                    <strong>Completion Note:</strong> {task.completedNotes}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  Assigned: <strong>{task.assignedUser?.name || 'Executive'}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  {task.status === 'Pending' && (
                    <button
                      onClick={() => openCompleteModal(task)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Complete & Reschedule
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Follow-up Modal */}
      {isScheduleOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Schedule Client Follow-up</h2>
              <button onClick={() => setIsScheduleOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Related Lead <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.leadId}
                  onChange={(e) => handleLeadSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">Select lead...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.leadNumber} - {l.customerName} ({l.projectName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Time</label>
                  <input
                    type="text"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    placeholder="e.g. 11:30 AM"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Follow-up Notes / Agenda <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.followUpNotes}
                  onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                  placeholder="e.g. Call architect to confirm 3-phase power line layout and machine room load beam status."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expected Next Action</label>
                <input
                  type="text"
                  value={formData.nextAction}
                  onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                  placeholder="e.g. Issue commercial price quote R1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Schedule Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Task & Reschedule Modal */}
      {completingTask && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Complete Task: {completingTask.followUpNumber}
                </h2>
                <p className="text-xs text-slate-500">
                  {completingTask.customerName} • {completingTask.projectName}
                </p>
              </div>
              <button onClick={() => setCompletingTask(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Discussion Outcome & Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={completeData.completedNotes}
                  onChange={(e) => setCompleteData({ ...completeData, completedNotes: e.target.value })}
                  placeholder="Record summary of phone call, client objections, or agreement..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Schedule Next Follow-up Option */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-blue-900">
                  <input
                    type="checkbox"
                    checked={completeData.scheduleNext}
                    onChange={(e) => setCompleteData({ ...completeData, scheduleNext: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Schedule next follow-up with this customer immediately</span>
                </label>

                {completeData.scheduleNext && (
                  <div className="space-y-3 pt-2 border-t border-blue-200/60">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Next Due Date</label>
                        <input
                          type="date"
                          value={completeData.nextDueDate}
                          onChange={(e) => setCompleteData({ ...completeData, nextDueDate: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Next Due Time</label>
                        <input
                          type="text"
                          value={completeData.nextDueTime}
                          onChange={(e) => setCompleteData({ ...completeData, nextDueTime: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Next Follow-up Notes</label>
                      <input
                        type="text"
                        value={completeData.nextNotes}
                        onChange={(e) => setCompleteData({ ...completeData, nextNotes: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Save & Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
