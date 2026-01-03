/**
 * Audit Log
 * 
 * Immutable audit log for all security-relevant operations.
 * Captures who did what, when, and with what result.
 * 
 * GUARANTEES:
 * - Audit entries are immutable
 * - Audit entries are tenant-isolated
 * - Audit entries cannot be deleted
 * - Audit entries are tamper-evident
 */

import { createHash, randomUUID } from 'crypto';
import {
  getCurrentTenantId,
  getCurrentPartitionKey,
  getTenantContext,
  tryGetTenantContext,
} from '../tenancy';

// =============================================================================
// TYPES
// =============================================================================

export type AuditAction =
  // Authentication
  | 'auth:login'
  | 'auth:logout'
  | 'auth:login_failed'
  | 'auth:token_refresh'
  
  // Authorization
  | 'authz:permission_granted'
  | 'authz:permission_denied'
  | 'authz:role_assigned'
  | 'authz:role_removed'
  
  // Data access
  | 'data:read'
  | 'data:create'
  | 'data:update'
  | 'data:delete'
  | 'data:export'
  
  // Reports
  | 'report:generated'
  | 'report:exported'
  | 'report:viewed'
  
  // Admin
  | 'admin:settings_changed'
  | 'admin:user_invited'
  | 'admin:user_removed'
  
  // Security
  | 'security:violation_detected'
  | 'security:isolation_breach_attempt'
  | 'security:governance_violation';

export type AuditOutcome = 'success' | 'failure' | 'denied';

export interface AuditEntry {
  /** Unique audit entry ID */
  readonly id: string;
  
  /** Tenant ID (for isolation) */
  readonly tenantId: string;
  
  /** Partition key (for storage isolation) */
  readonly partitionKey: string;
  
  /** Action performed */
  readonly action: AuditAction;
  
  /** Outcome of the action */
  readonly outcome: AuditOutcome;
  
  /** User who performed the action */
  readonly userId: string | null;
  
  /** IP address of the request */
  readonly ipAddress?: string;
  
  /** User agent of the request */
  readonly userAgent?: string;
  
  /** Resource type affected */
  readonly resourceType?: string;
  
  /** Resource ID affected */
  readonly resourceId?: string;
  
  /** Additional details */
  readonly details?: Record<string, unknown>;
  
  /** Correlation ID for request tracing */
  readonly correlationId: string;
  
  /** Timestamp of the action */
  readonly timestamp: Date;
  
  /** Hash for tamper detection */
  readonly hash: string;
  
  /** Previous entry hash (chain integrity) */
  readonly previousHash: string | null;
}

export interface AuditQuery {
  /** Filter by action */
  action?: AuditAction;
  
  /** Filter by outcome */
  outcome?: AuditOutcome;
  
  /** Filter by user */
  userId?: string;
  
  /** Filter by resource type */
  resourceType?: string;
  
  /** Filter by resource ID */
  resourceId?: string;
  
  /** Filter by time range (start) */
  fromTime?: Date;
  
  /** Filter by time range (end) */
  toTime?: Date;
  
  /** Maximum number of entries to return */
  limit?: number;
  
  /** Cursor for pagination */
  cursor?: string;
}

// =============================================================================
// AUDIT LOG IMPLEMENTATION
// =============================================================================

class AuditLogImpl {
  private readonly entries: Map<string, AuditEntry[]> = new Map();
  private readonly lastHashes: Map<string, string> = new Map();
  
  /**
   * Log an audit entry.
   * 
   * @param action - Action performed
   * @param outcome - Outcome of the action
   * @param options - Additional options
   * @returns The created audit entry
   */
  async log(
    action: AuditAction,
    outcome: AuditOutcome,
    options: {
      resourceType?: string;
      resourceId?: string;
      details?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<AuditEntry> {
    const context = tryGetTenantContext();
    
    // Allow logging without tenant context for auth events
    const tenantId = context?.tenant.id ?? 'system';
    const partitionKey = context?.tenant.partitionKey ?? 'system';
    const userId = context?.userId ?? null;
    const correlationId = context?.correlationId ?? randomUUID();
    
    const tenantKey = this.getTenantKey(partitionKey);
    if (!this.entries.has(tenantKey)) {
      this.entries.set(tenantKey, []);
    }
    
    const previousHash = this.lastHashes.get(tenantKey) ?? null;
    const timestamp = new Date();
    
    // Create entry without hash
    const entryData = {
      id: randomUUID(),
      tenantId,
      partitionKey,
      action,
      outcome,
      userId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      details: options.details ? Object.freeze({ ...options.details }) : undefined,
      correlationId,
      timestamp,
      previousHash,
    };
    
    // Calculate hash
    const hash = this.calculateHash(entryData);
    
    const entry: AuditEntry = Object.freeze({
      ...entryData,
      hash,
    });
    
    // Store entry
    this.entries.get(tenantKey)!.push(entry);
    this.lastHashes.set(tenantKey, hash);
    
    return entry;
  }
  
  /**
   * Query audit entries.
   * 
   * @param query - Query parameters
   * @returns Matching audit entries
   */
  async query(query: AuditQuery = {}): Promise<{
    entries: readonly AuditEntry[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const partitionKey = getCurrentPartitionKey();
    const tenantKey = this.getTenantKey(partitionKey);
    const allEntries = this.entries.get(tenantKey) ?? [];
    
    // Apply filters
    let filtered = allEntries.filter(entry => {
      if (query.action && entry.action !== query.action) return false;
      if (query.outcome && entry.outcome !== query.outcome) return false;
      if (query.userId && entry.userId !== query.userId) return false;
      if (query.resourceType && entry.resourceType !== query.resourceType) return false;
      if (query.resourceId && entry.resourceId !== query.resourceId) return false;
      if (query.fromTime && entry.timestamp < query.fromTime) return false;
      if (query.toTime && entry.timestamp > query.toTime) return false;
      return true;
    });
    
    // Sort by timestamp descending (most recent first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply cursor
    if (query.cursor) {
      const cursorIndex = filtered.findIndex(e => e.id === query.cursor);
      if (cursorIndex >= 0) {
        filtered = filtered.slice(cursorIndex + 1);
      }
    }
    
    // Apply limit
    const limit = query.limit ?? 100;
    const hasMore = filtered.length > limit;
    const entries = filtered.slice(0, limit);
    
    return {
      entries: Object.freeze(entries),
      nextCursor: hasMore ? entries[entries.length - 1]?.id : undefined,
      hasMore,
    };
  }
  
  /**
   * Get audit entry by ID.
   * 
   * @param entryId - Entry ID
   * @returns Audit entry or undefined
   */
  async getById(entryId: string): Promise<AuditEntry | undefined> {
    const partitionKey = getCurrentPartitionKey();
    const tenantKey = this.getTenantKey(partitionKey);
    const entries = this.entries.get(tenantKey) ?? [];
    
    return entries.find(e => e.id === entryId);
  }
  
  /**
   * Verify audit log integrity.
   * 
   * @returns Verification result
   */
  async verifyIntegrity(): Promise<{
    valid: boolean;
    errors: string[];
    entriesChecked: number;
  }> {
    const partitionKey = getCurrentPartitionKey();
    const tenantKey = this.getTenantKey(partitionKey);
    const entries = this.entries.get(tenantKey) ?? [];
    
    const errors: string[] = [];
    let previousHash: string | null = null;
    
    for (const entry of entries) {
      // Verify chain link
      if (entry.previousHash !== previousHash) {
        errors.push(`Entry ${entry.id}: previous hash mismatch`);
      }
      
      // Verify entry hash
      const expectedHash = this.calculateHash({
        id: entry.id,
        tenantId: entry.tenantId,
        partitionKey: entry.partitionKey,
        action: entry.action,
        outcome: entry.outcome,
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        details: entry.details,
        correlationId: entry.correlationId,
        timestamp: entry.timestamp,
        previousHash: entry.previousHash,
      });
      
      if (entry.hash !== expectedHash) {
        errors.push(`Entry ${entry.id}: hash mismatch (tampering detected)`);
      }
      
      previousHash = entry.hash;
    }
    
    return {
      valid: errors.length === 0,
      errors,
      entriesChecked: entries.length,
    };
  }
  
  /**
   * Export audit log for a time range.
   * 
   * @param fromTime - Start time
   * @param toTime - End time
   * @returns Exported entries
   */
  async export(fromTime: Date, toTime: Date): Promise<{
    entries: readonly AuditEntry[];
    exportedAt: Date;
    integrityHash: string;
  }> {
    const result = await this.query({ fromTime, toTime, limit: 10000 });
    
    // Calculate integrity hash over all entries
    const integrityHash = createHash('sha256')
      .update(JSON.stringify(result.entries))
      .digest('hex');
    
    return {
      entries: result.entries,
      exportedAt: new Date(),
      integrityHash,
    };
  }
  
  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------
  
  private getTenantKey(partitionKey: string): string {
    return `audit:${partitionKey}`;
  }
  
  private calculateHash(entryData: Omit<AuditEntry, 'hash'>): string {
    const content = JSON.stringify(entryData, (_, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
    
    return createHash('sha256').update(content).digest('hex');
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const AuditLog = new AuditLogImpl();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Log a successful data access.
 */
export async function logDataAccess(
  resourceType: string,
  resourceId: string,
  action: 'read' | 'create' | 'update' | 'delete' | 'export'
): Promise<void> {
  await AuditLog.log(`data:${action}`, 'success', { resourceType, resourceId });
}

/**
 * Log a permission denial.
 */
export async function logPermissionDenied(
  permission: string,
  resourceType?: string,
  resourceId?: string
): Promise<void> {
  await AuditLog.log('authz:permission_denied', 'denied', {
    resourceType,
    resourceId,
    details: { permission },
  });
}

/**
 * Log a security violation.
 */
export async function logSecurityViolation(
  violationType: string,
  details: Record<string, unknown>
): Promise<void> {
  await AuditLog.log('security:violation_detected', 'failure', {
    details: { violationType, ...details },
  });
}

/**
 * Log a governance violation.
 */
export async function logGovernanceViolation(
  violationType: string,
  term: string,
  context: string
): Promise<void> {
  await AuditLog.log('security:governance_violation', 'failure', {
    details: { violationType, term, context },
  });
}
