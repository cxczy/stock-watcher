import * as XLSX from 'xlsx';

// Excel文件读取工具
export class ExcelReader {
  // 读取Excel文件
  static async readExcelFile(filePath) {
    try {
      const response = await fetch(filePath);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // 获取第一个工作表
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // 转换为JSON格式
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      return jsonData;
    } catch (error) {
      console.error('读取Excel文件失败:', error);
      throw error;
    }
  }

  // 解析指数成分股数据
  static parseIndexData(rawData) {
    if (!rawData || rawData.length < 2) {
      return [];
    }

    // 第一行是表头
    const headers = rawData[0];
    const dataRows = rawData.slice(1);

    // 找到关键列的索引
    const getColumnIndex = (columnName) => {
      return headers.findIndex(header => 
        header && header.toString().toLowerCase().includes(columnName.toLowerCase())
      );
    };

    const dateIndex = getColumnIndex('date') || getColumnIndex('日期');
    const indexCodeIndex = getColumnIndex('index code') || getColumnIndex('指数代码');
    const indexNameIndex = getColumnIndex('index name') || getColumnIndex('指数名称');
    const constituentCodeIndex = getColumnIndex('constituent code') || getColumnIndex('成份券代码');
    const constituentNameIndex = getColumnIndex('constituent name') || getColumnIndex('成份券名称');
    const exchangeIndex = getColumnIndex('exchange') || getColumnIndex('交易所');

    const constituents = [];
    const seenCodes = new Set(); // 用于去重

    dataRows.forEach((row, index) => {
      if (!row || row.length === 0) return;

      const code = row[constituentCodeIndex];
      const name = row[constituentNameIndex];
      const exchange = row[exchangeIndex];

      // 验证必要字段
      if (code && name && !seenCodes.has(code)) {
        seenCodes.add(code);
        constituents.push({
          code: code.toString().trim(),
          name: name.toString().trim(),
          exchange: exchange ? exchange.toString().trim() : '未知交易所',
          date: row[dateIndex] ? row[dateIndex].toString() : '',
          indexCode: row[indexCodeIndex] ? row[indexCodeIndex].toString() : '',
          indexName: row[indexNameIndex] ? row[indexNameIndex].toString() : ''
        });
      }
    });

    return constituents;
  }

  // 获取指数信息
  static getIndexInfo(rawData) {
    if (!rawData || rawData.length < 2) return null;

    const firstRow = rawData[1]; // 第一行数据
    const headers = rawData[0];

    const getValue = (columnName) => {
      const index = headers.findIndex(header => 
        header && header.toString().toLowerCase().includes(columnName.toLowerCase())
      );
      return index >= 0 ? firstRow[index] : null;
    };

    return {
      indexCode: getValue('index code') || getValue('指数代码'),
      indexName: getValue('index name') || getValue('指数名称'),
      date: getValue('date') || getValue('日期')
    };
  }
}

// 指数文件配置
export const INDEX_FILES = {
  'hs300': {
    name: '沪深300',
    code: '000300',
    file: '/data/hs300.xls',
    description: '沪深300指数成分股'
  },
  'zz500': {
    name: '中证500',
    code: '000905',
    file: '/data/zz500.xls',
    description: '中证500指数成分股'
  },
  'zz1000': {
    name: '中证1000',
    code: '000852',
    file: '/data/zz1000.xls',
    description: '中证1000指数成分股'
  },
  'kc50': {
    name: '科创50',
    code: '000688',
    file: '/data/kc50.xls',
    description: '科创50指数成分股'
  }
};
