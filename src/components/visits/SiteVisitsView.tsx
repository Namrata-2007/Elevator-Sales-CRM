import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  Filter,
  Search,
  Calendar,
  Clock,
  MapPin,
  Building,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  RefreshCw,
  X,
  UserCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api, formatDate } from '../../lib/api.ts';
import { SiteVisit, Lead, User, VisitStatus } from '../../types/crm.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface SiteVisitsViewProps {
  initialLead?: Lead | null;
}

const CONSTRUCTION_STAGES = [
  'Excavation',
  'RCC Structure Ready',
  'Brickwork in Progress',
  'Shaft Ready',
  'Finishing Stage',
  'Completed',
];

export const SiteVisitsView: React.FC<SiteVisitsViewProps> = ({ initialLead }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<SiteVisit | null>(null);
  const [completeModalVisit, setCompleteModalVisit] = useState<SiteVisit | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    leadId: '',
    projectName: '',
    siteAddress: '',
    contactPerson: '',
    contactPhone: '',
    visitDate: new Date().toISOString().split('T')[0],
    visitTime: '11:00 AM',
    assignedUserId: '',
    visitPurpose: 'Shaft Measurement & Hoistway Inspection',
    buildingConstructionStatus: 'RCC Structure Ready',
    numberOfFloors: 4,
    liftRequirements: '',
    discussionNotes: '',
    visitOutcome: '',
    nextAction: '',
    nextFollowUpDate: '',
    status: 'Planned' as VisitStatus,
  });

  // Complete Visit Modal state
  const [completionData, setCompletionData] = useState({
    discussionNotes: '',
    visitOutcome: 'Measurements approved for MRL layout drawing.',
    nextAction: 'Prepare formal technical quote and GA drawing',
    nextFollowUpDate: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      if (assignedFilter !== 'all') params.assignedTo = assignedFilter;

      const [visitData, leadData, userData] = await Promise.all([
        api.getSiteVisits(params),
        api.getLeads(),
        api.getUsers(),
      ]);

      setVisits(visitData);
      setLeads(leadData);
      setUsersList(userData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load visits', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, dateFilter, assignedFilter]);

  const openScheduleModal = (prefillLead?: Lead | null) => {
    setEditingVisit(null);
    const targetLead = prefillLead || (leads.length > 0 ? leads[0] : null);

    setFormData({
      leadId: targetLead ? String(targetLead.id) : '',
      projectName: targetLead ? targetLead.projectName : '',
      siteAddress: targetLead ? targetLead.projectLocation : '',
      contactPerson: targetLead ? targetLead.contactPerson || targetLead.customerName : '',
      contactPhone: targetLead ? targetLead.mobileNumber : '',
      visitDate: new Date().toISOString().split('T')[0],
      visitTime: '11:00 AM',
      assignedUserId: targetLead?.assignedUserId ? String(targetLead.assignedUserId) : user?.id ? String(user.id) : '',
      visitPurpose: 'Shaft Measurement & Hoistway Inspection',
      buildingConstructionStatus: 'RCC Structure Ready',
      numberOfFloors: targetLead ? targetLead.numberOfFloors : 4,
      liftRequirements: targetLead ? `${targetLead.requiredLiftQty} units, ${targetLead.buildingType}` : '',
      discussionNotes: '',
      visitOutcome: '',
      nextAction: '',
      nextFollowUpDate: '',
      status: 'Planned',
    });
    setIsModalOpen(true);
  };

  const handleLeadSelect = (leadIdStr: string) => {
    const selected = leads.find((l) => String(l.id) === leadIdStr);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        leadId: leadIdStr,
        projectName: selected.projectName,
        siteAddress: selected.projectLocation,
        contactPerson: selected.contactPerson || selected.customerName,
        contactPhone: selected.mobileNumber,
        numberOfFloors: selected.numberOfFloors,
        liftRequirements: `${selected.requiredLiftQty} units, ${selected.buildingType}`,
        assignedUserId: selected.assignedUserId ? String(selected.assignedUserId) : prev.assignedUserId,
      }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVisit) {
        await api.updateSiteVisit(editingVisit.id, formData);
        showToast(`Site visit ${editingVisit.visitNumber} updated!`, 'success');
      } else {
        const created = await api.createSiteVisit(formData);
        showToast(`Site visit ${created.visitNumber} scheduled successfully!`, 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  const openCompleteModal = (visit: SiteVisit) => {
    setCompleteModalVisit(visit);
    setCompletionData({
      discussionNotes: visit.discussionNotes || 'Verified shaft clear dimensions, pit depth, and overhead clearance.',
      visitOutcome: visit.visitOutcome || 'Hoistway ready for installation. Drawings verified.',
      nextAction: visit.nextAction || 'Send quotation proposal to customer.',
      nextFollowUpDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    });
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalVisit) return;
    try {
      await api.updateSiteVisit(completeModalVisit.id, {
        status: 'Completed',
        ...completionData,
      });
      showToast(`Site visit ${completeModalVisit.visitNumber} marked as completed!`, 'success');
      setCompleteModalVisit(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete visit', 'error');
    }
  };

  const handleDeleteVisit = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this site visit record?')) return;
    try {
      await api.deleteSiteVisit(id);
      showToast('Site visit record removed', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete visit', 'error');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Site Visit Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Coordinate physical site inspections, shaft dimension measurements, and civil readiness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'calendar' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600'
              }`}
            >
              Agenda / Timeline
            </button>
          </div>
          <button
            onClick={() => openScheduleModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Schedule Visit
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Filter className="w-3.5 h-3.5" /> Filter by:
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
        >
          <option value="all">All Statuses</option>
          <option value="Planned">Planned</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-slate-400 hover:text-slate-600"
              title="Clear date filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
        >
          <option value="all">All Executives</option>
          {usersList.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setDateFilter(todayStr);
            setStatusFilter('all');
          }}
          className={`ml-auto px-3 py-1.5 rounded-lg border text-xs font-semibold ${
            dateFilter === todayStr
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Today's Schedule Only
        </button>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Visit ID</th>
                  <th className="py-3 px-4">Project & Site Address</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Site Contact</th>
                  <th className="py-3 px-4">Construction Stage</th>
                  <th className="py-3 px-4">Purpose & Outcome</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && visits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                      Loading site visits...
                    </td>
                  </tr>
                ) : visits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No site visits found matching current filters.
                    </td>
                  </tr>
                ) : (
                  visits.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-indigo-700">
                        {v.visitNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{v.projectName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{v.siteAddress}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(v.visitDate)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{v.visitTime || '10:00 AM'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{v.contactPerson || '—'}</div>
                        <div className="text-[11px] text-slate-500">{v.contactPhone || '—'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {v.buildingConstructionStatus || 'Structure Ready'}
                        </span>
                        {v.numberOfFloors && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {v.numberOfFloors} Floors
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="text-slate-800 font-medium truncate">{v.visitPurpose}</div>
                        {v.discussionNotes && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {v.discussionNotes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={v.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        {v.assignedUser?.name || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {v.status === 'Planned' && (
                            <button
                              onClick={() => openCompleteModal(v)}
                              title="Mark as Completed"
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Complete
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingVisit(v);
                              setFormData({
                                leadId: String(v.leadId),
                                projectName: v.projectName,
                                siteAddress: v.siteAddress,
                                contactPerson: v.contactPerson || '',
                                contactPhone: v.contactPhone || '',
                                visitDate: v.visitDate,
                                visitTime: v.visitTime || '11:00 AM',
                                assignedUserId: v.assignedUserId ? String(v.assignedUserId) : '',
                                visitPurpose: v.visitPurpose || '',
                                buildingConstructionStatus: v.buildingConstructionStatus || '',
                                numberOfFloors: v.numberOfFloors || 4,
                                liftRequirements: v.liftRequirements || '',
                                discussionNotes: v.discussionNotes || '',
                                visitOutcome: v.visitOutcome || '',
                                nextAction: v.nextAction || '',
                                nextFollowUpDate: v.nextFollowUpDate || '',
                                status: v.status,
                              });
                              setIsModalOpen(true);
                            }}
                            title="Edit Visit"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {(user?.role === 'admin' || user?.role === 'manager') && (
                            <button
                              onClick={() => handleDeleteVisit(v.id)}
                              title="Delete Visit"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calendar / Timeline View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visits.map((visit) => {
            const isToday = visit.visitDate === todayStr;
            return (
              <div
                key={visit.id}
                className={`p-4 rounded-2xl border bg-white shadow-xs space-y-3 ${
                  isToday ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {visit.visitNumber}
                  </span>
                  <StatusBadge status={visit.status} size="sm" />
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900">{visit.projectName}</h3>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{visit.siteAddress}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(visit.visitDate)}
                    </span>
                    <span className="font-semibold text-slate-900">{visit.visitTime || '10:00 AM'}</span>
                  </div>
                  {visit.contactPerson && (
                    <div className="text-[11px] text-slate-600">
                      Contact: {visit.contactPerson} ({visit.contactPhone || 'No phone'})
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600">
                    Stage: <strong>{visit.buildingConstructionStatus || 'RCC Ready'}</strong>
                  </div>
                </div>

                {visit.discussionNotes && (
                  <div className="text-xs text-slate-600 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                    <div className="text-[10px] font-bold text-blue-900 uppercase">Inspection Notes</div>
                    <div className="mt-0.5">{visit.discussionNotes}</div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {visit.assignedUser?.name || 'Executive'}
                  </span>
                  {visit.status === 'Planned' && (
                    <button
                      onClick={() => openCompleteModal(visit)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule / Edit Visit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {editingVisit ? `Edit Visit ${editingVisit.visitNumber}` : 'Schedule Elevator Site Visit'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Related Customer Lead <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.leadId}
                  onChange={(e) => handleLeadSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select an active lead...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.leadNumber} - {l.customerName} ({l.projectName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    required
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Site Address</label>
                  <input
                    type="text"
                    required
                    value={formData.siteAddress}
                    onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Visit Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.visitDate}
                    onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Visit Time</label>
                  <input
                    type="text"
                    value={formData.visitTime}
                    onChange={(e) => setFormData({ ...formData, visitTime: e.target.value })}
                    placeholder="e.g. 11:30 AM"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Site Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Site Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Building Construction Status</label>
                  <select
                    value={formData.buildingConstructionStatus}
                    onChange={(e) => setFormData({ ...formData, buildingConstructionStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {CONSTRUCTION_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assign Sales Executive</label>
                  <select
                    value={formData.assignedUserId}
                    onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Select Employee</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Visit Purpose</label>
                <input
                  type="text"
                  value={formData.visitPurpose}
                  onChange={(e) => setFormData({ ...formData, visitPurpose: e.target.value })}
                  placeholder="e.g. Shaft measurement, pit depth inspection, machine room survey"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  {editingVisit ? 'Update Visit' : 'Schedule Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Completed Modal */}
      {completeModalVisit && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Complete Site Visit {completeModalVisit.visitNumber}
                </h2>
                <p className="text-xs text-slate-500">{completeModalVisit.projectName}</p>
              </div>
              <button onClick={() => setCompleteModalVisit(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Site Measurement & Discussion Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={completionData.discussionNotes}
                  onChange={(e) => setCompletionData({ ...completionData, discussionNotes: e.target.value })}
                  placeholder="e.g. Hoistway width 1800mm, depth 1900mm. Pit depth 1500mm checked. Overhead 4500mm verified. Power supply 3 phase available at site."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Visit Outcome</label>
                <input
                  type="text"
                  value={completionData.visitOutcome}
                  onChange={(e) => setCompletionData({ ...completionData, visitOutcome: e.target.value })}
                  placeholder="e.g. Dimensions verified. Client requested MRL gearless package."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Next Action</label>
                <input
                  type="text"
                  value={completionData.nextAction}
                  onChange={(e) => setCompletionData({ ...completionData, nextAction: e.target.value })}
                  placeholder="e.g. Prepare formal engineering proposal and GA layout"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Schedule Next Follow-up Date</label>
                <input
                  type="date"
                  value={completionData.nextFollowUpDate}
                  onChange={(e) => setCompletionData({ ...completionData, nextFollowUpDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCompleteModalVisit(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Save & Complete Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
