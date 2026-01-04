/**
 * Routing Module
 * 
 * AUTHORITATIVE: Mode-aware routing for UltraWealth.
 * 
 * This module provides:
 * - Route definitions and classification
 * - Route guards for hard blocking
 * - Mode-aware route composition
 * 
 * ❌ No soft blocks
 * ❌ No feature flags
 * ❌ No conditional access based on UI state
 * 
 * If not authorised: not render, not route, not reachable.
 */

// Route definitions
export {
  GROUP_ONLY_ROUTES,
  RETAIL_ONLY_ROUTES,
  SHARED_ROUTES,
  MUTATION_REQUIRED_ROUTES,
  ROUTE_DEFINITIONS,
  getRouteClassification,
  routeRequiresMutation,
} from './routes';

export type { RouteClassification, RouteDefinition } from './routes';

// Route guards
export {
  guardRoute,
  getRedirectPath,
  isRouteAccessible,
  getHomeRoute,
  assertRouteAccessible,
  REDIRECT_TARGETS,
} from './routeGuards';

export type { GuardResult } from './routeGuards';

// Mode-aware routes
export {
  ModeAwareRoutes,
  useRouteGuard,
  useCanAccessRoute,
  withModeGuard,
} from './modeAwareRoutes';

export type { ModeAwareRoutesProps } from './modeAwareRoutes';

// Group Route Contract (AUTHORITATIVE)
export {
  GROUP_ROUTE_PREFIXES,
  GROUP_MUTATION_ROUTE_PATTERNS,
  isGroupRoute,
  isMutationRoute,
  validateRouteContract,
} from './groupRoutes.contract';

export type {
  GroupRoutePrefix,
  GroupMutationRoutePattern,
  ContractValidationResult,
} from './groupRoutes.contract';
