import React, { forwardRef } from 'react';
import LightweightChart from './LightweightChart';

/**
 * 成交量图表组件
 * 专门用于显示成交量数据
 */
const VolumeChart = forwardRef(({
  data = [],
  height = 200,
  color = '#26a69a',
  onChartReady,
  ...props
}, ref) => {
  
  const seriesConfig = {
    color,
    priceFormat: {
      type: 'volume',
    },
  };

  return (
    <LightweightChart
      ref={ref}
      data={data}
      dataType="volume"
      seriesConfig={seriesConfig}
      height={height}
      onChartReady={onChartReady}
      {...props}
    />
  );
});

VolumeChart.displayName = 'VolumeChart';

export default VolumeChart;
