/**
 * Enforcement Hooks
 * 
 * Runtime hooks that enforce governance rules at key system boundaries.
 * These hooks are automatically invoked and cannot be bypassed.
 * 
 * CRITICAL:
 * - Hooks are fail-closed (reject on any error)
 * - All violations are logged to audit trail
 * - No exceptions or bypasses allowed
 */

import { GovernanceAdapter, GovernanceViolation, GovernanceViolationType } from './governance-adapter';
import { getTenantContext, getCurrentTenantProfile, TenantProfile } from '../tenancy';

// =============================================================================
// TYPES
// =============================================================================

export interface EnforcementResult {
  readonly allowed: boolean;
  readonly violations: readonly GovernanceViolation[];
  readonly profile: TenantProfile;
  readonly timestamp: Date;
  readonly correlationId: string;
}

export interface EnforcementContext {
  readonly operation: string;
  readonly resource?: string;
  readonly content?: string;
  readonly metadata?: Record<string, unknown>;
}

type EnforcementHandler = (result: EnforcementResult, context: EnforcementContext) => void;

// =============================================================================
// ENFORCEMENT HANDLER
// =============================================================================

let enforcementHandler: EnforcementHandler = (result, context) => {
  // Default handler logs violations
  if (!result.allowed) {
    console.error('[GOVERNANCE VIOLATION]', {
      operation: context.operation,
      violations: result.violations,
      profile: result.profile,
      correlationId: result.correlationId,
    });
  }
};

/**
 * Set a custom enforcement handler.
 * Use this to integrate with audit logging, alerting, etc.
 */
export function setEnforcementHandler(handler: EnforcementHandler): void {
  enforcementHandler = handler;
}

// =============================================================================
// ENFORCEMENT ERROR
// =============================================================================

export class GovernanceEnforcementError extends Error {
  readonly violations: readonly GovernanceViolation[];
  readonly profile: TenantProfile;
  
  constructor(violations: GovernanceViolation[], profile: TenantProfile) {
    const message = `Governance violation: ${violations.map(v => v.type).join(', ')}`;
    super(message);
    this.name = 'GovernanceEnforcementError';
    this.violations = violations;
    this.profile = profile;
    Object.setPrototypeOf(this, GovernanceEnforcementError.prototype);
  }
}

// =============================================================================
// ENFORCEMENT HOOKS
// =============================================================================

/**
 * Hook for API request enforcement.
 * Called before processing any API request.
 */
export async function enforceApiRequest(
  requestBody: unknown,
  operation: string
): Promise<EnforcementResult> {
  const context = getTenantContext();
  const adapter = GovernanceAdapter.forCurrentTenant();
  
  // Check request body for violations
  const bodyString = typeof requestBody === 'string' 
    ? requestBody 
    : JSON.stringify(requestBody);
  
  const violations = adapter.checkAll(bodyString);
  
  const result: EnforcementResult = {
    allowed: violations.length === 0,
    violations,
    profile: context.tenant.profile,
    timestamp: new Date(),
    correlationId: context.correlationId,
  };
  
  enforcementHandler(result, { operation, content: bodyString });
  
  if (!result.allowed) {
    throw new GovernanceEnforcementError(violations, context.tenant.profile);
  }
  
  return result;
}

/**
 * Hook for report generation enforcement.
 * Called before generating any report.
 */
export async function enforceReportGeneration(
  reportContent: string,
  reportType: string
): Promise<EnforcementResult> {
  const context = getTenantContext();
  const adapter = GovernanceAdapter.forCurrentTenant();
  
  // Check report content for violations
  const violations = adapter.checkAdvisoryLanguage(reportContent);
  
  const result: EnforcementResult = {
    allowed: violations.length === 0,
    violations,
    profile: context.tenant.profile,
    timestamp: new Date(),
    correlationId: context.correlationId,
  };
  
  enforcementHandler(result, { 
    operation: 'report_generation', 
    resource: reportType,
    content: reportContent,
  });
  
  if (!result.allowed) {
    throw new GovernanceEnforcementError(violations, context.tenant.profile);
  }
  
  return result;
}

/**
 * Hook for UI content enforcement.
 * Called before rendering UI content.
 */
export async function enforceUiContent(
  content: string,
  componentName: string
): Promise<EnforcementResult> {
  const context = getTenantContext();
  const adapter = GovernanceAdapter.forCurrentTenant();
  
  // Check UI content for violations
  const violations = adapter.checkAdvisoryLanguage(content);
  
  const result: EnforcementResult = {
    allowed: violations.length === 0,
    violations,
    profile: context.tenant.profile,
    timestamp: new Date(),
    correlationId: context.correlationId,
  };
  
  enforcementHandler(result, { 
    operation: 'ui_render', 
    resource: componentName,
    content,
  });
  
  if (!result.allowed) {
    throw new GovernanceEnforcementError(violations, context.tenant.profile);
  }
  
  return result;
}

/**
 * Hook for data export enforcement.
 * Called before exporting any data.
 */
export async function enforceDataExport(
  exportData: unknown,
  exportType: string
): Promise<EnforcementResult> {
  const context = getTenantContext();
  const adapter = GovernanceAdapter.forCurrentTenant();
  
  // Check export data for violations
  const dataString = typeof exportData === 'string' 
    ? exportData 
    : JSON.stringify(exportData);
  
  const violations = adapter.checkAdvisoryLanguage(dataString);
  
  const result: EnforcementResult = {
    allowed: violations.length === 0,
    violations,
    profile: context.tenant.profile,
    timestamp: new Date(),
    correlationId: context.correlationId,
  };
  
  enforcementHandler(result, { 
    operation: 'data_export', 
    resource: exportType,
    content: dataString,
  });
  
  if (!result.allowed) {
    throw new GovernanceEnforcementError(violations, context.tenant.profile);
  }
  
  return result;
}

// =============================================================================
// DECORATOR-STYLE ENFORCEMENT
// =============================================================================

/**
 * Enforce governance on a function's return value.
 * Use as a wrapper for functions that produce user-visible content.
 */
export function withGovernanceEnforcement<T extends (...args: unknown[]) => unknown>(
  fn: T,
  operation: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const result = await fn(...args);
    
    // Check result for violations
    const context = getTenantContext();
    const adapter = GovernanceAdapter.forCurrentTenant();
    
    const resultString = typeof result === 'string' 
      ? result 
      : JSON.stringify(result);
    
    const violations = adapter.checkAdvisoryLanguage(resultString);
    
    if (violations.length > 0) {
      enforcementHandler(
        {
          allowed: false,
          violations,
          profile: context.tenant.profile,
          timestamp: new Date(),
          correlationId: context.correlationId,
        },
        { operation, content: resultString }
      );
      
      throw new GovernanceEnforcementError(violations, context.tenant.profile);
    }
    
    return result as ReturnType<T>;
  }) as T;
}

// =============================================================================
// PROFILE-SPECIFIC GUARDS
// =============================================================================

/**
 * Guard that ensures FO profile restrictions.
 * Use at the start of FO-specific operations.
 */
export function assertFoGovernance(): void {
  const profile = getCurrentTenantProfile();
  
  if (profile !== 'fo') {
    return; // Only enforce for FO tenants
  }
  
  const adapter = new GovernanceAdapter('fo');
  
  if (adapter.isAdvisoryAllowed()) {
    throw new Error('FO governance violation: advisory language must be forbidden');
  }
  
  if (adapter.isExecutionAllowed()) {
    throw new Error('FO governance violation: execution capability must be forbidden');
  }
  
  if (adapter.isSorAllowed()) {
    throw new Error('FO governance violation: SoR logic must be forbidden');
  }
}

/**
 * Guard that prevents execution operations.
 * Use at the start of any operation that could execute trades.
 */
export function assertNoExecution(): void {
  const adapter = GovernanceAdapter.forCurrentTenant();
  
  if (!adapter.isExecutionAllowed()) {
    throw new GovernanceEnforcementError(
      [{
        type: 'EXECUTION_CAPABILITY',
        term: 'execution_attempt',
        context: 'Execution operations are forbidden for this tenant profile',
        severity: 'error',
        profile: getCurrentTenantProfile(),
        timestamp: new Date(),
      }],
      getCurrentTenantProfile()
    );
  }
}

/**
 * Guard that prevents SoR operations.
 * Use at the start of any operation that could modify ledger state.
 */
export function assertNoSor(): void {
  const adapter = GovernanceAdapter.forCurrentTenant();
  
  if (!adapter.isSorAllowed()) {
    throw new GovernanceEnforcementError(
      [{
        type: 'SOR_LEAKAGE',
        term: 'sor_attempt',
        context: 'System-of-record operations are forbidden for this tenant profile',
        severity: 'error',
        profile: getCurrentTenantProfile(),
        timestamp: new Date(),
      }],
      getCurrentTenantProfile()
    );
  }
}

// =============================================================================
// CONTENT SANITIZATION
// =============================================================================

/**
 * Sanitize content by removing forbidden terms.
 * Use as a fallback when content cannot be rejected.
 * 
 * WARNING: Prefer rejection over sanitization.
 * Sanitization should only be used for legacy data migration.
 */
export function sanitizeContent(content: string): {
  sanitized: string;
  removedTerms: string[];
} {
  const adapter = GovernanceAdapter.forCurrentTenant();
  const profile = adapter.getProfile();
  
  let sanitized = content;
  const removedTerms: string[] = [];
  
  for (const term of profile.enforcement.forbiddenAdvisoryTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    if (regex.test(sanitized)) {
      sanitized = sanitized.replace(regex, '[REDACTED]');
      removedTerms.push(term);
    }
  }
  
  return { sanitized, removedTerms };
}
