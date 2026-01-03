/**
 * API Server
 * 
 * Express server configuration for the UltraWealth Platform.
 * 
 * ARCHITECTURE:
 * - All requests pass through tenant middleware
 * - All requests pass through governance middleware
 * - Routes are tenant-isolated by design
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {
  tenantMiddleware,
  governanceMiddleware,
  optionalTenantMiddleware,
} from './middleware';
import { entityRouter } from './routes';
import { TenantRegistry } from '../platform/tenancy';

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================

export interface ServerConfig {
  port: number;
  corsOrigins?: string[];
  enableHelmet?: boolean;
}

const defaultConfig: ServerConfig = {
  port: 3000,
  corsOrigins: ['http://localhost:3000', 'http://localhost:5173'],
  enableHelmet: true,
};

// =============================================================================
// SERVER FACTORY
// =============================================================================

export function createServer(config: Partial<ServerConfig> = {}): Express {
  const finalConfig = { ...defaultConfig, ...config };
  const app = express();
  
  // ---------------------------------------------------------------------------
  // GLOBAL MIDDLEWARE
  // ---------------------------------------------------------------------------
  
  // Security headers
  if (finalConfig.enableHelmet) {
    app.use(helmet());
  }
  
  // CORS
  app.use(cors({
    origin: finalConfig.corsOrigins,
    credentials: true,
  }));
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  });
  
  // ---------------------------------------------------------------------------
  // HEALTH ENDPOINTS (no tenant context required)
  // ---------------------------------------------------------------------------
  
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
  
  app.get('/ready', (req: Request, res: Response) => {
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  });
  
  // ---------------------------------------------------------------------------
  // ADMIN ENDPOINTS (optional tenant context)
  // ---------------------------------------------------------------------------
  
  app.use('/admin', optionalTenantMiddleware());
  
  // Tenant provisioning (platform admin only)
  app.post('/admin/tenants', async (req: Request, res: Response) => {
    try {
      const { name, profile, metadata } = req.body;
      
      if (!name || !profile) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'name and profile are required',
        });
      }
      
      const tenant = await TenantRegistry.provision({ name, profile, metadata });
      
      // Activate tenant immediately for demo purposes
      await TenantRegistry.updateStatus(tenant.id, 'onboarding');
      await TenantRegistry.updateStatus(tenant.id, 'active');
      
      res.status(201).json({
        data: tenant,
      });
    } catch (error) {
      console.error('Tenant provisioning error:', error);
      res.status(500).json({
        error: 'PROVISIONING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  // List tenants (platform admin only)
  app.get('/admin/tenants', async (req: Request, res: Response) => {
    try {
      const tenants = await TenantRegistry.listAll();
      res.json({ data: tenants });
    } catch (error) {
      console.error('List tenants error:', error);
      res.status(500).json({
        error: 'LIST_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  // ---------------------------------------------------------------------------
  // TENANT-SCOPED API ROUTES
  // ---------------------------------------------------------------------------
  
  // Apply tenant middleware to all /api routes
  app.use('/api', tenantMiddleware());
  
  // Apply governance middleware to all /api routes
  app.use('/api', governanceMiddleware());
  
  // Mount route modules
  app.use('/api/entities', entityRouter);
  
  // Placeholder routes for other modules
  app.use('/api/external-assets', (req, res) => {
    res.json({ message: 'External assets API - coming soon' });
  });
  
  app.use('/api/valuations', (req, res) => {
    res.json({ message: 'Valuations API - coming soon' });
  });
  
  app.use('/api/reports', (req, res) => {
    res.json({ message: 'Reports API - coming soon' });
  });
  
  app.use('/api/views', (req, res) => {
    res.json({ message: 'Views API - coming soon' });
  });
  
  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------
  
  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    });
  });
  
  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });
  
  return app;
}

// =============================================================================
// SERVER STARTUP
// =============================================================================

export async function startServer(config: Partial<ServerConfig> = {}): Promise<void> {
  const finalConfig = { ...defaultConfig, ...config };
  const app = createServer(finalConfig);
  
  app.listen(finalConfig.port, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   UltraWealth Platform                       ║
║                                                              ║
║  API Server running on port ${finalConfig.port.toString().padEnd(30)}║
║                                                              ║
║  Endpoints:                                                  ║
║    GET  /health           - Health check                     ║
║    GET  /ready            - Readiness check                  ║
║    POST /admin/tenants    - Provision tenant                 ║
║    GET  /admin/tenants    - List tenants                     ║
║    *    /api/*            - Tenant-scoped API                ║
║                                                              ║
║  Tenant Context Required:                                    ║
║    Header: X-Tenant-ID                                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
}

// =============================================================================
// MAIN
// =============================================================================

if (require.main === module) {
  startServer().catch(console.error);
}
