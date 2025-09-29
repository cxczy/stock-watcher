import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button } from 'antd';
import { 
  DatabaseOutlined, 
  SearchOutlined, 
  MonitorOutlined, 
  FolderOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FundOutlined
} from '@ant-design/icons';

const { Header, Content, Sider } = AntLayout;

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: '/technical-screener',
      icon: <SearchOutlined />,
      label: '技术分析选股',
    },
    {
      key: '/portfolio-holdings',
      icon: <FolderOutlined />,
      label: '持仓股管理',
    },
    {
      key: '/backtest-analysis',
      icon: <BarChartOutlined />,
      label: '回归分析',
    },
    {
      key: '/stock-analysis',
      icon: <SearchOutlined />,
      label: '股票分析',
    },
    {
      key: '/portfolio-builder',
      icon: <FundOutlined />,
      label: '投资组合构建',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={200}
        collapsedWidth={80}
        style={{ background: '#fff' }}
      >
        <div style={{ 
          height: 32, 
          margin: 16, 
          background: 'rgba(0, 0, 0, 0.06)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          color: '#1890ff',
          fontSize: collapsed ? '12px' : '14px',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}>
          {collapsed ? '' : ''}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
          inlineCollapsed={collapsed}
        />
      </Sider>
      <AntLayout>
        <Header style={{ 
          padding: 0, 
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 24,
          paddingRight: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 64, height: 64 }}
            />
            <h2 style={{ margin: 0, color: '#1890ff', marginLeft: 16 }}>
              {menuItems.find(item => item.key === location.pathname)?.label || '股票分析系统'}
            </h2>
          </div>
        </Header>
        <Content style={{ 
          margin: 0, 
          padding: 0, 
          background: '#f5f5f5',
          minHeight: 'calc(100vh - 64px)'
        }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}