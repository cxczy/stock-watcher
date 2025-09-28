import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Input, 
  Table, 
  message, 
  Spin, 
  Tag,
  Space,
  Statistic,
  Row,
  Col,
  Select,
  Modal,
  Form,
  Popconfirm,
  Tooltip,
  Alert,
  Tabs
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  LineChartOutlined,
  EditOutlined,
  FolderAddOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { StockService } from '../services/stockService.js';
import { SimpleIndicators } from '../utils/simpleIndicators.js';

const { Option } = Select;
const { TextArea } = Input;

// 默认分组配置
const DEFAULT_GROUPS = {
  '短线': {
    name: '短线',
    description: '15分钟MA34和MA55金叉死叉判断',
    timeframe: '15min',
    indicators: ['MA34', 'MA55'],
    showRating: true
  },
  '中线': {
    name: '中线',
    description: '日线MA8和MA20金叉死叉判断',
    timeframe: 'daily',
    indicators: ['MA8', 'MA20'],
    showRating: true
  },
  '长线': {
    name: '长线',
    description: '长期持有，无需买卖评级',
    timeframe: 'daily',
    indicators: [],
    showRating: false
  }
};

export default function PortfolioHoldings() {
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [holdings, setHoldings] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('短线');
  const [newStockCode, setNewStockCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isAddGroupModalVisible, setIsAddGroupModalVisible] = useState(false);
  const [isEditGroupModalVisible, setIsEditGroupModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  // 初始化持仓数据
  useEffect(() => {
    const savedHoldings = localStorage.getItem('portfolioHoldings');
    if (savedHoldings) {
      setHoldings(JSON.parse(savedHoldings));
    }
  }, []);

  // 保存持仓数据到本地存储
  const saveHoldings = (newHoldings) => {
    setHoldings(newHoldings);
    localStorage.setItem('portfolioHoldings', JSON.stringify(newHoldings));
  };

  // 添加股票到当前分组
  const handleAddStock = async () => {
    if (!newStockCode.trim()) {
      message.warning('请输入股票代码');
      return;
    }

    const stockCode = newStockCode.trim();
    
    // 检查是否已存在
    if (holdings[selectedGroup]?.some(stock => stock.code === stockCode)) {
      message.warning('该股票已在当前分组中');
      return;
    }

    setLoading(true);
    try {
      // 获取股票基本信息
      const stockInfo = await StockService.getStockInfo(stockCode);
      console.log('股票信息:', stockInfo);
      
      // 验证股票代码是否有效
      const klineData = await StockService.getKlineData(stockCode, 10);
      if (klineData.length === 0) {
        message.error('无效的股票代码');
        return;
      }

      const newStock = {
        code: stockCode,
        name: stockInfo?.name || `股票${stockCode}`, // 使用API返回的股票名称
        price: klineData[klineData.length - 1].close,
        change: klineData[klineData.length - 1].rate,
        market: StockService.getMarketName(stockCode),
        addedTime: new Date().toLocaleString(),
        rating: null,
        lastAnalysis: null
      };

      const newHoldings = {
        ...holdings,
        [selectedGroup]: [...(holdings[selectedGroup] || []), newStock]
      };

      saveHoldings(newHoldings);
      setNewStockCode('');
      message.success(`已添加股票 ${stockInfo?.name || stockCode} 到 ${selectedGroup} 分组`);
    } catch (error) {
      console.error('添加股票失败:', error);
      message.error('添加股票失败，请检查股票代码');
    } finally {
      setLoading(false);
    }
  };

  // 删除股票
  const handleRemoveStock = (stockCode) => {
    const newHoldings = {
      ...holdings,
      [selectedGroup]: holdings[selectedGroup].filter(stock => stock.code !== stockCode)
    };
    saveHoldings(newHoldings);
    message.success(`已删除股票 ${stockCode}`);
  };

  // 分析单只股票
  const handleAnalyzeStock = async (stockCode) => {
    setLoading(true);
    try {
      // 根据分组选择时间周期
      let period = 'daily';
      if (selectedGroup === '短线') {
        period = '15min';
      } else if (selectedGroup === '中线') {
        period = 'daily';
      } else if (selectedGroup === '长线') {
        period = 'daily';
      }

      console.log(`🔍 获取${selectedGroup}分组数据，时间周期: ${period}`);
      const klineData = await StockService.getKlineData(stockCode, 100, period);
      
      if (klineData.length < 50) {
        message.warning('数据不足，无法分析');
        return;
      }

      const analysis = await performTechnicalAnalysis(klineData, selectedGroup);
      
      // 更新持仓数据
      const newHoldings = { ...holdings };
      const stockIndex = newHoldings[selectedGroup].findIndex(stock => stock.code === stockCode);
      if (stockIndex !== -1) {
        newHoldings[selectedGroup][stockIndex].rating = analysis.rating;
        newHoldings[selectedGroup][stockIndex].lastAnalysis = analysis;
        saveHoldings(newHoldings);
      }

      message.success('分析完成');
    } catch (error) {
      console.error('分析失败:', error);
      message.error('分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 执行技术分析
  const performTechnicalAnalysis = async (klineData, groupName) => {
    const prices = klineData.map(d => d.close);
    const highs = klineData.map(d => d.high);
    const lows = klineData.map(d => d.low);
    const volumes = klineData.map(d => d.volume);
    const latestIndex = klineData.length - 1;

    const group = groups[groupName];
    let rating = 'hold';
    let confidence = 0;
    let indicators = {};

    // 添加调试信息
    console.log(`🔍 分析分组: ${groupName}`);
    console.log(`📊 数据长度: ${klineData.length}`);
    console.log(`💰 最新价格: ${prices[latestIndex]}`);

    if (group.showRating) {
      if (groupName === '短线') {
        // 15分钟MA34和MA55分析
        const ma34 = SimpleIndicators.SMA(prices, 34, latestIndex);
        const ma55 = SimpleIndicators.SMA(prices, 55, latestIndex);
        const currentPrice = prices[latestIndex];
        
        indicators = { ma34, ma55, currentPrice };
        
        console.log(`📈 MA34: ${ma34.toFixed(2)}`);
        console.log(`📈 MA55: ${ma55.toFixed(2)}`);
        console.log(`📊 MA34 > MA55: ${ma34 > ma55}`);
        console.log(`📊 MA34 < MA55: ${ma34 < ma55}`);
        
        if (ma34 > ma55) {
          rating = 'buy';
          console.log(`✅ 金叉信号: 买入`);
          // 计算置信度：基于均线差距和价格位置
          const maGap = Math.abs(ma34 - ma55) / ma55 * 100; // 均线差距百分比
          const priceAboveMA = (currentPrice - ma34) / ma34 * 100; // 价格在MA34上方的百分比
          confidence = Math.min(95, Math.max(60, 70 + maGap * 2 + priceAboveMA * 0.5));
        } else if (ma34 < ma55) {
          rating = 'sell';
          console.log(`❌ 死叉信号: 卖出`);
          // 计算置信度：基于均线差距和价格位置
          const maGap = Math.abs(ma34 - ma55) / ma55 * 100;
          const priceBelowMA = (ma34 - currentPrice) / ma34 * 100;
          confidence = Math.min(95, Math.max(60, 65 + maGap * 2 + priceBelowMA * 0.5));
        } else {
          console.log(`⚖️ 均线重合: 持有`);
        }
      } else if (groupName === '中线') {
        // 日线MA8和MA20分析
        const ma8 = SimpleIndicators.SMA(prices, 8, latestIndex);
        const ma20 = SimpleIndicators.SMA(prices, 20, latestIndex);
        const currentPrice = prices[latestIndex];
        
        // 计算趋势强度
        const trendStrength = calculateTrendStrength(prices, 20);
        
        indicators = { ma8, ma20, currentPrice, trendStrength };
        
        console.log(`📈 MA8: ${ma8.toFixed(2)}`);
        console.log(`📈 MA20: ${ma20.toFixed(2)}`);
        console.log(`📊 MA8 > MA20: ${ma8 > ma20}`);
        console.log(`📊 MA8 < MA20: ${ma8 < ma20}`);
        
        if (ma8 > ma20) {
          rating = 'buy';
          console.log(`✅ 金叉信号: 买入`);
          // 计算置信度：基于均线差距、趋势强度和价格位置
          const maGap = Math.abs(ma8 - ma20) / ma20 * 100;
          const priceAboveMA = (currentPrice - ma8) / ma8 * 100;
          confidence = Math.min(95, Math.max(65, 75 + maGap * 1.5 + trendStrength * 10 + priceAboveMA * 0.3));
        } else if (ma8 < ma20) {
          rating = 'sell';
          console.log(`❌ 死叉信号: 卖出`);
          // 计算置信度：基于均线差距、趋势强度和价格位置
          const maGap = Math.abs(ma8 - ma20) / ma20 * 100;
          const priceBelowMA = (ma8 - currentPrice) / ma8 * 100;
          confidence = Math.min(95, Math.max(65, 70 + maGap * 1.5 + trendStrength * 10 + priceBelowMA * 0.3));
        } else {
          console.log(`⚖️ 均线重合: 持有`);
        }
      }
    }

    console.log(`🎯 最终评级: ${rating}`);
    console.log(`📊 置信度: ${confidence}%`);

    return {
      rating,
      confidence: Math.round(confidence),
      timestamp: new Date().toLocaleString(),
      group: groupName,
      indicators
    };
  };

  // 计算趋势强度
  const calculateTrendStrength = (prices, period) => {
    if (prices.length < period) return 0;
    
    const recentPrices = prices.slice(-period);
    const firstPrice = recentPrices[0];
    const lastPrice = recentPrices[recentPrices.length - 1];
    
    // 计算价格变化百分比
    const priceChange = (lastPrice - firstPrice) / firstPrice * 100;
    
    // 计算价格波动性
    const avgPrice = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / period;
    const volatility = Math.sqrt(variance) / avgPrice * 100;
    
    // 趋势强度 = 价格变化 / 波动性
    const trendStrength = Math.abs(priceChange) / (volatility + 1);
    
    return Math.min(1, Math.max(0, trendStrength / 10)); // 归一化到0-1
  };

  // 批量分析当前分组
  const handleBatchAnalyze = async () => {
    if (!holdings[selectedGroup] || holdings[selectedGroup].length === 0) {
      message.warning('当前分组没有股票');
      return;
    }

    setLoading(true);
    const newHoldings = { ...holdings };

    // 根据分组选择时间周期
    let period = 'daily';
    if (selectedGroup === '短线') {
      period = '15min';
    } else if (selectedGroup === '中线') {
      period = 'daily';
    } else if (selectedGroup === '长线') {
      period = 'daily';
    }

    try {
      for (const stock of holdings[selectedGroup]) {
        try {
          console.log(`🔍 批量分析股票 ${stock.code}，时间周期: ${period}`);
          const klineData = await StockService.getKlineData(stock.code, 100, period);
          if (klineData.length >= 50) {
            const analysis = await performTechnicalAnalysis(klineData, selectedGroup);
            const stockIndex = newHoldings[selectedGroup].findIndex(s => s.code === stock.code);
            if (stockIndex !== -1) {
              newHoldings[selectedGroup][stockIndex].rating = analysis.rating;
              newHoldings[selectedGroup][stockIndex].lastAnalysis = analysis;
            }
          }
        } catch (error) {
          console.warn(`分析股票 ${stock.code} 失败:`, error);
        }
      }

      saveHoldings(newHoldings);
      message.success('批量分析完成');
    } catch (error) {
      console.error('批量分析失败:', error);
      message.error('批量分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加新分组
  const handleAddGroup = () => {
    if (!newGroupName.trim()) {
      message.warning('请输入分组名称');
      return;
    }

    if (groups[newGroupName]) {
      message.warning('分组名称已存在');
      return;
    }

    const newGroup = {
      name: newGroupName,
      description: newGroupDescription,
      timeframe: 'daily',
      indicators: [],
      showRating: false
    };

    setGroups({ ...groups, [newGroupName]: newGroup });
    setHoldings({ ...holdings, [newGroupName]: [] });
    setNewGroupName('');
    setNewGroupDescription('');
    setIsAddGroupModalVisible(false);
    message.success(`已创建分组 ${newGroupName}`);
  };

  // 删除分组
  const handleDeleteGroup = (groupName) => {
    if (Object.keys(groups).length <= 1) {
      message.warning('至少需要保留一个分组');
      return;
    }

    const newGroups = { ...groups };
    const newHoldings = { ...holdings };
    delete newGroups[groupName];
    delete newHoldings[groupName];

    setGroups(newGroups);
    saveHoldings(newHoldings);
    
    // 切换到第一个分组
    const firstGroup = Object.keys(newGroups)[0];
    setSelectedGroup(firstGroup);
    
    message.success(`已删除分组 ${groupName}`);
  };

  // 获取当前分组的表格列定义
  const getColumns = () => {
    const baseColumns = [
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
        title: '当日涨跌幅',
        dataIndex: 'change',
        key: 'change',
        width: 120,
        render: (change) => (
          <span style={{ color: change >= 0 ? '#f50' : '#52c41a' }}>
            {change?.toFixed(2)}%
          </span>
        )
      }
    ];

    // 如果当前分组需要显示买卖评级
    if (groups[selectedGroup]?.showRating) {
      baseColumns.push({
        title: '买卖评级',
        key: 'rating',
        width: 120,
        render: (_, record) => {
          if (!record.rating) return '-';
          
          const color = record.rating === 'buy' ? 'green' : 
                       record.rating === 'sell' ? 'red' : 'blue';
          const text = record.rating === 'buy' ? '买入' : 
                      record.rating === 'sell' ? '卖出' : '持有';
          
          return (
            <Space direction="vertical" size="small">
              <Tag color={color}>{text}</Tag>
              {record.lastAnalysis && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  置信度: {record.lastAnalysis.confidence}%
                </div>
              )}
            </Space>
          );
        }
      });
    }

    baseColumns.push({
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
    });

    return baseColumns;
  };

  // 获取当前分组的统计信息
  const getGroupStats = () => {
    const currentHoldings = holdings[selectedGroup] || [];
    const totalStocks = currentHoldings.length;
    const buyCount = currentHoldings.filter(stock => stock.rating === 'buy').length;
    const sellCount = currentHoldings.filter(stock => stock.rating === 'sell').length;
    const holdCount = currentHoldings.filter(stock => stock.rating === 'hold').length;

    return { totalStocks, buyCount, sellCount, holdCount };
  };

  const groupStats = getGroupStats();
  const currentHoldings = holdings[selectedGroup] || [];

  return (
    <div className="p-1">
      <Card title="" className="mb-4">
        {/* 分组管理按钮 */}
        <Row gutter={16} className="mb-4">
        {/* 分组Tab */}
        <Tabs
          activeKey={selectedGroup}
          onChange={setSelectedGroup}
          type="card"
          size="large"
          style={{ marginBottom: 16 }}
          tabBarStyle={{ 
            marginBottom: 0,
            background: '#f5f5f5',
            padding: '8px 16px',
            borderRadius: '6px 6px 0 0'
          }}
        >
          {Object.keys(groups).map(groupName => (
            <Tabs.TabPane 
              tab={
                <span>
                  <FolderOutlined />
                  <span style={{ marginLeft: 8 }}>{groupName}</span>
                  <span style={{ marginLeft: 8, color: '#999', fontSize: '12px' }}>
                    ({holdings[groupName]?.length || 0})
                  </span>
                </span>
              } 
              key={groupName}
            />
          ))}
        </Tabs>
          <Col span={4}>
            <Button 
              icon={<FolderAddOutlined />}
              onClick={() => setIsAddGroupModalVisible(true)}
            >
              新建分组
            </Button>
          </Col>
          <Col span={4}>
            <Popconfirm
              title="确定要删除这个分组吗？"
              onConfirm={() => handleDeleteGroup(selectedGroup)}
              okText="确定"
              cancelText="取消"
            >
              <Button 
                icon={<DeleteOutlined />}
                danger
                disabled={Object.keys(groups).length <= 1}
              >
                删除分组
              </Button>
            </Popconfirm>
          </Col>
        </Row>

      

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
          <Col span={4}>
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleBatchAnalyze}
              loading={loading}
            >
              批量分析
            </Button>
          </Col>
        </Row>

        {currentHoldings.length > 0 && (
          <Row gutter={16} className="mb-4">
            <Col span={6}>
              <Statistic
                title="总股票数"
                value={groupStats.totalStocks}
                prefix={<FolderOutlined />}
              />
            </Col>
            {groups[selectedGroup]?.showRating && (
              <>
                <Col span={6}>
                  <Statistic
                    title="建议买入"
                    value={groupStats.buyCount}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="建议卖出"
                    value={groupStats.sellCount}
                    valueStyle={{ color: '#f50' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="建议持有"
                    value={groupStats.holdCount}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </>
            )}
          </Row>
        )}
      </Card>

      <Card title={``}>
        <Spin spinning={loading}>
          <Table
            columns={getColumns()}
            size="small"
            dataSource={currentHoldings}
            rowKey="code"
            pagination={{ pageSize: 20 }}
            scroll={{ y: 400 }}
            locale={{ emptyText: '暂无持仓股票' }}
          />
        </Spin>
      </Card>

      {/* 添加分组模态框 */}
      <Modal
        title="新建分组"
        open={isAddGroupModalVisible}
        onOk={handleAddGroup}
        onCancel={() => {
          setIsAddGroupModalVisible(false);
          setNewGroupName('');
          setNewGroupDescription('');
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="分组名称" required>
            <Input
              placeholder="请输入分组名称"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="分组描述">
            <TextArea
              placeholder="请输入分组描述"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
