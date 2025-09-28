import React, { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { klineDataAtom, backtestResultsAtom } from '../atoms/stockAtoms.js';

export default function StockChart() {
  const chartRef = useRef(null);
  const klineData = useAtomValue(klineDataAtom);
  const backtestResults = useAtomValue(backtestResultsAtom);

  useEffect(() => {
    if (!klineData.length || !chartRef.current) return;

    // 简单的K线图实现（使用Canvas）
    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    if (klineData.length === 0) return;

    // 计算价格范围
    const prices = klineData.map(d => [d.high, d.low, d.open, d.close]).flat();
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // 计算K线参数
    const candleWidth = width / klineData.length * 0.8;
    const candleSpacing = width / klineData.length;

    // 绘制K线
    klineData.forEach((data, index) => {
      const x = index * candleSpacing + candleSpacing / 2;
      const isUp = data.close >= data.open;
      
      // 计算Y坐标
      const highY = height - ((data.high - minPrice) / priceRange) * height;
      const lowY = height - ((data.low - minPrice) / priceRange) * height;
      const openY = height - ((data.open - minPrice) / priceRange) * height;
      const closeY = height - ((data.close - minPrice) / priceRange) * height;

      // 绘制影线
      ctx.strokeStyle = isUp ? '#ff4d4f' : '#52c41a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // 绘制实体
      ctx.fillStyle = isUp ? '#ff4d4f' : '#52c41a';
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY);
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight || 1);

      // 绘制买卖点
      if (backtestResults[index]) {
        const result = backtestResults[index];
        if (result.buy) {
          ctx.fillStyle = '#1890ff';
          ctx.beginPath();
          ctx.arc(x, highY - 10, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
        if (result.sell) {
          ctx.fillStyle = '#fa8c16';
          ctx.beginPath();
          ctx.arc(x, lowY + 10, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    });

    // 绘制价格标签
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.fillText(`最高: ${maxPrice.toFixed(2)}`, 10, 20);
    ctx.fillText(`最低: ${minPrice.toFixed(2)}`, 10, 40);
    ctx.fillText(`最新: ${klineData[klineData.length - 1]?.close.toFixed(2)}`, 10, 60);

  }, [klineData, backtestResults]);

  return (
    <div className="w-full">
      <h3 className="mb-4">K线图</h3>
      <canvas
        ref={chartRef}
        width={800}
        height={400}
        className="border border-gray-300 rounded"
      />
      <div className="mt-2 text-sm text-gray-600">
        <span className="mr-4">🔵 买入点</span>
        <span className="mr-4">🟠 卖出点</span>
        <span className="mr-4">🔴 上涨</span>
        <span>🟢 下跌</span>
      </div>
    </div>
  );
}
