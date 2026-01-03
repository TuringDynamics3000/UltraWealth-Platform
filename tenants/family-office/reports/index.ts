/**
 * Family Office Reports
 * 
 * Report generators for Family Office governance and compliance.
 * Reports are INFORMATIONAL only - they do not provide recommendations.
 */

export {
  BoardPackGenerator,
  createBoardPackGenerator,
  type BoardPackReport,
  type ReportMetadata,
  type ExecutiveSummary,
  type NetWorthSection,
  type AssetAllocationSection,
  type LiquiditySection,
  type UpcomingMattersSection,
  type DataQualitySection,
} from './board-pack';

// Additional report generators would be exported here:
// export * from './auditor-pack';
// export * from './tax-pack';
// export * from './regulator-export';
