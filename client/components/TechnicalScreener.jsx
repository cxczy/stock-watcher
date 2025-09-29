import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { 
  Card, 
  Tabs, 
  Button, 
  Select, 
  InputNumber, 
  Switch, 
  Table, 
  message, 
  Spin, 
  Progress,
  Tag,
  Space,
  Divider,
  Steps,
  Radio,
  Form,
  Input,
  Modal,
  Statistic,
  Row,
  Col
} from 'antd';
import { StockService } from '../services/stockService.js';
import { SimpleIndicators } from '../utils/simpleIndicators.js';
import { DataUtils } from '../utils/dataUtils.js';
import { STOCK_POOLS_EXTENDED, STOCK_POOL_INFO } from '../data/stockPoolsExtended.js';
import {
  selectedCodeAtom,
  klineDataAtom,
  loadingAtom,
  errorAtom
} from '../atoms/stockAtoms.js';
import BacktestChart from './BacktestChart.jsx';

const { TabPane } = Tabs;
const { Option } = Select;
const { Step } = Steps;

// 测试用的3个股票池
const TEST_STOCK_POOLS = {
  '测试池1': ['000559', '515630', '601600'],
  '测试池2': ['688981', '600036', '600519'],
  '测试池3': ['300502', '600276', '002415']
};

// 时间周期配置
const TIME_PERIODS = {
  '1分钟': { period: '1m', klineCount: 240 }, // 4小时数据
  '5分钟': { period: '5m', klineCount: 288 }, // 1天数据
  '15分钟': { period: '15m', klineCount: 96 }, // 1天数据
  '30分钟': { period: '30m', klineCount: 48 }, // 1天数据
  '1小时': { period: '1h', klineCount: 24 }, // 1天数据
  '日线': { period: '1d', klineCount: 100 }, // 100天数据
  '周线': { period: '1w', klineCount: 52 }, // 1年数据
  '月线': { period: '1M', klineCount: 24 } // 2年数据
};

// 技术分析工具函数
const TechnicalUtils = {
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
  }
};

// 选股策略定义
const STRATEGIES = {
  'newHigh': {
    name: '创N日新高',
    description: '收盘价创N个周期新高，基于价格方差和动量计算置信度',
    params: {
      periods: { type: 'number', default: 7, min: 1, max: 50, label: '周期数' },
      minVarianceThreshold: { type: 'number', default: 0.001, min: 0.0001, max: 0.01, label: '最小方差阈值' }
    },
    function: (klineData, params) => {
      const { periods, minVarianceThreshold } = params;
      if (klineData.length < periods + 1) return { signal: 'neutral', confidence: 0 };
      
      const currentPrice = klineData[klineData.length - 1].close;
      const recentPrices = klineData.slice(-periods - 1, -1).map(d => d.close);
      const maxRecentHigh = Math.max(...recentPrices);
      
      if (currentPrice > maxRecentHigh) {
        // 计算价格方差（越小说明价格越稳定，突破越有意义）
        const variance = TechnicalUtils.calculateVariance(recentPrices);
        const coefficientOfVariation = TechnicalUtils.calculateCoefficientOfVariation(recentPrices);
        
        // 计算突破强度
        const breakoutStrength = TechnicalUtils.calculateBreakoutStrength(currentPrice, maxRecentHigh);
        
        // 计算价格动量
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
        
        // 3. 动量越大，置信度越高
        const momentumConfidence = Math.min(1, Math.max(0, momentum * 5));
        
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
          signal: 'buy', 
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
  },
  'newLow': {
    name: '创N日新低',
    description: '收盘价创N个周期新低，基于价格方差和动量计算置信度',
    params: {
      periods: { type: 'number', default: 7, min: 1, max: 50, label: '周期数' },
      minVarianceThreshold: { type: 'number', default: 0.001, min: 0.0001, max: 0.01, label: '最小方差阈值' }
    },
    function: (klineData, params) => {
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
          volumeConfirmation * 0.1
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
  }
};

export default function TechnicalScreener() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screeningResults, setScreeningResults] = useState([]);
  const [screeningProgress, setScreeningProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('1');

  // 第一步：股票池选择
  const [selectedPool, setSelectedPool] = useState('测试池1');
  
  // 第二步：时间周期选择
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('日线');
  
  // 第三步：选股策略选择
  const [selectedStrategy, setSelectedStrategy] = useState('newHigh');
  const [strategyParams, setStrategyParams] = useState({ periods: 7 });

  // 执行技术分析筛选
  const handleScreening = async () => {
    if (!selectedPool || !selectedTimePeriod || !selectedStrategy) {
      message.warning('请完成所有步骤的配置');
      return;
    }

    setLoading(true);
    setError(null);
    setScreeningResults([]);
    setScreeningProgress(0);

    const stocks = TEST_STOCK_POOLS[selectedPool];
    const timeConfig = TIME_PERIODS[selectedTimePeriod];
    const strategy = STRATEGIES[selectedStrategy];
    const results = [];
    const totalStocks = stocks.length;
    let processedCount = 0;

    try {
      console.log(`开始筛选: 股票池=${selectedPool}, 时间周期=${selectedTimePeriod}, 策略=${strategy.name}`);
      
      for (const stockCode of stocks) {
          try {
            console.log(`正在处理股票: ${stockCode}`);
            
            // 添加超时控制
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('请求超时')), 10000)
            );
            
          const dataPromise = StockService.getKlineData(stockCode, timeConfig.klineCount);
            const klineData = await Promise.race([dataPromise, timeoutPromise]);
            
          if (klineData.length < strategyParams.periods + 1) {
              console.log(`股票 ${stockCode} 数据不足，跳过`);
            processedCount++;
            setScreeningProgress(Math.round((processedCount / totalStocks) * 100));
            continue;
          }

          // 执行选股策略
          const strategyResult = strategy.function(klineData, strategyParams);
          
          if (strategyResult.signal !== 'neutral') {
            const latestData = klineData[klineData.length - 1];
            results.push({
                code: stockCode,
                name: `股票${stockCode}`,
              price: latestData.close,
              change: latestData.rate,
              volume: latestData.volume,
              signal: strategyResult.signal,
              confidence: strategyResult.confidence,
              strategy: strategy.name,
              timePeriod: selectedTimePeriod,
              details: strategyResult.details
            });
          }

          processedCount++;
          setScreeningProgress(Math.round((processedCount / totalStocks) * 100));
          
          // 添加延迟，避免API限制
          await new Promise(resolve => setTimeout(resolve, 200));

          } catch (stockError) {
            console.warn(`股票 ${stockCode} 处理失败:`, stockError);
          processedCount++;
        setScreeningProgress(Math.round((processedCount / totalStocks) * 100));
        }
      }

      setScreeningResults(results);
      message.success(`筛选完成，找到 ${results.length} 只符合条件的股票`);

    } catch (err) {
      setError(err.message);
      message.error('筛选过程中出错');
    } finally {
      setLoading(false);
      setScreeningProgress(0);
    }
  };

  // 回测状态管理
  const [backtestResults, setBacktestResults] = useState({});
  const [backtestingStocks, setBacktestingStocks] = useState(new Set());
  const [backtestModalVisible, setBacktestModalVisible] = useState(false);
  const [selectedBacktestResult, setSelectedBacktestResult] = useState(null);

  // 执行回测
  const handleBacktest = async (stockCode, strategy, strategyParams, timePeriod) => {
    if (backtestingStocks.has(stockCode)) {
      message.warning('该股票正在回测中，请稍候');
      return;
    }

    setBacktestingStocks(prev => new Set([...prev, stockCode]));
    
    try {
      console.log(`开始回测股票: ${stockCode}`);
      
      // 获取更多历史数据用于回测
      const timeConfig = TIME_PERIODS[timePeriod];
      const backtestKlineCount = Math.min(200, timeConfig.klineCount * 2); // 获取更多数据
      
      const klineData = await StockService.getKlineData(stockCode, backtestKlineCount);
      
      if (klineData.length < strategyParams.periods + 10) {
        message.warning(`股票 ${stockCode} 历史数据不足，无法进行回测`);
        return;
      }

      // 回测逻辑：从第N+1根K线开始，对每根K线应用策略
      const backtestResults = [];
      const startIndex = strategyParams.periods + 1;
      
      for (let i = startIndex; i < klineData.length; i++) {
        const currentData = klineData.slice(0, i + 1);
        const strategyResult = strategy.function(currentData, strategyParams);
        
        if (strategyResult.signal !== 'neutral') {
          const currentKline = klineData[i];
          const nextKline = klineData[i + 1];
          
          if (nextKline) {
            // 计算收益率（假设在信号出现时买入/卖出，下一个周期卖出/买入）
            const returnRate = strategyResult.signal === 'buy' 
              ? (nextKline.close - currentKline.close) / currentKline.close
              : (currentKline.close - nextKline.close) / currentKline.close;
            
            backtestResults.push({
              date: currentKline.date,
              signal: strategyResult.signal,
              confidence: strategyResult.confidence,
              entryPrice: currentKline.close,
              exitPrice: nextKline.close,
              returnRate: returnRate,
              details: strategyResult.details,
              isCurrentSignal: false // 标记为历史信号
            });
          }
        }
      }

      // 添加当日评估结果到回测结果中
      const currentData = klineData;
      const currentStrategyResult = strategy.function(currentData, strategyParams);
      
      if (currentStrategyResult.signal !== 'neutral') {
        const latestKline = klineData[klineData.length - 1];
        backtestResults.push({
          date: latestKline.date,
          signal: currentStrategyResult.signal,
          confidence: currentStrategyResult.confidence,
          entryPrice: latestKline.close,
          exitPrice: null, // 当日信号还没有出场价
          returnRate: null, // 当日信号还没有收益率
          details: currentStrategyResult.details,
          isCurrentSignal: true // 标记为当日信号
        });
      }

      // 计算回测统计指标（排除当日信号）
      const historicalResults = backtestResults.filter(r => !r.isCurrentSignal);
      const totalSignals = historicalResults.length;
      const buySignals = historicalResults.filter(r => r.signal === 'buy');
      const sellSignals = historicalResults.filter(r => r.signal === 'sell');
      
      const totalReturn = historicalResults.reduce((sum, r) => sum + (r.returnRate || 0), 0);
      const avgReturn = totalSignals > 0 ? totalReturn / totalSignals : 0;
      const winRate = totalSignals > 0 ? historicalResults.filter(r => (r.returnRate || 0) > 0).length / totalSignals : 0;
      const avgConfidence = totalSignals > 0 ? historicalResults.reduce((sum, r) => sum + r.confidence, 0) / totalSignals : 0;

      const backtestSummary = {
        totalSignals,
        buySignals: buySignals.length,
        sellSignals: sellSignals.length,
        totalReturn: totalReturn * 100,
        avgReturn: avgReturn * 100,
        winRate: winRate * 100,
        avgConfidence: avgConfidence * 100,
        results: backtestResults,
        klineData: klineData, // 保存K线数据用于图表显示
        stockCode: stockCode
      };

      setBacktestResults(prev => ({
        ...prev,
        [stockCode]: backtestSummary
      }));

      message.success(`股票 ${stockCode} 回测完成，共 ${totalSignals} 个信号，胜率 ${(winRate * 100).toFixed(1)}%`);

    } catch (error) {
      console.error(`回测股票 ${stockCode} 失败:`, error);
      message.error(`回测股票 ${stockCode} 失败: ${error.message}`);
    } finally {
      setBacktestingStocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(stockCode);
        return newSet;
      });
    }
  };

  // 表格列定义
  const columns = [
    { title: '股票代码', dataIndex: 'code', key: 'code', width: 100 },
    { title: '股票名称', dataIndex: 'name', key: 'name', width: 120 },
    { title: '最新价', dataIndex: 'price', key: 'price', width: 80, render: (value) => value?.toFixed(2) },
    { title: '涨跌幅', dataIndex: 'change', key: 'change', width: 80, render: (value) => `${value?.toFixed(2)}%` },
    { title: '成交量', dataIndex: 'volume', key: 'volume', width: 100, render: (value) => value?.toLocaleString() },
    { title: '时间周期', dataIndex: 'timePeriod', key: 'timePeriod', width: 80 },
    { title: '选股策略', dataIndex: 'strategy', key: 'strategy', width: 100 },
    { 
      title: '交易信号', 
      dataIndex: 'signal', 
      key: 'signal',
      width: 100,
      render: (signal) => (
        <Tag color={signal === 'buy' ? 'green' : signal === 'sell' ? 'red' : 'default'}>
          {signal === 'buy' ? '买入' : signal === 'sell' ? '卖出' : '中性'}
        </Tag>
      )
    },
    { 
      title: '置信度', 
      dataIndex: 'confidence', 
      key: 'confidence',
      width: 80,
      render: (value) => {
        const percentage = (value * 100).toFixed(1);
        const color = value > 0.8 ? 'green' : value > 0.6 ? 'orange' : 'red';
        return <Tag color={color}>{percentage}%</Tag>;
      }
    },
    { 
      title: '回测', 
      dataIndex: 'code', 
      key: 'backtest',
      width: 120,
      render: (stockCode, record) => {
        const isBacktesting = backtestingStocks.has(stockCode);
        const hasBacktestResult = backtestResults[stockCode];
        
        return (
          <div className="space-y-2">
            <Button
              size="small"
              type="primary"
              loading={isBacktesting}
              disabled={isBacktesting}
              onClick={() => handleBacktest(
                stockCode, 
                STRATEGIES[selectedStrategy], 
                strategyParams, 
                selectedTimePeriod
              )}
            >
              {isBacktesting ? '回测中...' : '开始回测'}
            </Button>
            
            {hasBacktestResult && (
              <div className="text-xs space-y-1">
                <div>信号数: {hasBacktestResult.totalSignals}</div>
                <div>胜率: {hasBacktestResult.winRate.toFixed(1)}%</div>
                <div>总收益: {hasBacktestResult.totalReturn.toFixed(2)}%</div>
                <div>平均置信度: {hasBacktestResult.avgConfidence.toFixed(1)}%</div>
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    setSelectedBacktestResult({ stockCode, ...hasBacktestResult });
                    setBacktestModalVisible(true);
                  }}
                >
                  查看详情
                </Button>
              </div>
            )}
          </div>
        );
      }
    },
    { 
      title: '技术指标', 
      dataIndex: 'details', 
      key: 'details',
      width: 200,
      render: (details) => {
        if (!details) return '-';
        return (
          <div className="text-xs">
            <div>方差: {details.variance?.toFixed(6)}</div>
            <div>变异系数: {details.coefficientOfVariation?.toFixed(4)}</div>
            <div>突破强度: {(details.breakoutStrength * 100)?.toFixed(2)}%</div>
            <div>动量: {(details.momentum * 100)?.toFixed(2)}%</div>
            <div>成交量比: {details.volumeConfirmation?.toFixed(2)}</div>
          </div>
        );
      }
    }
  ];

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card title="第一步：选择股票池" className="mb-4">
            <div className="space-y-4">
              <p>请选择要筛选的股票池：</p>
              <Radio.Group 
                value={selectedPool} 
                onChange={(e) => setSelectedPool(e.target.value)}
                className="w-full"
              >
                <div className="grid grid-cols-1 gap-4">
                  {Object.keys(TEST_STOCK_POOLS).map(pool => (
                    <Radio key={pool} value={pool} className="block">
                      <div>
                        <div className="font-medium">{pool}</div>
                        <div className="text-sm text-gray-500">
                          {TEST_STOCK_POOLS[pool].length}只股票: {TEST_STOCK_POOLS[pool].join(', ')}
                        </div>
                      </div>
                    </Radio>
                  ))}
                </div>
              </Radio.Group>
            </div>
          </Card>
        );
      
      case 1:
        return (
          <Card title="第二步：选择时间周期" className="mb-4">
            <div className="space-y-4">
              <p>请选择K线时间周期：</p>
              <Radio.Group 
                value={selectedTimePeriod} 
                onChange={(e) => setSelectedTimePeriod(e.target.value)}
                className="w-full"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.keys(TIME_PERIODS).map(period => (
                    <Radio key={period} value={period} className="block">
                      <div>
                        <div className="font-medium">{period}</div>
                        <div className="text-sm text-gray-500">
                          {TIME_PERIODS[period].klineCount}根K线
                        </div>
                      </div>
                    </Radio>
                  ))}
                </div>
              </Radio.Group>
            </div>
          </Card>
        );
      
      case 2:
        return (
          <Card title="第三步：选择选股策略" className="mb-4">
            <div className="space-y-4">
              <p>请选择选股策略：</p>
              <Radio.Group 
                value={selectedStrategy} 
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="w-full"
              >
                <div className="space-y-4">
                  {Object.keys(STRATEGIES).map(strategyKey => {
                    const strategy = STRATEGIES[strategyKey];
                    return (
                      <Radio key={strategyKey} value={strategyKey} className="block">
                        <div>
                          <div className="font-medium">{strategy.name}</div>
                          <div className="text-sm text-gray-500">{strategy.description}</div>
                        </div>
                      </Radio>
                    );
                  })}
                </div>
              </Radio.Group>
              
              {/* 策略参数配置 */}
              {selectedStrategy && (
                <div className="mt-6 p-4 bg-gray-50 rounded">
                  <h4 className="mb-4">策略参数配置</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(STRATEGIES[selectedStrategy].params).map(paramKey => {
                      const param = STRATEGIES[selectedStrategy].params[paramKey];
                      return (
                        <div key={paramKey}>
                          <label className="block mb-2">{param.label}:</label>
                          <InputNumber
                            value={strategyParams[paramKey]}
                            onChange={(value) => setStrategyParams({
                              ...strategyParams,
                              [paramKey]: value
                            })}
                            min={param.min}
                            max={param.max}
                            style={{ width: '100%' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-1">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="技术分析选股" key="1">
          <Card>
            <div className="mb-6">
              <h3 className="mb-4">三步选股流程</h3>
              
              {/* 步骤指示器 */}
              <Steps current={currentStep} className="mb-6">
                <Step title="选择股票池" description="选择要筛选的股票池" />
                <Step title="选择时间周期" description="选择K线时间周期" />
                <Step title="选择选股策略" description="选择选股策略和参数" />
              </Steps>

              {/* 步骤内容 */}
              {renderStepContent()}

              {/* 操作按钮 */}
              <div className="flex justify-between items-center mt-6">
                <div>
                  {currentStep > 0 && (
                    <Button onClick={() => setCurrentStep(currentStep - 1)}>
                      上一步
                    </Button>
                  )}
                </div>

                <div className="flex space-x-2">
                  {currentStep < 2 ? (
                    <Button 
                      type="primary" 
                      onClick={() => setCurrentStep(currentStep + 1)}
                    >
                      下一步
                    </Button>
                  ) : (
                  <Button 
                    type="primary" 
                    size="large"
                    onClick={handleScreening}
                    loading={loading}
                    disabled={loading}
                  >
                    开始筛选
                  </Button>
                  )}
                </div>
                </div>
                
                {loading && (
                <div className="mt-4">
                    <Progress 
                      percent={screeningProgress} 
                      size="small" 
                    style={{ width: 200 }}
                    />
                  <span className="ml-2">筛选进度: {screeningProgress}%</span>
                  </div>
                )}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
                错误: {error}
              </div>
            )}

            <Spin spinning={loading}>
              <Table
                columns={columns}
                dataSource={screeningResults}
                pagination={{ pageSize: 20 }}
                scroll={{ y: 400 }}
                rowKey="code"
                size="small"
              />
            </Spin>
          </Card>
        </TabPane>

        <TabPane tab="策略说明" key="2">
          <Card>
            <div className="space-y-4">
              <h3>选股策略说明</h3>
              
              <div>
                <h4>创N日新高策略</h4>
                <p>当股票收盘价创出N个周期内的新高时，产生买入信号</p>
                <p>参数：周期数 - 设置回看的天数，默认7天</p>
                <p>适用场景：趋势跟踪，捕捉突破信号</p>
                
                <h5 className="mt-3">置信度计算方法：</h5>
                <ul className="list-disc list-inside ml-4 text-sm">
                  <li><strong>价格稳定性（40%权重）</strong>：价格方差越小，突破越有意义</li>
                  <li><strong>突破强度（30%权重）</strong>：突破幅度越大，信号越强</li>
                  <li><strong>价格动量（20%权重）</strong>：上涨动量越大，趋势越明确</li>
                  <li><strong>成交量确认（10%权重）</strong>：成交量放大确认突破有效性</li>
                </ul>
              </div>

              <div>
                <h4>创N日新低策略</h4>
                <p>当股票收盘价创出N个周期内的新低时，产生卖出信号</p>
                <p>参数：周期数 - 设置回看的天数，默认7天</p>
                <p>适用场景：风险控制，及时止损</p>
                
                <h5 className="mt-3">置信度计算方法：</h5>
                <ul className="list-disc list-inside ml-4 text-sm">
                  <li><strong>价格稳定性（40%权重）</strong>：价格方差越小，突破越有意义</li>
                  <li><strong>突破强度（30%权重）</strong>：突破幅度越大，信号越强</li>
                  <li><strong>下跌动量（20%权重）</strong>：下跌动量越大，趋势越明确</li>
                  <li><strong>成交量确认（10%权重）</strong>：成交量放大确认突破有效性</li>
                </ul>
              </div>

              <div>
                <h4>技术指标说明</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5>价格方差</h5>
                    <p className="text-sm">衡量价格波动的稳定性，方差越小说明价格越稳定，突破越有意义</p>
                  </div>
                  <div>
                    <h5>变异系数</h5>
                    <p className="text-sm">标准差与均值的比值，消除价格水平影响，更好地衡量相对波动</p>
                  </div>
                  <div>
                    <h5>突破强度</h5>
                    <p className="text-sm">当前价格相对于参考价格的突破幅度，强度越大信号越强</p>
                  </div>
                  <div>
                    <h5>价格动量</h5>
                    <p className="text-sm">当前价格相对于历史价格的变化率，反映价格趋势的持续性</p>
              </div>
              <div>
                    <h5>成交量确认</h5>
                    <p className="text-sm">当前成交量相对于近期平均成交量的比率，确认突破的有效性</p>
                  </div>
                </div>
              </div>

              <div>
                <h4>时间周期说明</h4>
                <p>不同时间周期适用于不同的交易策略：</p>
                <ul className="list-disc list-inside ml-4">
                  <li>分钟级：适合短线交易和日内交易</li>
                  <li>日线：适合中短线交易，最常用</li>
                  <li>周线：适合中长线交易</li>
                  <li>月线：适合长线投资</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabPane>
      </Tabs>

      {/* 回测详情弹窗 */}
      <Modal
        title={`回测详情 - ${selectedBacktestResult?.stockCode}`}
        open={backtestModalVisible}
        onCancel={() => setBacktestModalVisible(false)}
        footer={null}
        width={1000}
      >
        {selectedBacktestResult && (
          <div className="space-y-4">
            {/* 回测统计概览 */}
            <Card title="回测统计概览">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="历史信号数" value={selectedBacktestResult.totalSignals} />
                </Col>
                <Col span={6}>
                  <Statistic title="买入信号" value={selectedBacktestResult.buySignals} />
                </Col>
                <Col span={6}>
                  <Statistic title="卖出信号" value={selectedBacktestResult.sellSignals} />
                </Col>
                <Col span={6}>
                  <Statistic title="胜率" value={selectedBacktestResult.winRate} suffix="%" />
                </Col>
              </Row>
              <Row gutter={16} className="mt-4">
                <Col span={6}>
                  <Statistic title="总收益率" value={selectedBacktestResult.totalReturn} suffix="%" />
                </Col>
                <Col span={6}>
                  <Statistic title="平均收益率" value={selectedBacktestResult.avgReturn} suffix="%" />
                </Col>
                <Col span={6}>
                  <Statistic title="历史平均置信度" value={selectedBacktestResult.avgConfidence} suffix="%" />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="置信度有效性" 
                    value={selectedBacktestResult.avgConfidence > 70 ? '高' : selectedBacktestResult.avgConfidence > 50 ? '中' : '低'} 
                  />
                </Col>
              </Row>
              
              {/* 当日信号信息 */}
              {selectedBacktestResult.results.some(r => r.isCurrentSignal) && (
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <h4 className="text-blue-600 mb-2">当日信号对比</h4>
                  <Row gutter={16}>
                    {selectedBacktestResult.results
                      .filter(r => r.isCurrentSignal)
                      .map((currentSignal, index) => (
                        <React.Fragment key={index}>
                          <Col span={6}>
                            <Statistic 
                              title="当日信号" 
                              value={currentSignal.signal === 'buy' ? '买入' : '卖出'} 
                              valueStyle={{ color: currentSignal.signal === 'buy' ? '#52c41a' : '#ff4d4f' }}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic 
                              title="当日置信度" 
                              value={currentSignal.confidence * 100} 
                              suffix="%" 
                              valueStyle={{ color: currentSignal.confidence > 0.8 ? '#52c41a' : currentSignal.confidence > 0.6 ? '#faad14' : '#ff4d4f' }}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic 
                              title="入场价" 
                              value={currentSignal.entryPrice} 
                              precision={2}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic 
                              title="置信度排名" 
                              value={`${selectedBacktestResult.results
                                .filter(r => !r.isCurrentSignal)
                                .filter(r => r.confidence < currentSignal.confidence).length + 1}/${selectedBacktestResult.totalSignals + 1}`}
                            />
                          </Col>
                        </React.Fragment>
                      ))
                    }
                  </Row>
                </div>
              )}
            </Card>

            {/* K线图显示 */}
            <Card title="回测K线图">
              <BacktestChart 
                klineData={selectedBacktestResult.klineData}
                backtestResults={selectedBacktestResult.results}
                stockCode={selectedBacktestResult.stockCode}
              />
            </Card>

            {/* 详细交易记录 */}
            <Card title="详细交易记录">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  点击"收益率"或"置信度"列头可进行排序，帮助分析策略效果
                </p>
              </div>
              <Table
                dataSource={selectedBacktestResult.results}
                columns={[
                  { 
                    title: '日期', 
                    dataIndex: 'date', 
                    key: 'date', 
                    width: 100,
                    sorter: (a, b) => new Date(a.date) - new Date(b.date),
                    render: (value, record) => (
                      <span style={{ 
                        fontWeight: record.isCurrentSignal ? 'bold' : 'normal',
                        color: record.isCurrentSignal ? '#1890ff' : 'inherit'
                      }}>
                        {value}
                        {record.isCurrentSignal && ' (当日)'}
                      </span>
                    )
                  },
                  { 
                    title: '信号', 
                    dataIndex: 'signal', 
                    key: 'signal',
                    width: 80,
                    render: (signal, record) => (
                      <Tag 
                        color={signal === 'buy' ? 'green' : 'red'}
                        style={{ 
                          fontWeight: record.isCurrentSignal ? 'bold' : 'normal',
                          border: record.isCurrentSignal ? '2px solid #1890ff' : 'none'
                        }}
                      >
                        {signal === 'buy' ? '买入' : '卖出'}
                        {record.isCurrentSignal && ' (当日)'}
                      </Tag>
                    ),
                    filters: [
                      { text: '买入', value: 'buy' },
                      { text: '卖出', value: 'sell' }
                    ],
                    onFilter: (value, record) => record.signal === value
                  },
                  { 
                    title: '入场价', 
                    dataIndex: 'entryPrice', 
                    key: 'entryPrice', 
                    width: 80, 
                    render: (value, record) => (
                      <span style={{ 
                        fontWeight: record.isCurrentSignal ? 'bold' : 'normal',
                        color: record.isCurrentSignal ? '#1890ff' : 'inherit'
                      }}>
                        {value?.toFixed(2)}
                      </span>
                    ),
                    sorter: (a, b) => a.entryPrice - b.entryPrice
                  },
                  { 
                    title: '出场价', 
                    dataIndex: 'exitPrice', 
                    key: 'exitPrice', 
                    width: 80, 
                    render: (value, record) => (
                      <span style={{ 
                        fontWeight: record.isCurrentSignal ? 'bold' : 'normal',
                        color: record.isCurrentSignal ? '#1890ff' : 'inherit'
                      }}>
                        {value ? value.toFixed(2) : record.isCurrentSignal ? '待定' : '-'}
                      </span>
                    ),
                    sorter: (a, b) => (a.exitPrice || 0) - (b.exitPrice || 0)
                  },
                  { 
                    title: '收益率', 
                    dataIndex: 'returnRate', 
                    key: 'returnRate',
                    width: 100,
                    render: (value, record) => {
                      if (record.isCurrentSignal) {
                        return <span style={{ color: '#1890ff', fontWeight: 'bold' }}>待定</span>;
                      }
                      return (
                        <span style={{ color: value > 0 ? 'green' : 'red' }}>
                          {(value * 100).toFixed(2)}%
                        </span>
                      );
                    },
                    sorter: (a, b) => (a.returnRate || 0) - (b.returnRate || 0),
                    defaultSortOrder: 'descend'
                  },
                  { 
                    title: '置信度', 
                    dataIndex: 'confidence', 
                    key: 'confidence',
                    width: 100,
                    render: (value, record) => {
                      const percentage = (value * 100).toFixed(1);
                      const color = value > 0.8 ? 'green' : value > 0.6 ? 'orange' : 'red';
                      return (
                        <Tag 
                          color={color}
                          style={{ 
                            fontWeight: record.isCurrentSignal ? 'bold' : 'normal',
                            border: record.isCurrentSignal ? '2px solid #1890ff' : 'none'
                          }}
                        >
                          {percentage}%
                          {record.isCurrentSignal && ' (当日)'}
                        </Tag>
                      );
                    },
                    sorter: (a, b) => a.confidence - b.confidence,
                    defaultSortOrder: 'descend'
                  }
                ]}
                pagination={false}
                scroll={{ y: 400 }}
                size="small"
                rowKey={(record, index) => index}
                showSorterTooltip={false}
              />
            </Card>

            {/* 置信度分析 */}
            <Card title="置信度分析">
              <div className="space-y-2">
                <p>通过回测可以验证置信度的有效性：</p>
                <ul className="list-disc list-inside ml-4">
                  <li>高置信度信号（&gt;80%）的胜率表现</li>
                  <li>置信度与实际收益的相关性</li>
                  <li>策略在不同市场环境下的表现</li>
                </ul>
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <p className="text-sm">
                    <strong>建议：</strong>
                    {selectedBacktestResult.avgConfidence > 70 
                      ? '该策略的置信度计算较为准确，可以作为交易参考。'
                      : selectedBacktestResult.avgConfidence > 50
                      ? '该策略的置信度计算一般，建议结合其他指标使用。'
                      : '该策略的置信度计算需要优化，建议调整参数或策略。'
                    }
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
