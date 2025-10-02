// lightweight-charts适配器
import { 
  createChart, 
  CandlestickSeries, 
  HistogramSeries, 
  LineSeries 
} from 'lightweight-charts';

export class LightweightChartsAdapter {
  constructor(container, options = {}) {
    this.container = container;
    this.chart = null;
    this.series = {};
    this.options = {
      width: 800,
      height: 400,
      layout: {
        background: { type: 'solid', color: 'white' },
        textColor: 'black',
      },
      grid: {
        vertLines: { color: '#e1e1e1' },
        horzLines: { color: '#e1e1e1' },
      },
      crosshair: {
        mode: 1,
      },
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
  }

  // 初始化图表
  init() {
    if (this.chart) {
      this.chart.remove();
    }
    
    this.chart = createChart(this.container, this.options);
    return this;
  }

  // 添加K线图
  addCandlestickSeries(options = {}) {
    const defaultOptions = {
      upColor: '#ef232a',
      downColor: '#14b143',
      borderUpColor: '#ef232a',
      borderDownColor: '#14b143',
      wickUpColor: '#ef232a',
      wickDownColor: '#14b143',
    };
    
    this.series.candlestick = this.chart.addSeries(CandlestickSeries, {
      ...defaultOptions,
      ...options
    });
    return this.series.candlestick;
  }

  // 添加成交量图
  addVolumeSeries(options = {}) {
    const defaultOptions = {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume', // 使用独立的价格刻度ID
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    };
    
    this.series.volume = this.chart.addSeries(HistogramSeries, {
      ...defaultOptions,
      ...options
    });
    return this.series.volume;
  }

  // 添加线图（用于布林带等）
  addLineSeries(options = {}) {
    const defaultOptions = {
      color: '#2196F3',
      lineWidth: 1,
    };
    
    const series = this.chart.addSeries(LineSeries, {
      ...defaultOptions,
      ...options
    });
    
    if (!this.series.lines) {
      this.series.lines = [];
    }
    this.series.lines.push(series);
    return series;
  }

  // 添加柱状图（用于MACD柱状图）
  addHistogramSeries(options = {}) {
    const defaultOptions = {
      color: '#52c41a',
      priceFormat: {
        type: 'volume',
      },
    };
    
    const series = this.chart.addSeries(HistogramSeries, {
      ...defaultOptions,
      ...options
    });
    
    if (!this.series.histograms) {
      this.series.histograms = [];
    }
    this.series.histograms.push(series);
    return series;
  }

  // 设置数据
  setData(seriesName, data) {
    if (this.series[seriesName]) {
      this.series[seriesName].setData(data);
    }
  }

  // 更新数据
  updateData(seriesName, data) {
    if (this.series[seriesName]) {
      this.series[seriesName].update(data);
    }
  }

  // 适配东方财富K线数据
  adaptEastMoneyKlineData(klineData) {
    return klineData.map(item => ({
      time: this.formatTime(item.date),
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
    }));
  }

  // 适配东方财富成交量数据
  adaptEastMoneyVolumeData(klineData) {
    return klineData.map(item => ({
      time: this.formatTime(item.date),
      value: parseInt(item.volume),
      color: parseFloat(item.close) >= parseFloat(item.open) ? '#ef232a' : '#14b143'
    }));
  }

  // 适配布林带数据
  adaptBollingerBandsData(klineData, bollData) {
    const upper = klineData.map((item, index) => ({
      time: this.formatTime(item.date),
      value: bollData.upper[index] || null
    })).filter(item => item.value !== null);

    const middle = klineData.map((item, index) => ({
      time: this.formatTime(item.date),
      value: bollData.middle[index] || null
    })).filter(item => item.value !== null);

    const lower = klineData.map((item, index) => ({
      time: this.formatTime(item.date),
      value: bollData.lower[index] || null
    })).filter(item => item.value !== null);

    return { upper, middle, lower };
  }

  // 适配MACD数据
  adaptMACDData(klineData, macdData) {
    const macd = klineData.map((item, index) => ({
      time: this.formatTime(item.date),
      value: macdData.macdLine[index] || null
    })).filter(item => item.value !== null);

    const signal = klineData.map((item, index) => ({
      time: this.formatTime(item.date),
      value: macdData.signalLine[index] || null
    })).filter(item => item.value !== null);

    const histogram = klineData.map((item, index) => ({
      time: this.formatTime(item.date),
      value: macdData.histogram[index] || null,
      color: (macdData.histogram[index] || 0) >= 0 ? '#52c41a' : '#ff4d4f'
    })).filter(item => item.value !== null);

    return { macd, signal, histogram };
  }

  // 格式化时间
  formatTime(dateStr) {
    // 将 "20240101" 格式转换为 "2024-01-01"
    if (dateStr && dateStr.length === 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  }

  // 调整图表大小
  resize(width, height) {
    if (this.chart) {
      this.chart.applyOptions({ width, height });
    }
  }

  // 销毁图表
  destroy() {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
      this.series = {};
    }
  }

  // 获取图表实例
  getChart() {
    return this.chart;
  }

  // 获取系列实例
  getSeries(seriesName) {
    return this.series[seriesName];
  }
}

// 创建多图表布局的辅助函数
export function createMultiChartLayout(container, charts = []) {
  const layout = {
    container,
    charts: [],
    init() {
      this.charts = charts.map(config => {
        const adapter = new LightweightChartsAdapter(config.container, config.options);
        adapter.init();
        return { ...config, adapter };
      });
      return this;
    },
    updateData(chartIndex, seriesName, data) {
      if (this.charts[chartIndex]) {
        this.charts[chartIndex].adapter.setData(seriesName, data);
      }
    },
    resize(width, height) {
      this.charts.forEach(chart => {
        chart.adapter.resize(width, height);
      });
    },
    destroy() {
      this.charts.forEach(chart => {
        chart.adapter.destroy();
      });
    }
  };
  
  return layout;
}