/**
 * Governance Module
 * 
 * Runtime governance enforcement for UltraWealth Platform.
 * Consumes rules from TuringDynamics3000/turingos-governance-action.
 * 
 * USAGE:
 * 
 * 1. Check content for violations:
 *    const adapter = GovernanceAdapter.forCurrentTenant();
 *    const violations = adapter.checkAll(content);
 * 
 * 2. Enforce at API boundary:
 *    await enforceApiRequest(requestBody, 'create_entity');
 * 
 * 3. Enforce at report generation:
 *    await enforceReportGeneration(reportContent, 'board_pack');
 */

// Governance Adapter
export {
  GovernanceAdapter,
  getAvailableProfiles,
  getProfile,
  type GovernanceProfile,
  type GovernanceEnforcement,
  type GovernanceViolation,
  type GovernanceViolationType,
} from './governance-adapter';

// Enforcement Hooks
export {
  enforceApiRequest,
  enforceReportGeneration,
  enforceUiContent,
  enforceDataExport,
  withGovernanceEnforcement,
  assertFoGovernance,
  assertNoExecution,
  assertNoSor,
  sanitizeContent,
  setEnforcementHandler,
  GovernanceEnforcementError,
  type EnforcementResult,
  type EnforcementContext,
} from './enforcement-hooks';
