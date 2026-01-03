/**
 * Entity Routes
 * 
 * API routes for entity management (trusts, companies, individuals).
 * All routes require tenant context.
 */

import { Router, Request, Response } from 'express';
import { requirePermission } from '../../platform/security';
import { EventStore, EventTypes } from '../../platform/evidence';
import { getTenantContext, getCurrentTenantId } from '../../platform/tenancy';

// =============================================================================
// ROUTER
// =============================================================================

export const entityRouter = Router();

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /entities
 * List all entities for the current tenant.
 */
entityRouter.get('/', async (req: Request, res: Response) => {
  try {
    await requirePermission('entity:read');
    
    // In production, this would query the database
    // For now, replay events to get current state
    const events = await EventStore.query({
      aggregateType: 'Entity',
    });
    
    // Build entity list from events
    const entities = buildEntitiesFromEvents(events.events);
    
    res.json({
      data: entities,
      meta: {
        count: entities.length,
        tenantId: getCurrentTenantId(),
      },
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * GET /entities/:id
 * Get a specific entity.
 */
entityRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    await requirePermission('entity:read');
    
    const { id } = req.params;
    
    const events = await EventStore.getAggregateEvents('Entity', id);
    
    if (events.length === 0) {
      return res.status(404).json({
        error: 'ENTITY_NOT_FOUND',
        message: `Entity ${id} not found`,
      });
    }
    
    const entity = buildEntityFromEvents(id, events);
    
    res.json({ data: entity });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * POST /entities
 * Create a new entity.
 */
entityRouter.post('/', async (req: Request, res: Response) => {
  try {
    await requirePermission('entity:create');
    
    const { type, name, jurisdiction, metadata } = req.body;
    
    // Validate required fields
    if (!type || !name) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'type and name are required',
      });
    }
    
    // Generate entity ID
    const entityId = generateEntityId();
    
    // Record creation event
    const event = await EventStore.append(
      EventTypes.ENTITY_CREATED,
      entityId,
      'Entity',
      {
        type,
        name,
        jurisdiction,
        metadata,
        tenantId: getCurrentTenantId(),
      }
    );
    
    res.status(201).json({
      data: {
        id: entityId,
        type,
        name,
        jurisdiction,
        metadata,
        createdAt: event.occurredAt,
      },
      meta: {
        eventId: event.id,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * PATCH /entities/:id
 * Update an entity.
 */
entityRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    await requirePermission('entity:update');
    
    const { id } = req.params;
    const updates = req.body;
    
    // Verify entity exists
    const events = await EventStore.getAggregateEvents('Entity', id);
    if (events.length === 0) {
      return res.status(404).json({
        error: 'ENTITY_NOT_FOUND',
        message: `Entity ${id} not found`,
      });
    }
    
    // Record update event
    const event = await EventStore.append(
      EventTypes.ENTITY_UPDATED,
      id,
      'Entity',
      {
        updates,
        tenantId: getCurrentTenantId(),
      }
    );
    
    // Get updated entity
    const allEvents = await EventStore.getAggregateEvents('Entity', id);
    const entity = buildEntityFromEvents(id, allEvents);
    
    res.json({
      data: entity,
      meta: {
        eventId: event.id,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * DELETE /entities/:id
 * Archive an entity (soft delete).
 */
entityRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await requirePermission('entity:archive');
    
    const { id } = req.params;
    
    // Verify entity exists
    const events = await EventStore.getAggregateEvents('Entity', id);
    if (events.length === 0) {
      return res.status(404).json({
        error: 'ENTITY_NOT_FOUND',
        message: `Entity ${id} not found`,
      });
    }
    
    // Record archive event
    const event = await EventStore.append(
      EventTypes.ENTITY_ARCHIVED,
      id,
      'Entity',
      {
        archivedAt: new Date().toISOString(),
        tenantId: getCurrentTenantId(),
      }
    );
    
    res.json({
      data: { id, archived: true },
      meta: {
        eventId: event.id,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
});

// =============================================================================
// HELPERS
// =============================================================================

function generateEntityId(): string {
  return `ent_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

function buildEntitiesFromEvents(events: readonly any[]): any[] {
  const entitiesMap = new Map<string, any>();
  
  for (const event of events) {
    const id = event.aggregateId;
    
    if (event.type === EventTypes.ENTITY_CREATED) {
      entitiesMap.set(id, {
        id,
        ...event.payload,
        createdAt: event.occurredAt,
        updatedAt: event.occurredAt,
        archived: false,
      });
    } else if (event.type === EventTypes.ENTITY_UPDATED) {
      const existing = entitiesMap.get(id);
      if (existing) {
        entitiesMap.set(id, {
          ...existing,
          ...event.payload.updates,
          updatedAt: event.occurredAt,
        });
      }
    } else if (event.type === EventTypes.ENTITY_ARCHIVED) {
      const existing = entitiesMap.get(id);
      if (existing) {
        entitiesMap.set(id, {
          ...existing,
          archived: true,
          archivedAt: event.occurredAt,
        });
      }
    }
  }
  
  // Filter out archived entities by default
  return Array.from(entitiesMap.values()).filter(e => !e.archived);
}

function buildEntityFromEvents(id: string, events: readonly any[]): any {
  let entity: any = null;
  
  for (const event of events) {
    if (event.type === EventTypes.ENTITY_CREATED) {
      entity = {
        id,
        ...event.payload,
        createdAt: event.occurredAt,
        updatedAt: event.occurredAt,
        archived: false,
      };
    } else if (event.type === EventTypes.ENTITY_UPDATED && entity) {
      entity = {
        ...entity,
        ...event.payload.updates,
        updatedAt: event.occurredAt,
      };
    } else if (event.type === EventTypes.ENTITY_ARCHIVED && entity) {
      entity = {
        ...entity,
        archived: true,
        archivedAt: event.occurredAt,
      };
    }
  }
  
  return entity;
}

function handleError(res: Response, error: unknown): void {
  console.error('Entity route error:', error);
  
  if (error instanceof Error) {
    if (error.name === 'PermissionDeniedError') {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: error.message,
      });
    }
  }
  
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}
