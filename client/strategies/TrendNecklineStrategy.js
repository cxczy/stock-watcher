import { TechnicalUtils } from './TechnicalUtils.js';

// 广义趋势理论策略
export class TrendNecklineStrategy {
  constructor() {
    this.name = '广义趋势理论';
    this.description = '基于趋势识别，颈线突破买卖，量价分析持有';
    this.params = {
      trendPeriod: { type: 'number', default: 20, min: 10, max: 50, label: '趋势识别周期' },
      necklinePeriod: { type: 'number', default: 10, min: 5, max: 30, label: '颈线识别周期' },
      volumeThreshold: { type: 'number', default: 1.5, min: 1.0, max: 3.0, label: '放量阈值' }
    };
  }

  // 执行策略
  execute(klineData, params) {
    const { trendPeriod, necklinePeriod, volumeThreshold } = params;
    if (klineData.length < Math.max(trendPeriod, necklinePeriod) + 5) {
      return { signal: 'neutral', confidence: 0 };
    }

    const prices = klineData.map(d => d.close);
    const highs = klineData.map(d => d.high);
    const lows = klineData.map(d => d.low);
    const volumes = klineData.map(d => d.volume);
    const latestIndex = klineData.length - 1;

    // 1. 趋势识别
    const trend = TechnicalUtils.identifyTrend(prices, trendPeriod, latestIndex);
    
    // 2. 颈线识别
    const neckline = TechnicalUtils.identifyNeckline(highs, lows, necklinePeriod, latestIndex);
    
    // 3. 量价分析
    const volumeAnalysis = TechnicalUtils.analyzeVolumePrice(volumes, prices, latestIndex, volumeThreshold);
    
    // 4. 买卖信号判断 - 基于广义趋势理论
    const currentPrice = prices[latestIndex];
    const currentVolume = volumes[latestIndex];
    
    let signal = 'neutral';
    let confidence = 0;
    let details = {};

    // 买入逻辑：上升趋势中回踩颈线附近（左侧或右侧进场）
    if (trend === 'uptrend' && neckline) {
      const necklineDistance = Math.abs(currentPrice - neckline) / neckline;
      const isNearNeckline = necklineDistance <= 0.03; // 颈线附近3%范围内
      
      if (isNearNeckline) {
        // 回踩颈线附近，左侧或右侧进场
        signal = 'buy';
        confidence = 0.7 + (volumeAnalysis.volumeRatio - 1) * 0.2;
        details = {
          trend: 'uptrend',
          necklineRetracement: true,
          necklineDistance: necklineDistance,
          volumeRatio: volumeAnalysis.volumeRatio,
          entryType: currentPrice <= neckline ? 'left' : 'right'
        };
      }
    }
    
    // 卖出逻辑：放巨量或跌破买入位置3%以上
    if (trend === 'downtrend' || volumeAnalysis.volumeRatio > 2.0) {
      // 放巨量卖出（成交量超过2倍）
      if (volumeAnalysis.volumeRatio > 2.0) {
        signal = 'sell';
        confidence = 0.8;
        details = {
          trend: trend,
          hugeVolume: true,
          volumeRatio: volumeAnalysis.volumeRatio,
          sellReason: '放巨量'
        };
      }
      // 跌破颈线3%以上卖出
      else if (neckline && currentPrice < neckline * 0.97) {
        signal = 'sell';
        confidence = 0.8;
        details = {
          trend: trend,
          necklineBreakdown: true,
          breakdownPercent: ((neckline - currentPrice) / neckline * 100).toFixed(2),
          sellReason: '跌破颈线3%以上'
        };
      }
    }

    return { signal, confidence: Math.min(0.95, confidence), details };
  }

  // 获取策略信息
  getInfo() {
    return {
      name: this.name,
      description: this.description,
      params: this.params
    };
  }
}
