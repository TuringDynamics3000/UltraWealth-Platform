/**
 * AUTHORITATIVE GROUP ROUTE CONTRACT
 * 
 * This file is the SINGLE SOURCE OF TRUTH for Group route definitions.
 * 
 * Any route listed here MUST require entity_scope.
 * CI will fail if this contract is violated.
 * 
 * Rules:
 * - No ad-hoc group routes elsewhere
 * - All governance surfaces must live under /group/*
 * - This file is the only allowlist
 * - Any route matching these prefixes MUST be guarded
 * 
 * Violations are architectural failures, not warnings.
 */

/**
 * Group route prefixes.
 * Any route starting with these prefixes requires entity_scope.
 */
export const GROUP_ROUTE_PREFIXES = [
  "/group",
  "/group/dashboard",
  "/group/entity",
  "/group/ownership",
  "/group/board-pack",
  "/group/evidence",
  "/group/reconciliation",
  "/group/settings",
] as const;

/**
 * Type for Group route prefixes.
 */
export type GroupRoutePrefix = typeof GROUP_ROUTE_PREFIXES[number];

/**
 * Group routes that require mutation capability.
 * Auditors MUST NOT be able to access these routes.
 */
export const GROUP_MUTATION_ROUTE_PATTERNS = [
  "/group/entity/create",
  "/group/entity/:id/edit",
  "/group/ownership/create",
  "/group/ownership/:id/edit",
  "/group/board-pack/create",
  "/group/board-pack/:id/edit",
  "/group/board-pack/:id/approve",
  "/group/board-pack/:id/lock",
  "/group/reconciliation/trigger",
] as const;

/**
 * Type for Group mutation route patterns.
 */
export type GroupMutationRoutePattern = typeof GROUP_MUTATION_ROUTE_PATTERNS[number];

/**
 * Check if a route is a Group route.
 * 
 * @param route - Route path to check
 * @returns true if the route is a Group route
 */
export function isGroupRoute(route: string): boolean {
  const normalizedRoute = route.toLowerCase();
  return GROUP_ROUTE_PREFIXES.some(prefix => 
    normalizedRoute === prefix || normalizedRoute.startsWith(`${prefix}/`)
  );
}

/**
 * Check if a route requires mutation capability.
 * 
 * @param route - Route path to check
 * @returns true if the route requires mutation capability
 */
export function isMutationRoute(route: string): boolean {
  const normalizedRoute = route.toLowerCase();
  
  for (const pattern of GROUP_MUTATION_ROUTE_PATTERNS) {
    // Convert pattern to regex (replace :id with [^/]+)
    const regexPattern = pattern.replace(/:id/g, "[^/]+");
    const regex = new RegExp(`^${regexPattern}$`, "i");
    
    if (regex.test(normalizedRoute)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Contract validation result.
 */
export interface ContractValidationResult {
  readonly isValid: boolean;
  readonly violations: readonly string[];
}

/**
 * Validate that a route follows the Group route contract.
 * 
 * @param route - Route path to validate
 * @param hasEntityScope - Whether the user has entity_scope
 * @param canMutate - Whether the user can mutate
 * @returns Validation result
 */
export function validateRouteContract(
  route: string,
  hasEntityScope: boolean,
  canMutate: boolean
): ContractValidationResult {
  const violations: string[] = [];
  
  if (isGroupRoute(route)) {
    if (!hasEntityScope) {
      violations.push(
        `Route "${route}" requires entity_scope but none was provided`
      );
    }
    
    if (isMutationRoute(route) && !canMutate) {
      violations.push(
        `Route "${route}" requires mutation capability but user cannot mutate`
      );
    }
  }
  
  return {
    isValid: violations.length === 0,
    violations,
  };
}
