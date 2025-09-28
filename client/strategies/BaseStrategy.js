// 回测策略基类
export class BaseStrategy {
  constructor() {
    this.name = 'BaseStrategy';
  }

  // 计算收益率
  calculateDelta(buyPrice, sellPrice) {
    return ((sellPrice - buyPrice) / buyPrice) * 100;
  }

  // 执行策略（子类需要实现）
  execute(data, params) {
    throw new Error('子类必须实现execute方法');
  }

  // 获取策略名称
  getName() {
    return this.name;
  }
}
