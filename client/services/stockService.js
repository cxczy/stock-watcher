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
    // 1开头：ETF (100001, 100002等) - 深圳市场
    // 5开头：ETF (500001, 500002等) - 上海市场
    // UDI开头：美元指数 - 全球指数
    // 特殊代码处理
    if (code === 'UDI' || code.startsWith('UDI')) {
      return '2'; // 全球指数市场
    }
    
    if (code.startsWith('0') || code.startsWith('3') || code.startsWith('8') || code.startsWith('1')) {
      return '0'; // 深圳市场
    } else if (code.startsWith('6') || code.startsWith('5')) {
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
      '1d': '101',         // 日线
      '1w': '102',        // 周线
      '1M': '103',        // 月线
      '1Q': '104',        // 季线
      '15m': '15',        // 15分钟
      '30m': '30',        // 30分钟
      '1h': '60',         // 1小时
      '5m': '5',          // 5分钟
      '1m': '1'           // 1分钟
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
        const klines = data.data.klines.map((kline) => {
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
        
        // 添加股票名称到每条K线数据中
        const stockName = data.data.name || data.data.f58 || '未知股票';
        klines.forEach(kline => {
          kline.name = stockName;
        });
        
        return klines;
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
    if (code === 'UDI' || code.startsWith('UDI')) {
      return '美元指数';
    } else if (code.startsWith('000')) {
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
    } else if (code.startsWith('1')) {
      return '深圳ETF';
    } else if (code.startsWith('5')) {
      return '上海ETF';
    } else {
      return '未知市场';
    }
  }

  // 获取股票搜索URL
  static getSearchUrl(keyword, pageIndex = 1, pageSize = 10, label = 'ALL', callbackName) {
    const baseUrl = 'https://search-codetable.eastmoney.com/codetable/search/web/wap';
    const params = new URLSearchParams({
      keyword,
      label,
      pageIndex: pageIndex.toString(),
      pageSize: pageSize.toString(),
      isHighLight: 'true',
      client: 'wap',
      clientType: 'wapSearch',
      clientVersion: 'lastest',
      preTag: '<em>',
      postTag: '</em>',
      cb: callbackName,
      _: Date.now().toString()
    });
    return `${baseUrl}?${params.toString()}`;
  }

  // 解析股票搜索结果（JSONP格式）
  static parseSearchDataFromJsonp(data) {
    try {
      if (data.code === '0' && data.result && data.result.quoteList) {
        return data.result.quoteList.map((item) => ({
          code: item.code,
          name: item.shortName.replace(/<em>/g, '').replace(/<\/em>/g, ''),
          market: item.market,
          marketName: item.securityTypeName,
          pinyin: item.pinyin,
          securityType: item.securityType,
          status: item.status,
          flag: item.flag
        }));
      } else {
        throw new Error('搜索API返回数据格式错误');
      }
    } catch (error) {
      console.error('解析股票搜索结果失败:', error);
      throw new Error('无法解析股票搜索结果');
    }
  }

  // 解析股票搜索结果（文本格式，保留作为备用）
  static parseSearchData(response) {
    try {
      // 处理JSONP响应格式
      const start = response.indexOf('(');
      const end = response.lastIndexOf(')');
      if (start !== -1 && end !== -1) {
        const jsonStr = response.substring(start + 1, end);
        const data = JSON.parse(jsonStr);
        
        if (data.code === '0' && data.result && data.result.quoteList) {
          return data.result.quoteList.map((item) => ({
            code: item.code,
            name: item.shortName.replace(/<em>/g, '').replace(/<\/em>/g, ''),
            market: item.market,
            marketName: item.securityTypeName,
            pinyin: item.pinyin,
            securityType: item.securityType,
            status: item.status,
            flag: item.flag
          }));
        } else {
          throw new Error('搜索API返回数据格式错误');
        }
      } else {
        throw new Error('无法解析JSONP响应格式');
      }
    } catch (error) {
      console.error('解析股票搜索结果失败:', error);
      throw new Error('无法解析股票搜索结果');
    }
  }

  // JSONP请求方法
  static jsonpRequest(url, callbackName) {
    return new Promise((resolve, reject) => {
      // 创建script标签
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      
      // 设置全局回调函数
      window[callbackName] = (data) => {
        // 清理
        document.head.removeChild(script);
        delete window[callbackName];
        resolve(data);
      };
      
      // 错误处理
      script.onerror = () => {
        document.head.removeChild(script);
        delete window[callbackName];
        reject(new Error('JSONP请求失败'));
      };
      
      // 添加到页面
      document.head.appendChild(script);
    });
  }

  // 搜索股票
  static async searchStocks(keyword, pageIndex = 1, pageSize = 10, label = 'ALL') {
    try {
      // 创建唯一的回调函数名
      const callbackName = `jQuery${Date.now()}_${Math.random().toString().substring(2, 15)}`;
      
      const url = this.getSearchUrl(keyword, pageIndex, pageSize, label, callbackName);
      console.log('股票搜索请求URL:', url);

      const data = await this.jsonpRequest(url, callbackName);
      console.log('搜索响应数据:', data);

      const result = this.parseSearchDataFromJsonp(data);
      console.log('搜索成功，结果数量:', result.length);
      return result;
    } catch (error) {
      console.error('搜索股票失败:', error);
      throw error;
    }
  }

  // 获取股票标签列表
  static async getStockLabels() {
    try {
      // 使用一个简单的搜索来获取标签列表
      const url = this.getSearchUrl('a', 1, 1);
      const data = await this.jsonpRequest(url);
      
      if (data.code === '0' && data.result && data.result.tagList) {
        return data.result.tagList.map(tag => ({
          name: tag.name,
          desc: tag.desc
        }));
      }
      return [];
    } catch (error) {
      console.error('获取股票标签失败:', error);
      return [];
    }
  }

  // 测试美元指数数据获取
  static async testUDIData() {
    try {
      console.log('测试美元指数数据获取...');
      const url = this.getKlineUrl('UDI', 60, '1M');
      console.log('美元指数请求URL:', url);
      
      const response = await fetch(url);
      console.log('美元指数响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }
      
      const text = await response.text();
      console.log('美元指数响应数据长度:', text.length);
      console.log('美元指数响应数据:', text.substring(0, 500));
      
      const result = this.parseKlineData(text);
      console.log('美元指数解析成功，数据条数:', result.length);
      return result;
    } catch (error) {
      console.error('获取美元指数数据失败:', error);
      throw error;
    }
  }
}
