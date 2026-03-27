import yahooFinance from 'yahoo-finance2';
import FuzzySet from 'fuzzyset.js';
import { db } from '../db';
import { symbolMappings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from '../utils';

export interface SymbolMapping {
  userInput: string;
  symbol: string;
  exchange: string;
  fullTicker: string; // e.g., "TCS.NS" for NSE
  company: string;
  country: string;
  type: 'stock' | 'etf' | 'crypto';
  currency: string;
}

/**
 * Comprehensive symbol database
 * Maps common names to official tickers with exchanges
 */
const SYMBOL_DATABASE: Record<string, SymbolMapping> = {
  // Indian Stocks - NSE
  'TCS': {
    userInput: 'TCS',
    symbol: 'TCS',
    exchange: 'NSE',
    fullTicker: 'TCS.NS',
    company: 'Tata Consultancy Services Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'RELIANCE': {
    userInput: 'RELIANCE',
    symbol: 'RELIANCE',
    exchange: 'NSE',
    fullTicker: 'RELIANCE.NS',
    company: 'Reliance Industries Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'INFY': {
    userInput: 'INFY',
    symbol: 'INFY',
    exchange: 'NSE',
    fullTicker: 'INFY.NS',
    company: 'Infosys Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'WIPRO': {
    userInput: 'WIPRO',
    symbol: 'WIPRO',
    exchange: 'NSE',
    fullTicker: 'WIPRO.NS',
    company: 'Wipro Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'HDFCBANK': {
    userInput: 'HDFCBANK',
    symbol: 'HDFCBANK',
    exchange: 'NSE',
    fullTicker: 'HDFCBANK.NS',
    company: 'HDFC Bank Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'HDFC': {
    userInput: 'HDFC',
    symbol: 'HDFC',
    exchange: 'NSE',
    fullTicker: 'HDFCBANK.NS', // HDFC merged with HDFCBANK
    company: 'HDFC Bank Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'ICICIBANK': {
    userInput: 'ICICIBANK',
    symbol: 'ICICIBANK',
    exchange: 'NSE',
    fullTicker: 'ICICIBANK.NS',
    company: 'ICICI Bank Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'AXISBANK': {
    userInput: 'AXISBANK',
    symbol: 'AXISBANK',
    exchange: 'NSE',
    fullTicker: 'AXISBANK.NS',
    company: 'Axis Bank Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'LT': {
    userInput: 'LT',
    symbol: 'LT',
    exchange: 'NSE',
    fullTicker: 'LT.NS',
    company: 'Larsen & Toubro Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'MARUTI': {
    userInput: 'MARUTI',
    symbol: 'MARUTI',
    exchange: 'NSE',
    fullTicker: 'MARUTI.NS',
    company: 'Maruti Suzuki India Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'BAJAJFINSV': {
    userInput: 'BAJAJFINSV',
    symbol: 'BAJAJFINSV',
    exchange: 'NSE',
    fullTicker: 'BAJAJFINSV.NS',
    company: 'Bajaj Finserv Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'KOTAKBANK': {
    userInput: 'KOTAKBANK',
    symbol: 'KOTAKBANK',
    exchange: 'NSE',
    fullTicker: 'KOTAKBANK.NS',
    company: 'Kotak Mahindra Bank Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'ADANIENT': {
    userInput: 'ADANIENT',
    symbol: 'ADANIENT',
    exchange: 'NSE',
    fullTicker: 'ADANIENT.NS',
    company: 'Adani Enterprises Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'SBIN': {
    userInput: 'SBIN',
    symbol: 'SBIN',
    exchange: 'NSE',
    fullTicker: 'SBIN.NS',
    company: 'State Bank of India',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  'BHARTIARTL': {
    userInput: 'BHARTIARTL',
    symbol: 'BHARTIARTL',
    exchange: 'NSE',
    fullTicker: 'BHARTIARTL.NS',
    company: 'Bharti Airtel Limited',
    country: 'India',
    type: 'stock',
    currency: 'INR',
  },
  
  // US Stocks - NASDAQ/NYSE
  'AAPL': {
    userInput: 'AAPL',
    symbol: 'AAPL',
    exchange: 'NASDAQ',
    fullTicker: 'AAPL',
    company: 'Apple Inc.',
    country: 'USA',
    type: 'stock',
    currency: 'USD',
  },
  'MSFT': {
    userInput: 'MSFT',
    symbol: 'MSFT',
    exchange: 'NASDAQ',
    fullTicker: 'MSFT',
    company: 'Microsoft Corporation',
    country: 'USA',
    type: 'stock',
    currency: 'USD',
  },
  'GOOGL': {
    userInput: 'GOOGL',
    symbol: 'GOOGL',
    exchange: 'NASDAQ',
    fullTicker: 'GOOGL',
    company: 'Alphabet Inc.',
    country: 'USA',
    type: 'stock',
    currency: 'USD',
  },
  'AMZN': {
    userInput: 'AMZN',
    symbol: 'AMZN',
    exchange: 'NASDAQ',
    fullTicker: 'AMZN',
    company: 'Amazon.com Inc.',
    country: 'USA',
    type: 'stock',
    currency: 'USD',
  },
  'TSLA': {
    userInput: 'TSLA',
    symbol: 'TSLA',
    exchange: 'NASDAQ',
    fullTicker: 'TSLA',
    company: 'Tesla Inc.',
    country: 'USA',
    type: 'stock',
    currency: 'USD',
  },
  'META': {
    userInput: 'META',
    symbol: 'META',
    exchange: 'NASDAQ',
    fullTicker: 'META',
    company: 'Meta Platforms Inc.',
    country: 'USA',
    type: 'stock',
    currency: 'USD',
  },
  'NVDA': {
    userInput: 'NVDA',
    symbol: 'NVDA',
    exchange: 'NASDAQ',
    fullTicker: 'NVDA',
    company: 'NVIDIA Corporation',
    country: 'USA',
    type: 'stock',
    currency: 'USD',
  },
  'AMD': {
    userInput: 'AMD',
    symbol: 'AMD',
    exchange: 'NASDAQ',
    fullTicker: 'AMD',
    company: 'Advanced Micro Devices Inc.',
    country: 'USA',
    type: 'stock',
    currency: 'USD',
  },
  
  // Cryptocurrencies
  'BTC': {
    userInput: 'BTC',
    symbol: 'BTC',
    exchange: 'CRYPTO',
    fullTicker: 'BTC-USD',
    company: 'Bitcoin',
    country: 'Global',
    type: 'crypto',
    currency: 'USD',
  },
  'ETH': {
    userInput: 'ETH',
    symbol: 'ETH',
    exchange: 'CRYPTO',
    fullTicker: 'ETH-USD',
    company: 'Ethereum',
    country: 'Global',
    type: 'crypto',
    currency: 'USD',
  },
};

// Initialize FuzzySet with known symbols
const fs = FuzzySet(Object.keys(SYMBOL_DATABASE));

/**
 * Main function: Resolve user input to a symbol
 * Enhanced with Database caching, FuzzySet and Yahoo Finance fallbacks
 */
export async function resolveSymbol(userInput: string): Promise<SymbolMapping> {
  const input = userInput.toUpperCase().trim();
  
  // 1. Try exact match from hardcoded DB first
  if (SYMBOL_DATABASE[input]) {
    return SYMBOL_DATABASE[input];
  }
  
  // 2. Try DB cache
  try {
    const cached = await db.query.symbolMappings.findFirst({
      where: eq(symbolMappings.userInput, input),
    });
    
    if (cached) {
      return {
        userInput: cached.userInput,
        symbol: cached.symbol,
        exchange: cached.exchange,
        fullTicker: cached.fullTicker,
        company: cached.company || 'Unknown',
        country: cached.country || 'Unknown',
        type: (cached.type as 'stock' | 'etf' | 'crypto') || 'stock',
        currency: 'USD', // Default
      };
    }
  } catch (error) {
    console.warn(`[SymbolResolver] DB lookup failed:`, error);
  }

  // 3. Try FuzzySet match against hardcoded DB
  const matches = fs.get(input);
  if (matches && matches[0][0] >= 0.8) {
    return SYMBOL_DATABASE[matches[0][1]];
  }
  
  // 4. Try Yahoo Finance search for unlisted symbols
  try {
    const searchResults: any = await yahooFinance.search(userInput);
    if (searchResults.quotes && searchResults.quotes.length > 0) {
      const bestMatch = searchResults.quotes[0];
      
      // Auto-detect exchange from ticker suffix or symbol
      let exchange = 'NASDAQ';
      if (bestMatch.symbol.endsWith('.NS')) exchange = 'NSE';
      else if (bestMatch.symbol.endsWith('.BO')) exchange = 'BSE';
      else if (bestMatch.symbol.endsWith('.L')) exchange = 'LSE';
      else if (bestMatch.symbol.endsWith('.T')) exchange = 'TSE';
      else if (bestMatch.exchange === 'NYQ') exchange = 'NYSE';
      else if (bestMatch.exchange === 'NMS') exchange = 'NASDAQ';
      else if (bestMatch.quoteType === 'CRYPTO') exchange = 'CRYPTO';

      const mapping: SymbolMapping = {
        userInput,
        symbol: bestMatch.symbol.split('.')[0],
        exchange,
        fullTicker: bestMatch.symbol,
        company: bestMatch.longname || bestMatch.shortname || 'Unknown',
        country: 'Global',
        type: bestMatch.quoteType === 'ETF' ? 'etf' : bestMatch.quoteType === 'CRYPTO' ? 'crypto' : 'stock',
        currency: 'USD', // Default
      };

      // Store in DB for future use
      try {
        await db.insert(symbolMappings).values({
          id: nanoid(),
          userInput: input,
          symbol: mapping.symbol,
          exchange: mapping.exchange,
          fullTicker: mapping.fullTicker,
          company: mapping.company,
          country: mapping.country,
          type: mapping.type,
        }).onConflictDoUpdate({
          target: symbolMappings.fullTicker,
          set: { updatedAt: new Date() }
        });
      } catch (dbError) {
        console.warn(`[SymbolResolver] Failed to cache mapping:`, dbError);
      }

      return mapping;
    }
  } catch (error) {
    console.warn(`[SymbolResolver] Yahoo search failed for: ${userInput}`);
  }
  
  // 5. Final Fallback: Return as-is
  return {
    userInput,
    symbol: input,
    exchange: 'NASDAQ',
    fullTicker: input,
    company: 'Unknown',
    country: 'Unknown',
    type: 'stock',
    currency: 'USD',
  };
}

export function formatForTradingView(symbol: string, exchange: string): string {
  const exchangeMap: Record<string, string> = {
    'NSE': 'NSE',
    'BSE': 'BSE',
    'NASDAQ': 'NASDAQ',
    'NYSE': 'NYSE',
    'LSE': 'LSE',
    'TSE': 'TSE',
    'CRYPTO': 'BINANCE', // Often better for TradingView
  };
  
  const validExchange = exchangeMap[exchange] || 'NASDAQ';
  return `${validExchange}:${symbol}`;
}

export function getCleanSymbol(fullTicker: string): string {
  return fullTicker.split('.')[0];
}

export function getExchangeFromTicker(fullTicker: string): string {
  if (fullTicker.endsWith('.NS')) return 'NSE';
  if (fullTicker.endsWith('.BO')) return 'BSE';
  if (fullTicker.endsWith('.L')) return 'LSE';
  if (fullTicker.endsWith('.T')) return 'TSE';
  return 'NASDAQ';
}

