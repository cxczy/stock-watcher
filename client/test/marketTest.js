// 市场判断测试
import { StockService } from '../services/stockService.js';

// 测试股票代码
const testStocks = [
  { code: '000001', expected: '深圳主板' },
  { code: '000002', expected: '深圳主板' },
  { code: '002415', expected: '深圳中小板' },
  { code: '300001', expected: '创业板' },
  { code: '600000', expected: '上海主板' },
  { code: '600036', expected: '上海主板' },
  { code: '600519', expected: '上海主板' },
  { code: '688001', expected: '科创板' },
  { code: '800001', expected: '新三板' }
];

console.log('🧪 开始测试股票市场判断...\n');

testStocks.forEach(stock => {
  const marketType = StockService.getMarketType(stock.code);
  const marketName = StockService.getMarketName(stock.code);
  const secid = `${marketType}.${stock.code}`;
  
  console.log(`股票代码: ${stock.code}`);
  console.log(`市场类型: ${marketType} (${marketType === '0' ? '深圳' : '上海'})`);
  console.log(`市场名称: ${marketName}`);
  console.log(`secid: ${secid}`);
  console.log(`期望结果: ${stock.expected}`);
  console.log(`判断结果: ${marketName === stock.expected ? '✅ 正确' : '❌ 错误'}`);
  console.log('---');
});

console.log('🎯 测试完成！');
