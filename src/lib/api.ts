import {
  User,
  UserRole,
  Lead,
  SiteVisit,
  Enquiry,
  Quotation,
  FollowUp,
  CallLog,
  AuditLog,
  RolePermission,
  DashboardData,
  ReportData,
  CompanySettings,
  UserSession,
  UserActivityLog,
  SecurityEvent,
  MonitoringSummary,
} from '../types/crm.ts';

const TOKEN_KEY = 'elevator_crm_token';
const SESSION_KEY = 'elevator_crm_session_id';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
}

export function persistAuthSession(token: string, sessionId: string, rememberMe: boolean = true): void {
  clearAuthSession();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  if (sessionId) {
    storage.setItem(SESSION_KEY, sessionId);
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function formatCurrency(amount?: number | null, currency: string = 'INR'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency === 'INR' ? 'INR' : 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  if (mins === 0) return `${remainingSecs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours === 0) return `${mins}m ${remainingSecs}s`;
  return `${hours}h ${remMins}m`;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const sessId = getStoredSessionId();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (sessId) {
    headers.set('x-session-id', sessId);
  } else if (token) {
    headers.set('x-session-id', token);
  }

  let res: Response;
  try {
    res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    throw new Error(
      `Network error connecting to CRM server${networkErr?.message ? `: ${networkErr.message}` : ''}`
    );
  }

  if (!res.ok) {
    const rawText = await res.text().catch(() => '');
    let parsedError = '';
    if (rawText) {
      try {
        const json = JSON.parse(rawText);
        parsedError = json.error || json.message || '';
      } catch {
        parsedError = rawText.slice(0, 200);
      }
    }
    throw new Error(parsedError || `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  // Auth
  getMe: () => request<{ user: User; sessionId?: string }>('/auth/me'),
  login: (data: { email: string; password: string; rememberMe?: boolean }) =>
    request<{ user: User; token: string; sessionId: string; redirectTab: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: (reason: string = 'User Logout') =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  heartbeat: (data: { activeSeconds: number; currentModule: string; pagePath: string }) =>
    request<{ status: string; lastActivityAt: string; maxIdleSeconds: number }>('/auth/heartbeat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  trackActivity: (data: {
    eventType: string;
    moduleName: string;
    pagePath: string;
    actionName: string;
    recordType?: string;
    recordId?: string;
    result?: string;
    metadata?: any;
  }) =>
    request<{ success: boolean }>('/auth/track-activity', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string; verificationCode?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (data: { email: string; verificationCode: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  syncGoogle: () =>
    request<{ user: User; token: string; sessionId?: string; redirectTab?: string }>('/auth/sync-google', {
      method: 'POST',
    }),
  switchRole: (role: UserRole) =>
    request<{ user: User; token: string; sessionId: string; redirectTab: string }>('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  // Users
  getUsers: () => request<User[]>('/users'),
  createUser: (data: Partial<User>) =>
    request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUser: (id: number, data: Partial<User>) =>
    request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Permission Matrix
  getPermissionMatrix: () => request<RolePermission[]>('/permissions/matrix'),
  updatePermissionMatrix: (role: string, permission: string, granted: boolean) =>
    request<RolePermission>('/permissions/matrix', {
      method: 'PATCH',
      body: JSON.stringify({ role, permission, granted }),
    }),

  // Dashboard
  getDashboard: () => request<DashboardData>('/dashboard/metrics'),

  // Leads
  getLeads: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<Lead[]>(`/leads${q ? `?${q}` : ''}`);
  },
  getLead: (id: number) => request<Lead>(`/leads/${id}`),
  createLead: (data: any) =>
    request<Lead>('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLead: (id: number, data: any) =>
    request<Lead>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteLead: (id: number) =>
    request<{ success: boolean }>(`/leads/${id}`, {
      method: 'DELETE',
    }),
  checkDuplicateMobile: (mobile: string) =>
    request<{ duplicate: boolean; lead: Lead | null }>(`/leads/check-duplicate?mobile=${encodeURIComponent(mobile)}`),
  convertToEnquiry: (leadId: number) =>
    request<Enquiry>(`/leads/${leadId}/convert-to-enquiry`, {
      method: 'POST',
    }),

  // Calls (Telecaller)
  getCalls: () => request<CallLog[]>('/calls'),
  createCall: (data: any) =>
    request<CallLog>('/calls', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Site visits
  getSiteVisits: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<SiteVisit[]>(`/site-visits${q ? `?${q}` : ''}`);
  },
  createSiteVisit: (data: any) =>
    request<SiteVisit>('/site-visits', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSiteVisit: (id: number, data: any) =>
    request<SiteVisit>(`/site-visits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteSiteVisit: (id: number) =>
    request<{ success: boolean }>(`/site-visits/${id}`, {
      method: 'DELETE',
    }),

  // Enquiries
  getEnquiries: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<Enquiry[]>(`/enquiries${q ? `?${q}` : ''}`);
  },
  getEnquiry: (id: number) => request<Enquiry>(`/enquiries/${id}`),
  createEnquiry: (data: any) =>
    request<Enquiry>('/enquiries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEnquiry: (id: number, data: any) =>
    request<Enquiry>(`/enquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  reviewEnquiry: (id: number, data: { reviewStatus: string; reviewNotes?: string }) =>
    request<Enquiry>(`/enquiries/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteEnquiry: (id: number) =>
    request<{ success: boolean }>(`/enquiries/${id}`, {
      method: 'DELETE',
    }),

  // Quotations
  getQuotations: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<Quotation[]>(`/quotations${q ? `?${q}` : ''}`);
  },
  getQuotation: (id: number) => request<Quotation>(`/quotations/${id}`),
  createQuotation: (data: any) =>
    request<Quotation>('/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateQuotation: (id: number, data: any) =>
    request<Quotation>(`/quotations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  approveQuotation: (id: number, data: { approvalNotes?: string }) =>
    request<Quotation>(`/quotations/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addQuotationRevision: (id: number, data: { amount: number; changeNotes: string }) =>
    request<Quotation>(`/quotations/${id}/revisions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteQuotation: (id: number) =>
    request<{ success: boolean }>(`/quotations/${id}`, {
      method: 'DELETE',
    }),

  // Follow-ups
  getFollowUps: () => request<FollowUp[]>('/follow-ups'),
  createFollowUp: (data: any) =>
    request<FollowUp>('/follow-ups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateFollowUp: (id: number, data: any) =>
    request<FollowUp>(`/follow-ups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteFollowUp: (id: number) =>
    request<{ success: boolean }>(`/follow-ups/${id}`, {
      method: 'DELETE',
    }),

  // Audit Logs
  getAuditLogs: () => request<AuditLog[]>('/audit-logs'),

  // Reports
  getReports: () => request<ReportData>('/reports'),
  exportCsvUrl: (type: string) => `/api/reports/export?type=${type}`,

  // Settings
  getSettings: () => request<CompanySettings>('/settings'),
  updateSettings: (data: Partial<CompanySettings>) =>
    request<CompanySettings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // User Activity & Session Monitoring
  getMonitoringSummary: () => request<MonitoringSummary>('/monitoring/summary'),
  getMonitoringSessions: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<UserSession[]>(`/monitoring/sessions${q ? `?${q}` : ''}`);
  },
  getMonitoringActivities: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<UserActivityLog[]>(`/monitoring/activities${q ? `?${q}` : ''}`);
  },
  revokeSession: (id: number) =>
    request<{ success: boolean; message: string; session: UserSession }>(`/monitoring/sessions/${id}/revoke`, {
      method: 'POST',
    }),
  getSecurityEvents: () => request<SecurityEvent[]>('/monitoring/security-events'),
};
