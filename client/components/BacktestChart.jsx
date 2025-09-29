import React, { useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Button } from 'antd';

export default function BacktestChart({ klineData, backtestResults, stockCode }) {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);

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
          data: ['K线', '成交量', '买入点(b)', '卖出点(s)', '做T点(t)'],
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
          红色b表示买入点，蓝色s表示卖出点，绿色t表示做T操作
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