import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Plus,
  Filter,
  Search,
  Building,
  Edit,
  Trash2,
  RefreshCw,
  X,
  History,
  Trophy,
  XCircle,
  Coins,
  Calendar,
  UserCheck,
  CheckCircle,
  FileText,
  Printer,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { api, formatCurrency, formatDate } from '../../lib/api.ts';
import {
  Quotation,
  QuotationRevision,
  Enquiry,
  Lead,
  User,
  QuotationStatus,
} from '../../types/crm.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface QuotationsViewProps {
  initialEnquiry?: Enquiry | null;
}

const STATUS_OPTIONS: QuotationStatus[] = [
  'Draft',
  'Under Approval',
  'Submitted',
  'Follow-up Pending',
  'Negotiation',
  'Revision Required',
  'Approved',
  'Order Won',
  'Order Lost',
  'Expired',
];

export const QuotationsView: React.FC<QuotationsViewProps> = ({ initialEnquiry }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [revisionQuote, setRevisionQuote] = useState<Quotation | null>(null);
  const [feedbackQuote, setFeedbackQuote] = useState<Quotation | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quotation | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    enquiryId: '',
    leadId: '',
    customerName: '',
    projectName: '',
    numberOfLifts: 1,
    quotationAmount: '',
    currency: 'INR',
    quotationDate: new Date().toISOString().split('T')[0],
    submissionDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    assignedUserId: '',
    status: 'Draft' as QuotationStatus,
    notes: '',
  });

  // Revision Form State
  const [revisionData, setRevisionData] = useState({
    amount: '',
    changeNotes: '',
  });

  // Feedback Form State
  const [feedbackData, setFeedbackData] = useState({
    status: 'Submitted' as QuotationStatus,
    customerFeedback: '',
    lostReason: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (assignedFilter !== 'all') params.assignedTo = assignedFilter;

      const [qData, enqData, leadData, uData] = await Promise.all([
        api.getQuotations(params),
        api.getEnquiries(),
        api.getLeads(),
        api.getUsers(),
      ]);

      setQuotations(qData);
      setEnquiries(enqData);
      setLeads(leadData);
      setUsersList(uData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load quotations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, assignedFilter]);

  const openCreateModal = (prefillEnq?: Enquiry | null) => {
    setEditingQuote(null);
    const targetEnq = prefillEnq || (enquiries.length > 0 ? enquiries[0] : null);

    setFormData({
      enquiryId: targetEnq ? String(targetEnq.id) : '',
      leadId: targetEnq ? String(targetEnq.leadId) : '',
      customerName: targetEnq ? targetEnq.customerName : '',
      projectName: targetEnq ? targetEnq.projectName : '',
      numberOfLifts: targetEnq ? targetEnq.liftQuantity : 1,
      quotationAmount: targetEnq?.expectedBudget ? String(targetEnq.expectedBudget) : '1850000',
      currency: 'INR',
      quotationDate: new Date().toISOString().split('T')[0],
      submissionDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      assignedUserId: user?.id ? String(user.id) : '',
      status: 'Draft',
      notes: targetEnq
        ? `Quotation based on technical enquiry ${targetEnq.enquiryNumber} (${targetEnq.liftType} Elevator, ${targetEnq.ratedCapacity})`
        : '',
    });
    setIsCreateModalOpen(true);
  };

  const handleEnquirySelect = (enqIdStr: string) => {
    const selected = enquiries.find((e) => String(e.id) === enqIdStr);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        enquiryId: enqIdStr,
        leadId: String(selected.leadId),
        customerName: selected.customerName,
        projectName: selected.projectName,
        numberOfLifts: selected.liftQuantity,
        quotationAmount: selected.expectedBudget ? String(selected.expectedBudget) : prev.quotationAmount,
        notes: `Quotation based on technical enquiry ${selected.enquiryNumber} (${selected.liftType} Elevator, ${selected.ratedCapacity})`,
      }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuote) {
        await api.updateQuotation(editingQuote.id, formData);
        showToast(`Quotation ${editingQuote.quotationNumber} updated!`, 'success');
      } else {
        const created = await api.createQuotation(formData);
        showToast(`Quotation ${created.quotationNumber} generated successfully!`, 'success');
      }
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  const handleAddRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionQuote) return;
    try {
      await api.addQuotationRevision(revisionQuote.id, {
        amount: parseFloat(revisionData.amount),
        changeNotes: revisionData.changeNotes,
      });
      showToast(`Revision added for ${revisionQuote.quotationNumber}!`, 'success');
      setRevisionQuote(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Revision failed', 'error');
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackQuote) return;
    try {
      await api.updateQuotation(feedbackQuote.id, feedbackData);
      showToast(`Status updated for ${feedbackQuote.quotationNumber}!`, 'success');
      setFeedbackQuote(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Feedback update failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this quotation record?')) return;
    try {
      await api.deleteQuotation(id);
      showToast('Quotation deleted', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete quotation', 'error');
    }
  };

  const totalPipelineValue = quotations.reduce((acc, q) => acc + (q.quotationAmount || 0), 0);
  const ordersWonValue = quotations
    .filter((q) => q.status === 'Order Won')
    .reduce((acc, q) => acc + (q.quotationAmount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Quotation Tracking & Revisions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage commercial bids, revisions, approvals, client negotiations, and won orders.
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
            onClick={() => openCreateModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Quotation
          </button>
        </div>
      </div>

      {/* Metric Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total Active Quotation Pipeline</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatCurrency(totalPipelineValue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{quotations.length} Proposals Submitted</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800">Confirmed Won Orders</span>
            <div className="text-xl font-bold text-emerald-950 mt-1">
              {formatCurrency(ordersWonValue)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              {quotations.filter((q) => q.status === 'Order Won').length} Contracts Closed
            </div>
          </div>
          <div className="p-3 bg-emerald-600 text-white rounded-xl">
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-800">Negotiation & Approvals</span>
            <div className="text-xl font-bold text-amber-950 mt-1">
              {quotations.filter((q) => q.status === 'Negotiation' || q.status === 'Under Approval').length} Quotations
            </div>
            <div className="text-[11px] text-amber-700 mt-0.5">Active customer reviews</div>
          </div>
          <div className="p-3 bg-amber-500 text-white rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Filter className="w-3.5 h-3.5" /> Filter by:
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
        >
          <option value="all">All Quotation Statuses</option>
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <select
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
        >
          <option value="all">All Sales Executives</option>
          {usersList.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadData();
          }}
          className="ml-auto flex items-center gap-1"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotations..."
            className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-medium text-xs"
          >
            Search
          </button>
        </form>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Quote ID</th>
                <th className="py-3 px-4">Project & Customer</th>
                <th className="py-3 px-4">Lifts</th>
                <th className="py-3 px-4">Quoted Amount</th>
                <th className="py-3 px-4">Revision</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Quotation Date</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && quotations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading quotations...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No quotation records found.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                    onClick={async () => {
                      const fullQuote = await api.getQuotation(q.id);
                      setViewingQuote(fullQuote);
                    }}
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-700">
                      {q.quotationNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {q.projectName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Client: {q.customerName}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {q.numberOfLifts} {q.numberOfLifts > 1 ? 'Lifts' : 'Lift'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {formatCurrency(q.quotationAmount)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        R{q.revisionNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={q.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {formatDate(q.quotationDate)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      {q.assignedUser?.name || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setRevisionQuote(q);
                            setRevisionData({
                              amount: String(q.quotationAmount),
                              changeNotes: `Commercial revision R${q.revisionNumber + 1}`,
                            });
                          }}
                          title="Add Revision"
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold flex items-center gap-1"
                        >
                          <History className="w-3.5 h-3.5" /> Revise
                        </button>

                        <button
                          onClick={() => {
                            setFeedbackQuote(q);
                            setFeedbackData({
                              status: q.status,
                              customerFeedback: q.customerFeedback || '',
                              lostReason: q.lostReason || '',
                            });
                          }}
                          title="Update Status & Feedback"
                          className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[11px] font-semibold"
                        >
                          Status
                        </button>

                        {(user?.role === 'admin' || user?.role === 'manager') && (
                          <button
                            onClick={() => handleDelete(q.id)}
                            title="Delete Quotation"
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

      {/* Add / Edit Quotation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {editingQuote ? `Edit Quotation ${editingQuote.quotationNumber}` : 'Create Commercial Quotation'}
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Link Elevator Technical Enquiry
                </label>
                <select
                  value={formData.enquiryId}
                  onChange={(e) => handleEnquirySelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">Select linked enquiry (or create direct quote)...</option>
                  {enquiries.map((enq) => (
                    <option key={enq.id} value={enq.id}>
                      {enq.enquiryNumber} - {enq.customerName} ({enq.projectName} • {enq.liftQuantity}x {enq.liftType})
                    </option>
                  ))}
                </select>
              </div>

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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Number of Lifts</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.numberOfLifts}
                    onChange={(e) => setFormData({ ...formData, numberOfLifts: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Quotation Amount (INR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="1000"
                    value={formData.quotationAmount}
                    onChange={(e) => setFormData({ ...formData, quotationAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quotation Date</label>
                  <input
                    type="date"
                    value={formData.quotationDate}
                    onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as QuotationStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Under Approval">Under Approval</option>
                    <option value="Submitted">Submitted</option>
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
                <label className="block font-semibold text-slate-700 mb-1">Quotation Notes / Scope</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Includes supply, installation, testing, commissioning, ARD, and 1 year comprehensive warranty."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Generate Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Revision Modal */}
      {revisionQuote && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Add Quotation Revision (R{revisionQuote.revisionNumber + 1})
                </h2>
                <p className="text-xs text-slate-500">
                  {revisionQuote.quotationNumber} • Current: {formatCurrency(revisionQuote.quotationAmount)}
                </p>
              </div>
              <button onClick={() => setRevisionQuote(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRevisionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Revised Amount (INR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="1000"
                  value={revisionData.amount}
                  onChange={(e) => setRevisionData({ ...revisionData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Revision / Change Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={revisionData.changeNotes}
                  onChange={(e) => setRevisionData({ ...revisionData, changeNotes: e.target.value })}
                  placeholder="e.g. 5% commercial discount approved with complimentary IoT monitoring package."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRevisionQuote(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Record Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Feedback & Status Modal */}
      {feedbackQuote && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Update Status & Customer Feedback
                </h2>
                <p className="text-xs text-slate-500">
                  {feedbackQuote.quotationNumber} • {feedbackQuote.projectName}
                </p>
              </div>
              <button onClick={() => setFeedbackQuote(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quotation Status</label>
                <select
                  value={feedbackData.status}
                  onChange={(e) => setFeedbackData({ ...feedbackData, status: e.target.value as QuotationStatus })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Feedback Notes</label>
                <textarea
                  rows={2}
                  value={feedbackData.customerFeedback}
                  onChange={(e) => setFeedbackData({ ...feedbackData, customerFeedback: e.target.value })}
                  placeholder="e.g. Client liked energy efficiency of gearless traction. Board considering final sign-off."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {feedbackData.status === 'Order Lost' && (
                <div>
                  <label className="block font-semibold text-rose-700 mb-1">
                    Reason for Lost Quotation <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={feedbackData.lostReason}
                    onChange={(e) => setFeedbackData({ ...feedbackData, lostReason: e.target.value })}
                    placeholder="e.g. Competitor OTIS underquoted by 8%. Client prioritized lower upfront capital expenditure."
                    className="w-full px-3 py-2 border border-rose-300 rounded-xl bg-rose-50/50"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setFeedbackQuote(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Quotation Proposal / Revisions Modal */}
      {viewingQuote && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    {viewingQuote.quotationNumber}
                  </span>
                  <StatusBadge status={viewingQuote.status} />
                  <span className="font-mono text-xs text-slate-500 font-medium">Rev #{viewingQuote.revisionNumber}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{viewingQuote.projectName}</h2>
                <div className="text-xs text-slate-500">Customer: {viewingQuote.customerName}</div>
              </div>
              <button
                onClick={() => setViewingQuote(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Quoted Value</span>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(viewingQuote.quotationAmount)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    For {viewingQuote.numberOfLifts} {viewingQuote.numberOfLifts > 1 ? 'Elevators' : 'Elevator'}
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div>
                    <span className="text-slate-400">Date: </span>
                    <strong className="text-slate-700">{formatDate(viewingQuote.quotationDate)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Valid Until: </span>
                    <strong className="text-slate-700">{formatDate(viewingQuote.validUntil)}</strong>
                  </div>
                </div>
              </div>

              {viewingQuote.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Scope of Proposal</div>
                  <div className="text-slate-800 whitespace-pre-wrap">{viewingQuote.notes}</div>
                </div>
              )}

              {viewingQuote.customerFeedback && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                  <div className="text-[10px] uppercase font-bold text-blue-900 mb-1">Customer Feedback</div>
                  <div className="text-blue-900">{viewingQuote.customerFeedback}</div>
                </div>
              )}

              {/* Revision History Log */}
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" /> Revision History Log
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {viewingQuote.revisions && viewingQuote.revisions.length > 0 ? (
                    viewingQuote.revisions.map((rev) => (
                      <div key={rev.id} className="p-3 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700">Revision R{rev.revisionNumber}</span>
                            <span className="text-slate-400 text-[11px]">• {formatDate(rev.createdAt)}</span>
                            {rev.createdBy && (
                              <span className="text-slate-400 text-[11px]">by {rev.createdBy}</span>
                            )}
                          </div>
                          <div className="text-slate-600 mt-1">{rev.changeNotes}</div>
                        </div>
                        <div className="font-bold text-slate-900 text-sm">
                          {formatCurrency(rev.amount)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-slate-400 italic">Base revision R1 initial offer.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 text-xs font-semibold"
              >
                <Printer className="w-4 h-4" /> Print Commercial Proposal
              </button>

              <button
                onClick={() => setViewingQuote(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
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
