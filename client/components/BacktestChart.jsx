import React, { useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Button } from 'antd';

export default function BacktestChart({ klineData, backtestResults, stockCode, strategyName }) {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);

  // 计算移动平均线
  const calculateMA = (data, period) => {
    const ma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ma.push(null);
      } else {
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) {
          sum += data[j].close;
        }
        ma.push(sum / period);
      }
    }
    return ma;
  };

  // 缠论一笔算法 - 宽松的一笔定义，4根K线也可以成笔
  const calculateZigZag = (data, minPercent = 0.02) => {
    if (data.length < 4) return [];
    
    const zigzagPoints = [];
    let currentTrend = null; // 'up' or 'down'
    let lastExtreme = null; // 最后一个极值点
    let tempHigh = null;    // 临时高点
    let tempLow = null;     // 临时低点
    let klineCount = 0;     // 当前笔的K线数量
    
    // 初始化第一个点
    let startIndex = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i].high > data[startIndex].high || data[i].low < data[startIndex].low) {
        startIndex = i;
        break;
      }
    }
    
    if (data[startIndex].high > data[0].high) {
      currentTrend = 'up';
      tempHigh = { ...data[startIndex], index: startIndex };
    } else {
      currentTrend = 'down';
      tempLow = { ...data[startIndex], index: startIndex };
    }
    klineCount = 1;
    
    for (let i = startIndex + 1; i < data.length; i++) {
      const current = data[i];
      klineCount++;
      
      if (currentTrend === 'up') {
        // 上升趋势中，寻找更高的高点
        if (current.high > tempHigh.high) {
          tempHigh = { ...current, index: i };
        }
        // 检查是否出现明显的回调（满足一笔的条件）
        // 降低要求：2%的回调或者4根K线以上
        else if (current.low < tempHigh.low * (1 - minPercent) || klineCount >= 4) {
          // 确认上一笔的结束点
          if (lastExtreme && lastExtreme.type === 'low') {
            zigzagPoints.push({
              ...lastExtreme,
              type: 'low',
              index: lastExtreme.index
            });
          }
          
          // 添加高点
          zigzagPoints.push({
            ...tempHigh,
            type: 'high',
            index: tempHigh.index
          });
          
          lastExtreme = { ...tempHigh, type: 'high' };
          currentTrend = 'down';
          tempLow = { ...current, index: i };
          klineCount = 1;
        }
      } else {
        // 下降趋势中，寻找更低的低点
        if (current.low < tempLow.low) {
          tempLow = { ...current, index: i };
        }
        // 检查是否出现明显的反弹（满足一笔的条件）
        // 降低要求：2%的反弹或者4根K线以上
        else if (current.high > tempLow.high * (1 + minPercent) || klineCount >= 4) {
          // 确认上一笔的结束点
          if (lastExtreme && lastExtreme.type === 'high') {
            zigzagPoints.push({
              ...lastExtreme,
              type: 'high',
              index: lastExtreme.index
            });
          }
          
          // 添加低点
          zigzagPoints.push({
            ...tempLow,
            type: 'low',
            index: tempLow.index
          });
          
          lastExtreme = { ...tempLow, type: 'low' };
          currentTrend = 'up';
          tempHigh = { ...current, index: i };
          klineCount = 1;
        }
      }
    }
    
    // 处理最后一个点
    if (currentTrend === 'up' && tempHigh) {
      zigzagPoints.push({
        ...tempHigh,
        type: 'high',
        index: tempHigh.index
      });
    } else if (currentTrend === 'down' && tempLow) {
      zigzagPoints.push({
        ...tempLow,
        type: 'low',
        index: tempLow.index
      });
    }
    
    return zigzagPoints;
  };

  // 计算颈线 - 基于缠论一笔的颈线定义
  const calculateNecklines = (zigzagPoints, data) => {
    const necklines = [];
    
    // 寻找重要的支撑阻力位 - 基于缠论的一笔定义
    for (let i = 0; i < zigzagPoints.length - 2; i++) {
      const current = zigzagPoints[i];
      const next = zigzagPoints[i + 1];
      const afterNext = zigzagPoints[i + 2];
      
      // 寻找重要的支撑位：高点-低点-高点模式
      if (current.type === 'high' && next.type === 'low' && afterNext.type === 'high') {
        // 计算支撑线：连接两个高点，中间的低点作为确认
        const supportLevel = Math.min(current.high, afterNext.high);
        const neckline = {
          startIndex: current.index,
          endIndex: afterNext.index,
          startPrice: current.high,
          endPrice: afterNext.high,
          type: 'support',
          level: supportLevel,
          confirmLow: next.low,
          strength: Math.abs(current.high - afterNext.high) / current.high // 支撑强度
        };
        necklines.push(neckline);
      }
      // 寻找重要的阻力位：低点-高点-低点模式
      else if (current.type === 'low' && next.type === 'high' && afterNext.type === 'low') {
        // 计算阻力线：连接两个低点，中间的高点作为确认
        const resistanceLevel = Math.max(current.low, afterNext.low);
        const neckline = {
          startIndex: current.index,
          endIndex: afterNext.index,
          startPrice: current.low,
          endPrice: afterNext.low,
          type: 'resistance',
          level: resistanceLevel,
          confirmHigh: next.high,
          strength: Math.abs(current.low - afterNext.low) / current.low // 阻力强度
        };
        necklines.push(neckline);
      }
    }
    
    // 过滤掉强度太弱的颈线
    return necklines.filter(neckline => neckline.strength < 0.1); // 只保留强度小于10%的颈线
  };

  // 手动加载图表
  const loadChart = () => {
    console.log('手动加载图表，数据:', { klineData, backtestResults, stockCode });
    
    if (!klineData || !backtestResults || !chartContainerRef.current) {
      console.log('数据不完整，无法渲染图表');
      return;
    }

    setIsLoading(true);

    // 清理之前的图表
    if (chartRef.current) {
      chartRef.current.dispose();
    }

    try {
      // 创建ECharts实例
      const chart = echarts.init(chartContainerRef.current);
      chartRef.current = chart;

      // 准备K线数据
      console.log('原始K线数据:', klineData.slice(0, 3));
      
      const dates = [];
      const ohlcData = [];
      const volumeData = [];
      
      klineData.forEach(item => {
        // 处理日期格式
        let dateStr;
        if (typeof item.date === 'string') {
          if (item.date.includes('-')) {
            dateStr = item.date;
          } else {
            // 转换 "20240101" 格式为 "2024-01-01"
            const year = item.date.substring(0, 4);
            const month = item.date.substring(4, 6);
            const day = item.date.substring(6, 8);
            dateStr = `${year}-${month}-${day}`;
          }
        } else {
          dateStr = item.date;
        }
        
        dates.push(dateStr);
        ohlcData.push([
          parseFloat(item.open),
          parseFloat(item.close),
          parseFloat(item.low),
          parseFloat(item.high)
        ]);
        volumeData.push(parseInt(item.volume));
      });
      
      console.log('处理后的数据:', { dates: dates.slice(0, 3), ohlcData: ohlcData.slice(0, 3) });

      // 计算双均线（如果是双均线策略）
      let ma34Data = [];
      let ma55Data = [];
      let isDualMAStrategy = strategyName === 'dualMA' || 
                           (backtestResults.length > 0 && backtestResults[0].details && backtestResults[0].details.strategy === 'dual_ma');
      
      if (isDualMAStrategy) {
        console.log('检测到双均线策略，计算MA34和MA55');
        ma34Data = calculateMA(klineData, 34);
        ma55Data = calculateMA(klineData, 55);
        console.log('MA34数据:', ma34Data.slice(-5));
        console.log('MA55数据:', ma55Data.slice(-5));
      }

      // 准备买卖点数据
      const buyPoints = [];
      const sellPoints = [];
      const tPoints = [];
      
      backtestResults.forEach(result => {
        let dateStr;
        if (typeof result.date === 'string') {
          if (result.date.includes('-')) {
            dateStr = result.date;
          } else {
            const year = result.date.substring(0, 4);
            const month = result.date.substring(4, 6);
            const day = result.date.substring(6, 8);
            dateStr = `${year}-${month}-${day}`;
          }
        } else {
          dateStr = result.date;
        }
        
        const dateIndex = dates.indexOf(dateStr);
        if (dateIndex !== -1) {
          if (result.signal === 'buy') {
            buyPoints.push([dateIndex, result.entryPrice, 'b']);
          } else if (result.signal === 'sell') {
            sellPoints.push([dateIndex, result.entryPrice, 's']);
          }
          // 如果同一天既有买入又有卖出，标记为T
          const sameDayBuy = buyPoints.some(point => point[0] === dateIndex);
          const sameDaySell = sellPoints.some(point => point[0] === dateIndex);
          if (sameDayBuy && sameDaySell) {
            tPoints.push([dateIndex, result.entryPrice, 't']);
          }
        }
      });

      console.log('买卖点数据:', { buyPoints, sellPoints, tPoints });

      // 计算缠论一笔
      const zigzagPoints = calculateZigZag(klineData, 0.02); // 2%最小幅度，4根K线也可成笔
      console.log('缠论一笔点:', zigzagPoints);
      
      // 计算颈线
      const necklines = calculateNecklines(zigzagPoints, klineData);
      console.log('颈线:', necklines);
      
      // 准备缠论一笔折线数据 - 连接相邻的高低点
      const zigzagData = [];
      for (let i = 0; i < zigzagPoints.length - 1; i++) {
        const current = zigzagPoints[i];
        const next = zigzagPoints[i + 1];
        
        // 连接当前点到下一个点
        zigzagData.push([current.index, current.type === 'high' ? current.high : current.low]);
        zigzagData.push([next.index, next.type === 'high' ? next.high : next.low]);
      }
      
      // 准备颈线数据
      const necklineData = [];
      necklines.forEach(neckline => {
        necklineData.push({
          name: neckline.type === 'support' ? '支撑线' : '阻力线',
          type: 'line',
          data: [
            [neckline.startIndex, neckline.level],
            [neckline.endIndex, neckline.level]
          ],
          lineStyle: {
            color: neckline.type === 'support' ? '#00ff00' : '#ff0000',
            width: 2,
            type: 'dashed'
          },
          symbol: 'none'
        });
      });

      // 配置图表选项
      const option = {
        title: {
          text: `回测K线图 - ${stockCode}`,
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        legend: {
          data: isDualMAStrategy 
            ? ['K线', '成交量', 'MA34', 'MA55', '缠论一笔', '支撑线', '阻力线', '买入点(b)', '卖出点(s)', '做T点(t)']
            : ['K线', '成交量', '缠论一笔', '支撑线', '阻力线', '买入点(b)', '卖出点(s)', '做T点(t)'],
          top: 30
        },
        grid: [
          {
            left: '3%',
            right: '4%',
            height: '60%'
          },
          {
            left: '3%',
            right: '4%',
            top: '70%',
            height: '20%'
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
          }
        ],
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: [0, 1],
            start: 50,
            end: 100
          },
          {
            show: true,
            xAxisIndex: [0, 1],
            type: 'slider',
            top: '90%',
            start: 50,
            end: 100
          }
        ],
        series: [
          {
            name: 'K线',
            type: 'candlestick',
            data: ohlcData,
            itemStyle: {
              color: '#ef5350',
              color0: '#26a69a',
              borderColor: '#ef5350',
              borderColor0: '#26a69a'
            }
          },
          {
            name: '成交量',
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: volumeData,
            itemStyle: {
              color: function(params) {
                const dataIndex = params.dataIndex;
                const klineItem = ohlcData[dataIndex];
                return klineItem[1] >= klineItem[0] ? '#26a69a' : '#ef5350';
              }
            }
          },
          // 双均线系列（仅双均线策略显示）
          ...(isDualMAStrategy ? [
            {
              name: 'MA34',
              type: 'line',
              data: ma34Data,
              lineStyle: {
                color: '#ff9800',
                width: 2
              },
              symbol: 'none',
              smooth: true
            },
            {
              name: 'MA55',
              type: 'line',
              data: ma55Data,
              lineStyle: {
                color: '#9c27b0',
                width: 2
              },
              symbol: 'none',
              smooth: true
            }
          ] : []),
          {
            name: '缠论一笔',
            type: 'line',
            data: zigzagData,
            lineStyle: {
              color: '#ffa500',
              width: 3
            },
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: {
              color: '#ffa500'
            }
          },
          ...necklineData,
          {
            name: '买入点',
            type: 'scatter',
            data: buyPoints,
            symbol: 'none',
            symbolSize: 0,
            itemStyle: {
              color: 'transparent'
            },
            label: {
              show: true,
              position: 'bottom',
              formatter: 'b',
              color: '#ff4d4f',
              fontSize: 14,
              fontWeight: 'bold',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderColor: '#ff4d4f',
              borderWidth: 1,
              borderRadius: 2,
              padding: [2, 4]
            }
          },
          {
            name: '卖出点',
            type: 'scatter',
            data: sellPoints,
            symbol: 'none',
            symbolSize: 0,
            itemStyle: {
              color: 'transparent'
            },
            label: {
              show: true,
              position: 'top',
              formatter: 's',
              color: '#1890ff',
              fontSize: 14,
              fontWeight: 'bold',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderColor: '#1890ff',
              borderWidth: 1,
              borderRadius: 2,
              padding: [2, 4]
            }
          },
          {
            name: '做T点',
            type: 'scatter',
            data: tPoints,
            symbol: 'none',
            symbolSize: 0,
            itemStyle: {
              color: 'transparent'
            },
            label: {
              show: true,
              position: 'inside',
              formatter: 't',
              color: '#52c41a',
              fontSize: 14,
              fontWeight: 'bold',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderColor: '#52c41a',
              borderWidth: 1,
              borderRadius: 2,
              padding: [2, 4]
            }
          }
        ]
      };

      // 设置图表选项
      chart.setOption(option);
      console.log('ECharts图表已设置');
      
      setChartLoaded(true);
      setIsLoading(false);

      // 处理窗口大小变化
      const handleResize = () => {
        if (chartRef.current) {
          chartRef.current.resize();
        }
      };

      window.addEventListener('resize', handleResize);

    } catch (error) {
      console.error('创建图表失败:', error);
      setIsLoading(false);
    }
  };

  // 清理图表
  const clearChart = () => {
    if (chartRef.current) {
      chartRef.current.dispose();
      chartRef.current = null;
    }
    setChartLoaded(false);
  };

  if (!klineData || !backtestResults) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">暂无数据</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h4 className="text-lg font-semibold">回测K线图 - {stockCode}</h4>
        <p className="text-sm text-gray-600">
          红色b表示买入点，蓝色s表示卖出点，绿色t表示做T操作<br/>
          橙色折线表示缠论一笔，绿色虚线表示支撑线，红色虚线表示阻力线<br/>
          缠论一笔：基于2%最小幅度或4根K线的趋势转折点，宽松的一笔定义
        </p>
        <div className="text-xs text-gray-500 mt-2">
          数据调试: K线数据 {klineData?.length || 0} 条, 回测结果 {backtestResults?.length || 0} 条
        </div>
        
        <div className="mt-4 flex space-x-2">
          <Button 
            type="primary" 
            onClick={loadChart}
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? '加载中...' : '加载图表'}
          </Button>
          
          {chartLoaded && (
            <Button 
              onClick={clearChart}
              danger
            >
              清除图表
            </Button>
          )}
        </div>
      </div>
      
      <div 
        ref={chartContainerRef} 
        className="w-full border rounded"
        style={{ height: '400px' }}
      />
    </div>
  );
}