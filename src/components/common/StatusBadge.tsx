import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getColors = (s: string) => {
    switch (s) {
      // Order Won / Completed / Approved
      case 'Order Won':
      case 'Completed':
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20';
      // New / Planned / Draft
      case 'New':
      case 'Planned':
      case 'Draft':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20';
      // Meeting Scheduled / Site Visit Completed / Technical Review
      case 'Meeting Scheduled':
      case 'Site Visit Completed':
      case 'Technical Review':
      case 'Under Approval':
      case 'Pending Review':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20';
      // Negotiation / Quotation Submitted / Pending Quotation / Follow-up Pending
      case 'Negotiation':
      case 'Quotation Submitted':
      case 'Pending Quotation':
      case 'Quotation Created':
      case 'Follow-up Pending':
      case 'Revision Required':
      case 'Needs Clarification':
      case 'Incomplete Specs':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20';
      // Overdue / Order Lost / Cancelled / Expired
      case 'Overdue':
      case 'Order Lost':
      case 'Cancelled':
      case 'Expired':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20';
      // Contacted / Enquiry Received / Pending
      case 'Contacted':
      case 'Enquiry Received':
      case 'Pending':
        return 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/20';
      // Roles
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-300 ring-purple-500/20';
      case 'manager':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300 ring-cyan-500/20';
      case 'executive':
        return 'bg-blue-100 text-blue-800 border-blue-300 ring-blue-500/20';
      case 'telecaller':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-500/20';
      case 'engineer':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300 ring-indigo-500/20';
      case 'commercial':
        return 'bg-teal-100 text-teal-800 border-teal-300 ring-teal-500/20';
      case 'director':
        return 'bg-slate-800 text-slate-100 border-slate-700 ring-slate-500/20';
      case 'customer':
        return 'bg-amber-100 text-amber-800 border-amber-300 ring-amber-500/20';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/20';
    }
  };

  const getLabel = (s: string) => {
    switch (s) {
      case 'admin':
        return 'Super Admin';
      case 'manager':
        return 'Sales Manager';
      case 'executive':
        return 'Sales Exec';
      case 'telecaller':
        return 'Telecaller';
      case 'engineer':
        return 'Technical Eng';
      case 'commercial':
        return 'Commercial Exec';
      case 'director':
        return 'Director';
      case 'customer':
        return 'Builder Portal';
      default:
        return s;
    }
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ring-1 ring-inset ${pad} ${getColors(
        status
      )}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {getLabel(status)}
    </span>
  );
};
