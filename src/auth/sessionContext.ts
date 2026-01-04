/**
 * Session Context
 * 
 * AUTHORITATIVE: React context for session state derived from TuringOS JWT.
 * 
 * This context provides:
 * - Current JWT claims (read-only)
 * - Resolved application mode
 * - Entity scope access
 * 
 * ❌ No local state overrides
 * ❌ No permission caching
 * ❌ No role inference
 * 
 * All authority comes from TuringOS, never the UI.
 */

import { createContext, useContext } from 'react';
import type { TuringJWTClaims, AppMode, TuringRole } from './types';
import { resolveAppMode, canMutateInGroupMode, getEntityScope, resolveModeWithContext } from './modeResolver';

/**
 * Session state derived from TuringOS JWT.
 * All fields are readonly - no mutation allowed.
 */
export interface SessionState {
  /** Raw JWT claims from TuringOS. Treat as ground truth. */
  readonly claims: TuringJWTClaims | null;
  
  /** Resolved application mode. Derived, not stored. */
  readonly mode: AppMode;
  
  /** Whether the current session can mutate in Group Mode. */
  readonly canMutate: boolean;
  
  /** Current user's role from TuringOS. */
  readonly role: TuringRole | null;
  
  /** Number of entities in scope. */
  readonly entityCount: number;
  
  /** Whether the session is authenticated. */
  readonly isAuthenticated: boolean;
  
  /** Whether the session is loading. */
  readonly isLoading: boolean;
}

/**
 * Create session state from JWT claims.
 * 
 * @param claims - TuringOS JWT claims (may be null during loading)
 * @param isLoading - Whether claims are still being fetched
 * @returns SessionState - Immutable session state
 */
export function createSessionState(
  claims: TuringJWTClaims | null,
  isLoading: boolean = false
): SessionState {
  const resolution = resolveModeWithContext(claims);
  
  return Object.freeze({
    claims,
    mode: resolution.mode,
    canMutate: resolution.canMutate,
    role: resolution.role,
    entityCount: resolution.entityCount,
    isAuthenticated: claims !== null,
    isLoading,
  });
}

/**
 * Default session state - unauthenticated, Retail Mode.
 */
export const DEFAULT_SESSION_STATE: SessionState = Object.freeze({
  claims: null,
  mode: 'RETAIL',
  canMutate: false,
  role: null,
  entityCount: 0,
  isAuthenticated: false,
  isLoading: true,
});

/**
 * Session Context.
 * 
 * Provides session state to the component tree.
 * Default value is unauthenticated Retail Mode.
 */
export const SessionContext = createContext<SessionState>(DEFAULT_SESSION_STATE);

/**
 * Hook to access session state.
 * 
 * @returns SessionState - Current session state
 * @throws Error if used outside SessionProvider
 */
export function useSession(): SessionState {
  const context = useContext(SessionContext);
  
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  
  return context;
}

/**
 * Hook to get current application mode.
 * Convenience wrapper around useSession.
 * 
 * @returns AppMode - 'RETAIL' or 'GROUP'
 */
export function useAppMode(): AppMode {
  const session = useSession();
  return session.mode;
}

/**
 * Hook to check if current session is in Group Mode.
 * 
 * @returns boolean - true if in Group Mode
 */
export function useIsGroupMode(): boolean {
  const mode = useAppMode();
  return mode === 'GROUP';
}

/**
 * Hook to check if current session is in Retail Mode.
 * 
 * @returns boolean - true if in Retail Mode
 */
export function useIsRetailMode(): boolean {
  const mode = useAppMode();
  return mode === 'RETAIL';
}

/**
 * Hook to check if current session can mutate in Group Mode.
 * 
 * @returns boolean - true if can mutate (not Auditor)
 */
export function useCanMutate(): boolean {
  const session = useSession();
  return session.canMutate;
}

/**
 * Hook to get current user's role.
 * 
 * @returns TuringRole | null - Current role or null if not authenticated
 */
export function useRole(): TuringRole | null {
  const session = useSession();
  return session.role;
}

/**
 * Hook to get entity scope.
 * 
 * @returns EntityScope[] - Array of entity scopes
 */
export function useEntityScope() {
  const session = useSession();
  return getEntityScope(session.claims);
}

/**
 * Hook to check if user has access to a specific entity.
 * 
 * @param entityId - Entity ID to check
 * @returns boolean - true if user has access
 */
export function useHasEntityAccess(entityId: string): boolean {
  const scope = useEntityScope();
  return scope.some(s => s.entity_id === entityId);
}
