import yahooFinance from 'yahoo-finance2';
import { db } from '../db';
import { stockPrices, stocks } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from '@/lib/utils';
import { resolveSymbol, getCleanSymbol } from './symbol-resolver';
// @ts-ignore
import * as finnhub from 'finnhub';

// Support for secondary data source
let finnhubClient: any = null;

if (process.env.FINNHUB_API_KEY) {
  try {
    const apiClient = (finnhub as any).ApiClient?.instance || (finnhub as any).default?.ApiClient?.instance;
    if (apiClient) {
      apiClient.authentications['api_key'].apiKey = process.env.FINNHUB_API_KEY;
      finnhubClient = new (finnhub as any).DefaultApi();
    }
  } catch (e) {
    console.warn('[MarketData] Failed to initialize Finnhub client:', e);
  }
}


/**
 * Enhanced market data fetching with symbol resolution
 * Now supports multiple exchanges (NSE, BSE, NASDAQ, NYSE, LSE, TSE, CRYPTO)
 */
export interface MarketData {
  symbol: string;
  fullTicker: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  name: string;
  volume?: number;
  timestamp: Date;
  isStale?: boolean;
}

export async function getMarketData(
  userInputSymbol: string,
  forceRefresh: boolean = false
): Promise<MarketData> {
  try {
    // 1. Resolve symbol to correct ticker
    const symbolMapping = await resolveSymbol(userInputSymbol);
    const { fullTicker, exchange: resolvedExchange } = symbolMapping;
    
    // 2. Check if we have recent data in DB (less than 1 min old)
    if (!forceRefresh) {
      const existingStock = await db.query.stocks.findFirst({
        where: eq(stocks.symbol, fullTicker),
      });

      if (existingStock) {
        const lastPrice = await db.query.stockPrices.findFirst({
          where: eq(stockPrices.stockId, existingStock.id),
          orderBy: [desc(stockPrices.timestamp)],
        });

        // 1 minute cache for prices
        const cacheTTL = 60 * 1000;
        const oneMinuteAgo = new Date(Date.now() - cacheTTL);
        
        if (lastPrice && lastPrice.timestamp > oneMinuteAgo) {
          console.log(`[MarketData] Using cached data for ${fullTicker}`);
          return {
            symbol: getCleanSymbol(fullTicker),
            fullTicker,
            exchange: resolvedExchange,
            price: lastPrice.price,
            change: lastPrice.change || 0,
            changePercent: lastPrice.changePercent || 0,
            name: existingStock.name || '',
            currency: symbolMapping.currency,
            volume: lastPrice.volume || 0,
            timestamp: lastPrice.timestamp,
            isStale: false,
          };
        }
      }
    }

    console.log(`[MarketData] Fetching fresh data for ${fullTicker}`);

    let result: any = null;
    let source = 'yahoo-finance';

    // 3. Try Primary Source: Yahoo Finance
    try {
      result = await yahooFinance.quote(fullTicker);
    } catch (e) {
      console.warn(`[MarketData] Yahoo Finance failed for ${fullTicker}, trying fallbacks...`);
    }

    // 4. Try Secondary Source: Finnhub (if Yahoo fails)
    if (!result && finnhubClient) {
      try {
        const quote: any = await new Promise((resolve, reject) => {
          finnhubClient.quote(symbolMapping.symbol, (error: any, data: any) => {
            if (error) reject(error);
            else resolve(data);
          });
        });
        
        if (quote && quote.c) { // Current price
          result = {
            regularMarketPrice: quote.c,
            regularMarketChange: quote.d,
            regularMarketChangePercent: quote.dp,
            regularMarketVolume: quote.v,
            currency: symbolMapping.currency,
            shortName: symbolMapping.company,
          };
          source = 'finnhub';
        }
      } catch (e) {
        console.warn(`[MarketData] Finnhub fallback failed for ${fullTicker}`);
      }
    }

    if (!result) {
      throw new Error(
        `No data found for symbol: ${fullTicker}. Please check the ticker and exchange.`
      );
    }

    // 5. Update stock metadata in DB
    const [stock] = await db.insert(stocks).values({
      id: nanoid(),
      symbol: fullTicker,
      name: symbolMapping.company !== 'Unknown' ? symbolMapping.company : result.shortName || result.longName,
      sector: (result as any).sector,
      industry: (result as any).industry,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: stocks.symbol, 
      set: {
        name: result.shortName || result.longName,
        updatedAt: new Date(),
      }
    }).returning();

    // 6. Store price in historical table
    await db.insert(stockPrices).values({
      id: nanoid(),
      stockId: stock.id,
      price: result.regularMarketPrice || 0,
      change: result.regularMarketChange,
      changePercent: result.regularMarketChangePercent,
      volume: result.regularMarketVolume,
      timestamp: new Date(),
    });

    return {
      symbol: getCleanSymbol(fullTicker),
      fullTicker,
      exchange: resolvedExchange,
      price: result.regularMarketPrice,
      change: result.regularMarketChange,
      changePercent: result.regularMarketChangePercent,
      name: symbolMapping.company !== 'Unknown' ? symbolMapping.company : result.shortName || result.longName,
      currency: result.currency || symbolMapping.currency,
      volume: result.regularMarketVolume,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(
      `Error fetching market data for ${userInputSymbol}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

/**
 * Fetch historical data for a symbol
 */
export async function getHistoricalData(
  userInputSymbol: string,
  period1: string,
  period2: string
) {
  try {
    const symbolMapping = await resolveSymbol(userInputSymbol);
    const { fullTicker } = symbolMapping;
    
    const queryOptions = { period1, period2, interval: '1d' as const };
    const result = await yahooFinance.chart(fullTicker, queryOptions);
    return result;
  } catch (error) {
    console.error(
      `Error fetching historical data for ${userInputSymbol}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

export function validateMarketData(data: any): boolean {
  if (!data || typeof data.price !== 'number' || data.price <= 0) return false;
  if (!data.timestamp || isNaN(new Date(data.timestamp).getTime())) return false;
  return true;
}

