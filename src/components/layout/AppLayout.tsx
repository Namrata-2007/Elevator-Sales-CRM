import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileSpreadsheet,
  FileCheck2,
  ClockAlert,
  BarChart3,
  Settings,
  Bell,
  Plus,
  LogOut,
  ChevronDown,
  Building2,
  Menu,
  X,
  Search,
  CheckCircle2,
  UserCheck,
  PhoneCall,
  Compass,
  FileText,
  Shield,
  Briefcase,
  Layers,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole, FollowUp } from '../../types/crm.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { api } from '../../lib/api.ts';

interface AppLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
  onOpenNewLead: () => void;
  onOpenScheduleVisit: () => void;
  onOpenNewEnquiry: () => void;
  onOpenNewQuotation: () => void;
  onOpenLogCall?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  setCurrentTab,
  children,
  onOpenNewLead,
  onOpenScheduleVisit,
  onOpenNewEnquiry,
  onOpenNewQuotation,
  onOpenLogCall,
}) => {
  const { user, loginWithRole, logout, trackPage } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [urgentFollowUps, setUrgentFollowUps] = useState<FollowUp[]>([]);

  const fetchUrgentTasks = async () => {
    try {
      const all = await api.getFollowUps();
      const urgent = all.filter((f) => f.bucket === 'Overdue' || f.bucket === 'Today');
      setUrgentFollowUps(urgent);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUrgentTasks();
    const timer = setInterval(fetchUrgentTasks, 30000);
    return () => clearInterval(timer);
  }, []);

  const userRole = user?.role || 'executive';

  // Dynamic Navigation based on Role & Permissions
  const getNavItems = () => {
    switch (userRole) {
      case 'admin':
        return [
          { id: 'dashboard', label: 'Company Dashboard', icon: LayoutDashboard },
          { id: 'leads', label: 'All Leads', icon: Users },
          { id: 'visits', label: 'Site Visits', icon: CalendarCheck },
          { id: 'enquiries', label: 'Technical Enquiries', icon: FileSpreadsheet },
          { id: 'quotations', label: 'Commercial Bids', icon: FileCheck2 },
          {
            id: 'followups',
            label: 'All Follow-ups',
            icon: ClockAlert,
            badge: urgentFollowUps.length > 0 ? urgentFollowUps.length : undefined,
          },
          { id: 'calls', label: 'Call Records', icon: PhoneCall },
          { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
          { id: 'monitoring', label: 'Activity Monitoring', icon: Activity },
          { id: 'audit', label: 'Audit Log Activity', icon: Shield },
          { id: 'settings', label: 'Settings & RBAC Matrix', icon: Settings },
        ];

      case 'manager':
        return [
          { id: 'dashboard', label: 'Team Dashboard', icon: LayoutDashboard },
          { id: 'leads', label: 'Team Leads & Assignment', icon: Users },
          { id: 'visits', label: 'Site Inspections', icon: CalendarCheck },
          { id: 'enquiries', label: 'Technical Enquiries', icon: FileSpreadsheet },
          { id: 'quotations', label: 'Quotation Approvals', icon: FileCheck2 },
          {
            id: 'followups',
            label: 'Team Follow-ups',
            icon: ClockAlert,
            badge: urgentFollowUps.length > 0 ? urgentFollowUps.length : undefined,
          },
          { id: 'monitoring', label: 'Team Activity Logs', icon: Activity },
          { id: 'reports', label: 'Sales Performance', icon: BarChart3 },
        ];

      case 'executive':
        return [
          { id: 'dashboard', label: 'My Sales Dashboard', icon: LayoutDashboard },
          { id: 'leads', label: 'My Assigned Leads', icon: Users },
          { id: 'visits', label: 'My Site Visits', icon: CalendarCheck },
          { id: 'enquiries', label: 'My Lift Enquiries', icon: FileSpreadsheet },
          { id: 'quotations', label: 'My Quotations', icon: FileCheck2 },
          {
            id: 'followups',
            label: 'My Follow-up Tasks',
            icon: ClockAlert,
            badge: urgentFollowUps.length > 0 ? urgentFollowUps.length : undefined,
          },
        ];

      case 'telecaller':
        return [
          { id: 'dashboard', label: 'Telecaller Dashboard', icon: LayoutDashboard },
          { id: 'leads', label: 'Lead Generation', icon: Users },
          { id: 'calls', label: 'Call Log & History', icon: PhoneCall },
          {
            id: 'followups',
            label: 'Callbacks Due',
            icon: ClockAlert,
            badge: urgentFollowUps.length > 0 ? urgentFollowUps.length : undefined,
          },
        ];

      case 'engineer':
        return [
          { id: 'dashboard', label: 'Engineering Dashboard', icon: LayoutDashboard },
          { id: 'enquiries', label: 'Technical Specs & Reviews', icon: FileSpreadsheet },
          { id: 'visits', label: 'Hoistway Measurements', icon: CalendarCheck },
        ];

      case 'commercial':
        return [
          { id: 'dashboard', label: 'Commercial Dashboard', icon: LayoutDashboard },
          { id: 'quotations', label: 'Quotations & Bids', icon: FileCheck2 },
          { id: 'enquiries', label: 'Technical Enquiries', icon: FileSpreadsheet },
          { id: 'followups', label: 'Commercial Follow-ups', icon: ClockAlert },
        ];

      case 'director':
        return [
          { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
          { id: 'reports', label: 'Pipeline & Sales Analytics', icon: BarChart3 },
          { id: 'leads', label: 'Executive Lead Pipeline', icon: Users },
          { id: 'quotations', label: 'Commercial Bids Portfolio', icon: FileCheck2 },
          { id: 'monitoring', label: 'User Activity & Sessions', icon: Activity },
          { id: 'audit', label: 'Enterprise Audit Trail', icon: Shield },
        ];

      case 'customer':
        return [
          { id: 'dashboard', label: 'Builder Portal', icon: LayoutDashboard },
          { id: 'enquiries', label: 'My Lift Specifications', icon: FileSpreadsheet },
          { id: 'quotations', label: 'Commercial Proposals', icon: FileCheck2 },
        ];

      default:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'leads', label: 'Leads', icon: Users },
        ];
    }
  };

  const navItems = getNavItems();

  const handleRoleSwitch = async (role: UserRole) => {
    setRoleMenuOpen(false);
    await loginWithRole(role);
    window.location.reload();
  };

  const getRoleDisplayName = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'Super Admin / Owner';
      case 'manager':
        return 'Sales Manager';
      case 'executive':
        return 'Sales Executive';
      case 'telecaller':
        return 'Telecalling Lead Gen';
      case 'engineer':
        return 'Technical / Enquiry Eng';
      case 'commercial':
        return 'Commercial & Bids Exec';
      case 'director':
        return 'Managing Director';
      case 'customer':
        return 'Builder / Customer Portal';
      default:
        return r;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-900/40 border border-blue-400/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white font-bold tracking-tight text-sm flex items-center gap-1.5">
                APEX ELEVATORS
              </div>
              <div className="text-[10px] text-blue-400 font-medium tracking-wide">
                ENTERPRISE RBAC CRM
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Persona Switcher Widget */}
        <div className="px-3 pt-3 pb-2 border-b border-slate-800/80">
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 text-xs">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Active Job Role</span>
              <span
                className="text-[10px] text-blue-400 hover:underline cursor-pointer font-bold"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              >
                Switch Role ▾
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-left text-white hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="font-semibold text-xs truncate">
                    {getRoleDisplayName(userRole)}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {roleMenuOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-850 rounded-xl shadow-2xl border border-slate-700 py-1.5 z-50 max-h-80 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
                    Select CRM Role Persona
                  </div>

                  {[
                    { r: 'admin', title: 'Super Admin / Owner', desc: 'Full authority & configuration' },
                    { r: 'manager', title: 'Sales Manager', desc: 'Team oversight & quote approvals' },
                    { r: 'executive', title: 'Sales Executive', desc: 'Field leads & measurements' },
                    { r: 'telecaller', title: 'Telecalling Executive', desc: 'Lead generation & calls' },
                    { r: 'engineer', title: 'Technical Engineer', desc: 'Hoistway & drawing reviews' },
                    { r: 'commercial', title: 'Commercial Executive', desc: 'Quotation bids & revisions' },
                    { r: 'director', title: 'Managing Director', desc: 'Executive revenue & analytics' },
                    { r: 'customer', title: 'Builder Portal', desc: 'Client requirement tracking' },
                  ].map((item) => (
                    <button
                      key={item.r}
                      onClick={() => handleRoleSwitch(item.r as UserRole)}
                      className={`w-full px-3 py-2 text-left text-xs flex flex-col hover:bg-slate-800 transition-colors ${
                        userRole === item.r ? 'bg-blue-900/30 text-blue-400 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{item.title}</span>
                        {userRole === item.r && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">{item.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user?.department && (
              <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between">
                <span>Dept: {user.department}</span>
                <span className="text-slate-500">{user.region || 'HQ'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  trackPage(item.label, `/${item.id}`);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-700/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-white text-blue-700' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Active User Card & Sign Out */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-semibold text-white truncate">
                {user?.name || 'Active User'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
              <div className="mt-1">
                <StatusBadge status={userRole} size="sm" />
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-slate-400 bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200 w-64 md:w-80">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search authorized records..."
                className="bg-transparent border-none text-xs text-slate-900 focus:outline-none w-full placeholder:text-slate-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCurrentTab('leads');
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Role Badge in Header */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Access Level:</span>
              <StatusBadge status={userRole} size="sm" />
            </div>

            {/* Role-Specific Quick Action Button */}
            {userRole !== 'director' && userRole !== 'customer' && (
              <div className="relative">
                <button
                  onClick={() => setQuickActionOpen(!quickActionOpen)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm px-3 sm:px-3.5 py-2 rounded-xl shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Action</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {quickActionOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95"
                    onClick={() => setQuickActionOpen(false)}
                  >
                    {(userRole === 'admin' || userRole === 'manager' || userRole === 'executive' || userRole === 'telecaller') && (
                      <button
                        onClick={onOpenNewLead}
                        className="w-full px-4 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5"
                      >
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Add New Lead</span>
                      </button>
                    )}

                    {(userRole === 'admin' || userRole === 'manager' || userRole === 'executive' || userRole === 'engineer') && (
                      <button
                        onClick={onOpenScheduleVisit}
                        className="w-full px-4 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5"
                      >
                        <CalendarCheck className="w-4 h-4 text-indigo-600" />
                        <span>Schedule Site Visit</span>
                      </button>
                    )}

                    {(userRole === 'admin' || userRole === 'manager' || userRole === 'executive' || userRole === 'engineer') && (
                      <button
                        onClick={onOpenNewEnquiry}
                        className="w-full px-4 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-sky-600" />
                        <span>Technical Lift Enquiry</span>
                      </button>
                    )}

                    {(userRole === 'admin' || userRole === 'manager' || userRole === 'commercial') && (
                      <button
                        onClick={onOpenNewQuotation}
                        className="w-full px-4 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5"
                      >
                        <FileCheck2 className="w-4 h-4 text-emerald-600" />
                        <span>Prepare Commercial Bid</span>
                      </button>
                    )}

                    {(userRole === 'telecaller' || userRole === 'executive') && onOpenLogCall && (
                      <button
                        onClick={onOpenLogCall}
                        className="w-full px-4 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5"
                      >
                        <PhoneCall className="w-4 h-4 text-emerald-600" />
                        <span>Record Customer Call</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* In-App Notifications for Overdue / Today's Follow-ups */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Follow-up Notifications"
              >
                <Bell className="w-5 h-5" />
                {urgentFollowUps.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-40 animate-in fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                      <ClockAlert className="w-4 h-4 text-amber-600" />
                      Pending Follow-up Alerts
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                      {urgentFollowUps.length} Due
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 py-2">
                    {urgentFollowUps.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No pending follow-ups overdue or due today!
                      </div>
                    ) : (
                      urgentFollowUps.map((flw) => (
                        <div
                          key={flw.id}
                          className="py-2.5 px-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => {
                            setCurrentTab('followups');
                            setNotifOpen(false);
                          }}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                            <span className="truncate">{flw.customerName}</span>
                            <StatusBadge status={flw.bucket || 'Today'} size="sm" />
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {flw.projectName} • Due: {flw.dueDate}
                          </div>
                          <div className="text-xs text-slate-700 line-clamp-1 mt-1 bg-slate-100 p-1.5 rounded">
                            {flw.followUpNotes}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-center">
                    <button
                      onClick={() => {
                        setCurrentTab('followups');
                        setNotifOpen(false);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View all follow-ups →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
