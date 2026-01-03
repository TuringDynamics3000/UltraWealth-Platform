/**
 * Tenant Middleware
 * 
 * Express middleware that establishes tenant context for all requests.
 * Every API request MUST pass through this middleware.
 * 
 * SECURITY:
 * - Validates tenant ID from request
 * - Establishes immutable tenant context
 * - Rejects requests without valid tenant
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import {
  withTenantContext,
  TenantRegistry,
  TenantContextError,
} from '../../platform/tenancy';

// =============================================================================
// TYPES
// =============================================================================

export interface TenantRequest extends Request {
  tenantId?: string;
  correlationId?: string;
  userId?: string;
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Extract tenant ID from request.
 * Supports multiple sources: header, query param, path param.
 */
function extractTenantId(req: TenantRequest): string | undefined {
  // 1. Check X-Tenant-ID header (preferred)
  const headerTenantId = req.headers['x-tenant-id'];
  if (typeof headerTenantId === 'string') {
    return headerTenantId;
  }
  
  // 2. Check query parameter
  if (typeof req.query.tenantId === 'string') {
    return req.query.tenantId;
  }
  
  // 3. Check path parameter
  if (typeof req.params.tenantId === 'string') {
    return req.params.tenantId;
  }
  
  return undefined;
}

/**
 * Extract correlation ID from request.
 */
function extractCorrelationId(req: TenantRequest): string {
  const headerCorrelationId = req.headers['x-correlation-id'];
  if (typeof headerCorrelationId === 'string') {
    return headerCorrelationId;
  }
  return randomUUID();
}

/**
 * Extract user ID from request (after authentication).
 */
function extractUserId(req: TenantRequest): string | undefined {
  // User ID is typically set by authentication middleware
  return req.userId;
}

/**
 * Tenant context middleware.
 * Establishes tenant context for the request lifecycle.
 */
export function tenantMiddleware() {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    const tenantId = extractTenantId(req);
    const correlationId = extractCorrelationId(req);
    const userId = extractUserId(req);
    
    // Store correlation ID for response
    res.setHeader('X-Correlation-ID', correlationId);
    
    if (!tenantId) {
      return res.status(400).json({
        error: 'TENANT_REQUIRED',
        message: 'X-Tenant-ID header is required',
        correlationId,
      });
    }
    
    // Validate tenant exists
    const exists = await TenantRegistry.exists(tenantId);
    if (!exists) {
      return res.status(404).json({
        error: 'TENANT_NOT_FOUND',
        message: 'Tenant does not exist',
        correlationId,
      });
    }
    
    // Store on request for downstream access
    req.tenantId = tenantId;
    req.correlationId = correlationId;
    
    // Execute request within tenant context
    try {
      await withTenantContext(
        { tenantId, correlationId, userId },
        async () => {
          return new Promise<void>((resolve, reject) => {
            // Attach resolve/reject to response lifecycle
            res.on('finish', resolve);
            res.on('error', reject);
            next();
          });
        }
      );
    } catch (error) {
      if (error instanceof TenantContextError) {
        return res.status(403).json({
          error: error.code,
          message: error.message,
          correlationId,
        });
      }
      throw error;
    }
  };
}

/**
 * Optional tenant middleware.
 * Establishes tenant context if tenant ID is provided, otherwise continues.
 * Use for endpoints that can work with or without tenant context.
 */
export function optionalTenantMiddleware() {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    const tenantId = extractTenantId(req);
    const correlationId = extractCorrelationId(req);
    const userId = extractUserId(req);
    
    res.setHeader('X-Correlation-ID', correlationId);
    
    if (!tenantId) {
      req.correlationId = correlationId;
      return next();
    }
    
    // Validate tenant exists
    const exists = await TenantRegistry.exists(tenantId);
    if (!exists) {
      req.correlationId = correlationId;
      return next();
    }
    
    req.tenantId = tenantId;
    req.correlationId = correlationId;
    
    try {
      await withTenantContext(
        { tenantId, correlationId, userId },
        async () => {
          return new Promise<void>((resolve, reject) => {
            res.on('finish', resolve);
            res.on('error', reject);
            next();
          });
        }
      );
    } catch (error) {
      // On error, continue without tenant context
      next();
    }
  };
}

/**
 * Tenant validation middleware.
 * Validates tenant ID without establishing context.
 * Use for pre-flight checks.
 */
export function validateTenantMiddleware() {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    const tenantId = extractTenantId(req);
    
    if (!tenantId) {
      return res.status(400).json({
        error: 'TENANT_REQUIRED',
        message: 'X-Tenant-ID header is required',
      });
    }
    
    const tenant = await TenantRegistry.getById(tenantId);
    
    if (!tenant) {
      return res.status(404).json({
        error: 'TENANT_NOT_FOUND',
        message: 'Tenant does not exist',
      });
    }
    
    if (tenant.status !== 'active') {
      return res.status(403).json({
        error: 'TENANT_NOT_ACTIVE',
        message: `Tenant is ${tenant.status}`,
      });
    }
    
    req.tenantId = tenantId;
    next();
  };
}
