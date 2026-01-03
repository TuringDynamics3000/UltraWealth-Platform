/**
 * Replay Engine
 * 
 * Replays events to reconstruct state at any point in time.
 * Enables auditing, debugging, and point-in-time reporting.
 * 
 * GUARANTEES:
 * - Replay is deterministic
 * - Replay respects tenant isolation
 * - Replay can be verified against stored snapshots
 */

import { DomainEvent, EventStore, EventQuery } from './event-store';
import { Evidence, EvidenceLinker } from './evidence-linker';
import {
  getCurrentTenantId,
  getCurrentPartitionKey,
  getTenantContext,
} from '../tenancy';

// =============================================================================
// TYPES
// =============================================================================

export interface ReplayOptions {
  /** Replay up to this point in time */
  asOf?: Date;
  
  /** Replay up to this event ID (exclusive) */
  upToEventId?: string;
  
  /** Replay only events of these types */
  eventTypes?: string[];
  
  /** Replay only events for this aggregate */
  aggregateId?: string;
  
  /** Replay only events for this aggregate type */
  aggregateType?: string;
  
  /** Include evidence in replay result */
  includeEvidence?: boolean;
}

export interface ReplayResult<TState> {
  /** Reconstructed state */
  readonly state: TState;
  
  /** Events that were replayed */
  readonly events: readonly DomainEvent[];
  
  /** Evidence linked to replayed events */
  readonly evidence: readonly Evidence[];
  
  /** Timestamp of the last event */
  readonly asOf: Date | null;
  
  /** Number of events replayed */
  readonly eventCount: number;
  
  /** Replay duration in milliseconds */
  readonly durationMs: number;
}

export interface AggregateReplayResult<TState> {
  /** Aggregate ID */
  readonly aggregateId: string;
  
  /** Aggregate type */
  readonly aggregateType: string;
  
  /** Current version (sequence number) */
  readonly version: number;
  
  /** Reconstructed state */
  readonly state: TState;
  
  /** Events that were replayed */
  readonly events: readonly DomainEvent[];
}

/**
 * Event handler function type.
 * Takes current state and event, returns new state.
 */
export type EventHandler<TState, TEvent = unknown> = (
  state: TState,
  event: DomainEvent<TEvent>
) => TState;

/**
 * Event handler registry.
 * Maps event types to handler functions.
 */
export type EventHandlerRegistry<TState> = {
  [eventType: string]: EventHandler<TState, unknown>;
};

// =============================================================================
// REPLAY ENGINE IMPLEMENTATION
// =============================================================================

export class ReplayEngine<TState> {
  private readonly handlers: EventHandlerRegistry<TState>;
  private readonly initialState: TState;
  
  constructor(
    initialState: TState,
    handlers: EventHandlerRegistry<TState>
  ) {
    this.initialState = initialState;
    this.handlers = handlers;
  }
  
  /**
   * Replay events and reconstruct state.
   * 
   * @param options - Replay options
   * @returns Replay result with reconstructed state
   */
  async replay(options: ReplayOptions = {}): Promise<ReplayResult<TState>> {
    const startTime = Date.now();
    
    // Build query from options
    const query: EventQuery = {
      aggregateId: options.aggregateId,
      aggregateType: options.aggregateType,
      toTime: options.asOf,
    };
    
    // Fetch events
    const eventPage = await EventStore.query(query);
    let events = [...eventPage.events];
    
    // Filter by event types if specified
    if (options.eventTypes && options.eventTypes.length > 0) {
      events = events.filter(e => options.eventTypes!.includes(e.type));
    }
    
    // Filter up to event ID if specified
    if (options.upToEventId) {
      const index = events.findIndex(e => e.id === options.upToEventId);
      if (index >= 0) {
        events = events.slice(0, index);
      }
    }
    
    // Replay events
    let state = this.deepClone(this.initialState);
    
    for (const event of events) {
      const handler = this.handlers[event.type];
      if (handler) {
        state = handler(state, event);
      }
    }
    
    // Fetch evidence if requested
    let evidence: Evidence[] = [];
    if (options.includeEvidence) {
      for (const event of events) {
        const eventEvidence = await EvidenceLinker.getForEvent(event.id);
        evidence.push(...eventEvidence);
      }
    }
    
    const durationMs = Date.now() - startTime;
    
    return Object.freeze({
      state,
      events: Object.freeze(events),
      evidence: Object.freeze(evidence),
      asOf: events.length > 0 ? events[events.length - 1].occurredAt : null,
      eventCount: events.length,
      durationMs,
    });
  }
  
  /**
   * Replay events for a specific aggregate.
   * 
   * @param aggregateType - Aggregate type
   * @param aggregateId - Aggregate ID
   * @param asOf - Optional point in time
   * @returns Aggregate replay result
   */
  async replayAggregate(
    aggregateType: string,
    aggregateId: string,
    asOf?: Date
  ): Promise<AggregateReplayResult<TState>> {
    const events = await EventStore.getAggregateEvents(aggregateType, aggregateId);
    
    // Filter by time if specified
    const filteredEvents = asOf
      ? events.filter(e => e.occurredAt <= asOf)
      : events;
    
    // Replay events
    let state = this.deepClone(this.initialState);
    
    for (const event of filteredEvents) {
      const handler = this.handlers[event.type];
      if (handler) {
        state = handler(state, event);
      }
    }
    
    const lastEvent = filteredEvents[filteredEvents.length - 1];
    
    return Object.freeze({
      aggregateId,
      aggregateType,
      version: lastEvent?.sequence ?? 0,
      state,
      events: Object.freeze([...filteredEvents]),
    });
  }
  
  /**
   * Get state at a specific point in time.
   * 
   * @param asOf - Point in time
   * @returns State at that time
   */
  async getStateAsOf(asOf: Date): Promise<TState> {
    const result = await this.replay({ asOf });
    return result.state;
  }
  
  /**
   * Compare state at two points in time.
   * 
   * @param from - Start time
   * @param to - End time
   * @returns Comparison result
   */
  async compareStates(from: Date, to: Date): Promise<{
    fromState: TState;
    toState: TState;
    eventsBetween: readonly DomainEvent[];
  }> {
    const [fromResult, toResult] = await Promise.all([
      this.replay({ asOf: from }),
      this.replay({ asOf: to }),
    ]);
    
    // Get events between the two times
    const eventPage = await EventStore.query({
      fromTime: from,
      toTime: to,
    });
    
    return {
      fromState: fromResult.state,
      toState: toResult.state,
      eventsBetween: eventPage.events,
    };
  }
  
  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------
  
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a replay engine for a specific aggregate type.
 */
export function createReplayEngine<TState>(
  initialState: TState,
  handlers: EventHandlerRegistry<TState>
): ReplayEngine<TState> {
  return new ReplayEngine(initialState, handlers);
}

// =============================================================================
// AUDIT REPLAY
// =============================================================================

/**
 * Audit-focused replay that captures all changes with evidence.
 */
export async function auditReplay(options: {
  aggregateType?: string;
  aggregateId?: string;
  fromDate: Date;
  toDate: Date;
}): Promise<{
  events: readonly DomainEvent[];
  evidence: readonly Evidence[];
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    evidenceCount: number;
    timeRange: { from: Date; to: Date };
  };
}> {
  const eventPage = await EventStore.query({
    aggregateType: options.aggregateType,
    aggregateId: options.aggregateId,
    fromTime: options.fromDate,
    toTime: options.toDate,
  });
  
  // Collect evidence for all events
  const evidence: Evidence[] = [];
  const eventsByType: Record<string, number> = {};
  
  for (const event of eventPage.events) {
    // Count by type
    eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;
    
    // Get evidence
    const eventEvidence = await EvidenceLinker.getForEvent(event.id);
    evidence.push(...eventEvidence);
  }
  
  return {
    events: eventPage.events,
    evidence: Object.freeze(evidence),
    summary: {
      totalEvents: eventPage.events.length,
      eventsByType,
      evidenceCount: evidence.length,
      timeRange: { from: options.fromDate, to: options.toDate },
    },
  };
}

// =============================================================================
// POINT-IN-TIME SNAPSHOT
// =============================================================================

/**
 * Create a point-in-time snapshot for reporting.
 */
export async function createSnapshot<TState>(
  engine: ReplayEngine<TState>,
  asOf: Date,
  description: string
): Promise<{
  snapshot: TState;
  metadata: {
    asOf: Date;
    description: string;
    eventCount: number;
    createdAt: Date;
    tenantId: string;
  };
}> {
  const context = getTenantContext();
  const result = await engine.replay({ asOf });
  
  return {
    snapshot: result.state,
    metadata: {
      asOf,
      description,
      eventCount: result.eventCount,
      createdAt: new Date(),
      tenantId: context.tenant.id,
    },
  };
}
