import React, { useState } from 'react';
import { Card, Button, Space, Typography, Alert, Spin } from 'antd';
import { IndexService } from '../services/indexService';

const { Title, Text } = Typography;

export default function IndexConstituentsTest() {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);

  const addResult = (message, type = 'info') => {
    setTestResults(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testIndexService = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult('开始测试IndexService...', 'info');
      
      // 测试获取指数列表
      const indexList = IndexService.getIndexList();
      addResult(`指数列表: ${indexList.length} 个指数`, 'success');
      console.log('指数列表:', indexList);
      
      // 测试获取成分股数据
      addResult('正在加载沪深300成分股数据...', 'info');
      const result = await IndexService.getIndexConstituents('hs300');
      addResult(`成功加载 ${result.total} 个成分股`, 'success');
      console.log('沪深300成分股:', result);
      
      // 测试搜索功能
      const searchResult = IndexService.searchConstituents('hs300', '平安', result.constituents);
      addResult(`搜索"平安"找到 ${searchResult.length} 个结果`, 'success');
      console.log('搜索"平安"结果:', searchResult);
      
      // 测试统计信息
      const stats = IndexService.getIndexStats('hs300', result.constituents);
      addResult(`统计信息: 总数 ${stats.total}, 交易所分布: ${JSON.stringify(stats.exchangeStats)}`, 'success');
      console.log('统计信息:', stats);
      
      addResult('所有测试完成！', 'success');
    } catch (error) {
      addResult(`测试失败: ${error.message}`, 'error');
      console.error('测试失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>指数成分股服务测试</Title>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Button 
            type="primary" 
            onClick={testIndexService}
            loading={loading}
            size="large"
          >
            {loading ? '测试中...' : '测试IndexService'}
          </Button>
          
          {testResults.length > 0 && (
            <div>
              <Title level={4}>测试结果:</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                {testResults.map((result, index) => (
                  <Alert
                    key={index}
                    message={`[${result.timestamp}] ${result.message}`}
                    type={result.type}
                    showIcon
                  />
                ))}
              </Space>
            </div>
          )}
          
          <Text type="secondary">
            此测试将尝试加载真实的Excel文件，如果失败会回退到模拟数据。
            请打开浏览器控制台查看详细日志。
          </Text>
        </Space>
      </Card>
    </div>
  );
}

