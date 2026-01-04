/**
 * Group Navigation
 * 
 * AUTHORITATIVE: Navigation component for Group Mode.
 * 
 * This component:
 * - Renders ONLY Group navigation items
 * - Respects mutation capability (Auditor vs Governance roles)
 * - Has NO knowledge of Retail surfaces
 * 
 * ❌ No Retail imports
 * ❌ No conditional Retail rendering
 * ❌ No mode toggles
 * 
 * In Group Mode, Retail does not exist.
 */

import React from 'react';
import { useIsGroupMode, useCanMutate, useRole } from '../auth';

/**
 * Group navigation item definition.
 */
interface GroupNavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
  readonly requiresMutation?: boolean;
}

/**
 * Group navigation items.
 * These are the ONLY items that exist in Group Mode.
 * Items with requiresMutation=true are hidden for Auditors.
 */
export const GROUP_NAV_ITEMS: readonly GroupNavItem[] = Object.freeze([
  { path: '/group/dashboard', label: 'Dashboard', icon: 'home' },
  { path: '/group/entity', label: 'Entities', icon: 'building' },
  { path: '/group/ownership', label: 'Ownership', icon: 'sitemap' },
  { path: '/group/board-pack', label: 'Board Packs', icon: 'folder' },
  { path: '/group/evidence', label: 'Evidence', icon: 'shield' },
  { path: '/group/reconciliation', label: 'Reconciliation', icon: 'sync' },
  { path: '/group/settings', label: 'Settings', icon: 'cog' },
]);

/**
 * Props for GroupNavigation.
 */
export interface GroupNavigationProps {
  /** Current active path */
  activePath?: string;
  /** Navigation handler */
  onNavigate?: (path: string) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Group Navigation Component.
 * 
 * Renders navigation for Group Mode users.
 * This component has NO knowledge of Retail Mode.
 * 
 * Auditors see all navigation items but mutation-only items are not shown.
 */
export function GroupNavigation({
  activePath,
  onNavigate,
  className,
}: GroupNavigationProps): React.ReactElement {
  const isGroupMode = useIsGroupMode();
  const canMutate = useCanMutate();
  const role = useRole();

  // HARD GUARD: This component MUST NOT render in Retail Mode
  if (!isGroupMode) {
    throw new Error('[GroupNavigation] Rendered in non-Group mode. This is a critical error.');
  }

  // Filter items based on mutation capability
  // Auditors cannot see mutation-only items
  const visibleItems = GROUP_NAV_ITEMS.filter(item => {
    if (item.requiresMutation && !canMutate) {
      return false;
    }
    return true;
  });

  const handleClick = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate?.(path);
  };

  return (
    <nav className={className} aria-label="Group navigation">
      {/* Role indicator for Group Mode */}
      <div className="nav-role-indicator" aria-label="Current role">
        <span className="role-badge">{role}</span>
        {!canMutate && (
          <span className="read-only-badge" aria-label="Read-only access">
            Read-Only
          </span>
        )}
      </div>

      <ul>
        {visibleItems.map((item) => (
          <li key={item.path}>
            <a
              href={item.path}
              onClick={handleClick(item.path)}
              aria-current={activePath === item.path ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {/* Icon placeholder - replace with actual icon component */}
                [{item.icon}]
              </span>
              <span className="nav-label">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Export default for convenience.
 */
export default GroupNavigation;
