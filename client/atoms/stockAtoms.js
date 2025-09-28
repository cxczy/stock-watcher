import { atom } from 'jotai';

// 股票相关状态
export const selectedCodeAtom = atom('');
export const klineDataAtom = atom([]);
export const backtestResultsAtom = atom([]);
export const loadingAtom = atom(false);
export const errorAtom = atom(null);
export const selectedPoolAtom = atom('中证500');
export const strategyParamsAtom = atom({
  buy: 3,
  sell: 1,
  wait: false
});
export const backtestStatsAtom = atom(null);
