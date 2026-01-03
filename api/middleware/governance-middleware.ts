/**
 * Governance Middleware
 * 
 * Express middleware that enforces governance rules on API requests.
 * Scans request/response content for policy violations.
 * 
 * ENFORCEMENT:
 * - Blocks requests with forbidden content
 * - Blocks responses with advisory language
 * - Logs all violations to audit trail
 */

import { Request, Response, NextFunction } from 'express';
import {
  GovernanceAdapter,
  enforceApiRequest,
  GovernanceEnforcementError,
} from '../../platform/governance';
import { tryGetTenantContext } from '../../platform/tenancy';
import { logGovernanceViolation } from '../../platform/security';

// =============================================================================
// TYPES
// =============================================================================

export interface GovernanceMiddlewareOptions {
  /** Skip governance checks for these paths */
  skipPaths?: string[];
  
  /** Skip governance checks for these methods */
  skipMethods?: string[];
  
  /** Check response bodies */
  checkResponses?: boolean;
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Governance enforcement middleware.
 * Checks request bodies for policy violations.
 */
export function governanceMiddleware(options: GovernanceMiddlewareOptions = {}) {
  const {
    skipPaths = ['/health', '/metrics', '/ready'],
    skipMethods = ['GET', 'HEAD', 'OPTIONS'],
    checkResponses = true,
  } = options;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if no tenant context
    const context = tryGetTenantContext();
    if (!context) {
      return next();
    }
    
    // Skip for excluded paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // Skip for excluded methods (typically read-only)
    if (skipMethods.includes(req.method)) {
      return next();
    }
    
    // Check request body
    if (req.body) {
      try {
        await enforceApiRequest(req.body, `${req.method} ${req.path}`);
      } catch (error) {
        if (error instanceof GovernanceEnforcementError) {
          // Log violation
          for (const violation of error.violations) {
            await logGovernanceViolation(
              violation.type,
              violation.term,
              violation.context
            );
          }
          
          return res.status(422).json({
            error: 'GOVERNANCE_VIOLATION',
            message: 'Request contains forbidden content',
            violations: error.violations.map(v => ({
              type: v.type,
              term: v.term,
            })),
            correlationId: context.correlationId,
          });
        }
        throw error;
      }
    }
    
    // Optionally check response bodies
    if (checkResponses) {
      const originalJson = res.json.bind(res);
      
      res.json = function(body: unknown) {
        // Check response body for violations
        const adapter = GovernanceAdapter.forCurrentTenant();
        const bodyString = JSON.stringify(body);
        const violations = adapter.checkAdvisoryLanguage(bodyString);
        
        if (violations.length > 0) {
          // Log violations but don't block response
          // (blocking responses could break error handling)
          for (const violation of violations) {
            logGovernanceViolation(
              violation.type,
              violation.term,
              violation.context
            ).catch(console.error);
          }
          
          // Add warning header
          res.setHeader('X-Governance-Warning', 'Response contains flagged content');
        }
        
        return originalJson(body);
      };
    }
    
    next();
  };
}

/**
 * Strict governance middleware.
 * Blocks both requests AND responses with violations.
 * Use for high-security endpoints.
 */
export function strictGovernanceMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const context = tryGetTenantContext();
    if (!context) {
      return next();
    }
    
    // Check request body
    if (req.body) {
      try {
        await enforceApiRequest(req.body, `${req.method} ${req.path}`);
      } catch (error) {
        if (error instanceof GovernanceEnforcementError) {
          return res.status(422).json({
            error: 'GOVERNANCE_VIOLATION',
            message: 'Request contains forbidden content',
            violations: error.violations.map(v => ({
              type: v.type,
              term: v.term,
            })),
          });
        }
        throw error;
      }
    }
    
    // Override response methods to check output
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    
    res.json = function(body: unknown) {
      const adapter = GovernanceAdapter.forCurrentTenant();
      const bodyString = JSON.stringify(body);
      const violations = adapter.checkAdvisoryLanguage(bodyString);
      
      if (violations.length > 0) {
        return originalJson({
          error: 'GOVERNANCE_VIOLATION',
          message: 'Response would contain forbidden content',
          violations: violations.map(v => ({
            type: v.type,
            term: v.term,
          })),
        });
      }
      
      return originalJson(body);
    };
    
    res.send = function(body: unknown) {
      if (typeof body === 'string') {
        const adapter = GovernanceAdapter.forCurrentTenant();
        const violations = adapter.checkAdvisoryLanguage(body);
        
        if (violations.length > 0) {
          return originalSend(JSON.stringify({
            error: 'GOVERNANCE_VIOLATION',
            message: 'Response would contain forbidden content',
          }));
        }
      }
      
      return originalSend(body);
    };
    
    next();
  };
}

/**
 * Report-specific governance middleware.
 * Extra strict checking for report generation endpoints.
 */
export function reportGovernanceMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const context = tryGetTenantContext();
    if (!context) {
      return res.status(403).json({
        error: 'TENANT_CONTEXT_REQUIRED',
        message: 'Report generation requires tenant context',
      });
    }
    
    // Reports require FO-level governance
    const adapter = GovernanceAdapter.forCurrentTenant();
    
    if (adapter.isAdvisoryAllowed()) {
      // Even if advisory is allowed, warn for reports
      res.setHeader('X-Governance-Warning', 'Advisory content in reports requires labeling');
    }
    
    next();
  };
}
