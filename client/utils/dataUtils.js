// 数据处理工具类
export class DataUtils {
  // 判断是否为高点
  static isHighPoint(data, index) {
    if (index === 0 || index === data.length - 1) return false;
    const current = data[index];
    const prev = data[index - 1];
    const next = data[index + 1];
    return current.high > prev.high && current.high > next.high;
  }

  // 判断是否为低点
  static isLowPoint(data, index) {
    if (index === 0 || index === data.length - 1) return false;
    const current = data[index];
    const prev = data[index - 1];
    const next = data[index + 1];
    return current.low < prev.low && current.low < next.low;
  }

  // 计算回测结果统计
  static calculateBacktestStats(results) {
    const trades = results.filter(r => r.buy && r.sell);
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.delta > 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const avgReturn = trades.reduce((sum, t) => sum + t.delta, 0) / totalTrades;
    const totalReturn = trades.reduce((sum, t) => sum + t.delta, 0);

    return {
      totalTrades,
      winRate: winRate * 100, // 转换为百分比
      avgReturn,
      totalReturn
    };
  }

  // 格式化数字
  static formatNumber(num, decimals = 2) {
    return Number(num).toFixed(decimals);
  }

  // 格式化百分比
  static formatPercent(num, decimals = 2) {
    return `${this.formatNumber(num, decimals)}%`;
  }

  // 计算最大回撤
  static calculateMaxDrawdown(results) {
    let maxDrawdown = 0;
    let peak = 0;
    let currentReturn = 0;

    for (const result of results) {
      if (result.buy) {
        currentReturn = 0;
      }
      if (result.sell) {
        currentReturn += result.delta;
        peak = Math.max(peak, currentReturn);
        const drawdown = peak - currentReturn;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    return maxDrawdown;
  }
}
