import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Select, 
  message, 
  Spin, 
  Table,
  Tag,
  Space,
  Statistic,
  Row,
  Col
} from 'antd';
import { StockService } from '../services/stockService.js';
import { SimpleIndicators } from '../utils/simpleIndicators.js';

const { Option } = Select;

// 单个股票测试
const TEST_STOCKS = [
  '000001', '000002', '600036', '600519', '600276'
];

export default function SingleStockTest() {
  const [selectedStock, setSelectedStock] = useState('000001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);

  // 测试单个股票
  const handleSingleTest = async () => {
    if (!selectedStock) {
      message.warning('请选择股票');
      return;
    }

    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      console.log(`开始测试股票: ${selectedStock}`);
      
      // 添加超时控制
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('请求超时')), 10000)
      );
      
      const dataPromise = StockService.getKlineData(selectedStock, 100);
      const klineData = await Promise.race([dataPromise, timeoutPromise]);
      
      console.log(`获取到 ${klineData.length} 条K线数据`);
      
      if (klineData.length < 50) {
        message.warning(`股票 ${selectedStock} 数据不足，只有 ${klineData.length} 条数据`);
        return;
      }

      const latestIndex = klineData.length - 1;
      const prices = klineData.map(d => d.close);
      const highs = klineData.map(d => d.high);
      const lows = klineData.map(d => d.low);
      const volumes = klineData.map(d => d.volume);

      // 计算各种技术指标（使用简化版本）
      const macd = SimpleIndicators.MACD(prices, 12, 26, 9, latestIndex);
      const kdj = SimpleIndicators.KDJ(highs, lows, prices, 9, latestIndex);
      const rsi = SimpleIndicators.RSI(prices, 14, latestIndex);
      const volumeRatio = SimpleIndicators.volumeRatio(volumes, latestIndex);
      const williamsR = SimpleIndicators.WilliamsR(highs, lows, prices, 14, latestIndex);
      const cci = SimpleIndicators.CCI(highs, lows, prices, 20, latestIndex);

      // 检查各种条件
      const conditions = {
        macdGoldenCross: SimpleIndicators.isMACDGoldenCross(prices, 12, 26, latestIndex),
        kdjOverSold: SimpleIndicators.isKDJOverSold(highs, lows, prices, 9, latestIndex),
        kdjOverBought: SimpleIndicators.isKDJOverBought(highs, lows, prices, 9, latestIndex),
        rsiOverSold: rsi < 30,
        rsiOverBought: rsi > 70,
        volumeRatio: volumeRatio > 1.5,
        williamsROverSold: williamsR < -80,
        williamsROverBought: williamsR > -20,
        cciOverSold: cci < -100,
        cciOverBought: cci > 100
      };

      const result = {
        code: selectedStock,
        name: `股票${selectedStock}`,
        price: klineData[latestIndex].close,
        change: klineData[latestIndex].rate,
        volume: klineData[latestIndex].volume,
        macd: macd.macd,
        kdj: kdj,
        rsi: rsi,
        volumeRatio: volumeRatio,
        williamsR: williamsR,
        cci: cci,
        conditions: conditions
      };

      setTestResult(result);
      message.success(`股票 ${selectedStock} 测试完成`);

    } catch (err) {
      console.error('测试失败:', err);
      setError(err.message);
      message.error(`测试失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    { title: '指标', dataIndex: 'indicator', key: 'indicator', width: 120 },
    { title: '数值', dataIndex: 'value', key: 'value', width: 100 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100 }
  ];

  // 准备表格数据
  const tableData = testResult ? [
    { indicator: '最新价', value: testResult.price?.toFixed(2), status: '-' },
    { indicator: '涨跌幅', value: `${testResult.change?.toFixed(2)}%`, status: testResult.change > 0 ? '上涨' : '下跌' },
    { indicator: '成交量', value: testResult.volume?.toLocaleString(), status: '-' },
    { indicator: 'MACD', value: testResult.macd?.toFixed(4), status: testResult.conditions.macdGoldenCross ? '金叉' : '非金叉' },
    { indicator: 'KDJ-K', value: testResult.kdj?.k?.toFixed(2), status: testResult.conditions.kdjOverSold ? '超卖' : testResult.conditions.kdjOverBought ? '超买' : '正常' },
    { indicator: 'KDJ-D', value: testResult.kdj?.d?.toFixed(2), status: testResult.conditions.kdjOverSold ? '超卖' : testResult.conditions.kdjOverBought ? '超买' : '正常' },
    { indicator: 'RSI', value: testResult.rsi?.toFixed(2), status: testResult.conditions.rsiOverSold ? '超卖' : testResult.conditions.rsiOverBought ? '超买' : '正常' },
    { indicator: '成交量比', value: testResult.volumeRatio?.toFixed(2), status: testResult.conditions.volumeRatio ? '放量' : '正常' },
    { indicator: '威廉指标', value: testResult.williamsR?.toFixed(2), status: testResult.conditions.williamsROverSold ? '超卖' : testResult.conditions.williamsROverBought ? '超买' : '正常' },
    { indicator: 'CCI', value: testResult.cci?.toFixed(2), status: testResult.conditions.cciOverSold ? '超卖' : testResult.conditions.cciOverBought ? '超买' : '正常' }
  ] : [];

  return (
    <div className="p-6">
      <Card>
        <div className="mb-6">
          <h3 className="mb-4">单股票测试（API验证）</h3>
          
          <Row gutter={16} className="mb-4">
            <Col span={8}>
              <label className="block mb-2">选择股票:</label>
              <Select
                value={selectedStock}
                onChange={setSelectedStock}
                style={{ width: '100%' }}
              >
                {TEST_STOCKS.map(stock => (
                  <Option key={stock} value={stock}>
                    {stock}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>

          <div className="flex justify-between items-center">
            <div>
              <Button 
                type="primary" 
                size="large"
                onClick={handleSingleTest}
                loading={loading}
                disabled={loading}
              >
                测试单个股票
              </Button>
            </div>
          </div>

          {testResult && (
            <Row gutter={16} className="mt-4">
              <Col span={6}>
                <Statistic title="股票代码" value={testResult.code} />
              </Col>
              <Col span={6}>
                <Statistic title="最新价" value={testResult.price?.toFixed(2)} />
              </Col>
              <Col span={6}>
                <Statistic title="涨跌幅" value={`${testResult.change?.toFixed(2)}%`} />
              </Col>
              <Col span={6}>
                <Statistic title="成交量" value={testResult.volume?.toLocaleString()} />
              </Col>
            </Row>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
            错误: {error}
          </div>
        )}

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            rowKey="indicator"
            size="small"
          />
        </Spin>

        {testResult && (
          <div className="mt-4">
            <h4>技术信号:</h4>
            <Space wrap>
              {testResult.conditions.macdGoldenCross && <Tag color="green">MACD金叉</Tag>}
              {testResult.conditions.kdjOverSold && <Tag color="blue">KDJ超卖</Tag>}
              {testResult.conditions.kdjOverBought && <Tag color="red">KDJ超买</Tag>}
              {testResult.conditions.rsiOverSold && <Tag color="blue">RSI超卖</Tag>}
              {testResult.conditions.rsiOverBought && <Tag color="red">RSI超买</Tag>}
              {testResult.conditions.volumeRatio && <Tag color="orange">放量</Tag>}
              {testResult.conditions.williamsROverSold && <Tag color="blue">威廉超卖</Tag>}
              {testResult.conditions.williamsROverBought && <Tag color="red">威廉超买</Tag>}
              {testResult.conditions.cciOverSold && <Tag color="blue">CCI超卖</Tag>}
              {testResult.conditions.cciOverBought && <Tag color="red">CCI超买</Tag>}
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
}
