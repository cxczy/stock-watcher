import { TechnicalUtils } from './TechnicalUtils.js';

// 双均线短线策略 - 专门用于15分钟级别
export class DualMAStrategy {
  constructor() {
    this.name = '双均线短线策略';
    this.description = '基于MA34和MA55双均线的短线趋势跟踪策略，适用于15分钟级别T+1交易';
    this.params = {
      maShort: { type: 'number', default: 34, min: 20, max: 50, label: '短期均线周期' },
      maLong: { type: 'number', default: 55, min: 40, max: 80, label: '长期均线周期' },
      minKlineCount: { type: 'number', default: 60, min: 50, max: 100, label: '最小K线数量' }
    };
  }

  // 计算移动平均线
  calculateMA(prices, period) {
    if (prices.length < period) return null;
    
    const ma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((acc, price) => acc + price, 0);
      ma.push(sum / period);
    }
    return ma;
  }

  // 计算均线带强度
  calculateMABandStrength(maShort, maLong) {
    if (maShort.length < 2 || maLong.length < 2) return 0;
    
    const latestShort = maShort[maShort.length - 1];
    const latestLong = maLong[maLong.length - 1];
    const prevShort = maShort[maShort.length - 2];
    const prevLong = maLong[maLong.length - 2];
    
    // 计算均线斜率
    const shortSlope = (latestShort - prevShort) / prevShort;
    const longSlope = (latestLong - prevLong) / prevLong;
    
    // 计算均线距离
    const maDistance = Math.abs(latestShort - latestLong) / latestLong;
    
    // 计算均线带强度（斜率一致性和距离）
    const slopeConsistency = Math.abs(shortSlope - longSlope) < 0.001 ? 1 : 0.5;
    const distanceStrength = Math.min(1, maDistance * 10); // 距离越大强度越高
    
    return slopeConsistency * 0.6 + distanceStrength * 0.4;
  }

  // 计算价格与均线带的关系
  calculatePriceMABandRelation(price, maShort, maLong) {
    if (!maShort || !maLong || maShort.length === 0 || maLong.length === 0) {
      return { relation: 'neutral', strength: 0 };
    }
    
    const latestShort = maShort[maShort.length - 1];
    const latestLong = maLong[maLong.length - 1];
    
    // 确定均线带的上轨和下轨
    const upperBand = Math.max(latestShort, latestLong);
    const lowerBand = Math.min(latestShort, latestLong);
    
    // 计算价格与均线带的关系
    let relation = 'neutral';
    let strength = 0;
    
    if (price > upperBand) {
      relation = 'above';
      // 计算突破强度
      strength = (price - upperBand) / upperBand;
    } else if (price < lowerBand) {
      relation = 'below';
      // 计算跌破强度
      strength = (lowerBand - price) / lowerBand;
    } else {
      relation = 'inside';
      // 计算在均线带内的位置
      const bandWidth = upperBand - lowerBand;
      if (bandWidth > 0) {
        const position = (price - lowerBand) / bandWidth;
        strength = position > 0.5 ? position : 1 - position;
      }
    }
    
    return { relation, strength };
  }

  // 执行策略
  execute(klineData, params) {
    const { maShort: shortPeriod, maLong: longPeriod, minKlineCount } = params;
    
    // 检查数据量是否足够（需要额外8根K线用于历史信号检查）
    if (klineData.length < Math.max(shortPeriod, longPeriod, minKlineCount) + 8) {
      return { signal: 'neutral', confidence: 0 };
    }

    const prices = klineData.map(d => d.close);
    const volumes = klineData.map(d => d.volume);
    
    // 计算双均线
    const maShort = this.calculateMA(prices, shortPeriod);
    const maLong = this.calculateMA(prices, longPeriod);
    
    if (!maShort || !maLong || maShort.length < 8) {
      return { signal: 'neutral', confidence: 0 };
    }

    // 计算均线带强度
    const maBandStrength = this.calculateMABandStrength(maShort, maLong);
    
    // 计算成交量确认
    const volumeConfirmation = TechnicalUtils.calculateVolumeConfirmation(volumes);
    
    // 计算价格动量
    const momentum = TechnicalUtils.calculateMomentum(prices, 5);
    
    let signal = 'neutral';
    let confidence = 0;
    let details = {};
    let signalReason = '';

    // 检查过去8根K线中是否有符合买点条件的情况
    const lookbackPeriod = 8;
    const recentPrices = prices.slice(-lookbackPeriod);
    const recentMAShort = maShort.slice(-lookbackPeriod);
    const recentMALong = maLong.slice(-lookbackPeriod);
    
    let buySignalFound = false;
    let sellSignalFound = false;
    let bestBuyConfidence = 0;
    let bestSellConfidence = 0;
    let bestBuyIndex = -1;
    let bestSellIndex = -1;

    // 遍历过去8根K线寻找信号
    for (let i = 1; i < lookbackPeriod; i++) {
      const currentPrice = recentPrices[i];
      const prevPrice = recentPrices[i - 1];
      
      // 计算当前K线价格与均线带的关系
      const currentPriceRelation = this.calculatePriceMABandRelation(currentPrice, recentMAShort, recentMALong);
      
      // 计算前一根K线价格与均线带的关系
      const prevMAShort = recentMAShort.slice(0, i);
      const prevMALong = recentMALong.slice(0, i);
      const prevPriceRelation = this.calculatePriceMABandRelation(prevPrice, prevMAShort, prevMALong);
      
      // 检查买入信号：当前突破且前一根未突破
      if (currentPriceRelation.relation === 'above' && prevPriceRelation.relation !== 'above') {
        buySignalFound = true;
        const signalConfidence = 0.6 + currentPriceRelation.strength * 0.3 + maBandStrength * 0.1;
        
        // 成交量确认
        let adjustedConfidence = signalConfidence;
        if (volumeConfirmation > 1.2) {
          adjustedConfidence += 0.1;
        }
        
        // 动量确认
        if (momentum > 0.01) {
          adjustedConfidence += 0.05;
        }
        
        // 记录最佳买入信号
        if (adjustedConfidence > bestBuyConfidence) {
          bestBuyConfidence = adjustedConfidence;
          bestBuyIndex = i;
        }
      }
      
      // 检查卖出信号：当前跌破且前一根未跌破
      if (currentPriceRelation.relation === 'below' && prevPriceRelation.relation !== 'below') {
        sellSignalFound = true;
        const signalConfidence = 0.6 + currentPriceRelation.strength * 0.3 + maBandStrength * 0.1;
        
        // 成交量确认
        let adjustedConfidence = signalConfidence;
        if (volumeConfirmation > 1.2) {
          adjustedConfidence += 0.1;
        }
        
        // 动量确认
        if (momentum < -0.01) {
          adjustedConfidence += 0.05;
        }
        
        // 记录最佳卖出信号
        if (adjustedConfidence > bestSellConfidence) {
          bestSellConfidence = adjustedConfidence;
          bestSellIndex = i;
        }
      }
    }

    // 确定最终信号（优先买入信号）
    if (buySignalFound && bestBuyConfidence > bestSellConfidence) {
      signal = 'buy';
      confidence = bestBuyConfidence;
      signalReason = `过去8根K线中发现买入信号（第${lookbackPeriod - bestBuyIndex}根K线前）`;
    } else if (sellSignalFound) {
      signal = 'sell';
      confidence = bestSellConfidence;
      signalReason = `过去8根K线中发现卖出信号（第${lookbackPeriod - bestSellIndex}根K线前）`;
    }

    // 构建详细信息
    if (signal !== 'neutral') {
      const currentPrice = prices[prices.length - 1];
      const currentPriceRelation = this.calculatePriceMABandRelation(currentPrice, maShort, maLong);
      
      details = {
        strategy: 'dual_ma',
        maShort: maShort[maShort.length - 1],
        maLong: maLong[maLong.length - 1],
        currentPriceRelation: currentPriceRelation.relation,
        maBandStrength: maBandStrength,
        volumeConfirmation: volumeConfirmation,
        momentum: momentum,
        signalReason: signalReason,
        lookbackPeriod: lookbackPeriod,
        buySignalFound: buySignalFound,
        sellSignalFound: sellSignalFound,
        bestBuyConfidence: bestBuyConfidence,
        bestSellConfidence: bestSellConfidence
      };
    }

    // 限制置信度范围
    confidence = Math.min(0.95, Math.max(0.1, confidence));

    return { signal, confidence, details };
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
