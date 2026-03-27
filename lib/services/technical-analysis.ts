import { RSI, MACD, BollingerBands, ATR, ADX } from 'technicalindicators';
import { getHistoricalData } from './market-data';

export interface TechnicalIndicators {
  rsi: number;
  macd: { line: number; signal: number; histogram: number };
  movingAverages: { ma20: number; ma50: number; ma200: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  atr: number;
  adx: number;
  volume: { current: number; average: number; ratio: number };
}

export interface TechnicalSignal {
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  reasons: string[];
  indicators: TechnicalIndicators;
}

export async function analyzeTechnicalIndicators(
  symbol: string
): Promise<TechnicalSignal> {
  // Get last 250 days of data for reliable indicators
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 365);

  const history: any = await getHistoricalData(
    symbol,
    start.toISOString(),
    end.toISOString()
  );

  if (!history || !history.quotes || history.quotes.length < 50) {
    throw new Error('Insufficient historical data for technical analysis');
  }

  const prices = history.quotes.map((q: any) => q.close);
  const high = history.quotes.map((q: any) => q.high);
  const low = history.quotes.map((q: any) => q.low);
  const close = history.quotes.map((q: any) => q.close);
  const volumes = history.quotes.map((q: any) => q.volume);

  // RSI
  const rsiValues = RSI.calculate({ values: prices, period: 14 });
  const currentRsi = rsiValues[rsiValues.length - 1];

  // MACD
  const macdValues = MACD.calculate({
    values: prices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const lastMacd = macdValues[macdValues.length - 1];

  // Bollinger Bands
  const bbValues = BollingerBands.calculate({
    values: prices,
    period: 20,
    stdDev: 2,
  });
  const lastBB = bbValues[bbValues.length - 1];

  // ATR
  const atrValues = ATR.calculate({
    high,
    low,
    close,
    period: 14,
  });
  const lastAtr = atrValues[atrValues.length - 1];

  // ADX
  const adxValues = ADX.calculate({
    high,
    low,
    close,
    period: 14,
  });
  const lastAdx = adxValues[adxValues.length - 1];

  // Moving Averages
  const ma20 = prices.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
  const ma50 = prices.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50;
  const ma200 = prices.slice(-200).reduce((a: number, b: number) => a + b, 0) / 200;

  // Volume
  const currentVolume = volumes[volumes.length - 1];
  const avgVolume = volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;

  const indicators: TechnicalIndicators = {
    rsi: currentRsi,
    macd: {
      line: lastMacd.MACD || 0,
      signal: lastMacd.signal || 0,
      histogram: lastMacd.histogram || 0,
    },
    movingAverages: { ma20, ma50, ma200 },
    bollingerBands: {
      upper: lastBB.upper,
      middle: lastBB.middle,
      lower: lastBB.lower,
    },
    atr: lastAtr,
    adx: lastAdx.adx,
    volume: {
      current: currentVolume,
      average: avgVolume,
      ratio: currentVolume / avgVolume,
    },
  };

  // Logic for Signal
  let score = 0;
  const reasons: string[] = [];

  // RSI logic
  if (currentRsi < 30) {
    score += 2;
    reasons.push('RSI Oversold (<30)');
  } else if (currentRsi > 70) {
    score -= 2;
    reasons.push('RSI Overbought (>70)');
  }

  // MACD logic
  if (lastMacd.histogram! > 0) {
    score += 1;
    reasons.push('MACD Histogram is positive');
  } else {
    score -= 1;
    reasons.push('MACD Histogram is negative');
  }

  // MA Crossover logic
  if (ma20 > ma50) {
    score += 1;
    reasons.push('Bullish MA Crossover (20 > 50)');
  } else {
    score -= 1;
    reasons.push('Bearish MA Crossover (20 < 50)');
  }

  // ADX logic (Trend Strength)
  if (lastAdx.adx > 25) {
    reasons.push(`Strong trend (ADX: ${lastAdx.adx.toFixed(2)})`);
  } else {
    reasons.push(`Weak/No trend (ADX: ${lastAdx.adx.toFixed(2)})`);
  }

  let overallSignal: TechnicalSignal['signal'] = 'NEUTRAL';
  if (score >= 3) overallSignal = 'STRONG_BUY';
  else if (score >= 1) overallSignal = 'BUY';
  else if (score <= -3) overallSignal = 'STRONG_SELL';
  else if (score <= -1) overallSignal = 'SELL';

  return {
    signal: overallSignal,
    confidence: Math.min(Math.abs(score) * 20, 100),
    reasons,
    indicators,
  };
}
