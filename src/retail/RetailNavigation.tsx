/**
 * Retail Navigation
 * 
 * AUTHORITATIVE: Navigation component for Retail Mode.
 * 
 * This component:
 * - Renders ONLY Retail navigation items
 * - Has NO knowledge of Group surfaces
 * - Does NOT conditionally hide Group items
 * 
 * ❌ No Group imports
 * ❌ No conditional Group rendering
 * ❌ No governance surfaces
 * 
 * In Retail Mode, Group does not exist.
 */

import React from 'react';
import { useIsRetailMode } from '../auth';

/**
 * Retail navigation items.
 * These are the ONLY items that exist in Retail Mode.
 */
export const RETAIL_NAV_ITEMS = Object.freeze([
  { path: '/retail/dashboard', label: 'Dashboard', icon: 'home' },
  { path: '/retail/portfolio', label: 'Portfolio', icon: 'briefcase' },
  { path: '/retail/performance', label: 'Performance', icon: 'chart' },
  { path: '/retail/statements', label: 'Statements', icon: 'document' },
  { path: '/retail/settings', label: 'Settings', icon: 'cog' },
]);

/**
 * Props for RetailNavigation.
 */
export interface RetailNavigationProps {
  /** Current active path */
  activePath?: string;
  /** Navigation handler */
  onNavigate?: (path: string) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Retail Navigation Component.
 * 
 * Renders navigation for Retail Mode users.
 * This component has NO knowledge of Group Mode.
 */
export function RetailNavigation({
  activePath,
  onNavigate,
  className,
}: RetailNavigationProps): React.ReactElement {
  const isRetailMode = useIsRetailMode();

  // HARD GUARD: This component MUST NOT render in Group Mode
  if (!isRetailMode) {
    throw new Error('[RetailNavigation] Rendered in non-Retail mode. This is a critical error.');
  }

  const handleClick = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate?.(path);
  };

  return (
    <nav className={className} aria-label="Retail navigation">
      <ul>
        {RETAIL_NAV_ITEMS.map((item) => (
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
export default RetailNavigation;
