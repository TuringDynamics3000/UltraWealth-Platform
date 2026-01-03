/**
 * Evidence Module
 * 
 * Event sourcing and evidence management for UltraWealth Platform.
 * 
 * USAGE:
 * 
 * 1. Record an event:
 *    const event = await EventStore.append(
 *      'entity.created',
 *      entityId,
 *      'Entity',
 *      payload,
 *      [evidenceId]
 *    );
 * 
 * 2. Create evidence:
 *    const evidence = await EvidenceLinker.create({
 *      type: 'document',
 *      description: 'Bank statement',
 *      source: 'ANZ',
 *      mimeType: 'application/pdf',
 *      content: pdfBuffer,
 *    });
 * 
 * 3. Replay events:
 *    const engine = createReplayEngine(initialState, handlers);
 *    const result = await engine.replay({ asOf: new Date('2024-01-01') });
 */

// Event Store
export {
  EventStore,
  EventTypes,
  type DomainEvent,
  type EventMetadata,
  type EventQuery,
  type EventPage,
} from './event-store';

// Evidence Linker
export {
  EvidenceLinker,
  createApiResponseEvidence,
  createDocumentEvidence,
  createManualEntryEvidence,
  type Evidence,
  type EvidenceType,
  type EvidenceCreateRequest,
  type EvidenceLinkRequest,
} from './evidence-linker';

// Replay Engine
export {
  ReplayEngine,
  createReplayEngine,
  auditReplay,
  createSnapshot,
  type ReplayOptions,
  type ReplayResult,
  type AggregateReplayResult,
  type EventHandler,
  type EventHandlerRegistry,
} from './replay-engine';
