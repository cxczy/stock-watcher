// 技术分析工具函数
export const TechnicalUtils = {
  // 计算价格方差
  calculateVariance: (prices) => {
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return variance;
  },
  
  // 计算价格标准差
  calculateStdDev: (prices) => {
    return Math.sqrt(TechnicalUtils.calculateVariance(prices));
  },
  
  // 计算价格变异系数（标准差/均值）
  calculateCoefficientOfVariation: (prices) => {
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const stdDev = TechnicalUtils.calculateStdDev(prices);
    return stdDev / mean;
  },
  
  // 计算价格动量（当前价格相对于N期前的变化率）
  calculateMomentum: (prices, periods) => {
    if (prices.length < periods + 1) return 0;
    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - 1 - periods];
    return (currentPrice - pastPrice) / pastPrice;
  },
  
  // 计算价格突破强度（突破幅度）
  calculateBreakoutStrength: (currentPrice, referencePrice) => {
    return Math.abs(currentPrice - referencePrice) / referencePrice;
  },
  
  // 计算成交量确认度（当前成交量相对于历史平均成交量的比率）
  calculateVolumeConfirmation: (volumes) => {
    if (volumes.length < 2) return 1;
    const currentVolume = volumes[volumes.length - 1];
    // 使用历史成交量计算平均值，避免未来函数
    const historicalVolumes = volumes.slice(0, -1);
    const avgVolume = historicalVolumes.reduce((sum, vol) => sum + vol, 0) / historicalVolumes.length;
    return currentVolume / avgVolume;
  },

  // 趋势识别 - 基于广义趋势理论
  identifyTrend: (prices, period, currentIndex) => {
    if (prices.length < period + 1) return 'neutral';
    
    const recentPrices = prices.slice(-period);
    const startPrice = recentPrices[0];
    const endPrice = recentPrices[recentPrices.length - 1];
    
    // 计算价格变化率
    const priceChange = (endPrice - startPrice) / startPrice;
    
    // 计算均线斜率
    const ma5 = recentPrices.slice(-5).reduce((sum, p) => sum + p, 0) / 5;
    const ma10 = recentPrices.slice(-10).reduce((sum, p) => sum + p, 0) / 10;
    const ma20 = recentPrices.reduce((sum, p) => sum + p, 0) / period;
    
    // 趋势判断
    if (priceChange > 0.05 && ma5 > ma10 && ma10 > ma20) {
      return 'uptrend';
    } else if (priceChange < -0.05 && ma5 < ma10 && ma10 < ma20) {
      return 'downtrend';
    } else {
      return 'sideways';
    }
  },

  // 颈线识别 - 寻找重要的支撑阻力位
  identifyNeckline: (highs, lows, period, currentIndex) => {
    if (highs.length < period + 1) return null;
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    // 寻找重要的高低点
    const significantHighs = [];
    const significantLows = [];
    
    for (let i = 1; i < recentHighs.length - 1; i++) {
      // 寻找局部高点
      if (recentHighs[i] > recentHighs[i-1] && recentHighs[i] > recentHighs[i+1]) {
        significantHighs.push(recentHighs[i]);
      }
      // 寻找局部低点
      if (recentLows[i] < recentLows[i-1] && recentLows[i] < recentLows[i+1]) {
        significantLows.push(recentLows[i]);
      }
    }
    
    // 计算颈线位置（重要高低点的平均值）
    if (significantHighs.length > 0 && significantLows.length > 0) {
      const avgHigh = significantHighs.reduce((sum, h) => sum + h, 0) / significantHighs.length;
      const avgLow = significantLows.reduce((sum, l) => sum + l, 0) / significantLows.length;
      return (avgHigh + avgLow) / 2;
    }
    
    return null;
  },

  // 量价分析 - 分析成交量和价格的关系
  analyzeVolumePrice: (volumes, prices, currentIndex, threshold) => {
    if (volumes.length < 10) return { isVolumeBreakout: false, volumeRatio: 1 };
    
    const currentVolume = volumes[currentIndex];
    const currentPrice = prices[currentIndex];
    
    // 计算近期平均成交量
    const recentVolumes = volumes.slice(-10, -1);
    const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
    
    // 计算成交量比率
    const volumeRatio = currentVolume / avgVolume;
    
    // 计算价格变化
    const priceChange = (currentPrice - prices[currentIndex - 1]) / prices[currentIndex - 1];
    
    // 量价分析
    const isVolumeBreakout = volumeRatio > threshold;
    const isPriceVolumeMatch = (priceChange > 0 && volumeRatio > 1.2) || (priceChange < 0 && volumeRatio > 1.2);
    
    return {
      isVolumeBreakout,
      volumeRatio,
      isPriceVolumeMatch,
      priceChange
    };
  }
};
