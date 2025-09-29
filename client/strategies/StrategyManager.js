import { TrendNecklineStrategy } from './TrendNecklineStrategy.js';
import { NewHighStrategy } from './NewHighStrategy.js';
import { NewLowStrategy } from './NewLowStrategy.js';
import { DualMAStrategy } from './DualMAStrategy.js';

// 策略管理器
export class StrategyManager {
  constructor() {
    this.strategies = new Map();
    this.registerDefaultStrategies();
  }

  // 注册默认策略
  registerDefaultStrategies() {
    this.register('trendNeckline', new TrendNecklineStrategy());
    this.register('newHigh', new NewHighStrategy());
    this.register('newLow', new NewLowStrategy());
    this.register('dualMA', new DualMAStrategy());
  }

  // 注册策略
  register(key, strategy) {
    this.strategies.set(key, strategy);
  }

  // 获取策略
  get(key) {
    return this.strategies.get(key);
  }

  // 获取所有策略
  getAll() {
    const result = {};
    for (const [key, strategy] of this.strategies) {
      result[key] = {
        name: strategy.name,
        description: strategy.description,
        params: strategy.params,
        function: (klineData, params) => strategy.execute(klineData, params)
      };
    }
    return result;
  }

  // 执行策略
  execute(key, klineData, params) {
    const strategy = this.strategies.get(key);
    if (!strategy) {
      throw new Error(`策略 ${key} 不存在`);
    }
    return strategy.execute(klineData, params);
  }

  // 获取策略信息
  getInfo(key) {
    const strategy = this.strategies.get(key);
    if (!strategy) {
      throw new Error(`策略 ${key} 不存在`);
    }
    return strategy.getInfo();
  }
}

// 创建默认策略管理器实例
export const strategyManager = new StrategyManager();
