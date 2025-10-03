import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '../components/Layout';
import TechnicalScreener from '../components/TechnicalScreener';
import PortfolioHoldings from '../components/PortfolioHoldings';
import StockAnalysis from '../components/StockAnalysis';
import PortfolioBuilder from '../components/PortfolioBuilder';
import WyckoffAnalysis from '../components/WyckoffAnalysis';
import CycleAnalysis from '../components/CycleAnalysis';
import IndexConstituents from '../components/IndexConstituents';
import ErrorBoundary from '../components/ErrorBoundary';
import RouteTest from '../test/routeTest';
import IndexConstituentsTest from '../test/indexConstituentsTest';

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
        path: "index-constituents",
        element: <IndexConstituents />
      },
      {
        path: "test",
        element: <RouteTest />
      },
      {
        path: "index-test",
        element: <IndexConstituentsTest />
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
