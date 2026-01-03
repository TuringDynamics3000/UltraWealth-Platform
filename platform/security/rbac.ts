/**
 * Role-Based Access Control (RBAC)
 * 
 * Defines roles, permissions, and access control for the platform.
 * All access decisions are tenant-scoped.
 * 
 * PRINCIPLES:
 * - Least privilege by default
 * - All permissions are explicit
 * - Role assignments are audited
 */

import { getTenantContext, TenantProfile } from '../tenancy';

// =============================================================================
// TYPES
// =============================================================================

export type Permission =
  // Entity permissions
  | 'entity:read'
  | 'entity:create'
  | 'entity:update'
  | 'entity:archive'
  
  // Relationship permissions
  | 'relationship:read'
  | 'relationship:create'
  | 'relationship:update'
  | 'relationship:remove'
  
  // External asset permissions
  | 'external_asset:read'
  | 'external_asset:register'
  | 'external_asset:update'
  | 'external_asset:archive'
  
  // Valuation permissions
  | 'valuation:read'
  | 'valuation:record'
  | 'valuation:correct'
  
  // Obligation permissions
  | 'obligation:read'
  | 'obligation:create'
  | 'obligation:update'
  | 'obligation:fulfill'
  
  // Report permissions
  | 'report:read'
  | 'report:generate'
  | 'report:export'
  
  // View permissions
  | 'view:consolidated_net_worth'
  | 'view:liquidity_ladder'
  | 'view:exposure'
  | 'view:performance'
  
  // Admin permissions
  | 'admin:users'
  | 'admin:roles'
  | 'admin:audit'
  | 'admin:settings';

export type Role =
  | 'owner'
  | 'principal'
  | 'family_member'
  | 'accountant'
  | 'auditor'
  | 'viewer';

export interface RoleDefinition {
  readonly name: Role;
  readonly displayName: string;
  readonly description: string;
  readonly permissions: readonly Permission[];
  readonly inherits?: readonly Role[];
}

export interface UserRoleAssignment {
  readonly userId: string;
  readonly tenantId: string;
  readonly role: Role;
  readonly assignedAt: Date;
  readonly assignedBy: string;
  readonly expiresAt?: Date;
}

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

const ROLE_DEFINITIONS: ReadonlyMap<Role, RoleDefinition> = new Map([
  ['owner', {
    name: 'owner',
    displayName: 'Owner',
    description: 'Full access to all tenant resources and settings',
    permissions: Object.freeze([
      'entity:read', 'entity:create', 'entity:update', 'entity:archive',
      'relationship:read', 'relationship:create', 'relationship:update', 'relationship:remove',
      'external_asset:read', 'external_asset:register', 'external_asset:update', 'external_asset:archive',
      'valuation:read', 'valuation:record', 'valuation:correct',
      'obligation:read', 'obligation:create', 'obligation:update', 'obligation:fulfill',
      'report:read', 'report:generate', 'report:export',
      'view:consolidated_net_worth', 'view:liquidity_ladder', 'view:exposure', 'view:performance',
      'admin:users', 'admin:roles', 'admin:audit', 'admin:settings',
    ]),
  }],
  
  ['principal', {
    name: 'principal',
    displayName: 'Principal',
    description: 'Family principal with full visibility and management access',
    permissions: Object.freeze([
      'entity:read', 'entity:create', 'entity:update',
      'relationship:read', 'relationship:create', 'relationship:update',
      'external_asset:read', 'external_asset:register', 'external_asset:update',
      'valuation:read', 'valuation:record',
      'obligation:read', 'obligation:create', 'obligation:update', 'obligation:fulfill',
      'report:read', 'report:generate', 'report:export',
      'view:consolidated_net_worth', 'view:liquidity_ladder', 'view:exposure', 'view:performance',
      'admin:users',
    ]),
  }],
  
  ['family_member', {
    name: 'family_member',
    displayName: 'Family Member',
    description: 'Family member with read access and limited management',
    permissions: Object.freeze([
      'entity:read',
      'relationship:read',
      'external_asset:read',
      'valuation:read',
      'obligation:read',
      'report:read',
      'view:consolidated_net_worth', 'view:liquidity_ladder', 'view:exposure', 'view:performance',
    ]),
  }],
  
  ['accountant', {
    name: 'accountant',
    displayName: 'Accountant',
    description: 'External accountant with financial data access',
    permissions: Object.freeze([
      'entity:read',
      'external_asset:read',
      'valuation:read', 'valuation:record',
      'obligation:read',
      'report:read', 'report:generate', 'report:export',
      'view:consolidated_net_worth', 'view:liquidity_ladder',
    ]),
  }],
  
  ['auditor', {
    name: 'auditor',
    displayName: 'Auditor',
    description: 'External auditor with read-only access and audit trail',
    permissions: Object.freeze([
      'entity:read',
      'relationship:read',
      'external_asset:read',
      'valuation:read',
      'obligation:read',
      'report:read', 'report:export',
      'view:consolidated_net_worth', 'view:liquidity_ladder', 'view:exposure', 'view:performance',
      'admin:audit',
    ]),
  }],
  
  ['viewer', {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to dashboards and reports',
    permissions: Object.freeze([
      'entity:read',
      'external_asset:read',
      'valuation:read',
      'report:read',
      'view:consolidated_net_worth',
    ]),
  }],
]);

// =============================================================================
// RBAC IMPLEMENTATION
// =============================================================================

class RBACImpl {
  private readonly assignments: Map<string, UserRoleAssignment[]> = new Map();
  
  /**
   * Get role definition.
   */
  getRoleDefinition(role: Role): RoleDefinition | undefined {
    return ROLE_DEFINITIONS.get(role);
  }
  
  /**
   * Get all role definitions.
   */
  getAllRoles(): readonly RoleDefinition[] {
    return Array.from(ROLE_DEFINITIONS.values());
  }
  
  /**
   * Get permissions for a role.
   */
  getPermissionsForRole(role: Role): readonly Permission[] {
    const definition = ROLE_DEFINITIONS.get(role);
    if (!definition) return [];
    
    const permissions = new Set(definition.permissions);
    
    // Add inherited permissions
    if (definition.inherits) {
      for (const inheritedRole of definition.inherits) {
        const inheritedPerms = this.getPermissionsForRole(inheritedRole);
        inheritedPerms.forEach(p => permissions.add(p));
      }
    }
    
    return Object.freeze(Array.from(permissions));
  }
  
  /**
   * Assign a role to a user.
   */
  async assignRole(
    userId: string,
    role: Role,
    assignedBy: string,
    expiresAt?: Date
  ): Promise<UserRoleAssignment> {
    const context = getTenantContext();
    const tenantId = context.tenant.id;
    
    const assignment: UserRoleAssignment = Object.freeze({
      userId,
      tenantId,
      role,
      assignedAt: new Date(),
      assignedBy,
      expiresAt,
    });
    
    const key = `${tenantId}:${userId}`;
    if (!this.assignments.has(key)) {
      this.assignments.set(key, []);
    }
    
    // Remove existing assignment for same role
    const existing = this.assignments.get(key)!;
    const filtered = existing.filter(a => a.role !== role);
    filtered.push(assignment);
    this.assignments.set(key, filtered);
    
    return assignment;
  }
  
  /**
   * Remove a role from a user.
   */
  async removeRole(userId: string, role: Role): Promise<void> {
    const context = getTenantContext();
    const tenantId = context.tenant.id;
    
    const key = `${tenantId}:${userId}`;
    const existing = this.assignments.get(key);
    
    if (existing) {
      const filtered = existing.filter(a => a.role !== role);
      this.assignments.set(key, filtered);
    }
  }
  
  /**
   * Get roles for a user.
   */
  async getUserRoles(userId: string): Promise<readonly Role[]> {
    const context = getTenantContext();
    const tenantId = context.tenant.id;
    
    const key = `${tenantId}:${userId}`;
    const assignments = this.assignments.get(key) ?? [];
    
    // Filter out expired assignments
    const now = new Date();
    const active = assignments.filter(a => !a.expiresAt || a.expiresAt > now);
    
    return Object.freeze(active.map(a => a.role));
  }
  
  /**
   * Get all permissions for a user.
   */
  async getUserPermissions(userId: string): Promise<readonly Permission[]> {
    const roles = await this.getUserRoles(userId);
    
    const permissions = new Set<Permission>();
    for (const role of roles) {
      const rolePerms = this.getPermissionsForRole(role);
      rolePerms.forEach(p => permissions.add(p));
    }
    
    return Object.freeze(Array.from(permissions));
  }
  
  /**
   * Check if a user has a specific permission.
   */
  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }
  
  /**
   * Check if a user has a specific role.
   */
  async hasRole(userId: string, role: Role): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.includes(role);
  }
  
  /**
   * Assert that a user has a specific permission.
   */
  async assertPermission(userId: string, permission: Permission): Promise<void> {
    const hasPermission = await this.hasPermission(userId, permission);
    if (!hasPermission) {
      throw new PermissionDeniedError(permission, userId);
    }
  }
  
  /**
   * Assert that a user has a specific role.
   */
  async assertRole(userId: string, role: Role): Promise<void> {
    const hasRole = await this.hasRole(userId, role);
    if (!hasRole) {
      throw new RoleDeniedError(role, userId);
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const RBAC = new RBACImpl();

// =============================================================================
// ERRORS
// =============================================================================

export class PermissionDeniedError extends Error {
  readonly permission: Permission;
  readonly userId: string;
  
  constructor(permission: Permission, userId: string) {
    super(`Permission denied: ${permission} for user ${userId}`);
    this.name = 'PermissionDeniedError';
    this.permission = permission;
    this.userId = userId;
    Object.setPrototypeOf(this, PermissionDeniedError.prototype);
  }
}

export class RoleDeniedError extends Error {
  readonly role: Role;
  readonly userId: string;
  
  constructor(role: Role, userId: string) {
    super(`Role required: ${role} for user ${userId}`);
    this.name = 'RoleDeniedError';
    this.role = role;
    this.userId = userId;
    Object.setPrototypeOf(this, RoleDeniedError.prototype);
  }
}

// =============================================================================
// DECORATORS / GUARDS
// =============================================================================

/**
 * Check permission for current user.
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  const context = getTenantContext();
  if (!context.userId) return false;
  return RBAC.hasPermission(context.userId, permission);
}

/**
 * Assert permission for current user.
 */
export async function requirePermission(permission: Permission): Promise<void> {
  const context = getTenantContext();
  if (!context.userId) {
    throw new PermissionDeniedError(permission, 'anonymous');
  }
  await RBAC.assertPermission(context.userId, permission);
}

/**
 * Assert role for current user.
 */
export async function requireRole(role: Role): Promise<void> {
  const context = getTenantContext();
  if (!context.userId) {
    throw new RoleDeniedError(role, 'anonymous');
  }
  await RBAC.assertRole(context.userId, role);
}
