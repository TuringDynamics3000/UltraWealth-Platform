/**
 * Dashboard Shell Component
 * 
 * Main dashboard UI shell for Family Office tenant.
 * Displays consolidated net worth and key metrics.
 * 
 * PRINCIPLE: Visibility only, no execution capability.
 */

import React from 'react';
import { ConsolidatedNetWorthView } from '../views/consolidated-net-worth';

// =============================================================================
// TYPES
// =============================================================================

export interface DashboardShellProps {
  /** Consolidated net worth view data */
  netWorthView: ConsolidatedNetWorthView;
  
  /** Currency formatter */
  formatCurrency: (amount: number, currency: string) => string;
  
  /** Percentage formatter */
  formatPercent: (value: number) => string;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Error state */
  error?: string;
  
  /** Refresh callback */
  onRefresh?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const DashboardShell: React.FC<DashboardShellProps> = ({
  netWorthView,
  formatCurrency,
  formatPercent,
  isLoading = false,
  error,
  onRefresh,
}) => {
  if (isLoading) {
    return (
      <div className="dashboard-shell dashboard-shell--loading">
        <div className="loading-indicator">Loading consolidated view...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="dashboard-shell dashboard-shell--error">
        <div className="error-message">{error}</div>
        {onRefresh && (
          <button onClick={onRefresh} className="refresh-button">
            Retry
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="dashboard-shell">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Family Office Dashboard</h1>
        <div className="dashboard-meta">
          <span className="as-at">
            As at: {netWorthView.asAt.toLocaleDateString()}
          </span>
          <span className="data-quality">
            Data Quality: {netWorthView.dataQuality.overallScore}%
          </span>
          {onRefresh && (
            <button onClick={onRefresh} className="refresh-button">
              Refresh
            </button>
          )}
        </div>
      </header>
      
      {/* Key Metrics */}
      <section className="key-metrics">
        <div className="metric-card metric-card--primary">
          <h2>Net Worth</h2>
          <div className="metric-value">
            {formatCurrency(netWorthView.netWorth.amount, netWorthView.netWorth.currency)}
          </div>
        </div>
        
        <div className="metric-card">
          <h2>Gross Assets</h2>
          <div className="metric-value">
            {formatCurrency(netWorthView.grossAssets.amount, netWorthView.grossAssets.currency)}
          </div>
        </div>
        
        <div className="metric-card">
          <h2>Total Liabilities</h2>
          <div className="metric-value">
            {formatCurrency(netWorthView.totalLiabilities.amount, netWorthView.totalLiabilities.currency)}
          </div>
        </div>
      </section>
      
      {/* Asset Allocation */}
      <section className="asset-allocation">
        <h2>Asset Allocation</h2>
        <div className="allocation-chart">
          {netWorthView.byAssetClass.map((ac) => (
            <div key={ac.assetClass} className="allocation-row">
              <span className="allocation-label">{ac.displayName}</span>
              <div className="allocation-bar-container">
                <div 
                  className="allocation-bar" 
                  style={{ width: `${ac.percentage}%` }}
                />
              </div>
              <span className="allocation-value">
                {formatCurrency(ac.totalValue.amount, ac.totalValue.currency)}
              </span>
              <span className="allocation-percent">
                {formatPercent(ac.percentage)}
              </span>
            </div>
          ))}
        </div>
      </section>
      
      {/* Entity Breakdown */}
      <section className="entity-breakdown">
        <h2>By Entity</h2>
        <table className="entity-table">
          <thead>
            <tr>
              <th>Entity</th>
              <th>Type</th>
              <th>Assets</th>
              <th>Liabilities</th>
              <th>Net Position</th>
              <th>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {netWorthView.byEntity.map((entity) => (
              <tr key={entity.entityId}>
                <td>{entity.entityName}</td>
                <td>{entity.entityType}</td>
                <td>{formatCurrency(entity.totalAssets.amount, entity.totalAssets.currency)}</td>
                <td>{formatCurrency(entity.totalLiabilities.amount, entity.totalLiabilities.currency)}</td>
                <td>{formatCurrency(entity.netPosition.amount, entity.netPosition.currency)}</td>
                <td>{formatPercent(entity.percentage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
      {/* Currency Exposure */}
      <section className="currency-exposure">
        <h2>Currency Exposure</h2>
        <div className="currency-list">
          {netWorthView.byCurrency.map((curr) => (
            <div key={curr.currency} className="currency-row">
              <span className="currency-code">{curr.currency}</span>
              <span className="currency-value">
                {formatCurrency(curr.valueInBaseCurrency.amount, curr.valueInBaseCurrency.currency)}
              </span>
              <span className="currency-percent">
                {formatPercent(curr.percentage)}
              </span>
            </div>
          ))}
        </div>
      </section>
      
      {/* Data Quality Warning */}
      {netWorthView.dataQuality.overallScore < 80 && (
        <section className="data-quality-warning">
          <h2>Data Quality Notice</h2>
          <p>
            Some asset valuations may be stale. 
            {netWorthView.dataQuality.assetsWithStaleValuation} assets have valuations 
            older than {netWorthView.dataQuality.staleDays} days.
          </p>
        </section>
      )}
      
      {/* Footer */}
      <footer className="dashboard-footer">
        <p className="disclaimer">
          This dashboard provides consolidated visibility of externally-held assets.
          All data is sourced from external custodians and systems of record.
          This is not financial information for the purposes of any regulatory requirement.
        </p>
      </footer>
    </div>
  );
};

// =============================================================================
// DEFAULT FORMATTERS
// =============================================================================

export const defaultFormatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const defaultFormatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// =============================================================================
// EXPORT
// =============================================================================

export default DashboardShell;
