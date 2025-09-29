# 策略系统

这个目录包含了所有的交易策略实现，采用模块化设计，便于扩展和维护。

## 文件结构

```
strategies/
├── index.js                 # 策略模块导出
├── BaseStrategy.js          # 策略基类
├── TechnicalUtils.js        # 技术分析工具函数
├── StrategyManager.js       # 策略管理器
├── TrendNecklineStrategy.js # 广义趋势理论策略
├── NewHighStrategy.js       # 创N日新高策略
├── NewLowStrategy.js        # 创N日新低策略
└── README.md               # 说明文档
```

## 核心组件

### 1. BaseStrategy (策略基类)
所有策略的基类，定义了策略的基本接口：
- `execute(data, params)` - 执行策略
- `getInfo()` - 获取策略信息
- `calculateDelta(buyPrice, sellPrice)` - 计算收益率

### 2. TechnicalUtils (技术分析工具)
提供各种技术分析计算函数：
- 价格方差、标准差、变异系数
- 价格动量、突破强度
- 成交量确认
- 趋势识别、颈线识别
- 量价分析

### 3. StrategyManager (策略管理器)
管理所有策略的注册、获取和执行：
- `register(key, strategy)` - 注册策略
- `get(key)` - 获取策略
- `getAll()` - 获取所有策略
- `execute(key, data, params)` - 执行策略

## 现有策略

### 1. TrendNecklineStrategy (广义趋势理论策略)
基于顶底之王的广义趋势理论：
- **买入信号**: 上升趋势中回踩颈线附近
- **卖出信号**: 放巨量或跌破颈线3%以上
- **参数**: 趋势识别周期、颈线识别周期、放量阈值

### 2. NewHighStrategy (创N日新高策略)
基于价格突破的策略：
- **买入信号**: 收盘价创N个周期新高
- **置信度**: 基于价格方差、突破强度、动量、成交量
- **参数**: 周期数、最小方差阈值

### 3. NewLowStrategy (创N日新低策略)
基于价格突破的策略：
- **卖出信号**: 收盘价创N个周期新低
- **置信度**: 基于价格方差、突破强度、动量、成交量
- **参数**: 周期数、最小方差阈值

### 4. DualMAStrategy (双均线短线策略)
基于双均线的短线趋势跟踪策略：
- **买入信号**: 价格突破均线带上轨，且前一根K线不满足买点条件
- **卖出信号**: 价格跌破均线带下轨，且前一根K线不满足卖点条件
- **历史信号检查**: 检查过去8根K线中是否有符合买点条件的情况
- **置信度**: 基于突破强度、均线带强度、成交量、动量
- **参数**: 短期均线周期(34)、长期均线周期(55)、最小K线数量(60)
- **适用**: 15分钟级别，A股T+1交易
- **特点**: 避免频繁信号，支持历史信号回溯，适合隔2小时查看

## 使用方法

### 1. 导入策略管理器
```javascript
import { strategyManager } from '../strategies/index.js';
```

### 2. 获取所有策略
```javascript
const strategies = strategyManager.getAll();
```

### 3. 执行策略
```javascript
const result = strategyManager.execute('trendNeckline', klineData, params);
```

### 4. 添加新策略
```javascript
import { BaseStrategy } from '../strategies/index.js';

class MyStrategy extends BaseStrategy {
  constructor() {
    super();
    this.name = '我的策略';
    this.description = '策略描述';
    this.params = {
      param1: { type: 'number', default: 10, min: 1, max: 100, label: '参数1' }
    };
  }

  execute(klineData, params) {
    // 策略逻辑
    return { signal: 'buy', confidence: 0.8, details: {} };
  }
}

// 注册策略
strategyManager.register('myStrategy', new MyStrategy());
```

## 策略接口规范

每个策略必须实现以下接口：

### 构造函数
```javascript
constructor() {
  this.name = '策略名称';
  this.description = '策略描述';
  this.params = {
    paramName: {
      type: 'number',        // 参数类型
      default: 10,           // 默认值
      min: 1,               // 最小值
      max: 100,             // 最大值
      label: '参数标签'      // 显示标签
    }
  };
}
```

### execute方法
```javascript
execute(klineData, params) {
  // 策略逻辑
  return {
    signal: 'buy' | 'sell' | 'neutral',  // 交易信号
    confidence: 0.8,                      // 置信度 (0-1)
    details: {                            // 详细信息
      // 策略特定的详细信息
    }
  };
}
```

## 扩展指南

### 1. 创建新策略
1. 继承 `BaseStrategy` 类
2. 实现 `execute` 方法
3. 在 `StrategyManager` 中注册
4. 更新 `index.js` 导出

### 2. 添加技术指标
1. 在 `TechnicalUtils.js` 中添加新函数
2. 确保函数没有未来函数（look-ahead bias）
3. 添加适当的参数验证

### 3. 策略测试
1. 使用历史数据进行回测
2. 验证策略逻辑的正确性
3. 检查置信度计算的合理性
4. 确保没有未来函数

## 注意事项

1. **避免未来函数**: 策略计算只能使用历史数据，不能使用未来数据
2. **参数验证**: 确保所有参数都有合理的默认值和范围
3. **错误处理**: 处理数据不足、参数错误等异常情况
4. **性能优化**: 避免重复计算，使用缓存机制
5. **代码规范**: 保持代码清晰、注释完整

## 未来计划

1. 添加更多技术指标
2. 实现策略组合功能
3. 添加策略性能分析
4. 支持自定义策略参数
5. 实现策略回测框架
