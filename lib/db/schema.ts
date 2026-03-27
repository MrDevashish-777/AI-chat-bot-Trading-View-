import { pgTable, text, timestamp, doublePrecision, varchar, jsonb } from 'drizzle-orm/pg-core';

export const stocks = pgTable('stocks', {
  id: varchar('id', { length: 255 }).primaryKey(),
  symbol: varchar('symbol', { length: 20 }).unique().notNull(),
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
