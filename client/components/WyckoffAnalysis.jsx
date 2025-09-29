import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Select, 
  Button, 
  Form, 
  message, 
  Table, 
  Tag,
  Statistic,
  Alert,
  Tabs,
  Input,
  Space,
  Divider
} from 'antd';
import { 
  LineChartOutlined,
  BarChartOutlined,
  CalculatorOutlined,
  SearchOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { StockService } from '../services/stockService';
import * as echarts from 'echarts';

const { Option } = Select;
const { TabPane } = Tabs;

// 威科夫阶段定义
const WYCKOFF_PHASES = {
  ACCUMULATION: { name: '吸筹阶段', color: '#52c41a', description: '机构在低位吸筹，成交量放大' },
  MARKUP: { name: '拉升阶段', color: '#1890ff', description: '价格突破，持续上涨' },
  DISTRIBUTION: { name: '派发阶段', color: '#faad14', description: '机构在高位派发，成交量放大' },
  MARKDOWN: { name: '下跌阶段', color: '#ff4d4f', description: '价格下跌，成交量萎缩' }
};

// 威科夫信号定义
const WYCKOFF_SIGNALS = {
  SPRING: { name: '弹簧效应', color: '#52c41a', description: '价格跌破支撑后快速反弹' },
  JUMP: { name: '跳跃效应', color: '#1890ff', description: '价格突破阻力位' },
  UPTHRUST: { name: '上冲失败', color: '#faad14', description: '价格冲高后快速回落' },
  SIGN_OF_STRENGTH: { name: '强势信号', color: '#52c41a', description: '成交量放大，价格突破' },
  SIGN_OF_WEAKNESS: { name: '弱势信号', color: '#ff4d4f', description: '成交量萎缩，价格下跌' }
};

export default function WyckoffAnalysis() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [chartInstance, setChartInstance] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [activeTab, setActiveTab] = useState('1');

  // 威科夫分析参数
  const [analysisConfig, setAnalysisConfig] = useState({
    period: 'daily',
    dataPoints: 120,
    volumeThreshold: 1.5, // 成交量倍数阈值
    priceThreshold: 0.02   // 价格变化阈值
  });

  // 获取股票数据
  const fetchStockData = async (stockCode) => {
    try {
      setLoading(true);
      const data = await StockService.getKlineData(stockCode, analysisConfig.dataPoints, analysisConfig.period);
      setStockData(data);
      setSelectedStock(stockCode);
      console.log('股票数据获取成功:', data.length);
    } catch (error) {
      console.error('获取股票数据失败:', error);
      message.error('获取股票数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 计算威科夫指标
  const calculateWyckoffIndicators = (data) => {
    if (!data || data.length < 20) return null;

    const results = [];
    
    for (let i = 19; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];
      
      // 计算价格变化
      const priceChange = (current.close - previous.close) / previous.close;
      const priceChangePercent = priceChange * 100;
      
      // 计算成交量变化
      const volumeChange = current.volume / previous.volume;
      
      // 计算20日移动平均线
      const ma20 = data.slice(i - 19, i + 1).reduce((sum, item) => sum + item.close, 0) / 20;
      
      // 计算成交量移动平均
      const volumeMA = data.slice(i - 19, i + 1).reduce((sum, item) => sum + item.volume, 0) / 20;
      
      // 威科夫阶段判断
      let phase = '';
      let signal = '';
      
      // 判断威科夫阶段
      if (current.close > ma20 && priceChangePercent > 2) {
        phase = 'MARKUP';
      } else if (current.close < ma20 && priceChangePercent < -2) {
        phase = 'MARKDOWN';
      } else if (current.close > ma20 && volumeChange > analysisConfig.volumeThreshold) {
        phase = 'DISTRIBUTION';
      } else if (current.close < ma20 && volumeChange > analysisConfig.volumeThreshold) {
        phase = 'ACCUMULATION';
      }
      
      // 威科夫信号判断
      if (priceChangePercent > 5 && volumeChange > analysisConfig.volumeThreshold) {
        signal = 'SIGN_OF_STRENGTH';
      } else if (priceChangePercent < -5 && volumeChange > analysisConfig.volumeThreshold) {
        signal = 'SIGN_OF_WEAKNESS';
      } else if (priceChangePercent > 3 && current.close > previous.high) {
        signal = 'JUMP';
      } else if (priceChangePercent < -3 && current.close < previous.low) {
        signal = 'SPRING';
      } else if (priceChangePercent > 2 && priceChangePercent < 5 && volumeChange < 1.2) {
        signal = 'UPTHRUST';
      }
      
      results.push({
        date: current.date,
        close: current.close,
        volume: current.volume,
        priceChange: priceChangePercent,
        volumeChange: volumeChange,
        ma20: ma20,
        volumeMA: volumeMA,
        phase: phase,
        signal: signal,
        index: i
      });
    }
    
    return results;
  };

  // 执行威科夫分析
  const performWyckoffAnalysis = () => {
    if (stockData.length === 0) {
      message.warning('请先获取股票数据');
      return;
    }

    const results = calculateWyckoffIndicators(stockData);
    if (results) {
      setAnalysisResults(results);
      message.success('威科夫分析完成');
    } else {
      message.error('数据不足，无法进行分析');
    }
  };

  // 初始化威科夫图表
  useEffect(() => {
    if (analysisResults && analysisResults.length > 0) {
      // 延迟初始化图表，确保DOM元素已经正确渲染
      setTimeout(() => {
        const chartDom = document.getElementById('wyckoff-chart');
        if (chartDom) {
          if (chartInstance) {
            chartInstance.dispose();
          }
          
          const chart = echarts.init(chartDom);
          setChartInstance(chart);

        // 准备图表数据
        const dates = analysisResults.map(item => item.date);
        const prices = analysisResults.map(item => item.close);
        const volumes = analysisResults.map(item => item.volume);
        const ma20 = analysisResults.map(item => item.ma20);
        
        // 威科夫阶段标记
        const phaseMarkers = [];
        analysisResults.forEach((item, index) => {
          if (item.phase) {
            phaseMarkers.push({
              name: WYCKOFF_PHASES[item.phase].name,
              coord: [index, item.close],
              value: item.close,
              itemStyle: {
                color: WYCKOFF_PHASES[item.phase].color
              }
            });
          }
        });

        const option = {
          title: {
            text: `${selectedStock} 威科夫分析`,
            left: 'center'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'cross'
            },
            formatter: function(params) {
              let result = `<div style="font-size: 14px; font-weight: bold;">${params[0].name}</div><br/>`;
              
              // 基础信息
              params.forEach(param => {
                if (param.seriesName === '价格') {
                  result += `<span style="color: #1890ff;">● 价格: ${param.value.toFixed(2)}</span><br/>`;
                } else if (param.seriesName === '成交量') {
                  result += `<span style="color: #52c41a;">● 成交量: ${(param.value / 10000).toFixed(2)}万</span><br/>`;
                } else if (param.seriesName === 'MA20') {
                  result += `<span style="color: #ff7f50;">● MA20: ${param.value.toFixed(2)}</span><br/>`;
                }
              });
              
              // 威科夫分析信息
              const dataIndex = params[0].dataIndex;
              if (analysisResults[dataIndex]) {
                const item = analysisResults[dataIndex];
                
                if (item.phase) {
                  const phaseInfo = WYCKOFF_PHASES[item.phase];
                  result += `<br/><div style="background: ${phaseInfo.color}; color: white; padding: 4px 8px; border-radius: 4px; margin: 4px 0;">`;
                  result += `📊 威科夫阶段: ${phaseInfo.name}`;
                  result += `</div>`;
                  result += `<div style="color: #666; font-size: 12px; margin-top: 4px;">${phaseInfo.description}</div>`;
                }
                
                if (item.signal) {
                  const signalInfo = WYCKOFF_SIGNALS[item.signal];
                  result += `<div style="background: ${signalInfo.color}; color: white; padding: 4px 8px; border-radius: 4px; margin: 4px 0;">`;
                  result += `🚨 威科夫信号: ${signalInfo.name}`;
                  result += `</div>`;
                  result += `<div style="color: #666; font-size: 12px; margin-top: 4px;">${signalInfo.description}</div>`;
                }
                
                // 操作建议
                result += `<br/><div style="background: #f0f8ff; border-left: 4px solid #1890ff; padding: 8px; margin: 8px 0;">`;
                result += `<strong>💡 操作建议:</strong><br/>`;
                
                if (item.phase === 'ACCUMULATION') {
                  result += `• 吸筹阶段：关注低位买入机会<br/>`;
                  result += `• 成交量放大时考虑建仓<br/>`;
                  result += `• 等待价格突破确认信号`;
                } else if (item.phase === 'MARKUP') {
                  result += `• 拉升阶段：持有或加仓<br/>`;
                  result += `• 关注成交量配合情况<br/>`;
                  result += `• 设置止盈位保护利润`;
                } else if (item.phase === 'DISTRIBUTION') {
                  result += `• 派发阶段：减仓或清仓<br/>`;
                  result += `• 避免追高买入<br/>`;
                  result += `• 关注价格支撑位`;
                } else if (item.phase === 'MARKDOWN') {
                  result += `• 下跌阶段：避免买入<br/>`;
                  result += `• 等待底部确认信号<br/>`;
                  result += `• 关注成交量萎缩情况`;
                } else {
                  result += `• 当前无明显威科夫阶段<br/>`;
                  result += `• 建议观望等待明确信号<br/>`;
                  result += `• 关注成交量和价格变化`;
                }
                
                if (item.signal === 'SIGN_OF_STRENGTH') {
                  result += `<br/>• 强势信号：考虑买入或加仓`;
                } else if (item.signal === 'SIGN_OF_WEAKNESS') {
                  result += `<br/>• 弱势信号：考虑减仓或观望`;
                } else if (item.signal === 'JUMP') {
                  result += `<br/>• 跳跃信号：价格突破，可考虑追涨`;
                } else if (item.signal === 'SPRING') {
                  result += `<br/>• 弹簧信号：价格反弹，可考虑抄底`;
                } else if (item.signal === 'UPTHRUST') {
                  result += `<br/>• 上冲失败：避免追高，考虑减仓`;
                }
                
                result += `</div>`;
              }
              
              return result;
            }
          },
          legend: {
            data: ['价格', '成交量', 'MA20', '威科夫阶段'],
            top: 30
          },
          grid: [
            {
              left: '5%',
              right: '5%',
              top: '15%',
              height: '60%'
            },
            {
              left: '5%',
              right: '5%',
              top: '80%',
              height: '15%'
            }
          ],
          xAxis: [
            {
              type: 'category',
              data: dates,
              axisLabel: {
                rotate: 45,
                fontSize: 10
              }
            },
            {
              type: 'category',
              data: dates,
              gridIndex: 1,
              axisLabel: {
                rotate: 45,
                fontSize: 10
              }
            }
          ],
          yAxis: [
            {
              type: 'value',
              name: '价格',
              position: 'left',
              axisLabel: {
                formatter: '{value}'
              }
            },
            {
              type: 'value',
              name: '成交量',
              position: 'right',
              gridIndex: 1,
              axisLabel: {
                formatter: '{value}万'
              }
            }
          ],
          series: [
            {
              name: '价格',
              type: 'line',
              data: prices,
              smooth: true,
              lineStyle: {
                color: '#1890ff',
                width: 2
              },
              markPoint: {
                data: phaseMarkers,
                symbol: 'circle',
                symbolSize: 8
              }
            },
            {
              name: 'MA20',
              type: 'line',
              data: ma20,
              smooth: true,
              lineStyle: {
                color: '#ff7f50',
                width: 1
              }
            },
            {
              name: '成交量',
              type: 'bar',
              data: volumes.map(v => v / 10000),
              xAxisIndex: 1,
              yAxisIndex: 1,
              itemStyle: {
                color: function(params) {
                  const dataIndex = params.dataIndex;
                  const item = analysisResults[dataIndex];
                  if (item && item.volumeChange > analysisConfig.volumeThreshold) {
                    return '#ff4d4f';
                  }
                  return '#52c41a';
                }
              }
            }
          ],
          animation: true,
          animationDuration: 1000,
          // 添加缩放功能
          dataZoom: [
            {
              type: 'inside',
              start: 0,
              end: 100,
              xAxisIndex: [0, 1]
            },
            {
              type: 'slider',
              start: 0,
              end: 100,
              height: 20,
              bottom: 10,
              xAxisIndex: [0, 1],
              handleStyle: {
                color: '#1890ff'
              },
              textStyle: {
                color: '#666'
              }
            }
          ],
          // 添加工具箱
          toolbox: {
            feature: {
              dataZoom: {
                yAxisIndex: 'none',
                title: {
                  zoom: '区域缩放',
                  back: '区域缩放还原'
                }
              },
              restore: {
                title: '还原'
              },
              saveAsImage: {
                title: '保存为图片'
              },
              magicType: {
                type: ['line', 'bar'],
                title: {
                  line: '切换为折线图',
                  bar: '切换为柱状图'
                }
              }
            },
            right: 20,
            top: 20
          }
        };

        chart.setOption(option);
        
        // 监听窗口大小变化
        const resizeChart = () => {
          if (chart) {
            chart.resize();
          }
        };
        
        window.addEventListener('resize', resizeChart);
        
        return () => {
          window.removeEventListener('resize', resizeChart);
        };
      }
    }, 100); // 延迟100ms确保DOM渲染完成
    }
  }, [analysisResults, selectedStock, analysisConfig]);

  // 监听Tab切换，重新调整图表大小
  useEffect(() => {
    if (chartInstance && activeTab === '2') {
      // 当切换到图表Tab时，延迟调整图表大小
      setTimeout(() => {
        chartInstance.resize();
      }, 300);
    }
  }, [activeTab, chartInstance]);

  // 清理图表实例
  useEffect(() => {
    return () => {
      if (chartInstance) {
        chartInstance.dispose();
      }
    };
  }, [chartInstance]);

  // 威科夫阶段统计
  const getPhaseStatistics = () => {
    if (!analysisResults) return null;
    
    const phaseCounts = {};
    const signalCounts = {};
    
    analysisResults.forEach(item => {
      if (item.phase) {
        phaseCounts[item.phase] = (phaseCounts[item.phase] || 0) + 1;
      }
      if (item.signal) {
        signalCounts[item.signal] = (signalCounts[item.signal] || 0) + 1;
      }
    });
    
    return { phaseCounts, signalCounts };
  };

  const statistics = getPhaseStatistics();

  // 表格列定义
  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 100
    },
    {
      title: '收盘价',
      dataIndex: 'close',
      key: 'close',
      render: (value) => value.toFixed(2)
    },
    {
      title: '价格变化',
      dataIndex: 'priceChange',
      key: 'priceChange',
      render: (value) => (
        <span style={{ color: value > 0 ? '#52c41a' : '#ff4d4f' }}>
          {value > 0 ? '+' : ''}{value.toFixed(2)}%
        </span>
      )
    },
    {
      title: '成交量变化',
      dataIndex: 'volumeChange',
      key: 'volumeChange',
      render: (value) => (
        <span style={{ color: value > analysisConfig.volumeThreshold ? '#ff4d4f' : '#52c41a' }}>
          {value.toFixed(2)}x
        </span>
      )
    },
    {
      title: '威科夫阶段',
      dataIndex: 'phase',
      key: 'phase',
      render: (value) => value ? (
        <Tag color={WYCKOFF_PHASES[value]?.color}>
          {WYCKOFF_PHASES[value]?.name}
        </Tag>
      ) : '-'
    },
    {
      title: '威科夫信号',
      dataIndex: 'signal',
      key: 'signal',
      render: (value) => value ? (
        <Tag color={WYCKOFF_SIGNALS[value]?.color}>
          {WYCKOFF_SIGNALS[value]?.name}
        </Tag>
      ) : '-'
    }
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="威科夫分析" extra={<LineChartOutlined />}>
            <Tabs defaultActiveKey="1" onChange={setActiveTab}>
              <TabPane tab="股票选择" key="1">
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Card size="small" title="股票选择">
                      <Form form={form} layout="vertical">
                        <Form.Item label="股票代码" name="stockCode">
                          <Input
                            placeholder="请输入股票代码，如：000001"
                            onPressEnter={(e) => fetchStockData(e.target.value)}
                          />
                        </Form.Item>
                        <Form.Item>
                          <Button 
                            type="primary" 
                            icon={<SearchOutlined />}
                            onClick={() => {
                              const code = form.getFieldValue('stockCode');
                              if (code) {
                                fetchStockData(code);
                              } else {
                                message.warning('请输入股票代码');
                              }
                            }}
                            loading={loading}
                            style={{ width: '100%' }}
                          >
                            获取数据
                          </Button>
                        </Form.Item>
                      </Form>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" title="分析参数">
                      <Form layout="vertical">
                        <Form.Item label="数据周期">
                          <Select
                            value={analysisConfig.period}
                            onChange={(value) => setAnalysisConfig({...analysisConfig, period: value})}
                            style={{ width: '100%' }}
                          >
                            <Option value="daily">日线</Option>
                            <Option value="1w">周线</Option>
                            <Option value="1M">月线</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item label="数据点数">
                          <Select
                            value={analysisConfig.dataPoints}
                            onChange={(value) => setAnalysisConfig({...analysisConfig, dataPoints: value})}
                            style={{ width: '100%' }}
                          >
                            <Option value={60}>60个交易日</Option>
                            <Option value={120}>120个交易日</Option>
                            <Option value={250}>250个交易日</Option>
                          </Select>
                        </Form.Item>
                      </Form>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" title="分析控制">
                      <div style={{ marginBottom: 16 }}>
                        <Button 
                          type="primary" 
                          icon={<CalculatorOutlined />}
                          onClick={performWyckoffAnalysis}
                          loading={loading}
                          disabled={stockData.length === 0}
                          style={{ width: '100%' }}
                        >
                          执行威科夫分析
                        </Button>
                      </div>
                      <div>
                        <strong>当前股票: {selectedStock || '未选择'}</strong>
                        <br />
                        <strong>数据点数: {stockData.length}</strong>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </TabPane>
              
              <TabPane tab="威科夫图表" key="2">
                {analysisResults ? (
                  <div>
                    <Card 
                      title="威科夫分析图表"
                      extra={
                        <Space>
                          <Button 
                            icon={<CalculatorOutlined />}
                            onClick={performWyckoffAnalysis}
                            loading={loading}
                          >
                            刷新分析
                          </Button>
                          <Button 
                            icon={<BarChartOutlined />}
                            onClick={() => {
                              if (chartInstance) {
                                chartInstance.resize();
                              }
                            }}
                          >
                            调整图表
                          </Button>
                        </Space>
                      }
                    >
                      <div 
                        id="wyckoff-chart" 
                        style={{ 
                          width: '100%', 
                          height: '600px',
                          minWidth: '800px'
                        }}
                      ></div>
                    </Card>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Alert
                      message="请先选择股票并执行威科夫分析"
                      description="在股票选择页面获取数据并进行分析"
                      type="info"
                      showIcon
                    />
                  </div>
                )}
              </TabPane>

              <TabPane tab="分析结果" key="3">
                {analysisResults ? (
                  <div>
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                      <Col span={6}>
                        <Card>
                          <Statistic
                            title="吸筹阶段"
                            value={statistics?.phaseCounts?.ACCUMULATION || 0}
                            suffix="次"
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card>
                          <Statistic
                            title="拉升阶段"
                            value={statistics?.phaseCounts?.MARKUP || 0}
                            suffix="次"
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card>
                          <Statistic
                            title="派发阶段"
                            value={statistics?.phaseCounts?.DISTRIBUTION || 0}
                            suffix="次"
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card>
                          <Statistic
                            title="下跌阶段"
                            value={statistics?.phaseCounts?.MARKDOWN || 0}
                            suffix="次"
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Card title="详细分析结果">
                      <Table
                        columns={columns}
                        dataSource={analysisResults}
                        rowKey="index"
                        pagination={{ pageSize: 20 }}
                        scroll={{ x: 800 }}
                      />
                    </Card>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Alert
                      message="请先执行威科夫分析"
                      description="在股票选择页面获取数据并进行分析"
                      type="info"
                      showIcon
                    />
                  </div>
                )}
              </TabPane>

              <TabPane tab="威科夫理论" key="4">
                <Card title="威科夫理论说明">
                  <Alert
                    message="威科夫操盘法核心原理"
                    description={
                      <div>
                        <p><strong>威科夫理论四大阶段：</strong></p>
                        <p>1. <strong>吸筹阶段</strong>：机构在低位吸筹，成交量放大，价格相对稳定</p>
                        <p>2. <strong>拉升阶段</strong>：价格突破阻力位，持续上涨，成交量配合</p>
                        <p>3. <strong>派发阶段</strong>：机构在高位派发，成交量放大，价格震荡</p>
                        <p>4. <strong>下跌阶段</strong>：价格下跌，成交量萎缩，寻找支撑</p>
                        <Divider />
                        <p><strong>威科夫五大信号：</strong></p>
                        <p>• <strong>弹簧效应</strong>：价格跌破支撑后快速反弹，吸筹信号</p>
                        <p>• <strong>跳跃效应</strong>：价格突破阻力位，拉升信号</p>
                        <p>• <strong>上冲失败</strong>：价格冲高后快速回落，派发信号</p>
                        <p>• <strong>强势信号</strong>：成交量放大，价格突破，买入信号</p>
                        <p>• <strong>弱势信号</strong>：成交量萎缩，价格下跌，卖出信号</p>
                        <Divider />
                        <p><strong>操作建议：</strong></p>
                        <p>• 在吸筹阶段寻找买入机会</p>
                        <p>• 在拉升阶段持有或加仓</p>
                        <p>• 在派发阶段减仓或观望</p>
                        <p>• 在下跌阶段避免买入</p>
                      </div>
                    }
                    type="info"
                    showIcon
                  />
                </Card>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
