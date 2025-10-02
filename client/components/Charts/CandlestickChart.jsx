import React, { forwardRef, useMemo } from 'react';
import LightweightChart from './LightweightChart';

/**
 * K线图表组件
 * 专门用于显示K线图、布林带等价格相关指标
 */
const CandlestickChart = forwardRef(({
  data = [],
  indicators = [],
  showBollingerBands = false,
  bollingerData = null,
  height = 400,
  onChartReady,
  ...props
}, ref) => {
  
  // 计算布林带指标
  const bollingerIndicators = useMemo(() => {
    if (!showBollingerBands || !bollingerData) return [];
    
    return [
      {
        type: 'line',
        data: bollingerData.upper,
        options: {
          color: '#ff4d4f',
          lineWidth: 1,
          lineStyle: 2, // 虚线
        }
      },
      {
        type: 'line',
        data: bollingerData.middle,
        options: {
          color: '#52c41a',
          lineWidth: 1,
        }
      },
      {
        type: 'line',
        data: bollingerData.lower,
        options: {
          color: '#ff4d4f',
          lineWidth: 1,
          lineStyle: 2, // 虚线
        }
      }
    ];
  }, [showBollingerBands, bollingerData]);

  // 合并所有指标
  const allIndicators = useMemo(() => {
    return [...indicators, ...bollingerIndicators];
  }, [indicators, bollingerIndicators]);

  return (
    <LightweightChart
      ref={ref}
      data={data}
      dataType="candlestick"
      indicators={allIndicators}
      height={height}
      onChartReady={onChartReady}
      {...props}
    />
  );
});

CandlestickChart.displayName = 'CandlestickChart';

export default CandlestickChart;
