/**
 * Mode Resolver
 * 
 * AUTHORITATIVE: Single source of truth for Retail vs Group mode resolution.
 * 
 * This module resolves the application mode based on TuringOS JWT claims.
 * Mode is a derived state, not a user choice.
 * 
 * ❌ No overrides
 * ❌ No UI toggles
 * ❌ No feature flags
 * ❌ No local storage persistence
 * 
 * When in doubt, deny access and fall back to Retail.
 */

import type { TuringJWTClaims, AppMode, TuringRole } from './types';
import { GOVERNANCE_ROLES, READ_ONLY_GROUP_ROLES } from './types';

/**
 * Resolve application mode from JWT claims.
 * 
 * RETAIL MODE if ANY of the following are true:
 * - JWT contains no entity_scope
 * - JWT entity_scope is empty
 * - JWT role is not governance-capable
 * - Claims are missing or malformed
 * 
 * GROUP MODE if and only if:
 * - JWT contains at least one entity_scope
 * - Role ∈ {FOUNDER, BOARD, CFO} OR Role = AUDITOR (read-only)
 * 
 * Retail Mode is the default and safest state.
 * Group Mode is explicitly earned, never assumed.
 * 
 * @param claims - TuringOS JWT claims (may be null/undefined)
 * @returns AppMode - 'RETAIL' or 'GROUP'
 */
export function resolveAppMode(claims: TuringJWTClaims | null | undefined): AppMode {
  // No claims → Retail Mode
  if (!claims) {
    return 'RETAIL';
  }

  // Malformed claims → Retail Mode
  if (typeof claims.role !== 'string') {
    return 'RETAIL';
  }

  // No entity_scope → Retail Mode
  if (!claims.entity_scope) {
    return 'RETAIL';
  }

  // Empty entity_scope → Retail Mode
  if (!Array.isArray(claims.entity_scope) || claims.entity_scope.length === 0) {
    return 'RETAIL';
  }

  // Role not governance-capable AND not read-only group role → Retail Mode
  const isGovernanceCapable = GOVERNANCE_ROLES.includes(claims.role);
  const isReadOnlyGroupRole = READ_ONLY_GROUP_ROLES.includes(claims.role);
  
  if (!isGovernanceCapable && !isReadOnlyGroupRole) {
    return 'RETAIL';
  }

  // All conditions met → Group Mode
  return 'GROUP';
}

/**
 * Check if the current session can mutate in Group Mode.
 * 
 * Auditors can VIEW Group surfaces but NEVER mutate.
 * This is a critical distinction for UI rendering.
 * 
 * @param claims - TuringOS JWT claims
 * @returns boolean - true if user can mutate, false otherwise
 */
export function canMutateInGroupMode(claims: TuringJWTClaims | null | undefined): boolean {
  if (!claims) {
    return false;
  }

  // Only governance-capable roles can mutate
  return GOVERNANCE_ROLES.includes(claims.role);
}

/**
 * Get the current entity scope from claims.
 * Returns empty array if no scope or in Retail Mode.
 * 
 * @param claims - TuringOS JWT claims
 * @returns EntityScope[] - Array of entity scopes
 */
export function getEntityScope(claims: TuringJWTClaims | null | undefined): readonly { entity_id: string; permissions: readonly string[] }[] {
  if (!claims || !claims.entity_scope || !Array.isArray(claims.entity_scope)) {
    return [];
  }
  return claims.entity_scope;
}

/**
 * Check if user has access to a specific entity.
 * 
 * @param claims - TuringOS JWT claims
 * @param entityId - Entity ID to check
 * @returns boolean - true if user has access to the entity
 */
export function hasEntityAccess(claims: TuringJWTClaims | null | undefined, entityId: string): boolean {
  const scope = getEntityScope(claims);
  return scope.some(s => s.entity_id === entityId);
}

/**
 * Check if user has a specific permission for an entity.
 * 
 * @param claims - TuringOS JWT claims
 * @param entityId - Entity ID to check
 * @param permission - Permission to check
 * @returns boolean - true if user has the permission for the entity
 */
export function hasEntityPermission(
  claims: TuringJWTClaims | null | undefined,
  entityId: string,
  permission: string
): boolean {
  const scope = getEntityScope(claims);
  const entityScope = scope.find(s => s.entity_id === entityId);
  
  if (!entityScope) {
    return false;
  }
  
  return entityScope.permissions.includes(permission);
}

/**
 * Mode resolution result with additional context.
 * Use this when you need more than just the mode.
 */
export interface ModeResolutionResult {
  readonly mode: AppMode;
  readonly canMutate: boolean;
  readonly entityCount: number;
  readonly role: TuringRole | null;
}

/**
 * Resolve mode with full context.
 * 
 * @param claims - TuringOS JWT claims
 * @returns ModeResolutionResult - Full resolution context
 */
export function resolveModeWithContext(claims: TuringJWTClaims | null | undefined): ModeResolutionResult {
  const mode = resolveAppMode(claims);
  const canMutate = canMutateInGroupMode(claims);
  const entityCount = getEntityScope(claims).length;
  const role = claims?.role ?? null;

  return Object.freeze({
    mode,
    canMutate,
    entityCount,
    role,
  });
}
