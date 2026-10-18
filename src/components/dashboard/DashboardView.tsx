import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarCheck,
  FileSpreadsheet,
  FileCheck2,
  ClockAlert,
  Trophy,
  XCircle,
  Coins,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Building,
  Phone,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Compass,
  PhoneCall,
  TrendingUp,
  FileText,
  AlertTriangle,
  Send,
  Eye,
  Check,
} from 'lucide-react';
import { api, formatCurrency, formatDate } from '../../lib/api.ts';
import { DashboardData, Enquiry, Quotation } from '../../types/crm.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface DashboardViewProps {
  onOpenNewLead: () => void;
  onOpenScheduleVisit: () => void;
  onOpenNewEnquiry: () => void;
  onOpenNewQuotation: () => void;
  onOpenLogCall?: () => void;
  onNavigateTab: (tab: string) => void;
}

const COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewLead,
  onOpenScheduleVisit,
  onOpenNewEnquiry,
  onOpenNewQuotation,
  onOpenLogCall,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Review Modal for Engineer / Manager from Dashboard
  const [reviewingEnquiry, setReviewingEnquiry] = useState<Enquiry | null>(null);
  const [reviewStatus, setReviewStatus] = useState('Approved');
  const [reviewNotes, setReviewNotes] = useState('Shaft clear dimensions and pit depth verified against engineering standards.');

  // Approval Modal for Manager / Admin from Dashboard
  const [approvingQuote, setApprovingQuote] = useState<Quotation | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('Approved with standard warranty and payment milestones.');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.role]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingEnquiry) return;
    try {
      await api.reviewEnquiry(reviewingEnquiry.id, {
        reviewStatus,
        reviewNotes,
      });
      showToast(`Technical review recorded for ${reviewingEnquiry.enquiryNumber}!`, 'success');
      setReviewingEnquiry(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Review submission failed', 'error');
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingQuote) return;
    try {
      await api.approveQuotation(approvingQuote.id, { approvalNotes });
      showToast(`Quotation ${approvingQuote.quotationNumber} approved!`, 'success');
      setApprovingQuote(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Approval failed', 'error');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          Loading role-specific workspace...
        </div>
      </div>
    );
  }

  const role = user?.role || 'executive';
  const metrics = data?.metrics || {
    totalLeads: 0,
    newLeads: 0,
    todaySiteVisits: 0,
    completedSiteVisits: 0,
    pendingFollowUps: 0,
    totalEnquiries: 0,
    quotationsSubmitted: 0,
    ordersWon: 0,
    ordersLost: 0,
    totalQuotationValue: 0,
    confirmedOrderValue: 0,
    callsMadeToday: 0,
    callbacksDue: 0,
    pendingTechnicalReviews: 0,
    incompleteSpecsCount: 0,
    quotesAwaitingApproval: 0,
  };

  const chartData = (data?.statusDistribution || []).map((item) => ({
    name: item.status,
    count: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* Role Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {role === 'admin' && 'Enterprise Executive Dashboard'}
              {role === 'manager' && 'Sales Manager Team Dashboard'}
              {role === 'executive' && 'Sales Executive Workspace'}
              {role === 'telecaller' && 'Telecalling & Lead Qualification Center'}
              {role === 'engineer' && 'Elevator Engineering & Specs Review'}
              {role === 'commercial' && 'Commercial Bids & Estimations Desk'}
              {role === 'director' && 'Executive Business Intelligence & Pipeline'}
              {role === 'customer' && 'Builder & Client Elevator Portal'}
            </h1>
            <StatusBadge status={role} />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {role === 'admin' && 'Full system visibility, company-wide revenue, and audit trails.'}
            {role === 'manager' && 'Supervising sales subordinates, approving commercial quotations, and team visits.'}
            {role === 'executive' && 'Managing your assigned prospective customers, physical hoistway surveys, and follow-ups.'}
            {role === 'telecaller' && 'Outbound discovery calls, qualification, and scheduled callbacks.'}
            {role === 'engineer' && 'Shaft dimensions, pit depth, overhead clearances, and technical feasibility.'}
            {role === 'commercial' && 'Quotation pricing, multi-version revisions, and commercial contract terms.'}
            {role === 'director' && 'High-level order conversion, revenue won, loss analysis, and regional trends.'}
            {role === 'customer' && 'Track elevator specifications and view formal proposals shared with you.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
            title="Refresh database metrics"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {(role === 'admin' || role === 'manager' || role === 'executive' || role === 'telecaller') && (
            <button
              onClick={onOpenNewLead}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Lead
            </button>
          )}

          {(role === 'admin' || role === 'manager' || role === 'executive' || role === 'engineer') && (
            <button
              onClick={onOpenScheduleVisit}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <CalendarCheck className="w-4 h-4 text-indigo-600" /> Schedule Visit
            </button>
          )}

          {(role === 'admin' || role === 'manager' || role === 'commercial') && (
            <button
              onClick={onOpenNewQuotation}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-600" /> Prepare Bid
            </button>
          )}
        </div>
      </div>

      {/* ROLE SPECIFIC DASHBOARD CONTENT */}

      {/* 1. SUPER ADMIN / OWNER VIEW */}
      {role === 'admin' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div onClick={() => onNavigateTab('leads')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-blue-400 transition-all">
              <span className="text-xs font-medium text-slate-500">Total Leads</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{metrics.totalLeads}</div>
              <div className="text-[11px] text-blue-600 font-medium mt-1">{metrics.newLeads} New Prospects</div>
            </div>
            <div onClick={() => onNavigateTab('visits')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-indigo-400 transition-all">
              <span className="text-xs font-medium text-slate-500">Site Inspections Today</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{metrics.todaySiteVisits}</div>
              <div className="text-[11px] text-indigo-600 font-medium mt-1">{metrics.completedSiteVisits} Completed</div>
            </div>
            <div onClick={() => onNavigateTab('followups')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-amber-400 transition-all">
              <span className="text-xs font-medium text-slate-500">Pending Follow-ups</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{metrics.pendingFollowUps}</div>
              <div className="text-[11px] text-amber-600 font-medium mt-1">Requires follow-up</div>
            </div>
            <div onClick={() => onNavigateTab('quotations')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-emerald-400 transition-all">
              <span className="text-xs font-medium text-slate-500">Total Pipeline Value</span>
              <div className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(metrics.totalQuotationValue)}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1">{metrics.quotationsSubmitted} Active Bids</div>
            </div>
            <div onClick={() => onNavigateTab('reports')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-purple-400 transition-all col-span-2 sm:col-span-1">
              <span className="text-xs font-medium text-slate-500">Confirmed Won Value</span>
              <div className="mt-2 text-xl font-bold text-emerald-700">{formatCurrency(metrics.confirmedOrderValue)}</div>
              <div className="text-[11px] text-purple-600 font-medium mt-1">{metrics.ordersWon} Orders Signed</div>
            </div>
          </div>
        </>
      )}

      {/* 2. SALES MANAGER VIEW */}
      {role === 'manager' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Team Leads Managed</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{metrics.totalLeads}</div>
              <div className="text-[11px] text-blue-600 mt-1">Assigned across field team</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-amber-800">Quotes Awaiting My Approval</span>
              <div className="mt-2 text-2xl font-bold text-amber-950">{metrics.quotesAwaitingApproval}</div>
              <div className="text-[11px] text-amber-700 mt-1">Commercial proposals ready for review</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Team Site Visits</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{metrics.todaySiteVisits} Today</div>
              <div className="text-[11px] text-indigo-600 mt-1">{metrics.completedSiteVisits} Completed total</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-emerald-800">Team Orders Won</span>
              <div className="mt-2 text-2xl font-bold text-emerald-950">{metrics.ordersWon} Lifts</div>
              <div className="text-[11px] text-emerald-700 mt-1">{formatCurrency(metrics.confirmedOrderValue)} Won</div>
            </div>
          </div>

          {/* Quotation Approval Queue for Manager */}
          {data?.pendingQuotesForReview && data.pendingQuotesForReview.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h2 className="text-sm font-bold text-slate-900">Quotation Approval Queue (Action Required)</h2>
                </div>
                <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                  {data.pendingQuotesForReview.length} Pending Approval
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {data.pendingQuotesForReview.map((q) => (
                  <div key={q.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-700">{q.quotationNumber}</span>
                        <span className="font-semibold text-slate-900">{q.projectName}</span>
                        <span className="text-slate-400">• Client: {q.customerName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Amount: <strong>{formatCurrency(q.quotationAmount)}</strong> • {q.numberOfLifts} Lifts • Rev #{q.revisionNumber}
                      </div>
                    </div>
                    <button
                      onClick={() => setApprovingQuote(q)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" /> Review & Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 3. SALES EXECUTIVE VIEW */}
      {role === 'executive' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">My Assigned Leads</span>
              <div className="mt-2 text-2xl font-bold text-blue-600">{metrics.totalLeads}</div>
              <div className="text-[11px] text-slate-500 mt-1">Directly in my pipeline</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">My Site Visits Today</span>
              <div className="mt-2 text-2xl font-bold text-indigo-600">{metrics.todaySiteVisits}</div>
              <div className="text-[11px] text-slate-500 mt-1">Hoistway surveys scheduled</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">My Pending Follow-ups</span>
              <div className="mt-2 text-2xl font-bold text-amber-600">{metrics.pendingFollowUps}</div>
              <div className="text-[11px] text-slate-500 mt-1">Calls & meetings due</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">My Closed Orders Won</span>
              <div className="mt-2 text-2xl font-bold text-emerald-600">{metrics.ordersWon}</div>
              <div className="text-[11px] text-emerald-700 mt-1">{formatCurrency(metrics.confirmedOrderValue)} Won</div>
            </div>
          </div>
        </>
      )}

      {/* 4. TELECALLING / LEAD GEN VIEW */}
      {role === 'telecaller' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Calls Logged Today</span>
              <div className="mt-2 text-2xl font-bold text-emerald-600">{metrics.callsMadeToday}</div>
              <div className="text-[11px] text-slate-500 mt-1">Customer phone dials</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-amber-800">Callbacks Due Today</span>
              <div className="mt-2 text-2xl font-bold text-amber-950">{metrics.callbacksDue}</div>
              <div className="text-[11px] text-amber-700 mt-1">Customer requested callbacks</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">New Uncontacted Leads</span>
              <div className="mt-2 text-2xl font-bold text-blue-600">{metrics.newLeads}</div>
              <div className="text-[11px] text-slate-500 mt-1">Awaiting first call</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Leads Qualified</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{metrics.totalLeads}</div>
              <div className="text-[11px] text-slate-500 mt-1">Handed over to field team</div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-emerald-950">Quick Call Recording</h3>
              <p className="text-xs text-emerald-800">Record customer phone response and auto-schedule next callback date.</p>
            </div>
            {onOpenLogCall && (
              <button
                onClick={onOpenLogCall}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
              >
                <PhoneCall className="w-4 h-4" /> Log Customer Call
              </button>
            )}
          </div>
        </>
      )}

      {/* 5. TECHNICAL / ENQUIRY ENGINEER VIEW */}
      {role === 'engineer' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-amber-800">Pending Technical Reviews</span>
              <div className="mt-2 text-2xl font-bold text-amber-950">{metrics.pendingTechnicalReviews}</div>
              <div className="text-[11px] text-amber-700 mt-1">Requires hoistway dimension verification</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Incomplete Specifications</span>
              <div className="mt-2 text-2xl font-bold text-rose-600">{metrics.incompleteSpecsCount}</div>
              <div className="text-[11px] text-rose-700 mt-1">Needs site measurement clarification</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Lift Enquiries</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{metrics.totalEnquiries}</div>
              <div className="text-[11px] text-slate-500 mt-1">Passenger, Goods, Hospital & MRL</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Site Shaft Surveys</span>
              <div className="mt-2 text-2xl font-bold text-indigo-600">{metrics.todaySiteVisits} Today</div>
              <div className="text-[11px] text-slate-500 mt-1">Physical hoistway check</div>
            </div>
          </div>

          {/* Engineer Enquiry Review Queue */}
          {data?.assignedEnquiries && data.assignedEnquiries.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-900">Technical Hoistway Review Queue</h2>
                </div>
                <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                  Engineer Assigned
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {data.assignedEnquiries.map((enq) => (
                  <div key={enq.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700">{enq.enquiryNumber}</span>
                        <span className="font-semibold text-slate-900">{enq.projectName}</span>
                        <StatusBadge status={enq.technicalReviewStatus || 'Pending Review'} size="sm" />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Specs: <strong>{enq.liftQuantity}x {enq.liftType} Lift ({enq.ratedCapacity})</strong> • Shaft: {enq.shaftDimensions || '1800x1900'} • Pit: {enq.pitDepth || '1500mm'} • OH: {enq.overheadClearance || '4500mm'}
                      </div>
                    </div>
                    <button
                      onClick={() => setReviewingEnquiry(enq)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" /> Sign-off Specs
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 6. COMMERCIAL / ESTIMATION EXECUTIVE VIEW */}
      {role === 'commercial' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Quotations Prepared</span>
              <div className="mt-2 text-2xl font-bold text-teal-700">{metrics.quotationsSubmitted}</div>
              <div className="text-[11px] text-slate-500 mt-1">Commercial proposals</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Pipeline Quoted Value</span>
              <div className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(metrics.totalQuotationValue)}</div>
              <div className="text-[11px] text-slate-500 mt-1">Active bids submitted</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-amber-800">Under Manager Approval</span>
              <div className="mt-2 text-2xl font-bold text-amber-950">{metrics.quotesAwaitingApproval}</div>
              <div className="text-[11px] text-amber-700 mt-1">Awaiting price authorization</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-emerald-800">Won Contracts</span>
              <div className="mt-2 text-2xl font-bold text-emerald-950">{metrics.ordersWon}</div>
              <div className="text-[11px] text-emerald-700 mt-1">{formatCurrency(metrics.confirmedOrderValue)}</div>
            </div>
          </div>
        </>
      )}

      {/* 7. MANAGING DIRECTOR VIEW */}
      {role === 'director' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Sales Pipeline</span>
              <div className="mt-2 text-3xl font-extrabold text-blue-600">{formatCurrency(metrics.totalQuotationValue)}</div>
              <div className="text-xs text-slate-500 mt-1">{metrics.totalLeads} total projects in pipeline</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-emerald-800 uppercase">Confirmed Contract Revenue</span>
              <div className="mt-2 text-3xl font-extrabold text-emerald-950">{formatCurrency(metrics.confirmedOrderValue)}</div>
              <div className="text-xs text-emerald-700 mt-1">{metrics.ordersWon} contracts won & signed</div>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-rose-800 uppercase">Lost Opportunities</span>
              <div className="mt-2 text-3xl font-extrabold text-rose-950">{metrics.ordersLost} Records</div>
              <div className="text-xs text-rose-700 mt-1">Competitor & pricing analysis logged</div>
            </div>
          </div>
        </>
      )}

      {/* 8. BUILDER / CLIENT PORTAL VIEW */}
      {role === 'customer' && (
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 space-y-4">
          <div className="flex items-center gap-3">
            <Building className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-blue-950">Welcome to the Builder & Architect Elevator Portal</h2>
              <p className="text-xs text-blue-800">
                Track your building elevator hoistway specs, view formal price proposals, and download GA drawings.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs">
              <div className="text-xs font-semibold text-slate-500">My Elevator Specifications</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalEnquiries} Projects</div>
              <button
                onClick={() => onNavigateTab('enquiries')}
                className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
              >
                View technical specifications →
              </button>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs">
              <div className="text-xs font-semibold text-slate-500">Commercial Quotations Shared</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.quotationsSubmitted} Active Offers</div>
              <button
                onClick={() => onNavigateTab('quotations')}
                className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
              >
                View quotation documents →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Chart & Today Schedule (For Operational Roles) */}
      {role !== 'customer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Pipeline Stage Distribution</h2>
                <p className="text-xs text-slate-500">Authorized records in your organizational scope</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                {metrics.totalLeads} Total
              </span>
            </div>

            <div className="h-60 mt-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  No records found in scope
                </div>
              )}
            </div>
          </div>

          {/* Today's Schedule or Audit Logs depending on role */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {role === 'admin' || role === 'director' ? 'Enterprise Audit Activity Log' : "Today's Schedule & Site Inspections"}
                </h2>
                <p className="text-xs text-slate-500">
                  {role === 'admin' || role === 'director' ? 'Real-time security and operations log' : 'Hoistway measurements & meetings'}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 divide-y divide-slate-100 text-xs">
              {role === 'admin' || role === 'director' ? (
                data?.recentAuditLogs && data.recentAuditLogs.length > 0 ? (
                  data.recentAuditLogs.map((log) => (
                    <div key={log.id} className="py-2.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="font-mono text-blue-600 text-[11px]">{log.action}</span>
                        <span className="text-slate-400 text-[10px]">{formatDate(log.createdAt)}</span>
                      </div>
                      <div className="text-slate-700 mt-0.5">{log.details}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">By {log.userName || 'System'} ({log.userRole || 'admin'})</div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>
                )
              ) : data?.todayVisits && data.todayVisits.length > 0 ? (
                data.todayVisits.map((visit) => (
                  <div key={visit.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{visit.projectName}</span>
                        <StatusBadge status={visit.status} size="sm" />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{visit.visitTime || '10:00 AM'}</span>
                        <span>•</span>
                        <span>{visit.siteAddress}</span>
                      </div>
                    </div>
                    <span className="font-mono text-slate-400">{visit.visitNumber}</span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No site visits scheduled for today in your scope.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Engineer Technical Review Modal */}
      {reviewingEnquiry && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Technical Spec Review: {reviewingEnquiry.enquiryNumber}
                </h2>
                <p className="text-xs text-slate-500">{reviewingEnquiry.projectName}</p>
              </div>
              <button onClick={() => setReviewingEnquiry(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-slate-700">
                <div><strong>Specs:</strong> {reviewingEnquiry.liftQuantity}x {reviewingEnquiry.liftType} Lift ({reviewingEnquiry.ratedCapacity})</div>
                <div><strong>Shaft Dimensions:</strong> {reviewingEnquiry.shaftDimensions || '1800x1900 mm'}</div>
                <div><strong>Pit Depth:</strong> {reviewingEnquiry.pitDepth || '1500 mm'} • <strong>Overhead:</strong> {reviewingEnquiry.overheadClearance || '4500 mm'}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technical Review Decision</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Approved">Approved (Ready for Commercial Quotation)</option>
                  <option value="Needs Clarification">Needs Clarification (Incomplete Specs)</option>
                  <option value="Incomplete Specs">Return for Site Re-measurement</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Engineer Notes & Feasibility Sign-off</label>
                <textarea
                  required
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReviewingEnquiry(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Save Review Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quotation Approval Modal for Sales Manager / Admin */}
      {approvingQuote && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Manager Approval: {approvingQuote.quotationNumber}
                </h2>
                <p className="text-xs text-slate-500">{approvingQuote.projectName} • {formatCurrency(approvingQuote.quotationAmount)}</p>
              </div>
              <button onClick={() => setApprovingQuote(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                <div>Client: <strong>{approvingQuote.customerName}</strong></div>
                <div>Quoted Amount: <strong>{formatCurrency(approvingQuote.quotationAmount)}</strong> (Rev #{approvingQuote.revisionNumber})</div>
                <div>Lifts: <strong>{approvingQuote.numberOfLifts} Units</strong></div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Approval Comments & Authorization Note</label>
                <textarea
                  required
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setApprovingQuote(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Approve Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
