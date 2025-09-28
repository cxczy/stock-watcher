// 股票数据服务类
export class StockService {
  // 获取股票市场类型
  static getMarketType(code) {
    // 股票代码市场判断规则：
    // 0开头：深圳主板 (000001, 000002等)
    // 3开头：创业板 (300001, 300002等) 
    // 6开头：上海主板 (600000, 600036等)
    // 688开头：科创板 (688001, 688002等)
    // 8开头：新三板 (800001, 800002等)
    
    if (code.startsWith('0') || code.startsWith('3') || code.startsWith('8')) {
      return '0'; // 深圳市场
    } else if (code.startsWith('6')) {
      return '1'; // 上海市场
    } else {
      // 默认按上海市场处理
      return '1';
    }
  }

  // 获取K线数据URL
  static getKlineUrl(code, lmt = 58, period = 'daily') {
    const baseUrl = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
    const marketType = this.getMarketType(code);
    const secid = `${marketType}.${code}`;
    
    // 时间周期映射
    const periodMap = {
      'daily': '101',      // 日线
      'weekly': '102',     // 周线
      'monthly': '103',    // 月线
      '15min': '15',       // 15分钟
      '30min': '30',       // 30分钟
      '60min': '60',       // 60分钟
      '5min': '5'          // 5分钟
    };
    
    const klt = periodMap[period] || '101';
    
    const params = new URLSearchParams({
      secid,
      fields1: 'f1,f2,f3,f4,f5',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
      lmt: lmt.toString(),
      klt: klt,
      fqt: '1',
      end: '30000101',
      ut: 'fa5fd1943c7b386f172d6893dbfba10b'
    });
    return `${baseUrl}?${params.toString()}`;
  }

  // 解析K线数据
  static parseKlineData(response) {
    try {
      // 尝试直接解析JSON
      const data = JSON.parse(response);
      if (data.rc === 0 && data.data && data.data.klines) {
        return data.data.klines.map((kline) => {
          const [date, open, close, high, low, volume, amount, , rate] = kline.split(',');
          return {
            date,
            open: parseFloat(open),
            close: parseFloat(close),
            high: parseFloat(high),
            low: parseFloat(low),
            volume: parseInt(volume),
            amount: parseFloat(amount),
            rate: parseFloat(rate)
          };
        });
      } else {
        throw new Error('API返回数据格式错误');
      }
    } catch (error) {
      // 如果直接解析失败，尝试处理带回调函数的格式
      try {
        const start = response.indexOf('{');
        const end = response.lastIndexOf('}') + 1;
        const jsonStr = response.substring(start, end);
        const data = JSON.parse(jsonStr);
        if (data.data && data.data.klines) {
          return data.data.klines.map((kline) => {
            const [date, open, close, high, low, volume, amount, , rate] = kline.split(',');
            return {
              date,
              open: parseFloat(open),
              close: parseFloat(close),
              high: parseFloat(high),
              low: parseFloat(low),
              volume: parseInt(volume),
              amount: parseFloat(amount),
              rate: parseFloat(rate)
            };
          });
        }
      } catch (parseError) {
        console.error('解析股票数据失败:', parseError);
        throw new Error('无法解析股票数据');
      }
    }
  }

  // 获取K线数据
  static async getKlineData(code, lmt = 58, period = 'daily') {
    try {
      const url = this.getKlineUrl(code, lmt, period);
      console.log('请求URL:', url);
      console.log('时间周期:', period);

      const response = await fetch(url);
      console.log('响应状态:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      console.log('响应数据长度:', text.length);

      const result = this.parseKlineData(text);
      console.log('解析成功，数据条数:', result.length);
      return result;
    } catch (error) {
      console.error('获取股票数据失败:', error);
      throw error;
    }
  }

  // 获取股票基本信息
  static async getStockInfo(code) {
    try {
      const marketType = this.getMarketType(code);
      const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${marketType}.${code}&fields1=f1,f2,f3,f4&fields2=f57,f58,f107,f116,f60,f152,f45,f52,f50,f48,f167,f47,f71,f161,f49,f530`;
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('股票信息API响应:', data);
      
      if (data.rc === 0 && data.data) {
        return {
          name: data.data.f58, // 股票名称字段
          code: data.data.f57, // 股票代码字段
          market: data.data.f60, // 市场字段
          price: data.data.f2, // 当前价格
          change: data.data.f4, // 涨跌幅
          ...data.data
        };
      } else {
        throw new Error('API返回数据格式错误');
      }
    } catch (error) {
      console.error('获取股票信息失败:', error);
      throw error;
    }
  }

  // 获取市场名称
  static getMarketName(code) {
    if (code.startsWith('000')) {
      return '深圳主板';
    } else if (code.startsWith('002')) {
      return '深圳中小板';
    } else if (code.startsWith('300')) {
      return '创业板';
    } else if (code.startsWith('600') || code.startsWith('601') || code.startsWith('603') || code.startsWith('605')) {
      return '上海主板';
    } else if (code.startsWith('688')) {
      return '科创板';
    } else if (code.startsWith('8')) {
      return '新三板';
    } else {
      return '未知市场';
    }
  }
}
