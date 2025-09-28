import React, { useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Card, Button, Select, InputNumber, Switch, Table, message, Spin } from 'antd';
import { StockService } from '../services/stockService.js';
import { ContinuousDownStrategy } from '../strategies/ContinuousDownStrategy.js';
import { VolumeRatioStrategy } from '../strategies/VolumeRatioStrategy.js';
import { DataUtils } from '../utils/dataUtils.js';
import { STOCK_POOLS } from '../data/stockPools.js';
import StockChart from './StockChart.jsx';
import { StockDebug } from '../debug/stockDebug.js';
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

const { Option } = Select;

export default function PoolScreener() {
  const [selectedCode, setSelectedCode] = useAtom(selectedCodeAtom);
  const [klineData, setKlineData] = useAtom(klineDataAtom);
  const [backtestResults, setBacktestResults] = useAtom(backtestResultsAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const [error, setError] = useAtom(errorAtom);
  const [selectedPool, setSelectedPool] = useAtom(selectedPoolAtom);
  const [strategyParams, setStrategyParams] = useAtom(strategyParamsAtom);
  const [backtestStats, setBacktestStats] = useAtom(backtestStatsAtom);
  
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
      const data = await StockService.getKlineData(selectedCode, 100);
      setKlineData(data);
      message.success('数据获取成功');
    } catch (err) {
      setError(err.message);
      message.error('数据获取失败');
    } finally {
      setLoading(false);
    }
  };

  // 调试API
  const handleDebugAPI = async () => {
    if (!selectedCode) {
      message.warning('请先选择股票代码');
      return;
    }
    
    try {
      await StockDebug.debugStockAPI(selectedCode);
      message.success('调试完成，请查看控制台');
    } catch (err) {
      message.error('调试失败');
    }
  };

  // 回测
  const handleBacktest = async () => {
    if (!klineData || klineData.length === 0) {
      message.warning('请先获取历史数据');
      return;
    }

    setLoading(true);
    try {
      let strategy;
      if (selectedStrategy === 'continuousDown') {
        strategy = new ContinuousDownStrategy(strategyParams);
      } else {
        strategy = new VolumeRatioStrategy(strategyParams);
      }

      const results = strategy.backtest(klineData);
      setBacktestResults(results);
      
      const stats = DataUtils.calculateStats(results);
      setBacktestStats(stats);
      
      message.success('回测完成');
    } catch (err) {
      message.error('回测失败');
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '开盘价',
      dataIndex: 'open',
      key: 'open',
      render: (value) => value?.toFixed(2),
    },
    {
      title: '收盘价',
      dataIndex: 'close',
      key: 'close',
      render: (value) => value?.toFixed(2),
    },
    {
      title: '最高价',
      dataIndex: 'high',
      key: 'high',
      render: (value) => value?.toFixed(2),
    },
    {
      title: '最低价',
      dataIndex: 'low',
      key: 'low',
      render: (value) => value?.toFixed(2),
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      render: (value) => value?.toLocaleString(),
    },
  ];

  const tableData = klineData?.map((item, index) => ({
    key: index,
    ...item,
  })) || [];

  return (
    <div>
      <Card title="池子筛选" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ marginRight: 8 }}>选择股票池:</label>
          <Select
            value={selectedPool}
            onChange={setSelectedPool}
            style={{ width: 200, marginRight: 16 }}
          >
            {Object.keys(STOCK_POOLS).map(pool => (
              <Option key={pool} value={pool}>{STOCK_POOLS[pool].name}</Option>
            ))}
          </Select>
          
          <label style={{ marginRight: 8 }}>选择股票:</label>
          <Select
            value={selectedCode}
            onChange={setSelectedCode}
            style={{ width: 200, marginRight: 16 }}
            placeholder="请选择股票"
          >
            {STOCK_POOLS[selectedPool]?.stocks.map(stock => (
              <Option key={stock.code} value={stock.code}>
                {stock.name} ({stock.code})
              </Option>
            ))}
          </Select>
          
          <Button type="primary" onClick={handleGetHistory} loading={loading}>
            查询历史数据
          </Button>
          
          <Button onClick={handleDebugAPI} style={{ marginLeft: 8 }}>
            调试API
          </Button>
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: 16 }}>
            错误: {error}
          </div>
        )}

        {loading && <Spin />}
        
        {klineData && klineData.length > 0 && (
          <div>
            <StockChart data={klineData} />
            <Table
              columns={columns}
              dataSource={tableData}
              pagination={{ pageSize: 10 }}
              scroll={{ y: 400 }}
            />
          </div>
        )}
      </Card>

      <Card title="回测分析">
        <div style={{ marginBottom: 16 }}>
          <label style={{ marginRight: 8 }}>选择策略:</label>
          <Select
            value={selectedStrategy}
            onChange={setSelectedStrategy}
            style={{ width: 200, marginRight: 16 }}
          >
            <Option value="continuousDown">连续下跌策略</Option>
            <Option value="volumeRatio">成交量比率策略</Option>
          </Select>
          
          <Button type="primary" onClick={handleBacktest} loading={loading}>
            开始回测
          </Button>
        </div>

        {selectedStrategy === 'continuousDown' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ marginRight: 8 }}>连续下跌天数:</label>
            <InputNumber
              value={strategyParams.continuousDownDays}
              onChange={(value) => setStrategyParams({...strategyParams, continuousDownDays: value})}
              min={1}
              max={10}
              style={{ width: 100, marginRight: 16 }}
            />
            
            <label style={{ marginRight: 8 }}>下跌幅度阈值(%):</label>
            <InputNumber
              value={strategyParams.downThreshold}
              onChange={(value) => setStrategyParams({...strategyParams, downThreshold: value})}
              min={0.1}
              max={20}
              step={0.1}
              style={{ width: 100, marginRight: 16 }}
            />
          </div>
        )}

        {selectedStrategy === 'volumeRatio' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ marginRight: 8 }}>成交量比率阈值:</label>
            <InputNumber
              value={strategyParams.volumeRatioThreshold}
              onChange={(value) => setStrategyParams({...strategyParams, volumeRatioThreshold: value})}
              min={1}
              max={10}
              step={0.1}
              style={{ width: 100, marginRight: 16 }}
            />
            
            <label style={{ marginRight: 8 }}>回看天数:</label>
            <InputNumber
              value={strategyParams.lookbackDays}
              onChange={(value) => setStrategyParams({...strategyParams, lookbackDays: value})}
              min={5}
              max={30}
              style={{ width: 100, marginRight: 16 }}
            />
          </div>
        )}

        {backtestResults && backtestResults.length > 0 && (
          <div>
            <h3>回测统计</h3>
            <p>总交易次数: {backtestStats.totalTrades}</p>
            <p>盈利交易: {backtestStats.profitableTrades}</p>
            <p>亏损交易: {backtestStats.losingTrades}</p>
            <p>胜率: {(backtestStats.winRate * 100).toFixed(2)}%</p>
            <p>平均收益率: {(backtestStats.averageReturn * 100).toFixed(2)}%</p>
            <p>最大回撤: {(backtestStats.maxDrawdown * 100).toFixed(2)}%</p>
          </div>
        )}
      </Card>
    </div>
  );
}
