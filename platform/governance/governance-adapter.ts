/**
 * Governance Adapter
 * 
 * Adapts governance rules from TuringDynamics3000/turingos-governance-action
 * for runtime enforcement in the UltraWealth Platform.
 * 
 * CRITICAL:
 * - Governance rules are consumed, not defined here
 * - No tenant code may override governance logic
 * - All profiles (fo, retail, advisor) are enforced consistently
 */

import { TenantProfile, getCurrentTenantProfile } from '../tenancy';

// =============================================================================
// TYPES
// =============================================================================

export interface GovernanceProfile {
  readonly name: TenantProfile;
  readonly displayName: string;
  readonly enforcement: GovernanceEnforcement;
}

export interface GovernanceEnforcement {
  /** Forbidden terms that constitute advisory language */
  readonly forbiddenAdvisoryTerms: readonly string[];
  
  /** Forbidden execution keywords */
  readonly forbiddenExecutionTerms: readonly string[];
  
  /** Forbidden system-of-record patterns */
  readonly forbiddenSorPatterns: readonly string[];
  
  /** Forbidden dependencies */
  readonly forbiddenDependencies: readonly string[];
  
  /** Whether advisory language is allowed (with labeling) */
  readonly advisoryAllowed: boolean;
  
  /** Whether execution capability is allowed */
  readonly executionAllowed: boolean;
  
  /** Whether SoR logic is allowed */
  readonly sorAllowed: boolean;
}

export interface GovernanceViolation {
  readonly type: GovernanceViolationType;
  readonly term: string;
  readonly context: string;
  readonly severity: 'error' | 'warning';
  readonly profile: TenantProfile;
  readonly timestamp: Date;
}

export type GovernanceViolationType =
  | 'ADVISORY_LANGUAGE'
  | 'EXECUTION_CAPABILITY'
  | 'SOR_LEAKAGE'
  | 'FORBIDDEN_DEPENDENCY';

// =============================================================================
// PROFILE DEFINITIONS
// =============================================================================

/**
 * Family Office profile - strictest governance.
 * No advisory language, no execution, no SoR.
 */
const FO_PROFILE: GovernanceProfile = Object.freeze({
  name: 'fo',
  displayName: 'Family Office',
  enforcement: Object.freeze({
    forbiddenAdvisoryTerms: Object.freeze([
      'recommend',
      'recommended',
      'suggest',
      'suggested',
      'advise',
      'advised',
      'optimise',
      'optimize',
      'allocate',
      'allocation',
      'outperform',
      'beat the market',
      'should invest',
      'consider investing',
      'investment opportunity',
      'buy',
      'sell',
      'hold',
    ]),
    forbiddenExecutionTerms: Object.freeze([
      'execute',
      'placeOrder',
      'submitTrade',
      'rebalance',
      'trade',
      'order',
      'transact',
    ]),
    forbiddenSorPatterns: Object.freeze([
      'updateBalance',
      'setBalance',
      'mutateBalance',
      'reconcilePosition',
      'postTransaction',
      'createJournalEntry',
      'postJournal',
      'updateLedger',
      'ledgerEntry',
    ]),
    forbiddenDependencies: Object.freeze([
      '@turingos/ledger',
      '@turingos/execution',
      '@turingos/trading',
      '@turingos/oms',
      '@turingos/decision-engine',
      '@turingos/allocation-engine',
    ]),
    advisoryAllowed: false,
    executionAllowed: false,
    sorAllowed: false,
  }),
});

/**
 * Retail profile - strict governance.
 * No advisory language, no execution, no SoR.
 */
const RETAIL_PROFILE: GovernanceProfile = Object.freeze({
  name: 'retail',
  displayName: 'Retail',
  enforcement: Object.freeze({
    forbiddenAdvisoryTerms: Object.freeze([
      'recommend',
      'recommended',
      'suggest',
      'suggested',
      'advise',
      'advised',
      'should invest',
      'consider investing',
    ]),
    forbiddenExecutionTerms: Object.freeze([
      'execute',
      'placeOrder',
      'submitTrade',
      'rebalance',
    ]),
    forbiddenSorPatterns: Object.freeze([
      'updateBalance',
      'setBalance',
      'postTransaction',
      'updateLedger',
    ]),
    forbiddenDependencies: Object.freeze([
      '@turingos/ledger',
      '@turingos/execution',
      '@turingos/trading',
      '@turingos/oms',
    ]),
    advisoryAllowed: false,
    executionAllowed: false,
    sorAllowed: false,
  }),
});

/**
 * Advisor profile - advisory language allowed with labeling.
 * No execution, no SoR.
 */
const ADVISOR_PROFILE: GovernanceProfile = Object.freeze({
  name: 'advisor',
  displayName: 'Advisor',
  enforcement: Object.freeze({
    forbiddenAdvisoryTerms: Object.freeze([]), // Advisory allowed with labeling
    forbiddenExecutionTerms: Object.freeze([
      'execute',
      'placeOrder',
      'submitTrade',
      'rebalance',
    ]),
    forbiddenSorPatterns: Object.freeze([
      'updateBalance',
      'setBalance',
      'postTransaction',
      'updateLedger',
    ]),
    forbiddenDependencies: Object.freeze([
      '@turingos/ledger',
      '@turingos/execution',
      '@turingos/trading',
      '@turingos/oms',
    ]),
    advisoryAllowed: true,
    executionAllowed: false,
    sorAllowed: false,
  }),
});

// =============================================================================
// PROFILE REGISTRY
// =============================================================================

const PROFILES: ReadonlyMap<TenantProfile, GovernanceProfile> = new Map([
  ['fo', FO_PROFILE],
  ['retail', RETAIL_PROFILE],
  ['advisor', ADVISOR_PROFILE],
]);

// =============================================================================
// GOVERNANCE ADAPTER
// =============================================================================

export class GovernanceAdapter {
  private readonly profile: GovernanceProfile;
  
  constructor(tenantProfile: TenantProfile) {
    const profile = PROFILES.get(tenantProfile);
    if (!profile) {
      throw new Error(`Unknown governance profile: ${tenantProfile}`);
    }
    this.profile = profile;
  }
  
  /**
   * Get the governance profile for the current tenant.
   */
  static forCurrentTenant(): GovernanceAdapter {
    return new GovernanceAdapter(getCurrentTenantProfile());
  }
  
  /**
   * Get the profile configuration.
   */
  getProfile(): GovernanceProfile {
    return this.profile;
  }
  
  /**
   * Check if advisory language is allowed.
   */
  isAdvisoryAllowed(): boolean {
    return this.profile.enforcement.advisoryAllowed;
  }
  
  /**
   * Check if execution capability is allowed.
   */
  isExecutionAllowed(): boolean {
    return this.profile.enforcement.executionAllowed;
  }
  
  /**
   * Check if SoR logic is allowed.
   */
  isSorAllowed(): boolean {
    return this.profile.enforcement.sorAllowed;
  }
  
  /**
   * Check text for advisory language violations.
   */
  checkAdvisoryLanguage(text: string): GovernanceViolation[] {
    if (this.profile.enforcement.advisoryAllowed) {
      return [];
    }
    
    const violations: GovernanceViolation[] = [];
    const lowerText = text.toLowerCase();
    
    for (const term of this.profile.enforcement.forbiddenAdvisoryTerms) {
      if (lowerText.includes(term.toLowerCase())) {
        violations.push({
          type: 'ADVISORY_LANGUAGE',
          term,
          context: this.extractContext(text, term),
          severity: 'error',
          profile: this.profile.name,
          timestamp: new Date(),
        });
      }
    }
    
    return violations;
  }
  
  /**
   * Check code for execution capability violations.
   */
  checkExecutionCapability(code: string): GovernanceViolation[] {
    if (this.profile.enforcement.executionAllowed) {
      return [];
    }
    
    const violations: GovernanceViolation[] = [];
    
    for (const term of this.profile.enforcement.forbiddenExecutionTerms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(code)) {
        violations.push({
          type: 'EXECUTION_CAPABILITY',
          term,
          context: this.extractContext(code, term),
          severity: 'error',
          profile: this.profile.name,
          timestamp: new Date(),
        });
      }
    }
    
    return violations;
  }
  
  /**
   * Check code for SoR leakage violations.
   */
  checkSorLeakage(code: string): GovernanceViolation[] {
    if (this.profile.enforcement.sorAllowed) {
      return [];
    }
    
    const violations: GovernanceViolation[] = [];
    
    for (const pattern of this.profile.enforcement.forbiddenSorPatterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      if (regex.test(code)) {
        violations.push({
          type: 'SOR_LEAKAGE',
          term: pattern,
          context: this.extractContext(code, pattern),
          severity: 'error',
          profile: this.profile.name,
          timestamp: new Date(),
        });
      }
    }
    
    return violations;
  }
  
  /**
   * Check dependencies for forbidden packages.
   */
  checkDependencies(dependencies: string[]): GovernanceViolation[] {
    const violations: GovernanceViolation[] = [];
    
    for (const dep of dependencies) {
      if (this.profile.enforcement.forbiddenDependencies.includes(dep)) {
        violations.push({
          type: 'FORBIDDEN_DEPENDENCY',
          term: dep,
          context: `Dependency: ${dep}`,
          severity: 'error',
          profile: this.profile.name,
          timestamp: new Date(),
        });
      }
    }
    
    return violations;
  }
  
  /**
   * Run all governance checks on content.
   */
  checkAll(content: string, dependencies?: string[]): GovernanceViolation[] {
    return [
      ...this.checkAdvisoryLanguage(content),
      ...this.checkExecutionCapability(content),
      ...this.checkSorLeakage(content),
      ...(dependencies ? this.checkDependencies(dependencies) : []),
    ];
  }
  
  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------
  
  private extractContext(text: string, term: string): string {
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const index = lowerText.indexOf(lowerTerm);
    
    if (index === -1) return '';
    
    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + term.length + 30);
    
    return `...${text.substring(start, end)}...`;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Get all available governance profiles.
 */
export function getAvailableProfiles(): readonly GovernanceProfile[] {
  return Array.from(PROFILES.values());
}

/**
 * Get a specific governance profile.
 */
export function getProfile(name: TenantProfile): GovernanceProfile | undefined {
  return PROFILES.get(name);
}
