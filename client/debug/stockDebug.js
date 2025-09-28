// 股票数据调试工具
import { StockService } from '../services/stockService.js';

export class StockDebug {
  static async debugStockAPI(code = '600563') {
    console.log('🔍 开始调试股票API...');
    console.log('股票代码:', code);
    
    try {
      // 1. 测试URL构建
      const url = StockService.getKlineUrl(code, 10);
      console.log('📡 构建的URL:', url);
      
      // 2. 测试网络请求
      console.log('🌐 发送网络请求...');
      const response = await fetch(url);
      console.log('📊 响应状态:', response.status, response.statusText);
      console.log('📋 响应头:', Object.fromEntries(response.headers.entries()));
      
      // 3. 获取响应文本
      const text = await response.text();
      console.log('📄 响应数据长度:', text.length);
      console.log('📄 响应数据前200字符:', text.substring(0, 200));
      
      // 4. 尝试解析JSON
      try {
        const jsonData = JSON.parse(text);
        console.log('✅ JSON解析成功');
        console.log('📈 返回码:', jsonData.rc);
        console.log('📊 数据字段:', Object.keys(jsonData));
        
        if (jsonData.data) {
          console.log('📊 股票信息:', {
            code: jsonData.data.code,
            name: jsonData.data.name,
            klinesCount: jsonData.data.klines?.length || 0
          });
          
          if (jsonData.data.klines && jsonData.data.klines.length > 0) {
            console.log('📈 最新K线数据:', jsonData.data.klines[jsonData.data.klines.length - 1]);
          }
        }
        
        return jsonData;
      } catch (parseError) {
        console.error('❌ JSON解析失败:', parseError);
        console.log('📄 原始数据:', text);
        throw parseError;
      }
      
    } catch (error) {
      console.error('❌ 调试过程中出错:', error);
      throw error;
    }
  }
  
  static async testStockService(code = '600563') {
    console.log('🧪 测试股票服务...');
    
    try {
      const result = await StockService.getKlineData(code, 10);
      console.log('✅ 股票服务测试成功');
      console.log('📊 返回数据条数:', result.length);
      console.log('📈 最新数据:', result[result.length - 1]);
      return result;
    } catch (error) {
      console.error('❌ 股票服务测试失败:', error);
      throw error;
    }
  }
}

// 如果在浏览器环境中，将调试工具挂载到window对象
if (typeof window !== 'undefined') {
  window.StockDebug = StockDebug;
  console.log('🔧 调试工具已挂载到 window.StockDebug');
}
