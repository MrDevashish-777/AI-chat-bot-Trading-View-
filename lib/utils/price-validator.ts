/**
 * Price Validation Utilities
 * Validates market data for accuracy and consistency
 */

export interface PriceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that price data makes sense
 * Checks for reasonable ranges and data consistency
 */
export function validatePrice(
  price: number,
  previousPrice?: number,
  currency?: string
): PriceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if price is a valid number
  if (typeof price !== 'number' || isNaN(price)) {
    errors.push('Price is not a valid number');
    return { isValid: false, errors, warnings };
  }

  // Check if price is positive
  if (price <= 0) {
    errors.push('Price must be greater than zero');
    return { isValid: false, errors, warnings };
  }

  // Sanity check: price shouldn't be unreasonably high for most stocks
  // (Some penny stocks can be <$1, some tech stocks can be >$1000)
  if (price > 100000) {
    warnings.push(
      'Price is unusually high (>$100,000). Verify this is correct.'
    );
  }

  if (price < 0.0001) {
    warnings.push(
      'Price is very low (<$0.0001). This might be a penny stock or data error.'
    );
  }

  // If we have a previous price, check for unreasonable changes
  if (previousPrice && previousPrice > 0) {
    const percentChange = ((price - previousPrice) / previousPrice) * 100;

    // Flag extreme price movements (>50% in a single day)
    if (Math.abs(percentChange) > 50) {
      warnings.push(
        `Extreme price movement detected: ${percentChange.toFixed(2)}%. Verify this is correct.`
      );
    }

    // Flag impossible price drops (>95%)
    if (percentChange < -95) {
      errors.push(
        `Price drop is suspiciously large (${percentChange.toFixed(2)}%). This may indicate a data error.`
      );
      return { isValid: false, errors, warnings };
    }
  }

  return { isValid: true, errors, warnings };
}

/**
 * Validate market data object
 */
export function validateMarketData(data: any): PriceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data) {
    errors.push('Market data is null or undefined');
    return { isValid: false, errors, warnings };
  }

  // Check required fields
  const requiredFields = ['price', 'symbol'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Validate price
  const priceValidation = validatePrice(data.price);
  errors.push(...priceValidation.errors);
  warnings.push(...priceValidation.warnings);

  // Validate change and changePercent are consistent
  if (
    typeof data.change === 'number' &&
    typeof data.changePercent === 'number' &&
    data.change !== 0
  ) {
    // These should be related: changePercent = (change / oldPrice) * 100
    // We'll allow some tolerance for rounding
    const tolerance = 0.5; // 0.5% tolerance

    if (Math.abs(data.changePercent) > tolerance) {
      // Can't validate without old price, just warn if they seem inconsistent
      if ((data.change > 0) !== (data.changePercent > 0)) {
        warnings.push(
          'Change and changePercent have different signs. This may indicate a data error.'
        );
      }
    }
  }

  // Check timestamp
  if (data.timestamp) {
    const timestamp = new Date(data.timestamp);
    const now = new Date();
    const ageHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

    if (ageHours > 24 && ageHours < 72) {
      warnings.push(
        `Market data is ${ageHours.toFixed(1)} hours old. May be stale.`
      );
    } else if (ageHours >= 72) {
      errors.push(`Market data is ${ageHours.toFixed(1)} hours old. Data is too stale.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if prices match expected exchange patterns
 */
export function validatePriceForExchange(
  price: number,
  exchange: string
): PriceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Indian stocks are typically in rupees (1000s to 10,000s range for large cap)
  if (exchange === 'NSE' || exchange === 'BSE') {
    if (price < 10) {
      warnings.push(
        'Price seems low for NSE/BSE stock. Verify exchange is correct.'
      );
    }
    if (price > 100000) {
      warnings.push(
        'Price seems very high for NSE/BSE stock. Verify exchange is correct.'
      );
    }
  }

  // US stocks are typically in dollars
  if (exchange === 'NASDAQ' || exchange === 'NYSE') {
    // Most US stocks are $5-$500 range (though some are higher)
    if (price > 10000) {
      warnings.push(
        'Price is unusually high for US market. Verify symbol and exchange.'
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  return formatter.format(price);
}

/**
 * Format percentage change for display
 */
export function formatPercentChange(
  change: number,
  decimals: number = 2
): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(decimals)}%`;
}
