import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Users table with role-based access control and organizational hierarchies
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or system user ID
  email: text('email').notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'), // Secure hashed password (salt:hash)
  role: text('role').notNull().default('executive'), // 'admin' | 'manager' | 'executive' | 'telecaller' | 'engineer' | 'commercial' | 'director' | 'customer'
  phone: text('phone'),
  department: text('department').default('Sales'),
  region: text('region').default('Bengaluru HQ'),
  reportingManagerId: integer('reporting_manager_id'),
  customPermissions: text('custom_permissions'), // Optional JSON array string of permission overrides
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockoutUntil: timestamp('lockout_until'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Role permissions matrix table
export const rolePermissions = pgTable('role_permissions', {
  id: serial('id').primaryKey(),
  role: text('role').notNull(),
  permission: text('permission').notNull(),
  granted: boolean('granted').default(true).notNull(),
});

// Leads table
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  leadNumber: text('lead_number').notNull().unique(), // e.g. LD-00001
  customerName: text('customer_name').notNull(),
  companyName: text('company_name'),
  contactPerson: text('contact_person'),
  mobileNumber: text('mobile_number').notNull(),
  email: text('email'),
  projectName: text('project_name').notNull(),
  projectLocation: text('project_location').notNull(),
  leadSource: text('lead_source').notNull(), // 'Referral' | 'Website' | 'IndiaMART' | 'Advertisement' | 'Telecalling' | 'Other'
  buildingType: text('building_type').notNull(), // 'Residential' | 'Commercial' | 'Hospital' | 'Industrial' | 'Other'
  numberOfFloors: integer('number_of_floors').default(4),
  requiredLiftQty: integer('required_lift_qty').default(1).notNull(),
  estimatedBudget: doublePrecision('estimated_budget'),
  assignedUserId: integer('assigned_user_id').references(() => users.id),
  status: text('status').notNull().default('New'), // 'New' | 'Contacted' | 'Meeting Scheduled' | 'Site Visit Completed' | 'Enquiry Received' | 'Quotation Submitted' | 'Negotiation' | 'Order Won' | 'Order Lost'
  nextFollowUpDate: text('next_follow_up_date'), // YYYY-MM-DD
  notes: text('notes'),
  createdById: integer('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Site visits table
export const siteVisits = pgTable('site_visits', {
  id: serial('id').primaryKey(),
  visitNumber: text('visit_number').notNull().unique(), // e.g. VIS-00001
  leadId: integer('lead_id')
    .references(() => leads.id, { onDelete: 'cascade' })
    .notNull(),
  projectName: text('project_name').notNull(),
  siteAddress: text('site_address').notNull(),
  contactPerson: text('contact_person'),
  contactPhone: text('contact_phone'),
  visitDate: text('visit_date').notNull(), // YYYY-MM-DD
  visitTime: text('visit_time'), // HH:mm
  assignedUserId: integer('assigned_user_id').references(() => users.id),
  visitPurpose: text('visit_purpose').default('Site Measurement & Shaft Inspection'),
  buildingConstructionStatus: text('building_construction_status'), // 'Excavation' | 'RCC Structure Ready' | 'Brickwork in Progress' | 'Shaft Ready' | 'Finishing Stage' | 'Completed'
  numberOfFloors: integer('number_of_floors'),
  liftRequirements: text('lift_requirements'),
  discussionNotes: text('discussion_notes'),
  visitOutcome: text('visit_outcome'),
  nextAction: text('next_action'),
  nextFollowUpDate: text('next_follow_up_date'),
  status: text('status').notNull().default('Planned'), // 'Planned' | 'Completed' | 'Cancelled'
  createdById: integer('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Elevator technical enquiries
export const enquiries = pgTable('enquiries', {
  id: serial('id').primaryKey(),
  enquiryNumber: text('enquiry_number').notNull().unique(), // e.g. ENQ-00001
  leadId: integer('lead_id')
    .references(() => leads.id, { onDelete: 'cascade' })
    .notNull(),
  projectName: text('project_name').notNull(),
  customerName: text('customer_name').notNull(),
  mobileNumber: text('mobile_number'),
  email: text('email'),
  buildingType: text('building_type').notNull(),
  buildingConfiguration: text('building_configuration').default('G + 4 Floors'),
  liftType: text('lift_type').notNull().default('Passenger'), // 'Passenger' | 'Goods' | 'Hospital' | 'Home' | 'Capsule' | 'Other'
  liftQuantity: integer('lift_quantity').default(1).notNull(),
  ratedCapacity: text('rated_capacity').default('8 Passengers / 544 kg'),
  ratedSpeed: text('rated_speed').default('1.0 m/s'),
  numberOfFloors: integer('number_of_floors').default(5),
  numberOfStops: integer('number_of_stops').default(5),
  numberOfOpenings: integer('number_of_openings').default(5),
  machineRoom: text('machine_room').default('Machine Room Less (MRL)'),
  doorType: text('door_type').default('Automatic Center Opening Stainless Steel'),
  doorOpeningDimensions: text('door_opening_dimensions').default('800mm (W) x 2000mm (H)'),
  cabinDimensions: text('cabin_dimensions').default('1100mm (W) x 1400mm (D) x 2200mm (H)'),
  shaftDimensions: text('shaft_dimensions').default('1800mm (W) x 1900mm (D)'),
  pitDepth: text('pit_depth').default('1500 mm'),
  overheadClearance: text('overhead_clearance').default('4500 mm'),
  powerSupply: text('power_supply').default('415V, 3 Phase, 50Hz AC'),
  interiorFinish: text('interior_finish').default('Hairline Stainless Steel (SS 304) with LED panel'),
  specialRequirements: text('special_requirements'),
  technicalNotes: text('technical_notes'),
  expectedBudget: doublePrecision('expected_budget'),
  installationRequirements: text('installation_requirements'),
  civilWorkResponsibility: text('civil_work_responsibility').default('Client/Builder to provide plumb shaft and pit waterproofing'),
  electricalWorkResponsibility: text('electrical_work_responsibility').default('Client to provide 3-phase power point in shaft'),
  expectedDeliveryTimeline: text('expected_delivery_timeline').default('6 to 8 weeks from approval'),
  paymentTerms: text('payment_terms').default('30% Advance, 50% on Material Dispatch, 20% on Handover'),
  enquiryDate: text('enquiry_date').notNull(),
  expectedQuotationDate: text('expected_quotation_date'),
  assignedEngineerId: integer('assigned_engineer_id').references(() => users.id),
  technicalReviewStatus: text('technical_review_status').default('Pending Review').notNull(), // 'Pending Review' | 'Approved' | 'Needs Clarification' | 'Incomplete Specs'
  technicalReviewNotes: text('technical_review_notes'),
  status: text('status').notNull().default('Draft'), // 'Draft' | 'Technical Review' | 'Pending Quotation' | 'Quotation Created' | 'Cancelled'
  createdById: integer('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Quotations table
export const quotations = pgTable('quotations', {
  id: serial('id').primaryKey(),
  quotationNumber: text('quotation_number').notNull().unique(), // e.g. QT-00001
  enquiryId: integer('enquiry_id').references(() => enquiries.id, { onDelete: 'set null' }),
  leadId: integer('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  customerName: text('customer_name').notNull(),
  projectName: text('project_name').notNull(),
  numberOfLifts: integer('number_of_lifts').default(1).notNull(),
  quotationAmount: doublePrecision('quotation_amount').notNull(),
  currency: text('currency').default('INR').notNull(),
  quotationDate: text('quotation_date').notNull(),
  submissionDate: text('submission_date'),
  validUntil: text('valid_until'),
  revisionNumber: integer('revision_number').default(0).notNull(),
  assignedUserId: integer('assigned_user_id').references(() => users.id),
  assignedCommercialId: integer('assigned_commercial_id').references(() => users.id),
  approvedById: integer('approved_by_id').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  approvalNotes: text('approval_notes'),
  lastFollowUpDate: text('last_follow_up_date'),
  nextFollowUpDate: text('next_follow_up_date'),
  status: text('status').notNull().default('Draft'), // 'Draft' | 'Under Approval' | 'Submitted' | 'Follow-up Pending' | 'Negotiation' | 'Revision Required' | 'Approved' | 'Order Won' | 'Order Lost' | 'Expired'
  customerFeedback: text('customer_feedback'),
  lostReason: text('lost_reason'),
  documentUrl: text('document_url'),
  termsAndConditions: text('terms_and_conditions'),
  notes: text('notes'),
  createdById: integer('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Quotation revisions history
export const quotationRevisions = pgTable('quotation_revisions', {
  id: serial('id').primaryKey(),
  quotationId: integer('quotation_id')
    .references(() => quotations.id, { onDelete: 'cascade' })
    .notNull(),
  revisionNumber: integer('revision_number').notNull(),
  amount: doublePrecision('amount').notNull(),
  changeNotes: text('change_notes'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Follow-ups table
export const followUps = pgTable('follow_ups', {
  id: serial('id').primaryKey(),
  followUpNumber: text('follow_up_number').notNull().unique(), // e.g. FLW-00001
  leadId: integer('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  quotationId: integer('quotation_id').references(() => quotations.id, { onDelete: 'set null' }),
  customerName: text('customer_name').notNull(),
  projectName: text('project_name').notNull(),
  assignedUserId: integer('assigned_user_id').references(() => users.id),
  dueDate: text('due_date').notNull(), // YYYY-MM-DD
  dueTime: text('due_time').default('11:00 AM'),
  followUpNotes: text('follow_up_notes').notNull(),
  nextAction: text('next_action'),
  status: text('status').notNull().default('Pending'), // 'Pending' | 'Completed' | 'Overdue' | 'Cancelled'
  completedAt: timestamp('completed_at'),
  completedNotes: text('completed_notes'),
  createdById: integer('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Telecalling / Lead Generation Call Logs
export const callLogs = pgTable('call_logs', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id')
    .references(() => leads.id, { onDelete: 'cascade' })
    .notNull(),
  callerId: integer('caller_id').references(() => users.id),
  customerName: text('customer_name').notNull(),
  mobileNumber: text('mobile_number').notNull(),
  callOutcome: text('call_outcome').notNull(),
  callDuration: text('call_duration').default('2 mins'),
  discussionNotes: text('discussion_notes'),
  nextCallbackDate: text('next_callback_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  userName: text('user_name'),
  userRole: text('user_role'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Company profile & settings
export const companySettings = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').notNull().default('Apex Elevators & Escalators Ltd.'),
  tagline: text('tagline').default('Elevating Safety, Engineering & Performance'),
  address: text('address').default('Plot 42, Metro Industrial Estate, Phase II, Bengaluru'),
  contactEmail: text('contact_email').default('sales@apexelevators.com'),
  contactPhone: text('contact_phone').default('+91 98201 55678'),
  taxId: text('tax_id').default('GSTIN: 29AABCA1234F1Z9'),
  currency: text('currency').default('INR').notNull(),
  customerPortalEnabled: boolean('customer_portal_enabled').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Sessions table (Feature: Database-Backed Login and Logout Tracking)
export const userSessions = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  sessionId: text('session_id').notNull().unique(),
  loginAt: timestamp('login_at').defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
  logoutAt: timestamp('logout_at'),
  sessionDurationSeconds: integer('session_duration_seconds').default(0).notNull(),
  activeDurationSeconds: integer('active_duration_seconds').default(0).notNull(),
  sessionStatus: text('session_status').notNull().default('Active'), // 'Active' | 'Logged Out' | 'Expired' | 'Revoked'
  logoutReason: text('logout_reason'), // 'User Logout' | 'Session Expired' | 'Admin Revoked' | 'Idle Timeout'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Activity Logs table (Feature: Track Which Pages and Modules Each User Visits)
export const userActivityLogs = pgTable('user_activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  sessionId: text('session_id'),
  eventType: text('event_type').notNull(), // 'Page View' | 'Create' | 'Update' | 'Delete' | 'Export' | 'Login' | 'Logout' | 'Access Denied' | 'Heartbeat'
  moduleName: text('module_name').notNull(), // 'Dashboard' | 'Leads' | 'Site Visits' | 'Enquiries' | 'Quotations' | 'Follow-ups' | 'Calls' | 'Reports' | 'Settings' | 'Users' | 'Monitoring' | 'Audit'
  pagePath: text('page_path').notNull(),
  actionName: text('action_name').notNull(),
  recordType: text('record_type'), // 'Lead' | 'Visit' | 'Enquiry' | 'Quotation' | 'User' | 'Session' | 'Settings'
  recordId: text('record_id'),
  eventTimestamp: timestamp('event_timestamp').defaultNow().notNull(),
  result: text('result').notNull().default('Success'), // 'Success' | 'Denied' | 'Failed'
  metadata: text('metadata'), // JSON string with limited, non-sensitive event details
});

// Security Events table (Feature: Failed Logins, Lockouts & Access Denied Tracking)
export const securityEvents = pgTable('security_events', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(), // 'FAILED_LOGIN' | 'ACCOUNT_LOCKED' | 'UNAUTHORIZED_ACCESS' | 'SESSION_REVOKED' | 'PASSWORD_RESET_REQUEST'
  email: text('email'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  reportingManager: one(users, {
    fields: [users.reportingManagerId],
    references: [users.id],
    relationName: 'teamMembers',
  }),
  teamMembers: many(users, { relationName: 'teamMembers' }),
  assignedLeads: many(leads, { relationName: 'assignedLeads' }),
  assignedVisits: many(siteVisits, { relationName: 'assignedVisits' }),
  assignedQuotations: many(quotations, { relationName: 'assignedQuotations' }),
  assignedFollowUps: many(followUps, { relationName: 'assignedFollowUps' }),
  assignedEnquiries: many(enquiries, { relationName: 'assignedEngineer' }),
  sessions: many(userSessions),
  activityLogs: many(userActivityLogs),
}));

export const userSessionsRelations = relations(userSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
  activities: many(userActivityLogs),
}));

export const userActivityLogsRelations = relations(userActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [userActivityLogs.userId],
    references: [users.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [leads.assignedUserId],
    references: [users.id],
    relationName: 'assignedLeads',
  }),
  siteVisits: many(siteVisits),
  enquiries: many(enquiries),
  quotations: many(quotations),
  followUps: many(followUps),
  callLogs: many(callLogs),
}));

export const siteVisitsRelations = relations(siteVisits, ({ one }) => ({
  lead: one(leads, {
    fields: [siteVisits.leadId],
    references: [leads.id],
  }),
  assignedUser: one(users, {
    fields: [siteVisits.assignedUserId],
    references: [users.id],
    relationName: 'assignedVisits',
  }),
}));

export const enquiriesRelations = relations(enquiries, ({ one, many }) => ({
  lead: one(leads, {
    fields: [enquiries.leadId],
    references: [leads.id],
  }),
  assignedEngineer: one(users, {
    fields: [enquiries.assignedEngineerId],
    references: [users.id],
    relationName: 'assignedEngineer',
  }),
  quotations: many(quotations),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  enquiry: one(enquiries, {
    fields: [quotations.enquiryId],
    references: [enquiries.id],
  }),
  lead: one(leads, {
    fields: [quotations.leadId],
    references: [leads.id],
  }),
  assignedUser: one(users, {
    fields: [quotations.assignedUserId],
    references: [users.id],
    relationName: 'assignedQuotations',
  }),
  approvedBy: one(users, {
    fields: [quotations.approvedById],
    references: [users.id],
    relationName: 'approvedBy',
  }),
  revisions: many(quotationRevisions),
}));

export const quotationRevisionsRelations = relations(quotationRevisions, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationRevisions.quotationId],
    references: [quotations.id],
  }),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
  lead: one(leads, {
    fields: [followUps.leadId],
    references: [leads.id],
  }),
  quotation: one(quotations, {
    fields: [followUps.quotationId],
    references: [quotations.id],
  }),
  assignedUser: one(users, {
    fields: [followUps.assignedUserId],
    references: [users.id],
    relationName: 'assignedFollowUps',
  }),
}));

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  lead: one(leads, {
    fields: [callLogs.leadId],
    references: [leads.id],
  }),
  caller: one(users, {
    fields: [callLogs.callerId],
    references: [users.id],
  }),
}));
