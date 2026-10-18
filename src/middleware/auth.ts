import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users, rolePermissions, auditLogs, userSessions, userActivityLogs, securityEvents } from '../db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';
import { UserRole } from '../types/crm.ts';

export interface AuthUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  department?: string | null;
  region?: string | null;
  reportingManagerId?: number | null;
  isActive: boolean;
  permissions: string[];
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  sessionId?: string;
  sessionRecordId?: number;
}

// Helper to load effective permissions for a user
export async function loadUserPermissions(role: string, customPermissionsJson?: string | null): Promise<string[]> {
  try {
    const defaultPerms = await db
      .select({ permission: rolePermissions.permission, granted: rolePermissions.granted })
      .from(rolePermissions)
      .where(and(eq(rolePermissions.role, role), eq(rolePermissions.granted, true)));

    const permsSet = new Set<string>(defaultPerms.map((p) => p.permission));

    // Admin always gets all permissions by default
    if (role === 'admin') {
      [
        'leads.view_all',
        'leads.create',
        'leads.update',
        'leads.delete',
        'leads.assign',
        'visits.view_all',
        'visits.create',
        'visits.update',
        'visits.delete',
        'enquiries.view_all',
        'enquiries.create',
        'enquiries.update_technical',
        'enquiries.review',
        'quotations.view_all',
        'quotations.create',
        'quotations.revise',
        'quotations.approve',
        'quotations.delete',
        'calls.view',
        'calls.create',
        'reports.view_company',
        'reports.view_team',
        'reports.export',
        'users.manage',
        'settings.manage',
        'audit.view',
        'activity.view',
        'activity.manage',
      ].forEach((p) => permsSet.add(p));
    }

    if (customPermissionsJson) {
      try {
        const overrides = JSON.parse(customPermissionsJson);
        if (Array.isArray(overrides)) {
          overrides.forEach((p) => permsSet.add(p));
        }
      } catch {
        // ignore parse error
      }
    }

    return Array.from(permsSet);
  } catch (err) {
    console.error('Error loading permissions:', err);
    return [];
  }
}

// Log audit event helper
export async function logAuditEvent(params: {
  userId?: number | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId || null,
      userName: params.userName || 'System',
      userRole: params.userRole || 'admin',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      details: params.details || null,
      ipAddress: params.ipAddress || null,
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

// Log user activity (Feature: Track Which Pages and Modules Each User Visits)
export async function logUserActivity(params: {
  userId: number;
  sessionId?: string | null;
  eventType: string; // 'Page View' | 'Create' | 'Update' | 'Delete' | 'Export' | 'Login' | 'Logout' | 'Access Denied' | 'Heartbeat'
  moduleName: string;
  pagePath: string;
  actionName: string;
  recordType?: string | null;
  recordId?: string | null;
  result?: 'Success' | 'Denied' | 'Failed';
  metadata?: any;
}) {
  try {
    const metaStr = params.metadata ? (typeof params.metadata === 'string' ? params.metadata : JSON.stringify(params.metadata)) : null;
    await db.insert(userActivityLogs).values({
      userId: params.userId,
      sessionId: params.sessionId || null,
      eventType: params.eventType,
      moduleName: params.moduleName,
      pagePath: params.pagePath,
      actionName: params.actionName,
      recordType: params.recordType || null,
      recordId: params.recordId ? String(params.recordId) : null,
      result: params.result || 'Success',
      metadata: metaStr,
    });
  } catch (err) {
    console.error('Failed to log user activity:', err);
  }
}

// Log security event (Feature: Security events tracking)
export async function logSecurityEvent(params: {
  eventType: string;
  email?: string | null;
  userId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: string | null;
}) {
  try {
    await db.insert(securityEvents).values({
      eventType: params.eventType,
      email: params.email || null,
      userId: params.userId || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      details: params.details || null,
    });
  } catch (err) {
    console.error('Failed to log security event:', err);
  }
}

// Maximum idle timeout in milliseconds (15 minutes)
const MAX_IDLE_MS = 15 * 60 * 1000;
// Maximum absolute session lifetime (12 hours)
const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const headerSessionId = (req.headers['x-session-id'] as string) || '';

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token header' });
  }

  const rawToken = authHeader.split('Bearer ')[1].trim();
  const token = rawToken;

  try {
    let targetUser: any = null;
    let sessionRecord: any = null;
    const now = new Date();

    // 1. Session Token Authentication (`sess_...`)
    if (token.startsWith('sess_')) {
      const match = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.sessionId, token))
        .limit(1);

      if (match.length > 0) {
        sessionRecord = match[0];

        // Check Session Status
        if (sessionRecord.sessionStatus === 'Logged Out') {
          return res.status(401).json({ error: 'Session has been logged out. Please sign in again.' });
        }
        if (sessionRecord.sessionStatus === 'Revoked') {
          return res.status(401).json({ error: 'Session was revoked by an administrator.' });
        }
        if (sessionRecord.sessionStatus === 'Expired') {
          return res.status(401).json({ error: 'Session has expired due to inactivity. Please sign in again.' });
        }

        // Check Idle Timeout & Max Lifetime
        const lastAct = new Date(sessionRecord.lastActivityAt).getTime();
        const loginAt = new Date(sessionRecord.loginAt).getTime();
        const idleTime = now.getTime() - lastAct;
        const totalLife = now.getTime() - loginAt;

        if (idleTime > MAX_IDLE_MS || totalLife > MAX_SESSION_MS) {
          const duration = Math.max(1, Math.round((lastAct - loginAt) / 1000));
          await db
            .update(userSessions)
            .set({
              sessionStatus: 'Expired',
              logoutReason: idleTime > MAX_IDLE_MS ? 'Idle Timeout' : 'Session Expired',
              logoutAt: now,
              sessionDurationSeconds: duration,
              updatedAt: now,
            })
            .where(eq(userSessions.id, sessionRecord.id));

          await logUserActivity({
            userId: sessionRecord.userId,
            sessionId: sessionRecord.sessionId,
            eventType: 'Logout',
            moduleName: 'Authentication',
            pagePath: '/api/auth/session',
            actionName: 'Session Expired (Idle Timeout)',
            result: 'Success',
            metadata: { idleMinutes: Math.round(idleTime / 60000) },
          });

          return res.status(401).json({ error: 'Session has expired due to inactivity. Please sign in again.' });
        }

        // Session is Active: fetch user
        const u = await db.select().from(users).where(eq(users.id, sessionRecord.userId)).limit(1);
        if (u.length > 0) {
          targetUser = u[0];
        }
      }
    }

    // 2. Demo User Fallback (`demo-...` or `user-...`)
    if (!targetUser && (token.startsWith('demo-') || token.startsWith('user-'))) {
      const cleanUid = token.replace('demo-', '');
      const existingUser = await db.select().from(users).where(eq(users.uid, cleanUid)).limit(1);
      if (existingUser.length > 0) {
        targetUser = existingUser[0];
      }
    }

    // 3. Firebase Auth Token Fallback
    if (!targetUser) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const { uid, email, name } = decodedToken;
        const safeEmail = email || `${uid}@apexelevators.com`;
        const safeName = name || safeEmail.split('@')[0];

        const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
        if (existing.length > 0) {
          targetUser = existing[0];
        } else {
          // Auto-create user on first login
          const isNamrata = safeEmail.toLowerCase().includes('namrata');
          const assignedRole: UserRole = isNamrata ? 'admin' : 'executive';

          const [newUser] = await db
            .insert(users)
            .values({
              uid,
              email: safeEmail,
              name: safeName,
              role: assignedRole,
              department: assignedRole === 'admin' ? 'Management' : 'Field Sales',
              isActive: true,
            })
            .returning();

          targetUser = newUser;
        }
      } catch {
        // Fallback for UID directly
        const byUid = await db.select().from(users).where(eq(users.uid, token)).limit(1);
        if (byUid.length > 0) {
          targetUser = byUid[0];
        }
      }
    }

    if (!targetUser) {
      return res.status(401).json({ error: 'Unauthorized: Session is invalid or user not found' });
    }

    // Reject deactivated users immediately (Requirement 6 & Acceptance Test 11)
    if (!targetUser.isActive) {
      if (sessionRecord) {
        await db
          .update(userSessions)
          .set({ sessionStatus: 'Revoked', logoutReason: 'Admin Revoked', logoutAt: now, updatedAt: now })
          .where(eq(userSessions.id, sessionRecord.id));
      }
      return res.status(403).json({
        error: 'Forbidden: Account has been deactivated. Please contact your system administrator.',
      });
    }

    // Ensure session record exists in user_sessions for legacy/demo tokens
    if (!sessionRecord) {
      const sessId = headerSessionId || (token.startsWith('sess_') ? token : `sess_legacy_${targetUser.id}`);
      const existingSess = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.sessionId, sessId))
        .limit(1);

      if (existingSess.length > 0) {
        sessionRecord = existingSess[0];
      } else {
        const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
        const ua = req.headers['user-agent'] || 'Browser Client';
        const [newSess] = await db
          .insert(userSessions)
          .values({
            userId: targetUser.id,
            sessionId: sessId,
            loginAt: now,
            lastActivityAt: now,
            sessionStatus: 'Active',
            ipAddress: ip,
            userAgent: ua,
          })
          .returning();
        sessionRecord = newSess;
      }
    }

    // Update last activity timestamp on active session
    if (sessionRecord && sessionRecord.sessionStatus === 'Active') {
      const loginTime = new Date(sessionRecord.loginAt).getTime();
      const currentDuration = Math.max(1, Math.round((now.getTime() - loginTime) / 1000));
      await db
        .update(userSessions)
        .set({
          lastActivityAt: now,
          sessionDurationSeconds: currentDuration,
          updatedAt: now,
        })
        .where(eq(userSessions.id, sessionRecord.id));
    }

    // Load effective permissions
    const permissions = await loadUserPermissions(targetUser.role, targetUser.customPermissions);

    req.user = {
      id: targetUser.id,
      uid: targetUser.uid,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role as UserRole,
      phone: targetUser.phone,
      department: targetUser.department,
      region: targetUser.region,
      reportingManagerId: targetUser.reportingManagerId,
      isActive: targetUser.isActive,
      permissions,
    };
    req.sessionId = sessionRecord ? sessionRecord.sessionId : token;
    req.sessionRecordId = sessionRecord ? sessionRecord.id : undefined;

    next();
  } catch (error) {
    console.error('Authentication verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Authentication failed' });
  }
};

export const requirePermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    if (!req.user.permissions.includes(permission)) {
      // Record security denial event in user_activity_logs & security_events
      await logUserActivity({
        userId: req.user.id,
        sessionId: req.sessionId,
        eventType: 'Access Denied',
        moduleName: 'Authorization',
        pagePath: req.originalUrl || req.path,
        actionName: `Attempted action requiring permission '${permission}'`,
        result: 'Denied',
        metadata: { role: req.user.role, requiredPermission: permission },
      });

      await logSecurityEvent({
        eventType: 'UNAUTHORIZED_ACCESS',
        email: req.user.email,
        userId: req.user.id,
        ipAddress: req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        details: `User '${req.user.email}' (role: ${req.user.role}) denied access to ${req.originalUrl}. Missing '${permission}'.`,
      });

      return res.status(403).json({
        error: `Forbidden: You do not possess the required permission '${permission}'. Job position '${req.user.role}' lacks this authority.`,
      });
    }

    next();
  };
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Record security event
      await logUserActivity({
        userId: req.user.id,
        sessionId: req.sessionId,
        eventType: 'Access Denied',
        moduleName: 'Role Guard',
        pagePath: req.originalUrl || req.path,
        actionName: `Attempted action requiring roles [${allowedRoles.join(', ')}]`,
        result: 'Denied',
        metadata: { role: req.user.role, allowedRoles },
      });

      await logSecurityEvent({
        eventType: 'UNAUTHORIZED_ACCESS',
        email: req.user.email,
        userId: req.user.id,
        ipAddress: req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        details: `User '${req.user.email}' (role: ${req.user.role}) attempted action requiring [${allowedRoles.join(', ')}].`,
      });

      return res.status(403).json({
        error: `Forbidden: Job position '${req.user.role}' is not authorized. Allowed roles: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};
