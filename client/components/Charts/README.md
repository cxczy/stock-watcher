# Lightweight Charts 5.0 组件库

这是一个基于 lightweight-charts 5.0 的 React 组件库，实现了数据和展示的分离，提供了灵活的图表配置选项。

## 组件列表

### 1. LightweightChart - 基础图表组件
通用的 lightweight-charts 组件，支持多种图表类型。

```jsx
import { LightweightChart } from './Charts';

<LightweightChart
  data={klineData}
  dataType="candlestick"
  height={400}
  seriesConfig={{
    upColor: '#ef232a',
    downColor: '#14b143'
  }}
  indicators={[
    {
      type: 'line',
      data: bollingerData.upper,
      options: { color: '#ff4d4f', lineWidth: 1 }
    }
  ]}
  onChartReady={(chart) => console.log('图表就绪', chart)}
/>
```

### 2. CandlestickChart - K线图表组件
专门用于显示K线图和布林带指标。

```jsx
import { CandlestickChart } from './Charts';

<CandlestickChart
  data={klineData}
  bollingerData={bollingerData}
  showBollingerBands={true}
  height={400}
  onChartReady={(chart) => console.log('K线图就绪', chart)}
/>
```

### 3. VolumeChart - 成交量图表组件
专门用于显示成交量数据。

```jsx
import { VolumeChart } from './Charts';

<VolumeChart
  data={volumeData}
  height={200}
  color="#26a69a"
  onChartReady={(chart) => console.log('成交量图就绪', chart)}
/>
```

### 4. MACDChart - MACD图表组件
专门用于显示MACD指标。

```jsx
import { MACDChart } from './Charts';

<MACDChart
  data={klineData}
  macdData={macdData}
  height={200}
  onChartReady={(chart) => console.log('MACD图就绪', chart)}
/>
```

### 5. CombinedChart - 组合图表组件
将K线图、成交量图和MACD图组合在一起。

```jsx
import { CombinedChart } from './Charts';

<CombinedChart
  klineData={klineData}
  volumeData={volumeData}
  bollingerData={bollingerData}
  macdData={macdData}
  showBollingerBands={true}
  showVolume={true}
  showMACD={true}
  klineHeight={400}
  volumeHeight={200}
  macdHeight={200}
  onKlineChartReady={(chart) => console.log('K线图就绪', chart)}
  onVolumeChartReady={(chart) => console.log('成交量图就绪', chart)}
  onMACDChartReady={(chart) => console.log('MACD图就绪', chart)}
/>
```

## 数据格式

### K线数据格式
```javascript
const klineData = [
  {
    date: '20240101',
    open: 100.0,
    high: 105.0,
    low: 98.0,
    close: 103.0,
    volume: 1000000
  },
  // ... 更多数据
];
```

### 布林带数据格式
```javascript
const bollingerData = {
  upper: [105.0, 106.0, 107.0], // 上轨
  middle: [100.0, 101.0, 102.0], // 中轨
  lower: [95.0, 96.0, 97.0]     // 下轨
};
```

### MACD数据格式
```javascript
const macdData = {
  macd: [0.5, 0.3, 0.1],        // MACD线
  signal: [0.4, 0.2, 0.0],      // 信号线
  histogram: [0.1, 0.1, 0.1]    // 柱状图
};
```

## 配置选项

### 通用配置
- `width`: 图表宽度 (默认: '100%')
- `height`: 图表高度 (默认: 400)
- `className`: CSS类名
- `style`: 内联样式
- `autoResize`: 自动调整大小 (默认: true)
- `crosshair`: 显示十字线 (默认: true)
- `grid`: 显示网格 (默认: true)

### 数据配置
- `data`: 图表数据
- `dataType`: 数据类型 ('candlestick', 'line', 'volume', 'histogram')
- `seriesConfig`: 系列配置选项
- `indicators`: 指标配置数组

### 事件回调
- `onChartReady`: 图表初始化完成回调
- `onDataUpdate`: 数据更新回调
- `onResize`: 大小调整回调

## 使用示例

### 基本使用
```jsx
import { CombinedChart } from './Charts';

function MyChart() {
  const [data, setData] = useState([]);
  
  return (
    <CombinedChart
      klineData={data}
      volumeData={data}
      showBollingerBands={true}
      showVolume={true}
      showMACD={true}
    />
  );
}
```

### 高级使用
```jsx
import { LightweightChart } from './Charts';

function AdvancedChart() {
  const chartRef = useRef(null);
  
  const handleChartReady = (chart) => {
    console.log('图表就绪', chart);
  };
  
  const updateData = (newData) => {
    if (chartRef.current) {
      chartRef.current.updateData(newData);
    }
  };
  
  return (
    <LightweightChart
      ref={chartRef}
      data={data}
      dataType="candlestick"
      indicators={indicators}
      onChartReady={handleChartReady}
    />
  );
}
```

## 注意事项

1. **数据格式**: 确保数据格式符合要求，特别是时间字段
2. **性能优化**: 大量数据时考虑数据分页或虚拟化
3. **内存管理**: 组件卸载时会自动清理图表资源
4. **响应式**: 支持自动调整大小，但建议设置合适的容器尺寸

## 技术栈

- React 19+
- lightweight-charts 5.0
- Ant Design (用于UI组件)
- 自定义适配器 (LightweightChartsAdapter)
