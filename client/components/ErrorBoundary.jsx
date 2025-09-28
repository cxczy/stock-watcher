import React from 'react';
import { Alert, Button } from 'antd';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <Alert
            message="页面出现错误"
            description={
              <div>
                <p>错误信息: {this.state.error?.message || '未知错误'}</p>
                <p>请尝试刷新页面或联系管理员</p>
              </div>
            }
            type="error"
            showIcon
            action={
              <Button 
                size="small" 
                danger 
                onClick={() => window.location.reload()}
              >
                刷新页面
              </Button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
