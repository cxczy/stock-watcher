import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { LightweightChartsAdapter } from '../../utils/lightweightChartsAdapter';

/**
 * Lightweight Charts 5.0 通用图表组件
 * 支持数据和展示分离，提供灵活的配置选项
 */
const LightweightChart = forwardRef(({
  // 基础配置
  width = '100%',
  height = 400,
  className = '',
  style = {},
  
  // 图表配置
  options = {},
  
  // 数据配置
  data = [],
  dataType = 'candlestick', // candlestick, line, volume, histogram
  
  // 系列配置
  seriesConfig = {},
  
  // 指标配置
  indicators = [],
  
  // 事件回调
  onChartReady,
  onDataUpdate,
  onResize,
  
  // 其他配置
  autoResize = true,
  crosshair = true,
  grid = true,
  
  ...props
}, ref) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const seriesRefs = useRef({});

  // 默认图表配置
  const defaultOptions = {
    layout: {
      background: { type: 'solid', color: 'white' },
      textColor: 'black',
    },
    grid: grid ? {
      vertLines: { color: '#e1e1e1' },
      horzLines: { color: '#e1e1e1' },
    } : { vertLines: { visible: false }, horzLines: { visible: false } },
    crosshair: crosshair ? { mode: 1 } : { mode: 0 },
    rightPriceScale: {
      borderColor: '#cccccc',
    },
    timeScale: {
      borderColor: '#cccccc',
      timeVisible: true,
      secondsVisible: false,
    },
    ...options
  };

  // 初始化图表
  const initChart = () => {
    if (!chartRef.current || chartInstance.current) return;

    try {
      chartInstance.current = new LightweightChartsAdapter(chartRef.current, {
        width: typeof width === 'number' ? width : chartRef.current.clientWidth,
        height: typeof height === 'number' ? height : parseInt(height),
        ...defaultOptions
      });

      chartInstance.current.init();
      
      // 添加主数据系列
      addMainSeries();
      
      // 添加指标系列
      addIndicatorSeries();
      
      // 设置数据
      updateData();
      
      // 回调通知
      if (onChartReady) {
        onChartReady(chartInstance.current);
      }
    } catch (error) {
      console.error('图表初始化失败:', error);
    }
  };

  // 添加主数据系列
  const addMainSeries = () => {
    if (!chartInstance.current || !data.length) return;

    const seriesOptions = {
      ...getDefaultSeriesOptions(dataType),
      ...seriesConfig
    };

    switch (dataType) {
      case 'candlestick':
        seriesRefs.current.main = chartInstance.current.addCandlestickSeries(seriesOptions);
        break;
      case 'line':
        seriesRefs.current.main = chartInstance.current.addLineSeries(seriesOptions);
        break;
      case 'volume':
      case 'histogram':
        seriesRefs.current.main = chartInstance.current.addVolumeSeries(seriesOptions);
        break;
      default:
        seriesRefs.current.main = chartInstance.current.addLineSeries(seriesOptions);
    }
  };

  // 添加指标系列
  const addIndicatorSeries = () => {
    if (!chartInstance.current || !indicators.length) return;

    indicators.forEach((indicator, index) => {
      const { type, data: indicatorData, options: indicatorOptions = {} } = indicator;
      
      const seriesOptions = {
        ...getDefaultIndicatorOptions(type),
        ...indicatorOptions
      };

      let series;
      switch (type) {
        case 'line':
          series = chartInstance.current.addLineSeries(seriesOptions);
          break;
        case 'histogram':
          series = chartInstance.current.addHistogramSeries(seriesOptions);
          break;
        default:
          series = chartInstance.current.addLineSeries(seriesOptions);
      }

      seriesRefs.current[`indicator_${index}`] = series;
    });
  };

  // 获取默认系列配置
  const getDefaultSeriesOptions = (type) => {
    switch (type) {
      case 'candlestick':
        return {
          upColor: '#ef232a',
          downColor: '#14b143',
          borderUpColor: '#ef232a',
          borderDownColor: '#14b143',
          wickUpColor: '#ef232a',
          wickDownColor: '#14b143',
        };
      case 'line':
        return {
          color: '#2196F3',
          lineWidth: 2,
        };
      case 'volume':
      case 'histogram':
        return {
          color: '#26a69a',
          priceFormat: { type: 'volume' },
        };
      default:
        return {};
    }
  };

  // 获取默认指标配置
  const getDefaultIndicatorOptions = (type) => {
    switch (type) {
      case 'line':
        return {
          color: '#ff4d4f',
          lineWidth: 1,
        };
      case 'histogram':
        return {
          color: '#52c41a',
          priceFormat: { type: 'volume' },
        };
      default:
        return {};
    }
  };

  // 更新数据
  const updateData = () => {
    if (!chartInstance.current || !data.length) return;

    try {
      // 更新主数据
      if (seriesRefs.current.main) {
        const adaptedData = adaptData(data, dataType);
        seriesRefs.current.main.setData(adaptedData);
      }

      // 更新指标数据
      indicators.forEach((indicator, index) => {
        const series = seriesRefs.current[`indicator_${index}`];
        if (series && indicator.data) {
          const adaptedData = adaptData(indicator.data, indicator.type || 'line');
          series.setData(adaptedData);
        }
      });

      if (onDataUpdate) {
        onDataUpdate(data);
      }
    } catch (error) {
      console.error('数据更新失败:', error);
    }
  };

  // 数据适配
  const adaptData = (rawData, type) => {
    if (!chartInstance.current) return [];

    switch (type) {
      case 'candlestick':
        return chartInstance.current.adaptEastMoneyKlineData(rawData);
      case 'volume':
        return chartInstance.current.adaptEastMoneyVolumeData(rawData);
      case 'histogram':
        // MACD柱状图需要特殊处理
        if (Array.isArray(rawData) && rawData.length > 0 && rawData[0].color) {
          // 已经是适配后的格式
          return rawData;
        }
        // 原始数据格式，需要转换
        return rawData.map(item => ({
          time: item.time || item.date,
          value: item.value || item.close,
          color: item.color || '#52c41a'
        }));
      case 'line':
        return rawData.map(item => ({
          time: item.time || item.date,
          value: item.value || item.close
        }));
      default:
        return rawData;
    }
  };

  // 处理窗口大小变化
  const handleResize = () => {
    if (!chartInstance.current) return;

    const newWidth = typeof width === 'number' ? width : chartRef.current.clientWidth;
    const newHeight = typeof height === 'number' ? height : parseInt(height);
    
    chartInstance.current.resize(newWidth, newHeight);
    
    if (onResize) {
      onResize({ width: newWidth, height: newHeight });
    }
  };

  // 清理资源
  const cleanup = () => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    seriesRefs.current = {};
  };

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    // 获取图表实例
    getChart: () => chartInstance.current,
    
    // 获取系列实例
    getSeries: (name) => seriesRefs.current[name],
    
    // 更新数据
    updateData: (newData) => {
      if (newData) {
        data = newData;
      }
      updateData();
    },
    
    // 添加指标
    addIndicator: (indicator) => {
      if (!chartInstance.current) return;
      
      const { type, data: indicatorData, options = {} } = indicator;
      const seriesOptions = {
        ...getDefaultIndicatorOptions(type),
        ...options
      };

      let series;
      switch (type) {
        case 'line':
          series = chartInstance.current.addLineSeries(seriesOptions);
          break;
        case 'histogram':
          series = chartInstance.current.addHistogramSeries(seriesOptions);
          break;
        default:
          series = chartInstance.current.addLineSeries(seriesOptions);
      }

      const index = Object.keys(seriesRefs.current).length;
      seriesRefs.current[`indicator_${index}`] = series;
      
      if (indicatorData) {
        const adaptedData = adaptData(indicatorData, type);
        series.setData(adaptedData);
      }
    },
    
    // 移除指标
    removeIndicator: (name) => {
      if (seriesRefs.current[name]) {
        // 注意：lightweight-charts 5.0 可能需要不同的移除方法
        delete seriesRefs.current[name];
      }
    },
    
    // 调整大小
    resize: (newWidth, newHeight) => {
      if (chartInstance.current) {
        chartInstance.current.resize(newWidth, newHeight);
      }
    },
    
    // 销毁图表
    destroy: cleanup
  }));

  // 初始化效果
  useEffect(() => {
    initChart();
    
    if (autoResize) {
      window.addEventListener('resize', handleResize);
    }
    
    return () => {
      if (autoResize) {
        window.removeEventListener('resize', handleResize);
      }
      cleanup();
    };
  }, []);

  // 数据变化时更新
  useEffect(() => {
    if (chartInstance.current) {
      updateData();
    }
  }, [data, indicators]);

  // 配置变化时重新初始化
  useEffect(() => {
    if (chartInstance.current) {
      cleanup();
      initChart();
    }
  }, [dataType, seriesConfig]);

  return (
    <div
      ref={chartRef}
      className={className}
      style={{
        width,
        height,
        ...style
      }}
      {...props}
    />
  );
});

LightweightChart.displayName = 'LightweightChart';

export default LightweightChart;
