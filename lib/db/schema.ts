import { pgTable, text, timestamp, doublePrecision, varchar, jsonb, boolean } from 'drizzle-orm/pg-core';

export const stocks = pgTable('stocks', {
  id: varchar('id', { length: 255 }).primaryKey(),
  symbol: varchar('symbol', { length: 50 }).unique().notNull(), // Increased length for full tickers
  name: varchar('name', { length: 255 }),
  sector: varchar('sector', { length: 100 }),
  industry: varchar('industry', { length: 100 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const stockPrices = pgTable('stock_prices', {
  id: varchar('id', { length: 255 }).primaryKey(),
  stockId: varchar('stock_id', { length: 255 }).references(() => stocks.id),
  price: doublePrecision('price').notNull(),
  change: doublePrecision('change'),
  changePercent: doublePrecision('change_percent'),
  volume: doublePrecision('volume'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const news = pgTable('news', {
  id: varchar('id', { length: 255 }).primaryKey(),
  symbol: varchar('symbol', { length: 20 }),
  title: text('title').notNull(),
  content: text('content'),
  url: text('url'),
  source: varchar('source', { length: 100 }),
  publishedAt: timestamp('published_at'),
  sentiment: varchar('sentiment', { length: 20 }), // positive, negative, neutral
  relevance: doublePrecision('relevance'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const analysis = pgTable('analysis', {
  id: varchar('id', { length: 255 }).primaryKey(),
  symbol: varchar('symbol', { length: 20 }),
  content: text('content').notNull(),
  type: varchar('type', { length: 50 }), // technical, fundamental, smc
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// New table: symbol_mappings
export const symbolMappings = pgTable('symbol_mappings', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userInput: varchar('user_input', { length: 50 }).notNull(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  exchange: varchar('exchange', { length: 20 }).notNull(),
  fullTicker: varchar('full_ticker', { length: 50 }).unique().notNull(),
  company: varchar('company', { length: 255 }),
  country: varchar('country', { length: 50 }),
  type: varchar('type', { length: 20 }), // stock, etf, crypto
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// New table: technical_indicators
export const technicalIndicators = pgTable('technical_indicators', {
  id: varchar('id', { length: 255 }).primaryKey(),
  stockId: varchar('stock_id', { length: 255 }).references(() => stocks.id),
  rsi: doublePrecision('rsi'),
  macd: jsonb('macd'), // { line, signal, histogram }
  movingAverages: jsonb('moving_averages'), // { ma20, ma50, ma200 }
  bollingerBands: jsonb('bollinger_bands'), // { upper, middle, lower }
  atr: doublePrecision('atr'),
  adx: doublePrecision('adx'),
  signal: varchar('signal', { length: 20 }), // STRONG_BUY, BUY, etc.
  confidence: doublePrecision('confidence'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// New table: market_alerts
export const marketAlerts = pgTable('market_alerts', {
  id: varchar('id', { length: 255 }).primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  alertType: varchar('alert_type', { length: 50 }), // price_breach, volume_spike, etc.
  condition: varchar('condition', { length: 255 }),
  triggered: boolean('triggered').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

