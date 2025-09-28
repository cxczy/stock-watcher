// 简单的股票服务测试
import { StockService } from '../services/stockService.js';

// 测试股票服务
async function testStockService() {
  console.log('开始测试股票服务...');
  
  try {
    // 测试获取K线数据
    const testCode = '000001'; // 平安银行
    console.log(`测试获取股票 ${testCode} 的K线数据...`);
    
    const klineData = await StockService.getKlineData(testCode, 10);
    console.log('K线数据获取成功:', klineData.length, '条记录');
    console.log('最新数据:', klineData[klineData.length - 1]);
    
    return true;
  } catch (error) {
    console.error('测试失败:', error.message);
    return false;
  }
}

// 运行测试
testStockService().then(success => {
  if (success) {
    console.log('✅ 股票服务测试通过');
  } else {
    console.log('❌ 股票服务测试失败');
  }
});
