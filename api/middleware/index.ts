/**
 * API Middleware
 * 
 * Express middleware for the UltraWealth Platform API.
 */

export {
  tenantMiddleware,
  optionalTenantMiddleware,
  validateTenantMiddleware,
  type TenantRequest,
} from './tenant-middleware';

export {
  governanceMiddleware,
  strictGovernanceMiddleware,
  reportGovernanceMiddleware,
  type GovernanceMiddlewareOptions,
} from './governance-middleware';
