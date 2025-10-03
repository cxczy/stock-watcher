import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  Table, 
  Input, 
  Statistic, 
  Row, 
  Col, 
  Spin, 
  message,
  Tag,
  Space,
  Typography
} from 'antd';
import { 
  SearchOutlined, 
  StockOutlined, 
  BankOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { IndexService } from '../services/indexService';

const { Search } = Input;
const { Title, Text } = Typography;

export default function IndexConstituents() {
  const [activeTab, setActiveTab] = useState('hs300');
  const [loading, setLoading] = useState(false);
  const [constituents, setConstituents] = useState([]);
  const [filteredConstituents, setFilteredConstituents] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [indexStats, setIndexStats] = useState({});

  // 表格列配置
  const columns = [
    {
      title: '股票代码',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code) => (
        <Text code style={{ color: '#1890ff' }}>
          {code}
        </Text>
      ),
    },
    {
      title: '股票名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name) => (
        <Text strong>{name}</Text>
      ),
    },
    {
      title: '交易所',
      dataIndex: 'exchange',
      key: 'exchange',
      width: 200,
      render: (exchange) => (
        <Tag color={exchange.includes('上海') ? 'blue' : 'green'}>
          {exchange}
        </Tag>
      ),
    },
    {
      title: '市场类型',
      key: 'marketType',
      width: 120,
      render: (_, record) => {
        const code = record.code;
        let marketType = '';
        let color = 'default';
        
        if (code.startsWith('000') || code.startsWith('002') || code.startsWith('300')) {
          marketType = '深圳市场';
          color = 'green';
        } else if (code.startsWith('600') || code.startsWith('601') || code.startsWith('603')) {
          marketType = '上海主板';
          color = 'blue';
        } else if (code.startsWith('688')) {
          marketType = '科创板';
          color = 'purple';
        } else if (code.startsWith('8')) {
          marketType = '新三板';
          color = 'orange';
        }
        
        return <Tag color={color}>{marketType}</Tag>;
      },
    },
  ];

  // 获取指数列表
  const indexList = IndexService.getIndexList();

  // 加载指数成分股数据
  const loadIndexData = async (indexKey) => {
    setLoading(true);
    try {
      const result = await IndexService.getIndexConstituents(indexKey);
      setConstituents(result.constituents);
      setFilteredConstituents(result.constituents);
      setIndexStats(IndexService.getIndexStats(indexKey, result.constituents));
      setSearchKeyword('');
    } catch (error) {
      message.error('加载指数成分股数据失败');
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索功能
  const handleSearch = (value) => {
    setSearchKeyword(value);
    if (!value) {
      setFilteredConstituents(constituents);
    } else {
      const filtered = IndexService.searchConstituents(activeTab, value, constituents);
      setFilteredConstituents(filtered);
    }
  };

  // 切换标签页
  const handleTabChange = (key) => {
    setActiveTab(key);
    loadIndexData(key);
  };

  // 初始化加载
  useEffect(() => {
    loadIndexData(activeTab);
  }, []);

  // 标签页配置
  const tabItems = indexList.map(index => ({
    key: index.key,
    label: (
      <Space>
        <StockOutlined />
        {index.name}
      </Space>
    ),
    children: (
      <div style={{ padding: '0 16px' }}>
        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="成分股总数"
                value={indexStats.total || 0}
                prefix={<StockOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="上海市场"
                value={indexStats.exchangeStats?.['上海证券交易所'] || 0}
                prefix={<BankOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="深圳市场"
                value={indexStats.exchangeStats?.['深圳证券交易所'] || 0}
                prefix={<BankOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="当前显示"
                value={filteredConstituents.length}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 搜索框 */}
        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索股票代码或名称"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            value={searchKeyword}
            style={{ maxWidth: 400 }}
          />
        </div>

        {/* 成分股表格 */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredConstituents}
            rowKey="code"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
            scroll={{ x: 600 }}
            loading={loading}
            size="middle"
          />
        </Card>
      </div>
    ),
  }));

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Card>
        <Title level={2} style={{ marginBottom: 24, textAlign: 'center' }}>
          <StockOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          指数成分股查询
        </Title>
        
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          type="card"
          style={{ marginTop: 16 }}
        />
      </Card>
    </div>
  );
}

