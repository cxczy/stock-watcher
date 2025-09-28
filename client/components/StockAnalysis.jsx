import React, { useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Card, Tabs, Button, Select, InputNumber, Switch, Table, message, Spin } from 'antd';
import { StockService } from '../services/stockService.js';
import { ContinuousDownStrategy } from '../strategies/ContinuousDownStrategy.js';
import { VolumeRatioStrategy } from '../strategies/VolumeRatioStrategy.js';
import { DataUtils } from '../utils/dataUtils.js';
import { STOCK_POOLS } from '../data/stockPools.js';
import StockChart from './StockChart.jsx';
import { StockDebug } from '../debug/stockDebug.js';
import TechnicalScreener from './TechnicalScreener.jsx';
import SingleStockTest from './SingleStockTest.jsx';
import PortfolioMonitor from './PortfolioMonitor.jsx';
import PortfolioHoldings from './PortfolioHoldings.jsx';
import {
  selectedCodeAtom,
  klineDataAtom,
  backtestResultsAtom,
  loadingAtom,
  errorAtom,
  selectedPoolAtom,
  strategyParamsAtom,
  backtestStatsAtom
} from '../atoms/stockAtoms.js';

const { TabPane } = Tabs;
const { Option } = Select;

export default function StockAnalysis() {
  const [selectedCode, setSelectedCode] = useAtom(selectedCodeAtom);
  const [klineData, setKlineData] = useAtom(klineDataAtom);
  const [backtestResults, setBacktestResults] = useAtom(backtestResultsAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const [error, setError] = useAtom(errorAtom);
  const [selectedPool, setSelectedPool] = useAtom(selectedPoolAtom);
  const [strategyParams, setStrategyParams] = useAtom(strategyParamsAtom);
  const [backtestStats, setBacktestStats] = useAtom(backtestStatsAtom);
  
  const [activeTab, setActiveTab] = useState('1');
  const [selectedStrategy, setSelectedStrategy] = useState('continuousDown');

  // 获取历史数据
  const handleGetHistory = async () => {
    if (!selectedCode) {
      message.warning('请先选择股票代码');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 添加调试信息
      console.log('🔍 开始获取股票数据:', selectedCode);
      const data = await StockService.getKlineData(selectedCode, 600);
      setKlineData(data);
      message.success(`数据获取成功，共${data.length}条记录`);
    } catch (err) {
      console.error('❌ 获取数据失败:', err);
      setError(err.message);
      message.error(`数据获取失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 调试API
  const handleDebugAPI = async () => {
    try {
      console.log('🔧 开始调试API...');
      await StockDebug.debugStockAPI(selectedCode || '600563');
      message.success('调试完成，请查看控制台');
    } catch (err) {
      console.error('❌ 调试失败:', err);
      message.error('调试失败，请查看控制台');
    }
  };

  // 执行回测
  const handleBacktest = () => {
    if (klineData.length === 0) {
      message.warning('请先获取股票数据');
      return;
    }

    let strategy;
    switch (selectedStrategy) {
      case 'continuousDown':
        strategy = new ContinuousDownStrategy();
        break;
      case 'volumeRatio':
        strategy = new VolumeRatioStrategy();
        break;
      default:
        strategy = new ContinuousDownStrategy();
    }

    try {
      const results = strategy.execute(klineData, strategyParams);
      setBacktestResults(results);
      
      // 计算统计信息
      const stats = DataUtils.calculateBacktestStats(results);
      setBacktestStats(stats);
      
      message.success('回测完成');
    } catch (err) {
      message.error('回测失败: ' + err.message);
    }
  };

  // 表格列定义
  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
    { title: '开盘', dataIndex: 'open', key: 'open', width: 80, render: (value) => value?.toFixed(2) },
    { title: '收盘', dataIndex: 'close', key: 'close', width: 80, render: (value) => value?.toFixed(2) },
    { title: '最高', dataIndex: 'high', key: 'high', width: 80, render: (value) => value?.toFixed(2) },
    { title: '最低', dataIndex: 'low', key: 'low', width: 80, render: (value) => value?.toFixed(2) },
    { title: '成交量', dataIndex: 'volume', key: 'volume', width: 100, render: (value) => value?.toLocaleString() },
    { title: '涨跌幅', dataIndex: 'rate', key: 'rate', width: 80, render: (value) => `${value?.toFixed(2)}%` },
    { title: '买入', dataIndex: 'buy', key: 'buy', width: 60, render: (value) => value ? '✓' : '' },
    { title: '卖出', dataIndex: 'sell', key: 'sell', width: 60, render: (value) => value ? '✓' : '' },
    { title: '收益率', dataIndex: 'delta', key: 'delta', width: 80, render: (value) => value ? `${value.toFixed(2)}%` : '' }
  ];

  // 合并数据和回测结果
  const tableData = klineData.map((item, index) => ({
    ...item,
    buy: backtestResults[index]?.buy || false,
    sell: backtestResults[index]?.sell || false,
    delta: backtestResults[index]?.delta || 0
  }));

  return (
    <div className="p-1">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="池子筛选" key="1">
          <Card>
            <div className="mb-4">
              <Select
                value={selectedPool}
                onChange={setSelectedPool}
                style={{ width: 200, marginRight: 16 }}
                placeholder="选择股票池"
              >
                {Object.keys(STOCK_POOLS).map(pool => (
                  <Option key={pool} value={pool}>{pool}</Option>
                ))}
              </Select>
              
              <Select
                value={selectedCode}
                onChange={setSelectedCode}
                style={{ width: 200, marginRight: 16 }}
                placeholder="选择股票代码"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {STOCK_POOLS[selectedPool]?.map(code => (
                  <Option key={code} value={code}>{code}</Option>
                ))}
              </Select>
              
              <Button 
                type="primary" 
                onClick={handleGetHistory}
                loading={loading}
              >
                查询历史
              </Button>
              
              <Button 
                onClick={handleDebugAPI}
                style={{ marginLeft: 8 }}
              >
                调试API
              </Button>
            </div>
            
            {error && (
              <div className="text-red-500 mb-4">
                错误: {error}
              </div>
            )}
          </Card>
        </TabPane>
        
        <TabPane tab="单股票测试" key="2">
          <SingleStockTest />
        </TabPane>
        
        <TabPane tab="技术分析选股" key="3">
          <TechnicalScreener />
        </TabPane>
        
        <TabPane tab="自选股监控" key="4">
          <PortfolioMonitor />
        </TabPane>
        
        <TabPane tab="持仓股管理" key="5">
          <PortfolioHoldings />
        </TabPane>
        
        <TabPane tab="回归分析" key="6">
          <Card>
            <div className="mb-4">
              <div className="mb-4">
                <label className="mr-2">策略选择:</label>
                <Select
                  value={selectedStrategy}
                  onChange={setSelectedStrategy}
                  style={{ width: 200, marginRight: 16 }}
                >
                  <Option value="continuousDown">连续下跌策略</Option>
                  <Option value="volumeRatio">成交量比率策略</Option>
                </Select>
              </div>
              
              <div className="mb-4">
                <InputNumber
                  value={strategyParams.buy}
                  onChange={(value) => setStrategyParams({...strategyParams, buy: value || 3})}
                  placeholder="买入条件"
                  style={{ marginRight: 16, width: 120 }}
                  min={1}
                  max={10}
                />
                <InputNumber
                  value={strategyParams.sell}
                  onChange={(value) => setStrategyParams({...strategyParams, sell: value || 1})}
                  placeholder="卖出条件"
                  style={{ marginRight: 16, width: 120 }}
                  min={1}
                  max={10}
                />
                <Switch
                  checked={strategyParams.wait}
                  onChange={(checked) => setStrategyParams({...strategyParams, wait: checked})}
                  style={{ marginRight: 16 }}
                />
                <span className="mr-4">等待止跌</span>
                
                <Button 
                  type="primary" 
                  onClick={handleBacktest}
                  disabled={klineData.length === 0}
                >
                  执行回测
                </Button>
              </div>
              
              {backtestStats && (
                <div className="mb-4 p-4 bg-gray-50 rounded">
                  <h4 className="mb-2">回测统计</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>总交易次数: {backtestStats.totalTrades}</div>
                    <div>胜率: {DataUtils.formatPercent(backtestStats.winRate)}</div>
                    <div>平均收益率: {DataUtils.formatPercent(backtestStats.avgReturn)}</div>
                    <div>总收益率: {DataUtils.formatPercent(backtestStats.totalReturn)}</div>
                  </div>
                </div>
              )}
            </div>
            
            {klineData.length > 0 && (
              <div className="mb-6">
                <StockChart />
              </div>
            )}
            
            <Spin spinning={loading}>
              <Table
                columns={columns}
                dataSource={tableData}
                pagination={{ pageSize: 20 }}
                scroll={{ y: 400 }}
                rowKey="date"
              />
            </Spin>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}
