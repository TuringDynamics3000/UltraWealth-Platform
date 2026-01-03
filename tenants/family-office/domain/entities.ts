/**
 * Family Office Domain - Entities
 * 
 * Entity types for Family Office tenant.
 * Entities are the legal structures that hold assets.
 * 
 * TYPES:
 * - Trust (discretionary, unit, hybrid)
 * - Company (holding, operating, investment)
 * - Individual (natural person)
 * - Partnership
 * - SMSF (Self-Managed Super Fund)
 * 
 * NOTE: This is a visibility layer. Entities are REGISTERED, not CREATED.
 * The source of truth remains external (legal documents, ASIC, etc.)
 */

// =============================================================================
// ENTITY TYPES
// =============================================================================

export type EntityType =
  | 'trust'
  | 'company'
  | 'individual'
  | 'partnership'
  | 'smsf';

export type TrustType =
  | 'discretionary'
  | 'unit'
  | 'hybrid'
  | 'fixed'
  | 'testamentary';

export type CompanyType =
  | 'holding'
  | 'operating'
  | 'investment'
  | 'trading';

// =============================================================================
// ENTITY INTERFACES
// =============================================================================

/**
 * Base entity interface.
 * All entities share these properties.
 */
export interface BaseEntity {
  /** Unique entity ID (internal) */
  readonly id: string;
  
  /** Entity type */
  readonly type: EntityType;
  
  /** Display name */
  readonly name: string;
  
  /** Legal name (as registered) */
  readonly legalName: string;
  
  /** Jurisdiction (e.g., 'AU-NSW', 'AU-VIC') */
  readonly jurisdiction: string;
  
  /** Tax file number (encrypted reference) */
  readonly tfnReference?: string;
  
  /** ABN (if applicable) */
  readonly abn?: string;
  
  /** ACN (if applicable) */
  readonly acn?: string;
  
  /** Date entity was established */
  readonly establishedDate?: Date;
  
  /** External reference IDs */
  readonly externalRefs: ExternalReference[];
  
  /** Registration status */
  readonly status: EntityStatus;
  
  /** Metadata */
  readonly metadata?: Record<string, unknown>;
  
  /** Audit timestamps */
  readonly registeredAt: Date;
  readonly updatedAt: Date;
}

export type EntityStatus =
  | 'active'
  | 'dormant'
  | 'wound_up'
  | 'deregistered';

export interface ExternalReference {
  /** Source system (e.g., 'ASIC', 'ATO', 'BGL') */
  readonly source: string;
  
  /** External ID in that system */
  readonly externalId: string;
  
  /** Last sync timestamp */
  readonly lastSyncedAt?: Date;
}

// =============================================================================
// TRUST ENTITY
// =============================================================================

export interface TrustEntity extends BaseEntity {
  readonly type: 'trust';
  
  /** Trust subtype */
  readonly trustType: TrustType;
  
  /** Trustee entity ID (company or individual) */
  readonly trusteeId: string;
  
  /** Appointor entity ID (if applicable) */
  readonly appointorId?: string;
  
  /** Guardian entity ID (if applicable) */
  readonly guardianId?: string;
  
  /** Trust deed date */
  readonly deedDate?: Date;
  
  /** Vesting date (for discretionary trusts) */
  readonly vestingDate?: Date;
  
  /** Beneficiary class description */
  readonly beneficiaryClass?: string;
}

// =============================================================================
// COMPANY ENTITY
// =============================================================================

export interface CompanyEntity extends BaseEntity {
  readonly type: 'company';
  
  /** Company subtype */
  readonly companyType: CompanyType;
  
  /** Company class (e.g., 'Pty Ltd', 'Ltd') */
  readonly companyClass: string;
  
  /** Registered office address */
  readonly registeredOffice?: Address;
  
  /** Principal place of business */
  readonly principalPlace?: Address;
  
  /** Director entity IDs */
  readonly directorIds: readonly string[];
  
  /** Shareholder entity IDs */
  readonly shareholderIds: readonly string[];
  
  /** Secretary entity ID */
  readonly secretaryId?: string;
  
  /** Financial year end (month, 1-12) */
  readonly financialYearEnd: number;
}

export interface Address {
  readonly line1: string;
  readonly line2?: string;
  readonly suburb: string;
  readonly state: string;
  readonly postcode: string;
  readonly country: string;
}

// =============================================================================
// INDIVIDUAL ENTITY
// =============================================================================

export interface IndividualEntity extends BaseEntity {
  readonly type: 'individual';
  
  /** Given names */
  readonly givenNames: string;
  
  /** Family name */
  readonly familyName: string;
  
  /** Date of birth (encrypted reference) */
  readonly dobReference?: string;
  
  /** Residential address */
  readonly residentialAddress?: Address;
  
  /** Tax residency status */
  readonly taxResidency: TaxResidency;
  
  /** Roles in family office */
  readonly roles: readonly IndividualRole[];
}

export type TaxResidency =
  | 'australian_resident'
  | 'foreign_resident'
  | 'temporary_resident';

export type IndividualRole =
  | 'principal'
  | 'spouse'
  | 'child'
  | 'grandchild'
  | 'parent'
  | 'sibling'
  | 'other_family'
  | 'key_person';

// =============================================================================
// PARTNERSHIP ENTITY
// =============================================================================

export interface PartnershipEntity extends BaseEntity {
  readonly type: 'partnership';
  
  /** Partnership type */
  readonly partnershipType: 'general' | 'limited';
  
  /** Partner entity IDs */
  readonly partnerIds: readonly string[];
  
  /** Partnership agreement date */
  readonly agreementDate?: Date;
}

// =============================================================================
// SMSF ENTITY
// =============================================================================

export interface SMSFEntity extends BaseEntity {
  readonly type: 'smsf';
  
  /** SMSF name */
  readonly fundName: string;
  
  /** Trustee type */
  readonly trusteeType: 'individual' | 'corporate';
  
  /** Trustee entity ID */
  readonly trusteeId: string;
  
  /** Member entity IDs */
  readonly memberIds: readonly string[];
  
  /** SMSF registration date */
  readonly registrationDate?: Date;
  
  /** Compliance status */
  readonly complianceStatus: 'complying' | 'non_complying' | 'under_review';
}

// =============================================================================
// UNION TYPE
// =============================================================================

export type Entity =
  | TrustEntity
  | CompanyEntity
  | IndividualEntity
  | PartnershipEntity
  | SMSFEntity;

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a new entity registration.
 * NOTE: This REGISTERS an entity for visibility, it does not CREATE the legal entity.
 */
export function registerEntity(
  type: EntityType,
  data: Omit<Entity, 'id' | 'registeredAt' | 'updatedAt' | 'status'>
): Entity {
  const now = new Date();
  const id = generateEntityId(type);
  
  return {
    ...data,
    id,
    status: 'active',
    registeredAt: now,
    updatedAt: now,
  } as Entity;
}

function generateEntityId(type: EntityType): string {
  const prefix = {
    trust: 'tru',
    company: 'coy',
    individual: 'ind',
    partnership: 'ptn',
    smsf: 'sms',
  }[type];
  
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
}
