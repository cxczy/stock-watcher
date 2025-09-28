import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { 
  Card, 
  Tabs, 
  Button, 
  Select, 
  InputNumber, 
  Switch, 
  Table, 
  message, 
  Spin, 
  Progress,
  Tag,
  Space,
  Divider
} from 'antd';
import { StockService } from '../services/stockService.js';
import { SimpleIndicators } from '../utils/simpleIndicators.js';
import { DataUtils } from '../utils/dataUtils.js';
import { STOCK_POOLS_EXTENDED, STOCK_POOL_INFO } from '../data/stockPoolsExtended.js';
import {
  selectedCodeAtom,
  klineDataAtom,
  loadingAtom,
  errorAtom
} from '../atoms/stockAtoms.js';

const { TabPane } = Tabs;
const { Option } = Select;

// 使用扩展的股票池数据

export default function TechnicalScreener() {
  const [selectedPool, setSelectedPool] = useState('沪深300');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screeningResults, setScreeningResults] = useState([]);
  const [screeningProgress, setScreeningProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('1');

  // 技术指标筛选条件
  const [screeningConditions, setScreeningConditions] = useState({
    // MACD条件
    macdGoldenCross: false,
    macdPeriod: { fast: 12, slow: 26, signal: 9 },
    
    // KDJ条件
    kdjOverSold: false,
    kdjOverBought: false,
    kdjPeriod: 9,
    
    // 双均线条件
    dualMAGoldenCross: false,
    dualMADeadCross: false,
    dualMAPeriod: { short: 5, long: 20 },
    
    // RSI条件
    rsiOverSold: false,
    rsiOverBought: false,
    rsiPeriod: 14,
    rsiThreshold: { oversold: 30, overbought: 70 },
    
    // 布林带条件
    bollingerBands: false,
    bollingerPeriod: 20,
    bollingerStdDev: 2,
    
    // 成交量条件
    volumeRatio: false,
    volumeRatioThreshold: 1.5,
    
    // 价格条件
    priceChange: false,
    priceChangeThreshold: 5, // 涨跌幅百分比
    priceChangeType: 'positive' // positive/negative
  });

  // 执行技术分析筛选
  const handleScreening = async () => {
    if (!selectedPool) {
      message.warning('请选择股票池');
      return;
    }

    setLoading(true);
    setError(null);
    setScreeningResults([]);
    setScreeningProgress(0);

    const stocks = STOCK_POOLS_EXTENDED[selectedPool];
    const results = [];
    const totalStocks = stocks.length;
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    try {
      // 限制并发请求数量，避免API限制
      const batchSize = 5; // 每批处理5个股票
      
      for (let batchStart = 0; batchStart < stocks.length; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, stocks.length);
        const batchStocks = stocks.slice(batchStart, batchEnd);
        
        // 并行处理当前批次的股票
        const batchPromises = batchStocks.map(async (stockCode) => {
          try {
            console.log(`正在处理股票: ${stockCode}`);
            
            // 添加超时控制
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('请求超时')), 10000)
            );
            
            const dataPromise = StockService.getKlineData(stockCode, 100);
            const klineData = await Promise.race([dataPromise, timeoutPromise]);
            
            if (klineData.length < 50) {
              console.log(`股票 ${stockCode} 数据不足，跳过`);
              return null; // 数据不足，跳过
            }

            const latestIndex = klineData.length - 1;
            const prices = klineData.map(d => d.close);
            const highs = klineData.map(d => d.high);
            const lows = klineData.map(d => d.low);
            const volumes = klineData.map(d => d.volume);

            // 检查各种技术指标条件（使用简化版本）
            const conditions = {
              macdGoldenCross: screeningConditions.macdGoldenCross ? 
                SimpleIndicators.isMACDGoldenCross(prices, screeningConditions.macdPeriod.fast, screeningConditions.macdPeriod.slow, latestIndex) : true,
              
              kdjOverSold: screeningConditions.kdjOverSold ? 
                SimpleIndicators.isKDJOverSold(highs, lows, prices, screeningConditions.kdjPeriod, latestIndex) : true,
              
              kdjOverBought: screeningConditions.kdjOverBought ? 
                SimpleIndicators.isKDJOverBought(highs, lows, prices, screeningConditions.kdjPeriod, latestIndex) : true,
              
              dualMAGoldenCross: screeningConditions.dualMAGoldenCross ? 
                SimpleIndicators.isDualMAGoldenCross(prices, screeningConditions.dualMAPeriod.short, screeningConditions.dualMAPeriod.long, latestIndex) : true,
              
              dualMADeadCross: screeningConditions.dualMADeadCross ? 
                SimpleIndicators.isDualMADeadCross(prices, screeningConditions.dualMAPeriod.short, screeningConditions.dualMAPeriod.long, latestIndex) : true,
              
              rsiOverSold: screeningConditions.rsiOverSold ? 
                SimpleIndicators.RSI(prices, screeningConditions.rsiPeriod, latestIndex) < screeningConditions.rsiThreshold.oversold : true,
              
              rsiOverBought: screeningConditions.rsiOverBought ? 
                SimpleIndicators.RSI(prices, screeningConditions.rsiPeriod, latestIndex) > screeningConditions.rsiThreshold.overbought : true,
              
              volumeRatio: screeningConditions.volumeRatio ? 
                SimpleIndicators.volumeRatio(volumes, latestIndex) > screeningConditions.volumeRatioThreshold : true,
              
              priceChange: screeningConditions.priceChange ? 
                (screeningConditions.priceChangeType === 'positive' ? 
                  klineData[latestIndex].rate > screeningConditions.priceChangeThreshold :
                  klineData[latestIndex].rate < -screeningConditions.priceChangeThreshold) : true
            };

            // 检查是否满足所有条件
            const allConditionsMet = Object.values(conditions).every(condition => condition);

            if (allConditionsMet) {
              // 计算技术指标值
              const macd = SimpleIndicators.MACD(prices, screeningConditions.macdPeriod.fast, screeningConditions.macdPeriod.slow, 9, latestIndex);
              const kdj = SimpleIndicators.KDJ(highs, lows, prices, screeningConditions.kdjPeriod, latestIndex);
              const rsi = SimpleIndicators.RSI(prices, screeningConditions.rsiPeriod, latestIndex);
              const bollinger = SimpleIndicators.BollingerBands(prices, screeningConditions.bollingerPeriod, screeningConditions.bollingerStdDev, latestIndex);
              const volumeRatio = SimpleIndicators.volumeRatio(volumes, latestIndex);

              return {
                code: stockCode,
                name: `股票${stockCode}`,
                price: klineData[latestIndex].close,
                change: klineData[latestIndex].rate,
                volume: klineData[latestIndex].volume,
                macd: macd.macd,
                kdj: kdj,
                rsi: rsi,
                bollinger: bollinger,
                volumeRatio: volumeRatio,
                conditions: conditions
              };
            }

            return null; // 不满足条件

          } catch (stockError) {
            console.warn(`股票 ${stockCode} 处理失败:`, stockError);
            errorCount++;
            return null;
          }
        });

        // 等待当前批次完成
        const batchResults = await Promise.all(batchPromises);
        
        // 过滤掉null结果并添加到总结果中
        const validResults = batchResults.filter(result => result !== null);
        results.push(...validResults);
        
        processedCount += batchStocks.length;
        successCount += validResults.length;
        
        // 更新进度
        setScreeningProgress(Math.round((processedCount / totalStocks) * 100));
        
        // 批次间添加延迟，避免API限制
        if (batchEnd < stocks.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setScreeningResults(results);
      message.success(`筛选完成，找到 ${results.length} 只符合条件的股票`);

    } catch (err) {
      setError(err.message);
      message.error('筛选过程中出错');
    } finally {
      setLoading(false);
      setScreeningProgress(0);
    }
  };

  // 表格列定义
  const columns = [
    { title: '股票代码', dataIndex: 'code', key: 'code', width: 100 },
    { title: '股票名称', dataIndex: 'name', key: 'name', width: 120 },
    { title: '最新价', dataIndex: 'price', key: 'price', width: 80, render: (value) => value?.toFixed(2) },
    { title: '涨跌幅', dataIndex: 'change', key: 'change', width: 80, render: (value) => `${value?.toFixed(2)}%` },
    { title: '成交量', dataIndex: 'volume', key: 'volume', width: 100, render: (value) => value?.toLocaleString() },
    { title: 'MACD', dataIndex: 'macd', key: 'macd', width: 80, render: (value) => value?.toFixed(4) },
    { title: 'KDJ-K', dataIndex: 'kdj', key: 'kdj', width: 80, render: (value) => value?.k?.toFixed(2) },
    { title: 'KDJ-D', dataIndex: 'kdj', key: 'kdj-d', width: 80, render: (value) => value?.d?.toFixed(2) },
    { title: 'RSI', dataIndex: 'rsi', key: 'rsi', width: 80, render: (value) => value?.toFixed(2) },
    { title: '成交量比', dataIndex: 'volumeRatio', key: 'volumeRatio', width: 80, render: (value) => value?.toFixed(2) },
    { 
      title: '技术信号', 
      dataIndex: 'conditions', 
      key: 'signals',
      render: (conditions) => (
        <Space wrap>
          {conditions.macdGoldenCross && <Tag color="green">MACD金叉</Tag>}
          {conditions.kdjOverSold && <Tag color="blue">KDJ超卖</Tag>}
          {conditions.kdjOverBought && <Tag color="red">KDJ超买</Tag>}
          {conditions.dualMAGoldenCross && <Tag color="green">双均线金叉</Tag>}
          {conditions.rsiOverSold && <Tag color="blue">RSI超卖</Tag>}
          {conditions.rsiOverBought && <Tag color="red">RSI超买</Tag>}
          {conditions.volumeRatio && <Tag color="orange">放量</Tag>}
        </Space>
      )
    }
  ];

  return (
    <div className="p-1">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="技术分析选股" key="1">
          <Card>
            <div className="mb-6">
              <h3 className="mb-4">筛选条件设置</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* 股票池选择 */}
                <div>
                  <label className="block mb-2">股票池:</label>
                  <Select
                    value={selectedPool}
                    onChange={setSelectedPool}
                    style={{ width: '100%' }}
                  >
                    {Object.keys(STOCK_POOLS_EXTENDED).map(pool => (
                      <Option key={pool} value={pool}>
                        {pool} ({STOCK_POOL_INFO[pool]?.stockCount || 0}只股票)
                      </Option>
                    ))}
                  </Select>
                </div>

                {/* MACD条件 */}
                <div>
                  <label className="block mb-2">MACD金叉:</label>
                  <Switch
                    checked={screeningConditions.macdGoldenCross}
                    onChange={(checked) => setScreeningConditions({
                      ...screeningConditions,
                      macdGoldenCross: checked
                    })}
                  />
                </div>

                {/* KDJ条件 */}
                <div>
                  <label className="block mb-2">KDJ超卖:</label>
                  <Switch
                    checked={screeningConditions.kdjOverSold}
                    onChange={(checked) => setScreeningConditions({
                      ...screeningConditions,
                      kdjOverSold: checked
                    })}
                  />
                </div>

                <div>
                  <label className="block mb-2">KDJ超买:</label>
                  <Switch
                    checked={screeningConditions.kdjOverBought}
                    onChange={(checked) => setScreeningConditions({
                      ...screeningConditions,
                      kdjOverBought: checked
                    })}
                  />
                </div>

                {/* 双均线条件 */}
                <div>
                  <label className="block mb-2">双均线金叉:</label>
                  <Switch
                    checked={screeningConditions.dualMAGoldenCross}
                    onChange={(checked) => setScreeningConditions({
                      ...screeningConditions,
                      dualMAGoldenCross: checked
                    })}
                  />
                </div>

                {/* RSI条件 */}
                <div>
                  <label className="block mb-2">RSI超卖:</label>
                  <Switch
                    checked={screeningConditions.rsiOverSold}
                    onChange={(checked) => setScreeningConditions({
                      ...screeningConditions,
                      rsiOverSold: checked
                    })}
                  />
                </div>

                <div>
                  <label className="block mb-2">RSI超买:</label>
                  <Switch
                    checked={screeningConditions.rsiOverBought}
                    onChange={(checked) => setScreeningConditions({
                      ...screeningConditions,
                      rsiOverBought: checked
                    })}
                  />
                </div>

                {/* 成交量条件 */}
                <div>
                  <label className="block mb-2">放量条件:</label>
                  <Switch
                    checked={screeningConditions.volumeRatio}
                    onChange={(checked) => setScreeningConditions({
                      ...screeningConditions,
                      volumeRatio: checked
                    })}
                  />
                </div>

                {/* 价格条件 */}
                <div>
                  <label className="block mb-2">涨跌幅条件:</label>
                  <Switch
                    checked={screeningConditions.priceChange}
                    onChange={(checked) => setScreeningConditions({
                      ...screeningConditions,
                      priceChange: checked
                    })}
                  />
                </div>
              </div>

              <Divider />

              <div className="flex justify-between items-center">
                <div>
                  <Button 
                    type="primary" 
                    size="large"
                    onClick={handleScreening}
                    loading={loading}
                    disabled={loading}
                  >
                    开始筛选
                  </Button>
                </div>
                
                {loading && (
                  <div className="flex items-center">
                    <Progress 
                      percent={screeningProgress} 
                      size="small" 
                      style={{ width: 200, marginRight: 16 }}
                    />
                    <span>筛选进度: {screeningProgress}%</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
                错误: {error}
              </div>
            )}

            <Spin spinning={loading}>
              <Table
                columns={columns}
                dataSource={screeningResults}
                pagination={{ pageSize: 20 }}
                scroll={{ y: 400 }}
                rowKey="code"
                size="small"
              />
            </Spin>
          </Card>
        </TabPane>

        <TabPane tab="指标说明" key="2">
          <Card>
            <div className="space-y-4">
              <h3>技术指标说明</h3>
              
              <div>
                <h4>MACD指标</h4>
                <p>MACD金叉：快线上穿慢线，通常表示买入信号</p>
                <p>MACD死叉：快线下穿慢线，通常表示卖出信号</p>
              </div>

              <div>
                <h4>KDJ指标</h4>
                <p>KDJ超卖：K值和D值都小于20，表示可能超卖，买入机会</p>
                <p>KDJ超买：K值和D值都大于80，表示可能超买，卖出机会</p>
              </div>

              <div>
                <h4>双均线系统</h4>
                <p>双均线金叉：短期均线上穿长期均线，买入信号</p>
                <p>双均线死叉：短期均线下穿长期均线，卖出信号</p>
              </div>

              <div>
                <h4>RSI指标</h4>
                <p>RSI超卖：RSI小于30，表示可能超卖</p>
                <p>RSI超买：RSI大于70，表示可能超买</p>
              </div>

              <div>
                <h4>成交量指标</h4>
                <p>成交量比率：当前成交量与近期平均成交量的比值</p>
                <p>放量：成交量比率大于设定阈值，表示资金关注度高</p>
              </div>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}
