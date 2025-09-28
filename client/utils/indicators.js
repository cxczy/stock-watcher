// 技术指标计算工具类
export class TechnicalIndicators {
  // 简单移动平均线
  static SMA(prices, period, index) {
    if (index < period - 1) return prices[index];
    const sum = prices.slice(index - period + 1, index + 1).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  // 指数移动平均线
  static EMA(prices, period, index) {
    if (index < period - 1) return prices[index];
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i <= index; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  }

  // 成交量比率
  static volumeRatio(volumes, index, period = 5) {
    if (index < period - 1) return 1;
    const currentVolume = volumes[index];
    const avgVolume = volumes.slice(index - period + 1, index).reduce((a, b) => a + b, 0) / (period - 1);
    return currentVolume / avgVolume;
  }

  // 连续下跌天数
  static continuousDown(prices, index) {
    let count = 0;
    let pos = index || prices.length - 1;
    while (pos > 0 && prices[pos] < prices[pos - 1]) {
      pos--;
      count++;
    }
    return count;
  }

  // 连续上涨天数
  static continuousUp(prices, index) {
    let count = 0;
    let pos = index || prices.length - 1;
    while (pos > 0 && prices[pos] > prices[pos - 1]) {
      pos--;
      count++;
    }
    return count;
  }

  // 计算RSI指标
  static RSI(prices, period = 14, index) {
    if (index < period) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = index - period + 1; i <= index; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // 计算MACD指标
  static MACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9, index) {
    if (index < slowPeriod) return { macd: 0, signal: 0, histogram: 0 };
    
    const fastEMA = this.EMA(prices, fastPeriod, index);
    const slowEMA = this.EMA(prices, slowPeriod, index);
    const macd = fastEMA - slowEMA;
    
    // 这里简化处理，实际需要维护EMA数组
    const signal = macd; // 简化处理
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }
}
