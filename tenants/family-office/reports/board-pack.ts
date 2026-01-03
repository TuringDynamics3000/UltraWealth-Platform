/**
 * Board Pack Report Generator
 * 
 * Generates quarterly board pack reports for Family Office governance.
 * 
 * CONTENTS:
 * - Executive summary
 * - Consolidated net worth
 * - Asset allocation
 * - Performance summary
 * - Liquidity position
 * - Key decisions required
 * 
 * NOTE: This generates INFORMATIONAL reports only.
 * It does NOT provide recommendations or advice.
 */

import { ConsolidatedNetWorthView } from '../views/consolidated-net-worth';

// =============================================================================
// TYPES
// =============================================================================

export interface BoardPackReport {
  /** Report metadata */
  readonly metadata: ReportMetadata;
  
  /** Executive summary section */
  readonly executiveSummary: ExecutiveSummary;
  
  /** Net worth section */
  readonly netWorthSection: NetWorthSection;
  
  /** Asset allocation section */
  readonly assetAllocationSection: AssetAllocationSection;
  
  /** Liquidity section */
  readonly liquiditySection: LiquiditySection;
  
  /** Upcoming matters section */
  readonly upcomingMatters: UpcomingMattersSection;
  
  /** Data quality section */
  readonly dataQualitySection: DataQualitySection;
}

export interface ReportMetadata {
  readonly reportId: string;
  readonly reportType: 'board_pack';
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly generatedAt: Date;
  readonly generatedBy?: string;
  readonly tenantId: string;
  readonly version: string;
}

export interface ExecutiveSummary {
  readonly netWorth: { current: number; previous: number; change: number; changePercent: number };
  readonly grossAssets: { current: number; previous: number; change: number; changePercent: number };
  readonly liabilities: { current: number; previous: number; change: number; changePercent: number };
  readonly keyHighlights: readonly string[];
  readonly dataQualityScore: number;
}

export interface NetWorthSection {
  readonly currentNetWorth: number;
  readonly currency: string;
  readonly byEntity: readonly {
    entityName: string;
    assets: number;
    liabilities: number;
    netPosition: number;
    percentOfTotal: number;
  }[];
  readonly trend: readonly { date: Date; value: number }[];
}

export interface AssetAllocationSection {
  readonly byAssetClass: readonly {
    assetClass: string;
    value: number;
    percentOfTotal: number;
    targetPercent?: number;
    variance?: number;
  }[];
  readonly byCurrency: readonly {
    currency: string;
    value: number;
    percentOfTotal: number;
  }[];
  readonly byGeography: readonly {
    region: string;
    value: number;
    percentOfTotal: number;
  }[];
}

export interface LiquiditySection {
  readonly cashPosition: number;
  readonly liquidAssets: number;
  readonly illiquidAssets: number;
  readonly liquidityRatio: number;
  readonly upcomingCashflows: readonly {
    date: Date;
    description: string;
    amount: number;
    direction: 'inflow' | 'outflow';
  }[];
}

export interface UpcomingMattersSection {
  readonly items: readonly {
    category: 'compliance' | 'tax' | 'legal' | 'operational' | 'strategic';
    description: string;
    dueDate?: Date;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface DataQualitySection {
  readonly overallScore: number;
  readonly assetsWithCurrentData: number;
  readonly assetsWithStaleData: number;
  readonly assetsWithNoData: number;
  readonly lastFullRefresh?: Date;
  readonly issues: readonly string[];
}

// =============================================================================
// REPORT GENERATOR
// =============================================================================

export class BoardPackGenerator {
  private readonly tenantId: string;
  private readonly currency: string;
  
  constructor(tenantId: string, currency: string = 'AUD') {
    this.tenantId = tenantId;
    this.currency = currency;
  }
  
  /**
   * Generate a board pack report.
   */
  generate(
    currentView: ConsolidatedNetWorthView,
    previousView: ConsolidatedNetWorthView | null,
    periodStart: Date,
    periodEnd: Date,
    additionalData: {
      upcomingCashflows?: LiquiditySection['upcomingCashflows'];
      upcomingMatters?: UpcomingMattersSection['items'];
      targetAllocations?: Record<string, number>;
      historicalNetWorth?: { date: Date; value: number }[];
    } = {}
  ): BoardPackReport {
    const reportId = this.generateReportId();
    const generatedAt = new Date();
    
    // Build sections
    const executiveSummary = this.buildExecutiveSummary(currentView, previousView);
    const netWorthSection = this.buildNetWorthSection(currentView, additionalData.historicalNetWorth);
    const assetAllocationSection = this.buildAssetAllocationSection(currentView, additionalData.targetAllocations);
    const liquiditySection = this.buildLiquiditySection(currentView, additionalData.upcomingCashflows);
    const upcomingMatters = this.buildUpcomingMattersSection(additionalData.upcomingMatters);
    const dataQualitySection = this.buildDataQualitySection(currentView);
    
    return Object.freeze({
      metadata: Object.freeze({
        reportId,
        reportType: 'board_pack',
        periodStart,
        periodEnd,
        generatedAt,
        tenantId: this.tenantId,
        version: '1.0.0',
      }),
      executiveSummary,
      netWorthSection,
      assetAllocationSection,
      liquiditySection,
      upcomingMatters,
      dataQualitySection,
    });
  }
  
  private buildExecutiveSummary(
    current: ConsolidatedNetWorthView,
    previous: ConsolidatedNetWorthView | null
  ): ExecutiveSummary {
    const currentNW = current.netWorth.amount;
    const previousNW = previous?.netWorth.amount ?? currentNW;
    const nwChange = currentNW - previousNW;
    const nwChangePercent = previousNW !== 0 ? (nwChange / previousNW) * 100 : 0;
    
    const currentGA = current.grossAssets.amount;
    const previousGA = previous?.grossAssets.amount ?? currentGA;
    const gaChange = currentGA - previousGA;
    const gaChangePercent = previousGA !== 0 ? (gaChange / previousGA) * 100 : 0;
    
    const currentLiab = current.totalLiabilities.amount;
    const previousLiab = previous?.totalLiabilities.amount ?? currentLiab;
    const liabChange = currentLiab - previousLiab;
    const liabChangePercent = previousLiab !== 0 ? (liabChange / previousLiab) * 100 : 0;
    
    const highlights: string[] = [];
    
    if (nwChangePercent > 5) {
      highlights.push(`Net worth increased by ${nwChangePercent.toFixed(1)}% during the period.`);
    } else if (nwChangePercent < -5) {
      highlights.push(`Net worth decreased by ${Math.abs(nwChangePercent).toFixed(1)}% during the period.`);
    }
    
    if (current.dataQuality.overallScore < 80) {
      highlights.push(`Data quality score of ${current.dataQuality.overallScore}% indicates some valuations may be stale.`);
    }
    
    return Object.freeze({
      netWorth: { current: currentNW, previous: previousNW, change: nwChange, changePercent: nwChangePercent },
      grossAssets: { current: currentGA, previous: previousGA, change: gaChange, changePercent: gaChangePercent },
      liabilities: { current: currentLiab, previous: previousLiab, change: liabChange, changePercent: liabChangePercent },
      keyHighlights: Object.freeze(highlights),
      dataQualityScore: current.dataQuality.overallScore,
    });
  }
  
  private buildNetWorthSection(
    view: ConsolidatedNetWorthView,
    historicalData?: { date: Date; value: number }[]
  ): NetWorthSection {
    return Object.freeze({
      currentNetWorth: view.netWorth.amount,
      currency: view.netWorth.currency,
      byEntity: Object.freeze(
        view.byEntity.map(e => ({
          entityName: e.entityName,
          assets: e.totalAssets.amount,
          liabilities: e.totalLiabilities.amount,
          netPosition: e.netPosition.amount,
          percentOfTotal: e.percentage,
        }))
      ),
      trend: Object.freeze(historicalData ?? []),
    });
  }
  
  private buildAssetAllocationSection(
    view: ConsolidatedNetWorthView,
    targetAllocations?: Record<string, number>
  ): AssetAllocationSection {
    return Object.freeze({
      byAssetClass: Object.freeze(
        view.byAssetClass.map(ac => {
          const target = targetAllocations?.[ac.assetClass];
          return {
            assetClass: ac.displayName,
            value: ac.totalValue.amount,
            percentOfTotal: ac.percentage,
            targetPercent: target,
            variance: target !== undefined ? ac.percentage - target : undefined,
          };
        })
      ),
      byCurrency: Object.freeze(
        view.byCurrency.map(c => ({
          currency: c.currency,
          value: c.valueInBaseCurrency.amount,
          percentOfTotal: c.percentage,
        }))
      ),
      byGeography: Object.freeze([]), // Would require additional data
    });
  }
  
  private buildLiquiditySection(
    view: ConsolidatedNetWorthView,
    upcomingCashflows?: LiquiditySection['upcomingCashflows']
  ): LiquiditySection {
    // Find cash position from asset class breakdown
    const cashClass = view.byAssetClass.find(ac => ac.assetClass === 'cash');
    const cashPosition = cashClass?.totalValue.amount ?? 0;
    
    // Estimate liquid vs illiquid (simplified)
    const listedSecurities = view.byAssetClass.find(ac => ac.assetClass === 'listed_securities');
    const liquidAssets = cashPosition + (listedSecurities?.totalValue.amount ?? 0);
    const illiquidAssets = view.grossAssets.amount - liquidAssets;
    
    const liquidityRatio = view.grossAssets.amount > 0 
      ? (liquidAssets / view.grossAssets.amount) * 100 
      : 0;
    
    return Object.freeze({
      cashPosition,
      liquidAssets,
      illiquidAssets,
      liquidityRatio,
      upcomingCashflows: Object.freeze(upcomingCashflows ?? []),
    });
  }
  
  private buildUpcomingMattersSection(
    items?: UpcomingMattersSection['items']
  ): UpcomingMattersSection {
    return Object.freeze({
      items: Object.freeze(items ?? []),
    });
  }
  
  private buildDataQualitySection(view: ConsolidatedNetWorthView): DataQualitySection {
    const issues: string[] = [];
    
    if (view.dataQuality.assetsWithNoValuation > 0) {
      issues.push(`${view.dataQuality.assetsWithNoValuation} assets have no valuation data.`);
    }
    
    if (view.dataQuality.assetsWithStaleValuation > 0) {
      issues.push(`${view.dataQuality.assetsWithStaleValuation} assets have valuations older than ${view.dataQuality.staleDays} days.`);
    }
    
    return Object.freeze({
      overallScore: view.dataQuality.overallScore,
      assetsWithCurrentData: view.dataQuality.assetsWithCurrentValuation,
      assetsWithStaleData: view.dataQuality.assetsWithStaleValuation,
      assetsWithNoData: view.dataQuality.assetsWithNoValuation,
      issues: Object.freeze(issues),
    });
  }
  
  private generateReportId(): string {
    return `rpt_bp_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createBoardPackGenerator(
  tenantId: string,
  currency: string = 'AUD'
): BoardPackGenerator {
  return new BoardPackGenerator(tenantId, currency);
}
