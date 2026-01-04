/**
 * TuringOS JWT Claims Types
 * 
 * AUTHORITATIVE: These types define the contract between TuringOS and UltraWealth.
 * UltraWealth MUST treat these claims as ground truth.
 * 
 * ❌ No permission logic
 * ❌ No role inference
 * ❌ No authority derivation
 * 
 * UltraWealth presents reality — it does not decide it.
 */

/**
 * Roles issued by TuringOS.
 * UltraWealth MUST NOT infer or derive roles.
 */
export type TuringRole = 
  | 'FOUNDER'
  | 'BOARD'
  | 'CFO'
  | 'ADVISOR'
  | 'AUDITOR'
  | 'SYSTEM';

/**
 * Entity scope claim from TuringOS JWT.
 * Defines which entities the user has access to and what permissions they have.
 */
export interface EntityScope {
  /** Entity ID from TuringOS Entity Registry */
  readonly entity_id: string;
  /** Permissions granted by TuringOS for this entity */
  readonly permissions: readonly string[];
}

/**
 * TuringOS JWT Claims.
 * 
 * AUTHORITATIVE: These claims are the single source of truth for:
 * - User role
 * - Entity access
 * - Permissions
 * 
 * UltraWealth MUST NOT:
 * - Infer additional permissions
 * - Derive roles from other data
 * - Cache or override these claims
 */
export interface TuringJWTClaims {
  /** User's role as assigned by TuringOS */
  readonly role: TuringRole;
  
  /** 
   * Entity scopes the user has access to.
   * If undefined or empty, user is in Retail Mode.
   */
  readonly entity_scope?: readonly EntityScope[];
  
  /** Standard JWT claims */
  readonly sub: string;
  readonly iat: number;
  readonly exp: number;
  readonly iss: string;
}

/**
 * Application Mode.
 * 
 * RETAIL: Default mode. Safe fallback.
 * GROUP: Explicitly earned. Requires entity_scope + governance role.
 */
export type AppMode = 'RETAIL' | 'GROUP';

/**
 * Governance-capable roles that can access Group Mode.
 * This is a frozen set - UltraWealth MUST NOT extend this.
 */
export const GOVERNANCE_ROLES: readonly TuringRole[] = Object.freeze([
  'FOUNDER',
  'BOARD',
  'CFO',
]);

/**
 * Roles that can view Group surfaces but cannot mutate.
 * Auditor is Group-visible, not Group-powerful.
 */
export const READ_ONLY_GROUP_ROLES: readonly TuringRole[] = Object.freeze([
  'AUDITOR',
]);

/**
 * Type guard to check if a role is governance-capable.
 */
export function isGovernanceRole(role: TuringRole): boolean {
  return GOVERNANCE_ROLES.includes(role);
}

/**
 * Type guard to check if a role can view Group surfaces (read-only).
 */
export function canViewGroupSurfaces(role: TuringRole): boolean {
  return GOVERNANCE_ROLES.includes(role) || READ_ONLY_GROUP_ROLES.includes(role);
}

/**
 * Type guard to check if a role can mutate in Group Mode.
 * Auditors can view but NEVER mutate.
 */
export function canMutateInGroup(role: TuringRole): boolean {
  return GOVERNANCE_ROLES.includes(role);
}
