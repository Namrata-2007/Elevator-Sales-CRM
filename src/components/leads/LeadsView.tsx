import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Trash2,
  Edit,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  X,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { api, formatCurrency, formatDate } from '../../lib/api.ts';
import { Lead, User, LeadStatus, LeadSource, BuildingType } from '../../types/crm.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { DateRangeFilter, DateRangeValue } from '../common/DateRangeFilter.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface LeadsViewProps {
  onOpenNewEnquiryWithLead?: (lead: Lead) => void;
  onOpenScheduleVisitWithLead?: (lead: Lead) => void;
}

const STATUS_OPTIONS: LeadStatus[] = [
  'New',
  'Contacted',
  'Meeting Scheduled',
  'Site Visit Completed',
  'Enquiry Received',
  'Quotation Submitted',
  'Negotiation',
  'Order Won',
  'Order Lost',
];

const SOURCE_OPTIONS: LeadSource[] = ['Referral', 'Website', 'IndiaMART', 'Advertisement', 'Other'];
const BUILDING_TYPES: BuildingType[] = ['Residential', 'Commercial', 'Hospital', 'Industrial', 'Other'];

export const LeadsView: React.FC<LeadsViewProps> = ({
  onOpenNewEnquiryWithLead,
  onOpenScheduleVisitWithLead,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: 'all',
    startDate: '',
    endDate: '',
  });
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    companyName: '',
    contactPerson: '',
    mobileNumber: '',
    email: '',
    projectName: '',
    projectLocation: 'Bengaluru',
    leadSource: 'Website' as LeadSource,
    buildingType: 'Residential' as BuildingType,
    numberOfFloors: 4,
    requiredLiftQty: 1,
    estimatedBudget: '',
    assignedUserId: '',
    status: 'New' as LeadStatus,
    nextFollowUpDate: '',
    notes: '',
  });

  const [duplicateWarning, setDuplicateWarning] = useState<Lead | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (assignedFilter !== 'all') params.assignedTo = assignedFilter;
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      params.sort = sortField;
      params.order = sortOrder;

      const data = await api.getLeads(params);
      setLeadsList(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch leads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsersList(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchUsers();
  }, [statusFilter, sourceFilter, assignedFilter, dateRange.startDate, dateRange.endDate, sortField, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const checkDuplicate = async (mobile: string) => {
    if (!mobile || mobile.length < 8) {
      setDuplicateWarning(null);
      return;
    }
    try {
      const res = await api.checkDuplicateMobile(mobile);
      if (res.duplicate && res.lead && res.lead.id !== editingLead?.id) {
        setDuplicateWarning(res.lead);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // ignore
    }
  };

  const openCreateModal = () => {
    setEditingLead(null);
    setDuplicateWarning(null);
    setFormData({
      customerName: '',
      companyName: '',
      contactPerson: '',
      mobileNumber: '',
      email: '',
      projectName: '',
      projectLocation: 'Bengaluru',
      leadSource: 'Website',
      buildingType: 'Residential',
      numberOfFloors: 4,
      requiredLiftQty: 1,
      estimatedBudget: '',
      assignedUserId: user?.id ? String(user.id) : '',
      status: 'New',
      nextFollowUpDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setDuplicateWarning(null);
    setFormData({
      customerName: lead.customerName,
      companyName: lead.companyName || '',
      contactPerson: lead.contactPerson || '',
      mobileNumber: lead.mobileNumber,
      email: lead.email || '',
      projectName: lead.projectName,
      projectLocation: lead.projectLocation,
      leadSource: lead.leadSource,
      buildingType: lead.buildingType,
      numberOfFloors: lead.numberOfFloors,
      requiredLiftQty: lead.requiredLiftQty,
      estimatedBudget: lead.estimatedBudget ? String(lead.estimatedBudget) : '',
      assignedUserId: lead.assignedUserId ? String(lead.assignedUserId) : '',
      status: lead.status,
      nextFollowUpDate: lead.nextFollowUpDate || '',
      notes: lead.notes || '',
    });
    setIsCreateOpen(true);
  };

  const openLeadDetails = async (id: number) => {
    setIsDetailLoading(true);
    try {
      const detail = await api.getLead(id);
      setSelectedLead(detail);
    } catch (err: any) {
      showToast(err.message || 'Failed to load details', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingLead) {
        await api.updateLead(editingLead.id, formData);
        showToast(`Lead ${editingLead.leadNumber} updated successfully!`, 'success');
      } else {
        const created = await api.createLead(formData);
        showToast(`Lead ${created.leadNumber} created successfully!`, 'success');
      }
      setIsCreateOpen(false);
      fetchLeads();
      if (selectedLead && editingLead && selectedLead.id === editingLead.id) {
        openLeadDetails(editingLead.id);
      }
    } catch (err: any) {
      showToast(err.message || 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLead = async (id: number) => {
    try {
      await api.deleteLead(id);
      showToast('Lead deleted successfully', 'success');
      setDeleteConfirmId(null);
      if (selectedLead?.id === id) setSelectedLead(null);
      fetchLeads();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete lead', 'error');
    }
  };

  const handleConvertToEnquiry = async (leadId: number) => {
    try {
      const enq = await api.convertToEnquiry(leadId);
      showToast(`Enquiry ${enq.enquiryNumber} created from lead!`, 'success');
      fetchLeads();
      if (selectedLead?.id === leadId) {
        openLeadDetails(leadId);
      }
    } catch (err: any) {
      showToast(err.message || 'Conversion failed', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Lead Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Capture, qualify, assign and convert elevator opportunities into engineering enquiries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLeads}
            title="Refresh"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, mobile, project name, or lead ID..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white text-xs sm:text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 mr-1 font-medium">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
          >
            <option value="all">All Sources</option>
            {SOURCE_OPTIONS.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>

          {/* Assigned Executive */}
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
          >
            <option value="all">All Executives</option>
            {usersList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>

          {/* Sorting */}
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortField(field);
              setSortOrder(order);
            }}
            className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium ml-auto"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="customerName-asc">Customer A-Z</option>
            <option value="status-asc">By Status</option>
          </select>
        </div>

        <DateRangeFilter
          label="Lead Created"
          value={dateRange}
          onChange={setDateRange}
        />
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Lead ID</th>
                <th className="py-3 px-4">Customer & Project</th>
                <th className="py-3 px-4">Specs Required</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Source / Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && leadsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Fetching database records...
                  </td>
                </tr>
              ) : leadsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No leads found matching current filters.
                  </td>
                </tr>
              ) : (
                leadsList.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    onClick={() => openLeadDetails(lead.id)}
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                      {lead.leadNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {lead.customerName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{lead.projectName}</span>
                        {lead.companyName && <span className="text-slate-400">• {lead.companyName}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">
                        {lead.requiredLiftQty} {lead.requiredLiftQty > 1 ? 'Lifts' : 'Lift'} ({lead.buildingType})
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {lead.numberOfFloors} Floors • {lead.estimatedBudget ? formatCurrency(lead.estimatedBudget) : 'Budget TBD'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{lead.mobileNumber}</span>
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{lead.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {lead.leadSource}
                      </span>
                      <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[120px]">{lead.projectLocation}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={lead.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">
                        {lead.assignedUser?.name || 'Unassigned'}
                      </div>
                      {lead.nextFollowUpDate && (
                        <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(lead.nextFollowUpDate)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleConvertToEnquiry(lead.id)}
                          title="Convert to Technical Enquiry"
                          className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(lead)}
                          title="Edit Lead"
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {(user?.role === 'admin' || user?.role === 'manager') && (
                          <button
                            onClick={() => setDeleteConfirmId(lead.id)}
                            title="Delete Lead"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-base font-bold text-slate-900">Confirm Deletion</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              Are you sure you want to delete this lead? All associated records will be permanently removed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteLead(deleteConfirmId)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Lead Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {editingLead ? `Edit Lead ${editingLead.leadNumber}` : 'Add New Elevator Lead'}
                </h2>
                <p className="text-xs text-slate-500">Fill in client details and elevator requirements</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {duplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Potential Duplicate Lead Detected!</div>
                  <div>
                    A lead already exists for this mobile number: <strong>{duplicateWarning.customerName}</strong> (
                    {duplicateWarning.leadNumber} - {duplicateWarning.projectName}).
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Developer Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Prestige Builders Pvt Ltd"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.mobileNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, mobileNumber: e.target.value });
                      checkDuplicate(e.target.value);
                    }}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. contact@prestige.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Project Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="e.g. Prestige Grand Tower"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Project Location / City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.projectLocation}
                    onChange={(e) => setFormData({ ...formData, projectLocation: e.target.value })}
                    placeholder="e.g. Indiranagar, Bengaluru"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Building Type</label>
                  <select
                    value={formData.buildingType}
                    onChange={(e) => setFormData({ ...formData, buildingType: e.target.value as BuildingType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                  >
                    {BUILDING_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Source</label>
                  <select
                    value={formData.leadSource}
                    onChange={(e) => setFormData({ ...formData, leadSource: e.target.value as LeadSource })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                  >
                    {SOURCE_OPTIONS.map((so) => (
                      <option key={so} value={so}>
                        {so}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Number of Floors</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.numberOfFloors}
                    onChange={(e) => setFormData({ ...formData, numberOfFloors: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Required Lift Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.requiredLiftQty}
                    onChange={(e) => setFormData({ ...formData, requiredLiftQty: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Budget (INR)</label>
                  <input
                    type="number"
                    step="10000"
                    value={formData.estimatedBudget}
                    onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
                    placeholder="e.g. 2400000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assign Sales Executive</label>
                  <select
                    value={formData.assignedUserId}
                    onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Select Employee</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Next Follow-up Date</label>
                  <input
                    type="date"
                    value={formData.nextFollowUpDate}
                    onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Client Specifications</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Client needs gearless MRL elevators, stainless steel hairline finish, voice announcer..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {submitting ? 'Saving...' : editingLead ? 'Save Changes' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Drawer / Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {selectedLead.leadNumber}
                  </span>
                  <StatusBadge status={selectedLead.status} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedLead.customerName}</h2>
                <div className="text-xs text-slate-500">
                  {selectedLead.projectName} • {selectedLead.projectLocation}
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
              {/* Quick Conversion CTA */}
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-blue-900 text-xs sm:text-sm">
                    Convert Lead into Elevator Enquiry
                  </div>
                  <div className="text-[11px] text-blue-700">
                    Auto-populates customer & project details directly into technical specs
                  </div>
                </div>
                <button
                  onClick={() => handleConvertToEnquiry(selectedLead.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Convert Now
                </button>
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile</span>
                  <span className="font-semibold text-slate-900">{selectedLead.mobileNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                  <span className="font-semibold text-slate-900">{selectedLead.email || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Building Type</span>
                  <span className="font-semibold text-slate-900">{selectedLead.buildingType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Floors</span>
                  <span className="font-semibold text-slate-900">{selectedLead.numberOfFloors} Floors</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Lift Qty</span>
                  <span className="font-semibold text-slate-900">{selectedLead.requiredLiftQty} Units</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Budget</span>
                  <span className="font-semibold text-slate-900">
                    {selectedLead.estimatedBudget ? formatCurrency(selectedLead.estimatedBudget) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Lead Source</span>
                  <span className="font-semibold text-slate-900">{selectedLead.leadSource}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Next Follow-up</span>
                  <span className="font-semibold text-amber-700">
                    {formatDate(selectedLead.nextFollowUpDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Created Date</span>
                  <span className="font-semibold text-slate-900">{formatDate(selectedLead.createdAt)}</span>
                </div>
              </div>

              {selectedLead.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Notes & Specifications</div>
                  <div className="text-slate-700 whitespace-pre-wrap">{selectedLead.notes}</div>
                </div>
              )}

              {/* Complete Linked History Tabs/Sections */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm border-b pb-1">
                  Complete Linked History & Lifecycle
                </h3>

                {/* Linked Site Visits */}
                <div className="space-y-2">
                  <div className="font-semibold text-xs text-slate-700 flex items-center justify-between">
                    <span>Site Visits ({selectedLead.siteVisits?.length || 0})</span>
                  </div>
                  {selectedLead.siteVisits && selectedLead.siteVisits.length > 0 ? (
                    selectedLead.siteVisits.map((v) => (
                      <div key={v.id} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                        <div className="flex items-center justify-between font-medium">
                          <span className="font-mono text-blue-600">{v.visitNumber}</span>
                          <StatusBadge status={v.status} size="sm" />
                        </div>
                        <div className="text-slate-600 mt-1">{v.visitPurpose}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Date: {v.visitDate} {v.visitTime} • Address: {v.siteAddress}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic">No site visits recorded for this lead.</div>
                  )}
                </div>

                {/* Linked Enquiries */}
                <div className="space-y-2">
                  <div className="font-semibold text-xs text-slate-700">
                    Elevator Enquiries ({selectedLead.enquiries?.length || 0})
                  </div>
                  {selectedLead.enquiries && selectedLead.enquiries.length > 0 ? (
                    selectedLead.enquiries.map((e) => (
                      <div key={e.id} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                        <div className="flex items-center justify-between font-medium">
                          <span className="font-mono text-sky-600">{e.enquiryNumber}</span>
                          <StatusBadge status={e.status} size="sm" />
                        </div>
                        <div className="text-slate-700 font-medium mt-1">
                          {e.liftType} Elevator ({e.liftQuantity} Qty) • {e.ratedCapacity}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {e.doorType} • {e.machineRoom} • Speed: {e.ratedSpeed}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic">No enquiries generated yet.</div>
                  )}
                </div>

                {/* Linked Quotations */}
                <div className="space-y-2">
                  <div className="font-semibold text-xs text-slate-700">
                    Quotations Submitted ({selectedLead.quotations?.length || 0})
                  </div>
                  {selectedLead.quotations && selectedLead.quotations.length > 0 ? (
                    selectedLead.quotations.map((q) => (
                      <div key={q.id} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                        <div className="flex items-center justify-between font-medium">
                          <span className="font-mono text-emerald-600">{q.quotationNumber}</span>
                          <StatusBadge status={q.status} size="sm" />
                        </div>
                        <div className="text-slate-900 font-bold mt-1">
                          Amount: {formatCurrency(q.quotationAmount)} (Rev #{q.revisionNumber})
                        </div>
                        <div className="text-[11px] text-slate-500">Date: {q.quotationDate}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic">No quotations submitted yet.</div>
                  )}
                </div>

                {/* Linked Follow-ups */}
                <div className="space-y-2">
                  <div className="font-semibold text-xs text-slate-700">
                    Follow-ups ({selectedLead.followUps?.length || 0})
                  </div>
                  {selectedLead.followUps && selectedLead.followUps.length > 0 ? (
                    selectedLead.followUps.map((flw) => (
                      <div key={flw.id} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                        <div className="flex items-center justify-between font-medium">
                          <span className="font-mono text-amber-700">{flw.followUpNumber}</span>
                          <StatusBadge status={flw.status} size="sm" />
                        </div>
                        <div className="text-slate-800 mt-1">{flw.followUpNotes}</div>
                        <div className="text-[11px] text-slate-500">Due: {flw.dueDate}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic">No follow-ups recorded.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedLead(null);
                  openEditModal(selectedLead);
                }}
                className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-medium"
              >
                Edit Lead
              </button>
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
