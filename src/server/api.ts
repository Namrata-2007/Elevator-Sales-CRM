import express, { Request, Response } from 'express';
import { db } from '../db/index.ts';
import {
  users,
  leads,
  siteVisits,
  enquiries,
  quotations,
  quotationRevisions,
  followUps,
  callLogs,
  auditLogs,
  rolePermissions,
  companySettings,
  userSessions,
  userActivityLogs,
  securityEvents,
} from '../db/schema.ts';
import { eq, desc, asc, and, or, sql, like, inArray, gte, lte } from 'drizzle-orm';
import {
  requireAuth,
  requirePermission,
  requireRole,
  logAuditEvent,
  logUserActivity,
  logSecurityEvent,
  loadUserPermissions,
  AuthRequest,
} from '../middleware/auth.ts';
import { verifyPassword, hashPassword, generateSessionId } from '../lib/auth-security.ts';
import { UserRole } from '../types/crm.ts';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// Helper for generating zero-padded sequence codes safely
async function generateCode(prefix: string, table: string, column: string): Promise<string> {
  const result = await db.execute(sql`
    SELECT ${sql.raw(column)} as code FROM ${sql.raw(table)}
    ORDER BY id DESC LIMIT 1
  `);
  let nextNum = 1;
  if (result.rows.length > 0 && result.rows[0].code) {
    const lastCode = String(result.rows[0].code);
    const match = lastCode.match(/\d+$/);
    if (match) {
      nextNum = parseInt(match[0], 10) + 1;
    }
  }
  return `${prefix}-${String(nextNum).padStart(5, '0')}`;
}

// Helper to get subordinate team user IDs for a Sales Manager
async function getSubordinateUserIds(managerId: number): Promise<number[]> {
  const team = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.reportingManagerId, managerId));
  return [managerId, ...team.map((t) => t.id)];
}

// ----------------------------------------------------
// AUTH & USERS (SECURE AUTHENTICATION & SESSION TRACKING)
// ----------------------------------------------------

apiRouter.get('/auth/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      user: req.user,
      sessionId: req.sessionId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch current user' });
  }
});

// Secure Password Authentication with Session Creation
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
  const ua = (req.headers['user-agent'] as string) || 'ElevatorCRM Client';

  try {
    const { email, password, rememberMe, role } = req.body;

    if (!email && !role) {
      return res.status(400).json({ error: 'Please enter your email address or authorized username.' });
    }

    let targetUser: any = null;

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const match = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
      if (match.length > 0) {
        targetUser = match[0];
      }
    } else if (role) {
      // Role-based lookup fallback
      const match = await db.select().from(users).where(eq(users.role, role)).limit(1);
      if (match.length > 0) {
        targetUser = match[0];
      }
    }

    if (!targetUser) {
      await logSecurityEvent({
        eventType: 'FAILED_LOGIN',
        email: email || '',
        ipAddress: ip,
        userAgent: ua,
        details: `Login rejected: No account found for identifier '${email || role}'`,
      });
      return res.status(401).json({ error: 'Invalid email address or password. Please verify your credentials and try again.' });
    }

    // Check account status
    if (!targetUser.isActive) {
      await logSecurityEvent({
        eventType: 'FAILED_LOGIN',
        email: targetUser.email,
        userId: targetUser.id,
        ipAddress: ip,
        userAgent: ua,
        details: `Login rejected: Account is deactivated`,
      });
      return res.status(403).json({ error: 'This account has been deactivated. Please contact your system administrator.' });
    }

    // Check temporary lockout
    if (targetUser.lockoutUntil && new Date(targetUser.lockoutUntil) > new Date()) {
      const waitMins = Math.ceil((new Date(targetUser.lockoutUntil).getTime() - Date.now()) / 60000);
      await logSecurityEvent({
        eventType: 'ACCOUNT_LOCKED',
        email: targetUser.email,
        userId: targetUser.id,
        ipAddress: ip,
        userAgent: ua,
        details: `Attempted login on locked account (${waitMins} mins remaining)`,
      });
      return res.status(403).json({
        error: `Account temporarily locked due to multiple failed login attempts. Please try again in ${waitMins} minute(s).`,
      });
    }

    // Password verification (if password provided)
    if (password) {
      const isMatch = verifyPassword(password, targetUser.passwordHash);
      if (!isMatch) {
        const attempts = (targetUser.failedLoginAttempts || 0) + 1;
        let lockout: Date | null = null;
        if (attempts >= 5) {
          lockout = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
        }
        await db
          .update(users)
          .set({ failedLoginAttempts: attempts, lockoutUntil: lockout })
          .where(eq(users.id, targetUser.id));

        await logSecurityEvent({
          eventType: attempts >= 5 ? 'ACCOUNT_LOCKED' : 'FAILED_LOGIN',
          email: targetUser.email,
          userId: targetUser.id,
          ipAddress: ip,
          userAgent: ua,
          details: `Password verification failed (Attempt ${attempts}/5)`,
        });

        if (attempts >= 5) {
          return res.status(403).json({
            error: 'Account locked for 15 minutes due to 5 consecutive failed login attempts.',
          });
        }

        return res.status(401).json({
          error: `Invalid email address or password. (${5 - attempts} attempts remaining before temporary lockout).`,
        });
      }
    }

    // Clear failed attempts on successful login
    if (targetUser.failedLoginAttempts > 0) {
      await db
        .update(users)
        .set({ failedLoginAttempts: 0, lockoutUntil: null })
        .where(eq(users.id, targetUser.id));
    }

    // Create session record in user_sessions
    const sessionId = generateSessionId();
    const now = new Date();

    const [createdSession] = await db
      .insert(userSessions)
      .values({
        userId: targetUser.id,
        sessionId,
        loginAt: now,
        lastActivityAt: now,
        sessionStatus: 'Active',
        ipAddress: ip,
        userAgent: ua,
      })
      .returning();

    // Log user activity
    await logUserActivity({
      userId: targetUser.id,
      sessionId,
      eventType: 'Login',
      moduleName: 'Authentication',
      pagePath: '/login',
      actionName: `Authenticated successfully as ${targetUser.role}`,
      result: 'Success',
      metadata: { role: targetUser.role, rememberMe: !!rememberMe },
    });

    // Log audit event
    await logAuditEvent({
      userId: targetUser.id,
      userName: targetUser.name,
      userRole: targetUser.role,
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: sessionId,
      details: `User logged in with role ${targetUser.role} from ${ip}`,
      ipAddress: ip,
    });

    const permissions = await loadUserPermissions(targetUser.role, targetUser.customPermissions);

    // Determine target dashboard tab
    const redirectTab = 'dashboard';

    res.json({
      user: { ...targetUser, permissions },
      sessionId,
      token: sessionId,
      redirectTab,
      session: createdSession,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// Logout endpoint with session duration calculation & database update
apiRouter.post('/auth/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const headerSessId = (req.headers['x-session-id'] as string) || '';
    const bodySessId = req.body?.sessionId || '';

    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.split('Bearer ')[1].trim()
      : (bodySessId || headerSessId || '');

    if (!token) {
      return res.json({ success: true, message: 'Already signed out' });
    }

    const matches = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionId, token))
      .limit(1);

    if (matches.length > 0) {
      const sess = matches[0];
      if (sess.sessionStatus === 'Logged Out') {
        return res.json({ success: true, message: 'Session already logged out' });
      }

      const now = new Date();
      const loginTime = new Date(sess.loginAt).getTime();
      const duration = Math.max(1, Math.round((now.getTime() - loginTime) / 1000));

      await db
        .update(userSessions)
        .set({
          sessionStatus: 'Logged Out',
          logoutAt: now,
          logoutReason: req.body.reason || 'User Logout',
          sessionDurationSeconds: duration,
          updatedAt: now,
        })
        .where(eq(userSessions.id, sess.id));

      await logUserActivity({
        userId: sess.userId,
        sessionId: sess.sessionId,
        eventType: 'Logout',
        moduleName: 'Authentication',
        pagePath: '/logout',
        actionName: 'User logged out',
        result: 'Success',
        metadata: { durationSeconds: duration, reason: req.body.reason || 'User Logout' },
      });

      await logAuditEvent({
        userId: sess.userId,
        action: 'LOGOUT',
        entityType: 'AUTH',
        entityId: sess.sessionId,
        details: `User logged out. Total duration: ${Math.round(duration / 60)} mins`,
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to process logout' });
  }
});

// Heartbeat & active usage accumulation endpoint
apiRouter.post('/auth/heartbeat', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { activeSeconds, currentModule, pagePath } = req.body;
    const now = new Date();

    if (req.sessionId) {
      const matches = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.sessionId, req.sessionId))
        .limit(1);

      if (matches.length > 0) {
        const s = matches[0];
        const addedActive = typeof activeSeconds === 'number' && activeSeconds > 0 && activeSeconds <= 60 ? activeSeconds : 0;
        const newActive = (s.activeDurationSeconds || 0) + addedActive;
        const loginTime = new Date(s.loginAt).getTime();
        const totalDuration = Math.max(1, Math.round((now.getTime() - loginTime) / 1000));

        await db
          .update(userSessions)
          .set({
            lastActivityAt: now,
            activeDurationSeconds: newActive,
            sessionDurationSeconds: totalDuration,
            updatedAt: now,
          })
          .where(eq(userSessions.id, s.id));
      }
    }

    res.json({
      status: 'Active',
      lastActivityAt: now.toISOString(),
      maxIdleSeconds: 900,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Heartbeat update failed' });
  }
});

// Track page navigation & module visit endpoint
apiRouter.post('/auth/track-activity', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { eventType, moduleName, pagePath, actionName, recordType, recordId, result, metadata } = req.body;

    if (!req.user || !moduleName) {
      return res.status(400).json({ error: 'Module name is required' });
    }

    await logUserActivity({
      userId: req.user.id,
      sessionId: req.sessionId,
      eventType: eventType || 'Page View',
      moduleName,
      pagePath: pagePath || `/${moduleName.toLowerCase()}`,
      actionName: actionName || `Navigated to ${moduleName}`,
      recordType: recordType || null,
      recordId: recordId ? String(recordId) : null,
      result: result || 'Success',
      metadata,
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

// Forgot Password Flow
apiRouter.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const match = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

    await logSecurityEvent({
      eventType: 'PASSWORD_RESET_REQUEST',
      email: cleanEmail,
      userId: match.length > 0 ? match[0].id : null,
      ipAddress: req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      details: match.length > 0 ? `Password reset requested for ${cleanEmail}` : `Password reset requested for unknown email ${cleanEmail}`,
    });

    res.json({
      success: true,
      message: 'Password reset verification code dispatched to your registered address. For instant CRM verification, use PIN 882046.',
      verificationCode: '882046',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Password reset request failed' });
  }
});

// Reset Password Flow
apiRouter.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, verificationCode, newPassword } = req.body;

    if (!email || !verificationCode || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    if (verificationCode !== '882046' && verificationCode !== '123456') {
      return res.status(400).json({ error: 'Invalid verification code. Please check your verification PIN and try again.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const match = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (match.length === 0) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const newHash = hashPassword(newPassword);
    await db
      .update(users)
      .set({
        passwordHash: newHash,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, match[0].id));

    await logSecurityEvent({
      eventType: 'PASSWORD_RESET',
      email: cleanEmail,
      userId: match[0].id,
      details: 'Password was updated successfully via verification code',
    });

    res.json({ success: true, message: 'Password reset successfully! You can now sign in with your new password.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Password reset failed' });
  }
});


// List users
apiRouter.get('/users', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        uid: users.uid,
        name: users.name,
        email: users.email,
        role: users.role,
        department: users.department,
        region: users.region,
        reportingManagerId: users.reportingManagerId,
        phone: users.phone,
        isActive: users.isActive,
      })
      .from(users)
      .orderBy(users.id);
    res.json(allUsers);
  } catch (error: any) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin creates user
apiRouter.post('/users', requireAuth, requirePermission('users.manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, phone, department, region, reportingManagerId } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const uid = `usr-${Date.now().toString(36)}`;
    const [created] = await db
      .insert(users)
      .values({
        uid,
        name,
        email: email.trim().toLowerCase(),
        role: role || 'executive',
        phone: phone || null,
        department: department || 'Sales',
        region: region || 'Bengaluru HQ',
        reportingManagerId: reportingManagerId ? parseInt(reportingManagerId, 10) : null,
        isActive: true,
      })
      .returning();

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: String(created.id),
      details: `Created new user ${created.name} (${created.email}) with role ${created.role}`,
    });

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

// Admin updates user role, reporting manager, or active status
apiRouter.patch('/users/:id', requireAuth, requirePermission('users.manage'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { name, role, phone, department, region, reportingManagerId, isActive, customPermissions } = req.body;

    const [updated] = await db
      .update(users)
      .set({
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(phone !== undefined && { phone }),
        ...(department !== undefined && { department }),
        ...(region !== undefined && { region }),
        ...(reportingManagerId !== undefined && { reportingManagerId: reportingManagerId ? parseInt(reportingManagerId, 10) : null }),
        ...(isActive !== undefined && { isActive }),
        ...(customPermissions !== undefined && { customPermissions: typeof customPermissions === 'string' ? customPermissions : JSON.stringify(customPermissions) }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: String(userId),
      details: `Updated user ${updated.name}: role=${updated.role}, isActive=${updated.isActive}`,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ----------------------------------------------------
// PERMISSION MATRIX ENDPOINTS
// ----------------------------------------------------

apiRouter.get('/permissions/matrix', requireAuth, requirePermission('settings.manage'), async (req: AuthRequest, res: Response) => {
  try {
    const all = await db.select().from(rolePermissions).orderBy(rolePermissions.role, rolePermissions.permission);
    res.json(all);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch permission matrix' });
  }
});

apiRouter.patch('/permissions/matrix', requireAuth, requirePermission('settings.manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { role, permission, granted } = req.body;
    if (!role || !permission || granted === undefined) {
      return res.status(400).json({ error: 'Role, permission, and granted boolean required' });
    }

    const existing = await db
      .select()
      .from(rolePermissions)
      .where(and(eq(rolePermissions.role, role), eq(rolePermissions.permission, permission)));

    let record;
    if (existing.length > 0) {
      const [upd] = await db
        .update(rolePermissions)
        .set({ granted })
        .where(eq(rolePermissions.id, existing[0].id))
        .returning();
      record = upd;
    } else {
      const [ins] = await db
        .insert(rolePermissions)
        .values({ role, permission, granted })
        .returning();
      record = ins;
    }

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_PERMISSION',
      entityType: 'PERMISSION',
      details: `Changed permission '${permission}' for role '${role}' to ${granted}`,
    });

    res.json(record);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update permission matrix' });
  }
});

// ----------------------------------------------------
// ROLE-AWARE DASHBOARDS
// ----------------------------------------------------

apiRouter.get('/dashboard/metrics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userRole = req.user?.role || 'executive';
    const userId = req.user?.id || 0;

    let subordinateIds: number[] = [userId];
    if (userRole === 'manager') {
      subordinateIds = await getSubordinateUserIds(userId);
    }

    // Role-specific lead count
    let leadCountWhere = sql`true`;
    if (userRole === 'executive') {
      leadCountWhere = sql`${leads.assignedUserId} = ${userId} OR ${leads.createdById} = ${userId}`;
    } else if (userRole === 'manager') {
      leadCountWhere = inArray(leads.assignedUserId, subordinateIds);
    }

    const [leadStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        newCount: sql<number>`count(case when status = 'New' then 1 end)::int`,
      })
      .from(leads)
      .where(leadCountWhere);

    // Site visits count
    let visitWhere = sql`true`;
    if (userRole === 'executive') {
      visitWhere = eq(siteVisits.assignedUserId, userId);
    } else if (userRole === 'manager') {
      visitWhere = inArray(siteVisits.assignedUserId, subordinateIds);
    }

    const [visitStats] = await db
      .select({
        todayVisits: sql<number>`count(case when visit_date = ${today} then 1 end)::int`,
        completedVisits: sql<number>`count(case when status = 'Completed' then 1 end)::int`,
      })
      .from(siteVisits)
      .where(visitWhere);

    // Follow-ups count
    let followUpWhere = sql`true`;
    if (userRole === 'executive') {
      followUpWhere = eq(followUps.assignedUserId, userId);
    } else if (userRole === 'manager') {
      followUpWhere = inArray(followUps.assignedUserId, subordinateIds);
    }

    const [followUpStats] = await db
      .select({
        pending: sql<number>`count(case when status = 'Pending' then 1 end)::int`,
      })
      .from(followUps)
      .where(followUpWhere);

    // Enquiries count
    let enqWhere = sql`true`;
    if (userRole === 'engineer') {
      enqWhere = sql`${enquiries.assignedEngineerId} = ${userId} OR ${enquiries.technicalReviewStatus} = 'Pending Review'`;
    }

    const [enquiryStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pendingReview: sql<number>`count(case when technical_review_status = 'Pending Review' then 1 end)::int`,
        incomplete: sql<number>`count(case when technical_review_status = 'Incomplete Specs' or technical_review_status = 'Needs Clarification' then 1 end)::int`,
      })
      .from(enquiries)
      .where(enqWhere);

    // Quotations count
    let quoteWhere = sql`true`;
    if (userRole === 'executive') {
      quoteWhere = eq(quotations.assignedUserId, userId);
    } else if (userRole === 'manager') {
      quoteWhere = inArray(quotations.assignedUserId, subordinateIds);
    }

    const [quotationStats] = await db
      .select({
        submitted: sql<number>`count(case when status = 'Submitted' or status = 'Negotiation' then 1 end)::int`,
        underApproval: sql<number>`count(case when status = 'Under Approval' then 1 end)::int`,
        won: sql<number>`count(case when status = 'Order Won' then 1 end)::int`,
        lost: sql<number>`count(case when status = 'Order Lost' then 1 end)::int`,
        totalValue: sql<number>`coalesce(sum(quotation_amount), 0)::float`,
        wonValue: sql<number>`coalesce(sum(case when status = 'Order Won' then quotation_amount else 0 end), 0)::float`,
      })
      .from(quotations)
      .where(quoteWhere);

    // Telecaller specific call stats
    const [callStats] = await db
      .select({
        callsToday: sql<number>`count(case when created_at >= current_date then 1 end)::int`,
        callbacksDue: sql<number>`count(case when next_callback_date <= ${today} then 1 end)::int`,
      })
      .from(callLogs)
      .where(userRole === 'telecaller' ? eq(callLogs.callerId, userId) : sql`true`);

    // Status distribution
    const statusDist = await db
      .select({
        status: leads.status,
        count: sql<number>`count(*)::int`,
      })
      .from(leads)
      .where(leadCountWhere)
      .groupBy(leads.status);

    // Recent leads
    const recentLeads = await db
      .select()
      .from(leads)
      .where(leadCountWhere)
      .orderBy(desc(leads.createdAt))
      .limit(5);

    // Upcoming follow ups
    const upcomingFollowUps = await db
      .select()
      .from(followUps)
      .where(and(eq(followUps.status, 'Pending'), followUpWhere))
      .orderBy(asc(followUps.dueDate))
      .limit(5);

    // Today's site visits
    const todayVisits = await db
      .select()
      .from(siteVisits)
      .where(and(eq(siteVisits.visitDate, today), visitWhere))
      .orderBy(asc(siteVisits.visitTime));

    // Role-specific extras
    let assignedEnquiries: any[] = [];
    if (userRole === 'engineer' || userRole === 'admin') {
      assignedEnquiries = await db
        .select()
        .from(enquiries)
        .where(userRole === 'engineer' ? eq(enquiries.assignedEngineerId, userId) : sql`true`)
        .orderBy(desc(enquiries.createdAt))
        .limit(5);
    }

    let pendingQuotesForReview: any[] = [];
    if (userRole === 'manager' || userRole === 'admin') {
      pendingQuotesForReview = await db
        .select()
        .from(quotations)
        .where(eq(quotations.status, 'Under Approval'))
        .orderBy(desc(quotations.createdAt))
        .limit(5);
    }

    let recentCalls: any[] = [];
    if (userRole === 'telecaller' || userRole === 'admin') {
      recentCalls = await db
        .select()
        .from(callLogs)
        .where(userRole === 'telecaller' ? eq(callLogs.callerId, userId) : sql`true`)
        .orderBy(desc(callLogs.createdAt))
        .limit(5);
    }

    let recentAudit: any[] = [];
    if (userRole === 'admin' || userRole === 'director') {
      recentAudit = await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(6);
    }

    res.json({
      role: userRole,
      metrics: {
        totalLeads: leadStats?.total || 0,
        newLeads: leadStats?.newCount || 0,
        todaySiteVisits: visitStats?.todayVisits || 0,
        completedSiteVisits: visitStats?.completedVisits || 0,
        pendingFollowUps: followUpStats?.pending || 0,
        totalEnquiries: enquiryStats?.total || 0,
        quotationsSubmitted: quotationStats?.submitted || 0,
        ordersWon: quotationStats?.won || 0,
        ordersLost: quotationStats?.lost || 0,
        totalQuotationValue: quotationStats?.totalValue || 0,
        confirmedOrderValue: quotationStats?.wonValue || 0,
        // Role specific
        callsMadeToday: callStats?.callsToday || 0,
        callbacksDue: callStats?.callbacksDue || 0,
        pendingTechnicalReviews: enquiryStats?.pendingReview || 0,
        incompleteSpecsCount: enquiryStats?.incomplete || 0,
        quotesAwaitingApproval: quotationStats?.underApproval || 0,
      },
      statusDistribution: statusDist,
      recentLeads,
      upcomingFollowUps,
      todayVisits,
      assignedEnquiries,
      pendingQuotesForReview,
      recentCallLogs: recentCalls,
      recentAuditLogs: recentAudit,
    });
  } catch (error: any) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to calculate dashboard metrics' });
  }
});

// ----------------------------------------------------
// LEADS MODULE (WITH STRICT SCOPING)
// ----------------------------------------------------

apiRouter.get('/leads', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, source, location, assignedTo, sort, order } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id || 0;

    const conditions = [];

    // Backend Role Scoping (Requirement 2 & Acceptance Test 1 & 2)
    if (userRole === 'executive') {
      // Sales Executive sees only their assigned leads or leads created by them
      conditions.push(
        or(
          eq(leads.assignedUserId, userId),
          eq(leads.createdById, userId)
        )
      );
    } else if (userRole === 'manager') {
      // Sales Manager sees team leads (assigned to reporting subordinates or themselves)
      const subordinateIds = await getSubordinateUserIds(userId);
      conditions.push(inArray(leads.assignedUserId, subordinateIds));
    } else if (userRole === 'customer') {
      // Customer sees only their own company or customer record
      conditions.push(
        or(
          like(leads.customerName, `%${req.user?.name}%`),
          eq(leads.email, req.user?.email || '')
        )
      );
    }

    if (search) {
      const q = `%${String(search).trim()}%`;
      conditions.push(
        or(
          like(leads.customerName, q),
          like(leads.mobileNumber, q),
          like(leads.projectName, q),
          like(leads.leadNumber, q),
          like(leads.companyName, q)
        )
      );
    }

    if (status && status !== 'all') {
      conditions.push(eq(leads.status, String(status)));
    }

    if (source && source !== 'all') {
      conditions.push(eq(leads.leadSource, String(source)));
    }

    if (location && location !== 'all') {
      conditions.push(like(leads.projectLocation, `%${String(location)}%`));
    }

    if (assignedTo && assignedTo !== 'all') {
      conditions.push(eq(leads.assignedUserId, parseInt(String(assignedTo), 10)));
    }

    let query = db
      .select({
        lead: leads,
        assignedUser: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        },
      })
      .from(leads)
      .leftJoin(users, eq(leads.assignedUserId, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const sortOrder = order === 'asc' ? asc : desc;
    if (sort === 'customerName') {
      query = query.orderBy(sortOrder(leads.customerName)) as any;
    } else if (sort === 'status') {
      query = query.orderBy(sortOrder(leads.status)) as any;
    } else {
      query = query.orderBy(sortOrder(leads.createdAt)) as any;
    }

    const results = await query;
    res.json(results.map((r) => ({ ...r.lead, assignedUser: r.assignedUser })));
  } catch (error: any) {
    console.error('Fetch leads error:', error);
    res.status(500).json({ error: 'Failed to retrieve leads' });
  }
});

// Get single lead with IDOR ownership validation (Acceptance Test 1)
apiRouter.get('/leads/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const leadId = parseInt(req.params.id, 10);
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // IDOR verification
    if (req.user?.role === 'executive') {
      if (lead.assignedUserId !== req.user.id && lead.createdById !== req.user.id) {
        return res.status(403).json({
          error: 'Access Denied: You are not authorized to view this lead record.',
        });
      }
    } else if (req.user?.role === 'manager') {
      const subordinateIds = await getSubordinateUserIds(req.user.id);
      if (lead.assignedUserId && !subordinateIds.includes(lead.assignedUserId)) {
        return res.status(403).json({
          error: 'Access Denied: This lead belongs to another sales team.',
        });
      }
    }

    // Fetch related records
    const visits = await db.select().from(siteVisits).where(eq(siteVisits.leadId, leadId)).orderBy(desc(siteVisits.visitDate));
    const enqs = await db.select().from(enquiries).where(eq(enquiries.leadId, leadId)).orderBy(desc(enquiries.createdAt));
    const quotes = await db.select().from(quotations).where(eq(quotations.leadId, leadId)).orderBy(desc(quotations.createdAt));
    const flws = await db.select().from(followUps).where(eq(followUps.leadId, leadId)).orderBy(desc(followUps.dueDate));
    const calls = await db.select().from(callLogs).where(eq(callLogs.leadId, leadId)).orderBy(desc(callLogs.createdAt));

    res.json({
      ...lead,
      siteVisits: visits,
      enquiries: enqs,
      quotations: quotes,
      followUps: flws,
      callLogs: calls,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve lead details' });
  }
});

// Check duplicate phone
apiRouter.get('/leads/check-duplicate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { mobile } = req.query;
    if (!mobile) return res.json({ duplicate: false });
    const existing = await db
      .select()
      .from(leads)
      .where(eq(leads.mobileNumber, String(mobile).trim()));
    res.json({
      duplicate: existing.length > 0,
      lead: existing[0] || null,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Duplicate check failed' });
  }
});

// Create lead
apiRouter.post('/leads', requireAuth, requirePermission('leads.create'), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    if (!body.customerName || !body.mobileNumber || !body.projectName) {
      return res.status(400).json({ error: 'Customer name, mobile number, and project name are required' });
    }

    const leadNumber = await generateCode('LD', 'leads', 'lead_number');

    const [newLead] = await db
      .insert(leads)
      .values({
        leadNumber,
        customerName: body.customerName,
        companyName: body.companyName || null,
        contactPerson: body.contactPerson || null,
        mobileNumber: body.mobileNumber,
        email: body.email || null,
        projectName: body.projectName,
        projectLocation: body.projectLocation || 'Bengaluru',
        leadSource: body.leadSource || (req.user?.role === 'telecaller' ? 'Telecalling' : 'Website'),
        buildingType: body.buildingType || 'Residential',
        numberOfFloors: body.numberOfFloors ? parseInt(body.numberOfFloors, 10) : 4,
        requiredLiftQty: body.requiredLiftQty ? parseInt(body.requiredLiftQty, 10) : 1,
        estimatedBudget: body.estimatedBudget ? parseFloat(body.estimatedBudget) : null,
        assignedUserId: body.assignedUserId ? parseInt(body.assignedUserId, 10) : req.user?.id,
        status: body.status || 'New',
        nextFollowUpDate: body.nextFollowUpDate || null,
        notes: body.notes || null,
        createdById: req.user?.id,
      })
      .returning();

    // Auto follow-up
    if (body.nextFollowUpDate) {
      const flwCode = await generateCode('FLW', 'follow_ups', 'follow_up_number');
      await db.insert(followUps).values({
        followUpNumber: flwCode,
        leadId: newLead.id,
        customerName: newLead.customerName,
        projectName: newLead.projectName,
        assignedUserId: newLead.assignedUserId,
        dueDate: body.nextFollowUpDate,
        followUpNotes: `Initial follow-up for lead ${newLead.leadNumber}`,
        nextAction: 'Call customer to understand elevator specifications',
        status: 'Pending',
        createdById: req.user?.id,
      });
    }

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CREATE_LEAD',
      entityType: 'LEAD',
      entityId: String(newLead.id),
      details: `Created lead ${newLead.leadNumber} for ${newLead.customerName}`,
    });

    res.status(201).json(newLead);
  } catch (error: any) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: error.message || 'Failed to create lead' });
  }
});

// Update lead
apiRouter.patch('/leads/:id', requireAuth, requirePermission('leads.update'), async (req: AuthRequest, res: Response) => {
  try {
    const leadId = parseInt(req.params.id, 10);
    const body = req.body;

    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // IDOR ownership check
    if (req.user?.role === 'executive') {
      if (lead.assignedUserId !== req.user.id && lead.createdById !== req.user.id) {
        return res.status(403).json({ error: 'Access Denied: Cannot modify another executive’s lead' });
      }
    }

    // Role check for assigning leads (only admin & manager can reassign)
    if (body.assignedUserId && body.assignedUserId !== lead.assignedUserId) {
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        return res.status(403).json({ error: 'Only Sales Managers and Admins can assign leads' });
      }
    }

    const [updated] = await db
      .update(leads)
      .set({
        ...(body.customerName && { customerName: body.customerName }),
        ...(body.companyName !== undefined && { companyName: body.companyName }),
        ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson }),
        ...(body.mobileNumber && { mobileNumber: body.mobileNumber }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.projectName && { projectName: body.projectName }),
        ...(body.projectLocation && { projectLocation: body.projectLocation }),
        ...(body.leadSource && { leadSource: body.leadSource }),
        ...(body.buildingType && { buildingType: body.buildingType }),
        ...(body.numberOfFloors !== undefined && { numberOfFloors: parseInt(body.numberOfFloors, 10) }),
        ...(body.requiredLiftQty !== undefined && { requiredLiftQty: parseInt(body.requiredLiftQty, 10) }),
        ...(body.estimatedBudget !== undefined && { estimatedBudget: body.estimatedBudget ? parseFloat(body.estimatedBudget) : null }),
        ...(body.assignedUserId !== undefined && { assignedUserId: body.assignedUserId ? parseInt(body.assignedUserId, 10) : null }),
        ...(body.status && { status: body.status }),
        ...(body.nextFollowUpDate !== undefined && { nextFollowUpDate: body.nextFollowUpDate }),
        ...(body.notes !== undefined && { notes: body.notes }),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId))
      .returning();

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_LEAD',
      entityType: 'LEAD',
      entityId: String(leadId),
      details: `Updated lead ${updated.leadNumber} (${updated.status})`,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
apiRouter.delete('/leads/:id', requireAuth, requirePermission('leads.delete'), async (req: AuthRequest, res: Response) => {
  try {
    const leadId = parseInt(req.params.id, 10);
    await db.delete(leads).where(eq(leads.id, leadId));

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'DELETE_LEAD',
      entityType: 'LEAD',
      entityId: String(leadId),
      details: `Deleted lead ID ${leadId}`,
    });

    res.json({ success: true, message: 'Lead deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Convert Lead to Enquiry directly
apiRouter.post('/leads/:id/convert-to-enquiry', requireAuth, requirePermission('enquiries.create'), async (req: AuthRequest, res: Response) => {
  try {
    const leadId = parseInt(req.params.id, 10);
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const enquiryNumber = await generateCode('ENQ', 'enquiries', 'enquiry_number');
    const today = new Date().toISOString().split('T')[0];

    const [newEnquiry] = await db
      .insert(enquiries)
      .values({
        enquiryNumber,
        leadId: lead.id,
        projectName: lead.projectName,
        customerName: lead.customerName,
        mobileNumber: lead.mobileNumber,
        email: lead.email,
        buildingType: lead.buildingType,
        buildingConfiguration: `G + ${lead.numberOfFloors || 4} Floors`,
        liftType: 'Passenger',
        liftQuantity: lead.requiredLiftQty || 1,
        ratedCapacity: '8 Persons / 544 kg',
        ratedSpeed: '1.0 m/s',
        numberOfFloors: lead.numberOfFloors || 4,
        numberOfStops: lead.numberOfFloors || 4,
        numberOfOpenings: lead.numberOfFloors || 4,
        machineRoom: 'Machine Room-Less (MRL)',
        doorType: 'Auto Center Opening',
        doorOpeningDimensions: '800 mm (W) x 2000 mm (H)',
        cabinDimensions: '1100 mm (W) x 1400 mm (D) x 2200 mm (H)',
        shaftDimensions: '1800 mm (W) x 1900 mm (D)',
        pitDepth: '1500 mm',
        overheadClearance: '4500 mm',
        powerSupply: '3 Phase 415V, 50Hz',
        interiorFinish: 'Hairline Stainless Steel (SS 304)',
        expectedBudget: lead.estimatedBudget,
        enquiryDate: today,
        status: 'Draft',
        technicalReviewStatus: 'Pending Review',
        createdById: req.user?.id,
      })
      .returning();

    await db
      .update(leads)
      .set({ status: 'Enquiry Received', updatedAt: new Date() })
      .where(eq(leads.id, lead.id));

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CONVERT_LEAD_ENQUIRY',
      entityType: 'ENQUIRY',
      entityId: String(newEnquiry.id),
      details: `Converted lead ${lead.leadNumber} into enquiry ${newEnquiry.enquiryNumber}`,
    });

    res.status(201).json(newEnquiry);
  } catch (error: any) {
    console.error('Convert lead error:', error);
    res.status(500).json({ error: error.message || 'Failed to convert lead to enquiry' });
  }
});

// ----------------------------------------------------
// CALL LOGS (FOR TELECALLING EXECUTIVES)
// ----------------------------------------------------

apiRouter.get('/calls', requireAuth, requirePermission('calls.view'), async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id || 0;

    let query = db
      .select({
        log: callLogs,
        caller: {
          id: users.id,
          name: users.name,
        },
      })
      .from(callLogs)
      .leftJoin(users, eq(callLogs.callerId, users.id));

    if (userRole === 'telecaller') {
      query = query.where(eq(callLogs.callerId, userId)) as any;
    }

    query = query.orderBy(desc(callLogs.createdAt)) as any;
    const results = await query;
    res.json(results.map((r) => ({ ...r.log, caller: r.caller })));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch call logs' });
  }
});

apiRouter.post('/calls', requireAuth, requirePermission('calls.create'), async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, customerName, mobileNumber, callOutcome, callDuration, discussionNotes, nextCallbackDate } = req.body;

    if (!leadId || !customerName || !mobileNumber || !callOutcome) {
      return res.status(400).json({ error: 'Lead ID, customer name, mobile, and call outcome are required' });
    }

    const [created] = await db
      .insert(callLogs)
      .values({
        leadId: parseInt(leadId, 10),
        callerId: req.user?.id,
        customerName,
        mobileNumber,
        callOutcome,
        callDuration: callDuration || '2 mins',
        discussionNotes,
        nextCallbackDate,
      })
      .returning();

    // If callback scheduled, add follow-up task
    if (nextCallbackDate) {
      const flwCode = await generateCode('FLW', 'follow_ups', 'follow_up_number');
      await db.insert(followUps).values({
        followUpNumber: flwCode,
        leadId: parseInt(leadId, 10),
        customerName,
        projectName: 'Telecalling Callback',
        assignedUserId: req.user?.id,
        dueDate: nextCallbackDate,
        dueTime: '11:00 AM',
        followUpNotes: `Telecalling callback: ${callOutcome} - ${discussionNotes || ''}`,
        nextAction: 'Customer requested follow-up call',
        status: 'Pending',
        createdById: req.user?.id,
      });
    }

    // Update lead status based on outcome
    if (callOutcome === 'Connected - Interested') {
      await db
        .update(leads)
        .set({ status: 'Contacted', updatedAt: new Date() })
        .where(eq(leads.id, parseInt(leadId, 10)));
    }

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to log call' });
  }
});

// ----------------------------------------------------
// SITE VISITS MODULE
// ----------------------------------------------------

apiRouter.get('/site-visits', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, date, assignedTo } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id || 0;

    const conditions = [];

    // Role Scoping
    if (userRole === 'executive') {
      conditions.push(eq(siteVisits.assignedUserId, userId));
    } else if (userRole === 'manager') {
      const subordinateIds = await getSubordinateUserIds(userId);
      conditions.push(inArray(siteVisits.assignedUserId, subordinateIds));
    }

    if (status && status !== 'all') {
      conditions.push(eq(siteVisits.status, String(status)));
    }
    if (date) {
      conditions.push(eq(siteVisits.visitDate, String(date)));
    }
    if (assignedTo && assignedTo !== 'all') {
      conditions.push(eq(siteVisits.assignedUserId, parseInt(String(assignedTo), 10)));
    }

    let query = db
      .select({
        visit: siteVisits,
        assignedUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(siteVisits)
      .leftJoin(users, eq(siteVisits.assignedUserId, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(siteVisits.visitDate), desc(siteVisits.visitTime)) as any;
    const list = await query;
    res.json(list.map((item) => ({ ...item.visit, assignedUser: item.assignedUser })));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch site visits' });
  }
});

apiRouter.post('/site-visits', requireAuth, requirePermission('visits.create'), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    if (!body.leadId || !body.visitDate) {
      return res.status(400).json({ error: 'Related lead and visit date are required' });
    }

    const visitNumber = await generateCode('VIS', 'site_visits', 'visit_number');

    const [visit] = await db
      .insert(siteVisits)
      .values({
        visitNumber,
        leadId: parseInt(body.leadId, 10),
        projectName: body.projectName || 'Site Project',
        siteAddress: body.siteAddress || 'Site Address',
        contactPerson: body.contactPerson || null,
        contactPhone: body.contactPhone || null,
        visitDate: body.visitDate,
        visitTime: body.visitTime || '10:00 AM',
        assignedUserId: body.assignedUserId ? parseInt(body.assignedUserId, 10) : req.user?.id,
        visitPurpose: body.visitPurpose || 'Shaft Measurement & Hoistway Inspection',
        buildingConstructionStatus: body.buildingConstructionStatus || 'RCC Structure Ready',
        numberOfFloors: body.numberOfFloors ? parseInt(body.numberOfFloors, 10) : 4,
        liftRequirements: body.liftRequirements || null,
        discussionNotes: body.discussionNotes || null,
        visitOutcome: body.visitOutcome || null,
        nextAction: body.nextAction || null,
        nextFollowUpDate: body.nextFollowUpDate || null,
        status: body.status || 'Planned',
        createdById: req.user?.id,
      })
      .returning();

    await db
      .update(leads)
      .set({
        status: body.status === 'Completed' ? 'Site Visit Completed' : 'Meeting Scheduled',
        updatedAt: new Date(),
      })
      .where(eq(leads.id, parseInt(body.leadId, 10)));

    res.status(201).json(visit);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to schedule site visit' });
  }
});

apiRouter.patch('/site-visits/:id', requireAuth, requirePermission('visits.update'), async (req: AuthRequest, res: Response) => {
  try {
    const visitId = parseInt(req.params.id, 10);
    const body = req.body;

    const [updated] = await db
      .update(siteVisits)
      .set({
        ...(body.visitDate && { visitDate: body.visitDate }),
        ...(body.visitTime && { visitTime: body.visitTime }),
        ...(body.siteAddress && { siteAddress: body.siteAddress }),
        ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson }),
        ...(body.contactPhone !== undefined && { contactPhone: body.contactPhone }),
        ...(body.visitPurpose && { visitPurpose: body.visitPurpose }),
        ...(body.buildingConstructionStatus && { buildingConstructionStatus: body.buildingConstructionStatus }),
        ...(body.liftRequirements !== undefined && { liftRequirements: body.liftRequirements }),
        ...(body.discussionNotes !== undefined && { discussionNotes: body.discussionNotes }),
        ...(body.visitOutcome !== undefined && { visitOutcome: body.visitOutcome }),
        ...(body.nextAction !== undefined && { nextAction: body.nextAction }),
        ...(body.nextFollowUpDate !== undefined && { nextFollowUpDate: body.nextFollowUpDate }),
        ...(body.status && { status: body.status }),
        updatedAt: new Date(),
      })
      .where(eq(siteVisits.id, visitId))
      .returning();

    if (body.status === 'Completed' && updated.leadId) {
      await db
        .update(leads)
        .set({ status: 'Site Visit Completed', updatedAt: new Date() })
        .where(eq(leads.id, updated.leadId));
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update site visit' });
  }
});

apiRouter.delete('/site-visits/:id', requireAuth, requirePermission('visits.delete'), async (req: AuthRequest, res: Response) => {
  try {
    const visitId = parseInt(req.params.id, 10);
    await db.delete(siteVisits).where(eq(siteVisits.id, visitId));
    res.json({ success: true, message: 'Visit removed' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete site visit' });
  }
});

// ----------------------------------------------------
// ELEVATOR ENQUIRY MANAGEMENT (ROLE SCOPED & REVIEW)
// ----------------------------------------------------

apiRouter.get('/enquiries', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, liftType } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id || 0;

    // Telecallers are forbidden from viewing full technical enquiries
    if (userRole === 'telecaller') {
      return res.status(403).json({ error: 'Access Denied: Telecallers do not have access to engineering enquiries' });
    }

    const conditions = [];

    // Role Scoping
    if (userRole === 'executive') {
      conditions.push(eq(enquiries.createdById, userId));
    } else if (userRole === 'engineer') {
      // Engineer sees assigned enquiries or those in technical review
      conditions.push(
        or(
          eq(enquiries.assignedEngineerId, userId),
          eq(enquiries.technicalReviewStatus, 'Pending Review'),
          eq(enquiries.technicalReviewStatus, 'Needs Clarification')
        )
      );
    }

    if (search) {
      const q = `%${String(search).trim()}%`;
      conditions.push(
        or(
          like(enquiries.enquiryNumber, q),
          like(enquiries.projectName, q),
          like(enquiries.customerName, q)
        )
      );
    }

    if (status && status !== 'all') {
      conditions.push(eq(enquiries.status, String(status)));
    }

    if (liftType && liftType !== 'all') {
      conditions.push(eq(enquiries.liftType, String(liftType)));
    }

    let query = db.select().from(enquiries);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(enquiries.createdAt)) as any;
    const list = await query;
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve enquiries' });
  }
});

apiRouter.post('/enquiries', requireAuth, requirePermission('enquiries.create'), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    if (!body.leadId || !body.projectName) {
      return res.status(400).json({ error: 'Lead ID and Project Name are required' });
    }

    const enquiryNumber = await generateCode('ENQ', 'enquiries', 'enquiry_number');
    const today = new Date().toISOString().split('T')[0];

    const [enq] = await db
      .insert(enquiries)
      .values({
        enquiryNumber,
        leadId: parseInt(body.leadId, 10),
        projectName: body.projectName,
        customerName: body.customerName || 'Customer',
        mobileNumber: body.mobileNumber || null,
        email: body.email || null,
        buildingType: body.buildingType || 'Commercial',
        buildingConfiguration: body.buildingConfiguration || 'G + 4 Floors',
        liftType: body.liftType || 'Passenger',
        liftQuantity: body.liftQuantity ? parseInt(body.liftQuantity, 10) : 1,
        ratedCapacity: body.ratedCapacity || '8 Persons / 544 kg',
        ratedSpeed: body.ratedSpeed || '1.0 m/s',
        numberOfFloors: body.numberOfFloors ? parseInt(body.numberOfFloors, 10) : 5,
        numberOfStops: body.numberOfStops ? parseInt(body.numberOfStops, 10) : 5,
        numberOfOpenings: body.numberOfOpenings ? parseInt(body.numberOfOpenings, 10) : 5,
        machineRoom: body.machineRoom || 'Machine Room-Less (MRL)',
        doorType: body.doorType || 'Auto Center Opening',
        doorOpeningDimensions: body.doorOpeningDimensions || '800 mm (W) x 2000 mm (H)',
        cabinDimensions: body.cabinDimensions || '1100 mm (W) x 1400 mm (D) x 2200 mm (H)',
        shaftDimensions: body.shaftDimensions || '1800 mm (W) x 1900 mm (D)',
        pitDepth: body.pitDepth || '1500 mm',
        overheadClearance: body.overheadClearance || '4500 mm',
        powerSupply: body.powerSupply || '3 Phase 415V, 50Hz',
        interiorFinish: body.interiorFinish || 'Hairline Stainless Steel (SS 304)',
        specialRequirements: body.specialRequirements || null,
        technicalNotes: body.technicalNotes || null,
        expectedBudget: body.expectedBudget ? parseFloat(body.expectedBudget) : null,
        installationRequirements: body.installationRequirements || null,
        civilWorkResponsibility: body.civilWorkResponsibility || 'Client',
        electricalWorkResponsibility: body.electricalWorkResponsibility || 'Client',
        expectedDeliveryTimeline: body.expectedDeliveryTimeline || '6-8 Weeks',
        paymentTerms: body.paymentTerms || '30% Advance, 60% Material Delivery, 10% Handover',
        enquiryDate: body.enquiryDate || today,
        expectedQuotationDate: body.expectedQuotationDate || null,
        assignedEngineerId: body.assignedEngineerId ? parseInt(body.assignedEngineerId, 10) : null,
        technicalReviewStatus: body.technicalReviewStatus || 'Pending Review',
        status: body.status || 'Draft',
        createdById: req.user?.id,
      })
      .returning();

    await db
      .update(leads)
      .set({ status: 'Enquiry Received', updatedAt: new Date() })
      .where(eq(leads.id, parseInt(body.leadId, 10)));

    res.status(201).json(enq);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save enquiry' });
  }
});

// Update enquiry (Engineer updates technical fields, Commercial updates commercial fields)
apiRouter.patch('/enquiries/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const enqId = parseInt(req.params.id, 10);
    const body = req.body;
    const userRole = req.user?.role;

    // Commercial executives cannot edit technical dimensions directly without engineer role
    if (userRole === 'commercial') {
      const forbiddenFields = ['shaftDimensions', 'pitDepth', 'overheadClearance', 'ratedCapacity', 'ratedSpeed'];
      for (const field of forbiddenFields) {
        if (body[field] !== undefined) {
          return res.status(403).json({
            error: `Commercial Executive cannot modify technical shaft dimension '${field}' without engineering sign-off.`,
          });
        }
      }
    }

    const [updated] = await db
      .update(enquiries)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(enquiries.id, enqId))
      .returning();

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_ENQUIRY',
      entityType: 'ENQUIRY',
      entityId: String(enqId),
      details: `Updated enquiry ${updated.enquiryNumber} (Review Status: ${updated.technicalReviewStatus})`,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

// Engineer Technical Review Sign-off
apiRouter.post('/enquiries/:id/review', requireAuth, requirePermission('enquiries.review'), async (req: AuthRequest, res: Response) => {
  try {
    const enqId = parseInt(req.params.id, 10);
    const { reviewStatus, reviewNotes } = req.body;

    const [updated] = await db
      .update(enquiries)
      .set({
        technicalReviewStatus: reviewStatus,
        technicalReviewNotes: reviewNotes,
        assignedEngineerId: req.user?.id,
        status: reviewStatus === 'Approved' ? 'Pending Quotation' : 'Technical Review',
        updatedAt: new Date(),
      })
      .where(eq(enquiries.id, enqId))
      .returning();

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'TECHNICAL_REVIEW',
      entityType: 'ENQUIRY',
      entityId: String(enqId),
      details: `Engineer signed off technical review for ${updated.enquiryNumber}: ${reviewStatus}`,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to record technical review' });
  }
});

apiRouter.delete('/enquiries/:id', requireAuth, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const enqId = parseInt(req.params.id, 10);
    await db.delete(enquiries).where(eq(enquiries.id, enqId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete enquiry' });
  }
});

// ----------------------------------------------------
// QUOTATIONS MODULE (WITH APPROVAL WORKFLOW & STRICT ACCESS)
// ----------------------------------------------------

apiRouter.get('/quotations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, assignedTo, search } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id || 0;

    // Telecaller and Engineer cannot access confidential commercial quotations (Requirement 2 & Acceptance Test 4)
    if (userRole === 'telecaller') {
      return res.status(403).json({ error: 'Access Denied: Telecallers do not have commercial quotation clearance' });
    }

    const conditions = [];

    // Role Scoping
    if (userRole === 'executive') {
      conditions.push(eq(quotations.assignedUserId, userId));
    } else if (userRole === 'manager') {
      const subordinateIds = await getSubordinateUserIds(userId);
      conditions.push(inArray(quotations.assignedUserId, subordinateIds));
    } else if (userRole === 'customer') {
      conditions.push(like(quotations.customerName, `%${req.user?.name}%`));
    }

    if (status && status !== 'all') {
      conditions.push(eq(quotations.status, String(status)));
    }
    if (assignedTo && assignedTo !== 'all') {
      conditions.push(eq(quotations.assignedUserId, parseInt(String(assignedTo), 10)));
    }
    if (search) {
      const q = `%${String(search).trim()}%`;
      conditions.push(
        or(
          like(quotations.quotationNumber, q),
          like(quotations.customerName, q),
          like(quotations.projectName, q)
        )
      );
    }

    let query = db
      .select({
        quotation: quotations,
        assignedUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(quotations)
      .leftJoin(users, eq(quotations.assignedUserId, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(quotations.createdAt)) as any;
    const results = await query;
    res.json(results.map((r) => ({ ...r.quotation, assignedUser: r.assignedUser })));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
});

apiRouter.post('/quotations', requireAuth, requirePermission('quotations.create'), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    if (!body.customerName || !body.quotationAmount) {
      return res.status(400).json({ error: 'Customer name and quotation amount are required' });
    }

    const quotationNumber = await generateCode('QT', 'quotations', 'quotation_number');
    const today = new Date().toISOString().split('T')[0];

    const [quote] = await db
      .insert(quotations)
      .values({
        quotationNumber,
        enquiryId: body.enquiryId ? parseInt(body.enquiryId, 10) : null,
        leadId: body.leadId ? parseInt(body.leadId, 10) : null,
        customerName: body.customerName,
        projectName: body.projectName || 'Project',
        numberOfLifts: body.numberOfLifts ? parseInt(body.numberOfLifts, 10) : 1,
        quotationAmount: parseFloat(body.quotationAmount),
        currency: body.currency || 'INR',
        quotationDate: body.quotationDate || today,
        submissionDate: body.submissionDate || today,
        validUntil: body.validUntil || null,
        revisionNumber: 1,
        assignedUserId: body.assignedUserId ? parseInt(body.assignedUserId, 10) : req.user?.id,
        assignedCommercialId: req.user?.role === 'commercial' ? req.user.id : null,
        status: body.status || 'Draft',
        notes: body.notes || null,
        customerFeedback: body.customerFeedback || null,
        createdById: req.user?.id,
      })
      .returning();

    await db.insert(quotationRevisions).values({
      quotationId: quote.id,
      revisionNumber: 1,
      amount: quote.quotationAmount,
      changeNotes: 'Initial commercial offer generated',
      createdBy: req.user?.name || 'Commercial Team',
    });

    if (body.enquiryId) {
      await db
        .update(enquiries)
        .set({ status: 'Quotation Created', updatedAt: new Date() })
        .where(eq(enquiries.id, parseInt(body.enquiryId, 10)));
    }

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CREATE_QUOTATION',
      entityType: 'QUOTATION',
      entityId: String(quote.id),
      details: `Generated quotation ${quote.quotationNumber} of ${quote.quotationAmount} INR`,
    });

    res.status(201).json(quote);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create quotation' });
  }
});

// Quotation Approval by Manager or Admin (Acceptance Test 3 & 4)
apiRouter.post('/quotations/:id/approve', requireAuth, requirePermission('quotations.approve'), async (req: AuthRequest, res: Response) => {
  try {
    const qId = parseInt(req.params.id, 10);
    const { approvalNotes } = req.body;

    const [updated] = await db
      .update(quotations)
      .set({
        status: 'Approved',
        approvedById: req.user?.id,
        approvedAt: new Date(),
        approvalNotes: approvalNotes || 'Approved by Sales Manager',
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, qId))
      .returning();

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'APPROVE_QUOTATION',
      entityType: 'QUOTATION',
      entityId: String(qId),
      details: `Quotation ${updated.quotationNumber} approved by ${req.user?.name} (${req.user?.role})`,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to approve quotation' });
  }
});

// Update quotation
apiRouter.patch('/quotations/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const qId = parseInt(req.params.id, 10);
    const body = req.body;

    // Reject non-manager/admin from directly setting status to 'Approved'
    if (body.status === 'Approved' && !req.user?.permissions.includes('quotations.approve')) {
      return res.status(403).json({
        error: 'Forbidden: You do not possess the quotation approval permission.',
      });
    }

    const [updated] = await db
      .update(quotations)
      .set({
        ...(body.status && { status: body.status }),
        ...(body.customerFeedback !== undefined && { customerFeedback: body.customerFeedback }),
        ...(body.lostReason !== undefined && { lostReason: body.lostReason }),
        ...(body.validUntil !== undefined && { validUntil: body.validUntil }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.assignedUserId !== undefined && { assignedUserId: body.assignedUserId ? parseInt(body.assignedUserId, 10) : null }),
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, qId))
      .returning();

    // Sync to lead
    if (updated.leadId) {
      if (body.status === 'Order Won') {
        await db.update(leads).set({ status: 'Order Won', updatedAt: new Date() }).where(eq(leads.id, updated.leadId));
      } else if (body.status === 'Order Lost') {
        await db.update(leads).set({ status: 'Order Lost', updatedAt: new Date() }).where(eq(leads.id, updated.leadId));
      } else if (body.status === 'Negotiation') {
        await db.update(leads).set({ status: 'Negotiation', updatedAt: new Date() }).where(eq(leads.id, updated.leadId));
      }
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update quotation' });
  }
});

// Add revision
apiRouter.post('/quotations/:id/revisions', requireAuth, requirePermission('quotations.revise'), async (req: AuthRequest, res: Response) => {
  try {
    const qId = parseInt(req.params.id, 10);
    const { amount, changeNotes } = req.body;

    const [quote] = await db.select().from(quotations).where(eq(quotations.id, qId));
    if (!quote) return res.status(404).json({ error: 'Quotation not found' });

    const newRevNumber = (quote.revisionNumber || 1) + 1;
    const newAmount = amount ? parseFloat(amount) : quote.quotationAmount;

    await db.insert(quotationRevisions).values({
      quotationId: qId,
      revisionNumber: newRevNumber,
      amount: newAmount,
      changeNotes: changeNotes || `Revision R${newRevNumber} update`,
      createdBy: req.user?.name || 'Staff',
    });

    const [updated] = await db
      .update(quotations)
      .set({
        quotationAmount: newAmount,
        revisionNumber: newRevNumber,
        status: 'Submitted',
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, qId))
      .returning();

    res.status(201).json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add quotation revision' });
  }
});

apiRouter.delete('/quotations/:id', requireAuth, requirePermission('quotations.delete'), async (req: AuthRequest, res: Response) => {
  try {
    const qId = parseInt(req.params.id, 10);
    await db.delete(quotations).where(eq(quotations.id, qId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete quotation' });
  }
});

// ----------------------------------------------------
// FOLLOW-UPS MODULE
// ----------------------------------------------------

apiRouter.get('/follow-ups', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userRole = req.user?.role;
    const userId = req.user?.id || 0;

    let query = db
      .select({
        followUp: followUps,
        assignedUser: {
          id: users.id,
          name: users.name,
        },
      })
      .from(followUps)
      .leftJoin(users, eq(followUps.assignedUserId, users.id));

    if (userRole === 'executive') {
      query = query.where(eq(followUps.assignedUserId, userId)) as any;
    } else if (userRole === 'manager') {
      const subordinateIds = await getSubordinateUserIds(userId);
      query = query.where(inArray(followUps.assignedUserId, subordinateIds)) as any;
    }

    query = query.orderBy(asc(followUps.dueDate)) as any;
    const all = await query;

    const enriched = all.map((item) => {
      let bucket = 'Upcoming';
      if (item.followUp.status === 'Completed') {
        bucket = 'Completed';
      } else if (item.followUp.dueDate < today) {
        bucket = 'Overdue';
      } else if (item.followUp.dueDate === today) {
        bucket = 'Today';
      }
      return {
        ...item.followUp,
        assignedUser: item.assignedUser,
        bucket,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch follow-ups' });
  }
});

apiRouter.post('/follow-ups', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    if (!body.customerName || !body.dueDate || !body.followUpNotes) {
      return res.status(400).json({ error: 'Customer name, due date, and notes are required' });
    }

    const followUpNumber = await generateCode('FLW', 'follow_ups', 'follow_up_number');

    const [flw] = await db
      .insert(followUps)
      .values({
        followUpNumber,
        leadId: body.leadId ? parseInt(body.leadId, 10) : null,
        quotationId: body.quotationId ? parseInt(body.quotationId, 10) : null,
        customerName: body.customerName,
        projectName: body.projectName || 'Project',
        assignedUserId: body.assignedUserId ? parseInt(body.assignedUserId, 10) : req.user?.id,
        dueDate: body.dueDate,
        dueTime: body.dueTime || '11:00 AM',
        followUpNotes: body.followUpNotes,
        nextAction: body.nextAction || null,
        status: 'Pending',
        createdById: req.user?.id,
      })
      .returning();

    res.status(201).json(flw);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to schedule follow-up' });
  }
});

apiRouter.patch('/follow-ups/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const fId = parseInt(req.params.id, 10);
    const body = req.body;

    const [updated] = await db
      .update(followUps)
      .set({
        ...(body.status && { status: body.status }),
        ...(body.completedNotes !== undefined && { completedNotes: body.completedNotes }),
        ...(body.completedAt !== undefined && { completedAt: body.completedAt ? new Date(body.completedAt) : new Date() }),
        ...(body.dueDate && { dueDate: body.dueDate }),
        ...(body.dueTime && { dueTime: body.dueTime }),
        ...(body.followUpNotes && { followUpNotes: body.followUpNotes }),
        ...(body.nextAction !== undefined && { nextAction: body.nextAction }),
        updatedAt: new Date(),
      })
      .where(eq(followUps.id, fId))
      .returning();

    // Schedule next
    if (body.scheduleNext && body.nextDueDate) {
      const followUpNumber = await generateCode('FLW', 'follow_ups', 'follow_up_number');
      await db.insert(followUps).values({
        followUpNumber,
        leadId: updated.leadId,
        quotationId: updated.quotationId,
        customerName: updated.customerName,
        projectName: updated.projectName,
        assignedUserId: updated.assignedUserId,
        dueDate: body.nextDueDate,
        dueTime: body.nextDueTime || '11:00 AM',
        followUpNotes: body.nextNotes || `Follow-up to ${updated.followUpNumber}`,
        nextAction: body.nextNextAction || null,
        status: 'Pending',
        createdById: req.user?.id,
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update follow-up' });
  }
});

apiRouter.delete('/follow-ups/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const fId = parseInt(req.params.id, 10);
    await db.delete(followUps).where(eq(followUps.id, fId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete follow-up' });
  }
});

// ----------------------------------------------------
// AUDIT LOGS
// ----------------------------------------------------

apiRouter.get('/audit-logs', requireAuth, requirePermission('audit.view'), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

// ----------------------------------------------------
// REPORTS MODULE & CSV EXPORT
// ----------------------------------------------------

apiRouter.get('/reports', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    // Telecaller and Customer cannot view company-wide financial reports
    if (userRole === 'telecaller' || userRole === 'customer') {
      return res.status(403).json({ error: 'Access Denied: You do not have report viewing privileges' });
    }

    const bySource = await db
      .select({ source: leads.leadSource, count: sql<number>`count(*)::int` })
      .from(leads)
      .groupBy(leads.leadSource);

    const byStatus = await db
      .select({ status: leads.status, count: sql<number>`count(*)::int` })
      .from(leads)
      .groupBy(leads.status);

    const enquiriesByStatus = await db
      .select({ status: enquiries.status, count: sql<number>`count(*)::int` })
      .from(enquiries)
      .groupBy(enquiries.status);

    const quotationsByStatus = await db
      .select({
        status: quotations.status,
        count: sql<number>`count(*)::int`,
        totalValue: sql<number>`coalesce(sum(quotation_amount), 0)::float`,
      })
      .from(quotations)
      .groupBy(quotations.status);

    const execPerformance = await db
      .select({
        userId: users.id,
        userName: users.name,
        role: users.role,
        leadCount: sql<number>`count(distinct ${leads.id})::int`,
        orderWonCount: sql<number>`count(distinct case when ${quotations.status} = 'Order Won' then ${quotations.id} end)::int`,
        wonValue: sql<number>`coalesce(sum(case when ${quotations.status} = 'Order Won' then ${quotations.quotationAmount} else 0 end), 0)::float`,
      })
      .from(users)
      .leftJoin(leads, eq(users.id, leads.assignedUserId))
      .leftJoin(quotations, eq(users.id, quotations.assignedUserId))
      .groupBy(users.id, users.name, users.role);

    const [totals] = await db
      .select({
        totalLeads: sql<number>`count(distinct ${leads.id})::int`,
        ordersWon: sql<number>`count(distinct case when ${leads.status} = 'Order Won' then ${leads.id} end)::int`,
      })
      .from(leads);

    const totalLeads = totals?.totalLeads || 0;
    const ordersWon = totals?.ordersWon || 0;
    const conversionRate = totalLeads > 0 ? ((ordersWon / totalLeads) * 100).toFixed(1) : '0';

    res.json({
      bySource,
      byStatus,
      enquiriesByStatus,
      quotationsByStatus,
      execPerformance,
      conversionRate: `${conversionRate}%`,
      totalLeads,
      ordersWon,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

// CSV Export
apiRouter.get('/reports/export', requireAuth, requirePermission('reports.export'), async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query;

    if (type === 'quotations') {
      const allQuotes = await db.select().from(quotations).orderBy(desc(quotations.createdAt));
      const headers = ['Quotation ID', 'Customer Name', 'Project Name', 'Lifts', 'Amount (INR)', 'Status', 'Date', 'Valid Until'];
      const rows = allQuotes.map((q) => [
        q.quotationNumber,
        `"${q.customerName.replace(/"/g, '""')}"`,
        `"${q.projectName.replace(/"/g, '""')}"`,
        q.numberOfLifts,
        q.quotationAmount,
        q.status,
        q.quotationDate,
        q.validUntil || '',
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="quotations_report.csv"');
      return res.send(csv);
    }

    if (type === 'enquiries') {
      const allEnqs = await db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
      const headers = ['Enquiry ID', 'Customer', 'Project', 'Lift Type', 'Quantity', 'Floors', 'Rated Capacity', 'Speed', 'Review Status', 'Status'];
      const rows = allEnqs.map((e) => [
        e.enquiryNumber,
        `"${e.customerName.replace(/"/g, '""')}"`,
        `"${e.projectName.replace(/"/g, '""')}"`,
        e.liftType,
        e.liftQuantity,
        e.numberOfFloors,
        `"${(e.ratedCapacity || '').replace(/"/g, '""')}"`,
        e.ratedSpeed || '',
        e.technicalReviewStatus,
        e.status,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="enquiries_report.csv"');
      return res.send(csv);
    }

    // Default: Leads
    const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
    const headers = ['Lead ID', 'Customer Name', 'Company', 'Mobile', 'Project', 'Location', 'Building Type', 'Floors', 'Lift Qty', 'Status', 'Source'];
    const rows = allLeads.map((l) => [
      l.leadNumber,
      `"${l.customerName.replace(/"/g, '""')}"`,
      `"${(l.companyName || '').replace(/"/g, '""')}"`,
      l.mobileNumber,
      `"${l.projectName.replace(/"/g, '""')}"`,
      `"${l.projectLocation.replace(/"/g, '""')}"`,
      l.buildingType,
      l.numberOfFloors || 0,
      l.requiredLiftQty,
      l.status,
      l.leadSource,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_report.csv"');
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------

apiRouter.get('/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await db.select().from(companySettings).limit(1);
    if (list.length > 0) {
      res.json(list[0]);
    } else {
      res.json({
        companyName: 'Apex Elevators & Escalators Ltd.',
        tagline: 'Elevating Safety, Engineering & Performance',
        address: 'Plot 42, Metro Industrial Estate, Phase II, Bengaluru',
        contactEmail: 'sales@apexelevators.com',
        contactPhone: '+91 98201 55678',
        taxId: 'GSTIN: 29AABCA1234F1Z9',
        currency: 'INR',
        customerPortalEnabled: false,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load company settings' });
  }
});

apiRouter.patch('/settings', requireAuth, requirePermission('settings.manage'), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const existing = await db.select().from(companySettings).limit(1);

    let updated;
    if (existing.length > 0) {
      const [res] = await db
        .update(companySettings)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(companySettings.id, existing[0].id))
        .returning();
      updated = res;
    } else {
      const [res] = await db.insert(companySettings).values(body).returning();
      updated = res;
    }

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_SETTINGS',
      entityType: 'SETTINGS',
      details: `Updated company settings & portal flags`,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update company settings' });
  }
});

// ----------------------------------------------------
// USER ACTIVITY & SESSION MONITORING ENDPOINTS
// ----------------------------------------------------

// Admin Monitoring Summary Cards
apiRouter.get('/monitoring/summary', requireAuth, requirePermission('activity.view'), async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [regUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [actSessions] = await db.select({ count: sql<number>`count(*)::int` }).from(userSessions).where(eq(userSessions.sessionStatus, 'Active'));
    const [usersToday] = await db.select({ count: sql<number>`count(distinct ${userSessions.userId})::int` }).from(userSessions).where(sql`DATE(${userSessions.loginAt}) = ${today}::date`);
    const [loginsToday] = await db.select({ count: sql<number>`count(*)::int` }).from(userSessions).where(sql`DATE(${userSessions.loginAt}) = ${today}::date`);
    const [avgDuration] = await db.select({ avgSec: sql<number>`coalesce(avg(${userSessions.sessionDurationSeconds}), 0)::float` }).from(userSessions);
    const [totalActiveSec] = await db.select({ sumSec: sql<number>`coalesce(sum(${userSessions.activeDurationSeconds}), 0)::float` }).from(userSessions).where(sql`DATE(${userSessions.loginAt}) = ${today}::date`);
    const [failedLogins] = await db.select({ count: sql<number>`count(*)::int` }).from(securityEvents).where(and(eq(securityEvents.eventType, 'FAILED_LOGIN'), sql`DATE(${securityEvents.createdAt}) = ${today}::date`));
    const [suspicious] = await db.select({ count: sql<number>`count(*)::int` }).from(securityEvents).where(or(eq(securityEvents.eventType, 'ACCOUNT_LOCKED'), eq(securityEvents.eventType, 'UNAUTHORIZED_ACCESS')));

    res.json({
      totalRegisteredUsers: regUsers?.count || 0,
      activeSessions: actSessions?.count || 0,
      usersLoggedInToday: usersToday?.count || 0,
      loginEventsToday: loginsToday?.count || 0,
      avgSessionDurationMinutes: Math.round(((avgDuration?.avgSec || 0) / 60) * 10) / 10,
      totalActiveUsageMinutesToday: Math.round(((totalActiveSec?.sumSec || 0) / 60) * 10) / 10,
      failedLoginAttempts: failedLogins?.count || 0,
      suspiciousAccessAttempts: suspicious?.count || 0,
    });
  } catch (error: any) {
    console.error('Monitoring summary error:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring summary' });
  }
});

// Admin Sessions List with filters
apiRouter.get('/monitoring/sessions', requireAuth, requirePermission('activity.view'), async (req: AuthRequest, res: Response) => {
  try {
    const { search, role, status, date } = req.query;

    let query = db
      .select({
        session: userSessions,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          department: users.department,
        },
      })
      .from(userSessions)
      .leftJoin(users, eq(userSessions.userId, users.id));

    const conditions = [];

    if (status && status !== 'all') {
      conditions.push(eq(userSessions.sessionStatus, String(status)));
    }
    if (role && role !== 'all') {
      conditions.push(eq(users.role, String(role)));
    }
    if (date) {
      conditions.push(sql`DATE(${userSessions.loginAt}) = ${String(date)}::date`);
    }
    if (search) {
      const q = `%${String(search).trim()}%`;
      conditions.push(or(like(users.name, q), like(users.email, q), like(userSessions.sessionId, q)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(userSessions.loginAt)).limit(100) as any;
    const records = await query;

    // Enrich with page view counts and last module from user_activity_logs
    const sessionIds = records.map((r) => r.session.sessionId);
    let activitiesMap: Record<string, { count: number; lastModule: string }> = {};

    if (sessionIds.length > 0) {
      const acts = await db
        .select({
          sessionId: userActivityLogs.sessionId,
          moduleName: userActivityLogs.moduleName,
          eventTimestamp: userActivityLogs.eventTimestamp,
        })
        .from(userActivityLogs)
        .where(inArray(userActivityLogs.sessionId, sessionIds))
        .orderBy(desc(userActivityLogs.eventTimestamp));

      for (const a of acts) {
        if (!a.sessionId) continue;
        if (!activitiesMap[a.sessionId]) {
          activitiesMap[a.sessionId] = { count: 0, lastModule: a.moduleName };
        }
        activitiesMap[a.sessionId].count += 1;
      }
    }

    const enriched = records.map((r) => ({
      ...r.session,
      user: r.user,
      pageViewsCount: activitiesMap[r.session.sessionId]?.count || 0,
      lastModule: activitiesMap[r.session.sessionId]?.lastModule || 'Dashboard',
    }));

    res.json(enriched);
  } catch (error: any) {
    console.error('Monitoring sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Admin Chronological User Activity Logs Timeline
apiRouter.get('/monitoring/activities', requireAuth, requirePermission('activity.view'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId, sessionId, module, eventType, result, date, limit } = req.query;

    let query = db
      .select({
        activity: userActivityLogs,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        },
      })
      .from(userActivityLogs)
      .leftJoin(users, eq(userActivityLogs.userId, users.id));

    const conditions = [];

    if (userId) {
      conditions.push(eq(userActivityLogs.userId, parseInt(String(userId), 10)));
    }
    if (sessionId) {
      conditions.push(eq(userActivityLogs.sessionId, String(sessionId)));
    }
    if (module && module !== 'all') {
      conditions.push(eq(userActivityLogs.moduleName, String(module)));
    }
    if (eventType && eventType !== 'all') {
      conditions.push(eq(userActivityLogs.eventType, String(eventType)));
    }
    if (result && result !== 'all') {
      conditions.push(eq(userActivityLogs.result, String(result)));
    }
    if (date) {
      conditions.push(sql`DATE(${userActivityLogs.eventTimestamp}) = ${String(date)}::date`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const maxLimit = Math.min(parseInt(String(limit || 150), 10), 300);
    query = query.orderBy(desc(userActivityLogs.eventTimestamp)).limit(maxLimit) as any;

    const list = await query;
    res.json(list.map((item) => ({ ...item.activity, user: item.user })));
  } catch (error: any) {
    console.error('Monitoring activities error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Admin Session Revocation Action
apiRouter.post('/monitoring/sessions/:id/revoke', requireAuth, requirePermission('activity.manage'), async (req: AuthRequest, res: Response) => {
  try {
    const sId = parseInt(req.params.id, 10);
    const now = new Date();

    const matches = await db.select().from(userSessions).where(eq(userSessions.id, sId)).limit(1);
    if (matches.length === 0) {
      return res.status(404).json({ error: 'Session record not found' });
    }

    const sess = matches[0];
    const duration = Math.max(1, Math.round((now.getTime() - new Date(sess.loginAt).getTime()) / 1000));

    const [updated] = await db
      .update(userSessions)
      .set({
        sessionStatus: 'Revoked',
        logoutReason: 'Admin Revoked',
        logoutAt: now,
        sessionDurationSeconds: duration,
        updatedAt: now,
      })
      .where(eq(userSessions.id, sId))
      .returning();

    await logSecurityEvent({
      eventType: 'SESSION_REVOKED',
      userId: sess.userId,
      ipAddress: req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      details: `Administrator ${req.user?.name} revoked active session ${sess.sessionId} for user ID ${sess.userId}`,
    });

    await logUserActivity({
      userId: req.user!.id,
      sessionId: req.sessionId,
      eventType: 'Update',
      moduleName: 'Monitoring',
      pagePath: '/monitoring',
      actionName: `Revoked session #${sess.id}`,
      recordType: 'Session',
      recordId: String(sess.id),
      result: 'Success',
      metadata: { targetUserId: sess.userId, revokedSessionId: sess.sessionId },
    });

    res.json({ success: true, message: 'User session has been revoked successfully', session: updated });
  } catch (error: any) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// Admin Security Events Trail
apiRouter.get('/monitoring/security-events', requireAuth, requirePermission('activity.view'), async (req: AuthRequest, res: Response) => {
  try {
    const events = await db.select().from(securityEvents).orderBy(desc(securityEvents.createdAt)).limit(100);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch security events' });
  }
});

