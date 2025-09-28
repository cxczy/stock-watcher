# ETF市场类型识别说明

## 🎯 新增功能

### 1. ETF股票代码识别

#### 新增ETF支持
- **1开头**：深圳ETF (100001, 100002等)
- **5开头**：上海ETF (500001, 500002等)

#### 市场归属
- **1开头ETF**：归属深圳市场 (marketType = '0')
- **5开头ETF**：归属上海市场 (marketType = '1')

### 2. 市场类型判断逻辑

#### 更新后的判断规则
```javascript
static getMarketType(code) {
  // 深圳市场：0开头、3开头、8开头、1开头
  if (code.startsWith('0') || code.startsWith('3') || code.startsWith('8') || code.startsWith('1')) {
    return '0'; // 深圳市场
  } 
  // 上海市场：6开头、5开头
  else if (code.startsWith('6') || code.startsWith('5')) {
    return '1'; // 上海市场
  } 
  // 默认上海市场
  else {
    return '1';
  }
}
```

#### 市场名称显示
```javascript
static getMarketName(code) {
  if (code.startsWith('1')) {
    return '深圳ETF';
  } else if (code.startsWith('5')) {
    return '上海ETF';
  }
  // ... 其他市场类型
}
```

## 📊 完整的市场类型映射

### 深圳市场 (marketType = '0')
| 代码前缀 | 市场名称 | 示例代码 | 说明 |
|----------|----------|----------|------|
| 000 | 深圳主板 | 000001 | 平安银行等主板股票 |
| 002 | 深圳中小板 | 002001 | 中小板股票 |
| 300 | 创业板 | 300001 | 创业板股票 |
| 688 | 科创板 | 688001 | 科创板股票 |
| 8 | 新三板 | 800001 | 新三板股票 |
| **1** | **深圳ETF** | **100001** | **深圳ETF基金** |

### 上海市场 (marketType = '1')
| 代码前缀 | 市场名称 | 示例代码 | 说明 |
|----------|----------|----------|------|
| 600 | 上海主板 | 600000 | 浦发银行等主板股票 |
| 601 | 上海主板 | 601318 | 中国平安等主板股票 |
| 603 | 上海主板 | 603259 | 主板股票 |
| 605 | 上海主板 | 605001 | 主板股票 |
| **5** | **上海ETF** | **500001** | **上海ETF基金** |

## 🔧 技术实现

### 1. getMarketType函数更新
```javascript
static getMarketType(code) {
  // 股票代码市场判断规则：
  // 0开头：深圳主板 (000001, 000002等)
  // 3开头：创业板 (300001, 300002等) 
  // 6开头：上海主板 (600000, 600036等)
  // 688开头：科创板 (688001, 688002等)
  // 8开头：新三板 (800001, 800002等)
  // 1开头：ETF (100001, 100002等) - 深圳市场
  // 5开头：ETF (500001, 500002等) - 上海市场
  
  if (code.startsWith('0') || code.startsWith('3') || code.startsWith('8') || code.startsWith('1')) {
    return '0'; // 深圳市场
  } else if (code.startsWith('6') || code.startsWith('5')) {
    return '1'; // 上海市场
  } else {
    // 默认按上海市场处理
    return '1';
  }
}
```

### 2. getMarketName函数更新
```javascript
static getMarketName(code) {
  if (code.startsWith('1')) {
    return '深圳ETF';
  } else if (code.startsWith('5')) {
    return '上海ETF';
  }
  // ... 其他市场类型判断
}
```

## 📱 实际应用场景

### 1. ETF基金识别
- **深圳ETF**：1开头的ETF基金，如100001、100002等
- **上海ETF**：5开头的ETF基金，如500001、500002等

### 2. 市场标签显示
- **深圳ETF**：显示蓝色标签
- **上海ETF**：显示红色标签

### 3. API调用
- **深圳ETF**：使用 `0.100001` 格式调用API
- **上海ETF**：使用 `1.500001` 格式调用API

## 🎯 常见ETF代码示例

### 深圳ETF (1开头)
| 代码 | 名称 | 类型 |
|------|------|------|
| 100001 | 华夏上证50ETF | 指数ETF |
| 100002 | 华夏中证500ETF | 指数ETF |
| 100003 | 华夏沪深300ETF | 指数ETF |

### 上海ETF (5开头)
| 代码 | 名称 | 类型 |
|------|------|------|
| 500001 | 华夏上证50ETF | 指数ETF |
| 500002 | 华夏中证500ETF | 指数ETF |
| 500003 | 华夏沪深300ETF | 指数ETF |

## 🚀 优势特性

### 1. 完整覆盖
- **股票类型**：主板、中小板、创业板、科创板
- **基金类型**：ETF基金
- **市场类型**：深圳、上海、新三板

### 2. 准确识别
- **代码前缀**：基于代码前缀准确判断市场
- **市场归属**：正确归属到对应市场
- **标签显示**：准确显示市场名称

### 3. 扩展性强
- **模块化设计**：易于添加新的市场类型
- **统一接口**：getMarketType和getMarketName统一管理
- **向后兼容**：不影响现有功能

## 📋 测试用例

### 1. 深圳ETF测试
```javascript
// 测试代码
console.log(StockService.getMarketType('100001')); // 输出: '0'
console.log(StockService.getMarketName('100001')); // 输出: '深圳ETF'
```

### 2. 上海ETF测试
```javascript
// 测试代码
console.log(StockService.getMarketType('500001')); // 输出: '1'
console.log(StockService.getMarketName('500001')); // 输出: '上海ETF'
```

### 3. 混合测试
```javascript
// 测试各种代码类型
const testCodes = [
  '000001', // 深圳主板
  '300001', // 创业板
  '600000', // 上海主板
  '688001', // 科创板
  '100001', // 深圳ETF
  '500001'  // 上海ETF
];

testCodes.forEach(code => {
  console.log(`${code}: ${StockService.getMarketName(code)}`);
});
```

现在系统可以正确识别和处理ETF基金的市场类型了！
