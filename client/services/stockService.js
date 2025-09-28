// 股票数据服务类
export class StockService {
  // 获取K线数据URL
  static getKlineUrl(code, lmt = 58) {
    const baseUrl = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
    const secid = code.startsWith('000') ? `0.${code}` : `1.${code}`;
    const params = new URLSearchParams({
      secid,
      fields1: 'f1,f2,f3,f4,f5',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
      lmt: lmt.toString(),
      klt: '101',
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
  static async getKlineData(code, lmt = 58) {
    try {
      const url = this.getKlineUrl(code, lmt);
      console.log('请求URL:', url);
      
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
      const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${code.startsWith('000') ? '0' : '1'}.${code}&fields1=f1,f2,f3,f4&fields2=f57,f58,f107,f116,f60,f152,f45,f52,f50,f48,f167,f47,f71,f161,f49,f530`;
      const response = await fetch(url);
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('获取股票信息失败:', error);
      throw error;
    }
  }
}
