/**
 * Tenancy Module
 * 
 * Core multi-tenancy infrastructure for UltraWealth Platform.
 * 
 * This module provides:
 * - Tenant registration and lifecycle management
 * - Request-scoped tenant context
 * - Isolation guards for all system boundaries
 * 
 * USAGE:
 * 
 * 1. Register a tenant:
 *    const tenant = await TenantRegistry.provision({ name: 'Acme FO', profile: 'fo' });
 * 
 * 2. Run code in tenant context:
 *    await withTenantContext({ tenantId: tenant.id, correlationId: uuid() }, async () => {
 *      // All operations here are scoped to the tenant
 *    });
 * 
 * 3. Use guards to enforce isolation:
 *    QueryGuard.validatePartitionKey(query.partitionKey);
 */

// Tenant Registry
export {
  TenantRegistry,
  type TenantConfig,
  type TenantProfile,
  type TenantStatus,
  type TenantProvisionRequest,
  isValidTenantProfile,
  isValidTenantStatus,
} from './tenant-registry';

// Tenant Context
export {
  withTenantContext,
  getTenantContext,
  tryGetTenantContext,
  getCurrentTenantId,
  getCurrentPartitionKey,
  getCurrentTenantProfile,
  getCurrentEncryptionKeyId,
  assertTenantContext,
  assertTenantProfile,
  assertUserRole,
  validateResourceOwnership,
  validatePartitionKey,
  TenantContextError,
  type TenantContext,
  type TenantContextOptions,
  type TenantContextErrorCode,
} from './tenant-context';

// Isolation Guards
export {
  QueryGuard,
  CacheGuard,
  ExportGuard,
  EventGuard,
  ResourceGuard,
  IsolationGuard,
  setViolationHandler,
  type IsolationViolation,
  type IsolationViolationType,
} from './isolation-guards';
