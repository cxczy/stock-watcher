// 简化的技术指标计算工具类（避免复杂计算导致卡死）
export class SimpleIndicators {
  // 简单移动平均线
  static SMA(prices, period, index) {
    if (index < period - 1) return prices[index] || 0;
    const sum = prices.slice(index - period + 1, index + 1).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  // 指数移动平均线（简化版）
  static EMA(prices, period, index) {
    if (index < period - 1) return prices[index] || 0;
    const multiplier = 2 / (period + 1);
    let ema = prices[0] || 0;
    for (let i = 1; i <= index; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  }

  // 成交量比率（简化版）
  static volumeRatio(volumes, index, period = 5) {
    if (index < period - 1) return 1;
    const currentVolume = volumes[index] || 0;
    const avgVolume = volumes.slice(index - period + 1, index).reduce((a, b) => a + b, 0) / (period - 1);
    return avgVolume > 0 ? currentVolume / avgVolume : 1;
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

  // 计算RSI指标（简化版）
  static RSI(prices, period = 14, index) {
    if (index < period) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = index - period + 1; i <= index; i++) {
      if (i > 0) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
          gains += change;
        } else {
          losses += Math.abs(change);
        }
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // 计算MACD指标（简化版）
  static MACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9, index) {
    if (index < slowPeriod) return { macd: 0, signal: 0, histogram: 0 };
    
    const fastEMA = this.EMA(prices, fastPeriod, index);
    const slowEMA = this.EMA(prices, slowPeriod, index);
    const macd = fastEMA - slowEMA;
    
    // 简化信号线计算
    const signal = macd * 0.9; // 简化处理
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }

  // 计算KDJ指标（简化版，避免递归）
  static KDJ(highs, lows, closes, period = 9, index) {
    if (index < period - 1) return { k: 50, d: 50, j: 50 };
    
    const recentHighs = highs.slice(index - period + 1, index + 1);
    const recentLows = lows.slice(index - period + 1, index + 1);
    const recentCloses = closes.slice(index - period + 1, index + 1);
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    const currentClose = recentCloses[recentCloses.length - 1];
    
    if (highestHigh === lowestLow) return { k: 50, d: 50, j: 50 };
    
    const rsv = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // 简化KDJ计算
    const k = rsv;
    const d = rsv * 0.8; // 简化处理
    const j = 3 * k - 2 * d;
    
    return { k, d, j };
  }

  // 计算威廉指标（简化版）
  static WilliamsR(highs, lows, closes, period = 14, index) {
    if (index < period - 1) return 0;
    
    const recentHighs = highs.slice(index - period + 1, index + 1);
    const recentLows = lows.slice(index - period + 1, index + 1);
    const currentClose = closes[index];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    if (highestHigh === lowestLow) return 0;
    
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  }

  // 计算CCI指标（简化版）
  static CCI(highs, lows, closes, period = 20, index) {
    if (index < period - 1) return 0;
    
    const recentHighs = highs.slice(index - period + 1, index + 1);
    const recentLows = lows.slice(index - period + 1, index + 1);
    const recentCloses = closes.slice(index - period + 1, index + 1);
    
    const typicalPrices = recentHighs.map((high, i) => 
      (high + recentLows[i] + recentCloses[i]) / 3
    );
    
    const sma = typicalPrices.reduce((sum, tp) => sum + tp, 0) / period;
    const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
    
    if (meanDeviation === 0) return 0;
    
    const currentTP = (highs[index] + lows[index] + closes[index]) / 3;
    return (currentTP - sma) / (0.015 * meanDeviation);
  }

  // 判断MACD金叉（简化版）
  static isMACDGoldenCross(prices, fastPeriod = 12, slowPeriod = 26, index) {
    if (index < slowPeriod) return false;
    
    const current = this.MACD(prices, fastPeriod, slowPeriod, 9, index);
    const previous = this.MACD(prices, fastPeriod, slowPeriod, 9, index - 1);
    
    return previous.macd <= previous.signal && current.macd > current.signal;
  }

  // 判断MACD死叉（简化版）
  static isMACDDeadCross(prices, fastPeriod = 12, slowPeriod = 26, index) {
    if (index < slowPeriod) return false;
    
    const current = this.MACD(prices, fastPeriod, slowPeriod, 9, index);
    const previous = this.MACD(prices, fastPeriod, slowPeriod, 9, index - 1);
    
    return previous.macd >= previous.signal && current.macd < current.signal;
  }

  // 判断KDJ超卖（简化版）
  static isKDJOverSold(highs, lows, closes, period = 9, index) {
    const kdj = this.KDJ(highs, lows, closes, period, index);
    return kdj.k < 20 && kdj.d < 20;
  }

  // 判断KDJ超买（简化版）
  static isKDJOverBought(highs, lows, closes, period = 9, index) {
    const kdj = this.KDJ(highs, lows, closes, period, index);
    return kdj.k > 80 && kdj.d > 80;
  }

  // 判断双均线金叉（简化版）
  static isDualMAGoldenCross(prices, shortPeriod = 5, longPeriod = 20, index) {
    if (index < longPeriod) return false;
    
    const shortMA = this.SMA(prices, shortPeriod, index);
    const longMA = this.SMA(prices, longPeriod, index);
    const prevShortMA = this.SMA(prices, shortPeriod, index - 1);
    const prevLongMA = this.SMA(prices, longPeriod, index - 1);
    
    return prevShortMA <= prevLongMA && shortMA > longMA;
  }

  // 判断双均线死叉（简化版）
  static isDualMADeadCross(prices, shortPeriod = 5, longPeriod = 20, index) {
    if (index < longPeriod) return false;
    
    const shortMA = this.SMA(prices, shortPeriod, index);
    const longMA = this.SMA(prices, longPeriod, index);
    const prevShortMA = this.SMA(prices, shortPeriod, index - 1);
    const prevLongMA = this.SMA(prices, longPeriod, index - 1);
    
    return prevShortMA >= prevLongMA && shortMA < longMA;
  }
}
