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
  FolderOutlined,
  DownloadOutlined,
  UploadOutlined,
  SearchOutlined
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
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importData, setImportData] = useState('');
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // 初始化持仓数据
  useEffect(() => {
    const savedHoldings = localStorage.getItem('portfolioHoldings');
    if (savedHoldings) {
      setHoldings(JSON.parse(savedHoldings));
    }

    const savedGroups = localStorage.getItem('portfolioGroups');
    if (savedGroups) {
      setGroups(JSON.parse(savedGroups));
    }
  }, []);

  // 保存持仓数据到本地存储
  const saveHoldings = (newHoldings) => {
    setHoldings(newHoldings);
    localStorage.setItem('portfolioHoldings', JSON.stringify(newHoldings));
  };

  // 保存分组配置到本地存储
  const saveGroups = (newGroups) => {
    setGroups(newGroups);
    localStorage.setItem('portfolioGroups', JSON.stringify(newGroups));
  };

  // 导出所有数据
  const handleExportData = () => {
    const exportData = {
      groups: groups,
      holdings: holdings,
      exportTime: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    message.success('数据导出成功');
  };

  // 导入数据
  const handleImportData = () => {
    if (!importData.trim()) {
      message.warning('请输入要导入的数据');
      return;
    }

    try {
      const importedData = JSON.parse(importData);
      
      if (!importedData.groups || !importedData.holdings) {
        message.error('数据格式不正确');
        return;
      }

      // 合并数据（保留现有数据，添加新数据）
      const newGroups = { ...groups, ...importedData.groups };
      const newHoldings = { ...holdings, ...importedData.holdings };

      setGroups(newGroups);
      setHoldings(newHoldings);
      saveGroups(newGroups);
      saveHoldings(newHoldings);
      
      setImportData('');
      setIsImportModalVisible(false);
      message.success('数据导入成功');
    } catch (error) {
      console.error('导入数据失败:', error);
      message.error('数据格式错误，请检查JSON格式');
    }
  };

  // 搜索股票
  const handleSearchStocks = async () => {
    if (!searchKeyword.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    setSearchLoading(true);
    try {
      const results = await StockService.searchStocks(searchKeyword.trim(), 1, 20);
      setSearchResults(results);
      console.log('搜索结果:', results);
    } catch (error) {
      console.error('搜索股票失败:', error);
      message.error('搜索失败，请稍后重试');
    } finally {
      setSearchLoading(false);
    }
  };

  // 选择搜索到的股票
  const handleSelectStock = async (stock) => {
    const stockCode = stock.code;
    
    // 检查是否已存在
    if (holdings[selectedGroup]?.some(s => s.code === stockCode)) {
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
        name: stockInfo?.name || stock.name || `股票${stockCode}`,
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
      setIsSearchModalVisible(false);
      setSearchKeyword('');
      setSearchResults([]);
      message.success(`已添加股票 ${stockInfo?.name || stock.name || stockCode} 到 ${selectedGroup} 分组`);
    } catch (error) {
      console.error('添加股票失败:', error);
      message.error('添加股票失败，请检查股票代码');
    } finally {
      setLoading(false);
    }
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
        
        // 计算量比
        const volumeRatio = calculateVolumeRatio(volumes, 5);
        
        indicators = { ma8, ma20, currentPrice, volumeRatio };
        
        console.log(`📈 MA8: ${ma8.toFixed(2)}`);
        console.log(`📈 MA20: ${ma20.toFixed(2)}`);
        console.log(`📊 量比: ${volumeRatio.toFixed(2)}`);
        console.log(`📊 MA8 > MA20: ${ma8 > ma20}`);
        console.log(`📊 MA8 < MA20: ${ma8 < ma20}`);
        
        if (ma8 > ma20) {
          rating = 'buy';
          console.log(`✅ 金叉信号: 买入`);
          // 计算置信度：基于量比，量比越大置信度越小（缩量买入更可靠）
          // 量比 < 1.0 时置信度最高，量比 > 2.0 时置信度最低
          let baseConfidence = 80;
          if (volumeRatio < 0.8) {
            // 缩量明显，置信度最高
            baseConfidence = 90;
          } else if (volumeRatio < 1.2) {
            // 量能正常，置信度较高
            baseConfidence = 85;
          } else if (volumeRatio < 2.0) {
            // 放量，置信度降低
            baseConfidence = 75 - (volumeRatio - 1.2) * 10;
          } else {
            // 放量过大，置信度最低
            baseConfidence = 60;
          }
          
          // 确保置信度在合理范围内
          confidence = Math.min(95, Math.max(60, baseConfidence));
          console.log(`📊 买入置信度计算: 量比=${volumeRatio.toFixed(2)}, 基础置信度=${baseConfidence}, 最终置信度=${confidence}`);
        } else if (ma8 < ma20) {
          rating = 'sell';
          console.log(`❌ 死叉信号: 卖出`);
          // 卖出信号：基于量比，放量卖出更可靠
          let baseConfidence = 75;
          if (volumeRatio > 2.0) {
            // 放量卖出，置信度较高
            baseConfidence = 85;
          } else if (volumeRatio > 1.5) {
            // 量能较大，置信度中等
            baseConfidence = 80;
          } else {
            // 缩量卖出，置信度较低
            baseConfidence = 70;
          }
          
          confidence = Math.min(95, Math.max(60, baseConfidence));
          console.log(`📊 卖出置信度计算: 量比=${volumeRatio.toFixed(2)}, 基础置信度=${baseConfidence}, 最终置信度=${confidence}`);
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

  // 计算量比
  const calculateVolumeRatio = (volumes, period = 5) => {
    if (volumes.length < period + 1) return 1;
    
    const currentVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.slice(-period - 1, -1).reduce((sum, vol) => sum + vol, 0) / period;
    
    return currentVolume / avgVolume;
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

    const newGroups = { ...groups, [newGroupName]: newGroup };
    const newHoldings = { ...holdings, [newGroupName]: [] };
    
    setGroups(newGroups);
    setHoldings(newHoldings);
    saveGroups(newGroups);
    saveHoldings(newHoldings);
    
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
    saveGroups(newGroups);
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

    // 根据分组类型添加相应的均线价格列
    if (selectedGroup === '短线') {
      baseColumns.push({
        title: 'MA55(15分钟)',
        key: 'ma55',
        width: 120,
        render: (_, record) => {
          if (record.lastAnalysis?.indicators?.ma55) {
            return record.lastAnalysis.indicators.ma55.toFixed(2);
          }
          return '-';
        }
      });
    } else if (selectedGroup === '中线') {
      baseColumns.push({
        title: 'MA8(日线)',
        key: 'ma8',
        width: 120,
        render: (_, record) => {
          if (record.lastAnalysis?.indicators?.ma8) {
            return record.lastAnalysis.indicators.ma8.toFixed(2);
          }
          return '-';
        }
      });
    }

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
            <Space direction="" size="small">
              <Tag color={color}>{text}</Tag>
              {record.lastAnalysis && (
                <span style={{ fontSize: '12px', color: '#666' }}>
                  置信度: {record.lastAnalysis.confidence}%
                </span>
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
      <Card title="" className="mb-1">
        {/* 分组管理按钮 */}
        <Row gutter={1} className="mb-1">
        {/* 分组Tab */}
        <Tabs
          activeKey={selectedGroup}
          onChange={setSelectedGroup}
          type="card"
          size="large"
          style={{ marginBottom: 1 }}
          tabBarStyle={{ 
            marginBottom: 0,
            background: '#f5f5f5',
            padding: '0',
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
          <Col span={3}>
            <Button 
              icon={<FolderAddOutlined />}
              onClick={() => setIsAddGroupModalVisible(true)}
            >
              新建分组
            </Button>
          </Col>
          <Col span={3}>
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
          <Col span={3}>
            <Button 
              icon={<DownloadOutlined />}
              onClick={handleExportData}
            >
              导出数据
            </Button>
          </Col>
          <Col span={3}>
            <Button 
              icon={<UploadOutlined />}
              onClick={() => setIsImportModalVisible(true)}
            >
              导入数据
            </Button>
          </Col>
        </Row>

      

        <Row gutter={16} className="mb-1">
          <Col span={6}>
            <Input
              placeholder="输入股票代码，如：000001"
              value={newStockCode}
              onChange={(e) => setNewStockCode(e.target.value)}
              onPressEnter={handleAddStock}
              style={{ marginRight: 8 }}
            />
          </Col>
          <Col span={3}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddStock}
              loading={loading}
            >
              添加股票
            </Button>
          </Col>
          <Col span={3}>
            <Button 
              icon={<SearchOutlined />}
              onClick={() => setIsSearchModalVisible(true)}
            >
              搜索推荐
            </Button>
          </Col>
          <Col span={3}>
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
          <Row gutter={16} className="mb-0">
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

      {/* 股票搜索模态框 */}
      <Modal
        title="股票搜索推荐"
        open={isSearchModalVisible}
        onCancel={() => {
          setIsSearchModalVisible(false);
          setSearchKeyword('');
          setSearchResults([]);
        }}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="搜索说明"
            description="输入股票名称、代码或拼音进行搜索，点击搜索结果即可添加到当前分组。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </div>
        
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={18}>
            <Input
              placeholder="输入股票名称、代码或拼音，如：平安银行、000001、PAYH"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={handleSearchStocks}
            />
          </Col>
          <Col span={6}>
            <Button 
              type="primary" 
              icon={<SearchOutlined />}
              onClick={handleSearchStocks}
              loading={searchLoading}
              style={{ width: '100%' }}
            >
              搜索
            </Button>
          </Col>
        </Row>

        {searchResults.length > 0 && (
          <div>
            <h4>搜索结果 ({searchResults.length} 条)</h4>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {searchResults.map((stock, index) => (
                <Card
                  key={`${stock.code}-${index}`}
                  size="small"
                  style={{ marginBottom: 8, cursor: 'pointer' }}
                  hoverable
                  onClick={() => handleSelectStock(stock)}
                >
                  <Row justify="space-between" align="middle">
                    <Col span={16}>
                      <div>
                        <strong>{stock.name}</strong>
                        <span style={{ marginLeft: 8, color: '#666' }}>
                          {stock.code}
                        </span>
                      </div>
                      <div style={{ color: '#999', fontSize: '12px' }}>
                        {stock.marketName} | {stock.pinyin}
                      </div>
                    </Col>
                    <Col span={8} style={{ textAlign: 'right' }}>
                      <Button 
                        type="primary" 
                        size="small"
                        icon={<PlusOutlined />}
                      >
                        添加到分组
                      </Button>
                    </Col>
                  </Row>
                </Card>
              ))}
            </div>
          </div>
        )}

        {searchKeyword && searchResults.length === 0 && !searchLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            未找到相关股票，请尝试其他关键词
          </div>
        )}
      </Modal>

      {/* 导入数据模态框 */}
      <Modal
        title="导入数据"
        open={isImportModalVisible}
        onOk={handleImportData}
        onCancel={() => {
          setIsImportModalVisible(false);
          setImportData('');
        }}
        okText="导入"
        cancelText="取消"
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="导入说明"
            description="请粘贴从其他设备导出的JSON数据。导入会合并现有数据，不会覆盖现有分组。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </div>
        <Form layout="vertical">
          <Form.Item label="导入数据" required>
            <TextArea
              placeholder="请粘贴导出的JSON数据..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={10}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
