import React, { useState } from 'react';
import { Card, Button, Alert, Spin } from 'antd';
import { StockService } from '../services/stockService';

export default function TestUDI() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testUDI = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const data = await StockService.testUDIData();
      setResult(data);
      console.log('美元指数数据:', data);
    } catch (err) {
      setError(err.message);
      console.error('测试失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="美元指数(UDI)数据测试">
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={testUDI} loading={loading}>
            测试美元指数数据获取
          </Button>
        </div>
        
        {loading && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin size="large" />
            <div style={{ marginTop: 10 }}>正在测试美元指数数据获取...</div>
          </div>
        )}
        
        {error && (
          <Alert
            message="测试失败"
            description={error}
            type="error"
            style={{ marginBottom: 16 }}
          />
        )}
        
        {result && (
          <div>
            <Alert
              message="测试成功"
              description={`成功获取美元指数数据，共 ${result.length} 条记录`}
              type="success"
              style={{ marginBottom: 16 }}
            />
            
            <div style={{ marginBottom: 16 }}>
              <h4>数据预览（前5条）：</h4>
              <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4 }}>
                {JSON.stringify(result.slice(0, 5), null, 2)}
              </pre>
            </div>
            
            <div>
              <h4>最新数据：</h4>
              <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4 }}>
                {JSON.stringify(result[result.length - 1], null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
