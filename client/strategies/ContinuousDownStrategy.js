import { BaseStrategy } from './BaseStrategy.js';
import { TechnicalIndicators } from '../utils/indicators.js';

// 连续下跌策略
export class ContinuousDownStrategy extends BaseStrategy {
  constructor() {
    super();
    this.name = '连续下跌策略';
  }

  execute(data, params) {
    const results = data.map(() => ({
      buy: false,
      sell: false,
      delta: 0
    }));

    for (let i = 0; i < data.length; i++) {
      const continuousDown = TechnicalIndicators.continuousDown(
        data.map(d => d.close), 
        i
      );

      if (continuousDown === params.buy) {
        results[i].buy = true;
        
        let sellIndex = i + params.sell;
        if (params.wait) {
          while (sellIndex < data.length - 1 && 
                 TechnicalIndicators.continuousDown(data.map(d => d.close), sellIndex) > 0) {
            sellIndex++;
          }
        }

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
