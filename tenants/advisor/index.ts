/**
 * Advisor Tenant (Stub)
 * 
 * Placeholder for licensed financial advisor tenant implementation.
 * 
 * GOVERNANCE PROFILE: advisor
 * - Advisory language: Allowed WITH LABELING
 * - Execution capability: Forbidden
 * - System of record leakage: Forbidden
 * - External asset first: Required
 * - Evidence required: Required
 * 
 * KEY DIFFERENCE FROM FO:
 * Licensed advisors may provide labeled advisory content.
 * All advisory content must be clearly marked as such.
 * 
 * SCOPE:
 * - Licensed financial advisors (AFSL holders)
 * - Client portfolio management
 * - Statement of Advice (SOA) generation
 * - Compliance documentation
 */

// Tenant metadata
export const TENANT_METADATA = {
  id: 'advisor',
  name: 'Financial Advisor',
  profile: 'advisor',
  version: '0.1.0',
  status: 'stub',
  governance: {
    advisoryLanguage: 'allowed_with_labeling',
    executionCapability: 'forbidden',
    systemOfRecordLeakage: 'forbidden',
    externalAssetFirst: 'required',
    evidenceRequired: 'required',
  },
  licensing: {
    requiresAFSL: true,
    requiresAuthorisedRep: true,
  },
} as const;

// Placeholder exports - to be implemented
export const domain = {
  // Client entity model
  // Advisor entity model
  // Practice entity model
};

export const views = {
  // Client portfolio view
  // Practice-wide AUM view
  // Compliance dashboard
};

export const reports = {
  // Statement of Advice (SOA)
  // Record of Advice (ROA)
  // Fee Disclosure Statement (FDS)
  // Client review report
};

export const uiShell = {
  // Client management dashboard
  // SOA builder
  // Compliance tracker
};

// Advisory content labeling utilities
export const advisoryLabeling = {
  /**
   * Wrap content with advisory label.
   * Required for all advisory content in this tenant.
   */
  labelAsAdvisory: (content: string, advisorName: string, afslNumber: string): string => {
    return `[GENERAL ADVICE WARNING: This is general advice only and does not take into account your personal circumstances. Before acting on this advice, consider its appropriateness to your circumstances. Provided by ${advisorName} as an authorised representative of AFSL ${afslNumber}.]\n\n${content}`;
  },
  
  /**
   * Check if content is properly labeled.
   */
  isProperlyLabeled: (content: string): boolean => {
    return content.includes('[GENERAL ADVICE WARNING:') || 
           content.includes('[PERSONAL ADVICE:');
  },
};
