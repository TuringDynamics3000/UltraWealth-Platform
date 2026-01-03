/**
 * Family Office Domain - External Assets
 * 
 * External asset types for Family Office tenant.
 * External assets are held at custodians, banks, registries, etc.
 * 
 * PRINCIPLE: External-asset-first reporting.
 * The platform consolidates visibility across external systems.
 * It does NOT hold assets or execute transactions.
 * 
 * TYPES:
 * - Listed securities (ASX, NYSE, etc.)
 * - Managed funds
 * - Private equity
 * - Real property
 * - Bank accounts
 * - Fixed income
 * - Alternative investments
 */

// =============================================================================
// ASSET TYPES
// =============================================================================

export type AssetClass =
  | 'listed_securities'
  | 'managed_funds'
  | 'private_equity'
  | 'real_property'
  | 'cash'
  | 'fixed_income'
  | 'alternatives'
  | 'collectibles'
  | 'crypto';

export type AssetSubclass =
  // Listed securities
  | 'domestic_equity'
  | 'international_equity'
  | 'etf'
  | 'lic'
  
  // Managed funds
  | 'retail_fund'
  | 'wholesale_fund'
  | 'hedge_fund'
  
  // Private equity
  | 'direct_investment'
  | 'pe_fund'
  | 'venture_capital'
  
  // Real property
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'rural'
  | 'development'
  
  // Cash
  | 'transaction_account'
  | 'savings_account'
  | 'term_deposit'
  | 'offset_account'
  
  // Fixed income
  | 'government_bond'
  | 'corporate_bond'
  | 'hybrid_security'
  
  // Alternatives
  | 'infrastructure'
  | 'commodities'
  | 'private_credit';

// =============================================================================
// EXTERNAL ASSET INTERFACES
// =============================================================================

/**
 * Base external asset interface.
 */
export interface BaseExternalAsset {
  /** Unique asset ID (internal) */
  readonly id: string;
  
  /** Asset class */
  readonly assetClass: AssetClass;
  
  /** Asset subclass */
  readonly assetSubclass?: AssetSubclass;
  
  /** Display name */
  readonly name: string;
  
  /** Owning entity ID */
  readonly ownerEntityId: string;
  
  /** Custodian/holder information */
  readonly custodian: CustodianInfo;
  
  /** Currency (ISO 4217) */
  readonly currency: string;
  
  /** Current valuation */
  readonly currentValuation?: Valuation;
  
  /** Cost base information */
  readonly costBase?: CostBase;
  
  /** Income information */
  readonly incomeProfile?: IncomeProfile;
  
  /** External references */
  readonly externalRefs: ExternalAssetReference[];
  
  /** Asset status */
  readonly status: AssetStatus;
  
  /** Audit timestamps */
  readonly registeredAt: Date;
  readonly updatedAt: Date;
}

export type AssetStatus =
  | 'active'
  | 'pending'
  | 'disposed'
  | 'transferred';

export interface CustodianInfo {
  /** Custodian name */
  readonly name: string;
  
  /** Custodian type */
  readonly type: 'bank' | 'broker' | 'registry' | 'platform' | 'direct';
  
  /** Account/reference number */
  readonly accountRef: string;
  
  /** API integration available */
  readonly apiEnabled: boolean;
  
  /** Last data sync */
  readonly lastSyncedAt?: Date;
}

export interface Valuation {
  /** Valuation amount */
  readonly amount: number;
  
  /** Valuation currency */
  readonly currency: string;
  
  /** Valuation date */
  readonly asAt: Date;
  
  /** Valuation source */
  readonly source: ValuationSource;
  
  /** Evidence ID (if linked) */
  readonly evidenceId?: string;
}

export type ValuationSource =
  | 'market_price'
  | 'custodian_statement'
  | 'independent_valuation'
  | 'director_valuation'
  | 'cost'
  | 'manual_entry';

export interface CostBase {
  /** Original cost */
  readonly originalCost: number;
  
  /** Adjusted cost base */
  readonly adjustedCostBase: number;
  
  /** Acquisition date */
  readonly acquisitionDate: Date;
  
  /** CGT method */
  readonly cgtMethod: 'fifo' | 'lifo' | 'specific' | 'average';
}

export interface IncomeProfile {
  /** Expected annual income */
  readonly expectedAnnualIncome?: number;
  
  /** Income frequency */
  readonly frequency?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  
  /** Last income date */
  readonly lastIncomeDate?: Date;
  
  /** Last income amount */
  readonly lastIncomeAmount?: number;
}

export interface ExternalAssetReference {
  /** Source system */
  readonly source: string;
  
  /** External ID */
  readonly externalId: string;
  
  /** Identifier type (e.g., 'ISIN', 'SEDOL', 'ASX_CODE') */
  readonly identifierType?: string;
}

// =============================================================================
// LISTED SECURITY
// =============================================================================

export interface ListedSecurity extends BaseExternalAsset {
  readonly assetClass: 'listed_securities';
  
  /** Stock exchange */
  readonly exchange: string;
  
  /** Ticker symbol */
  readonly ticker: string;
  
  /** ISIN */
  readonly isin?: string;
  
  /** Number of units held */
  readonly units: number;
  
  /** Current price per unit */
  readonly pricePerUnit?: number;
  
  /** Sector */
  readonly sector?: string;
}

// =============================================================================
// MANAGED FUND
// =============================================================================

export interface ManagedFund extends BaseExternalAsset {
  readonly assetClass: 'managed_funds';
  
  /** Fund manager */
  readonly fundManager: string;
  
  /** APIR code */
  readonly apirCode?: string;
  
  /** Number of units */
  readonly units: number;
  
  /** Unit price */
  readonly unitPrice?: number;
  
  /** Fund type */
  readonly fundType: 'retail' | 'wholesale';
}

// =============================================================================
// REAL PROPERTY
// =============================================================================

export interface RealProperty extends BaseExternalAsset {
  readonly assetClass: 'real_property';
  
  /** Property address */
  readonly address: PropertyAddress;
  
  /** Title reference */
  readonly titleReference?: string;
  
  /** Land area (sqm) */
  readonly landArea?: number;
  
  /** Building area (sqm) */
  readonly buildingArea?: number;
  
  /** Zoning */
  readonly zoning?: string;
  
  /** Encumbrances */
  readonly encumbrances?: Encumbrance[];
}

export interface PropertyAddress {
  readonly streetAddress: string;
  readonly suburb: string;
  readonly state: string;
  readonly postcode: string;
  readonly country: string;
}

export interface Encumbrance {
  readonly type: 'mortgage' | 'caveat' | 'easement' | 'covenant';
  readonly holder?: string;
  readonly reference?: string;
}

// =============================================================================
// BANK ACCOUNT
// =============================================================================

export interface BankAccount extends BaseExternalAsset {
  readonly assetClass: 'cash';
  
  /** Bank name */
  readonly bankName: string;
  
  /** BSB */
  readonly bsb: string;
  
  /** Account number (masked) */
  readonly accountNumberMasked: string;
  
  /** Account type */
  readonly accountType: 'transaction' | 'savings' | 'term_deposit' | 'offset';
  
  /** Interest rate (if applicable) */
  readonly interestRate?: number;
  
  /** Maturity date (for term deposits) */
  readonly maturityDate?: Date;
}

// =============================================================================
// UNION TYPE
// =============================================================================

export type ExternalAsset =
  | ListedSecurity
  | ManagedFund
  | RealProperty
  | BankAccount
  | BaseExternalAsset;

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Register an external asset.
 * NOTE: This REGISTERS an asset for visibility. The asset is HELD EXTERNALLY.
 */
export function registerExternalAsset(
  assetClass: AssetClass,
  data: Omit<ExternalAsset, 'id' | 'registeredAt' | 'updatedAt' | 'status'>
): ExternalAsset {
  const now = new Date();
  const id = generateAssetId(assetClass);
  
  return {
    ...data,
    id,
    status: 'active',
    registeredAt: now,
    updatedAt: now,
  } as ExternalAsset;
}

function generateAssetId(assetClass: AssetClass): string {
  const prefix = {
    listed_securities: 'sec',
    managed_funds: 'mf',
    private_equity: 'pe',
    real_property: 'prp',
    cash: 'csh',
    fixed_income: 'fi',
    alternatives: 'alt',
    collectibles: 'col',
    crypto: 'cry',
  }[assetClass];
  
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
}
