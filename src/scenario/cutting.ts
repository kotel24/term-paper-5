import { FEEDS, SPEEDS, WORK_THICK } from '../model/machine';

const v = 25;
const d = 12;
const sRec = 0.18;
const nCalc = (1000 * v) / (Math.PI * d);

export const CUT = {
  v,
  d,
  sRec,
  n: Math.round(nCalc),
  speed: Math.max(...SPEEDS.filter((x) => x <= nCalc)),
  feed: Math.max(...FEEDS.filter((x) => x <= sRec)),
  depthMm: Math.round(WORK_THICK * 1000),
  formula: `n = 1000·${v} / (3,14·${d}) ≈ ${Math.round(nCalc)} об/мин`,
} as const;

export const SPEED_INDEX = SPEEDS.indexOf(CUT.speed);
export const FEED_INDEX = FEEDS.indexOf(CUT.feed);
