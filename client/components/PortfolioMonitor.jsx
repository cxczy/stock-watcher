import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Input, 
  Table, 
  message, 
  Spin, 
  Progress,
  Tag,
  Space,
  Statistic,
  Row,
  Col,
  Select,
  Switch,
  InputNumber,
  Tabs,
  Alert,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  LineChartOutlined,
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { StockService } from '../services/stockService.js';
import { SimpleIndicators } from '../utils/simpleIndicators.js';
import { ANALYSIS_STRATEGIES, AnalysisExecutor } from '../utils/analysisStrategies.js';
import StockChart from './StockChart.jsx';

const { Option } = Select;
const { TabPane } = Tabs;

// 技术分析策略配置已移至 analysisStrategies.js

export default function PortfolioMonitor() {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [analysisResults, setAnalysisResults] = useState({});
  const [newStockCode, setNewStockCode] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('intradayT');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // 秒

  // 添加股票到自选股
  const handleAddStock = async () => {
    if (!newStockCode.trim()) {
      message.warning('请输入股票代码');
      return;
    }

    const stockCode = newStockCode.trim();
    
    // 检查是否已存在
    if (portfolio.some(stock => stock.code === stockCode)) {
      message.warning('该股票已在自选股中');
      return;
    }

    setLoading(true);
    try {
      // 验证股票代码是否有效
      const klineData = await StockService.getKlineData(stockCode, 10);
      if (klineData.length === 0) {
        message.error('无效的股票代码');
        return;
      }

      const newStock = {
        code: stockCode,
        name: `股票${stockCode}`,
        price: klineData[klineData.length - 1].close,
        change: klineData[klineData.length - 1].rate,
        market: StockService.getMarketName(stockCode),
        addedTime: new Date().toLocaleString(),
        status: 'active'
      };

      setPortfolio([...portfolio, newStock]);
      setNewStockCode('');
      message.success(`已添加股票 ${stockCode}`);
    } catch (error) {
      console.error('添加股票失败:', error);
      message.error('添加股票失败，请检查股票代码');
    } finally {
      setLoading(false);
    }
  };

  // 删除股票
  const handleRemoveStock = (stockCode) => {
    setPortfolio(portfolio.filter(stock => stock.code !== stockCode));
    message.success(`已删除股票 ${stockCode}`);
  };

  // 分析单只股票
  const handleAnalyzeStock = async (stockCode) => {
    setLoading(true);
    try {
      const klineData = await StockService.getKlineData(stockCode, 100);
      if (klineData.length < 50) {
        message.warning('数据不足，无法分析');
        return;
      }

      setStockData(klineData);
      setSelectedStock(stockCode);
      
      // 执行技术分析
      const results = await performTechnicalAnalysis(klineData, selectedStrategy);
      setAnalysisResults(prev => ({
        ...prev,
        [stockCode]: results
      }));

      message.success('分析完成');
    } catch (error) {
      console.error('分析失败:', error);
      message.error('分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 执行技术分析
  const performTechnicalAnalysis = async (klineData, strategy) => {
    return await AnalysisExecutor.executeStrategy(klineData, strategy);
  };

  // 批量分析所有股票
  const handleBatchAnalyze = async () => {
    if (portfolio.length === 0) {
      message.warning('自选股列表为空');
      return;
    }

    setLoading(true);
    const results = {};

    try {
      for (const stock of portfolio) {
        try {
          const klineData = await StockService.getKlineData(stock.code, 100);
          if (klineData.length >= 50) {
            const analysis = await performTechnicalAnalysis(klineData, selectedStrategy);
            results[stock.code] = analysis;
          }
        } catch (error) {
          console.warn(`分析股票 ${stock.code} 失败:`, error);
        }
      }

      setAnalysisResults(results);
      message.success('批量分析完成');
    } catch (error) {
      console.error('批量分析失败:', error);
      message.error('批量分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 自动刷新
  useEffect(() => {
    if (autoRefresh && portfolio.length > 0) {
      const interval = setInterval(() => {
        handleBatchAnalyze();
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, portfolio, selectedStrategy, refreshInterval]);

  // 表格列定义
  const columns = [
    {
      title: '股票代码',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code) => (
        <Button 
          type="link" 
          onClick={() => handleAnalyzeStock(code)}
          style={{ padding: 0 }}
        >
          {code}
        </Button>
      )
    },
    {
      title: '股票名称',
      dataIndex: 'name',
      key: 'name',
      width: 120
    },
    {
      title: '市场',
      dataIndex: 'market',
      key: 'market',
      width: 100,
      render: (market) => (
        <Tag color={market?.includes('深圳') ? 'blue' : market?.includes('上海') ? 'red' : 'default'}>
          {market || '未知'}
        </Tag>
      )
    },
    {
      title: '当前价格',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price) => price?.toFixed(2)
    },
    {
      title: '涨跌幅',
      dataIndex: 'change',
      key: 'change',
      width: 100,
      render: (change) => (
        <span style={{ color: change >= 0 ? '#f50' : '#52c41a' }}>
          {change?.toFixed(2)}%
        </span>
      )
    },
    {
      title: '技术分析',
      key: 'analysis',
      width: 250,
      render: (_, record) => {
        const analysis = analysisResults[record.code];
        if (!analysis) return '-';
        
        const riskColor = analysis.riskLevel === 'high' ? 'red' : 
                         analysis.riskLevel === 'medium' ? 'orange' : 'green';
        
        return (
          <Space direction="vertical" size="small">
            <Space>
              <Tag color={analysis.recommendation === 'buy' ? 'green' : 
                          analysis.recommendation === 'sell' ? 'red' : 'blue'}>
                {analysis.recommendation === 'buy' ? '买入' : 
                 analysis.recommendation === 'sell' ? '卖出' : '持有'}
              </Tag>
              <Tag color={riskColor}>
                风险: {analysis.riskLevel === 'high' ? '高' : 
                       analysis.riskLevel === 'medium' ? '中' : '低'}
              </Tag>
            </Space>
            <div style={{ fontSize: '12px', color: '#666' }}>
              置信度: {analysis.confidence?.toFixed(0) || 0}%
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {analysis.timestamp}
            </div>
          </Space>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<LineChartOutlined />}
            onClick={() => handleAnalyzeStock(record.code)}
            size="small"
          >
            分析
          </Button>
          <Button 
            type="link" 
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveStock(record.code)}
            size="small"
            danger
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  // 获取推荐统计
  const getRecommendationStats = () => {
    const stats = { buy: 0, sell: 0, hold: 0 };
    Object.values(analysisResults).forEach(analysis => {
      stats[analysis.recommendation]++;
    });
    return stats;
  };

  const recommendationStats = getRecommendationStats();

  return (
    <div className="p-6">
      <Card title="自选股监控" className="mb-4">
        <Row gutter={16} className="mb-4">
          <Col span={8}>
            <Input
              placeholder="输入股票代码，如：000001"
              value={newStockCode}
              onChange={(e) => setNewStockCode(e.target.value)}
              onPressEnter={handleAddStock}
              style={{ marginRight: 8 }}
            />
          </Col>
          <Col span={4}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddStock}
              loading={loading}
            >
              添加股票
            </Button>
          </Col>
          <Col span={6}>
            <Select
              value={selectedStrategy}
              onChange={setSelectedStrategy}
              style={{ width: '100%' }}
            >
              {Object.entries(ANALYSIS_STRATEGIES).map(([key, strategy]) => (
                <Option key={key} value={key}>
                  {strategy.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleBatchAnalyze}
              loading={loading}
            >
              批量分析
            </Button>
          </Col>
        </Row>

        <Row gutter={16} className="mb-4">
          <Col span={6}>
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              style={{ marginRight: 8 }}
            />
            <span>自动刷新</span>
          </Col>
          <Col span={6}>
            <InputNumber
              value={refreshInterval}
              onChange={setRefreshInterval}
              min={10}
              max={300}
              addonAfter="秒"
              disabled={!autoRefresh}
            />
          </Col>
          <Col span={12}>
            <Alert
              message={`当前策略: ${ANALYSIS_STRATEGIES[selectedStrategy].name}`}
              description={ANALYSIS_STRATEGIES[selectedStrategy].description}
              type="info"
              showIcon
            />
          </Col>
        </Row>

        {portfolio.length > 0 && (
          <Row gutter={16} className="mb-4">
            <Col span={6}>
              <Statistic
                title="总股票数"
                value={portfolio.length}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="建议买入"
                value={recommendationStats.buy}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="建议卖出"
                value={recommendationStats.sell}
                valueStyle={{ color: '#f50' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="建议持有"
                value={recommendationStats.hold}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>
        )}
      </Card>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="自选股列表">
            <Spin spinning={loading}>
              <Table
                columns={columns}
                dataSource={portfolio}
                rowKey="code"
                pagination={{ pageSize: 10 }}
                scroll={{ y: 400 }}
              />
            </Spin>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="技术分析详情">
            {selectedStock && stockData ? (
              <Tabs defaultActiveKey="chart">
                <TabPane tab="K线图" key="chart">
                  <div style={{ height: '300px' }}>
                    <StockChart />
                  </div>
                </TabPane>
                <TabPane tab="分析结果" key="analysis">
                  {analysisResults[selectedStock] && (
                    <div>
                      <Alert
                        message={`分析策略: ${ANALYSIS_STRATEGIES[selectedStrategy].name}`}
                        description={ANALYSIS_STRATEGIES[selectedStrategy].description}
                        type="info"
                        className="mb-4"
                      />
                      
                      <div className="mb-4">
                        <strong>推荐操作:</strong>
                        <Tag 
                          color={analysisResults[selectedStock].recommendation === 'buy' ? 'green' : 
                                 analysisResults[selectedStock].recommendation === 'sell' ? 'red' : 'blue'}
                          className="ml-2"
                        >
                          {analysisResults[selectedStock].recommendation === 'buy' ? '买入' : 
                           analysisResults[selectedStock].recommendation === 'sell' ? '卖出' : '持有'}
                        </Tag>
                      </div>

                      <div className="mb-4">
                        <strong>技术指标:</strong>
                        <div className="mt-2">
                          {Object.entries(analysisResults[selectedStock].indicators).map(([key, value]) => (
                            <div key={key} className="mb-1">
                              <span className="mr-2">{key}:</span>
                              {typeof value === 'object' ? 
                                JSON.stringify(value, null, 2) : 
                                value?.toFixed(2)
                              }
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <strong>信号:</strong>
                        <div className="mt-2">
                          {Object.entries(analysisResults[selectedStock].signals).map(([key, value]) => (
                            <Tag key={key} color={value ? 'green' : 'red'}>
                              {key}: {value ? '是' : '否'}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </TabPane>
              </Tabs>
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '50px 0' }}>
                请选择股票进行分析
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
