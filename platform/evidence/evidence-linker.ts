/**
 * Evidence Linker
 * 
 * Links evidence artefacts (documents, statements, valuations) to events.
 * Ensures every material fact has supporting evidence.
 * 
 * GUARANTEES:
 * - Evidence is immutable once linked
 * - Evidence is tenant-isolated
 * - Evidence can be retrieved for any event
 * - Evidence integrity is verifiable
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

export type EvidenceType =
  | 'document'
  | 'statement'
  | 'valuation'
  | 'screenshot'
  | 'api_response'
  | 'manual_entry'
  | 'external_report';

export interface Evidence {
  /** Unique evidence ID */
  readonly id: string;
  
  /** Evidence type */
  readonly type: EvidenceType;
  
  /** Tenant ID (for isolation) */
  readonly tenantId: string;
  
  /** Partition key (for storage isolation) */
  readonly partitionKey: string;
  
  /** Human-readable description */
  readonly description: string;
  
  /** Source of the evidence */
  readonly source: string;
  
  /** MIME type of the content */
  readonly mimeType: string;
  
  /** Size in bytes */
  readonly sizeBytes: number;
  
  /** SHA256 hash of the content */
  readonly contentHash: string;
  
  /** Storage location (S3 key, file path, etc.) */
  readonly storageLocation: string;
  
  /** Timestamp when evidence was captured */
  readonly capturedAt: Date;
  
  /** Timestamp when evidence was linked */
  readonly linkedAt: Date;
  
  /** User who linked the evidence */
  readonly linkedBy?: string;
  
  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
  
  /** Events this evidence is linked to */
  readonly linkedEvents: readonly string[];
}

export interface EvidenceCreateRequest {
  type: EvidenceType;
  description: string;
  source: string;
  mimeType: string;
  content: Buffer | string;
  capturedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface EvidenceLinkRequest {
  evidenceId: string;
  eventId: string;
}

// =============================================================================
// EVIDENCE LINKER IMPLEMENTATION
// =============================================================================

/**
 * In-memory evidence linker implementation.
 * 
 * PRODUCTION NOTE: Replace with persistent storage (S3 + PostgreSQL, etc.)
 * This implementation maintains the correct interface and guarantees.
 */
class EvidenceLinkerImpl {
  private readonly evidence: Map<string, Evidence> = new Map();
  private readonly contentStore: Map<string, Buffer> = new Map();
  private readonly eventToEvidence: Map<string, Set<string>> = new Map();
  
  /**
   * Create and store evidence.
   * 
   * @param request - Evidence creation request
   * @returns The created evidence record
   */
  async create(request: EvidenceCreateRequest): Promise<Evidence> {
    const context = getTenantContext();
    const tenantId = context.tenant.id;
    const partitionKey = context.tenant.partitionKey;
    
    // Convert content to buffer
    const contentBuffer = typeof request.content === 'string'
      ? Buffer.from(request.content, 'utf-8')
      : request.content;
    
    // Calculate content hash
    const contentHash = createHash('sha256')
      .update(contentBuffer)
      .digest('hex');
    
    // Generate storage location
    const id = randomUUID();
    const storageLocation = `${partitionKey}/evidence/${id}`;
    
    const evidence: Evidence = Object.freeze({
      id,
      type: request.type,
      tenantId,
      partitionKey,
      description: request.description,
      source: request.source,
      mimeType: request.mimeType,
      sizeBytes: contentBuffer.length,
      contentHash,
      storageLocation,
      capturedAt: request.capturedAt ?? new Date(),
      linkedAt: new Date(),
      linkedBy: context.userId,
      metadata: request.metadata ? Object.freeze({ ...request.metadata }) : undefined,
      linkedEvents: Object.freeze([]),
    });
    
    // Store evidence record and content
    const tenantKey = this.getTenantKey(partitionKey);
    this.evidence.set(`${tenantKey}:${id}`, evidence);
    this.contentStore.set(storageLocation, contentBuffer);
    
    return evidence;
  }
  
  /**
   * Link evidence to an event.
   * 
   * @param request - Link request
   * @returns Updated evidence record
   */
  async linkToEvent(request: EvidenceLinkRequest): Promise<Evidence> {
    const partitionKey = getCurrentPartitionKey();
    QueryGuard.validatePartitionKey(partitionKey);
    
    const tenantKey = this.getTenantKey(partitionKey);
    const evidenceKey = `${tenantKey}:${request.evidenceId}`;
    
    const existing = this.evidence.get(evidenceKey);
    if (!existing) {
      throw new Error(`Evidence ${request.evidenceId} not found`);
    }
    
    // Create updated evidence with new link
    const updated: Evidence = Object.freeze({
      ...existing,
      linkedEvents: Object.freeze([...existing.linkedEvents, request.eventId]),
    });
    
    this.evidence.set(evidenceKey, updated);
    
    // Update reverse index
    if (!this.eventToEvidence.has(request.eventId)) {
      this.eventToEvidence.set(request.eventId, new Set());
    }
    this.eventToEvidence.get(request.eventId)!.add(request.evidenceId);
    
    return updated;
  }
  
  /**
   * Get evidence by ID.
   * 
   * @param evidenceId - Evidence ID
   * @returns Evidence record or undefined
   */
  async getById(evidenceId: string): Promise<Evidence | undefined> {
    const partitionKey = getCurrentPartitionKey();
    QueryGuard.validatePartitionKey(partitionKey);
    
    const tenantKey = this.getTenantKey(partitionKey);
    return this.evidence.get(`${tenantKey}:${evidenceId}`);
  }
  
  /**
   * Get evidence content.
   * 
   * @param evidenceId - Evidence ID
   * @returns Evidence content buffer or undefined
   */
  async getContent(evidenceId: string): Promise<Buffer | undefined> {
    const evidence = await this.getById(evidenceId);
    if (!evidence) return undefined;
    
    return this.contentStore.get(evidence.storageLocation);
  }
  
  /**
   * Get all evidence linked to an event.
   * 
   * @param eventId - Event ID
   * @returns Array of evidence records
   */
  async getForEvent(eventId: string): Promise<readonly Evidence[]> {
    const partitionKey = getCurrentPartitionKey();
    QueryGuard.validatePartitionKey(partitionKey);
    
    const evidenceIds = this.eventToEvidence.get(eventId);
    if (!evidenceIds || evidenceIds.size === 0) {
      return [];
    }
    
    const results: Evidence[] = [];
    for (const id of evidenceIds) {
      const evidence = await this.getById(id);
      if (evidence) {
        results.push(evidence);
      }
    }
    
    return Object.freeze(results);
  }
  
  /**
   * Verify evidence integrity.
   * 
   * @param evidenceId - Evidence ID
   * @returns Verification result
   */
  async verifyIntegrity(evidenceId: string): Promise<{
    valid: boolean;
    expectedHash: string;
    actualHash: string;
  }> {
    const evidence = await this.getById(evidenceId);
    if (!evidence) {
      throw new Error(`Evidence ${evidenceId} not found`);
    }
    
    const content = await this.getContent(evidenceId);
    if (!content) {
      throw new Error(`Evidence content not found for ${evidenceId}`);
    }
    
    const actualHash = createHash('sha256').update(content).digest('hex');
    
    return {
      valid: actualHash === evidence.contentHash,
      expectedHash: evidence.contentHash,
      actualHash,
    };
  }
  
  /**
   * List all evidence for the current tenant.
   * 
   * @param options - Query options
   * @returns Array of evidence records
   */
  async list(options: {
    type?: EvidenceType;
    source?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  } = {}): Promise<readonly Evidence[]> {
    const partitionKey = getCurrentPartitionKey();
    QueryGuard.validatePartitionKey(partitionKey);
    
    const tenantKey = this.getTenantKey(partitionKey);
    const prefix = `${tenantKey}:`;
    
    const results: Evidence[] = [];
    
    for (const [key, evidence] of this.evidence) {
      if (!key.startsWith(prefix)) continue;
      
      if (options.type && evidence.type !== options.type) continue;
      if (options.source && evidence.source !== options.source) continue;
      if (options.fromDate && evidence.capturedAt < options.fromDate) continue;
      if (options.toDate && evidence.capturedAt > options.toDate) continue;
      
      results.push(evidence);
      
      if (options.limit && results.length >= options.limit) break;
    }
    
    return Object.freeze(results);
  }
  
  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------
  
  private getTenantKey(partitionKey: string): string {
    return `evidence:${partitionKey}`;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const EvidenceLinker = new EvidenceLinkerImpl();

// =============================================================================
// EVIDENCE HELPERS
// =============================================================================

/**
 * Create evidence from an API response.
 */
export async function createApiResponseEvidence(
  source: string,
  response: unknown,
  description: string
): Promise<Evidence> {
  return EvidenceLinker.create({
    type: 'api_response',
    description,
    source,
    mimeType: 'application/json',
    content: JSON.stringify(response, null, 2),
    capturedAt: new Date(),
  });
}

/**
 * Create evidence from a document.
 */
export async function createDocumentEvidence(
  source: string,
  content: Buffer,
  mimeType: string,
  description: string
): Promise<Evidence> {
  return EvidenceLinker.create({
    type: 'document',
    description,
    source,
    mimeType,
    content,
    capturedAt: new Date(),
  });
}

/**
 * Create evidence from manual entry.
 */
export async function createManualEntryEvidence(
  description: string,
  entryData: Record<string, unknown>
): Promise<Evidence> {
  return EvidenceLinker.create({
    type: 'manual_entry',
    description,
    source: 'manual',
    mimeType: 'application/json',
    content: JSON.stringify(entryData, null, 2),
    capturedAt: new Date(),
  });
}
