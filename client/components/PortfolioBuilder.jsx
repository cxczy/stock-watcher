import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Button, 
  Select, 
  Input, 
  Form, 
  message, 
  Spin, 
  Statistic,
  Tabs,
  Progress,
  Alert,
  Space,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  CalculatorOutlined,
  LineChartOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { StockService } from '../services/stockService';
import * as echarts from 'echarts';

const { Option } = Select;
const { TabPane } = Tabs;

// ETF数据配置
const ETF_POOL = [
  { code: '510300', name: '沪深300ETF', market: '上海' },
  { code: '510500', name: '中证500ETF', market: '上海' },
  { code: '159919', name: '沪深300ETF', market: '深圳' },
  { code: '512100', name: '中证1000ETF', market: '上海' },
  { code: '515000', name: '科技ETF', market: '上海' },
  { code: '512760', name: '芯片ETF', market: '上海' },
  { code: '512170', name: '医疗ETF', market: '上海' },
  { code: '512400', name: '有色ETF', market: '上海' },
  { code: '512800', name: '银行ETF', market: '上海' },
  { code: '512660', name: '军工ETF', market: '上海' }
];

// 行业ETF成分股配置
const ETF_COMPONENTS = {
  '512760': { // 芯片ETF
    name: '芯片ETF',
    components: [
      { code: '000001', name: '平安银行' },
      { code: '000002', name: '万科A' },
      { code: '000858', name: '五粮液' },
      { code: '000725', name: '京东方A' },
      { code: '002415', name: '海康威视' },
      { code: '300059', name: '东方财富' },
      { code: '300750', name: '宁德时代' },
      { code: '600036', name: '招商银行' },
      { code: '600519', name: '贵州茅台' },
      { code: '600887', name: '伊利股份' }
    ]
  },
  '512170': { // 医疗ETF
    name: '医疗ETF',
    components: [
      { code: '000661', name: '长春高新' },
      { code: '000725', name: '京东方A' },
      { code: '002304', name: '洋河股份' },
      { code: '300015', name: '爱尔眼科' },
      { code: '300347', name: '泰格医药' },
      { code: '600276', name: '恒瑞医药' },
      { code: '600519', name: '贵州茅台' },
      { code: '600887', name: '伊利股份' },
      { code: '688981', name: '中芯国际' },
      { code: '688599', name: '天合光能' }
    ]
  },
  '512400': { // 有色ETF
    name: '有色ETF',
    components: [
      { code: '601899', name: '紫金矿业' },
      { code: '600111', name: '北方稀土' },
      { code: '603993', name: '洛阳钼业' },
      { code: '603799', name: '华友钴业' },
      { code: '600547', name: '山东黄金' },
      { code: '600489', name: '中金黄金' },
      { code: '601600', name: '中国铝业' },
      { code: '002460', name: '赣锋锂业' },
      { code: '600988', name: '赤峰黄金' },
      { code: '002466', name: '天齐锂业' },
      { code: '000408', name: '藏格矿业' },
      { code: '000807', name: '云铝股份' },
    ]
  },
  '512800': { // 银行ETF
    name: '银行ETF',
    components: [
      { code: '000001', name: '平安银行' },
      { code: '000002', name: '万科A' },
      { code: '000858', name: '五粮液' },
      { code: '600036', name: '招商银行' },
      { code: '600519', name: '贵州茅台' },
      { code: '600887', name: '伊利股份' },
      { code: '601225', name: '陕西煤业' },
      { code: '601318', name: '中国平安' },
      { code: '601398', name: '工商银行' },
      { code: '601939', name: '建设银行' }
    ]
  },
  '512660': { // 军工ETF
    name: '军工ETF',
    components: [
      { code: '000001', name: '平安银行' },
      { code: '000661', name: '长春高新' },
      { code: '002415', name: '海康威视' },
      { code: '300015', name: '爱尔眼科' },
      { code: '300750', name: '宁德时代' },
      { code: '600276', name: '恒瑞医药' },
      { code: '600519', name: '贵州茅台' },
      { code: '600887', name: '伊利股份' },
      { code: '688981', name: '中芯国际' },
      { code: '688599', name: '天合光能' }
    ]
  }
};

// 沪深300指数代码
const HS300_CODE = '510310';

export default function PortfolioBuilder() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedETFs, setSelectedETFs] = useState([]);
  const [hs300Data, setHs300Data] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [chartInstance, setChartInstance] = useState(null);
  
  // 分析参数配置
  const [analysisConfig, setAnalysisConfig] = useState({
    period: 'daily',  // 时间周期
    dataPoints: 252,  // 数据点数量
    riskFreeRate: 0.03  // 无风险利率
  });

  // 成分股分析相关状态
  const [selectedETF, setSelectedETF] = useState(null);
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [componentAnalysisResults, setComponentAnalysisResults] = useState(null);
  const [etfData, setEtfData] = useState(null);

  // 获取沪深300指数数据
  const fetchHS300Data = async () => {
    try {
      setLoading(true);
      const data = await StockService.getKlineData(HS300_CODE, analysisConfig.dataPoints, analysisConfig.period);
      setHs300Data(data);
      console.log('沪深300数据获取成功:', data.length);
    } catch (error) {
      console.error('获取沪深300数据失败:', error);
      message.error('获取沪深300指数数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取ETF数据
  const fetchETFData = async (etfCode) => {
    try {
      const data = await StockService.getKlineData(etfCode, analysisConfig.dataPoints, analysisConfig.period);
      return data;
    } catch (error) {
      console.error(`获取ETF ${etfCode} 数据失败:`, error);
      return null;
    }
  };

  // 计算收益率
  const calculateReturns = (priceData) => {
    const returns = [];
    for (let i = 1; i < priceData.length; i++) {
      const returnRate = (priceData[i].close - priceData[i-1].close) / priceData[i-1].close;
      returns.push(returnRate);
    }
    return returns;
  };

  // 计算β系数
  const calculateBeta = (etfReturns, marketReturns) => {
    if (etfReturns.length !== marketReturns.length) return 0;
    
    const n = etfReturns.length;
    const etfMean = etfReturns.reduce((a, b) => a + b, 0) / n;
    const marketMean = marketReturns.reduce((a, b) => a + b, 0) / n;
    
    let covariance = 0;
    let marketVariance = 0;
    
    for (let i = 0; i < n; i++) {
      covariance += (etfReturns[i] - etfMean) * (marketReturns[i] - marketMean);
      marketVariance += Math.pow(marketReturns[i] - marketMean, 2);
    }
    
    return marketVariance === 0 ? 0 : covariance / marketVariance;
  };

  // 计算α系数
  const calculateAlpha = (etfReturns, marketReturns, beta, riskFreeRate = null) => {
    const actualRiskFreeRate = riskFreeRate || analysisConfig.riskFreeRate;
    const etfMean = etfReturns.reduce((a, b) => a + b, 0) / etfReturns.length;
    const marketMean = marketReturns.reduce((a, b) => a + b, 0) / marketReturns.length;
    
    // 年化收益率
    const etfAnnualReturn = Math.pow(1 + etfMean, 252) - 1;
    const marketAnnualReturn = Math.pow(1 + marketMean, 252) - 1;
    
    // α = 投资组合收益率 - (无风险收益率 + β × (市场收益率 - 无风险收益率))
    const alpha = etfAnnualReturn - (actualRiskFreeRate + beta * (marketAnnualReturn - actualRiskFreeRate));
    
    return alpha;
  };

  // 计算夏普比率
  const calculateSharpeRatio = (returns, riskFreeRate = null) => {
    const actualRiskFreeRate = riskFreeRate || analysisConfig.riskFreeRate;
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const annualReturn = Math.pow(1 + meanReturn, 252) - 1;
    
    // 计算标准差
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252);
    
    return volatility === 0 ? 0 : (annualReturn - actualRiskFreeRate) / volatility;
  };

  // 计算净值曲线
  const calculateNetValue = (returns) => {
    const netValue = [100]; // 起始净值100
    for (let i = 0; i < returns.length; i++) {
      netValue.push(netValue[netValue.length - 1] * (1 + returns[i]));
    }
    return netValue;
  };

  // 分析投资组合
  const analyzePortfolio = async () => {
    if (selectedETFs.length === 0) {
      message.warning('请先选择ETF');
      return;
    }

    if (hs300Data.length === 0) {
      message.warning('请先获取沪深300数据');
      return;
    }

    setLoading(true);
    try {
      const results = [];
      const marketReturns = calculateReturns(hs300Data);

      for (const etf of selectedETFs) {
        const etfData = await fetchETFData(etf.code);
        if (!etfData || etfData.length === 0) continue;

        const etfReturns = calculateReturns(etfData);
        const beta = calculateBeta(etfReturns, marketReturns);
        const alpha = calculateAlpha(etfReturns, marketReturns, beta);
        const sharpeRatio = calculateSharpeRatio(etfReturns);
        
        // 计算年化收益率和波动率
        const etfMean = etfReturns.reduce((a, b) => a + b, 0) / etfReturns.length;
        const annualReturn = Math.pow(1 + etfMean, 252) - 1;
        const variance = etfReturns.reduce((sum, ret) => sum + Math.pow(ret - etfMean, 2), 0) / etfReturns.length;
        const volatility = Math.sqrt(variance * 252);

        results.push({
          code: etf.code,
          name: etf.name,
          beta: beta.toFixed(4),
          alpha: (alpha * 100).toFixed(2) + '%',
          sharpeRatio: sharpeRatio.toFixed(4),
          annualReturn: (annualReturn * 100).toFixed(2) + '%',
          volatility: (volatility * 100).toFixed(2) + '%',
          etfReturns,
          marketReturns
        });
      }

      setAnalysisResults(results);
      message.success('投资组合分析完成');
    } catch (error) {
      console.error('分析投资组合失败:', error);
      message.error('分析投资组合失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加ETF到组合
  const addETF = (etfCode) => {
    const etf = ETF_POOL.find(e => e.code === etfCode);
    if (etf && !selectedETFs.find(e => e.code === etfCode)) {
      setSelectedETFs([...selectedETFs, etf]);
    }
  };

  // 从组合中移除ETF
  const removeETF = (etfCode) => {
    setSelectedETFs(selectedETFs.filter(etf => etf.code !== etfCode));
  };

  // 选择ETF进行成分股分析
  const selectETFForAnalysis = (etfCode) => {
    const etf = ETF_POOL.find(e => e.code === etfCode);
    if (etf) {
      setSelectedETF(etf);
      setSelectedComponents([]);
      setComponentAnalysisResults(null);
    }
  };

  // 添加成分股到分析列表
  const addComponent = (componentCode) => {
    if (selectedETF && ETF_COMPONENTS[selectedETF.code]) {
      const component = ETF_COMPONENTS[selectedETF.code].components.find(c => c.code === componentCode);
      if (component && !selectedComponents.find(c => c.code === componentCode)) {
        setSelectedComponents([...selectedComponents, component]);
      }
    }
  };

  // 从分析列表中移除成分股
  const removeComponent = (componentCode) => {
    setSelectedComponents(selectedComponents.filter(c => c.code !== componentCode));
  };

  // 获取成分股数据
  const fetchComponentData = async (componentCode) => {
    try {
      const data = await StockService.getKlineData(componentCode, analysisConfig.dataPoints, analysisConfig.period);
      return data;
    } catch (error) {
      console.error(`获取成分股 ${componentCode} 数据失败:`, error);
      return null;
    }
  };

  // 分析成分股与ETF的相关性
  const analyzeComponents = async () => {
    if (!selectedETF || selectedComponents.length === 0) {
      message.warning('请先选择ETF和成分股');
      return;
    }

    setLoading(true);
    try {
      // 获取ETF数据
      const etfData = await fetchETFData(selectedETF.code);
      if (!etfData || etfData.length === 0) {
        message.error('获取ETF数据失败');
        return;
      }

      const etfReturns = calculateReturns(etfData);
      const results = [];

      for (const component of selectedComponents) {
        const componentData = await fetchComponentData(component.code);
        if (!componentData || componentData.length === 0) continue;

        const componentReturns = calculateReturns(componentData);
        const beta = calculateBeta(componentReturns, etfReturns);
        const alpha = calculateAlpha(componentReturns, etfReturns, beta);
        const sharpeRatio = calculateSharpeRatio(componentReturns);
        
        // 计算年化收益率和波动率
        const componentMean = componentReturns.reduce((a, b) => a + b, 0) / componentReturns.length;
        const annualReturn = Math.pow(1 + componentMean, 252) - 1;
        const variance = componentReturns.reduce((sum, ret) => sum + Math.pow(ret - componentMean, 2), 0) / componentReturns.length;
        const volatility = Math.sqrt(variance * 252);

        results.push({
          code: component.code,
          name: component.name,
          beta: beta.toFixed(4),
          alpha: (alpha * 100).toFixed(2) + '%',
          sharpeRatio: sharpeRatio.toFixed(4),
          annualReturn: (annualReturn * 100).toFixed(2) + '%',
          volatility: (volatility * 100).toFixed(2) + '%',
          componentReturns,
          etfReturns
        });
      }

      setComponentAnalysisResults(results);
      setEtfData(etfData);
      message.success('成分股分析完成');
    } catch (error) {
      console.error('分析成分股失败:', error);
      message.error('分析成分股失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化图表
  useEffect(() => {
    if (analysisResults && analysisResults.length > 0) {
      const chartDom = document.getElementById('portfolio-chart');
      if (chartDom) {
        // 清理之前的图表实例
        if (chartInstance) {
          chartInstance.dispose();
        }
        
        const chart = echarts.init(chartDom);
        setChartInstance(chart);

        // 生成日期标签
        const generateDateLabels = (dataLength) => {
          const labels = [];
          const today = new Date();
          for (let i = dataLength - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('zh-CN', { 
              month: 'short', 
              day: 'numeric' 
            }));
          }
          return labels;
        };

        // 计算净值曲线数据
        const calculateNetValue = (returns) => {
          const netValue = [100]; // 起始净值100
          for (let i = 0; i < returns.length; i++) {
            netValue.push(netValue[netValue.length - 1] * (1 + returns[i]));
          }
          return netValue;
        };

        const marketNetValue = calculateNetValue(analysisResults[0]?.marketReturns || []);
        const etfNetValues = analysisResults.map(result => ({
          name: result.name,
          data: calculateNetValue(result.etfReturns)
        }));

        const option = {
          title: {
            text: 'ETF与沪深300净值曲线对比',
            left: 'center',
            textStyle: {
              fontSize: 16,
              fontWeight: 'bold'
            }
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'cross'
            },
            formatter: function(params) {
              let result = params[0].name + '<br/>';
              params.forEach(param => {
                const netValue = param.value.toFixed(2);
                const change = param.value - 100;
                const changePercent = ((param.value - 100) / 100 * 100).toFixed(2);
                result += `${param.seriesName}: ${netValue} (${change >= 0 ? '+' : ''}${changePercent}%)<br/>`;
              });
              return result;
            }
          },
          legend: {
            data: ['沪深300', ...analysisResults.map(r => r.name)],
            top: 40,
            type: 'scroll'
          },
          grid: {
            left: '5%',
            right: '5%',
            bottom: '10%',
            top: '15%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: generateDateLabels(analysisResults[0]?.marketReturns.length || 0),
            axisLabel: {
              rotate: 45,
              fontSize: 10
            }
          },
          yAxis: {
            type: 'value',
            name: '净值',
            axisLabel: {
              formatter: '{value}'
            },
            splitLine: {
              lineStyle: {
                type: 'dashed'
              }
            }
          },
          series: [
            {
              name: '沪深300',
              type: 'line',
              data: marketNetValue,
              smooth: true,
              lineStyle: { 
                color: '#1890ff',
                width: 3
              },
              symbol: 'none',
              areaStyle: {
                opacity: 0.1,
                color: '#1890ff'
              }
            },
            ...etfNetValues.map((result, index) => ({
              name: result.name,
              type: 'line',
              data: result.data,
              smooth: true,
              lineStyle: { 
                color: `hsl(${index * 60}, 70%, 50%)`,
                width: 2
              },
              symbol: 'none'
            }))
          ],
          animation: true,
          animationDuration: 1000,
          dataZoom: [
            {
              type: 'inside',
              start: 0,
              end: 100
            },
            {
              type: 'slider',
              start: 0,
              end: 100,
              height: 20,
              bottom: 10
            }
          ]
        };

        chart.setOption(option);
        
        // 初始化相关性散点图
        const correlationChartDom = document.getElementById('correlation-chart');
        if (correlationChartDom) {
          const correlationChart = echarts.init(correlationChartDom);
          
          // 计算相关性散点图数据
          const scatterData = analysisResults.map((result, index) => {
            const points = result.etfReturns.map((etfReturn, i) => [
              result.marketReturns[i] * 100, // x轴：市场收益率
              etfReturn * 100 // y轴：ETF收益率
            ]);
            return {
              name: result.name,
              data: points,
              type: 'scatter',
              symbolSize: 4,
              itemStyle: {
                color: `hsl(${index * 60}, 70%, 50%)`
              }
            };
          });

          const correlationOption = {
            title: {
              text: 'ETF与沪深300收益率相关性',
              left: 'center',
              textStyle: {
                fontSize: 14,
                fontWeight: 'bold'
              }
            },
            tooltip: {
              trigger: 'item',
              formatter: function(params) {
                return `${params.seriesName}<br/>市场收益率: ${params.data[0].toFixed(2)}%<br/>ETF收益率: ${params.data[1].toFixed(2)}%`;
              }
            },
            legend: {
              data: analysisResults.map(r => r.name),
              top: 30,
              type: 'scroll'
            },
            grid: {
              left: '10%',
              right: '10%',
              bottom: '10%',
              top: '20%',
              containLabel: true
            },
            xAxis: {
              type: 'value',
              name: '沪深300收益率(%)',
              axisLabel: {
                formatter: '{value}%'
              },
              splitLine: {
                lineStyle: {
                  type: 'dashed'
                }
              }
            },
            yAxis: {
              type: 'value',
              name: 'ETF收益率(%)',
              axisLabel: {
                formatter: '{value}%'
              },
              splitLine: {
                lineStyle: {
                  type: 'dashed'
                }
              }
            },
            series: [
              // 添加趋势线
              {
                name: '趋势线',
                type: 'line',
                data: [],
                lineStyle: {
                  color: '#999',
                  type: 'dashed',
                  width: 1
                },
                symbol: 'none',
                silent: true
              },
              ...scatterData
            ],
            animation: true,
            animationDuration: 1000
          };

          correlationChart.setOption(correlationOption);
        }
        
        // 响应式调整
        const resizeChart = () => {
          chart.resize();
          if (correlationChartDom) {
            const correlationChart = echarts.getInstanceByDom(correlationChartDom);
            if (correlationChart) {
              correlationChart.resize();
            }
          }
        };
        
        window.addEventListener('resize', resizeChart);
        
        return () => {
          window.removeEventListener('resize', resizeChart);
        };
      }
    }
  }, [analysisResults]);

  // 初始化成分股分析图表
  useEffect(() => {
    if (componentAnalysisResults && componentAnalysisResults.length > 0 && etfData) {
      const componentChartDom = document.getElementById('component-chart');
      if (componentChartDom) {
        const componentChart = echarts.init(componentChartDom);

        // 计算ETF净值曲线
        const etfReturns = calculateReturns(etfData);
        const etfNetValue = calculateNetValue(etfReturns);
        
        // 计算成分股净值曲线
        const componentNetValues = componentAnalysisResults.map((result, index) => ({
          name: result.name,
          data: calculateNetValue(result.componentReturns)
        }));

        const option = {
          title: {
            text: `${selectedETF?.name}与成分股净值曲线对比`,
            left: 'center',
            textStyle: {
              fontSize: 16,
              fontWeight: 'bold'
            }
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'cross'
            },
            formatter: function(params) {
              let result = params[0].name + '<br/>';
              params.forEach(param => {
                const netValue = param.value.toFixed(2);
                const change = param.value - 100;
                const changePercent = ((param.value - 100) / 100 * 100).toFixed(2);
                result += `${param.seriesName}: ${netValue} (${change >= 0 ? '+' : ''}${changePercent}%)<br/>`;
              });
              return result;
            }
          },
          legend: {
            data: [selectedETF?.name, ...componentAnalysisResults.map(r => r.name)],
            top: 40,
            type: 'scroll'
          },
          grid: {
            left: '5%',
            right: '5%',
            bottom: '10%',
            top: '15%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: etfNetValue.map((_, index) => {
              const date = new Date();
              date.setDate(date.getDate() - (etfNetValue.length - index));
              return date.toLocaleDateString('zh-CN', { 
                month: 'short', 
                day: 'numeric' 
              });
            }),
            axisLabel: {
              rotate: 45,
              fontSize: 10
            }
          },
          yAxis: {
            type: 'value',
            name: '净值',
            axisLabel: {
              formatter: '{value}'
            },
            splitLine: {
              lineStyle: {
                type: 'dashed'
              }
            }
          },
          series: [
            {
              name: selectedETF?.name,
              type: 'line',
              data: etfNetValue,
              smooth: true,
              lineStyle: { 
                color: '#1890ff',
                width: 3
              },
              symbol: 'none',
              areaStyle: {
                opacity: 0.1,
                color: '#1890ff'
              }
            },
            ...componentNetValues.map((result, index) => ({
              name: result.name,
              type: 'line',
              data: result.data,
              smooth: true,
              lineStyle: { 
                color: `hsl(${index * 60}, 70%, 50%)`,
                width: 2
              },
              symbol: 'none'
            }))
          ],
          animation: true,
          animationDuration: 1000,
          dataZoom: [
            {
              type: 'inside',
              start: 0,
              end: 100
            },
            {
              type: 'slider',
              start: 0,
              end: 100,
              height: 20,
              bottom: 10
            }
          ]
        };

        componentChart.setOption(option);

        // 初始化成分股相关性散点图
        const componentCorrelationDom = document.getElementById('component-correlation-chart');
        if (componentCorrelationDom) {
          const componentCorrelationChart = echarts.init(componentCorrelationDom);
          
          const scatterData = componentAnalysisResults.map((result, index) => {
            const points = result.componentReturns.map((componentReturn, i) => [
              result.etfReturns[i] * 100, // x轴：ETF收益率
              componentReturn * 100 // y轴：成分股收益率
            ]);
            return {
              name: result.name,
              data: points,
              type: 'scatter',
              symbolSize: 4,
              itemStyle: {
                color: `hsl(${index * 60}, 70%, 50%)`
              }
            };
          });

          const correlationOption = {
            title: {
              text: '成分股与ETF收益率相关性',
              left: 'center',
              textStyle: {
                fontSize: 14,
                fontWeight: 'bold'
              }
            },
            tooltip: {
              trigger: 'item',
              formatter: function(params) {
                return `${params.seriesName}<br/>ETF收益率: ${params.data[0].toFixed(2)}%<br/>成分股收益率: ${params.data[1].toFixed(2)}%`;
              }
            },
            legend: {
              data: componentAnalysisResults.map(r => r.name),
              top: 30,
              type: 'scroll'
            },
            grid: {
              left: '10%',
              right: '10%',
              bottom: '10%',
              top: '20%',
              containLabel: true
            },
            xAxis: {
              type: 'value',
              name: 'ETF收益率(%)',
              axisLabel: {
                formatter: '{value}%'
              },
              splitLine: {
                lineStyle: {
                  type: 'dashed'
                }
              }
            },
            yAxis: {
              type: 'value',
              name: '成分股收益率(%)',
              axisLabel: {
                formatter: '{value}%'
              },
              splitLine: {
                lineStyle: {
                  type: 'dashed'
                }
              }
            },
            series: [
              // 添加趋势线
              {
                name: '趋势线',
                type: 'line',
                data: [],
                lineStyle: {
                  color: '#999',
                  type: 'dashed',
                  width: 1
                },
                symbol: 'none',
                silent: true
              },
              ...scatterData
            ],
            animation: true,
            animationDuration: 1000
          };

          componentCorrelationChart.setOption(correlationOption);
        }
      }
    }
  }, [componentAnalysisResults, etfData, selectedETF]);

  // 清理图表实例
  useEffect(() => {
    return () => {
      if (chartInstance) {
        chartInstance.dispose();
      }
    };
  }, [chartInstance]);

  // 更新分析配置
  const updateAnalysisConfig = (newConfig) => {
    setAnalysisConfig({ ...analysisConfig, ...newConfig });
  };

  // 重新获取数据
  const refreshData = async () => {
    await fetchHS300Data();
    setAnalysisResults(null); // 清空之前的结果
  };

  // 页面加载时获取沪深300数据
  useEffect(() => {
    fetchHS300Data();
  }, [analysisConfig.period, analysisConfig.dataPoints]);

  const columns = [
    {
      title: 'ETF代码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'ETF名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'β系数',
      dataIndex: 'beta',
      key: 'beta',
      render: (value) => (
        <span style={{ color: parseFloat(value) > 1 ? '#ff4d4f' : '#52c41a' }}>
          {value}
        </span>
      )
    },
    {
      title: 'α系数',
      dataIndex: 'alpha',
      key: 'alpha',
      render: (value) => (
        <span style={{ color: parseFloat(value) > 0 ? '#52c41a' : '#ff4d4f' }}>
          {value}
        </span>
      )
    },
    {
      title: '夏普比率',
      dataIndex: 'sharpeRatio',
      key: 'sharpeRatio',
    },
    {
      title: '年化收益率',
      dataIndex: 'annualReturn',
      key: 'annualReturn',
      render: (value) => (
        <span style={{ color: parseFloat(value) > 0 ? '#52c41a' : '#ff4d4f' }}>
          {value}
        </span>
      )
    },
    {
      title: '年化波动率',
      dataIndex: 'volatility',
      key: 'volatility',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          danger 
          icon={<DeleteOutlined />}
          onClick={() => removeETF(record.code)}
        >
          移除
        </Button>
      ),
    },
  ];

  const componentColumns = [
    {
      title: '股票代码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '股票名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'β系数',
      dataIndex: 'beta',
      key: 'beta',
      render: (value) => (
        <span style={{ color: parseFloat(value) > 1 ? '#ff4d4f' : '#52c41a' }}>
          {value}
        </span>
      )
    },
    {
      title: 'α系数',
      dataIndex: 'alpha',
      key: 'alpha',
      render: (value) => (
        <span style={{ color: parseFloat(value) > 0 ? '#52c41a' : '#ff4d4f' }}>
          {value}
        </span>
      )
    },
    {
      title: '夏普比率',
      dataIndex: 'sharpeRatio',
      key: 'sharpeRatio',
    },
    {
      title: '年化收益率',
      dataIndex: 'annualReturn',
      key: 'annualReturn',
      render: (value) => (
        <span style={{ color: parseFloat(value) > 0 ? '#52c41a' : '#ff4d4f' }}>
          {value}
        </span>
      )
    },
    {
      title: '年化波动率',
      dataIndex: 'volatility',
      key: 'volatility',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          danger 
          icon={<DeleteOutlined />}
          onClick={() => removeComponent(record.code)}
        >
          移除
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="投资组合构建器" extra={<LineChartOutlined />}>
            <Tabs defaultActiveKey="1">
               <TabPane tab="组合配置" key="1">
                 <Row gutter={[16, 16]}>
                   <Col span={8}>
                     <Card size="small" title="分析参数配置">
                       <Form layout="vertical">
                         <Form.Item label="时间周期">
                           <Select
                             value={analysisConfig.period}
                             onChange={(value) => updateAnalysisConfig({ period: value })}
                             style={{ width: '100%' }}
                           >
                             <Option value="daily">日线</Option>
                             <Option value="1w">周线</Option>
                             <Option value="1M">月线</Option>
                           </Select>
                         </Form.Item>
                         <Form.Item label="数据点数量">
                           <Select
                             value={analysisConfig.dataPoints}
                             onChange={(value) => updateAnalysisConfig({ dataPoints: value })}
                             style={{ width: '100%' }}
                           >
                             <Option value={60}>60个交易日</Option>
                             <Option value={120}>120个交易日</Option>
                             <Option value={252}>252个交易日(1年)</Option>
                             <Option value={504}>504个交易日(2年)</Option>
                           </Select>
                         </Form.Item>
                         <Form.Item label="无风险利率(%)">
                           <Input
                             type="number"
                             value={analysisConfig.riskFreeRate * 100}
                             onChange={(e) => updateAnalysisConfig({ 
                               riskFreeRate: parseFloat(e.target.value) / 100 
                             })}
                             placeholder="3.0"
                             suffix="%"
                           />
                         </Form.Item>
                         <Button 
                           type="default" 
                           onClick={refreshData}
                           loading={loading}
                           style={{ width: '100%' }}
                         >
                           刷新数据
                         </Button>
                       </Form>
                     </Card>
                   </Col>
                   <Col span={8}>
                     <Card size="small" title="选择ETF">
                       <Form form={form} layout="vertical">
                         <Form.Item label="ETF选择">
                           <Select
                             placeholder="选择要添加的ETF"
                             style={{ width: '100%' }}
                             onChange={addETF}
                           >
                             {ETF_POOL.map(etf => (
                               <Option key={etf.code} value={etf.code}>
                                 {etf.name} ({etf.code})
                               </Option>
                             ))}
                           </Select>
                         </Form.Item>
                       </Form>
                     </Card>
                   </Col>
                   <Col span={8}>
                     <Card size="small" title="当前组合">
                       <div style={{ marginBottom: 16 }}>
                         <Button 
                           type="primary" 
                           icon={<CalculatorOutlined />}
                           onClick={analyzePortfolio}
                           loading={loading}
                           disabled={selectedETFs.length === 0}
                           style={{ width: '100%' }}
                         >
                           分析投资组合
                         </Button>
                       </div>
                       <div>
                         <strong>已选择ETF数量: {selectedETFs.length}</strong>
                         {selectedETFs.length > 0 && (
                           <div style={{ marginTop: 8 }}>
                             {selectedETFs.map(etf => (
                               <div key={etf.code} style={{ marginBottom: 4 }}>
                                 {etf.name} ({etf.code})
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     </Card>
                   </Col>
                 </Row>
               </TabPane>
              
              <TabPane tab="分析结果" key="2">
                {analysisResults ? (
                  <div>
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                      <Col span={6}>
                        <Card>
                          <Statistic
                            title="平均β系数"
                            value={analysisResults.reduce((sum, r) => sum + parseFloat(r.beta), 0) / analysisResults.length}
                            precision={4}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card>
                          <Statistic
                            title="平均α系数"
                            value={analysisResults.reduce((sum, r) => sum + parseFloat(r.alpha), 0) / analysisResults.length}
                            precision={2}
                            suffix="%"
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card>
                          <Statistic
                            title="平均夏普比率"
                            value={analysisResults.reduce((sum, r) => sum + parseFloat(r.sharpeRatio), 0) / analysisResults.length}
                            precision={4}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card>
                          <Statistic
                            title="平均年化收益率"
                            value={analysisResults.reduce((sum, r) => sum + parseFloat(r.annualReturn), 0) / analysisResults.length}
                            precision={2}
                            suffix="%"
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Card title="详细分析结果">
                      <Table
                        columns={columns}
                        dataSource={analysisResults}
                        rowKey="code"
                        pagination={false}
                      />
                    </Card>

                     <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                       <Col span={12}>
                         <Card title="净值曲线对比" size="small">
                           <div 
                             id="portfolio-chart" 
                             style={{ 
                               width: '100%', 
                               height: '400px',
                               minWidth: '400px'
                             }}
                           ></div>
                         </Card>
                       </Col>
                       <Col span={12}>
                         <Card title="相关性散点图" size="small">
                           <div 
                             id="correlation-chart" 
                             style={{ 
                               width: '100%', 
                               height: '400px',
                               minWidth: '400px'
                             }}
                           ></div>
                         </Card>
                       </Col>
                     </Row>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Alert
                      message="请先配置投资组合并进行分析"
                      description="选择ETF并点击'分析投资组合'按钮开始分析"
                      type="info"
                      showIcon
                    />
                  </div>
                )}
              </TabPane>

               <TabPane tab="成分股分析" key="3">
                 <Row gutter={[16, 16]}>
                   <Col span={8}>
                     <Card size="small" title="选择ETF">
                       <Form layout="vertical">
                         <Form.Item label="ETF选择">
                           <Select
                             placeholder="选择要分析的ETF"
                             style={{ width: '100%' }}
                             onChange={selectETFForAnalysis}
                             value={selectedETF?.code}
                           >
                             {ETF_POOL.filter(etf => ETF_COMPONENTS[etf.code]).map(etf => (
                               <Option key={etf.code} value={etf.code}>
                                 {etf.name} ({etf.code})
                               </Option>
                             ))}
                           </Select>
                         </Form.Item>
                       </Form>
                     </Card>
                   </Col>
                   <Col span={8}>
                     <Card size="small" title="选择成分股">
                       {selectedETF && ETF_COMPONENTS[selectedETF.code] ? (
                         <Form layout="vertical">
                           <Form.Item label="成分股选择">
                             <Select
                               placeholder="选择要分析的成分股"
                               style={{ width: '100%' }}
                               onChange={addComponent}
                             >
                               {ETF_COMPONENTS[selectedETF.code].components.map(component => (
                                 <Option key={component.code} value={component.code}>
                                   {component.name} ({component.code})
                                 </Option>
                               ))}
                             </Select>
                           </Form.Item>
                         </Form>
                       ) : (
                         <Alert message="请先选择ETF" type="info" />
                       )}
                     </Card>
                   </Col>
                   <Col span={8}>
                     <Card size="small" title="当前分析">
                       <div style={{ marginBottom: 16 }}>
                         <Button 
                           type="primary" 
                           icon={<CalculatorOutlined />}
                           onClick={analyzeComponents}
                           loading={loading}
                           disabled={!selectedETF || selectedComponents.length === 0}
                           style={{ width: '100%' }}
                         >
                           分析成分股
                         </Button>
                       </div>
                       <div>
                         <strong>已选择成分股数量: {selectedComponents.length}</strong>
                         {selectedComponents.length > 0 && (
                           <div style={{ marginTop: 8 }}>
                             {selectedComponents.map(component => (
                               <div key={component.code} style={{ marginBottom: 4 }}>
                                 {component.name} ({component.code})
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     </Card>
                   </Col>
                 </Row>

                 {componentAnalysisResults && (
                   <div style={{ marginTop: 16 }}>
                     <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                       <Col span={6}>
                         <Card>
                           <Statistic
                             title="平均β系数"
                             value={componentAnalysisResults.reduce((sum, r) => sum + parseFloat(r.beta), 0) / componentAnalysisResults.length}
                             precision={4}
                           />
                         </Card>
                       </Col>
                       <Col span={6}>
                         <Card>
                           <Statistic
                             title="平均α系数"
                             value={componentAnalysisResults.reduce((sum, r) => sum + parseFloat(r.alpha), 0) / componentAnalysisResults.length}
                             precision={2}
                             suffix="%"
                           />
                         </Card>
                       </Col>
                       <Col span={6}>
                         <Card>
                           <Statistic
                             title="平均夏普比率"
                             value={componentAnalysisResults.reduce((sum, r) => sum + parseFloat(r.sharpeRatio), 0) / componentAnalysisResults.length}
                             precision={4}
                           />
                         </Card>
                       </Col>
                       <Col span={6}>
                         <Card>
                           <Statistic
                             title="平均年化收益率"
                             value={componentAnalysisResults.reduce((sum, r) => sum + parseFloat(r.annualReturn), 0) / componentAnalysisResults.length}
                             precision={2}
                             suffix="%"
                           />
                         </Card>
                       </Col>
                     </Row>

                     <Card title="成分股分析结果">
                       <Table
                         columns={componentColumns}
                         dataSource={componentAnalysisResults}
                         rowKey="code"
                         pagination={false}
                       />
                     </Card>

                     <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                       <Col span={12}>
                         <Card title="净值曲线对比" size="small">
                           <div 
                             id="component-chart" 
                             style={{ 
                               width: '100%', 
                               height: '400px',
                               minWidth: '400px'
                             }}
                           ></div>
                         </Card>
                       </Col>
                       <Col span={12}>
                         <Card title="相关性散点图" size="small">
                           <div 
                             id="component-correlation-chart" 
                             style={{ 
                               width: '100%', 
                               height: '400px',
                               minWidth: '400px'
                             }}
                           ></div>
                         </Card>
                       </Col>
                     </Row>
                   </div>
                 )}
               </TabPane>

               <TabPane tab="对冲策略" key="4">
                 <Card title="β对冲策略说明">
                   <Alert
                     message="β对冲策略"
                     description={
                       <div>
                         <p><strong>策略原理：</strong></p>
                         <p>1. 通过计算ETF与沪深300的β系数，确定ETF相对于市场的敏感度</p>
                         <p>2. 当β大于1时，ETF比市场更敏感；当β小于1时，ETF比市场更稳定</p>
                         <p>3. 通过做空β系数高的ETF，做多β系数低的ETF，实现对冲</p>
                         <p>4. 目标是获取α收益（超额收益），同时降低市场风险敞口</p>
                         <Divider />
                         <p><strong>操作建议：</strong></p>
                         <p>• 选择α系数为正的ETF作为多头</p>
                         <p>• 选择α系数为负的ETF作为空头</p>
                         <p>• 根据β系数调整仓位比例</p>
                         <p>• 定期重新平衡投资组合</p>
                       </div>
                     }
                     type="info"
                     showIcon
                   />
                   
                   {analysisResults && (
                     <div style={{ marginTop: 16 }}>
                       <Card title="对冲建议" size="small">
                         <Row gutter={[16, 16]}>
                           <Col span={12}>
                             <h4>建议做多（α 大于 0）:</h4>
                             {analysisResults
                               .filter(r => parseFloat(r.alpha) > 0)
                               .map(r => (
                                 <div key={r.code} style={{ marginBottom: 8 }}>
                                   <strong>{r.name}</strong> - α: {r.alpha}, β: {r.beta}
                                 </div>
                               ))}
                           </Col>
                           <Col span={12}>
                             <h4>建议做空（α 小于 0）:</h4>
                             {analysisResults
                               .filter(r => parseFloat(r.alpha) < 0)
                               .map(r => (
                                 <div key={r.code} style={{ marginBottom: 8 }}>
                                   <strong>{r.name}</strong> - α: {r.alpha}, β: {r.beta}
                                 </div>
                               ))}
                           </Col>
                         </Row>
                       </Card>
                     </div>
                   )}
                 </Card>
               </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
