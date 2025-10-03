// 股票搜索功能测试
import { StockService } from '../services/stockService.js';

// 测试股票搜索功能
async function testStockSearch() {
  try {
    console.log('开始测试股票搜索功能...');
    
    // 测试搜索"我"字相关的股票
    console.log('🔍 测试搜索"我"字相关股票...');
    const results = await StockService.searchStocks('我', 1, 10);
    console.log('搜索结果:', results);
    
    // 测试获取标签列表
    console.log('🏷️ 测试获取股票标签列表...');
    const labels = await StockService.getStockLabels();
    console.log('股票标签列表:', labels);
    
    // 测试搜索特定股票代码
    console.log('📊 测试搜索特定股票代码...');
    const codeResults = await StockService.searchStocks('000001', 1, 5);
    console.log('代码搜索结果:', codeResults);
    
    // 测试搜索股票名称
    console.log('🏦 测试搜索股票名称...');
    const nameResults = await StockService.searchStocks('平安银行', 1, 5);
    console.log('名称搜索结果:', nameResults);
    
    console.log('✅ 股票搜索功能测试完成！');
  } catch (error) {
    console.error('❌ 股票搜索测试失败:', error);
  }
}

// 测试JSONP请求功能
async function testJsonpRequest() {
  try {
    console.log('开始测试JSONP请求功能...');
    
    // 测试JSONP请求
    const url = StockService.getSearchUrl('测试', 1, 5);
    console.log('测试URL:', url);
    
    const data = await StockService.jsonpRequest(url);
    console.log('JSONP响应数据:', data);
    
    console.log('✅ JSONP请求测试完成！');
  } catch (error) {
    console.error('❌ JSONP请求测试失败:', error);
  }
}

// 如果是在浏览器环境中运行
if (typeof window !== 'undefined') {
  window.testStockSearch = testStockSearch;
  window.testJsonpRequest = testJsonpRequest;
  console.log('股票搜索测试函数已加载，可以在控制台运行以下函数进行测试：');
  console.log('- testStockSearch() - 测试完整搜索功能');
  console.log('- testJsonpRequest() - 测试JSONP请求功能');
}

export { testStockSearch, testJsonpRequest };

