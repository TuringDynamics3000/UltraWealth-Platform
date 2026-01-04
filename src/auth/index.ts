/**
 * Auth Module
 * 
 * AUTHORITATIVE: Authentication and mode resolution for UltraWealth.
 * 
 * This module provides:
 * - JWT claims types (from TuringOS)
 * - Mode resolution (Retail vs Group)
 * - Session context and hooks
 * 
 * ❌ No permission logic
 * ❌ No role inference
 * ❌ No authority derivation
 * 
 * UltraWealth presents reality — it does not decide it.
 */

// Types
export type {
  TuringRole,
  EntityScope,
  TuringJWTClaims,
  AppMode,
} from './types';

export {
  GOVERNANCE_ROLES,
  READ_ONLY_GROUP_ROLES,
  isGovernanceRole,
  canViewGroupSurfaces,
  canMutateInGroup,
} from './types';

// Mode Resolution
export {
  resolveAppMode,
  canMutateInGroupMode,
  getEntityScope,
  hasEntityAccess,
  hasEntityPermission,
  resolveModeWithContext,
} from './modeResolver';

export type { ModeResolutionResult } from './modeResolver';

// Session Context
export {
  SessionContext,
  useSession,
  useAppMode,
  useIsGroupMode,
  useIsRetailMode,
  useCanMutate,
  useRole,
  useEntityScope,
  useHasEntityAccess,
  createSessionState,
  DEFAULT_SESSION_STATE,
} from './sessionContext';

export type { SessionState } from './sessionContext';

// Session Provider
export { SessionProvider } from './SessionProvider';
export type { SessionProviderProps } from './SessionProvider';
