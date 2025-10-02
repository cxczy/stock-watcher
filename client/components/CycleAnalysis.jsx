import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Spin, Alert, Tabs, Select, Button, Statistic, Progress, Tag } from 'antd';
import * as echarts from 'echarts';
import { StockService } from '../services/stockService';
import { 
  RiseOutlined, 
  FallOutlined, 
  UpOutlined, 
  DownOutlined,
  BarChartOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { TabPane } = Tabs;
const { Option } = Select;

// 基钦周期相关ETF配置 - 代表工业与原材料需求
const KITCHIN_ETFS = [
  { code: '512400', name: '有色金属ETF', category: '有色金属' },
  { code: '516160', name: '化工ETF', category: '化工' },
  { code: '159928', name: '消费ETF', category: '消费制造' },
  { code: '512170', name: '医疗ETF', category: '医疗制造' },
  { code: '159755', name: '电池ETF', category: '电池材料' }
];

// 朱格拉周期相关ETF配置 - 代表设备与资本支出
const JUGLAR_ETFS = [
  { code: '159530', name: '机器人ETF', category: '工业机械' },
  { code: '159516', name: '半导体设备ETF', category: '半导体设备' },
  { code: '159732', name: '消费电子ETF', category: '智能制造' },
  { code: '515880', name: '通信ETF', category: '通信设备' },
  { code: '588030', name: '科创100ETF', category: '科技创新' }
];

export default function CycleAnalysis() {
  const [loading, setLoading] = useState(false);
  const [kitchenData, setKitchenData] = useState({});
  const [juglarData, setJuglarData] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState('1M'); // 默认月线
  const [cyclePosition, setCyclePosition] = useState({});

  // 获取ETF数据
  const fetchETFData = async (etfs, period) => {
    const data = {};
    for (const etf of etfs) {
      try {
        // 月线数据加载60根（5年），周线数据加载120根（约2.3年）
        const dataCount = period === '1M' ? 60 : 120;
        const klineData = await StockService.getKlineData(etf.code, dataCount, period);
        data[etf.code] = {
          ...etf,
          data: klineData,
          analysis: analyzeCyclePosition(klineData, etf.category)
        };
      } catch (error) {
        console.error(`获取${etf.name}数据失败:`, error);
        data[etf.code] = {
          ...etf,
          data: [],
          analysis: { status: 'error', message: '数据获取失败' }
        };
      }
    }
    return data;
  };

  // 分析周期位置
  const analyzeCyclePosition = (klineData, category) => {
    if (!klineData || klineData.length < 12) {
      return { status: 'insufficient', message: '数据不足' };
    }

    // 根据数据量调整分析窗口
    const analysisWindow = Math.min(24, Math.floor(klineData.length / 3)); // 使用1/3的数据进行分析
    const recentData = klineData.slice(-analysisWindow); // 最近的数据
    const prices = recentData.map(d => d.close);
    const volumes = recentData.map(d => d.volume);
    
    // 计算技术指标
    const sma20 = calculateSMA(prices, Math.min(20, prices.length));
    const sma50 = calculateSMA(prices, Math.min(50, prices.length));
    const currentPrice = prices[prices.length - 1];
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const recentVolume = volumes.slice(-3).reduce((a, b) => a + b, 0) / 3;
    
    // 计算MACD和BOLL指标
    const macd = calculateMACD(prices);
    const boll = calculateBOLL(prices);
    
    // 获取最新的指标值
    const latestMACD = macd.macdLine[macd.macdLine.length - 1];
    const latestSignal = macd.signalLine[macd.signalLine.length - 1];
    const latestHistogram = macd.histogram[macd.histogram.length - 1];
    const latestBollUpper = boll.upper[boll.upper.length - 1];
    const latestBollMiddle = boll.middle[boll.middle.length - 1];
    const latestBollLower = boll.lower[boll.lower.length - 1];
    
    // 趋势分析
    const trend = analyzeTrend(prices);
    const volumeTrend = recentVolume > avgVolume * 1.2 ? 'increasing' : 'decreasing';
    
    // 更详细的周期位置判断
    let position = 'unknown';
    let confidence = 0;
    let signals = [];
    
    // 技术指标信号判断
    const macdSignal = latestMACD > latestSignal ? 'bullish' : 'bearish';
    const bollPosition = currentPrice > latestBollUpper ? 'overbought' : 
                         currentPrice < latestBollLower ? 'oversold' : 'normal';
    const macdHistogramTrend = latestHistogram > 0 ? 'increasing' : 'decreasing';
    
    // 基钦周期信号判断
    if (category.includes('有色金属') || category.includes('化工') || category.includes('电池')) {
      // 补库存信号：价格上涨 + 成交量放大 + MACD金叉 + 布林带突破
      if (trend === 'uptrend' && volumeTrend === 'increasing' && macdSignal === 'bullish' && bollPosition === 'overbought') {
        position = 'recovery';
        confidence = 95;
        signals.push('补库存需求启动', 'MACD金叉确认', '布林带突破上轨');
      } else if (trend === 'uptrend' && volumeTrend === 'increasing' && macdSignal === 'bullish') {
        position = 'recovery';
        confidence = 85;
        signals.push('补库存需求启动', 'MACD金叉确认');
      } else if (trend === 'uptrend' && volumeTrend === 'increasing') {
        position = 'recovery';
        confidence = 80;
        signals.push('补库存需求启动');
      } else if (trend === 'downtrend' && volumeTrend === 'decreasing' && macdSignal === 'bearish' && bollPosition === 'oversold') {
        position = 'decline';
        confidence = 90;
        signals.push('去库存阶段', 'MACD死叉确认', '布林带跌破下轨');
      } else if (trend === 'downtrend' && volumeTrend === 'decreasing') {
        position = 'decline';
        confidence = 80;
        signals.push('去库存阶段');
      } else if (trend === 'sideways') {
        position = 'consolidation';
        confidence = 60;
        signals.push('库存调整期');
      }
    }
    
    // 朱格拉周期信号判断
    if (category.includes('机械') || category.includes('设备') || category.includes('制造')) {
      // 设备投资信号：长期底部放量突破 + 技术指标确认
      const longTermTrend = analyzeLongTermTrend(prices);
      if (longTermTrend === 'breakout' && volumeTrend === 'increasing' && macdSignal === 'bullish' && bollPosition === 'overbought') {
        position = 'recovery';
        confidence = 98;
        signals.push('资本开支意愿回升', '长期底部突破', 'MACD金叉确认', '布林带突破上轨');
      } else if (longTermTrend === 'breakout' && volumeTrend === 'increasing' && macdSignal === 'bullish') {
        position = 'recovery';
        confidence = 90;
        signals.push('资本开支意愿回升', '长期底部突破', 'MACD金叉确认');
      } else if (longTermTrend === 'breakout' && volumeTrend === 'increasing') {
        position = 'recovery';
        confidence = 85;
        signals.push('资本开支意愿回升', '长期底部突破');
      } else if (longTermTrend === 'decline' && macdSignal === 'bearish' && bollPosition === 'oversold') {
        position = 'decline';
        confidence = 85;
        signals.push('设备投资放缓', 'MACD死叉确认', '布林带跌破下轨');
      } else if (longTermTrend === 'decline') {
        position = 'decline';
        confidence = 75;
        signals.push('设备投资放缓');
      } else {
        position = 'consolidation';
        confidence = 65;
        signals.push('设备投资观望期');
      }
    }

    // 通用信号判断
    if (position === 'unknown') {
      if (trend === 'uptrend' && volumeTrend === 'increasing') {
        position = 'recovery';
        confidence = 80;
        signals.push('趋势向上，量价配合');
      } else if (trend === 'downtrend' && volumeTrend === 'decreasing') {
        position = 'decline';
        confidence = 70;
        signals.push('趋势向下，量能萎缩');
      } else if (trend === 'sideways') {
        position = 'consolidation';
        confidence = 60;
        signals.push('横盘整理');
      }
    }

    return {
      status: 'success',
      position,
      confidence,
      trend,
      volumeTrend,
      currentPrice,
      sma20: sma20[sma20.length - 1],
      sma50: sma50[sma50.length - 1],
      priceChange: ((currentPrice - prices[0]) / prices[0] * 100).toFixed(2),
      signals,
      // 技术指标信息
      macd: {
        macd: latestMACD,
        signal: latestSignal,
        histogram: latestHistogram,
        trend: macdSignal
      },
      boll: {
        upper: latestBollUpper,
        middle: latestBollMiddle,
        lower: latestBollLower,
        position: bollPosition
      }
    };
  };

  // 计算简单移动平均线
  const calculateSMA = (prices, period) => {
    if (prices.length < period) {
      return [];
    }

    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const validPrices = slice.filter(price => price !== undefined && !isNaN(price));
      
      if (validPrices.length > 0) {
        const sum = validPrices.reduce((a, b) => a + b, 0);
        const avg = sum / validPrices.length;
        sma.push(isNaN(avg) ? 0 : avg);
      } else {
        sma.push(0);
      }
    }
    return sma;
  };

  // 计算指数移动平均线
  const calculateEMA = (prices, period) => {
    if (prices.length < period) {
      return [];
    }

    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // 第一个EMA值使用SMA
    const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(isNaN(firstSMA) ? 0 : firstSMA);
    
    for (let i = period; i < prices.length; i++) {
      if (prices[i] !== undefined && !isNaN(prices[i]) && 
          ema[ema.length - 1] !== undefined && !isNaN(ema[ema.length - 1])) {
        const currentEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
        ema.push(isNaN(currentEMA) ? ema[ema.length - 1] : currentEMA);
      } else {
        ema.push(ema[ema.length - 1] || 0);
      }
    }
    return ema;
  };

  // 计算MACD指标
  const calculateMACD = (prices) => {
    if (prices.length < 26) {
      return { macdLine: [], signalLine: [], histogram: [] };
    }

    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    
    const macdLine = new Array(prices.length).fill(null);
    const signalLine = new Array(prices.length).fill(null);
    const histogram = new Array(prices.length).fill(null);
    
    // 计算MACD线 - 确保数据对齐
    const minLength = Math.min(ema12.length, ema26.length);
    for (let i = 0; i < minLength; i++) {
      if (ema12[i] !== undefined && ema26[i] !== undefined && 
          !isNaN(ema12[i]) && !isNaN(ema26[i])) {
        const macd = ema12[i] - ema26[i];
        macdLine[i] = isNaN(macd) ? 0 : macd;
      }
    }
    
    // 计算信号线（MACD的9日EMA）
    const validMacdLine = macdLine.filter(val => val !== null);
    if (validMacdLine.length >= 9) {
      const signal = calculateEMA(validMacdLine, 9);
      
      // 将信号线数据放回正确位置
      let signalIndex = 0;
      for (let i = 0; i < macdLine.length; i++) {
        if (macdLine[i] !== null && signalIndex < signal.length) {
          signalLine[i] = signal[signalIndex];
          signalIndex++;
        }
      }
      
      // 计算柱状图
      for (let i = 0; i < macdLine.length; i++) {
        if (macdLine[i] !== null && signalLine[i] !== null && 
            !isNaN(macdLine[i]) && !isNaN(signalLine[i])) {
          const hist = macdLine[i] - signalLine[i];
          histogram[i] = isNaN(hist) ? 0 : hist;
        }
      }
    }
    
    return { macdLine, signalLine, histogram };
  };

  // 计算布林带指标
  const calculateBOLL = (prices, period = 20, stdDev = 2) => {
    if (prices.length < period) {
      return { upper: [], middle: [], lower: [] };
    }

    const sma = calculateSMA(prices, period);
    const boll = {
      upper: new Array(prices.length).fill(null),
      middle: new Array(prices.length).fill(null),
      lower: new Array(prices.length).fill(null)
    };
    
    // 从第period-1个数据点开始计算
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = sma[i - period + 1];
      
      if (mean !== undefined && !isNaN(mean)) {
        // 计算标准差
        const variance = slice.reduce((sum, price) => {
          if (price !== undefined && !isNaN(price)) {
            return sum + Math.pow(price - mean, 2);
          }
          return sum;
        }, 0) / period;
        
        const standardDeviation = Math.sqrt(variance);
        
        if (!isNaN(standardDeviation)) {
          const upper = mean + (stdDev * standardDeviation);
          const lower = mean - (stdDev * standardDeviation);
          
          boll.upper[i] = isNaN(upper) ? mean : upper;
          boll.middle[i] = mean;
          boll.lower[i] = isNaN(lower) ? mean : lower;
        } else {
          boll.upper[i] = mean;
          boll.middle[i] = mean;
          boll.lower[i] = mean;
        }
      }
    }
    
    return boll;
  };

  // 分析趋势
  const analyzeTrend = (prices) => {
    if (prices.length < 3) return 'unknown';
    
    const recent = prices.slice(-3);
    const earlier = prices.slice(-6, -3);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    
    const change = (recentAvg - earlierAvg) / earlierAvg;
    
    if (change > 0.05) return 'uptrend';
    if (change < -0.05) return 'downtrend';
    return 'sideways';
  };

  // 分析长期趋势（用于朱格拉周期判断）
  const analyzeLongTermTrend = (prices) => {
    if (prices.length < 6) return 'unknown';
    
    // 使用更长的历史数据进行长期趋势分析
    const firstThird = prices.slice(0, Math.floor(prices.length / 3));
    const secondThird = prices.slice(Math.floor(prices.length / 3), Math.floor(prices.length * 2 / 3));
    const lastThird = prices.slice(Math.floor(prices.length * 2 / 3));
    
    const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
    const secondAvg = secondThird.reduce((a, b) => a + b, 0) / secondThird.length;
    const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const currentPrice = prices[prices.length - 1];
    
    // 更严格的长期趋势判断
    const isFromBottom = currentPrice > minPrice * 1.2; // 从最低点上涨20%以上
    const isBreakout = lastAvg > firstAvg * 1.15; // 最近1/3比最早1/3高15%以上
    const isAccelerating = lastAvg > secondAvg * 1.05; // 最近阶段加速上涨
    
    if (isFromBottom && isBreakout && isAccelerating) return 'breakout';
    if (lastAvg < firstAvg * 0.85) return 'decline';
    return 'sideways';
  };

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [kitchen, juglar] = await Promise.all([
        fetchETFData(KITCHIN_ETFS, selectedPeriod),
        fetchETFData(JUGLAR_ETFS, selectedPeriod)
      ]);
      
      setKitchenData(kitchen);
      setJuglarData(juglar);
      
      // 综合分析周期位置
      analyzeOverallCyclePosition(kitchen, juglar);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 综合分析周期位置
  const analyzeOverallCyclePosition = (kitchen, juglar) => {
    const kitchenPositions = Object.values(kitchen).filter(item => item.analysis.status === 'success');
    const juglarPositions = Object.values(juglar).filter(item => item.analysis.status === 'success');
    
    const kitchenRecovery = kitchenPositions.filter(item => item.analysis.position === 'recovery').length;
    const juglarRecovery = juglarPositions.filter(item => item.analysis.position === 'recovery').length;
    
    let overallPosition = 'unknown';
    let description = '';
    
    if (kitchenRecovery >= 2 && juglarRecovery >= 2) {
      overallPosition = 'recovery';
      description = '基钦周期和朱格拉周期均显示复苏迹象，市场可能进入新一轮上升周期';
    } else if (kitchenRecovery >= 2) {
      overallPosition = 'kitchen_recovery';
      description = '基钦周期显示复苏迹象，补库存需求可能启动';
    } else if (juglarRecovery >= 2) {
      overallPosition = 'juglar_recovery';
      description = '朱格拉周期显示复苏迹象，企业资本开支意愿回升';
    } else {
      overallPosition = 'consolidation';
      description = '各周期板块仍处于盘整状态，需继续观察';
    }
    
    setCyclePosition({
      position: overallPosition,
      description,
      kitchenRecovery,
      juglarRecovery,
      totalKitchen: kitchenPositions.length,
      totalJuglar: juglarPositions.length
    });
  };

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  // ETF图表组件
  const ETFChart = ({ etfData }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
      if (!etfData.data || etfData.data.length === 0) return;

      const prices = etfData.data.map(item => item.close);
      console.log(`${etfData.name} 价格数据:`, prices.slice(0, 5), '...', prices.slice(-5));
      
      const macd = calculateMACD(prices);
      console.log(`${etfData.name} MACD数据:`, {
        macdLine: macd.macdLine.slice(-3),
        signalLine: macd.signalLine.slice(-3),
        histogram: macd.histogram.slice(-3)
      });
      
      const boll = calculateBOLL(prices);
      console.log(`${etfData.name} 布林带数据:`, {
        upper: boll.upper.slice(-3),
        middle: boll.middle.slice(-3),
        lower: boll.lower.slice(-3)
      });

      // 准备ECharts数据
      const dates = etfData.data.map(item => item.date);
      
      // K线数据 [开盘, 收盘, 最低, 最高]
      const klineData = etfData.data.map(item => [
        item.open, item.close, item.low, item.high
      ]);
      
      // 成交量数据
      const volumes = etfData.data.map(item => item.volume);
      
      // 布林带数据 - 保持原始长度，用null填充无效值
      const bollUpper = boll.upper.map(val => (!isNaN(val) && val !== null) ? val : null);
      const bollMiddle = boll.middle.map(val => (!isNaN(val) && val !== null) ? val : null);
      const bollLower = boll.lower.map(val => (!isNaN(val) && val !== null) ? val : null);
      
      // MACD数据 - 保持原始长度，用null填充无效值
      const macdLine = macd.macdLine.map(val => (!isNaN(val) && val !== null) ? val : null);
      const signalLine = macd.signalLine.map(val => (!isNaN(val) && val !== null) ? val : null);
      const histogram = macd.histogram.map(val => (!isNaN(val) && val !== null) ? val : null);
      
      console.log(`${etfData.name} 过滤后的数据:`, {
        klineData: klineData.slice(-3),
        volumes: volumes.slice(-3),
        bollUpper: bollUpper.slice(-3),
        macdLine: macdLine.slice(-3),
        signalLine: signalLine.slice(-3)
      });

      const option = {
        title: {
          text: `${etfData.name} - 技术分析`,
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          formatter: function (params) {
            let result = `${params[0].axisValue}<br/>`;
            params.forEach(param => {
              if (param.seriesName === 'K线') {
                const data = param.data;
                result += `开盘: ${data[1].toFixed(2)}<br/>`;
                result += `收盘: ${data[2].toFixed(2)}<br/>`;
                result += `最低: ${data[3].toFixed(2)}<br/>`;
                result += `最高: ${data[4].toFixed(2)}<br/>`;
              } else if (param.seriesName === '成交量') {
                result += `成交量: ${(param.value / 10000).toFixed(0)}万手<br/>`;
              } else if (param.value !== null && param.value !== undefined) {
                result += `${param.seriesName}: ${param.value.toFixed(4)}<br/>`;
              }
            });
            return result;
          }
        },
        legend: {
          data: ['K线', '成交量', '布林上轨', '布林中轨', '布林下轨', 'MACD', '信号线', '柱状图'],
          top: 30
        },
        grid: [
          {
            left: '3%',
            right: '4%',
            height: '50%'
          },
          {
            left: '3%',
            right: '4%',
            top: '60%',
            height: '15%'
          },
          {
            left: '3%',
            right: '4%',
            top: '78%',
            height: '15%'
          }
        ],
        xAxis: [
          {
            type: 'category',
            data: dates,
            scale: true,
            boundaryGap: false,
            axisLine: { onZero: false },
            splitLine: { show: false },
            min: 'dataMin',
            max: 'dataMax'
          },
          {
            type: 'category',
            gridIndex: 1,
            data: dates,
            scale: true,
            boundaryGap: false,
            axisLine: { onZero: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            min: 'dataMin',
            max: 'dataMax'
          },
          {
            type: 'category',
            gridIndex: 2,
            data: dates,
            scale: true,
            boundaryGap: false,
            axisLine: { onZero: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            min: 'dataMin',
            max: 'dataMax'
          }
        ],
        yAxis: [
          {
            scale: true,
            splitArea: {
              show: true
            }
          },
          {
            scale: true,
            gridIndex: 1,
            splitNumber: 2,
            axisLabel: { show: false },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false }
          },
          {
            scale: true,
            gridIndex: 2,
            splitNumber: 2,
            axisLabel: { show: false },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false }
          }
        ],
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: [0, 1, 2],
            start: 50,
            end: 100
          },
          {
            show: true,
            xAxisIndex: [0, 1, 2],
            type: 'slider',
            top: '95%',
            start: 50,
            end: 100
          }
        ],
        series: [
          // K线图
          {
            name: 'K线',
            type: 'candlestick',
            data: klineData,
            itemStyle: {
              color: '#ef232a',      // 上涨颜色
              color0: '#14b143',     // 下跌颜色
              borderColor: '#ef232a', // 上涨边框
              borderColor0: '#14b143' // 下跌边框
            }
          },
          // 成交量
          {
            name: '成交量',
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: volumes,
            itemStyle: {
              color: function(params) {
                const data = klineData[params.dataIndex];
                return data[1] >= data[2] ? '#ef232a' : '#14b143'; // 根据涨跌设置颜色
              }
            }
          },
          // 布林上轨
          {
            name: '布林上轨',
            type: 'line',
            data: bollUpper,
            smooth: true,
            lineStyle: {
              width: 1,
              color: '#ff4d4f',
              type: 'dashed'
            },
            itemStyle: {
              color: '#ff4d4f'
            }
          },
          // 布林中轨
          {
            name: '布林中轨',
            type: 'line',
            data: bollMiddle,
            smooth: true,
            lineStyle: {
              width: 1,
              color: '#52c41a'
            },
            itemStyle: {
              color: '#52c41a'
            }
          },
          // 布林下轨
          {
            name: '布林下轨',
            type: 'line',
            data: bollLower,
            smooth: true,
            lineStyle: {
              width: 1,
              color: '#ff4d4f',
              type: 'dashed'
            },
            itemStyle: {
              color: '#ff4d4f'
            }
          },
          // MACD线
          {
            name: 'MACD',
            type: 'line',
            xAxisIndex: 2,
            yAxisIndex: 2,
            data: macdLine,
            smooth: true,
            lineStyle: {
              width: 2,
              color: '#1890ff'
            },
            itemStyle: {
              color: '#1890ff'
            }
          },
          // 信号线
          {
            name: '信号线',
            type: 'line',
            xAxisIndex: 2,
            yAxisIndex: 2,
            data: signalLine,
            smooth: true,
            lineStyle: {
              width: 2,
              color: '#ff4d4f'
            },
            itemStyle: {
              color: '#ff4d4f'
            }
          },
          // 柱状图
          {
            name: '柱状图',
            type: 'bar',
            xAxisIndex: 2,
            yAxisIndex: 2,
            data: histogram,
            itemStyle: {
              color: function(params) {
                return params.value >= 0 ? '#52c41a' : '#ff4d4f';
              }
            }
          }
        ]
      };

      // 初始化图表
      if (chartRef.current && !chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
        chartInstance.current.setOption(option);
        
        // 监听窗口大小变化
        const handleResize = () => {
          if (chartInstance.current) {
            chartInstance.current.resize();
          }
        };
        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          if (chartInstance.current) {
            chartInstance.current.dispose();
            chartInstance.current = null;
          }
        };
      }
    }, [etfData]);

    if (!etfData.data || etfData.data.length === 0) {
      return <Alert message="数据加载失败" type="error" />;
    }

    return (
      <div 
        ref={chartRef}
        style={{ width: '100%', height: '600px' }}
      />
    );
  };

  // 渲染ETF图表
  const renderETFChart = (etfData) => {
    return <ETFChart etfData={etfData} />;
  };

  // 渲染ETF分析卡片
  const renderETFCard = (etfData) => {
    const { analysis } = etfData;
    
    if (analysis.status === 'error') {
      return (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Alert message={analysis.message} type="error" />
        </Card>
      );
    }

    if (analysis.status === 'insufficient') {
      return (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Alert message={analysis.message} type="warning" />
        </Card>
      );
    }

    const getPositionColor = (position) => {
      switch (position) {
        case 'recovery': return 'green';
        case 'decline': return 'red';
        case 'consolidation': return 'orange';
        default: return 'default';
      }
    };

    const getPositionText = (position) => {
      switch (position) {
        case 'recovery': return '复苏';
        case 'decline': return '衰退';
        case 'consolidation': return '盘整';
        default: return '未知';
      }
    };

    return (
      <Card 
        size="small" 
        style={{ marginBottom: 16 }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{etfData.name}</span>
            <Tag color={getPositionColor(analysis.position)}>
              {getPositionText(analysis.position)}
            </Tag>
          </div>
        }
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="当前价格"
              value={analysis.currentPrice}
              precision={2}
              prefix={analysis.priceChange > 0 ? <RiseOutlined style={{ color: '#52c41a' }} /> : <FallOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="涨跌幅"
              value={analysis.priceChange}
              suffix="%"
              valueStyle={{ color: analysis.priceChange > 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="置信度"
              value={analysis.confidence}
              suffix="%"
              valueStyle={{ color: analysis.confidence > 70 ? '#52c41a' : analysis.confidence > 50 ? '#faad14' : '#ff4d4f' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="MACD"
              value={analysis.macd?.macd?.toFixed(4) || 'N/A'}
              valueStyle={{ 
                color: analysis.macd?.trend === 'bullish' ? '#52c41a' : '#ff4d4f',
                fontSize: '12px'
              }}
            />
          </Col>
        </Row>
        
        {/* 技术指标详情 */}
        {analysis.macd && analysis.boll && (
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={8}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <div>MACD: {analysis.macd.macd?.toFixed(4)}</div>
                <div>信号线: {analysis.macd.signal?.toFixed(4)}</div>
                <Tag color={analysis.macd.trend === 'bullish' ? 'green' : 'red'} style={{ marginLeft: 4 }}>
                  {analysis.macd.trend === 'bullish' ? '金叉' : '死叉'}
                </Tag>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <div>布林上轨: {analysis.boll.upper?.toFixed(2)}</div>
                <div>布林下轨: {analysis.boll.lower?.toFixed(2)}</div>
                <Tag color={analysis.boll.position === 'overbought' ? 'red' : analysis.boll.position === 'oversold' ? 'green' : 'default'} style={{ marginLeft: 4 }}>
                  {analysis.boll.position === 'overbought' ? '超买' : analysis.boll.position === 'oversold' ? '超卖' : '正常'}
                </Tag>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <div>SMA20: {analysis.sma20?.toFixed(2)}</div>
                <div>SMA50: {analysis.sma50?.toFixed(2)}</div>
              </div>
            </Col>
          </Row>
        )}
        <div style={{ marginTop: 16 }}>
          <Progress 
            percent={analysis.confidence} 
            size="small"
            strokeColor={analysis.confidence > 70 ? '#52c41a' : analysis.confidence > 50 ? '#faad14' : '#ff4d4f'}
          />
        </div>
        {analysis.signals && analysis.signals.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>关键信号：</div>
            {analysis.signals.map((signal, index) => (
              <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                {signal}
              </Tag>
            ))}
          </div>
        )}
        {renderETFChart(etfData)}
      </Card>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: 8 }} />
            市场周期分析
          </h2>
          <div>
            <Select
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              style={{ width: 120, marginRight: 16 }}
            >
              <Option value="1w">周线</Option>
              <Option value="1M">月线</Option>
            </Select>
            <Button type="primary" onClick={loadData} loading={loading}>
              刷新数据
            </Button>
          </div>
        </div>

        {/* 整体周期位置分析 */}
        {cyclePosition.position && (
          <Alert
            message={
              <div>
                <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                  当前市场周期位置分析
                </div>
                <div>{cyclePosition.description}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                  基钦周期复苏板块: {cyclePosition.kitchenRecovery}/{cyclePosition.totalKitchen} | 
                  朱格拉周期复苏板块: {cyclePosition.juglarRecovery}/{cyclePosition.totalJuglar}
                </div>
              </div>
            }
            type={cyclePosition.position === 'recovery' ? 'success' : 'info'}
            style={{ marginBottom: 24 }}
          />
        )}
      </Card>

      <Tabs defaultActiveKey="kitchen">
        <TabPane tab="基钦周期分析" key="kitchen">
          <div style={{ marginBottom: 16 }}>
            <h3>基钦周期 - 库存周期分析</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>
              基钦周期（3-4年）主要反映库存变化，关注代表工业与原材料需求的板块。
              如果这些板块结束长期下跌或盘整，开始稳健上涨且成交量放大，可能暗示补库存需求启动。
              <br />
              <span style={{ fontSize: '12px', color: '#999' }}>
                * 数据范围：月线60根（5年历史），周线120根（约2.3年历史）
              </span>
            </p>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin size="large" />
            </div>
          ) : (
            Object.values(kitchenData).map(etfData => (
              <div key={etfData.code}>
                {renderETFCard(etfData)}
              </div>
            ))
          )}
        </TabPane>

        <TabPane tab="朱格拉周期分析" key="juglar">
          <div style={{ marginBottom: 16 }}>
            <h3>朱格拉周期 - 设备投资周期分析</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>
              朱格拉周期（7-10年）主要反映设备投资变化，关注代表设备与资本支出的板块。
              如果这些板块出现长期底部放量并突破关键压力位，可能反映企业资本开支意愿回升。
              <br />
              <span style={{ fontSize: '12px', color: '#999' }}>
                * 数据范围：月线60根（5年历史），周线120根（约2.3年历史）
              </span>
            </p>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin size="large" />
            </div>
          ) : (
            Object.values(juglarData).map(etfData => (
              <div key={etfData.code}>
                {renderETFCard(etfData)}
              </div>
            ))
          )}
        </TabPane>
      </Tabs>
    </div>
  );
}
