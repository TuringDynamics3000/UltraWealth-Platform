/**
 * Tenant Registry
 * 
 * Central registry for all tenants in the UltraWealth Platform.
 * Provides tenant lookup, validation, and lifecycle management.
 * 
 * SECURITY: This module is critical for tenant isolation.
 * All tenant lookups MUST go through this registry.
 */

import { createHash, randomUUID } from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

export type TenantProfile = 'fo' | 'retail' | 'advisor';

export type TenantStatus = 
  | 'provisioning'
  | 'onboarding'
  | 'active'
  | 'suspended'
  | 'offboarding'
  | 'terminated';

export interface TenantConfig {
  /** Unique tenant identifier (UUID) */
  readonly id: string;
  
  /** Human-readable tenant name */
  readonly name: string;
  
  /** Governance profile for this tenant */
  readonly profile: TenantProfile;
  
  /** Current lifecycle status */
  status: TenantStatus;
  
  /** Tenant-specific encryption key ID (for evidence/exports) */
  readonly encryptionKeyId: string;
  
  /** Tenant data partition key */
  readonly partitionKey: string;
  
  /** Timestamp of tenant creation */
  readonly createdAt: Date;
  
  /** Timestamp of last status change */
  updatedAt: Date;
  
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface TenantProvisionRequest {
  name: string;
  profile: TenantProfile;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// TENANT REGISTRY
// =============================================================================

/**
 * In-memory tenant registry.
 * 
 * PRODUCTION NOTE: Replace with persistent storage (PostgreSQL, etc.)
 * This implementation maintains the correct interface and isolation guarantees.
 */
class TenantRegistryImpl {
  private readonly tenants: Map<string, TenantConfig> = new Map();
  private readonly tenantsByPartition: Map<string, string> = new Map();
  
  /**
   * Provision a new tenant.
   * 
   * @param request - Tenant provisioning request
   * @returns The newly created tenant configuration
   * @throws Error if tenant name already exists
   */
  async provision(request: TenantProvisionRequest): Promise<TenantConfig> {
    // Validate no duplicate names
    for (const tenant of this.tenants.values()) {
      if (tenant.name.toLowerCase() === request.name.toLowerCase()) {
        throw new Error(`Tenant with name "${request.name}" already exists`);
      }
    }
    
    const id = randomUUID();
    const partitionKey = this.generatePartitionKey(id);
    const encryptionKeyId = this.generateEncryptionKeyId(id);
    
    const tenant: TenantConfig = {
      id,
      name: request.name,
      profile: request.profile,
      status: 'provisioning',
      encryptionKeyId,
      partitionKey,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: request.metadata,
    };
    
    this.tenants.set(id, tenant);
    this.tenantsByPartition.set(partitionKey, id);
    
    return Object.freeze({ ...tenant });
  }
  
  /**
   * Get tenant by ID.
   * 
   * @param tenantId - The tenant UUID
   * @returns The tenant configuration or undefined
   */
  async getById(tenantId: string): Promise<TenantConfig | undefined> {
    const tenant = this.tenants.get(tenantId);
    return tenant ? Object.freeze({ ...tenant }) : undefined;
  }
  
  /**
   * Get tenant by partition key.
   * 
   * @param partitionKey - The tenant partition key
   * @returns The tenant configuration or undefined
   */
  async getByPartitionKey(partitionKey: string): Promise<TenantConfig | undefined> {
    const tenantId = this.tenantsByPartition.get(partitionKey);
    if (!tenantId) return undefined;
    return this.getById(tenantId);
  }
  
  /**
   * Validate that a tenant exists and is active.
   * 
   * @param tenantId - The tenant UUID
   * @returns True if tenant exists and is active
   */
  async isActive(tenantId: string): Promise<boolean> {
    const tenant = this.tenants.get(tenantId);
    return tenant?.status === 'active';
  }
  
  /**
   * Update tenant status.
   * 
   * @param tenantId - The tenant UUID
   * @param status - The new status
   * @throws Error if tenant not found or invalid transition
   */
  async updateStatus(tenantId: string, status: TenantStatus): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }
    
    // Validate status transitions
    this.validateStatusTransition(tenant.status, status);
    
    tenant.status = status;
    tenant.updatedAt = new Date();
  }
  
  /**
   * List all tenants (admin only).
   * 
   * SECURITY: This method should only be called by platform admins.
   * Never expose this to tenant-scoped requests.
   */
  async listAll(): Promise<readonly TenantConfig[]> {
    return Array.from(this.tenants.values()).map(t => Object.freeze({ ...t }));
  }
  
  /**
   * Check if a tenant ID exists.
   * 
   * @param tenantId - The tenant UUID
   * @returns True if tenant exists
   */
  async exists(tenantId: string): Promise<boolean> {
    return this.tenants.has(tenantId);
  }
  
  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------
  
  private generatePartitionKey(tenantId: string): string {
    // Deterministic partition key derived from tenant ID
    const hash = createHash('sha256').update(`partition:${tenantId}`).digest('hex');
    return `pk_${hash.substring(0, 16)}`;
  }
  
  private generateEncryptionKeyId(tenantId: string): string {
    // Unique encryption key ID for this tenant
    const hash = createHash('sha256').update(`encryption:${tenantId}`).digest('hex');
    return `ek_${hash.substring(0, 32)}`;
  }
  
  private validateStatusTransition(from: TenantStatus, to: TenantStatus): void {
    const validTransitions: Record<TenantStatus, TenantStatus[]> = {
      provisioning: ['onboarding', 'terminated'],
      onboarding: ['active', 'terminated'],
      active: ['suspended', 'offboarding'],
      suspended: ['active', 'offboarding'],
      offboarding: ['terminated'],
      terminated: [],
    };
    
    if (!validTransitions[from].includes(to)) {
      throw new Error(`Invalid status transition: ${from} -> ${to}`);
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const TenantRegistry = new TenantRegistryImpl();

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isValidTenantProfile(value: unknown): value is TenantProfile {
  return value === 'fo' || value === 'retail' || value === 'advisor';
}

export function isValidTenantStatus(value: unknown): value is TenantStatus {
  const validStatuses: TenantStatus[] = [
    'provisioning', 'onboarding', 'active', 'suspended', 'offboarding', 'terminated'
  ];
  return typeof value === 'string' && validStatuses.includes(value as TenantStatus);
}
