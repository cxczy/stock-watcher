import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '../components/Layout';
import PoolScreener from '../components/PoolScreener';
import TechnicalScreener from '../components/TechnicalScreener';
import PortfolioMonitor from '../components/PortfolioMonitor';
import PortfolioHoldings from '../components/PortfolioHoldings';
import BacktestAnalysis from '../components/BacktestAnalysis';
import ErrorBoundary from '../components/ErrorBoundary';
import RouteTest from '../test/routeTest';

// 路由配置
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <PoolScreener />
      },
      {
        path: "technical-screener",
        element: <TechnicalScreener />
      },
      {
        path: "portfolio-monitor",
        element: <PortfolioMonitor />
      },
      {
        path: "portfolio-holdings",
        element: <PortfolioHoldings />
      },
      {
        path: "backtest-analysis",
        element: <BacktestAnalysis />
      },
      {
        path: "test",
        element: <RouteTest />
      }
    ]
  }
]);

export default function AppRouter() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
