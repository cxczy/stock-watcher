import React, { useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  message, 
  Spin,
  Tag,
  Space,
  Statistic,
  Row,
  Col,
  Popconfirm,
  Tooltip,
  Alert,
  Tabs
} from 'antd';
import { 
  DeleteOutlined, 
  ReloadOutlined,
  LineChartOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { SimpleIndicators } from '../utils/simpleIndicators.js';
import PortfolioActions from './PortfolioActions.jsx';
import PortfolioStatus from './PortfolioStatus.jsx';
import {
  portfolioGroupsAtom,
  selectedPortfolioGroupAtom,
  currentGroupHoldingsAtom,
  currentGroupConfigAtom,
  portfolioLoadingAtom,
  initializePortfolioAtom,
  removeStockFromPortfolioAtom,
  removeGroupFromPortfolioAtom,
  updateGroupInPortfolioAtom
} from '../atoms/portfolioAtoms.js';

export default function PortfolioHoldings() {
  const [groups] = useAtom(portfolioGroupsAtom);
  const [selectedGroup, setSelectedGroup] = useAtom(selectedPortfolioGroupAtom);
  const currentHoldings = useAtomValue(currentGroupHoldingsAtom);
  const currentConfig = useAtomValue(currentGroupConfigAtom);
  const loading = useAtomValue(portfolioLoadingAtom);
  
  const initializePortfolio = useSetAtom(initializePortfolioAtom);
  const removeStock = useSetAtom(removeStockFromPortfolioAtom);
  const removeGroup = useSetAtom(removeGroupFromPortfolioAtom);
  const updateGroup = useSetAtom(updateGroupInPortfolioAtom);

  // 初始化数据
  useEffect(() => {
    initializePortfolio();
  }, [initializePortfolio]);

  // 删除股票
  const handleRemoveStock = (stockCode) => {
    try {
      removeStock({ stockCode, groupName: selectedGroup });
      message.success(`已删除股票 ${stockCode}`);
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 删除分组
  const handleDeleteGroup = (groupName) => {
    try {
      removeGroup(groupName);
      // 切换到第一个分组
      const remainingGroups = Object.keys(groups).filter(name => name !== groupName);
      if (remainingGroups.length > 0) {
        setSelectedGroup(remainingGroups[0]);
      }
      message.success(`已删除分组 ${groupName}`);
    } catch (error) {
      message.error(error.message || '删除失败');
    }
  };

  // 批量分析
  const handleBatchAnalyze = async () => {
    if (currentHoldings.length === 0) {
      message.warning('当前分组没有股票');
      return;
    }

    try {
      // 这里可以添加批量分析的逻辑
      message.info('批量分析功能开发中...');
    } catch (error) {
      message.error('分析失败');
    }
  };

  // 分析单个股票
  const handleAnalyzeStock = async (stock) => {
    try {
      // 这里可以添加单个股票分析的逻辑
      message.info(`分析 ${stock.name} 功能开发中...`);
    } catch (error) {
      message.error('分析失败');
    }
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
          <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
            {code}
          </span>
        ),
      },
      {
        title: '股票名称',
        dataIndex: 'name',
        key: 'name',
        width: 120,
        ellipsis: true,
        render: (name, record) => (
          <Tooltip title={`${name} (${record.code})`}>
            <span>{name}</span>
          </Tooltip>
        ),
      },
      {
        title: '当前价格',
        dataIndex: 'price',
        key: 'price',
        width: 100,
        align: 'right',
        render: (price) => price ? `¥${price.toFixed(2)}` : '-',
      },
      {
        title: '涨跌幅',
        dataIndex: 'change',
        key: 'change',
        width: 100,
        align: 'right',
        render: (change) => {
          if (change === null || change === undefined) return '-';
          const isPositive = change >= 0;
          return (
            <span style={{ color: isPositive ? '#52c41a' : '#f50' }}>
              {isPositive ? '+' : ''}{change.toFixed(2)}%
            </span>
          );
        },
      },
      {
        title: '市场',
        dataIndex: 'market',
        key: 'market',
        width: 80,
        render: (market) => (
          <Tag color={market === '深市' ? 'blue' : 'red'}>
            {market}
          </Tag>
        ),
      },
      {
        title: '添加时间',
        dataIndex: 'addedTime',
        key: 'addedTime',
        width: 120,
        render: (time) => time || '-',
      },
    ];

    // 如果当前分组显示评级，添加评级列
    if (currentConfig?.showRating) {
      baseColumns.push({
        title: '评级',
        dataIndex: 'rating',
        key: 'rating',
        width: 100,
        align: 'center',
        render: (rating) => {
          if (!rating) return <Tag>未分析</Tag>;
          
          const colorMap = {
            '买入': 'green',
            '卖出': 'red',
            '持有': 'blue'
          };
          
          return (
            <Tag color={colorMap[rating] || 'default'}>
              {rating}
            </Tag>
          );
        },
      });
    }

    // 添加操作列
    baseColumns.push({
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="分析股票">
            <Button
              type="link"
              size="small"
              icon={<LineChartOutlined />}
              onClick={() => handleAnalyzeStock(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这只股票吗？"
            onConfirm={() => handleRemoveStock(record.code)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    });

    return baseColumns;
  };

  // 计算当前分组的统计信息
  const getGroupStats = () => {
    const totalStocks = currentHoldings.length;
    const buyCount = currentHoldings.filter(stock => stock.rating === '买入').length;
    const sellCount = currentHoldings.filter(stock => stock.rating === '卖出').length;
    const holdCount = currentHoldings.filter(stock => stock.rating === '持有').length;
    
    return {
      totalStocks,
      buyCount,
      sellCount,
      holdCount
    };
  };

  const groupStats = getGroupStats();

  return (
    <div className="p-1">
      <Card title="持仓股管理" className="mb-1">
        {/* 分组管理 */}
        <Row gutter={16} className="mb-1">
          <Col span={12}>
            <Tabs
              activeKey={selectedGroup}
              onChange={setSelectedGroup}
              type="card"
              size="large"
              style={{ marginBottom: 0 }}
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
                        ({currentHoldings.length})
                      </span>
                    </span>
                  } 
                  key={groupName}
                />
              ))}
            </Tabs>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Space>
              <Popconfirm
                title="确定要删除这个分组吗？"
                onConfirm={() => handleDeleteGroup(selectedGroup)}
                okText="确定"
                cancelText="取消"
                disabled={Object.keys(groups).length <= 1}
              >
                <Button 
                  icon={<DeleteOutlined />}
                  danger
                  disabled={Object.keys(groups).length <= 1}
                >
                  删除分组
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>

        {/* 操作按钮 */}
        <Row gutter={16} className="mb-1">
          <Col span={24}>
            <PortfolioActions 
              showGroupSelector={false}
              showAddStock={true}
              showSearch={true}
              showGroupManagement={true}
              showImportExport={true}
            />
          </Col>
        </Row>

        {/* 统计信息 */}
        {currentHoldings.length > 0 && (
          <Row gutter={16} className="mb-1">
            <Col span={6}>
              <Statistic
                title="总股票数"
                value={groupStats.totalStocks}
                prefix={<FolderOutlined />}
              />
            </Col>
            {currentConfig?.showRating && (
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

        {/* 分组状态 */}
        <PortfolioStatus showCurrentGroup={true} />
      </Card>

      {/* 股票列表 */}
      <Card title="股票列表">
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
    </div>
  );
}