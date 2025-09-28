import React from 'react';
import { Card } from 'antd';

// 简单的测试组件
export default function RouteTest() {
  return (
    <Card title="路由测试">
      <p>路由系统工作正常！</p>
      <p>当前时间: {new Date().toLocaleString()}</p>
    </Card>
  );
}
