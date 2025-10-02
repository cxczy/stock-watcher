import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '../components/Layout';
import TechnicalScreener from '../components/TechnicalScreener';
import PortfolioHoldings from '../components/PortfolioHoldings';
import BacktestAnalysis from '../components/BacktestAnalysis';
import StockAnalysis from '../components/StockAnalysis';
import PortfolioBuilder from '../components/PortfolioBuilder';
import WyckoffAnalysis from '../components/WyckoffAnalysis';
import CycleAnalysis from '../components/CycleAnalysis';
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
        element: <TechnicalScreener />
      },
      {
        path: "technical-screener",
        element: <TechnicalScreener />
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
        path: "stock-analysis",
        element: <StockAnalysis />
      },
      {
        path: "portfolio-builder",
        element: <PortfolioBuilder />
      },
      {
        path: "wyckoff-analysis",
        element: <WyckoffAnalysis />
      },
      {
        path: "cycle-analysis",
        element: <CycleAnalysis />
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
