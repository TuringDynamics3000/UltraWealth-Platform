/**
 * Route Definitions
 * 
 * AUTHORITATIVE: Route classification for Retail vs Group mode gating.
 * 
 * Routes are classified as:
 * - RETAIL_ONLY: Only accessible in Retail Mode
 * - GROUP_ONLY: Only accessible in Group Mode
 * - SHARED: Accessible in both modes
 * 
 * ❌ No dynamic route classification
 * ❌ No feature flags
 * ❌ No conditional access based on UI state
 * 
 * If a surface is not authorised, it must:
 * - not render
 * - not route
 * - not be reachable via URL
 * - not be inspectable via client state
 */

/**
 * Route classification type.
 */
export type RouteClassification = 'RETAIL_ONLY' | 'GROUP_ONLY' | 'SHARED';

/**
 * Route definition with classification.
 */
export interface RouteDefinition {
  readonly path: string;
  readonly classification: RouteClassification;
  readonly title: string;
  /** If true, requires mutation capability (excludes Auditor) */
  readonly requiresMutation?: boolean;
}

/**
 * Group-only routes.
 * These routes are ONLY accessible when mode === 'GROUP'.
 * Direct URL access in Retail Mode MUST redirect to Retail home.
 */
export const GROUP_ONLY_ROUTES: readonly string[] = Object.freeze([
  '/group',
  '/group/dashboard',
  '/group/entity',
  '/group/entity/:id',
  '/group/ownership',
  '/group/ownership/:id',
  '/group/board-pack',
  '/group/board-pack/:id',
  '/group/evidence',
  '/group/evidence/:id',
  '/group/reconciliation',
  '/group/reconciliation/:id',
  '/group/settings',
]);

/**
 * Retail-only routes.
 * These routes are ONLY accessible when mode === 'RETAIL'.
 */
export const RETAIL_ONLY_ROUTES: readonly string[] = Object.freeze([
  '/retail',
  '/retail/dashboard',
  '/retail/portfolio',
  '/retail/portfolio/:id',
  '/retail/performance',
  '/retail/statements',
  '/retail/settings',
]);

/**
 * Shared routes.
 * These routes are accessible in both modes.
 */
export const SHARED_ROUTES: readonly string[] = Object.freeze([
  '/',
  '/login',
  '/logout',
  '/profile',
  '/help',
  '/support',
]);

/**
 * Routes that require mutation capability.
 * Auditors can view Group surfaces but CANNOT access these routes.
 */
export const MUTATION_REQUIRED_ROUTES: readonly string[] = Object.freeze([
  '/group/board-pack/create',
  '/group/board-pack/:id/edit',
  '/group/board-pack/:id/approve',
  '/group/board-pack/:id/lock',
  '/group/entity/create',
  '/group/entity/:id/edit',
  '/group/ownership/create',
  '/group/ownership/:id/edit',
  '/group/reconciliation/trigger',
]);

/**
 * All route definitions.
 */
export const ROUTE_DEFINITIONS: readonly RouteDefinition[] = Object.freeze([
  // Shared routes
  { path: '/', classification: 'SHARED', title: 'Home' },
  { path: '/login', classification: 'SHARED', title: 'Login' },
  { path: '/logout', classification: 'SHARED', title: 'Logout' },
  { path: '/profile', classification: 'SHARED', title: 'Profile' },
  { path: '/help', classification: 'SHARED', title: 'Help' },
  { path: '/support', classification: 'SHARED', title: 'Support' },
  
  // Retail routes
  { path: '/retail', classification: 'RETAIL_ONLY', title: 'Retail Dashboard' },
  { path: '/retail/dashboard', classification: 'RETAIL_ONLY', title: 'Dashboard' },
  { path: '/retail/portfolio', classification: 'RETAIL_ONLY', title: 'Portfolio' },
  { path: '/retail/portfolio/:id', classification: 'RETAIL_ONLY', title: 'Portfolio Detail' },
  { path: '/retail/performance', classification: 'RETAIL_ONLY', title: 'Performance' },
  { path: '/retail/statements', classification: 'RETAIL_ONLY', title: 'Statements' },
  { path: '/retail/settings', classification: 'RETAIL_ONLY', title: 'Settings' },
  
  // Group routes
  { path: '/group', classification: 'GROUP_ONLY', title: 'Group Dashboard' },
  { path: '/group/dashboard', classification: 'GROUP_ONLY', title: 'Dashboard' },
  { path: '/group/entity', classification: 'GROUP_ONLY', title: 'Entities' },
  { path: '/group/entity/create', classification: 'GROUP_ONLY', title: 'Create Entity', requiresMutation: true },
  { path: '/group/entity/:id', classification: 'GROUP_ONLY', title: 'Entity Detail' },
  { path: '/group/entity/:id/edit', classification: 'GROUP_ONLY', title: 'Edit Entity', requiresMutation: true },
  { path: '/group/ownership', classification: 'GROUP_ONLY', title: 'Ownership' },
  { path: '/group/ownership/create', classification: 'GROUP_ONLY', title: 'Create Ownership', requiresMutation: true },
  { path: '/group/ownership/:id', classification: 'GROUP_ONLY', title: 'Ownership Detail' },
  { path: '/group/ownership/:id/edit', classification: 'GROUP_ONLY', title: 'Edit Ownership', requiresMutation: true },
  { path: '/group/board-pack', classification: 'GROUP_ONLY', title: 'Board Packs' },
  { path: '/group/board-pack/create', classification: 'GROUP_ONLY', title: 'Create Board Pack', requiresMutation: true },
  { path: '/group/board-pack/:id', classification: 'GROUP_ONLY', title: 'Board Pack Detail' },
  { path: '/group/board-pack/:id/edit', classification: 'GROUP_ONLY', title: 'Edit Board Pack', requiresMutation: true },
  { path: '/group/board-pack/:id/approve', classification: 'GROUP_ONLY', title: 'Approve Board Pack', requiresMutation: true },
  { path: '/group/board-pack/:id/lock', classification: 'GROUP_ONLY', title: 'Lock Board Pack', requiresMutation: true },
  { path: '/group/evidence', classification: 'GROUP_ONLY', title: 'Evidence' },
  { path: '/group/evidence/:id', classification: 'GROUP_ONLY', title: 'Evidence Detail' },
  { path: '/group/reconciliation', classification: 'GROUP_ONLY', title: 'Reconciliation' },
  { path: '/group/reconciliation/trigger', classification: 'GROUP_ONLY', title: 'Trigger Reconciliation', requiresMutation: true },
  { path: '/group/reconciliation/:id', classification: 'GROUP_ONLY', title: 'Reconciliation Detail' },
  { path: '/group/settings', classification: 'GROUP_ONLY', title: 'Group Settings' },
]);

/**
 * Get route classification for a given path.
 * 
 * @param path - Route path to classify
 * @returns RouteClassification - 'RETAIL_ONLY', 'GROUP_ONLY', or 'SHARED'
 */
export function getRouteClassification(path: string): RouteClassification {
  // Normalize path
  const normalizedPath = path.toLowerCase().replace(/\/$/, '') || '/';
  
  // Check Group routes first (more specific)
  if (normalizedPath.startsWith('/group')) {
    return 'GROUP_ONLY';
  }
  
  // Check Retail routes
  if (normalizedPath.startsWith('/retail')) {
    return 'RETAIL_ONLY';
  }
  
  // Check shared routes
  if (SHARED_ROUTES.includes(normalizedPath)) {
    return 'SHARED';
  }
  
  // Default to SHARED for unknown routes (will be handled by 404)
  return 'SHARED';
}

/**
 * Check if a route requires mutation capability.
 * 
 * @param path - Route path to check
 * @returns boolean - true if route requires mutation
 */
export function routeRequiresMutation(path: string): boolean {
  const normalizedPath = path.toLowerCase().replace(/\/$/, '');
  
  // Check exact matches first
  if (MUTATION_REQUIRED_ROUTES.includes(normalizedPath)) {
    return true;
  }
  
  // Check pattern matches (e.g., /group/board-pack/:id/edit)
  for (const route of MUTATION_REQUIRED_ROUTES) {
    const pattern = route.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(normalizedPath)) {
      return true;
    }
  }
  
  return false;
}
