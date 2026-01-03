/**
 * Family Office Tenant
 * 
 * Complete tenant implementation for Family Office use case.
 * 
 * ARCHITECTURAL PRINCIPLES:
 * 
 * 1. External-Asset-First: Assets are held at external custodians.
 *    We consolidate visibility, not custody.
 * 
 * 2. Evidence-Backed: All material facts have supporting evidence
 *    (statements, valuations, documents).
 * 
 * 3. No Execution: We record instructions and outcomes.
 *    We do not execute trades or transactions.
 * 
 * 4. No Advisory Content: We present information.
 *    We do not provide recommendations or suggestions.
 * 
 * 5. Visibility Not Authority: We consolidate views.
 *    The source of truth remains external.
 */

// Domain
export * from './domain';

// Views
export * from './views';

// Reports
export * from './reports';

// UI Shell
export * from './ui-shell';

// Tenant metadata
export const TENANT_METADATA = {
  id: 'family-office',
  name: 'Family Office',
  profile: 'fo',
  version: '1.0.0',
  governance: {
    advisoryLanguage: 'forbidden',
    executionCapability: 'forbidden',
    systemOfRecordLeakage: 'forbidden',
    externalAssetFirst: 'required',
    evidenceRequired: 'required',
  },
} as const;
