/**
 * Error Handler for Market Data and Analysis
 * Provides structured error responses and fallback strategies
 */

export class MarketDataError extends Error {
  constructor(
    public symbol: string,
    public exchange: string,
    public originalError: Error,
    public fallbackData?: any
  ) {
    const message = `Failed to fetch data for ${exchange}:${symbol}`;
    super(message);
    this.name = 'MarketDataError';
  }
}

/**
 * Handle market data fetching errors
 * Implements fallback strategies (secondary API or cached data)
 */
export async function handleMarketDataError(
  error: Error,
  symbol: string,
  exchange: string,
  fallbackFn?: () => Promise<any>
): Promise<any> {
  console.error(`[ErrorHandler] Error for ${exchange}:${symbol}:`, error.message);
  
  // 1. Log error with context
  // 2. Try fallback function if provided
  if (fallbackFn) {
    try {
      console.log(`[ErrorHandler] Trying fallback for ${symbol}...`);
      return await fallbackFn();
    } catch (fallbackError: any) {
      console.error(`[ErrorHandler] Fallback failed for ${symbol}:`, fallbackError.message);
    }
  }
  
  // 3. Rethrow structured error
  throw new MarketDataError(symbol, exchange, error);
}

/**
 * Common data validation logic
 */
export function validateResponse(data: any): boolean {
  if (!data) return false;
  if (Array.isArray(data) && data.length === 0) return false;
  return true;
}

/**
 * Format error for UI display
 */
export function formatErrorForUI(error: any): string {
  if (error instanceof MarketDataError) {
    return `Analysis failed for ${error.symbol} on ${error.exchange}. Please verify the ticker and ensure it is still active.`;
  }
  
  if (error.message?.includes('Insufficient historical data')) {
    return `The system needs at least 50 days of trading history to perform technical analysis for this symbol.`;
  }
  
  return error.message || 'An unexpected market data error occurred. Please try again later.';
}
