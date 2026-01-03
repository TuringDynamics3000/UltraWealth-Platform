/**
 * Tenant Context
 * 
 * Request-scoped tenant context that MUST be present for all tenant operations.
 * Provides the foundation for tenant isolation at runtime.
 * 
 * SECURITY CRITICAL:
 * - Every request MUST have a TenantContext
 * - TenantContext is immutable once created
 * - Cross-tenant access is impossible by design
 */

import { AsyncLocalStorage } from 'async_hooks';
import { TenantConfig, TenantProfile, TenantRegistry } from './tenant-registry';

// =============================================================================
// TYPES
// =============================================================================

export interface TenantContext {
  /** The tenant configuration (immutable snapshot) */
  readonly tenant: Readonly<TenantConfig>;
  
  /** Request correlation ID for tracing */
  readonly correlationId: string;
  
  /** Timestamp when context was created */
  readonly createdAt: Date;
  
  /** The authenticated user ID (if any) */
  readonly userId?: string;
  
  /** User roles within this tenant */
  readonly roles: readonly string[];
}

export interface TenantContextOptions {
  tenantId: string;
  correlationId: string;
  userId?: string;
  roles?: string[];
}

// =============================================================================
// CONTEXT STORAGE
// =============================================================================

/**
 * AsyncLocalStorage for tenant context.
 * This ensures tenant context is automatically propagated through async operations.
 */
const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

// =============================================================================
// CONTEXT MANAGEMENT
// =============================================================================

/**
 * Create and run code within a tenant context.
 * 
 * @param options - Context creation options
 * @param fn - The function to run within the context
 * @returns The result of the function
 * @throws TenantContextError if tenant is invalid or inactive
 */
export async function withTenantContext<T>(
  options: TenantContextOptions,
  fn: () => T | Promise<T>
): Promise<T> {
  const tenant = await TenantRegistry.getById(options.tenantId);
  
  if (!tenant) {
    throw new TenantContextError(
      'TENANT_NOT_FOUND',
      `Tenant ${options.tenantId} does not exist`
    );
  }
  
  if (tenant.status !== 'active') {
    throw new TenantContextError(
      'TENANT_NOT_ACTIVE',
      `Tenant ${options.tenantId} is not active (status: ${tenant.status})`
    );
  }
  
  const context: TenantContext = Object.freeze({
    tenant: Object.freeze({ ...tenant }),
    correlationId: options.correlationId,
    createdAt: new Date(),
    userId: options.userId,
    roles: Object.freeze(options.roles ?? []),
  });
  
  return tenantContextStorage.run(context, fn);
}

/**
 * Get the current tenant context.
 * 
 * @returns The current tenant context
 * @throws TenantContextError if no context is active
 */
export function getTenantContext(): TenantContext {
  const context = tenantContextStorage.getStore();
  
  if (!context) {
    throw new TenantContextError(
      'NO_TENANT_CONTEXT',
      'No tenant context is active. All operations require a tenant context.'
    );
  }
  
  return context;
}

/**
 * Get the current tenant context if one exists.
 * 
 * @returns The current tenant context or undefined
 */
export function tryGetTenantContext(): TenantContext | undefined {
  return tenantContextStorage.getStore();
}

/**
 * Get the current tenant ID.
 * Convenience method for common use case.
 * 
 * @returns The current tenant ID
 * @throws TenantContextError if no context is active
 */
export function getCurrentTenantId(): string {
  return getTenantContext().tenant.id;
}

/**
 * Get the current tenant's partition key.
 * Used for data isolation in storage.
 * 
 * @returns The current tenant's partition key
 * @throws TenantContextError if no context is active
 */
export function getCurrentPartitionKey(): string {
  return getTenantContext().tenant.partitionKey;
}

/**
 * Get the current tenant's profile.
 * Used for governance enforcement.
 * 
 * @returns The current tenant's profile
 * @throws TenantContextError if no context is active
 */
export function getCurrentTenantProfile(): TenantProfile {
  return getTenantContext().tenant.profile;
}

/**
 * Get the current tenant's encryption key ID.
 * Used for evidence and export encryption.
 * 
 * @returns The current tenant's encryption key ID
 * @throws TenantContextError if no context is active
 */
export function getCurrentEncryptionKeyId(): string {
  return getTenantContext().tenant.encryptionKeyId;
}

// =============================================================================
// CONTEXT ASSERTIONS
// =============================================================================

/**
 * Assert that a tenant context is active.
 * Use this at the start of functions that require tenant context.
 * 
 * @throws TenantContextError if no context is active
 */
export function assertTenantContext(): asserts void {
  getTenantContext();
}

/**
 * Assert that the current tenant has a specific profile.
 * 
 * @param profile - The required profile
 * @throws TenantContextError if profile doesn't match
 */
export function assertTenantProfile(profile: TenantProfile): asserts void {
  const current = getCurrentTenantProfile();
  if (current !== profile) {
    throw new TenantContextError(
      'PROFILE_MISMATCH',
      `Operation requires profile "${profile}" but tenant has profile "${current}"`
    );
  }
}

/**
 * Assert that the current user has a specific role.
 * 
 * @param role - The required role
 * @throws TenantContextError if role is missing
 */
export function assertUserRole(role: string): asserts void {
  const context = getTenantContext();
  if (!context.roles.includes(role)) {
    throw new TenantContextError(
      'ROLE_REQUIRED',
      `Operation requires role "${role}"`
    );
  }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export type TenantContextErrorCode =
  | 'NO_TENANT_CONTEXT'
  | 'TENANT_NOT_FOUND'
  | 'TENANT_NOT_ACTIVE'
  | 'PROFILE_MISMATCH'
  | 'ROLE_REQUIRED'
  | 'CROSS_TENANT_ACCESS';

export class TenantContextError extends Error {
  readonly code: TenantContextErrorCode;
  
  constructor(code: TenantContextErrorCode, message: string) {
    super(message);
    this.name = 'TenantContextError';
    this.code = code;
    Object.setPrototypeOf(this, TenantContextError.prototype);
  }
}

// =============================================================================
// CROSS-TENANT PROTECTION
// =============================================================================

/**
 * Validate that a resource belongs to the current tenant.
 * 
 * @param resourceTenantId - The tenant ID of the resource
 * @throws TenantContextError if resource belongs to different tenant
 */
export function validateResourceOwnership(resourceTenantId: string): void {
  const currentTenantId = getCurrentTenantId();
  
  if (resourceTenantId !== currentTenantId) {
    throw new TenantContextError(
      'CROSS_TENANT_ACCESS',
      'Access denied: resource belongs to a different tenant'
    );
  }
}

/**
 * Validate that a partition key matches the current tenant.
 * 
 * @param partitionKey - The partition key to validate
 * @throws TenantContextError if partition key doesn't match
 */
export function validatePartitionKey(partitionKey: string): void {
  const currentPartitionKey = getCurrentPartitionKey();
  
  if (partitionKey !== currentPartitionKey) {
    throw new TenantContextError(
      'CROSS_TENANT_ACCESS',
      'Access denied: partition key mismatch'
    );
  }
}
