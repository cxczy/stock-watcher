import { ExcelReader, INDEX_FILES } from '../utils/excelReader.js';

// 指数成分股数据服务
export class IndexService {
  // 指数配置信息
  static INDEX_CONFIG = INDEX_FILES;

  // 模拟数据 - 实际项目中应该从Excel文件解析
  static MOCK_DATA = {
    'hs300': [
      { code: '000001', name: '平安银行', exchange: '深圳证券交易所' },
      { code: '000002', name: '万科A', exchange: '深圳证券交易所' },
      { code: '000858', name: '五粮液', exchange: '深圳证券交易所' },
      { code: '000876', name: '新希望', exchange: '深圳证券交易所' },
      { code: '002415', name: '海康威视', exchange: '深圳证券交易所' },
      { code: '600000', name: '浦发银行', exchange: '上海证券交易所' },
      { code: '600036', name: '招商银行', exchange: '上海证券交易所' },
      { code: '600519', name: '贵州茅台', exchange: '上海证券交易所' },
      { code: '600887', name: '伊利股份', exchange: '上海证券交易所' },
      { code: '600276', name: '恒瑞医药', exchange: '上海证券交易所' }
    ],
    'zz500': [
      { code: '600563', name: '法拉电子', exchange: '上海证券交易所' },
      { code: '600885', name: '宏发股份', exchange: '上海证券交易所' },
      { code: '600699', name: '均胜电子', exchange: '上海证券交易所' },
      { code: '689009', name: '九号公司', exchange: '上海证券交易所' },
      { code: '002180', name: '纳思达', exchange: '深圳证券交易所' },
      { code: '600997', name: '开滦股份', exchange: '上海证券交易所' },
      { code: '600491', name: '龙元建设', exchange: '上海证券交易所' },
      { code: '000016', name: '深康佳A', exchange: '深圳证券交易所' },
      { code: '000030', name: '富奥股份', exchange: '深圳证券交易所' },
      { code: '000035', name: '中国天楹', exchange: '深圳证券交易所' }
    ],
    'zz1000': [
      { code: '600997', name: '开滦股份', exchange: '上海证券交易所' },
      { code: '600491', name: '龙元建设', exchange: '上海证券交易所' },
      { code: '000016', name: '深康佳A', exchange: '深圳证券交易所' },
      { code: '000030', name: '富奥股份', exchange: '深圳证券交易所' },
      { code: '000035', name: '中国天楹', exchange: '深圳证券交易所' },
      { code: '000977', name: '浪潮信息', exchange: '深圳证券交易所' },
      { code: '000661', name: '长春高新', exchange: '深圳证券交易所' },
      { code: '600085', name: '同仁堂', exchange: '上海证券交易所' },
      { code: '600958', name: '东方证券', exchange: '上海证券交易所' },
      { code: '601225', name: '陕西煤业', exchange: '上海证券交易所' }
    ],
    'kc50': [
      { code: '688001', name: '华兴源创', exchange: '上海证券交易所' },
      { code: '688002', name: '睿创微纳', exchange: '上海证券交易所' },
      { code: '688003', name: '天准科技', exchange: '上海证券交易所' },
      { code: '688005', name: '容百科技', exchange: '上海证券交易所' },
      { code: '688006', name: '杭可科技', exchange: '上海证券交易所' },
      { code: '688007', name: '光峰科技', exchange: '上海证券交易所' },
      { code: '688008', name: '澜起科技', exchange: '上海证券交易所' },
      { code: '688009', name: '中国通号', exchange: '上海证券交易所' },
      { code: '688010', name: '福光股份', exchange: '上海证券交易所' },
      { code: '688011', name: '新光光电', exchange: '上海证券交易所' }
    ]
  };

  // 获取所有指数列表
  static getIndexList() {
    return Object.keys(this.INDEX_CONFIG).map(key => ({
      key,
      ...this.INDEX_CONFIG[key]
    }));
  }

  // 获取指定指数的成分股
  static async getIndexConstituents(indexKey) {
    try {
      const indexConfig = this.INDEX_CONFIG[indexKey];
      if (!indexConfig) {
        throw new Error(`未找到指数配置: ${indexKey}`);
      }

      console.log(`正在加载指数数据: ${indexConfig.name}`);
      
      // 读取Excel文件
      const rawData = await ExcelReader.readExcelFile(indexConfig.file);
      console.log('Excel原始数据:', rawData.slice(0, 3)); // 显示前3行用于调试
      
      // 解析成分股数据
      const constituents = ExcelReader.parseIndexData(rawData);
      console.log(`解析到 ${constituents.length} 个成分股`);
      
      // 获取指数信息
      const indexInfo = ExcelReader.getIndexInfo(rawData);
      
      return {
        index: {
          ...indexConfig,
          ...indexInfo
        },
        constituents,
        total: constituents.length
      };
    } catch (error) {
      console.error('获取指数成分股失败:', error);
      // 如果Excel加载失败，回退到模拟数据
      console.log('回退到模拟数据');
      const data = this.MOCK_DATA[indexKey] || [];
      return {
        index: this.INDEX_CONFIG[indexKey],
        constituents: data,
        total: data.length
      };
    }
  }

  // 搜索成分股
  static searchConstituents(indexKey, keyword, constituents = null) {
    const data = constituents || this.MOCK_DATA[indexKey] || [];
    if (!keyword) return data;
    
    return data.filter(stock => 
      stock.code.includes(keyword) || 
      stock.name.includes(keyword)
    );
  }

  // 获取指数统计信息
  static getIndexStats(indexKey, constituents = null) {
    const data = constituents || this.MOCK_DATA[indexKey] || [];
    const exchangeStats = {};
    
    data.forEach(stock => {
      const exchange = stock.exchange;
      exchangeStats[exchange] = (exchangeStats[exchange] || 0) + 1;
    });
    
    return {
      total: data.length,
      exchangeStats
    };
  }
}

