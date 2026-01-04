/**
 * Mode-Aware Routes
 * 
 * AUTHORITATIVE: Route composition based on resolved mode.
 * 
 * This component:
 * - Renders routes based on current mode
 * - Enforces hard blocking via guards
 * - Handles redirects for unauthorized access
 * 
 * ❌ No conditional rendering within routes
 * ❌ No partial route trees
 * ❌ No feature flags
 * 
 * If it's Retail Mode, Group does not exist.
 * If it's Group Mode, Retail does not exist.
 */

import React, { useEffect } from 'react';
import { useSession, useAppMode, useCanMutate } from '../auth';
import { guardRoute, getHomeRoute, REDIRECT_TARGETS } from './routeGuards';

/**
 * Props for ModeAwareRoutes.
 */
export interface ModeAwareRoutesProps {
  /** Retail mode route tree */
  retailRoutes: React.ReactNode;
  /** Group mode route tree */
  groupRoutes: React.ReactNode;
  /** Shared routes (login, profile, etc.) */
  sharedRoutes?: React.ReactNode;
  /** Loading component while session is loading */
  loadingComponent?: React.ReactNode;
  /** Current route path (from router) */
  currentPath: string;
  /** Navigate function (from router) */
  navigate: (path: string) => void;
}

/**
 * Mode-Aware Routes Component.
 * 
 * Renders the appropriate route tree based on the current mode.
 * Enforces hard blocking and redirects for unauthorized access.
 */
export function ModeAwareRoutes({
  retailRoutes,
  groupRoutes,
  sharedRoutes,
  loadingComponent,
  currentPath,
  navigate,
}: ModeAwareRoutesProps): React.ReactElement | null {
  const session = useSession();
  const mode = useAppMode();
  const canMutate = useCanMutate();

  // Handle route guarding
  useEffect(() => {
    if (session.isLoading) {
      return;
    }

    const guardResult = guardRoute(mode, currentPath, canMutate);

    switch (guardResult.action) {
      case 'REDIRECT_RETAIL':
      case 'REDIRECT_GROUP':
      case 'REDIRECT_LOGIN':
        navigate(guardResult.target);
        break;
      case 'DENY':
        // Redirect to appropriate home on deny
        navigate(getHomeRoute(mode));
        break;
      case 'ALLOW':
        // No action needed
        break;
    }
  }, [mode, currentPath, canMutate, navigate, session.isLoading]);

  // Show loading while session is loading
  if (session.isLoading) {
    return loadingComponent ? <>{loadingComponent}</> : null;
  }

  // Render based on mode
  // CRITICAL: Only ONE mode's routes are rendered at a time
  // The other mode's routes DO NOT EXIST in the component tree
  return (
    <>
      {/* Shared routes are always rendered */}
      {sharedRoutes}
      
      {/* Mode-specific routes - ONLY ONE is rendered */}
      {mode === 'RETAIL' && retailRoutes}
      {mode === 'GROUP' && groupRoutes}
    </>
  );
}

/**
 * Hook to get current route guard result.
 * Use this for programmatic navigation decisions.
 * 
 * @param path - Route path to check
 * @returns GuardResult
 */
export function useRouteGuard(path: string) {
  const mode = useAppMode();
  const canMutate = useCanMutate();
  return guardRoute(mode, path, canMutate);
}

/**
 * Hook to check if current user can access a route.
 * 
 * @param path - Route path to check
 * @returns boolean - true if accessible
 */
export function useCanAccessRoute(path: string): boolean {
  const result = useRouteGuard(path);
  return result.action === 'ALLOW';
}

/**
 * Higher-order component for route protection.
 * Wraps a component and enforces mode-based access.
 * 
 * @param WrappedComponent - Component to wrap
 * @param requiredMode - Required mode for access
 * @param requiresMutation - Whether mutation capability is required
 */
export function withModeGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredMode: 'RETAIL' | 'GROUP',
  requiresMutation: boolean = false
): React.FC<P> {
  return function ModeGuardedComponent(props: P) {
    const mode = useAppMode();
    const canMutate = useCanMutate();

    // Hard check - throw if mode mismatch
    if (mode !== requiredMode) {
      throw new Error(
        `[ModeGuard] Component requires ${requiredMode} mode but current mode is ${mode}`
      );
    }

    // Hard check - throw if mutation required but not allowed
    if (requiresMutation && !canMutate) {
      throw new Error(
        `[ModeGuard] Component requires mutation capability but user cannot mutate`
      );
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Export default for convenience.
 */
export default ModeAwareRoutes;
