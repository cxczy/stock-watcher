import React from 'react';
import { Card, Space, Tag, Button, Dropdown, Menu, Badge } from 'antd';
import { 
  BookOutlined, 
  FolderOutlined, 
  PlusOutlined,
  LineChartOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router-dom';
import {
  portfolioStatsAtom,
  selectedPortfolioGroupAtom,
  currentGroupHoldingsAtom,
  currentGroupConfigAtom
} from '../atoms/portfolioAtoms.js';
import PortfolioQuickAdd from './PortfolioQuickAdd.jsx';

export default function PortfolioBar({ 
  showStats = true,
  showQuickAdd = true,
  showNavigation = true,
  compact = false 
}) {
  const navigate = useNavigate();
  const portfolioStats = useAtomValue(portfolioStatsAtom);
  const selectedGroup = useAtomValue(selectedPortfolioGroupAtom);
  const currentHoldings = useAtomValue(currentGroupHoldingsAtom);
  const currentConfig = useAtomValue(currentGroupConfigAtom);

  const totalStocks = Object.values(portfolioStats).reduce((sum, stats) => sum + stats.totalStocks, 0);
  const currentGroupStats = portfolioStats[selectedGroup] || { totalStocks: 0 };

  const menuItems = [
    {
      key: 'portfolio',
      label: '持仓管理',
      icon: <BookOutlined />,
      onClick: () => navigate('/portfolio-holdings')
    },
    {
      key: 'analysis',
      label: '股票分析',
      icon: <LineChartOutlined />,
      onClick: () => navigate('/stock-analysis')
    },
    {
      type: 'divider'
    },
    {
      key: 'settings',
      label: '设置',
      icon: <SettingOutlined />,
      onClick: () => navigate('/portfolio-holdings')
    }
  ];

  const menu = <Menu items={menuItems} />;

  if (compact) {
    return (
      <Space size="small">
        <Badge count={totalStocks} size="small">
          <Button 
            type="text" 
            icon={<BookOutlined />}
            onClick={() => navigate('/portfolio-holdings')}
          >
            自选股
          </Button>
        </Badge>
        <Tag color="blue">{selectedGroup}</Tag>
        {showQuickAdd && (
          <PortfolioQuickAdd 
            showGroupSelector={false}
            buttonText="+"
            buttonType="text"
            size="small"
          />
        )}
      </Space>
    );
  }

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space wrap align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Dropdown overlay={menu} trigger={['click']}>
            <Button icon={<BookOutlined />}>
              自选股管理
            </Button>
          </Dropdown>
          
          <Tag color="blue" icon={<FolderOutlined />}>
            {selectedGroup} ({currentGroupStats.totalStocks})
          </Tag>
          
          {showStats && (
            <Space size="small">
              <span>总计: {totalStocks} 只股票</span>
              {currentConfig?.showRating && (
                <Tag color="green">评级模式</Tag>
              )}
            </Space>
          )}
        </Space>

        <Space>
          {showQuickAdd && (
            <PortfolioQuickAdd 
              showGroupSelector={true}
              buttonText="快速添加"
              buttonType="primary"
            />
          )}
          
          {showNavigation && (
            <Button 
              icon={<LineChartOutlined />}
              onClick={() => navigate('/stock-analysis')}
            >
              分析股票
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
}
