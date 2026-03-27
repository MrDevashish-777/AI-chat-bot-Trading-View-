import { RSI, MACD, BollingerBands, ATR, ADX } from 'technicalindicators';
import { getHistoricalData } from './market-data';
import { db } from '../db';
import { technicalIndicators, stocks } from '../db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from '../utils';

export interface TechnicalIndicators {
  rsi: number;
  macd: { line: number; signal: number; histogram: number };
  movingAverages: { ma20: number; ma50: number; ma200: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  atr: number;
  adx: number;
  volume: { current: number; average: number; ratio: number };
}

export interface SMCAnalysis {
  fairValueGaps: Array<{
    level: number;
    type: 'bullish' | 'bearish';
    filled: boolean;
  }>;
  orderBlocks: Array<{
    priceRange: { low: number; high: number };
    type: 'bullish' | 'bearish';
    strength: number;
  }>;
}

export interface TechnicalSignal {
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  reasons: string[];
  indicators: TechnicalIndicators;
  smc?: SMCAnalysis;
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

  // Filter out any null quotes
  const quotes = history.quotes.filter((q: any) => q.close && q.high && q.low && q.volume);
  
  const prices = quotes.map((q: any) => q.close);
  const high = quotes.map((q: any) => q.high);
  const low = quotes.map((q: any) => q.low);
  const close = quotes.map((q: any) => q.close);
  const volumes = quotes.map((q: any) => q.volume);

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

  // SMC: Fair Value Gaps (FVG)
  const fvgs: SMCAnalysis['fairValueGaps'] = [];
  for (let i = quotes.length - 5; i >= 2; i--) {
    const prev = quotes[i - 2];
    const curr = quotes[i - 1];
    const next = quotes[i];
    
    // Bullish FVG: Low of candle 3 > High of candle 1
    if (next.low > prev.high) {
      fvgs.push({
        level: (next.low + prev.high) / 2,
        type: 'bullish',
        filled: close[close.length - 1] < prev.high
      });
    }
    // Bearish FVG: High of candle 3 < Low of candle 1
    else if (next.high < prev.low) {
      fvgs.push({
        level: (next.high + prev.low) / 2,
        type: 'bearish',
        filled: close[close.length - 1] > prev.low
      });
    }
  }

  // SMC: Order Blocks (OB)
  const orderBlocks: SMCAnalysis['orderBlocks'] = [];
  for (let i = quotes.length - 10; i >= 1; i--) {
    const prev = quotes[i - 1];
    const curr = quotes[i];
    
    // Bullish Order Block (last bearish candle before strong bullish move)
    if (prev.close < prev.open && curr.close > curr.open && (curr.close - curr.open) > (prev.open - prev.close) * 2) {
      orderBlocks.push({
        priceRange: { low: prev.low, high: prev.high },
        type: 'bullish',
        strength: (curr.close - curr.open) / (prev.open - prev.close)
      });
    }
    // Bearish Order Block (last bullish candle before strong bearish move)
    else if (prev.close > prev.open && curr.close < curr.open && (prev.close - prev.open) * 2 < (curr.open - curr.close)) {
      orderBlocks.push({
        priceRange: { low: prev.low, high: prev.high },
        type: 'bearish',
        strength: (curr.open - curr.close) / (prev.close - prev.open)
      });
    }
  }

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
  }

  // FVG logic
  if (fvgs.length > 0) {
    const latestFvg = fvgs[0];
    if (latestFvg.type === 'bullish' && !latestFvg.filled) {
      score += 1;
      reasons.push('Unfilled Bullish FVG identified');
    } else if (latestFvg.type === 'bearish' && !latestFvg.filled) {
      score -= 1;
      reasons.push('Unfilled Bearish FVG identified');
    }
  }

  let overallSignal: TechnicalSignal['signal'] = 'NEUTRAL';
  if (score >= 3) overallSignal = 'STRONG_BUY';
  else if (score >= 1) overallSignal = 'BUY';
  else if (score <= -3) overallSignal = 'STRONG_SELL';
  else if (score <= -1) overallSignal = 'SELL';

  const result: TechnicalSignal = {
    signal: overallSignal,
    confidence: Math.min(Math.abs(score) * 20, 100),
    reasons,
    indicators,
    smc: { fairValueGaps: fvgs, orderBlocks: [] }
  };

  // Persistence
  try {
    const stock = await db.query.stocks.findFirst({
      where: eq(stocks.symbol, symbol),
    });
    
    if (stock) {
      await db.insert(technicalIndicators).values({
        id: nanoid(),
        stockId: stock.id,
        rsi: indicators.rsi,
        macd: indicators.macd,
        movingAverages: indicators.movingAverages,
        bollingerBands: indicators.bollingerBands,
        atr: indicators.atr,
        adx: indicators.adx,
        signal: overallSignal,
        confidence: result.confidence,
        timestamp: new Date(),
      });
    }
  } catch (dbError) {
    console.warn(`[TechnicalAnalysis] Failed to store indicators:`, dbError);
  }

  return result;
}

