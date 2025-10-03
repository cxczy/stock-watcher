import React from 'react';
import { Card, Statistic, Row, Col, Tag, Space, Tooltip } from 'antd';
import { useAtomValue } from 'jotai';
import {
  portfolioStatsAtom,
  portfolioGroupsAtom,
  selectedPortfolioGroupAtom,
  currentGroupHoldingsAtom,
  currentGroupConfigAtom
} from '../atoms/portfolioAtoms.js';

export default function PortfolioStatus({ 
  showAllGroups = false, 
  showCurrentGroup = true,
  compact = false 
}) {
  const portfolioStats = useAtomValue(portfolioStatsAtom);
  const groups = useAtomValue(portfolioGroupsAtom);
  const selectedGroup = useAtomValue(selectedPortfolioGroupAtom);
  const currentHoldings = useAtomValue(currentGroupHoldingsAtom);
  const currentConfig = useAtomValue(currentGroupConfigAtom);

  if (compact) {
    return (
      <Space>
        <Tag color="blue">{selectedGroup}</Tag>
        <span>{currentHoldings.length} 只股票</span>
        {currentConfig?.showRating && (
          <Tag color="green">评级模式</Tag>
        )}
      </Space>
    );
  }

  if (showAllGroups) {
    return (
      <Row gutter={16}>
        {Object.keys(portfolioStats).map(groupName => (
          <Col span={8} key={groupName}>
            <Card size="small">
              <Statistic
                title={groupName}
                value={portfolioStats[groupName].totalStocks}
                suffix="只股票"
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                总价值: {portfolioStats[groupName].totalValue.toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                平均涨跌: {portfolioStats[groupName].avgChange.toFixed(2)}%
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  if (showCurrentGroup) {
    const currentStats = portfolioStats[selectedGroup] || { totalStocks: 0, totalValue: 0, avgChange: 0 };
    
    return (
      <Card size="small" title={`${selectedGroup} 分组`}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="股票数量"
              value={currentStats.totalStocks}
              suffix="只"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="总价值"
              value={currentStats.totalValue}
              precision={2}
              suffix="元"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="平均涨跌"
              value={currentStats.avgChange}
              precision={2}
              suffix="%"
              valueStyle={{ 
                color: currentStats.avgChange >= 0 ? '#3f8600' : '#cf1322' 
              }}
            />
          </Col>
        </Row>
        
        {currentConfig && (
          <div style={{ marginTop: 16, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <div>时间周期: {currentConfig.timeframe}</div>
              <div>技术指标: {currentConfig.indicators.join(', ') || '无'}</div>
              <div>显示评级: {currentConfig.showRating ? '是' : '否'}</div>
            </div>
          </div>
        )}
      </Card>
    );
  }

  return null;
}
