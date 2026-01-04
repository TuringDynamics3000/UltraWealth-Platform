/**
 * Group Module
 * 
 * AUTHORITATIVE: Components and utilities for Group Mode.
 * 
 * This module contains:
 * - Group navigation
 * - Component guards (defense in depth)
 * - Auditor handling utilities
 * 
 * ❌ No Retail imports
 * ❌ No mode toggles
 * ❌ No authority inference
 * 
 * In Group Mode, Retail does not exist.
 */

// Navigation
export { GroupNavigation, GROUP_NAV_ITEMS } from './GroupNavigation';
export type { GroupNavigationProps } from './GroupNavigation';

// Guards
export {
  useGroupGuard,
  useRetailGuard,
  withGroupGuard,
  withRetailGuard,
  GroupOnly,
  RetailOnly,
  MutationOnly,
  ReadOnlyIndicator,
} from './guards';
export type { GroupGuardOptions } from './guards';

// Auditor Handling
export {
  useIsAuditor,
  AuditorAware,
  AuditorReadOnlyBanner,
  MutationButton,
  BoardPackActions,
  useAuditorSafeHandlers,
} from './auditorHandling';
export type { AuditorAwareProps, BoardPackActionsProps } from './auditorHandling';
