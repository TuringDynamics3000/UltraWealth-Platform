/**
 * Event Store
 * 
 * Immutable, append-only event store for all material facts.
 * Every change in the system is recorded as an event.
 * 
 * GUARANTEES:
 * - Events are immutable once written
 * - Events are tenant-isolated
 * - Events can be replayed to reconstruct state
 * - Events reference evidence artefacts
 */

import { createHash, randomUUID } from 'crypto';
import { 
  getCurrentTenantId, 
  getCurrentPartitionKey,
  getTenantContext,
  QueryGuard,
} from '../tenancy';

// =============================================================================
// TYPES
// =============================================================================

export interface DomainEvent<T = unknown> {
  /** Unique event ID */
  readonly id: string;
  
  /** Event type (e.g., 'entity.created', 'valuation.recorded') */
  readonly type: string;
  
  /** Event version for schema evolution */
  readonly version: number;
  
  /** Tenant ID (for isolation) */
  readonly tenantId: string;
  
  /** Partition key (for storage isolation) */
  readonly partitionKey: string;
  
  /** Aggregate ID this event belongs to */
  readonly aggregateId: string;
  
  /** Aggregate type (e.g., 'Entity', 'ExternalAsset') */
  readonly aggregateType: string;
  
  /** Sequence number within the aggregate */
  readonly sequence: number;
  
  /** Event payload */
  readonly payload: T;
  
  /** Evidence references */
  readonly evidenceRefs: readonly string[];
  
  /** Event metadata */
  readonly metadata: EventMetadata;
  
  /** Timestamp when event occurred */
  readonly occurredAt: Date;
  
  /** Timestamp when event was recorded */
  readonly recordedAt: Date;
  
  /** Hash of the event for integrity verification */
  readonly hash: string;
  
  /** Hash of the previous event (chain integrity) */
  readonly previousHash: string | null;
}

export interface EventMetadata {
  /** Correlation ID for request tracing */
  readonly correlationId: string;
  
  /** Causation ID (ID of event that caused this one) */
  readonly causationId?: string;
  
  /** User ID who triggered the event */
  readonly userId?: string;
  
  /** Source system or component */
  readonly source: string;
  
  /** Additional metadata */
  readonly extra?: Record<string, unknown>;
}

export interface EventQuery {
  /** Filter by aggregate ID */
  aggregateId?: string;
  
  /** Filter by aggregate type */
  aggregateType?: string;
  
  /** Filter by event type */
  eventType?: string;
  
  /** Filter by time range (start) */
  fromTime?: Date;
  
  /** Filter by time range (end) */
  toTime?: Date;
  
  /** Filter by sequence (start) */
  fromSequence?: number;
  
  /** Maximum number of events to return */
  limit?: number;
  
  /** Cursor for pagination */
  cursor?: string;
}

export interface EventPage {
  readonly events: readonly DomainEvent[];
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}

// =============================================================================
// EVENT STORE IMPLEMENTATION
// =============================================================================

/**
 * In-memory event store implementation.
 * 
 * PRODUCTION NOTE: Replace with persistent storage (EventStoreDB, PostgreSQL, etc.)
 * This implementation maintains the correct interface and guarantees.
 */
class EventStoreImpl {
  private readonly events: Map<string, DomainEvent[]> = new Map();
  private readonly aggregateSequences: Map<string, number> = new Map();
  private readonly lastHashes: Map<string, string> = new Map();
  
  /**
   * Append an event to the store.
   * 
   * @param type - Event type
   * @param aggregateId - Aggregate ID
   * @param aggregateType - Aggregate type
   * @param payload - Event payload
   * @param evidenceRefs - References to evidence artefacts
   * @param metadata - Additional metadata
   * @returns The created event
   */
  async append<T>(
    type: string,
    aggregateId: string,
    aggregateType: string,
    payload: T,
    evidenceRefs: string[] = [],
    metadata?: Partial<EventMetadata>
  ): Promise<DomainEvent<T>> {
    const context = getTenantContext();
    const tenantId = context.tenant.id;
    const partitionKey = context.tenant.partitionKey;
    
    // Get or create tenant event list
    const tenantKey = this.getTenantKey(partitionKey);
    if (!this.events.has(tenantKey)) {
      this.events.set(tenantKey, []);
    }
    
    // Get next sequence number for aggregate
    const aggregateKey = `${partitionKey}:${aggregateType}:${aggregateId}`;
    const sequence = (this.aggregateSequences.get(aggregateKey) ?? 0) + 1;
    this.aggregateSequences.set(aggregateKey, sequence);
    
    // Get previous hash for chain integrity
    const previousHash = this.lastHashes.get(tenantKey) ?? null;
    
    const occurredAt = new Date();
    const recordedAt = new Date();
    
    // Create event (without hash first)
    const eventData = {
      id: randomUUID(),
      type,
      version: 1,
      tenantId,
      partitionKey,
      aggregateId,
      aggregateType,
      sequence,
      payload,
      evidenceRefs: Object.freeze([...evidenceRefs]),
      metadata: Object.freeze({
        correlationId: context.correlationId,
        userId: context.userId,
        source: 'ultrawealth-platform',
        ...metadata,
      }),
      occurredAt,
      recordedAt,
      previousHash,
    };
    
    // Calculate hash
    const hash = this.calculateHash(eventData);
    
    const event: DomainEvent<T> = Object.freeze({
      ...eventData,
      hash,
    });
    
    // Store event
    this.events.get(tenantKey)!.push(event as DomainEvent);
    this.lastHashes.set(tenantKey, hash);
    
    return event;
  }
  
  /**
   * Query events from the store.
   * 
   * @param query - Query parameters
   * @returns Page of events matching the query
   */
  async query(query: EventQuery = {}): Promise<EventPage> {
    const partitionKey = getCurrentPartitionKey();
    QueryGuard.validatePartitionKey(partitionKey);
    
    const tenantKey = this.getTenantKey(partitionKey);
    const allEvents = this.events.get(tenantKey) ?? [];
    
    // Apply filters
    let filtered = allEvents.filter(event => {
      if (query.aggregateId && event.aggregateId !== query.aggregateId) {
        return false;
      }
      if (query.aggregateType && event.aggregateType !== query.aggregateType) {
        return false;
      }
      if (query.eventType && event.type !== query.eventType) {
        return false;
      }
      if (query.fromTime && event.occurredAt < query.fromTime) {
        return false;
      }
      if (query.toTime && event.occurredAt > query.toTime) {
        return false;
      }
      if (query.fromSequence && event.sequence < query.fromSequence) {
        return false;
      }
      return true;
    });
    
    // Apply cursor
    if (query.cursor) {
      const cursorIndex = filtered.findIndex(e => e.id === query.cursor);
      if (cursorIndex >= 0) {
        filtered = filtered.slice(cursorIndex + 1);
      }
    }
    
    // Apply limit
    const limit = query.limit ?? 100;
    const hasMore = filtered.length > limit;
    const events = filtered.slice(0, limit);
    
    return {
      events: Object.freeze(events),
      nextCursor: hasMore ? events[events.length - 1]?.id : undefined,
      hasMore,
    };
  }
  
  /**
   * Get all events for an aggregate.
   * 
   * @param aggregateType - Aggregate type
   * @param aggregateId - Aggregate ID
   * @returns All events for the aggregate in order
   */
  async getAggregateEvents(
    aggregateType: string,
    aggregateId: string
  ): Promise<readonly DomainEvent[]> {
    const result = await this.query({ aggregateType, aggregateId });
    return result.events;
  }
  
  /**
   * Get a specific event by ID.
   * 
   * @param eventId - Event ID
   * @returns The event or undefined
   */
  async getById(eventId: string): Promise<DomainEvent | undefined> {
    const partitionKey = getCurrentPartitionKey();
    const tenantKey = this.getTenantKey(partitionKey);
    const events = this.events.get(tenantKey) ?? [];
    
    return events.find(e => e.id === eventId);
  }
  
  /**
   * Verify the integrity of the event chain.
   * 
   * @returns True if chain is valid
   */
  async verifyChainIntegrity(): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const partitionKey = getCurrentPartitionKey();
    const tenantKey = this.getTenantKey(partitionKey);
    const events = this.events.get(tenantKey) ?? [];
    
    const errors: string[] = [];
    let previousHash: string | null = null;
    
    for (const event of events) {
      // Verify previous hash link
      if (event.previousHash !== previousHash) {
        errors.push(`Event ${event.id}: previous hash mismatch`);
      }
      
      // Verify event hash
      const expectedHash = this.calculateHash({
        id: event.id,
        type: event.type,
        version: event.version,
        tenantId: event.tenantId,
        partitionKey: event.partitionKey,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        sequence: event.sequence,
        payload: event.payload,
        evidenceRefs: event.evidenceRefs,
        metadata: event.metadata,
        occurredAt: event.occurredAt,
        recordedAt: event.recordedAt,
        previousHash: event.previousHash,
      });
      
      if (event.hash !== expectedHash) {
        errors.push(`Event ${event.id}: hash mismatch`);
      }
      
      previousHash = event.hash;
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------
  
  private getTenantKey(partitionKey: string): string {
    return `events:${partitionKey}`;
  }
  
  private calculateHash(eventData: Omit<DomainEvent, 'hash'>): string {
    const content = JSON.stringify(eventData, (_, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
    
    return createHash('sha256').update(content).digest('hex');
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const EventStore = new EventStoreImpl();

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Standard event type prefixes for the platform.
 */
export const EventTypes = {
  // Entity events
  ENTITY_CREATED: 'entity.created',
  ENTITY_UPDATED: 'entity.updated',
  ENTITY_ARCHIVED: 'entity.archived',
  
  // Relationship events
  RELATIONSHIP_CREATED: 'relationship.created',
  RELATIONSHIP_UPDATED: 'relationship.updated',
  RELATIONSHIP_REMOVED: 'relationship.removed',
  
  // External asset events
  EXTERNAL_ASSET_REGISTERED: 'external_asset.registered',
  EXTERNAL_ASSET_UPDATED: 'external_asset.updated',
  EXTERNAL_ASSET_ARCHIVED: 'external_asset.archived',
  
  // Valuation events
  VALUATION_RECORDED: 'valuation.recorded',
  VALUATION_CORRECTED: 'valuation.corrected',
  
  // Obligation events
  OBLIGATION_CREATED: 'obligation.created',
  OBLIGATION_UPDATED: 'obligation.updated',
  OBLIGATION_FULFILLED: 'obligation.fulfilled',
  
  // Report events
  REPORT_GENERATED: 'report.generated',
  REPORT_EXPORTED: 'report.exported',
} as const;
