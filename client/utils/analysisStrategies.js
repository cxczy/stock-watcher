// 技术分析策略配置
export const ANALYSIS_STRATEGIES = {
  intradayT: {
    name: '日内做T',
    description: '5分钟KDJ超卖/超买指标',
    timeframe: '5min',
    indicators: ['KDJ'],
    buyCondition: 'KDJ超卖',
    sellCondition: 'KDJ超买',
    riskLevel: 'high'
  },
  shortTrend: {
    name: '小级别趋势跟踪',
    description: '15分钟MA34和MA55双均线带',
    timeframe: '15min',
    indicators: ['MA34', 'MA55'],
    buyCondition: '价格在双均线带上方',
    sellCondition: '价格跌破双均线带',
    riskLevel: 'medium'
  },
  dailyTrend: {
    name: '日线趋势跟踪',
    description: '日K线收盘价不跌破MA8',
    timeframe: 'daily',
    indicators: ['MA8'],
    buyCondition: '价格在MA8上方',
    sellCondition: '价格跌破MA8',
    riskLevel: 'low'
  },
  macdTrend: {
    name: 'MACD趋势跟踪',
    description: '日线MACD金叉/死叉',
    timeframe: 'daily',
    indicators: ['MACD'],
    buyCondition: 'MACD金叉',
    sellCondition: 'MACD死叉',
    riskLevel: 'medium'
  },
  rsiOversold: {
    name: 'RSI超卖反弹',
    description: '日线RSI超卖后反弹',
    timeframe: 'daily',
    indicators: ['RSI'],
    buyCondition: 'RSI < 30',
    sellCondition: 'RSI > 70',
    riskLevel: 'medium'
  }
};

// 技术分析执行器
export class AnalysisExecutor {
  static async executeStrategy(klineData, strategy, customParams = {}) {
    const prices = klineData.map(d => d.close);
    const highs = klineData.map(d => d.high);
    const lows = klineData.map(d => d.low);
    const volumes = klineData.map(d => d.volume);
    const latestIndex = klineData.length - 1;

    const results = {
      strategy: strategy,
      timestamp: new Date().toLocaleString(),
      signals: {},
      indicators: {},
      recommendation: 'hold',
      confidence: 0,
      riskLevel: ANALYSIS_STRATEGIES[strategy].riskLevel
    };

    switch (strategy) {
      case 'intradayT':
        return this.executeIntradayT(prices, highs, lows, latestIndex, results);
      
      case 'shortTrend':
        return this.executeShortTrend(prices, latestIndex, results);
      
      case 'dailyTrend':
        return this.executeDailyTrend(prices, latestIndex, results);
      
      case 'macdTrend':
        return this.executeMacdTrend(prices, latestIndex, results);
      
      case 'rsiOversold':
        return this.executeRsiOversold(prices, latestIndex, results);
      
      default:
        return results;
    }
  }

  // 日内做T策略
  static executeIntradayT(prices, highs, lows, latestIndex, results) {
    const kdj = SimpleIndicators.KDJ(highs, lows, prices, 9, latestIndex);
    results.indicators.kdj = kdj;
    
    if (kdj.k < 20 && kdj.d < 20) {
      results.signals.kdjOverSold = true;
      results.recommendation = 'buy';
      results.confidence = Math.max(0, (20 - kdj.k) / 20 * 100);
    } else if (kdj.k > 80 && kdj.d > 80) {
      results.signals.kdjOverBought = true;
      results.recommendation = 'sell';
      results.confidence = Math.max(0, (kdj.k - 80) / 20 * 100);
    }
    
    return results;
  }

  // 小级别趋势跟踪策略
  static executeShortTrend(prices, latestIndex, results) {
    const ma34 = SimpleIndicators.SMA(prices, 34, latestIndex);
    const ma55 = SimpleIndicators.SMA(prices, 55, latestIndex);
    results.indicators.ma34 = ma34;
    results.indicators.ma55 = ma55;
    
    const currentPrice = prices[latestIndex];
    const ma34Price = ma34;
    const ma55Price = ma55;
    
    // 检查最近20根K线是否在双均线带内或上方
    const recent20 = prices.slice(-20);
    const recent20AboveMA34 = recent20.every(price => price >= ma34Price);
    const recent20AboveMA55 = recent20.every(price => price >= ma55Price);
    
    if (recent20AboveMA34 && recent20AboveMA55) {
      results.signals.trendStrong = true;
      results.recommendation = 'hold';
      results.confidence = 80;
    } else if (currentPrice < ma55Price) {
      results.signals.trendWeak = true;
      results.recommendation = 'sell';
      results.confidence = 70;
    }
    
    return results;
  }

  // 日线趋势跟踪策略
  static executeDailyTrend(prices, latestIndex, results) {
    const ma8 = SimpleIndicators.SMA(prices, 8, latestIndex);
    results.indicators.ma8 = ma8;
    
    const currentPrice = prices[latestIndex];
    
    if (currentPrice >= ma8) {
      results.signals.aboveMA8 = true;
      results.recommendation = 'hold';
      results.confidence = 85;
    } else {
      results.signals.belowMA8 = true;
      results.recommendation = 'sell';
      results.confidence = 75;
    }
    
    return results;
  }

  // MACD趋势跟踪策略
  static executeMacdTrend(prices, latestIndex, results) {
    const macd = SimpleIndicators.MACD(prices, 12, 26, 9, latestIndex);
    results.indicators.macd = macd;
    
    if (macd.macd > macd.signal) {
      results.signals.macdGoldenCross = true;
      results.recommendation = 'buy';
      results.confidence = 70;
    } else if (macd.macd < macd.signal) {
      results.signals.macdDeadCross = true;
      results.recommendation = 'sell';
      results.confidence = 70;
    }
    
    return results;
  }

  // RSI超卖反弹策略
  static executeRsiOversold(prices, latestIndex, results) {
    const rsi = SimpleIndicators.RSI(prices, 14, latestIndex);
    results.indicators.rsi = rsi;
    
    if (rsi < 30) {
      results.signals.rsiOverSold = true;
      results.recommendation = 'buy';
      results.confidence = Math.max(0, (30 - rsi) / 30 * 100);
    } else if (rsi > 70) {
      results.signals.rsiOverBought = true;
      results.recommendation = 'sell';
      results.confidence = Math.max(0, (rsi - 70) / 30 * 100);
    }
    
    return results;
  }
}

// 导入SimpleIndicators
import { SimpleIndicators } from './simpleIndicators.js';
