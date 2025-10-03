import React, { useState } from 'react';
import { Button, Input, message, Space, Tooltip } from 'antd';
import { PlusOutlined, BookOutlined } from '@ant-design/icons';
import { useAtom, useSetAtom } from 'jotai';
import {
  selectedPortfolioGroupAtom,
  addStockToPortfolioAtom
} from '../atoms/portfolioAtoms.js';
import { StockService } from '../services/stockService.js';

export default function PortfolioQuickAdd({ 
  stockCode = '', 
  showGroupSelector = false,
  buttonText = '加入自选',
  buttonType = 'default',
  size = 'small',
  onSuccess = null 
}) {
  const [selectedGroup] = useAtom(selectedPortfolioGroupAtom);
  const [inputValue, setInputValue] = useState(stockCode);
  const [loading, setLoading] = useState(false);
  
  const addStockToPortfolio = useSetAtom(addStockToPortfolioAtom);

  const handleAddStock = async () => {
    const code = inputValue.trim();
    if (!code) {
      message.warning('请输入股票代码');
      return;
    }

    setLoading(true);
    try {
      const stockInfo = await StockService.getStockInfo(code);
      await addStockToPortfolio({
        stockCode: code,
        groupName: selectedGroup,
        stockInfo
      });
      
      setInputValue('');
      message.success(`已添加 ${stockInfo?.name || code} 到 ${selectedGroup} 分组`);
      
      if (onSuccess) {
        onSuccess({ code, name: stockInfo?.name, group: selectedGroup });
      }
    } catch (error) {
      message.error(error.message || '添加失败');
    } finally {
      setLoading(false);
    }
  };

  if (showGroupSelector) {
    return (
      <Space.Compact>
        <Input
          placeholder="输入股票代码"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={handleAddStock}
          style={{ width: 150 }}
          size={size}
        />
        <Button
          type={buttonType}
          icon={<PlusOutlined />}
          onClick={handleAddStock}
          loading={loading}
          size={size}
        >
          {buttonText}
        </Button>
      </Space.Compact>
    );
  }

  return (
    <Tooltip title={`添加到 ${selectedGroup} 分组`}>
      <Button
        type={buttonType}
        icon={<BookOutlined />}
        onClick={handleAddStock}
        loading={loading}
        size={size}
      >
        {buttonText}
      </Button>
    </Tooltip>
  );
}
