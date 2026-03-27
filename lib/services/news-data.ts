import { db } from '../db';
import { news } from '../db/schema';
import { nanoid } from '@/lib/utils';

const NEWS_API_KEY = process.env.NEWS_API_KEY;

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
}

export async function fetchNews(symbol: string) {
  try {
    // If we have a NewsAPI key, use it. Otherwise, fallback to other sources (like RSS or just log)
    let articles: NewsArticle[] = [];

    if (NEWS_API_KEY) {
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${symbol}&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === 'ok') {
        articles = data.articles.map((a: any) => ({
          title: a.title,
          description: a.description,
          url: a.url,
          source: a.source.name,
          publishedAt: a.publishedAt,
        }));
      }
    } else {
      console.warn('NEWS_API_KEY not found. News fetching might be limited.');
      // Fallback: You could add more sources here (e.g. Google News RSS)
    }

    // Store in DB for future lookup and analysis
    for (const article of articles) {
      await db.insert(news).values({
        id: nanoid(),
        symbol: symbol,
        title: article.title,
        content: article.description,
        url: article.url,
        source: article.source,
        publishedAt: new Date(article.publishedAt),
      }).onConflictDoNothing(); // Assuming title/url could be unique if we added a constraint
    }

    return articles;
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}
