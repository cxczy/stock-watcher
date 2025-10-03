# Portfolio 全局状态管理集成指南

## 概述

Portfolio 功能已经重构为全局状态管理，可以在应用的任何地方使用。所有 portfolio 相关的数据（分组、持仓、操作）都是全局可见和可操作的。

## 核心组件

### 1. PortfolioAtoms (全局状态)
- `portfolioGroupsAtom`: 分组配置
- `portfolioHoldingsAtom`: 持仓数据
- `selectedPortfolioGroupAtom`: 当前选中分组
- `currentGroupHoldingsAtom`: 当前分组的持仓
- `currentGroupConfigAtom`: 当前分组配置

### 2. PortfolioActions (操作组件)
```jsx
import PortfolioActions from './PortfolioActions.jsx';

// 完整功能
<PortfolioActions 
  showGroupSelector={true}
  showAddStock={true}
  showSearch={true}
  showGroupManagement={true}
  showImportExport={true}
/>

// 紧凑模式
<PortfolioActions compact={true} />
```

### 3. PortfolioQuickAdd (快速添加)
```jsx
import PortfolioQuickAdd from './PortfolioQuickAdd.jsx';

// 带输入框
<PortfolioQuickAdd 
  showGroupSelector={true}
  buttonText="加入自选"
  buttonType="primary"
/>

// 仅按钮（需要预设股票代码）
<PortfolioQuickAdd 
  stockCode="000001"
  showGroupSelector={false}
  buttonText="加入"
  buttonType="link"
  size="small"
  onSuccess={(result) => console.log('添加成功', result)}
/>
```

### 4. PortfolioStatus (状态显示)
```jsx
import PortfolioStatus from './PortfolioStatus.jsx';

// 显示当前分组状态
<PortfolioStatus showCurrentGroup={true} />

// 显示所有分组统计
<PortfolioStatus showAllGroups={true} />

// 紧凑模式
<PortfolioStatus compact={true} />
```

### 5. PortfolioBar (状态栏)
```jsx
import PortfolioBar from './PortfolioBar.jsx';

// 完整状态栏
<PortfolioBar 
  showStats={true}
  showQuickAdd={true}
  showNavigation={true}
/>

// 紧凑模式
<PortfolioBar compact={true} />
```

## 在表格中集成

### 在表格列中添加 portfolio 操作
```jsx
import PortfolioQuickAdd from './PortfolioQuickAdd.jsx';

const columns = [
  // ... 其他列
  {
    title: '自选股',
    key: 'portfolio',
    width: 100,
    render: (_, record) => (
      <PortfolioQuickAdd 
        stockCode={record.code}
        showGroupSelector={false}
        buttonText="加入"
        buttonType="link"
        size="small"
        onSuccess={() => message.success(`已添加 ${record.name} 到自选股`)}
      />
    )
  }
];
```

## 直接使用 Atoms

### 读取状态
```jsx
import { useAtomValue } from 'jotai';
import { 
  portfolioGroupsAtom, 
  currentGroupHoldingsAtom,
  portfolioStatsAtom 
} from '../atoms/portfolioAtoms.js';

function MyComponent() {
  const groups = useAtomValue(portfolioGroupsAtom);
  const currentHoldings = useAtomValue(currentGroupHoldingsAtom);
  const stats = useAtomValue(portfolioStatsAtom);
  
  return (
    <div>
      <p>当前分组: {Object.keys(groups)[0]}</p>
      <p>持仓数量: {currentHoldings.length}</p>
    </div>
  );
}
```

### 执行操作
```jsx
import { useSetAtom } from 'jotai';
import { 
  addStockToPortfolioAtom,
  addGroupToPortfolioAtom,
  removeStockFromPortfolioAtom 
} from '../atoms/portfolioAtoms.js';

function MyComponent() {
  const addStock = useSetAtom(addStockToPortfolioAtom);
  const addGroup = useSetAtom(addGroupToPortfolioAtom);
  const removeStock = useSetAtom(removeStockFromPortfolioAtom);
  
  const handleAddStock = async () => {
    try {
      await addStock({
        stockCode: '000001',
        groupName: '短线',
        stockInfo: { name: '平安银行' }
      });
      message.success('添加成功');
    } catch (error) {
      message.error(error.message);
    }
  };
  
  return <Button onClick={handleAddStock}>添加股票</Button>;
}
```

## 布局集成

在 Layout 组件中已经集成了 PortfolioBar，会在所有页面顶部显示 portfolio 状态和快速操作。

## 数据持久化

所有 portfolio 数据会自动保存到 localStorage，包括：
- 分组配置
- 持仓数据
- 用户设置

数据会在应用启动时自动加载。

## 使用场景

1. **技术分析选股页面**: 在筛选结果中直接添加股票到自选股
2. **股票分析页面**: 分析完成后添加到自选股
3. **任何页面**: 通过顶部状态栏快速添加股票
4. **持仓管理页面**: 完整的 portfolio 管理功能

## 注意事项

1. 所有操作都是异步的，需要处理错误情况
2. 股票代码验证会自动进行
3. 重复添加会显示警告
4. 数据会自动同步到所有使用 portfolio 状态的组件
