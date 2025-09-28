# Vue到React重构文档

## 项目概述

这是一个基于Vue.js的金融数据分析系统，主要功能包括：
- 股票池筛选
- 技术指标分析
- 回测策略
- 数据可视化

## 核心技术栈对比

### 当前Vue技术栈
- Vue 2.6.10
- Vue Router 3.0.6
- Vuex 3.1.0
- Element UI 2.13.2
- Axios 0.18.1
- ECharts 5.0.0

### 目标React技术栈
- 根据当前的package.json

## 核心业务逻辑提取

### 1. 股票数据获取和处理

#### 原始Vue代码
```javascript
// 获取K线数据的URL构建
const getKlineUrl = (code, lmt = 58) => {
  if (code.startsWith('000')) {
    return `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=0.${code}&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58%2Cf59%2Cf60%2Cf61&lmt=${lmt}&klt=101&fqt=1&end=30000101&ut=fa5fd1943c7b386f172d6893dbfba10b&cb=jQuery112409283314354750052_1658476932026&_=1658476932027`
  } else {
    return `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=1.${code}&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58%2Cf59%2Cf60%2Cf61&lmt=${lmt}&klt=101&fqt=1&end=30000101&ut=fa5fd1943c7b386f172d6893dbfba10b&cb=jQuery112409283314354750052_1658476932026&_=1658476932027`
  }
}

// 解析JSON数据
function calcJSON(str) {
  const start = str.indexOf('{')
  const end = str.length - 2
  const jsonStr = str.substring(start, end)
  const jsonObj = JSON.parse(jsonStr)
  return jsonObj.data
}

// 提取价格和成交量
function getPrice(str) {
  return str.split(',')[2] - 0
}

function getHands(str) {
  return str.split(',')[5] - 0
}
```

#### React重构版本
```typescript
// types/stock.ts
export interface KlineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  rate: number;
}

export interface StockData {
  code: string;
  klines: KlineData[];
}

// services/stockService.ts
export class StockService {
  private static getKlineUrl(code: string, lmt: number = 58): string {
    const baseUrl = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
    const secid = code.startsWith('000') ? `0.${code}` : `1.${code}`;
    const params = new URLSearchParams({
      secid,
      fields1: 'f1,f2,f3,f4,f5',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
      lmt: lmt.toString(),
      klt: '101',
      fqt: '1',
      end: '30000101',
      ut: 'fa5fd1943c7b386f172d6893dbfba10b'
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private static parseKlineData(response: string): KlineData[] {
    const start = response.indexOf('{');
    const end = response.length - 2;
    const jsonStr = response.substring(start, end);
    const data = JSON.parse(jsonStr).data;
    return data.klines.map((kline: string) => {
      const [date, open, close, high, low, volume, amount, , rate] = kline.split(',');
      return {
        date,
        open: parseFloat(open),
        close: parseFloat(close),
        high: parseFloat(high),
        low: parseFloat(low),
        volume: parseInt(volume),
        amount: parseFloat(amount),
        rate: parseFloat(rate)
      };
    });
  }

  static async getKlineData(code: string, lmt: number = 58): Promise<KlineData[]> {
    const url = this.getKlineUrl(code, lmt);
    const response = await fetch(url);
    const text = await response.text();
    return this.parseKlineData(text);
  }
}
```

### 2. 技术指标计算

#### 移动平均线计算
```typescript
// utils/indicators.ts
export class TechnicalIndicators {
  // 简单移动平均线
  static SMA(prices: number[], period: number, index: number): number {
    if (index < period - 1) return prices[index];
    const sum = prices.slice(index - period + 1, index + 1).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  // 指数移动平均线
  static EMA(prices: number[], period: number, index: number): number {
    if (index < period - 1) return prices[index];
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i <= index; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  }

  // 成交量比率
  static volumeRatio(volumes: number[], index: number, period: number = 5): number {
    if (index < period - 1) return 1;
    const currentVolume = volumes[index];
    const avgVolume = volumes.slice(index - period + 1, index).reduce((a, b) => a + b, 0) / (period - 1);
    return currentVolume / avgVolume;
  }

  // 连续下跌天数
  static continuousDown(prices: number[], index: number): number {
    let count = 0;
    let pos = index || prices.length - 1;
    while (pos > 0 && prices[pos] < prices[pos - 1]) {
      pos--;
      count++;
    }
    return count;
  }
}
```

### 3. 回测策略实现

#### 策略基类
```typescript
// strategies/BaseStrategy.ts
export interface BacktestResult {
  buy: boolean;
  sell: boolean;
  delta: number;
}

export interface StrategyParams {
  buy: number;
  sell: number;
  wait: boolean;
}

export abstract class BaseStrategy {
  abstract execute(
    data: KlineData[], 
    params: StrategyParams
  ): BacktestResult[];

  protected calculateDelta(buyPrice: number, sellPrice: number): number {
    return ((sellPrice - buyPrice) / buyPrice) * 100;
  }
}
```

#### 具体策略实现
```typescript
// strategies/ContinuousDownStrategy.ts
export class ContinuousDownStrategy extends BaseStrategy {
  execute(data: KlineData[], params: StrategyParams): BacktestResult[] {
    const results: BacktestResult[] = data.map(() => ({
      buy: false,
      sell: false,
      delta: 0
    }));

    for (let i = 0; i < data.length; i++) {
      const continuousDown = TechnicalIndicators.continuousDown(
        data.map(d => d.close), 
        i
      );

      if (continuousDown === params.buy) {
        results[i].buy = true;
        
        let sellIndex = i + params.sell;
        if (params.wait) {
          while (sellIndex < data.length - 1 && 
                 TechnicalIndicators.continuousDown(data.map(d => d.close), sellIndex) > 0) {
            sellIndex++;
          }
        }

        if (sellIndex < data.length) {
          results[sellIndex].sell = true;
          results[sellIndex].delta = this.calculateDelta(
            data[i].close, 
            data[sellIndex].close
          );
        }
      }
    }

    return results;
  }
}

// strategies/VolumeRatioStrategy.ts
export class VolumeRatioStrategy extends BaseStrategy {
  execute(data: KlineData[], params: StrategyParams): BacktestResult[] {
    const results: BacktestResult[] = data.map(() => ({
      buy: false,
      sell: false,
      delta: 0
    }));

    for (let i = 0; i < data.length; i++) {
      const volumeRatio = TechnicalIndicators.volumeRatio(
        data.map(d => d.volume), 
        i
      );

      if (data[i].rate > 0 && volumeRatio < 1.2) {
        results[i].buy = true;
        const sellIndex = i + 1;
        if (sellIndex < data.length) {
          results[sellIndex].sell = true;
          results[sellIndex].delta = this.calculateDelta(
            data[i].close, 
            data[sellIndex].close
          );
        }
      }
    }

    return results;
  }
}
```

### 4. 状态管理

#### Redux Toolkit实现
```typescript
// store/slices/stockSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { StockService } from '../services/stockService';

interface StockState {
  selectedCode: string;
  klineData: KlineData[];
  backtestResults: BacktestResult[];
  loading: boolean;
  error: string | null;
}

const initialState: StockState = {
  selectedCode: '',
  klineData: [],
  backtestResults: [],
  loading: false,
  error: null
};

export const fetchKlineData = createAsyncThunk(
  'stock/fetchKlineData',
  async (code: string) => {
    return await StockService.getKlineData(code, 600);
  }
);

const stockSlice = createSlice({
  name: 'stock',
  initialState,
  reducers: {
    setSelectedCode: (state, action) => {
      state.selectedCode = action.payload;
    },
    clearBacktestResults: (state) => {
      state.backtestResults = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKlineData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchKlineData.fulfilled, (state, action) => {
        state.loading = false;
        state.klineData = action.payload;
      })
      .addCase(fetchKlineData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch data';
      });
  }
});

export const { setSelectedCode, clearBacktestResults } = stockSlice.actions;
export default stockSlice.reducer;
```

### 5. React组件实现

#### 主页面组件
```typescript
// components/StockAnalysis.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Tabs, Button, Select, InputNumber, Switch, Table } from 'antd';
import { fetchKlineData, setSelectedCode } from '../store/slices/stockSlice';
import { ContinuousDownStrategy } from '../strategies/ContinuousDownStrategy';

const { TabPane } = Tabs;
const { Option } = Select;

export const StockAnalysis: React.FC = () => {
  const dispatch = useDispatch();
  const { klineData, loading, selectedCode } = useSelector((state: RootState) => state.stock);
  
  const [activeTab, setActiveTab] = useState('1');
  const [strategyParams, setStrategyParams] = useState({
    buy: 3,
    sell: 1,
    wait: false
  });

  const handleGetHistory = async () => {
    if (selectedCode) {
      dispatch(fetchKlineData(selectedCode));
    }
  };

  const handleBacktest = () => {
    const strategy = new ContinuousDownStrategy();
    const results = strategy.execute(klineData, strategyParams);
    // 更新结果到store
  };

  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Open', dataIndex: 'open', key: 'open' },
    { title: 'Close', dataIndex: 'close', key: 'close' },
    { title: 'High', dataIndex: 'high', key: 'high' },
    { title: 'Low', dataIndex: 'low', key: 'low' },
    { title: 'Buy', dataIndex: 'buy', key: 'buy' },
    { title: 'Sell', dataIndex: 'sell', key: 'sell' },
    { title: 'Delta', dataIndex: 'delta', key: 'delta' }
  ];

  return (
    <div className="stock-analysis">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="池子筛选" key="1">
          <Card>
            <Select
              value={selectedCode}
              onChange={(value) => dispatch(setSelectedCode(value))}
              style={{ width: 200, marginRight: 16 }}
              placeholder="选择股票代码"
            >
              {/* 股票代码选项 */}
            </Select>
            <Button onClick={handleGetHistory}>查询历史</Button>
          </Card>
        </TabPane>
        
        <TabPane tab="回归分析" key="2">
          <Card>
            <div style={{ marginBottom: 16 }}>
              <InputNumber
                value={strategyParams.buy}
                onChange={(value) => setStrategyParams({...strategyParams, buy: value || 3})}
                placeholder="买入条件"
                style={{ marginRight: 16 }}
              />
              <InputNumber
                value={strategyParams.sell}
                onChange={(value) => setStrategyParams({...strategyParams, sell: value || 1})}
                placeholder="卖出条件"
                style={{ marginRight: 16 }}
              />
              <Switch
                checked={strategyParams.wait}
                onChange={(checked) => setStrategyParams({...strategyParams, wait: checked})}
                style={{ marginRight: 16 }}
              />
              <Button onClick={handleBacktest}>回测连跌</Button>
            </div>
            
            <Table
              columns={columns}
              dataSource={klineData}
              loading={loading}
              pagination={false}
              scroll={{ y: 400 }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};
```

### 6. 数据模型

#### 股票池数据
```typescript
// data/stockPools.ts
export const ZZ500_STOCKS = [
  '600563', '600885', '600699', '689009', '002180',
  // ... 更多股票代码
];

export const ZZ1000_STOCKS = [
  '600997', '600491', '000016', '000030', '000035',
  // ... 更多股票代码
];

export const SELF_GROUP_STOCKS = [
  '000977', '000661', '600085', '600958', '601225',
  '000776', '600926', '600383'
];
```

### 7. 工具函数

#### 数据处理工具
```typescript
// utils/dataUtils.ts
export class DataUtils {
  // 判断是否为高点
  static isHighPoint(data: KlineData[], index: number): boolean {
    if (index === 0 || index === data.length - 1) return false;
    const current = data[index];
    const prev = data[index - 1];
    const next = data[index + 1];
    return current.high > prev.high && current.high > next.high;
  }

  // 判断是否为低点
  static isLowPoint(data: KlineData[], index: number): boolean {
    if (index === 0 || index === data.length - 1) return false;
    const current = data[index];
    const prev = data[index - 1];
    const next = data[index + 1];
    return current.low < prev.low && current.low < next.low;
  }

  // 计算回测结果统计
  static calculateBacktestStats(results: BacktestResult[]): {
    totalTrades: number;
    winRate: number;
    avgReturn: number;
    totalReturn: number;
  } {
    const trades = results.filter(r => r.buy && r.sell);
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.delta > 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const avgReturn = trades.reduce((sum, t) => sum + t.delta, 0) / totalTrades;
    const totalReturn = trades.reduce((sum, t) => sum + t.delta, 0);

    return {
      totalTrades,
      winRate,
      avgReturn,
      totalReturn
    };
  }
}
```

## 重构步骤建议

### 第一阶段：基础架构搭建
1. 创建Vite + React + TypeScript项目
2. 配置路由（React Router）
3. 配置状态管理（Redux Toolkit）
4. 配置UI组件库（Ant Design）
5. 配置HTTP客户端（Axios）

### 第二阶段：核心功能迁移
1. 实现股票数据获取服务
2. 实现技术指标计算工具
3. 实现回测策略框架
4. 实现基础UI组件

### 第三阶段：业务逻辑迁移
1. 迁移所有回测策略
2. 实现数据可视化
3. 实现用户认证系统
4. 完善错误处理

### 第四阶段：优化和测试
1. 性能优化
2. 单元测试
3. 集成测试
4. 部署配置

## 关键技术点

### 1. 状态管理对比
- Vue: Vuex mutations/actions
- React: Redux Toolkit slices

### 2. 组件通信
- Vue: props/emit, provide/inject
- React: props, context, Redux

### 3. 生命周期
- Vue: mounted, updated, destroyed
- React: useEffect, useLayoutEffect

### 4. 响应式数据
- Vue: reactive data
- React: useState, useReducer

## 注意事项

1. **性能优化**：React需要手动优化，使用useMemo、useCallback等
2. **类型安全**：充分利用TypeScript的类型系统
3. **状态管理**：合理设计Redux store结构
4. **组件设计**：遵循单一职责原则
5. **错误处理**：实现完善的错误边界和异常处理

这个重构文档提供了从Vue到React的完整迁移方案，包含了所有核心业务逻辑的提取和重构建议。
