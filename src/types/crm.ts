export type UserRole =
  | 'admin'
  | 'manager'
  | 'executive'
  | 'telecaller'
  | 'engineer'
  | 'commercial'
  | 'director'
  | 'customer';

export interface User {
  id: number;
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  department?: string | null;
  region?: string | null;
  reportingManagerId?: number | null;
  reportingManager?: {
    id: number;
    name: string;
    email: string;
  } | null;
  customPermissions?: string | null;
  permissions?: string[];
  isActive: boolean;
  createdAt?: string;
}

export interface RolePermission {
  id: number;
  role: UserRole;
  permission: string;
  granted: boolean;
}

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Meeting Scheduled'
  | 'Site Visit Completed'
  | 'Enquiry Received'
  | 'Quotation Submitted'
  | 'Negotiation'
  | 'Order Won'
  | 'Order Lost';

export type LeadSource =
  | 'Referral'
  | 'Website'
  | 'IndiaMART'
  | 'Advertisement'
  | 'Telecalling'
  | 'Other';

export type BuildingType =
  | 'Residential'
  | 'Commercial'
  | 'Hospital'
  | 'Industrial'
  | 'Other';

export interface Lead {
  id: number;
  leadNumber: string;
  customerName: string;
  companyName?: string | null;
  contactPerson?: string | null;
  mobileNumber: string;
  email?: string | null;
  projectName: string;
  projectLocation: string;
  leadSource: LeadSource;
  buildingType: BuildingType;
  numberOfFloors: number;
  requiredLiftQty: number;
  estimatedBudget?: number | null;
  assignedUserId?: number | null;
  status: LeadStatus;
  nextFollowUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUser?: {
    id: number;
    name: string;
    email: string;
    role?: string;
  } | null;
  siteVisits?: SiteVisit[];
  enquiries?: Enquiry[];
  quotations?: Quotation[];
  followUps?: FollowUp[];
  callLogs?: CallLog[];
}

export type VisitStatus = 'Planned' | 'Completed' | 'Cancelled';

export interface SiteVisit {
  id: number;
  visitNumber: string;
  leadId: number;
  projectName: string;
  siteAddress: string;
  contactPerson?: string | null;
  contactPhone?: string | null;
  visitDate: string; // YYYY-MM-DD
  visitTime?: string | null; // HH:mm
  assignedUserId?: number | null;
  visitPurpose?: string | null;
  buildingConstructionStatus?: string | null;
  numberOfFloors?: number | null;
  liftRequirements?: string | null;
  discussionNotes?: string | null;
  visitOutcome?: string | null;
  nextAction?: string | null;
  nextFollowUpDate?: string | null;
  status: VisitStatus;
  createdAt: string;
  assignedUser?: {
    id: number;
    name: string;
    email: string;
  } | null;
  lead?: {
    id: number;
    leadNumber: string;
    customerName: string;
  } | null;
}

export type LiftType =
  | 'Passenger'
  | 'Goods'
  | 'Hospital'
  | 'Home'
  | 'Capsule'
  | 'Other';

export type EnquiryStatus =
  | 'Draft'
  | 'Technical Review'
  | 'Pending Quotation'
  | 'Quotation Created'
  | 'Cancelled';

export type TechnicalReviewStatus =
  | 'Pending Review'
  | 'Approved'
  | 'Needs Clarification'
  | 'Incomplete Specs';

export interface Enquiry {
  id: number;
  enquiryNumber: string;
  leadId: number;
  projectName: string;
  customerName: string;
  mobileNumber?: string | null;
  email?: string | null;
  buildingType: string;
  buildingConfiguration?: string | null;
  liftType: LiftType;
  liftQuantity: number;
  ratedCapacity?: string | null;
  ratedSpeed?: string | null;
  numberOfFloors?: number | null;
  numberOfStops?: number | null;
  numberOfOpenings?: number | null;
  machineRoom?: string | null;
  doorType?: string | null;
  doorOpeningDimensions?: string | null;
  cabinDimensions?: string | null;
  shaftDimensions?: string | null;
  pitDepth?: string | null;
  overheadClearance?: string | null;
  powerSupply?: string | null;
  interiorFinish?: string | null;
  specialRequirements?: string | null;
  technicalNotes?: string | null;
  expectedBudget?: number | null;
  installationRequirements?: string | null;
  civilWorkResponsibility?: string | null;
  electricalWorkResponsibility?: string | null;
  expectedDeliveryTimeline?: string | null;
  paymentTerms?: string | null;
  enquiryDate: string;
  expectedQuotationDate?: string | null;
  assignedEngineerId?: number | null;
  technicalReviewStatus: TechnicalReviewStatus;
  technicalReviewNotes?: string | null;
  status: EnquiryStatus;
  createdAt: string;
  quotations?: Quotation[];
  assignedEngineer?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export type QuotationStatus =
  | 'Draft'
  | 'Under Approval'
  | 'Submitted'
  | 'Follow-up Pending'
  | 'Negotiation'
  | 'Revision Required'
  | 'Approved'
  | 'Order Won'
  | 'Order Lost'
  | 'Expired';

export interface QuotationRevision {
  id: number;
  quotationId: number;
  revisionNumber: number;
  amount: number;
  changeNotes?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface Quotation {
  id: number;
  quotationNumber: string;
  enquiryId?: number | null;
  leadId?: number | null;
  customerName: string;
  projectName: string;
  numberOfLifts: number;
  quotationAmount: number;
  currency: string;
  quotationDate: string;
  submissionDate?: string | null;
  validUntil?: string | null;
  revisionNumber: number;
  assignedUserId?: number | null;
  assignedCommercialId?: number | null;
  approvedById?: number | null;
  approvedAt?: string | null;
  approvalNotes?: string | null;
  lastFollowUpDate?: string | null;
  nextFollowUpDate?: string | null;
  status: QuotationStatus;
  customerFeedback?: string | null;
  lostReason?: string | null;
  documentUrl?: string | null;
  termsAndConditions?: string | null;
  notes?: string | null;
  createdAt: string;
  assignedUser?: {
    id: number;
    name: string;
    email: string;
  } | null;
  assignedCommercial?: {
    id: number;
    name: string;
    email: string;
  } | null;
  approvedBy?: {
    id: number;
    name: string;
    email: string;
  } | null;
  revisions?: QuotationRevision[];
}

export type FollowUpStatus = 'Pending' | 'Completed' | 'Overdue' | 'Cancelled';

export interface FollowUp {
  id: number;
  followUpNumber: string;
  leadId?: number | null;
  quotationId?: number | null;
  customerName: string;
  projectName: string;
  assignedUserId?: number | null;
  dueDate: string;
  dueTime?: string | null;
  followUpNotes: string;
  nextAction?: string | null;
  status: FollowUpStatus;
  bucket?: 'Today' | 'Upcoming' | 'Overdue' | 'Completed';
  completedAt?: string | null;
  completedNotes?: string | null;
  createdAt: string;
  assignedUser?: {
    id: number;
    name: string;
  } | null;
}

export interface CallLog {
  id: number;
  leadId: number;
  callerId?: number | null;
  customerName: string;
  mobileNumber: string;
  callOutcome: string;
  callDuration?: string | null;
  discussionNotes?: string | null;
  nextCallbackDate?: string | null;
  createdAt: string;
  caller?: {
    id: number;
    name: string;
  } | null;
}

export interface AuditLog {
  id: number;
  userId?: number | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  newLeads: number;
  todaySiteVisits: number;
  completedSiteVisits: number;
  pendingFollowUps: number;
  totalEnquiries: number;
  quotationsSubmitted: number;
  ordersWon: number;
  ordersLost: number;
  totalQuotationValue: number;
  confirmedOrderValue: number;

  // Role-specific metrics
  callsMadeToday?: number;
  callbacksDue?: number;
  pendingTechnicalReviews?: number;
  incompleteSpecsCount?: number;
  quotesAwaitingApproval?: number;
  expiringQuotesCount?: number;
  teamLeadsCount?: number;
  teamWonValue?: number;
  myLeadsCount?: number;
  myVisitsToday?: number;
}

export interface DashboardData {
  role: UserRole;
  metrics: DashboardMetrics;
  statusDistribution?: { status: string; count: number }[];
  recentLeads: Lead[];
  upcomingFollowUps: FollowUp[];
  todayVisits: SiteVisit[];
  assignedEnquiries?: Enquiry[];
  pendingQuotesForReview?: Quotation[];
  recentCallLogs?: CallLog[];
  recentAuditLogs?: AuditLog[];
}

export interface CompanySettings {
  id?: number;
  companyName: string;
  tagline?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  taxId?: string;
  currency: string;
  customerPortalEnabled?: boolean;
}

export interface ReportData {
  bySource: { source: string; count: number }[];
  byStatus: { status: string; count: number }[];
  enquiriesByStatus: { status: string; count: number }[];
  quotationsByStatus: { status: string; count: number; totalValue: number }[];
  execPerformance: {
    userId: number;
    userName: string;
    role: string;
    leadCount: number;
    orderWonCount: number;
    wonValue: number;
  }[];
  conversionRate: string;
  totalLeads: number;
  ordersWon: number;
}

export interface UserSession {
  id: number;
  userId: number;
  sessionId: string;
  loginAt: string;
  lastActivityAt: string;
  logoutAt?: string | null;
  sessionDurationSeconds: number;
  activeDurationSeconds: number;
  sessionStatus: 'Active' | 'Logged Out' | 'Expired' | 'Revoked';
  logoutReason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    department?: string | null;
  } | null;
  pageViewsCount?: number;
  lastModule?: string | null;
}

export interface UserActivityLog {
  id: number;
  userId: number;
  sessionId?: string | null;
  eventType: string; // 'Page View' | 'Create' | 'Update' | 'Delete' | 'Export' | 'Login' | 'Logout' | 'Access Denied' | 'Heartbeat'
  moduleName: string;
  pagePath: string;
  actionName: string;
  recordType?: string | null;
  recordId?: string | null;
  eventTimestamp: string;
  result: 'Success' | 'Denied' | 'Failed';
  metadata?: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  } | null;
}

export interface SecurityEvent {
  id: number;
  eventType: string;
  email?: string | null;
  userId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface MonitoringSummary {
  totalRegisteredUsers: number;
  activeSessions: number;
  usersLoggedInToday: number;
  loginEventsToday: number;
  avgSessionDurationMinutes: number;
  totalActiveUsageMinutesToday: number;
  failedLoginAttempts: number;
  suspiciousAccessAttempts: number;
}
