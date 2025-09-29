import { TechnicalUtils } from './TechnicalUtils.js';

// 创N日新低策略
export class NewLowStrategy {
  constructor() {
    this.name = '创N日新低';
    this.description = '收盘价创N个周期新低，基于价格方差和动量计算置信度';
    this.params = {
      periods: { type: 'number', default: 7, min: 1, max: 50, label: '周期数' },
      minVarianceThreshold: { type: 'number', default: 0.001, min: 0.0001, max: 0.01, label: '最小方差阈值' }
    };
  }

  // 执行策略
  execute(klineData, params) {
    const { periods, minVarianceThreshold } = params;
    if (klineData.length < periods + 1) return { signal: 'neutral', confidence: 0 };
    
    const currentPrice = klineData[klineData.length - 1].close;
    const recentPrices = klineData.slice(-periods - 1, -1).map(d => d.close);
    const minRecentLow = Math.min(...recentPrices);
    
    if (currentPrice < minRecentLow) {
      // 计算价格方差（越小说明价格越稳定，突破越有意义）
      const variance = TechnicalUtils.calculateVariance(recentPrices);
      const coefficientOfVariation = TechnicalUtils.calculateCoefficientOfVariation(recentPrices);
      
      // 计算突破强度
      const breakoutStrength = TechnicalUtils.calculateBreakoutStrength(currentPrice, minRecentLow);
      
      // 计算价格动量（负值表示下跌）
      const momentum = TechnicalUtils.calculateMomentum(
        klineData.slice(-periods - 1).map(d => d.close), 
        Math.floor(periods / 2)
      );
      
      // 计算成交量确认（使用历史成交量，避免未来函数）
      const volumes = klineData.slice(-periods - 1).map(d => d.volume);
      const volumeConfirmation = TechnicalUtils.calculateVolumeConfirmation(volumes);
      
      // 综合置信度计算
      // 1. 方差越小，置信度越高（价格稳定，突破更有意义）
      const varianceConfidence = Math.max(0, 1 - coefficientOfVariation * 10);
      
      // 2. 突破强度越大，置信度越高
      const breakoutConfidence = Math.min(1, breakoutStrength * 20);
      
      // 3. 负动量越大，置信度越高（下跌趋势确认）
      const momentumConfidence = Math.min(1, Math.max(0, -momentum * 5));
      
      // 4. 成交量确认
      const volumeConfidence = Math.min(1, volumeConfirmation / 2);
      
      // 综合置信度（加权平均）
      const confidence = (
        varianceConfidence * 0.4 + 
        breakoutConfidence * 0.3 + 
        momentumConfidence * 0.2 + 
        volumeConfidence * 0.1
      );
      
      return { 
        signal: 'sell', 
        confidence: Math.min(0.95, Math.max(0.1, confidence)),
        details: {
          variance: variance,
          coefficientOfVariation: coefficientOfVariation,
          breakoutStrength: breakoutStrength,
          momentum: momentum,
          volumeConfirmation: volumeConfirmation
        }
      };
    }
    return { signal: 'neutral', confidence: 0 };
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
