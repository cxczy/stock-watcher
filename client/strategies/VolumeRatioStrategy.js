import { BaseStrategy } from './BaseStrategy.js';
import { TechnicalIndicators } from '../utils/indicators.js';

// 成交量比率策略
export class VolumeRatioStrategy extends BaseStrategy {
  constructor() {
    super();
    this.name = '成交量比率策略';
  }

  execute(data, params) {
    const results = data.map(() => ({
      buy: false,
      sell: false,
      delta: 0
    }));

    for (let i = 0; i < data.length; i++) {
      const volumeRatio = TechnicalIndicators.volumeRatio(
        data.map(d => d.volume), 
        i
      );

      if (data[i].rate > 0 && volumeRatio < 1.2) {
        results[i].buy = true;
        const sellIndex = i + 1;
        if (sellIndex < data.length) {
          results[sellIndex].sell = true;
          results[sellIndex].delta = this.calculateDelta(
            data[i].close, 
            data[sellIndex].close
          );
        }
      }
    }

    return results;
  }
}
