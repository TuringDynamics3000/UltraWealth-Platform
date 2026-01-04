/**
 * Auditor Handling
 * 
 * AUTHORITATIVE: Utilities for handling Auditor role in Group Mode.
 * 
 * Auditors:
 * - MAY enter Group Mode
 * - MAY view all Group surfaces
 * - MUST NOT see mutation controls
 * - MUST NOT see Board Pack lock actions
 * - MUST see read-only posture indicators
 * 
 * Auditor is Group-visible, not Group-powerful.
 */

import React from 'react';
import { useRole, useCanMutate, useIsGroupMode } from '../auth';
import type { TuringRole } from '../auth';

/**
 * Check if the current user is an Auditor.
 */
export function useIsAuditor(): boolean {
  const role = useRole();
  return role === 'AUDITOR';
}

/**
 * Props for AuditorAware components.
 */
export interface AuditorAwareProps {
  /** Content to show for all users */
  children: React.ReactNode;
  /** Content to show ONLY for Auditors (e.g., read-only badge) */
  auditorContent?: React.ReactNode;
  /** Content to hide from Auditors (e.g., mutation buttons) */
  nonAuditorContent?: React.ReactNode;
}

/**
 * Component that renders content aware of Auditor role.
 * 
 * Use this to compose views that need different content for Auditors.
 */
export function AuditorAware({
  children,
  auditorContent,
  nonAuditorContent,
}: AuditorAwareProps): React.ReactElement {
  const isAuditor = useIsAuditor();
  const isGroupMode = useIsGroupMode();

  // Only apply Auditor logic in Group Mode
  if (!isGroupMode) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {isAuditor && auditorContent}
      {!isAuditor && nonAuditorContent}
    </>
  );
}

/**
 * Read-only banner component for Auditors.
 * 
 * Displays a prominent banner indicating read-only access.
 */
export function AuditorReadOnlyBanner(): React.ReactElement | null {
  const isAuditor = useIsAuditor();
  const isGroupMode = useIsGroupMode();

  if (!isGroupMode || !isAuditor) {
    return null;
  }

  return (
    <div 
      className="auditor-readonly-banner"
      role="alert"
      aria-live="polite"
    >
      <span className="banner-icon" aria-hidden="true">[eye]</span>
      <span className="banner-text">
        <strong>Auditor View</strong> — You have read-only access. 
        Mutation controls are not available.
      </span>
    </div>
  );
}

/**
 * Button wrapper that disables for Auditors.
 * 
 * Use this to wrap action buttons that Auditors should not use.
 * The button is completely hidden, not just disabled.
 */
export function MutationButton({
  children,
  onClick,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>): React.ReactElement | null {
  const canMutate = useCanMutate();

  // Auditors don't see mutation buttons at all
  if (!canMutate) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Board Pack action buttons with Auditor awareness.
 * 
 * These buttons are NEVER shown to Auditors:
 * - Approve
 * - Lock
 * - Edit
 * - Create
 */
export interface BoardPackActionsProps {
  packId: string;
  packStatus: 'DRAFT' | 'PREPARED' | 'REVIEWED' | 'APPROVED' | 'LOCKED';
  onApprove?: (packId: string) => void;
  onLock?: (packId: string) => void;
  onEdit?: (packId: string) => void;
}

export function BoardPackActions({
  packId,
  packStatus,
  onApprove,
  onLock,
  onEdit,
}: BoardPackActionsProps): React.ReactElement | null {
  const canMutate = useCanMutate();
  const role = useRole();

  // Auditors see NO actions
  if (!canMutate) {
    return (
      <div className="board-pack-actions-readonly">
        <span className="readonly-indicator">View Only</span>
      </div>
    );
  }

  // Determine available actions based on status and role
  const canApprove = packStatus === 'REVIEWED' && (role === 'FOUNDER' || role === 'BOARD');
  const canLock = packStatus === 'APPROVED' && (role === 'FOUNDER' || role === 'BOARD');
  const canEdit = packStatus === 'DRAFT' || packStatus === 'PREPARED';

  return (
    <div className="board-pack-actions">
      {canEdit && (
        <MutationButton onClick={() => onEdit?.(packId)}>
          Edit
        </MutationButton>
      )}
      {canApprove && (
        <MutationButton onClick={() => onApprove?.(packId)}>
          Approve
        </MutationButton>
      )}
      {canLock && (
        <MutationButton onClick={() => onLock?.(packId)}>
          Lock
        </MutationButton>
      )}
    </div>
  );
}

/**
 * Hook to get Auditor-safe action handlers.
 * Returns no-op functions for Auditors.
 * 
 * @param handlers - Object of handler functions
 * @returns Same handlers, or no-ops for Auditors
 */
export function useAuditorSafeHandlers<T extends Record<string, (...args: unknown[]) => void>>(
  handlers: T
): T {
  const canMutate = useCanMutate();

  if (canMutate) {
    return handlers;
  }

  // Return no-op handlers for Auditors
  const noOpHandlers = {} as T;
  for (const key of Object.keys(handlers)) {
    (noOpHandlers as Record<string, () => void>)[key] = () => {
      console.warn(`[AuditorSafeHandlers] Action '${key}' blocked for Auditor role`);
    };
  }
  return noOpHandlers;
}
