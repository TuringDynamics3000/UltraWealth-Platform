/**
 * Playwright Routes Helper
 * 
 * AUTHORITATIVE: Route constants for mode gating tests.
 * 
 * These routes must match the application's route definitions.
 * Any mismatch indicates a contract violation.
 */

/**
 * Group-only routes.
 * Retail users MUST NOT be able to access any of these.
 */
export const GROUP_ROUTES = [
  "/group",
  "/group/dashboard",
  "/group/entity",
  "/group/entity/entity-123",
  "/group/ownership",
  "/group/ownership/entity-123",
  "/group/board-pack",
  "/group/board-pack/pack-001",
  "/group/evidence",
  "/group/evidence/evidence-001",
  "/group/reconciliation",
  "/group/reconciliation/recon-001",
  "/group/settings",
] as const;

/**
 * Group routes that require mutation capability.
 * Auditors MUST NOT be able to access these.
 */
export const GROUP_MUTATION_ROUTES = [
  "/group/entity/create",
  "/group/entity/entity-123/edit",
  "/group/ownership/create",
  "/group/ownership/entity-123/edit",
  "/group/board-pack/create",
  "/group/board-pack/pack-001/edit",
  "/group/board-pack/pack-001/approve",
  "/group/board-pack/pack-001/lock",
  "/group/reconciliation/trigger",
] as const;

/**
 * Retail home route.
 * Retail users should be redirected here when trying to access Group routes.
 */
export const RETAIL_HOME = "/retail/dashboard";

/**
 * Application root.
 * Used for initial navigation.
 */
export const APP_ROOT = "/";

/**
 * Retail routes.
 * These are accessible only in Retail Mode.
 */
export const RETAIL_ROUTES = [
  "/retail",
  "/retail/dashboard",
  "/retail/portfolio",
  "/retail/performance",
  "/retail/statements",
  "/retail/settings",
] as const;

/**
 * Group home route.
 * Group users should be redirected here when trying to access Retail routes.
 */
export const GROUP_HOME = "/group/dashboard";
