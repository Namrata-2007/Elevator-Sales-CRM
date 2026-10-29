import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Check,
  UserCheck,
  PhoneCall,
  Shield,
  Activity,
  Loader2,
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

const ROLE_PERSONAS: Array<{
  role: UserRole;
  label: string;
  subtitle: string;
}> = [
  {
    role: 'admin',
    label: 'Super Admin / Owner',
    subtitle: 'Full company authority & configuration',
  },
  {
    role: 'manager',
    label: 'Sales Manager',
    subtitle: 'Team oversight & quotation approvals',
  },
  {
    role: 'executive',
    label: 'Sales Executive',
    subtitle: 'Field leads, visits & measurements',
  },
  {
    role: 'telecaller',
    label: 'Telecalling Executive',
    subtitle: 'Lead generation & outbound calls',
  },
  {
    role: 'engineer',
    label: 'Technical Engineer',
    subtitle: 'Hoistway specs & drawing reviews',
  },
  {
    role: 'commercial',
    label: 'Commercial Executive',
    subtitle: 'Commercial bids & quote revisions',
  },
  {
    role: 'director',
    label: 'Managing Director',
    subtitle: 'Executive pipeline & audit analytics',
  },
  {
    role: 'customer',
    label: 'Builder / Customer Portal',
    subtitle: 'Lift specifications & proposals',
  },
];

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
  const { user, logout, switchRole, trackPage } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [roleSwitchError, setRoleSwitchError] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [urgentFollowUps, setUrgentFollowUps] = useState<FollowUp[]>([]);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const quickActionRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const userRole: UserRole = user?.role || 'executive';

  const fetchUrgentTasks = useCallback(async () => {
    try {
      const all = await api.getFollowUps();
      const urgent = all.filter((f) => f.bucket === 'Overdue' || f.bucket === 'Today');
      setUrgentFollowUps(urgent);
    } catch {
      // Non-blocking background poll
    }
  }, []);

  useEffect(() => {
    fetchUrgentTasks();
    const timer = setInterval(fetchUrgentTasks, 30000);
    return () => clearInterval(timer);
  }, [fetchUrgentTasks, user?.id, userRole]);

  // Dismiss dropdowns on click-outside or Escape key
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (roleMenuRef.current && !roleMenuRef.current.contains(target)) {
        setRoleMenuOpen(false);
      }
      if (quickActionRef.current && !quickActionRef.current.contains(target)) {
        setQuickActionOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRoleMenuOpen(false);
        setQuickActionOpen(false);
        setNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectRole = async (targetRole: UserRole) => {
    if (targetRole === userRole) {
      setRoleMenuOpen(false);
      return;
    }

    setIsSwitchingRole(true);
    setRoleSwitchError(null);
    try {
      await switchRole(targetRole);
      setRoleMenuOpen(false);
      setMobileMenuOpen(false);
      setCurrentTab('dashboard');
    } catch (err: any) {
      setRoleSwitchError(err?.message || 'Unable to switch role');
    } finally {
      setIsSwitchingRole(false);
    }
  };

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

  const getRoleDisplayName = (r: UserRole) => {
    const match = ROLE_PERSONAS.find((item) => item.role === r);
    return match ? match.label : r;
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
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold tracking-tight text-sm truncate">
                APEX ELEVATORS
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate">
                Sales & Operations CRM
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Job Role & Persona Switcher */}
        <div ref={roleMenuRef} className="relative px-4 py-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-medium text-slate-400 tracking-wide">
              Active Job Role
            </span>
            <button
              type="button"
              onClick={() => setRoleMenuOpen((prev) => !prev)}
              disabled={isSwitchingRole}
              className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              {roleMenuOpen ? 'Close' : 'Switch role'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setRoleMenuOpen((prev) => !prev)}
            disabled={isSwitchingRole}
            aria-expanded={roleMenuOpen}
            aria-haspopup="listbox"
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              roleMenuOpen
                ? 'border-blue-500/80 ring-2 ring-blue-500/20'
                : 'border-slate-700/90 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                {isSwitchingRole ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {getRoleDisplayName(userRole)}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {user?.department || 'Operations'}
                  <span className="mx-1.5 text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  {user?.region || 'HQ'}
                </div>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                roleMenuOpen ? 'rotate-180 text-blue-400' : ''
              }`}
            />
          </button>

          {roleSwitchError && (
            <p className="mt-1.5 text-[11px] text-rose-400 leading-snug">{roleSwitchError}</p>
          )}

          {/* Solid Opaque Role Switcher Popover */}
          {roleMenuOpen && (
            <div
              role="listbox"
              aria-label="Select CRM Role Persona"
              className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl shadow-black/80 ring-1 ring-white/10 overflow-hidden"
            >
              <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-300">
                  Select CRM Role Persona
                </span>
              </div>

              <div className="py-1 max-h-[340px] overflow-y-auto dark-scrollbar divide-y divide-slate-800/60">
                {ROLE_PERSONAS.map((item) => {
                  const isSelected = item.role === userRole;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={isSwitchingRole}
                      onClick={() => handleSelectRole(item.role)}
                      className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer disabled:opacity-60 ${
                        isSelected
                          ? 'bg-blue-600/20 text-white'
                          : 'text-slate-200 hover:bg-slate-800/90'
                      }`}
                    >
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-semibold truncate ${
                            isSelected ? 'text-blue-300' : 'text-slate-100'
                          }`}
                        >
                          {item.label}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto dark-scrollbar">
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
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors group cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
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

        {/* Active User Footer & Sign Out */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {user?.name || 'Authenticated User'}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {user?.email}
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
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
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-slate-400 bg-slate-100 rounded-xl px-3 py-2 border border-slate-200 w-64 md:w-80 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
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

          <div className="flex items-center gap-3">
            {/* Clean Unboxed Access Level Metadata */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 pr-1">
              <span>Role:</span>
              <span className="font-semibold text-slate-800">{getRoleDisplayName(userRole)}</span>
            </div>

            {/* Role-Specific Quick Action Button */}
            {userRole !== 'director' && userRole !== 'customer' && (
              <div ref={quickActionRef} className="relative">
                <button
                  onClick={() => setQuickActionOpen((prev) => !prev)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Action</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {quickActionOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30"
                    onClick={() => setQuickActionOpen(false)}
                  >
                    {(userRole === 'admin' ||
                      userRole === 'manager' ||
                      userRole === 'executive' ||
                      userRole === 'telecaller') && (
                      <button
                        onClick={onOpenNewLead}
                        className="w-full px-4 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Add New Lead</span>
                      </button>
                    )}

                    {(userRole === 'admin' ||
                      userRole === 'manager' ||
                      userRole === 'executive' ||
                      userRole === 'engineer') && (
                      <button
                        onClick={onOpenScheduleVisit}
                        className="w-full px-4 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 cursor-pointer"
                      >
                        <CalendarCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Schedule Site Visit</span>
                      </button>
                    )}

                    {(userRole === 'admin' ||
                      userRole === 'manager' ||
                      userRole === 'executive' ||
                      userRole === 'engineer') && (
                      <button
                        onClick={onOpenNewEnquiry}
                        className="w-full px-4 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>Technical Lift Enquiry</span>
                      </button>
                    )}

                    {(userRole === 'admin' || userRole === 'manager' || userRole === 'commercial') && (
                      <button
                        onClick={onOpenNewQuotation}
                        className="w-full px-4 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 cursor-pointer"
                      >
                        <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Prepare Commercial Bid</span>
                      </button>
                    )}

                    {(userRole === 'telecaller' || userRole === 'executive') && onOpenLogCall && (
                      <button
                        onClick={onOpenLogCall}
                        className="w-full px-4 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Record Customer Call</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* In-App Notifications for Overdue / Today's Follow-ups */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Follow-up Notifications"
                aria-label="Follow-up Notifications"
              >
                <Bell className="w-5 h-5" />
                {urgentFollowUps.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                      <ClockAlert className="w-4 h-4 text-amber-600" />
                      Pending Follow-up Alerts
                    </div>
                    <span className="text-xs font-semibold text-amber-700">
                      {urgentFollowUps.length} due
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto light-scrollbar divide-y divide-slate-100 py-2">
                    {urgentFollowUps.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No pending follow-ups overdue or due today.
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
                            {flw.projectName} · Due {flw.dueDate}
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
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
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
