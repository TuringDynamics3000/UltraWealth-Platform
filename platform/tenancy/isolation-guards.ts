/**
 * Isolation Guards
 * 
 * Enforcement layer that prevents tenant boundary violations.
 * These guards MUST be applied at all system boundaries:
 * - API requests
 * - Database queries
 * - Cache access
 * - Export operations
 * - Event processing
 * 
 * SECURITY CRITICAL:
 * - Guards are defensive and fail-closed
 * - Violations are logged and rejected
 * - No exceptions or bypasses allowed
 */

import {
  getTenantContext,
  getCurrentTenantId,
  getCurrentPartitionKey,
  TenantContextError,
} from './tenant-context';
import { TenantRegistry } from './tenant-registry';

// =============================================================================
// TYPES
// =============================================================================

export interface IsolationViolation {
  readonly type: IsolationViolationType;
  readonly message: string;
  readonly tenantId: string;
  readonly attemptedResource?: string;
  readonly timestamp: Date;
  readonly correlationId: string;
}

export type IsolationViolationType =
  | 'CROSS_TENANT_QUERY'
  | 'CROSS_TENANT_CACHE'
  | 'CROSS_TENANT_EXPORT'
  | 'CROSS_TENANT_EVENT'
  | 'MISSING_PARTITION_KEY'
  | 'INVALID_PARTITION_KEY'
  | 'MULTI_TENANT_JOIN'
  | 'SHARED_RESOURCE_ACCESS';

// =============================================================================
// VIOLATION HANDLER
// =============================================================================

type ViolationHandler = (violation: IsolationViolation) => void;

let violationHandler: ViolationHandler = (violation) => {
  // Default handler logs to console
  console.error('[ISOLATION VIOLATION]', JSON.stringify(violation, null, 2));
};

/**
 * Set a custom violation handler.
 * Use this to integrate with audit logging, alerting, etc.
 */
export function setViolationHandler(handler: ViolationHandler): void {
  violationHandler = handler;
}

function reportViolation(
  type: IsolationViolationType,
  message: string,
  attemptedResource?: string
): never {
  const context = getTenantContext();
  
  const violation: IsolationViolation = {
    type,
    message,
    tenantId: context.tenant.id,
    attemptedResource,
    timestamp: new Date(),
    correlationId: context.correlationId,
  };
  
  violationHandler(violation);
  
  throw new TenantContextError(
    'CROSS_TENANT_ACCESS',
    `Isolation violation: ${message}`
  );
}

// =============================================================================
// QUERY GUARDS
// =============================================================================

/**
 * Guard for database queries.
 * Ensures all queries include the correct partition key.
 */
export const QueryGuard = {
  /**
   * Validate that a query includes the correct partition key.
   * 
   * @param queryPartitionKey - The partition key in the query
   * @throws TenantContextError if partition key is missing or invalid
   */
  validatePartitionKey(queryPartitionKey: string | undefined): void {
    if (!queryPartitionKey) {
      reportViolation(
        'MISSING_PARTITION_KEY',
        'Query must include partition key for tenant isolation'
      );
    }
    
    const expectedKey = getCurrentPartitionKey();
    if (queryPartitionKey !== expectedKey) {
      reportViolation(
        'INVALID_PARTITION_KEY',
        'Query partition key does not match current tenant',
        queryPartitionKey
      );
    }
  },
  
  /**
   * Validate that a query does not join across tenants.
   * 
   * @param tableNames - The tables involved in the query
   * @param partitionKeys - The partition keys for each table
   * @throws TenantContextError if multi-tenant join detected
   */
  validateNoMultiTenantJoin(
    tableNames: string[],
    partitionKeys: (string | undefined)[]
  ): void {
    const expectedKey = getCurrentPartitionKey();
    
    for (let i = 0; i < tableNames.length; i++) {
      const pk = partitionKeys[i];
      if (!pk) {
        reportViolation(
          'MULTI_TENANT_JOIN',
          `Table ${tableNames[i]} missing partition key in join`,
          tableNames[i]
        );
      }
      if (pk !== expectedKey) {
        reportViolation(
          'MULTI_TENANT_JOIN',
          `Table ${tableNames[i]} has different partition key in join`,
          tableNames[i]
        );
      }
    }
  },
  
  /**
   * Create a tenant-scoped query filter.
   * Use this to automatically add partition key to queries.
   * 
   * @returns Object with partition key filter
   */
  createTenantFilter(): { partitionKey: string; tenantId: string } {
    return {
      partitionKey: getCurrentPartitionKey(),
      tenantId: getCurrentTenantId(),
    };
  },
};

// =============================================================================
// CACHE GUARDS
// =============================================================================

/**
 * Guard for cache operations.
 * Ensures cache keys are tenant-scoped.
 */
export const CacheGuard = {
  /**
   * Create a tenant-scoped cache key.
   * 
   * @param baseKey - The base cache key
   * @returns Tenant-scoped cache key
   */
  scopeKey(baseKey: string): string {
    const partitionKey = getCurrentPartitionKey();
    return `${partitionKey}:${baseKey}`;
  },
  
  /**
   * Validate that a cache key belongs to the current tenant.
   * 
   * @param cacheKey - The cache key to validate
   * @throws TenantContextError if key belongs to different tenant
   */
  validateKey(cacheKey: string): void {
    const partitionKey = getCurrentPartitionKey();
    
    if (!cacheKey.startsWith(`${partitionKey}:`)) {
      reportViolation(
        'CROSS_TENANT_CACHE',
        'Cache key does not belong to current tenant',
        cacheKey
      );
    }
  },
  
  /**
   * Check if a cache key is tenant-scoped.
   * 
   * @param cacheKey - The cache key to check
   * @returns True if key is properly scoped
   */
  isProperlyScoped(cacheKey: string): boolean {
    const partitionKey = getCurrentPartitionKey();
    return cacheKey.startsWith(`${partitionKey}:`);
  },
};

// =============================================================================
// EXPORT GUARDS
// =============================================================================

/**
 * Guard for export operations.
 * Ensures exports only contain data from the current tenant.
 */
export const ExportGuard = {
  /**
   * Validate that export data belongs to the current tenant.
   * 
   * @param records - The records to export
   * @param tenantIdField - The field name containing tenant ID
   * @throws TenantContextError if any record belongs to different tenant
   */
  validateExportData<T extends Record<string, unknown>>(
    records: T[],
    tenantIdField: string = 'tenantId'
  ): void {
    const currentTenantId = getCurrentTenantId();
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const recordTenantId = record[tenantIdField];
      
      if (recordTenantId !== currentTenantId) {
        reportViolation(
          'CROSS_TENANT_EXPORT',
          `Export contains record from different tenant at index ${i}`,
          String(recordTenantId)
        );
      }
    }
  },
  
  /**
   * Create export metadata with tenant context.
   * 
   * @returns Export metadata object
   */
  createExportMetadata(): {
    tenantId: string;
    partitionKey: string;
    encryptionKeyId: string;
    exportedAt: string;
    correlationId: string;
  } {
    const context = getTenantContext();
    
    return {
      tenantId: context.tenant.id,
      partitionKey: context.tenant.partitionKey,
      encryptionKeyId: context.tenant.encryptionKeyId,
      exportedAt: new Date().toISOString(),
      correlationId: context.correlationId,
    };
  },
};

// =============================================================================
// EVENT GUARDS
// =============================================================================

/**
 * Guard for event processing.
 * Ensures events are processed within correct tenant context.
 */
export const EventGuard = {
  /**
   * Validate that an event belongs to the current tenant.
   * 
   * @param eventTenantId - The tenant ID from the event
   * @throws TenantContextError if event belongs to different tenant
   */
  validateEventTenant(eventTenantId: string): void {
    const currentTenantId = getCurrentTenantId();
    
    if (eventTenantId !== currentTenantId) {
      reportViolation(
        'CROSS_TENANT_EVENT',
        'Event belongs to different tenant',
        eventTenantId
      );
    }
  },
  
  /**
   * Create event metadata with tenant context.
   * 
   * @returns Event metadata object
   */
  createEventMetadata(): {
    tenantId: string;
    partitionKey: string;
    correlationId: string;
    timestamp: string;
  } {
    const context = getTenantContext();
    
    return {
      tenantId: context.tenant.id,
      partitionKey: context.tenant.partitionKey,
      correlationId: context.correlationId,
      timestamp: new Date().toISOString(),
    };
  },
};

// =============================================================================
// RESOURCE GUARDS
// =============================================================================

/**
 * Guard for shared resource access.
 * Prevents access to resources that should not be shared.
 */
export const ResourceGuard = {
  /**
   * Validate that a resource ID includes tenant scoping.
   * 
   * @param resourceId - The resource ID to validate
   * @param expectedPrefix - Expected tenant prefix (defaults to partition key)
   * @throws TenantContextError if resource is not tenant-scoped
   */
  validateResourceId(resourceId: string, expectedPrefix?: string): void {
    const prefix = expectedPrefix ?? getCurrentPartitionKey();
    
    if (!resourceId.startsWith(`${prefix}_`)) {
      reportViolation(
        'SHARED_RESOURCE_ACCESS',
        'Resource ID is not properly tenant-scoped',
        resourceId
      );
    }
  },
  
  /**
   * Create a tenant-scoped resource ID.
   * 
   * @param baseId - The base resource ID
   * @returns Tenant-scoped resource ID
   */
  scopeResourceId(baseId: string): string {
    const partitionKey = getCurrentPartitionKey();
    return `${partitionKey}_${baseId}`;
  },
};

// =============================================================================
// COMPOSITE GUARD
// =============================================================================

/**
 * Composite guard that runs all relevant checks for a given operation type.
 */
export const IsolationGuard = {
  /**
   * Run all guards for a read operation.
   */
  forRead(partitionKey: string): void {
    QueryGuard.validatePartitionKey(partitionKey);
  },
  
  /**
   * Run all guards for a write operation.
   */
  forWrite(partitionKey: string): void {
    QueryGuard.validatePartitionKey(partitionKey);
  },
  
  /**
   * Run all guards for an export operation.
   */
  forExport<T extends Record<string, unknown>>(
    records: T[],
    tenantIdField?: string
  ): void {
    ExportGuard.validateExportData(records, tenantIdField);
  },
  
  /**
   * Run all guards for event processing.
   */
  forEvent(eventTenantId: string): void {
    EventGuard.validateEventTenant(eventTenantId);
  },
};
