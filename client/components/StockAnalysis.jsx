import React, { useState } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Row, 
  Col, 
  Spin, 
  message, 
  Progress, 
  Tag, 
  Space, 
  Divider,
  Typography,
  Statistic,
  Alert
} from 'antd';
import { 
  SearchOutlined, 
  RiseOutlined, 
  FallOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { StockService } from '../services/stockService.js';
import { strategyManager } from '../strategies/index.js';

const { Title, Text } = Typography;
const { Search } = Input;

// 时间周期配置
const TIME_PERIODS = {
  '1分钟': { period: '1m', klineCount: 120, weight: 0.1 },
  '5分钟': { period: '5m', klineCount: 144, weight: 0.15 },
  '15分钟': { period: '15m', klineCount: 96, weight: 0.2 },
  '30分钟': { period: '30m', klineCount: 96, weight: 0.2 },
  '1小时': { period: '1h', klineCount: 48, weight: 0.2 },
  '日线': { period: '1d', klineCount: 120, weight: 0.15 }
};

// 获取策略定义
const STRATEGIES = strategyManager.getAll();

export default function StockAnalysis() {
  const [loading, setLoading] = useState(false);
  const [stockCode, setStockCode] = useState('');
  const [stockName, setStockName] = useState('');
  const [analysisResults, setAnalysisResults] = useState([]);
  const [overallScore, setOverallScore] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // 执行全面分析
  const handleAnalysis = async (code) => {
    if (!code) {
      message.warning('请输入股票代码');
      return;
    }

    setLoading(true);
    setAnalysisResults([]);
    setAnalysisComplete(false);

    try {
      const results = [];
      let totalWeightedScore = 0;
      let totalWeight = 0;

      // 遍历所有时间周期
      for (const [timePeriodName, timeConfig] of Object.entries(TIME_PERIODS)) {
        console.log(`分析时间周期: ${timePeriodName}`);
        
        // 获取K线数据
        const klineData = await StockService.getKlineData(code, timeConfig.klineCount, timeConfig.period);
        
        if (klineData.length < 50) {
          console.warn(`${timePeriodName} 数据不足，跳过`);
          continue;
        }

        // 设置股票名称（从K线数据中获取）
        if (!stockName && klineData.length > 0) {
          setStockName(klineData[0].name || `股票${code}`);
        }

        // 遍历所有策略
        for (const [strategyKey, strategy] of Object.entries(STRATEGIES)) {
          try {
            // 获取策略参数
            const strategyParams = {};
            if (strategy.params) {
              Object.keys(strategy.params).forEach(key => {
                strategyParams[key] = strategy.params[key].default;
              });
            }

            // 执行策略分析
            const strategyResult = strategy.function(klineData, strategyParams);
            
            // 添加调试信息
            console.log(`策略 ${strategy.name} 在 ${timePeriodName} 的结果:`, {
              signal: strategyResult.signal,
              confidence: strategyResult.confidence,
              details: strategyResult.details
            });
            
            // 降低置信度阈值，包含更多信号
            if (strategyResult.signal !== 'neutral' && strategyResult.confidence > 0.1) {
              // 计算加权分数
              const weightedScore = strategyResult.confidence * timeConfig.weight;
              totalWeightedScore += weightedScore;
              totalWeight += timeConfig.weight;

              results.push({
                timePeriod: timePeriodName,
                strategy: strategy.name,
                strategyKey,
                signal: strategyResult.signal,
                confidence: strategyResult.confidence,
                score: Math.round(strategyResult.confidence * 100),
                weightedScore: Math.round(weightedScore * 100),
                details: strategyResult.details,
                weight: timeConfig.weight
              });
            }
          } catch (error) {
            console.error(`策略 ${strategy.name} 在 ${timePeriodName} 执行失败:`, error);
          }
        }

        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 计算总体评分
      const overallScore = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 0;
      
      // 添加详细的分析结果日志
      console.log('分析结果汇总:', {
        totalResults: results.length,
        overallScore: overallScore,
        resultsByStrategy: Object.entries(
          results.reduce((acc, result) => {
            if (!acc[result.strategyKey]) acc[result.strategyKey] = [];
            acc[result.strategyKey].push(result);
            return acc;
          }, {})
        )
      });
      
      setAnalysisResults(results);
      setOverallScore(overallScore);
      setAnalysisComplete(true);

      message.success(`分析完成！总体评分: ${overallScore}分，共发现 ${results.length} 个有效信号`);
      
    } catch (error) {
      console.error('分析失败:', error);
      message.error('分析失败，请检查股票代码是否正确');
    } finally {
      setLoading(false);
    }
  };

  // 获取信号图标
  const getSignalIcon = (signal) => {
    switch (signal) {
      case 'buy':
        return <RiseOutlined style={{ color: '#52c41a' }} />;
      case 'sell':
        return <FallOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  // 获取信号标签颜色
  const getSignalColor = (signal) => {
    switch (signal) {
      case 'buy':
        return 'success';
      case 'sell':
        return 'error';
      default:
        return 'warning';
    }
  };

  // 获取评分颜色
  const getScoreColor = (score) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#1890ff';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  };

  // 获取投资建议
  const getInvestmentAdvice = (score) => {
    if (score >= 80) return { text: '强烈推荐', color: '#52c41a', icon: <CheckCircleOutlined /> };
    if (score >= 60) return { text: '推荐', color: '#1890ff', icon: <CheckCircleOutlined /> };
    if (score >= 40) return { text: '谨慎', color: '#faad14', icon: <ExclamationCircleOutlined /> };
    return { text: '不推荐', color: '#ff4d4f', icon: <CloseCircleOutlined /> };
  };

  // 按策略分组结果
  const groupedResults = analysisResults.reduce((acc, result) => {
    if (!acc[result.strategyKey]) {
      acc[result.strategyKey] = [];
    }
    acc[result.strategyKey].push(result);
    return acc;
  }, {});

  const advice = getInvestmentAdvice(overallScore);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>全面股票分析</Title>
      
      {/* 股票输入 */}
      <Card style={{ marginBottom: 24 }}>
        <Space size="large" style={{ width: '100%' }}>
          <Search
            placeholder="请输入股票代码，如：000001"
            value={stockCode}
            onChange={(e) => setStockCode(e.target.value)}
            onSearch={handleAnalysis}
            style={{ width: 300 }}
            enterButton={<Button type="primary" icon={<SearchOutlined />}>分析</Button>}
          />
          {stockName && (
            <Text strong style={{ fontSize: '16px' }}>
              {stockName} ({stockCode})
            </Text>
          )}
        </Space>
      </Card>

      {/* 总体评分 */}
      {analysisComplete && (
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={8}>
              <Statistic
                title="总体评分"
                value={overallScore}
                suffix="分"
                valueStyle={{ color: getScoreColor(overallScore), fontSize: '32px' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="分析策略数"
                value={Object.keys(groupedResults).length}
                suffix="个"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="有效信号数"
                value={analysisResults.length}
                suffix="个"
              />
            </Col>
          </Row>
          
          <Divider />
          
          <Alert
            message={
              <Space>
                {advice.icon}
                <Text strong style={{ color: advice.color, fontSize: '16px' }}>
                  投资建议: {advice.text}
                </Text>
              </Space>
            }
            type={overallScore >= 60 ? 'success' : overallScore >= 40 ? 'warning' : 'error'}
            showIcon
            style={{ marginTop: 16 }}
          />
        </Card>
      )}

      {/* 加载状态 */}
      {loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text>正在分析股票，请稍候...</Text>
            </div>
          </div>
        </Card>
      )}

      {/* 分析结果 */}
      {analysisComplete && (
        <>
          <Row gutter={[16, 16]}>
            {Object.entries(groupedResults).map(([strategyKey, results]) => {
              const strategy = STRATEGIES[strategyKey];
              const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
              const buySignals = results.filter(r => r.signal === 'buy').length;
              const sellSignals = results.filter(r => r.signal === 'sell').length;
              
              return (
                <Col xs={24} sm={12} lg={8} xl={6} key={strategyKey}>
                  <Card
                    title={
                      <Space>
                        {getSignalIcon(buySignals > sellSignals ? 'buy' : sellSignals > buySignals ? 'sell' : 'neutral')}
                        {strategy.name}
                      </Space>
                    }
                    extra={
                      <Tag color={getScoreColor(avgScore)}>
                        {avgScore}分
                      </Tag>
                    }
                    style={{ height: '100%' }}
                  >
                    <div style={{ marginBottom: 16 }}>
                      <Progress
                        percent={avgScore}
                        strokeColor={getScoreColor(avgScore)}
                        showInfo={false}
                      />
                    </div>
                    
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>信号统计:</Text>
                        <div style={{ marginTop: 8 }}>
                          <Tag color="success">买入: {buySignals}</Tag>
                          <Tag color="error">卖出: {sellSignals}</Tag>
                        </div>
                      </div>
                      
                      <Divider style={{ margin: '12px 0' }} />
                      
                      <div>
                        <Text strong>时间周期分析:</Text>
                        <div style={{ marginTop: 8 }}>
                          {results.map((result, index) => (
                            <div key={index} style={{ marginBottom: 8 }}>
                              <Space>
                                <Tag color={getSignalColor(result.signal)}>
                                  {result.timePeriod}
                                </Tag>
                                <Text>{result.score}分</Text>
                                {getSignalIcon(result.signal)}
                              </Space>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
          
          {/* 调试信息面板 */}
          <Card title="调试信息" style={{ marginTop: 24 }}>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Text strong>所有策略执行结果:</Text>
              <div style={{ marginTop: 16 }}>
                {Object.entries(STRATEGIES).map(([strategyKey, strategy]) => {
                  const strategyResults = analysisResults.filter(r => r.strategyKey === strategyKey);
                  return (
                    <div key={strategyKey} style={{ marginBottom: 16, padding: 12, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                      <Text strong>{strategy.name}:</Text>
                      <div style={{ marginTop: 8 }}>
                        {strategyResults.length > 0 ? (
                          strategyResults.map((result, index) => (
                            <div key={index} style={{ marginBottom: 4 }}>
                              <Space>
                                <Tag color={getSignalColor(result.signal)}>
                                  {result.timePeriod}
                                </Tag>
                                <Text>信号: {result.signal}</Text>
                                <Text>置信度: {(result.confidence * 100).toFixed(1)}%</Text>
                                <Text>评分: {result.score}分</Text>
                                {result.details && (
                                  <Text type="secondary">
                                    详情: {JSON.stringify(result.details, null, 2)}
                                  </Text>
                                )}
                              </Space>
                            </div>
                          ))
                        ) : (
                          <Text type="secondary">该策略在所有时间周期均未产生信号</Text>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* 空状态 */}
      {!loading && !analysisComplete && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <SearchOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">请输入股票代码开始分析</Text>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}