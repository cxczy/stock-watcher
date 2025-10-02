import React, { forwardRef, useMemo } from 'react';
import LightweightChart from './LightweightChart';

/**
 * MACD图表组件
 * 专门用于显示MACD指标
 */
const MACDChart = forwardRef(({
  data = [],
  macdData = null,
  height = 200,
  onChartReady,
  ...props
}, ref) => {
  
  // 计算MACD指标
  const macdIndicators = useMemo(() => {
    if (!macdData) return [];
    
    return [
      {
        type: 'line',
        data: macdData.macd,
        options: {
          color: '#2196F3',
          lineWidth: 2,
        }
      },
      {
        type: 'line',
        data: macdData.signal,
        options: {
          color: '#ff4d4f',
          lineWidth: 2,
        }
      },
      {
        type: 'histogram',
        data: macdData.histogram,
        options: {
          priceFormat: { type: 'volume' },
        }
      }
    ];
  }, [macdData]);

  return (
    <LightweightChart
      ref={ref}
      data={data}
      dataType="line"
      indicators={macdIndicators}
      height={height}
      onChartReady={onChartReady}
      {...props}
    />
  );
});

MACDChart.displayName = 'MACDChart';

export default MACDChart;
