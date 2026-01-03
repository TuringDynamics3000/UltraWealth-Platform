/**
 * Security Module
 * 
 * Security infrastructure for UltraWealth Platform.
 * 
 * USAGE:
 * 
 * 1. Check permissions:
 *    await requirePermission('report:export');
 * 
 * 2. Assign roles:
 *    await RBAC.assignRole(userId, 'principal', adminId);
 * 
 * 3. Log audit events:
 *    await AuditLog.log('data:read', 'success', { resourceType: 'Entity' });
 * 
 * 4. Secure exports:
 *    const result = await ExportGuards.export({ format: 'json', data, exportType: 'report' });
 */

// RBAC
export {
  RBAC,
  checkPermission,
  requirePermission,
  requireRole,
  PermissionDeniedError,
  RoleDeniedError,
  type Permission,
  type Role,
  type RoleDefinition,
  type UserRoleAssignment,
} from './rbac';

// Audit Log
export {
  AuditLog,
  logDataAccess,
  logPermissionDenied,
  logSecurityViolation,
  logGovernanceViolation,
  type AuditAction,
  type AuditOutcome,
  type AuditEntry,
  type AuditQuery,
} from './audit-log';

// Export Guards
export {
  ExportGuards,
  exportEntitiesToJson,
  exportValuationsToCsv,
  exportReport,
  type ExportFormat,
  type ExportRequest,
  type ExportResult,
  type ExportMetadata,
} from './export-guards';
