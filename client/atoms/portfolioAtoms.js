import { atom } from 'jotai';
import { StockService } from '../services/stockService.js';

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

// 基础状态 atoms
export const portfolioGroupsAtom = atom(DEFAULT_GROUPS);
export const portfolioHoldingsAtom = atom({});
export const selectedPortfolioGroupAtom = atom('短线');
export const portfolioLoadingAtom = atom(false);

// 搜索相关 atoms
export const portfolioSearchKeywordAtom = atom('');
export const portfolioSearchResultsAtom = atom([]);
export const portfolioSearchLoadingAtom = atom(false);

// 模态框状态 atoms
export const addGroupModalVisibleAtom = atom(false);
export const editGroupModalVisibleAtom = atom(false);
export const importModalVisibleAtom = atom(false);
export const searchModalVisibleAtom = atom(false);

// 编辑状态 atoms
export const editingGroupAtom = atom(null);
export const newGroupNameAtom = atom('');
export const newGroupDescriptionAtom = atom('');
export const importDataAtom = atom('');

// 持久化存储 atoms
export const portfolioGroupsWithPersistenceAtom = atom(
  (get) => get(portfolioGroupsAtom),
  (get, set, newGroups) => {
    set(portfolioGroupsAtom, newGroups);
    localStorage.setItem('portfolioGroups', JSON.stringify(newGroups));
  }
);

export const portfolioHoldingsWithPersistenceAtom = atom(
  (get) => get(portfolioHoldingsAtom),
  (get, set, newHoldings) => {
    set(portfolioHoldingsAtom, newHoldings);
    localStorage.setItem('portfolioHoldings', JSON.stringify(newHoldings));
  }
);

// 初始化 atoms - 从 localStorage 加载数据
export const initializePortfolioAtom = atom(
  null,
  (get, set) => {
    // 加载分组数据
    const savedGroups = localStorage.getItem('portfolioGroups');
    if (savedGroups) {
      try {
        const groups = JSON.parse(savedGroups);
        set(portfolioGroupsAtom, groups);
      } catch (error) {
        console.error('加载分组数据失败:', error);
      }
    }

    // 加载持仓数据
    const savedHoldings = localStorage.getItem('portfolioHoldings');
    if (savedHoldings) {
      try {
        const holdings = JSON.parse(savedHoldings);
        set(portfolioHoldingsAtom, holdings);
      } catch (error) {
        console.error('加载持仓数据失败:', error);
      }
    }
  }
);

// 当前选中分组的持仓数据
export const currentGroupHoldingsAtom = atom(
  (get) => {
    const selectedGroup = get(selectedPortfolioGroupAtom);
    const holdings = get(portfolioHoldingsAtom);
    return holdings[selectedGroup] || [];
  }
);

// 当前选中分组的配置
export const currentGroupConfigAtom = atom(
  (get) => {
    const selectedGroup = get(selectedPortfolioGroupAtom);
    const groups = get(portfolioGroupsAtom);
    return groups[selectedGroup] || null;
  }
);

// 所有分组的统计信息
export const portfolioStatsAtom = atom(
  (get) => {
    const holdings = get(portfolioHoldingsAtom);
    const groups = get(portfolioGroupsAtom);
    
    const stats = {};
    Object.keys(groups).forEach(groupName => {
      const groupHoldings = holdings[groupName] || [];
      stats[groupName] = {
        totalStocks: groupHoldings.length,
        totalValue: groupHoldings.reduce((sum, stock) => sum + (stock.price || 0), 0),
        avgChange: groupHoldings.length > 0 
          ? groupHoldings.reduce((sum, stock) => sum + (stock.change || 0), 0) / groupHoldings.length 
          : 0
      };
    });
    
    return stats;
  }
);

// 操作 atoms
export const addStockToPortfolioAtom = atom(
  null,
  async (get, set, { stockCode, groupName, stockInfo }) => {
    set(portfolioLoadingAtom, true);
    
    try {
      // 验证股票代码
      const klineData = await StockService.getKlineData(stockCode, 10);
      if (klineData.length === 0) {
        throw new Error('无效的股票代码');
      }

      const newStock = {
        code: stockCode,
        name: stockInfo?.name || `股票${stockCode}`,
        price: klineData[klineData.length - 1].close,
        change: klineData[klineData.length - 1].rate,
        market: StockService.getMarketName(stockCode),
        addedTime: new Date().toLocaleString(),
        rating: null,
        lastAnalysis: null
      };

      const currentHoldings = get(portfolioHoldingsAtom);
      const groupHoldings = currentHoldings[groupName] || [];
      
      // 检查是否已存在
      if (groupHoldings.some(stock => stock.code === stockCode)) {
        throw new Error('该股票已在当前分组中');
      }

      const newHoldings = {
        ...currentHoldings,
        [groupName]: [...groupHoldings, newStock]
      };

      set(portfolioHoldingsWithPersistenceAtom, newHoldings);
      return { success: true, stock: newStock };
    } catch (error) {
      console.error('添加股票失败:', error);
      throw error;
    } finally {
      set(portfolioLoadingAtom, false);
    }
  }
);

export const removeStockFromPortfolioAtom = atom(
  null,
  (get, set, { stockCode, groupName }) => {
    const currentHoldings = get(portfolioHoldingsAtom);
    const groupHoldings = currentHoldings[groupName] || [];
    
    const newHoldings = {
      ...currentHoldings,
      [groupName]: groupHoldings.filter(stock => stock.code !== stockCode)
    };

    set(portfolioHoldingsWithPersistenceAtom, newHoldings);
  }
);

export const addGroupToPortfolioAtom = atom(
  null,
  (get, set, { groupName, description, timeframe = 'daily', indicators = [], showRating = true }) => {
    const currentGroups = get(portfolioGroupsAtom);
    const currentHoldings = get(portfolioHoldingsAtom);
    
    if (currentGroups[groupName]) {
      throw new Error('分组名称已存在');
    }

    const newGroup = {
      name: groupName,
      description,
      timeframe,
      indicators,
      showRating
    };

    const newGroups = { ...currentGroups, [groupName]: newGroup };
    const newHoldings = { ...currentHoldings, [groupName]: [] };

    set(portfolioGroupsWithPersistenceAtom, newGroups);
    set(portfolioHoldingsWithPersistenceAtom, newHoldings);
  }
);

export const removeGroupFromPortfolioAtom = atom(
  null,
  (get, set, groupName) => {
    const currentGroups = get(portfolioGroupsAtom);
    const currentHoldings = get(portfolioHoldingsAtom);
    
    if (Object.keys(currentGroups).length <= 1) {
      throw new Error('至少需要保留一个分组');
    }

    const newGroups = { ...currentGroups };
    const newHoldings = { ...currentHoldings };
    delete newGroups[groupName];
    delete newHoldings[groupName];

    set(portfolioGroupsWithPersistenceAtom, newGroups);
    set(portfolioHoldingsWithPersistenceAtom, newHoldings);
  }
);

export const updateGroupInPortfolioAtom = atom(
  null,
  (get, set, { groupName, updates }) => {
    const currentGroups = get(portfolioGroupsAtom);
    
    if (!currentGroups[groupName]) {
      throw new Error('分组不存在');
    }

    const newGroups = {
      ...currentGroups,
      [groupName]: { ...currentGroups[groupName], ...updates }
    };

    set(portfolioGroupsWithPersistenceAtom, newGroups);
  }
);

export const searchStocksAtom = atom(
  null,
  async (get, set, keyword) => {
    set(portfolioSearchLoadingAtom, true);
    set(portfolioSearchKeywordAtom, keyword);
    
    try {
      const results = await StockService.searchStocks(keyword.trim(), 1, 20);
      set(portfolioSearchResultsAtom, results);
      return results;
    } catch (error) {
      console.error('搜索股票失败:', error);
      throw error;
    } finally {
      set(portfolioSearchLoadingAtom, false);
    }
  }
);

export const exportPortfolioDataAtom = atom(
  null,
  (get, set) => {
    const groups = get(portfolioGroupsAtom);
    const holdings = get(portfolioHoldingsAtom);
    
    const exportData = {
      groups,
      holdings,
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
    
    return exportData;
  }
);

export const importPortfolioDataAtom = atom(
  null,
  (get, set, importData) => {
    try {
      const importedData = JSON.parse(importData);
      
      if (!importedData.groups || !importedData.holdings) {
        throw new Error('数据格式不正确');
      }

      // 合并数据
      const currentGroups = get(portfolioGroupsAtom);
      const currentHoldings = get(portfolioHoldingsAtom);
      
      const newGroups = { ...currentGroups, ...importedData.groups };
      const newHoldings = { ...currentHoldings, ...importedData.holdings };

      set(portfolioGroupsWithPersistenceAtom, newGroups);
      set(portfolioHoldingsWithPersistenceAtom, newHoldings);
      
      return { success: true };
    } catch (error) {
      console.error('导入数据失败:', error);
      throw error;
    }
  }
);
