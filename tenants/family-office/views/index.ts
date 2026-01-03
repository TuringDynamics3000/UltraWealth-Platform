/**
 * Family Office Views
 * 
 * Read-only views that consolidate visibility across external assets.
 * Views are computed on-demand from the underlying data.
 */

export {
  ConsolidatedNetWorthViewBuilder,
  createConsolidatedNetWorthView,
  type ConsolidatedNetWorthView,
  type Money,
  type AssetClassSummary,
  type EntitySummary,
  type CurrencySummary,
  type DataQuality,
} from './consolidated-net-worth';

// Additional views would be exported here:
// export * from './liquidity-ladder';
// export * from './exposure-analysis';
// export * from './performance-mwr';
