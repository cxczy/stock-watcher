import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { Card, Row, Col } from 'antd';
import CandlestickChart from './CandlestickChart';
import VolumeChart from './VolumeChart';
import MACDChart from './MACDChart';

/**
 * 组合图表组件
 * 将K线图、成交量图和MACD图组合在一起
 */
const CombinedChart = forwardRef(({
  // 数据
  klineData = [],
  volumeData = [],
  macdData = null,
  bollingerData = null,
  
  // 配置
  showVolume = true,
  showMACD = true,
  showBollingerBands = false,
  
  // 高度配置
  klineHeight = 400,
  volumeHeight = 200,
  macdHeight = 200,
  
  // 样式
  className = '',
  style = {},
  
  // 回调
  onKlineChartReady,
  onVolumeChartReady,
  onMACDChartReady,
  
  ...props
}, ref) => {
  const klineRef = useRef(null);
  const volumeRef = useRef(null);
  const macdRef = useRef(null);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    // 获取各个图表实例
    getKlineChart: () => klineRef.current?.getChart(),
    getVolumeChart: () => volumeRef.current?.getChart(),
    getMACDChart: () => macdRef.current?.getChart(),
    
    // 更新数据
    updateKlineData: (data) => {
      klineRef.current?.updateData(data);
    },
    updateVolumeData: (data) => {
      volumeRef.current?.updateData(data);
    },
    updateMACDData: (data) => {
      macdRef.current?.updateData(data);
    },
    
    // 调整大小
    resize: (width, height) => {
      klineRef.current?.resize(width, klineHeight);
      volumeRef.current?.resize(width, volumeHeight);
      macdRef.current?.resize(width, macdHeight);
    },
    
    // 销毁所有图表
    destroy: () => {
      klineRef.current?.destroy();
      volumeRef.current?.destroy();
      macdRef.current?.destroy();
    }
  }));

  return (
    <div className={className} style={style} {...props}>
      <Row gutter={[0, 16]}>
        {/* K线图 */}
        <Col span={24}>
          <Card size="small" title="K线图" style={{ marginBottom: 0 }}>
            <CandlestickChart
              ref={klineRef}
              data={klineData}
              bollingerData={bollingerData}
              showBollingerBands={showBollingerBands}
              height={klineHeight}
              onChartReady={onKlineChartReady}
            />
          </Card>
        </Col>
        
        {/* 成交量图 */}
        {showVolume && (
          <Col span={24}>
            <Card size="small" title="成交量" style={{ marginBottom: 0 }}>
              <VolumeChart
                ref={volumeRef}
                data={volumeData}
                height={volumeHeight}
                onChartReady={onVolumeChartReady}
              />
            </Card>
          </Col>
        )}
        
        {/* MACD图 */}
        {showMACD && (
          <Col span={24}>
            <Card size="small" title="MACD" style={{ marginBottom: 0 }}>
              <MACDChart
                ref={macdRef}
                data={klineData}
                macdData={macdData}
                height={macdHeight}
                onChartReady={onMACDChartReady}
              />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
});

CombinedChart.displayName = 'CombinedChart';

export default CombinedChart;
