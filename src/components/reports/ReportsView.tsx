import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  Trophy,
  Coins,
  Percent,
  Layers,
  Users,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { api, formatCurrency } from '../../lib/api.ts';
import { ReportData } from '../../types/crm.ts';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useToast } from '../../context/ToastContext.tsx';

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export const ReportsView: React.FC = () => {
  const { showToast } = useToast();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.getReports();
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExport = (type: 'leads' | 'quotations' | 'enquiries') => {
    window.open(api.exportCsvUrl(type), '_blank');
  };

  const totalWonValue = data?.quotationsByStatus
    .filter((q) => q.status === 'Order Won')
    .reduce((acc, q) => acc + q.totalValue, 0) || 0;

  const totalQuoteValue = data?.quotationsByStatus
    .reduce((acc, q) => acc + q.totalValue, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header & Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sales & Operational Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real database metrics on elevator lead conversion, sales executive performance, and quotes.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadReports}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Reports"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> Export:
            </span>
            <button
              onClick={() => handleExport('leads')}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
            >
              Leads CSV
            </button>
            <button
              onClick={() => handleExport('quotations')}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
            >
              Quotes CSV
            </button>
            <button
              onClick={() => handleExport('enquiries')}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
            >
              Enquiries CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Conversion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Lead-to-Order Conversion Rate</span>
            <div className="text-3xl font-bold text-blue-600 mt-1">
              {data?.conversionRate || '0%'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {data?.ordersWon || 0} won out of {data?.totalLeads || 0} total leads
            </div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* Confirmed Order Value */}
        <div className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800">Confirmed Order Value</span>
            <div className="text-3xl font-bold text-emerald-950 mt-1">
              {formatCurrency(totalWonValue)}
            </div>
            <div className="text-xs text-emerald-700 mt-1">Contractually signed & booking advance</div>
          </div>
          <div className="p-3 bg-emerald-600 text-white rounded-2xl">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* Total Quotation Value (Distinct) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total Quotation Value (Pipeline)</span>
            <div className="text-3xl font-bold text-slate-900 mt-1">
              {formatCurrency(totalQuoteValue)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Distinct from confirmed orders</div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Coins className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Charts: Leads by Source & Leads by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Source */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Elevator Leads by Acquisition Source</h2>
          <p className="text-xs text-slate-500 mb-4">IndiaMART, Website, Referrals, Advertisements</p>

          <div className="h-64">
            {data?.bySource && data.bySource.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.bySource} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]}>
                    {data.bySource.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No source data recorded
              </div>
            )}
          </div>
        </div>

        {/* Quotations Breakdown by Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Quotations Status & Valuation</h2>
          <p className="text-xs text-slate-500 mb-4">Under Approval, Negotiation, Won, Lost</p>

          <div className="h-64">
            {data?.quotationsByStatus && data.quotationsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.quotationsByStatus}
                  margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                >
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      name === 'totalValue' ? formatCurrency(val) : val,
                      name === 'totalValue' ? 'Total Value' : 'Count',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No quotation metrics available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sales Executive Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Sales Executive Performance Matrix</h2>
            <p className="text-xs text-slate-500">Track assigned leads, closed elevator contracts, and won value</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
            Real Database Aggregation
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Executive Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Leads</th>
                <th className="py-3 px-4">Contracts Won</th>
                <th className="py-3 px-4">Total Revenue Won (INR)</th>
                <th className="py-3 px-4">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.execPerformance && data.execPerformance.length > 0 ? (
                data.execPerformance.map((exec) => {
                  const rate =
                    exec.leadCount > 0
                      ? ((exec.orderWonCount / exec.leadCount) * 100).toFixed(1)
                      : '0';
                  return (
                    <tr key={exec.userId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{exec.userName}</td>
                      <td className="py-3.5 px-4 capitalize text-slate-600">{exec.role}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{exec.leadCount}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {exec.orderWonCount} Lifts
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(exec.wonValue)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No executive records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
