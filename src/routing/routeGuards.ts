/**
 * Route Guards
 * 
 * AUTHORITATIVE: Hard blocking for route access based on mode.
 * 
 * Route guards enforce:
 * - Group routes NEVER mount in Retail Mode
 * - Direct URL access redirects to appropriate home
 * - No "empty screens" or partial renders
 * 
 * ❌ No soft blocks (disabled buttons)
 * ❌ No conditional rendering within routes
 * ❌ No feature flags
 * 
 * If not authorised: not render, not route, not reachable.
 */

import type { AppMode } from '../auth/types';
import { getRouteClassification, routeRequiresMutation } from './routes';

/**
 * Guard result type.
 */
export type GuardResult = 
  | { action: 'ALLOW' }
  | { action: 'REDIRECT_RETAIL'; target: string }
  | { action: 'REDIRECT_GROUP'; target: string }
  | { action: 'REDIRECT_LOGIN'; target: string }
  | { action: 'DENY'; reason: string };

/**
 * Default redirect targets.
 */
export const REDIRECT_TARGETS = Object.freeze({
  RETAIL_HOME: '/retail/dashboard',
  GROUP_HOME: '/group/dashboard',
  LOGIN: '/login',
  HOME: '/',
});

/**
 * Guard a route based on current mode.
 * 
 * Hard requirement:
 * - Group routes must NEVER mount in Retail Mode
 * - Direct URL access must redirect to appropriate home
 * - No "empty screens" or partial renders
 * 
 * @param mode - Current application mode
 * @param route - Route path to guard
 * @param canMutate - Whether user can mutate (false for Auditor)
 * @returns GuardResult - ALLOW, REDIRECT_*, or DENY
 */
export function guardRoute(
  mode: AppMode,
  route: string,
  canMutate: boolean = true
): GuardResult {
  const classification = getRouteClassification(route);
  const requiresMutation = routeRequiresMutation(route);

  // Retail Mode trying to access Group routes → REDIRECT to Retail home
  if (mode === 'RETAIL' && classification === 'GROUP_ONLY') {
    return {
      action: 'REDIRECT_RETAIL',
      target: REDIRECT_TARGETS.RETAIL_HOME,
    };
  }

  // Group Mode trying to access Retail routes → REDIRECT to Group home
  if (mode === 'GROUP' && classification === 'RETAIL_ONLY') {
    return {
      action: 'REDIRECT_GROUP',
      target: REDIRECT_TARGETS.GROUP_HOME,
    };
  }

  // Auditor (canMutate = false) trying to access mutation routes → DENY
  if (mode === 'GROUP' && !canMutate && requiresMutation) {
    return {
      action: 'DENY',
      reason: 'Auditor cannot access mutation routes',
    };
  }

  // All checks passed → ALLOW
  return { action: 'ALLOW' };
}

/**
 * Guard a route and return redirect path if needed.
 * Convenience function for router integration.
 * 
 * @param mode - Current application mode
 * @param route - Route path to guard
 * @param canMutate - Whether user can mutate
 * @returns string | null - Redirect path or null if allowed
 */
export function getRedirectPath(
  mode: AppMode,
  route: string,
  canMutate: boolean = true
): string | null {
  const result = guardRoute(mode, route, canMutate);

  switch (result.action) {
    case 'ALLOW':
      return null;
    case 'REDIRECT_RETAIL':
    case 'REDIRECT_GROUP':
    case 'REDIRECT_LOGIN':
      return result.target;
    case 'DENY':
      // For DENY, redirect to appropriate home based on mode
      return mode === 'GROUP' 
        ? REDIRECT_TARGETS.GROUP_HOME 
        : REDIRECT_TARGETS.RETAIL_HOME;
  }
}

/**
 * Check if a route is accessible in the current mode.
 * 
 * @param mode - Current application mode
 * @param route - Route path to check
 * @param canMutate - Whether user can mutate
 * @returns boolean - true if route is accessible
 */
export function isRouteAccessible(
  mode: AppMode,
  route: string,
  canMutate: boolean = true
): boolean {
  const result = guardRoute(mode, route, canMutate);
  return result.action === 'ALLOW';
}

/**
 * Get the home route for the current mode.
 * 
 * @param mode - Current application mode
 * @returns string - Home route path
 */
export function getHomeRoute(mode: AppMode): string {
  return mode === 'GROUP' 
    ? REDIRECT_TARGETS.GROUP_HOME 
    : REDIRECT_TARGETS.RETAIL_HOME;
}

/**
 * Assert that a route is accessible.
 * Throws if not accessible.
 * 
 * Use this in route components for defense in depth.
 * 
 * @param mode - Current application mode
 * @param route - Route path to assert
 * @param canMutate - Whether user can mutate
 * @throws Error if route is not accessible
 */
export function assertRouteAccessible(
  mode: AppMode,
  route: string,
  canMutate: boolean = true
): void {
  const result = guardRoute(mode, route, canMutate);
  
  if (result.action !== 'ALLOW') {
    const reason = result.action === 'DENY' 
      ? (result as { action: 'DENY'; reason: string }).reason
      : `Route ${route} not accessible in ${mode} mode`;
    throw new Error(`[RouteGuard] Access denied: ${reason}`);
  }
}
