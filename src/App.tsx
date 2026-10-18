import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { LeadsView } from './components/leads/LeadsView.tsx';
import { SiteVisitsView } from './components/visits/SiteVisitsView.tsx';
import { EnquiriesView } from './components/enquiries/EnquiriesView.tsx';
import { QuotationsView } from './components/quotations/QuotationsView.tsx';
import { FollowUpsView } from './components/followups/FollowUpsView.tsx';
import { CallsView } from './components/calls/CallsView.tsx';
import { AuditView } from './components/audit/AuditView.tsx';
import { MonitoringView } from './components/monitoring/MonitoringView.tsx';
import { ReportsView } from './components/reports/ReportsView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { Enquiry, Lead } from './types/crm.ts';
import { RefreshCw } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isLoading, trackPage } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Cross-module prefill states
  const [activeLeadForEnquiry, setActiveLeadForEnquiry] = useState<Lead | null>(null);
  const [activeEnquiryForQuote, setActiveEnquiryForQuote] = useState<Enquiry | null>(null);

  useEffect(() => {
    if (user) {
      trackPage('Dashboard', '/dashboard');
    }
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin text-white" />
          </div>
          <div className="text-sm font-semibold tracking-wide">Elevator Sales CRM</div>
          <div className="text-xs text-slate-400">Connecting to PostgreSQL Cloud SQL...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const handleOpenNewLead = () => {
    setCurrentTab('leads');
    trackPage('Leads', '/leads');
  };

  const handleOpenScheduleVisit = () => {
    setCurrentTab('visits');
    trackPage('Site Visits', '/visits');
  };

  const handleOpenNewEnquiry = () => {
    setCurrentTab('enquiries');
    trackPage('Technical Enquiries', '/enquiries');
  };

  const handleOpenNewQuotation = () => {
    setCurrentTab('quotations');
    trackPage('Quotations', '/quotations');
  };

  const handleOpenLogCall = () => {
    setCurrentTab('calls');
    trackPage('Call Records', '/calls');
  };

  const handleOpenCreateQuotationWithEnquiry = (enq: Enquiry) => {
    setActiveEnquiryForQuote(enq);
    setCurrentTab('quotations');
    trackPage('Quotations', '/quotations');
  };

  return (
    <AppLayout
      currentTab={currentTab}
      setCurrentTab={(tab) => {
        setCurrentTab(tab);
        trackPage(tab.charAt(0).toUpperCase() + tab.slice(1), `/${tab}`);
      }}
      onOpenNewLead={handleOpenNewLead}
      onOpenScheduleVisit={handleOpenScheduleVisit}
      onOpenNewEnquiry={handleOpenNewEnquiry}
      onOpenNewQuotation={handleOpenNewQuotation}
      onOpenLogCall={handleOpenLogCall}
    >
      {currentTab === 'dashboard' && (
        <DashboardView
          onOpenNewLead={handleOpenNewLead}
          onOpenScheduleVisit={handleOpenScheduleVisit}
          onOpenNewEnquiry={handleOpenNewEnquiry}
          onOpenNewQuotation={handleOpenNewQuotation}
          onOpenLogCall={handleOpenLogCall}
          onNavigateTab={(tab) => {
            setCurrentTab(tab);
            trackPage(tab.charAt(0).toUpperCase() + tab.slice(1), `/${tab}`);
          }}
        />
      )}

      {currentTab === 'leads' && <LeadsView />}

      {currentTab === 'visits' && <SiteVisitsView />}

      {currentTab === 'enquiries' && (
        <EnquiriesView
          onOpenCreateQuotationWithEnquiry={handleOpenCreateQuotationWithEnquiry}
        />
      )}

      {currentTab === 'quotations' && (
        <QuotationsView initialEnquiry={activeEnquiryForQuote} />
      )}

      {currentTab === 'followups' && <FollowUpsView />}

      {currentTab === 'calls' && <CallsView onOpenNewLead={handleOpenNewLead} />}

      {currentTab === 'monitoring' && <MonitoringView />}

      {currentTab === 'audit' && <AuditView />}

      {currentTab === 'reports' && <ReportsView />}

      {currentTab === 'settings' && <SettingsView />}
    </AppLayout>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
