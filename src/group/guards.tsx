/**
 * Group Component Guards
 * 
 * AUTHORITATIVE: Defense-in-depth guards for Group components.
 * 
 * All Group components MUST include a hard guard that:
 * - Throws if rendered in Retail Mode
 * - Throws if mutation required but user cannot mutate
 * - Fails loudly in development
 * - Protects against accidental imports
 * 
 * This is intentional defensive programming.
 */

import React from 'react';
import { useIsGroupMode, useCanMutate, useRole, useSession } from '../auth';
import type { TuringRole } from '../auth';

/**
 * Guard options for Group components.
 */
export interface GroupGuardOptions {
  /** If true, component requires mutation capability (excludes Auditor) */
  requiresMutation?: boolean;
  /** If set, component requires one of these specific roles */
  allowedRoles?: readonly TuringRole[];
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Hook to assert Group Mode.
 * Throws if not in Group Mode.
 * 
 * Use this at the top of every Group component.
 * 
 * @param options - Guard options
 * @throws Error if guard conditions are not met
 */
export function useGroupGuard(options: GroupGuardOptions = {}): void {
  const isGroupMode = useIsGroupMode();
  const canMutate = useCanMutate();
  const role = useRole();

  // Guard 1: Must be in Group Mode
  if (!isGroupMode) {
    throw new Error(
      options.errorMessage || 
      '[GroupGuard] Component rendered in Retail Mode. This is a critical architectural violation.'
    );
  }

  // Guard 2: If mutation required, must have mutation capability
  if (options.requiresMutation && !canMutate) {
    throw new Error(
      options.errorMessage ||
      '[GroupGuard] Component requires mutation capability but user cannot mutate (Auditor role).'
    );
  }

  // Guard 3: If specific roles required, must have one of them
  if (options.allowedRoles && options.allowedRoles.length > 0) {
    if (!role || !options.allowedRoles.includes(role)) {
      throw new Error(
        options.errorMessage ||
        `[GroupGuard] Component requires role in [${options.allowedRoles.join(', ')}] but user has role ${role}.`
      );
    }
  }
}

/**
 * Hook to assert Retail Mode.
 * Throws if not in Retail Mode.
 * 
 * Use this at the top of every Retail component.
 * 
 * @param errorMessage - Custom error message
 * @throws Error if not in Retail Mode
 */
export function useRetailGuard(errorMessage?: string): void {
  const session = useSession();

  if (session.mode !== 'RETAIL') {
    throw new Error(
      errorMessage ||
      '[RetailGuard] Component rendered in Group Mode. This is a critical architectural violation.'
    );
  }
}

/**
 * Higher-order component that wraps a Group component with guards.
 * 
 * @param WrappedComponent - Component to wrap
 * @param options - Guard options
 * @returns Guarded component
 */
export function withGroupGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: GroupGuardOptions = {}
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const GuardedComponent: React.FC<P> = (props) => {
    useGroupGuard(options);
    return <WrappedComponent {...props} />;
  };

  GuardedComponent.displayName = `withGroupGuard(${displayName})`;
  return GuardedComponent;
}

/**
 * Higher-order component that wraps a Retail component with guards.
 * 
 * @param WrappedComponent - Component to wrap
 * @param errorMessage - Custom error message
 * @returns Guarded component
 */
export function withRetailGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorMessage?: string
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const GuardedComponent: React.FC<P> = (props) => {
    useRetailGuard(errorMessage);
    return <WrappedComponent {...props} />;
  };

  GuardedComponent.displayName = `withRetailGuard(${displayName})`;
  return GuardedComponent;
}

/**
 * Component that renders children only in Group Mode.
 * Does NOT throw - simply renders nothing in Retail Mode.
 * 
 * Use this for conditional rendering within shared components.
 * Prefer hard guards (useGroupGuard) for dedicated Group components.
 */
export function GroupOnly({ 
  children,
  requiresMutation = false,
}: { 
  children: React.ReactNode;
  requiresMutation?: boolean;
}): React.ReactElement | null {
  const isGroupMode = useIsGroupMode();
  const canMutate = useCanMutate();

  if (!isGroupMode) {
    return null;
  }

  if (requiresMutation && !canMutate) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Component that renders children only in Retail Mode.
 * Does NOT throw - simply renders nothing in Group Mode.
 * 
 * Use this for conditional rendering within shared components.
 * Prefer hard guards (useRetailGuard) for dedicated Retail components.
 */
export function RetailOnly({ 
  children,
}: { 
  children: React.ReactNode;
}): React.ReactElement | null {
  const session = useSession();

  if (session.mode !== 'RETAIL') {
    return null;
  }

  return <>{children}</>;
}

/**
 * Component that renders children only if user can mutate.
 * Auditors will NOT see children.
 * 
 * Use this to hide mutation controls from Auditors.
 */
export function MutationOnly({ 
  children,
}: { 
  children: React.ReactNode;
}): React.ReactElement | null {
  const canMutate = useCanMutate();

  if (!canMutate) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Component that renders children only if user is read-only (Auditor).
 * 
 * Use this to show read-only indicators to Auditors.
 */
export function ReadOnlyIndicator({ 
  children,
}: { 
  children: React.ReactNode;
}): React.ReactElement | null {
  const canMutate = useCanMutate();
  const isGroupMode = useIsGroupMode();

  // Only show in Group Mode when user cannot mutate
  if (!isGroupMode || canMutate) {
    return null;
  }

  return <>{children}</>;
}
