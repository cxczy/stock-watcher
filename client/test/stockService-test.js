// 测试股票服务
import { StockService } from '../services/stockService.js';

async function testStockService() {
  console.log('开始测试股票服务...');
  
  try {
    // 测试600563（法拉电子）
    console.log('测试股票代码: 600563');
    const klineData = await StockService.getKlineData('600563', 10);
    
    console.log('✅ 测试成功！');
    console.log('数据条数:', klineData.length);
    console.log('最新数据:', klineData[klineData.length - 1]);
    
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return false;
  }
}

// 运行测试
testStockService();
