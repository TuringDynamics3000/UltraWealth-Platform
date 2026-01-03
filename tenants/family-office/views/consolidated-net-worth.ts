/**
 * Consolidated Net Worth View
 * 
 * Aggregates all external assets across all entities to produce
 * a consolidated net worth statement.
 * 
 * This is a READ-ONLY view that consolidates visibility.
 * It does NOT hold balances or execute transactions.
 */

import { Entity } from '../domain/entities';
import { ExternalAsset, AssetClass, Valuation } from '../domain/external-assets';

// =============================================================================
// TYPES
// =============================================================================

export interface ConsolidatedNetWorthView {
  /** View generation timestamp */
  readonly asAt: Date;
  
  /** Total gross assets */
  readonly grossAssets: Money;
  
  /** Total liabilities */
  readonly totalLiabilities: Money;
  
  /** Net worth (gross assets - liabilities) */
  readonly netWorth: Money;
  
  /** Breakdown by asset class */
  readonly byAssetClass: readonly AssetClassSummary[];
  
  /** Breakdown by entity */
  readonly byEntity: readonly EntitySummary[];
  
  /** Breakdown by currency */
  readonly byCurrency: readonly CurrencySummary[];
  
  /** Data quality indicators */
  readonly dataQuality: DataQuality;
}

export interface Money {
  readonly amount: number;
  readonly currency: string;
}

export interface AssetClassSummary {
  readonly assetClass: AssetClass;
  readonly displayName: string;
  readonly totalValue: Money;
  readonly percentage: number;
  readonly assetCount: number;
}

export interface EntitySummary {
  readonly entityId: string;
  readonly entityName: string;
  readonly entityType: string;
  readonly totalAssets: Money;
  readonly totalLiabilities: Money;
  readonly netPosition: Money;
  readonly percentage: number;
}

export interface CurrencySummary {
  readonly currency: string;
  readonly totalValue: Money;
  readonly valueInBaseCurrency: Money;
  readonly exchangeRate: number;
  readonly percentage: number;
}

export interface DataQuality {
  readonly totalAssets: number;
  readonly assetsWithCurrentValuation: number;
  readonly assetsWithStaleValuation: number;
  readonly assetsWithNoValuation: number;
  readonly staleDays: number;
  readonly overallScore: number;
}

// =============================================================================
// VIEW BUILDER
// =============================================================================

export class ConsolidatedNetWorthViewBuilder {
  private readonly baseCurrency: string;
  private readonly staleDaysThreshold: number;
  
  constructor(baseCurrency: string = 'AUD', staleDaysThreshold: number = 30) {
    this.baseCurrency = baseCurrency;
    this.staleDaysThreshold = staleDaysThreshold;
  }
  
  /**
   * Build the consolidated net worth view.
   */
  build(
    entities: readonly Entity[],
    assets: readonly ExternalAsset[],
    liabilities: readonly { entityId: string; amount: number; currency: string }[],
    exchangeRates: Record<string, number>
  ): ConsolidatedNetWorthView {
    const asAt = new Date();
    
    // Calculate totals
    const grossAssets = this.calculateGrossAssets(assets, exchangeRates);
    const totalLiabilities = this.calculateTotalLiabilities(liabilities, exchangeRates);
    const netWorth = {
      amount: grossAssets.amount - totalLiabilities.amount,
      currency: this.baseCurrency,
    };
    
    // Build breakdowns
    const byAssetClass = this.buildAssetClassBreakdown(assets, exchangeRates, grossAssets.amount);
    const byEntity = this.buildEntityBreakdown(entities, assets, liabilities, exchangeRates, grossAssets.amount);
    const byCurrency = this.buildCurrencyBreakdown(assets, exchangeRates, grossAssets.amount);
    
    // Calculate data quality
    const dataQuality = this.calculateDataQuality(assets, asAt);
    
    return Object.freeze({
      asAt,
      grossAssets,
      totalLiabilities,
      netWorth,
      byAssetClass: Object.freeze(byAssetClass),
      byEntity: Object.freeze(byEntity),
      byCurrency: Object.freeze(byCurrency),
      dataQuality,
    });
  }
  
  private calculateGrossAssets(
    assets: readonly ExternalAsset[],
    exchangeRates: Record<string, number>
  ): Money {
    let total = 0;
    
    for (const asset of assets) {
      if (asset.status !== 'active') continue;
      if (!asset.currentValuation) continue;
      
      const valueInBase = this.convertToBaseCurrency(
        asset.currentValuation.amount,
        asset.currentValuation.currency,
        exchangeRates
      );
      total += valueInBase;
    }
    
    return { amount: total, currency: this.baseCurrency };
  }
  
  private calculateTotalLiabilities(
    liabilities: readonly { entityId: string; amount: number; currency: string }[],
    exchangeRates: Record<string, number>
  ): Money {
    let total = 0;
    
    for (const liability of liabilities) {
      const valueInBase = this.convertToBaseCurrency(
        liability.amount,
        liability.currency,
        exchangeRates
      );
      total += valueInBase;
    }
    
    return { amount: total, currency: this.baseCurrency };
  }
  
  private buildAssetClassBreakdown(
    assets: readonly ExternalAsset[],
    exchangeRates: Record<string, number>,
    totalGross: number
  ): AssetClassSummary[] {
    const byClass = new Map<AssetClass, { total: number; count: number }>();
    
    for (const asset of assets) {
      if (asset.status !== 'active') continue;
      if (!asset.currentValuation) continue;
      
      const valueInBase = this.convertToBaseCurrency(
        asset.currentValuation.amount,
        asset.currentValuation.currency,
        exchangeRates
      );
      
      const existing = byClass.get(asset.assetClass) ?? { total: 0, count: 0 };
      byClass.set(asset.assetClass, {
        total: existing.total + valueInBase,
        count: existing.count + 1,
      });
    }
    
    const displayNames: Record<AssetClass, string> = {
      listed_securities: 'Listed Securities',
      managed_funds: 'Managed Funds',
      private_equity: 'Private Equity',
      real_property: 'Real Property',
      cash: 'Cash & Deposits',
      fixed_income: 'Fixed Income',
      alternatives: 'Alternative Investments',
      collectibles: 'Collectibles',
      crypto: 'Digital Assets',
    };
    
    return Array.from(byClass.entries())
      .map(([assetClass, data]) => ({
        assetClass,
        displayName: displayNames[assetClass] ?? assetClass,
        totalValue: { amount: data.total, currency: this.baseCurrency },
        percentage: totalGross > 0 ? (data.total / totalGross) * 100 : 0,
        assetCount: data.count,
      }))
      .sort((a, b) => b.totalValue.amount - a.totalValue.amount);
  }
  
  private buildEntityBreakdown(
    entities: readonly Entity[],
    assets: readonly ExternalAsset[],
    liabilities: readonly { entityId: string; amount: number; currency: string }[],
    exchangeRates: Record<string, number>,
    totalGross: number
  ): EntitySummary[] {
    const entityMap = new Map(entities.map(e => [e.id, e]));
    const assetsByEntity = new Map<string, number>();
    const liabilitiesByEntity = new Map<string, number>();
    
    // Sum assets by entity
    for (const asset of assets) {
      if (asset.status !== 'active') continue;
      if (!asset.currentValuation) continue;
      
      const valueInBase = this.convertToBaseCurrency(
        asset.currentValuation.amount,
        asset.currentValuation.currency,
        exchangeRates
      );
      
      const existing = assetsByEntity.get(asset.ownerEntityId) ?? 0;
      assetsByEntity.set(asset.ownerEntityId, existing + valueInBase);
    }
    
    // Sum liabilities by entity
    for (const liability of liabilities) {
      const valueInBase = this.convertToBaseCurrency(
        liability.amount,
        liability.currency,
        exchangeRates
      );
      
      const existing = liabilitiesByEntity.get(liability.entityId) ?? 0;
      liabilitiesByEntity.set(liability.entityId, existing + valueInBase);
    }
    
    // Build summaries
    const summaries: EntitySummary[] = [];
    
    for (const entity of entities) {
      const totalAssets = assetsByEntity.get(entity.id) ?? 0;
      const totalLiabs = liabilitiesByEntity.get(entity.id) ?? 0;
      const netPosition = totalAssets - totalLiabs;
      
      if (totalAssets > 0 || totalLiabs > 0) {
        summaries.push({
          entityId: entity.id,
          entityName: entity.name,
          entityType: entity.type,
          totalAssets: { amount: totalAssets, currency: this.baseCurrency },
          totalLiabilities: { amount: totalLiabs, currency: this.baseCurrency },
          netPosition: { amount: netPosition, currency: this.baseCurrency },
          percentage: totalGross > 0 ? (totalAssets / totalGross) * 100 : 0,
        });
      }
    }
    
    return summaries.sort((a, b) => b.totalAssets.amount - a.totalAssets.amount);
  }
  
  private buildCurrencyBreakdown(
    assets: readonly ExternalAsset[],
    exchangeRates: Record<string, number>,
    totalGross: number
  ): CurrencySummary[] {
    const byCurrency = new Map<string, number>();
    
    for (const asset of assets) {
      if (asset.status !== 'active') continue;
      if (!asset.currentValuation) continue;
      
      const currency = asset.currentValuation.currency;
      const existing = byCurrency.get(currency) ?? 0;
      byCurrency.set(currency, existing + asset.currentValuation.amount);
    }
    
    return Array.from(byCurrency.entries())
      .map(([currency, total]) => {
        const rate = exchangeRates[currency] ?? 1;
        const valueInBase = total * rate;
        
        return {
          currency,
          totalValue: { amount: total, currency },
          valueInBaseCurrency: { amount: valueInBase, currency: this.baseCurrency },
          exchangeRate: rate,
          percentage: totalGross > 0 ? (valueInBase / totalGross) * 100 : 0,
        };
      })
      .sort((a, b) => b.valueInBaseCurrency.amount - a.valueInBaseCurrency.amount);
  }
  
  private calculateDataQuality(
    assets: readonly ExternalAsset[],
    asAt: Date
  ): DataQuality {
    const activeAssets = assets.filter(a => a.status === 'active');
    const total = activeAssets.length;
    
    let current = 0;
    let stale = 0;
    let none = 0;
    
    for (const asset of activeAssets) {
      if (!asset.currentValuation) {
        none++;
      } else {
        const daysSinceValuation = Math.floor(
          (asAt.getTime() - asset.currentValuation.asAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceValuation <= this.staleDaysThreshold) {
          current++;
        } else {
          stale++;
        }
      }
    }
    
    const score = total > 0 ? Math.round((current / total) * 100) : 100;
    
    return {
      totalAssets: total,
      assetsWithCurrentValuation: current,
      assetsWithStaleValuation: stale,
      assetsWithNoValuation: none,
      staleDays: this.staleDaysThreshold,
      overallScore: score,
    };
  }
  
  private convertToBaseCurrency(
    amount: number,
    currency: string,
    exchangeRates: Record<string, number>
  ): number {
    if (currency === this.baseCurrency) return amount;
    const rate = exchangeRates[currency] ?? 1;
    return amount * rate;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createConsolidatedNetWorthView(
  baseCurrency: string = 'AUD'
): ConsolidatedNetWorthViewBuilder {
  return new ConsolidatedNetWorthViewBuilder(baseCurrency);
}
