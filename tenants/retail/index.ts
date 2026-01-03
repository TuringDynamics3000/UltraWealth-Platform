/**
 * Retail Tenant (Stub)
 * 
 * Placeholder for retail investor tenant implementation.
 * 
 * GOVERNANCE PROFILE: retail
 * - Advisory language: Forbidden
 * - Execution capability: Forbidden
 * - System of record leakage: Forbidden
 * - External asset first: Required
 * - Evidence required: Required
 * 
 * SCOPE:
 * - Individual investors
 * - Simpler entity structures
 * - Basic portfolio visibility
 * - Standard reporting
 */

// Tenant metadata
export const TENANT_METADATA = {
  id: 'retail',
  name: 'Retail Investor',
  profile: 'retail',
  version: '0.1.0',
  status: 'stub',
  governance: {
    advisoryLanguage: 'forbidden',
    executionCapability: 'forbidden',
    systemOfRecordLeakage: 'forbidden',
    externalAssetFirst: 'required',
    evidenceRequired: 'required',
  },
} as const;

// Placeholder exports - to be implemented
export const domain = {
  // Simplified entity model for retail
};

export const views = {
  // Basic portfolio view
  // Simple performance view
};

export const reports = {
  // Annual statement
  // Tax summary
};

export const uiShell = {
  // Simple dashboard
  // Portfolio view
};
