// Excel数据解析工具
// 注意：这是一个简化版本，实际项目中可能需要使用专门的Excel解析库

export class ExcelParser {
  // 解析Excel文件内容（假设已经转换为文本格式）
  static parseExcelContent(content, sheetName = 'Sheet1') {
    try {
      // 这里简化处理，实际需要根据Excel文件格式进行解析
      const lines = content.split('\n');
      const headers = lines[0].split('\t'); // 假设使用制表符分隔
      const data = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split('\t');
          const row = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
          });
          data.push(row);
        }
      }
      
      return data;
    } catch (error) {
      console.error('解析Excel文件失败:', error);
      throw error;
    }
  }

  // 从股票代码列提取股票代码
  static extractStockCodes(excelData, codeColumn = '股票代码') {
    try {
      const codes = excelData
        .map(row => row[codeColumn])
        .filter(code => code && code.trim())
        .map(code => code.toString().padStart(6, '0')); // 确保6位数字格式
      
      return [...new Set(codes)]; // 去重
    } catch (error) {
      console.error('提取股票代码失败:', error);
      return [];
    }
  }

  // 生成股票池数据文件
  static generateStockPoolFile(stockCodes, poolName) {
    const constantName = poolName.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_STOCKS';
    
    return `// ${poolName}成分股
export const ${constantName} = [
${stockCodes.map(code => `  '${code}'`).join(',\n')}
];`;
  }

  // 批量处理多个股票池
  static processMultiplePools(poolsData) {
    const result = {};
    
    Object.keys(poolsData).forEach(poolName => {
      const codes = this.extractStockCodes(poolsData[poolName]);
      result[poolName] = codes;
    });
    
    return result;
  }
}

// 预定义的股票池数据（从Excel文件导入的示例数据）
export const EXCEL_STOCK_POOLS = {
  '沪深300': [
    '000001', '000002', '000858', '000876', '002415', '600000', '600036', '600519', '600887', '600276',
    '000001', '000002', '000858', '000876', '002415', '600000', '600036', '600519', '600887', '600276'
  ],
  '中证500': [
    '600563', '600885', '600699', '689009', '002180', '600997', '600491', '000016', '000030', '000035',
    '000977', '000661', '600085', '600958', '601225', '000776', '600926', '600383', '600036', '000001'
  ],
  '中证1000': [
    '600997', '600491', '000016', '000030', '000035', '000977', '000661', '600085', '600958', '601225',
    '000776', '600926', '600383', '600036', '000001', '600519', '000858', '002415', '600276', '000002'
  ],
  '科创50': [
    '688001', '688002', '688003', '688005', '688006', '688007', '688008', '688009', '688010', '688011',
    '688012', '688013', '688015', '688016', '688017', '688018', '688019', '688020', '688021', '688022'
  ]
};
