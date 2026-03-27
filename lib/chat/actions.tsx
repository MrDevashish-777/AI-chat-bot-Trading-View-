import 'server-only'

import { generateText } from 'ai'
import {
  createAI,
  getMutableAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { createOpenAI } from '@ai-sdk/openai'

import { BotCard, BotMessage } from '@/components/stocks/message'

import { z } from 'zod'
import { nanoid } from '@/lib/utils'
import { SpinnerMessage } from '@/components/stocks/message'
import { Message } from '@/lib/types'
import { StockChart } from '@/components/tradingview/stock-chart'
import { StockPrice } from '@/components/tradingview/stock-price'
import { StockNews } from '@/components/tradingview/stock-news'
import { StockFinancials } from '@/components/tradingview/stock-financials'
import { StockScreener } from '@/components/tradingview/stock-screener'
import { MarketOverview } from '@/components/tradingview/market-overview'
import { MarketHeatmap } from '@/components/tradingview/market-heatmap'
import { MarketTrending } from '@/components/tradingview/market-trending'
import { ETFHeatmap } from '@/components/tradingview/etf-heatmap'
import { TradePlanner } from '@/components/tradingview/trade-planner'
import { toast } from 'sonner'
import { TechnicalAnalysis } from '@/components/tradingview/technical-analysis'
import { ForexCrossRates } from '@/components/tradingview/forex-cross-rates'
import { getMarketData } from '@/lib/services/market-data'
import { fetchNews } from '@/lib/services/news-data'
import { analyzeTechnicalIndicators } from '@/lib/services/technical-analysis'
import { resolveSymbol, formatForTradingView } from '@/lib/services/symbol-resolver'
import { db } from '@/lib/db'
import { analysis } from '@/lib/db/schema'

const jsonArrayPreprocess = (val: any) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

interface MutableAIState {
  update: (newState: any) => void
  done: (newState: any) => void
  get: () => AIState
}

const MODEL = 'llama3.1'
const TOOL_MODEL = 'llama3.1'
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'http://localhost:11434/v1'

type ComparisonSymbolObject = {
  symbol: string;
  position: "SameScale";
};

async function generateCaption(
  symbol: string,
  comparisonSymbols: ComparisonSymbolObject[],
  toolName: string,
  aiState: MutableAIState
): Promise<string> {
  const localAI = createOpenAI({
    baseURL: OPENAI_API_BASE,
    apiKey: 'ollama'
  })
  
  const stockString = comparisonSymbols.length === 0
  ? symbol
  : [symbol, ...comparisonSymbols.map(obj => obj.symbol)].join(', ');

  aiState.update({
    ...aiState.get(),
    messages: [...aiState.get().messages]
  })

  const captionSystemMessage =
    `\
You are an elite, professional-grade stock market analyst and trade planner. You specialize in Smart Money Concepts (SMC), Fair Value Gaps (FVG), Order Blocks (OB), Liquidity, Volume Analysis, and exhaustive technical indicators (RSI, MACD, EMA, VWAP).

Your goal is to provide advanced, adaptive, and highly detailed market analysis and trade execution plans.

These are the tools you have available:
1. showStockFinancials: Shows detailed financials.
2. showStockChart: Shows a premium chart. Can pre-load indicators (e.g. ["RSI@tv-basicstudies", "MACD@tv-basicstudies"]).
3. showStockPrice: Shows current price and history.
4. showStockNews: Shows latest news, volume spikes, and events.
5. showStockScreener: Finds stocks based on technical/financial filters.
6. showMarketOverview: Macro market performance.
7. showMarketHeatmap: Sector-wise performance.
8. showTrendingStocks: Top gainers/losers/active.
9. showETFHeatmap: ETF sector analysis.
10. showTechnicalAnalysis: Summary of technical gauges (Buy/Sell/Neutral).
11. showForexCrossRates: Global currency strength.
12. planTrade: Generates a professional-grade execution plan with Entry, SL, TP, and R:R.

You have just called a tool to respond to the user. Generate a professional, concise caption that highlights the technical significance (e.g. "Notice the RSI divergence and the huge volume spike on the chart").
    `

  try {
    const response = await generateText({
      model: localAI(MODEL),
      messages: [
        {
          role: 'system',
          content: captionSystemMessage
        },
        ...aiState.get().messages.map((message: any) => ({
          role: message.role,
          content: message.content,
          name: message.name
        }))
      ]
    })
    return response.text || ''
  } catch (err) {
    return '' // Send tool use without caption.
  }
}

async function restoreChatHistory(messages: Message[]) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  // Update the AI state with the provided messages, replacing the existing ones.
  // Ensure the chatId is preserved.
  aiState.update({
    chatId: aiState.get().chatId, // Keep the existing chatId
    messages: messages           // Replace the messages array
  })

  // No UI update is needed here as this action primarily updates the AI state.
  // The UI should react based on changes to the AI state.
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  try {
    const localAI = createOpenAI({
      baseURL: OPENAI_API_BASE,
      apiKey: 'ollama'
    })

    const result = await streamUI({
      model: localAI(TOOL_MODEL),
      initial: <SpinnerMessage />,
      maxRetries: 1,
      system: `\
**Role**: Elite Market Strategist & Technical Analyst.
**Capabilities**: Smart Money Concepts (SMC: FVG/OB/Liquidity), Volume Profile, Technical Confluences (indicators), Multi-timeframe analysis, Global Market Coverage.
**Instructions**: 
- If the user asks for a trade plan, set entry, SL, TP using SMC confluences. Use tool planTrade.
- For technical analysis of any stock (US or Indian like TCS, RELIANCE), use showTechnicalAnalysis.
- ALWAYS verify the symbol and exchange before calling tools.
  - TCS -> NSE:TCS
  - RELIANCE -> NSE:RELIANCE
  - AAPL -> NASDAQ:AAPL
- For volume/news/spikes, use showStockNews.
- Provide institutional-grade rationale with specific levels and price targets.
- Append "USD" to crypto tickers if needed.
- Use showStockChart for any chart request, specify indicators.
`,
      messages: [
        ...aiState.get().messages.map((message: any) => ({
          role: message.role,
          content: message.content,
          name: message.name
        }))
      ],
      text: ({ content, done, delta }: { content: string, done: boolean, delta: string }) => {
        if (!textStream) {
          textStream = createStreamableValue('')
          textNode = <BotMessage content={textStream.value} />
        }

        if (done) {
          textStream.done()
          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content
              }
            ]
          })
        } else {
          textStream.update(delta)
        }

        return textNode
      },
      tools: {
        showStockChart: {
          description:
            'Show a stock chart of a given stock. Optionally show 2 or more stocks. Use this to show the chart to the user.',
          parameters: z.object({
            symbol: z
              .string()
              .describe(
                'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
              ),
            comparisonSymbols: z.preprocess(jsonArrayPreprocess, z.array(z.object({
              symbol: z.string(),
              position: z.literal("SameScale")
            })))
              .default([])
              .describe(
                'Optional list of symbols to compare. e.g. ["MSFT", "GOOGL"]'
              ),
            indicators: z.preprocess(jsonArrayPreprocess, z.array(z.string()))
              .default([])
              .describe(
                'List of technical indicators to show. e.g. ["RSI@tv-basicstudies", "MACD@tv-basicstudies", "MAExp@tv-basicstudies", "VWAP@tv-basicstudies"]'
              )
          }),

          generate: async function* ({ symbol, comparisonSymbols, indicators }: { symbol: string, comparisonSymbols: any[], indicators: string[] }) {
            yield (
              <BotCard>
                <></>
              </BotCard>
            )

            const toolCallId = nanoid()

            const resolvedMapping = await resolveSymbol(symbol);
            const resolvedComparisonSymbols = await Promise.all(
              comparisonSymbols.map(async (cs) => {
                const mapping = await resolveSymbol(cs.symbol);
                return {
                  symbol: formatForTradingView(mapping.symbol, mapping.exchange),
                  position: cs.position
                }
              })
            );

            const tvSymbol = formatForTradingView(resolvedMapping.symbol, resolvedMapping.exchange);

            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockChart',
                      toolCallId,
                      args: { symbol, comparisonSymbols, indicators }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockChart',
                      toolCallId,
                      result: { 
                        symbol: resolvedMapping.fullTicker, 
                        comparisonSymbols: resolvedComparisonSymbols, 
                        indicators 
                      }
                    }
                  ]
                }
              ]
            })

            const caption = await generateCaption(
              resolvedMapping.fullTicker,
              resolvedComparisonSymbols,
              'showStockChart',
              aiState
            )

            return (
              <BotCard>
                <StockChart 
                  symbol={tvSymbol} 
                  comparisonSymbols={resolvedComparisonSymbols} 
                  indicators={indicators} 
                />
                {caption}
              </BotCard>
            )
          }
        },
        showStockPrice: {
          description:
            'Show the price of a given stock. Use this to show the price and price history to the user.',
          parameters: z.object({
            symbol: z
              .string()
              .describe(
                'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
              )
          }),
          generate: async function* ({ symbol }: { symbol: string }) {
            yield <BotCard><SpinnerMessage /></BotCard>
            const toolCallId = nanoid()

            const resolvedMapping = await resolveSymbol(symbol);
            const tvSymbol = formatForTradingView(resolvedMapping.symbol, resolvedMapping.exchange);

            // Fetch and store market data
            try {
              await getMarketData(resolvedMapping.fullTicker);
            } catch (error) {
              console.error('Error fetching/storing market data:', error);
            }

            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockPrice',
                      toolCallId,
                      args: { symbol }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockPrice',
                      toolCallId,
                      result: { symbol: resolvedMapping.fullTicker }
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              resolvedMapping.fullTicker,
              [],
              'showStockPrice',
              aiState
            )

            return (
              <BotCard>
                <StockPrice props={tvSymbol} />
                {caption}
              </BotCard>
            )
          }
        },
        showStockFinancials: {
          description:
            'Show the financials of a given stock. Use this to show the financials to the user.',
          parameters: z.object({
            symbol: z
              .string()
              .describe(
                'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
              )
          }),
          generate: async function* ({ symbol }: { symbol: string }) {
            yield <BotCard><SpinnerMessage /></BotCard>
            const toolCallId = nanoid()
            const resolvedMapping = await resolveSymbol(symbol);
            const tvSymbol = formatForTradingView(resolvedMapping.symbol, resolvedMapping.exchange);

            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockFinancials',
                      toolCallId,
                      args: { symbol }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockFinancials',
                      toolCallId,
                      result: { symbol: resolvedMapping.fullTicker }
                    }
                  ]
                }
              ]
            })

            const caption = await generateCaption(
              resolvedMapping.fullTicker,
              [],
              'StockFinancials',
              aiState
            )

            return (
              <BotCard>
                <StockFinancials props={tvSymbol} />
                {caption}
              </BotCard>
            )
          }
        },
        showStockNews: {
          description:
            'This tool shows the latest news and events for a stock or cryptocurrency.',
          parameters: z.object({
            symbol: z
              .string()
              .describe(
                'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
              )
          }),
          generate: async function* ({ symbol }: { symbol: string }) {
            yield <BotCard><SpinnerMessage /></BotCard>
            const toolCallId = nanoid()
            const resolvedMapping = await resolveSymbol(symbol);
            const tvSymbol = formatForTradingView(resolvedMapping.symbol, resolvedMapping.exchange);

            // Fetch and store news
            let newsData: any[] = [];
            try {
              newsData = await fetchNews(resolvedMapping.fullTicker);
            } catch (error) {
              console.error('Error fetching/storing news:', error);
            }

            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockNews',
                      toolCallId,
                      args: { symbol }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockNews',
                      toolCallId,
                      result: { symbol: resolvedMapping.fullTicker }
                    }
                  ]
                }
              ]
            })

            const caption = await generateCaption(
              resolvedMapping.fullTicker,
              [],
              'showStockNews',
              aiState
            )

            // Perform AI Sentiment Analysis if news is available
            let sentimentSummary = '';
            if (newsData.length > 0) {
              const localAI = createOpenAI({
                baseURL: OPENAI_API_BASE,
                apiKey: 'ollama'
              });
              
              const sentimentResponse = await generateText({
                model: localAI(MODEL),
                system: 'You are a financial sentiment analyst. Analyze the following news headlines and provide a brief sentiment summary (Bullish/Bearish/Neutral) and key takeaways.',
                prompt: `News for ${resolvedMapping.fullTicker}:\n${newsData.map(n => `- ${n.title}`).join('\n')}`,
              });
              
              sentimentSummary = sentimentResponse.text;
              
              // Store analysis in DB
              try {
                await db.insert(analysis).values({
                  id: nanoid(),
                  symbol: resolvedMapping.fullTicker,
                  content: sentimentSummary,
                  type: 'news-sentiment',
                  createdAt: new Date(),
                });
              } catch (e) {
                console.error('Error storing analysis:', e);
              }
            }

            return (
              <BotCard>
                <StockNews props={tvSymbol} />
                {caption}
                {sentimentSummary && (
                  <div className="mt-4 p-4 bg-muted rounded-lg text-sm border">
                    <div className="font-bold mb-2">AI Sentiment Analysis</div>
                    <div className="whitespace-pre-wrap">{sentimentSummary}</div>
                  </div>
                )}
              </BotCard>
            )
          }
        },
        showStockScreener: {
          description:
            'This tool shows a generic stock screener which can be used to find new stocks based on financial or technical parameters.',
          parameters: z.object({}),
          generate: async function* ({ }) {
            yield (
              <BotCard>
                <></>
              </BotCard>
            )

            const toolCallId = nanoid()

            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockScreener',
                      toolCallId,
                      args: {}
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockScreener',
                      toolCallId,
                      result: {}
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              'Generic',
              [],
              'showStockScreener',
              aiState
            )

            return (
              <BotCard>
                <StockScreener />
                {caption}
              </BotCard>
            )
          }
        },
        showMarketOverview: {
          description: `This tool shows an overview of today's stock, futures, bond, and forex market performance including change values, Open, High, Low, and Close values.`,
          parameters: z.object({}),
          generate: async function* ({ }) {
            yield (
              <BotCard>
                <></>
              </BotCard>
            )

            const toolCallId = nanoid()

            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showMarketOverview',
                      toolCallId,
                      args: {}
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showMarketOverview',
                      toolCallId,
                      result: {}
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              'Generic',
              [],
              'showMarketOverview',
              aiState
            )

            return (
              <BotCard>
                <MarketOverview />
                {caption}
              </BotCard>
            )
          }
        },
        showMarketHeatmap: {
          description: `This tool shows a heatmap of today's stock market performance across sectors. It is preferred over showMarketOverview if asked specifically about the stock market.`,
          parameters: z.object({}),
          generate: async function* ({ }) {
            yield (
              <BotCard>
                <></>
              </BotCard>
            )

            const toolCallId = nanoid()

            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showMarketHeatmap',
                      toolCallId,
                      args: {}
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showMarketHeatmap',
                      toolCallId,
                      result: {}
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              'Generic',
              [],
              'showMarketHeatmap',
              aiState
            )

            return (
              <BotCard>
                <MarketHeatmap />
                {caption}
              </BotCard>
            )
          }
        },
        showETFHeatmap: {
          description: `This tool shows a heatmap of today's ETF performance across sectors and asset classes. It is preferred over showMarketOverview if asked specifically about the ETF market.`,
          parameters: z.object({}),
          generate: async function* ({ }) {
            yield (
              <BotCard>
                <></>
              </BotCard>
            )

            const toolCallId = nanoid()

            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showETFHeatmap',
                      toolCallId,
                      args: {}
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showETFHeatmap',
                      toolCallId,
                      result: {}
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              'Generic',
              [],
              'showETFHeatmap',
              aiState
            )

            return (
              <BotCard>
                <ETFHeatmap />
                {caption}
              </BotCard>
            )
          }
        },
        showTrendingStocks: {
          description: `This tool shows the daily top trending stocks including the top five gaining, losing, and most active stocks based on today's performance`,
          parameters: z.object({}),
          generate: async function* ({ }) {
            yield (
              <BotCard>
                <></>
              </BotCard>
            )

            const toolCallId = nanoid()

            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showTrendingStocks',
                      toolCallId,
                      args: {}
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showTrendingStocks',
                      toolCallId,
                      result: {}
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              'Generic',
              [],
              'showTrendingStocks',
              aiState
            )

            return (
              <BotCard>
                <MarketTrending />
                {caption}
              </BotCard>
            )
          }
        },
        showTechnicalAnalysis: {
          description: `This tool shows advanced technical analysis indicators and signals for a specific stock or asset.`,
          parameters: z.object({
            symbol: z.string().describe('The ticker symbol, e.g. TCS.NS, AAPL, BTC-USD')
          }),
          generate: async function* ({ symbol }: { symbol: string }) {
            yield <BotCard><SpinnerMessage /></BotCard>

            let technicalResult: any = null;
            let resolvedMapping: any = null;
            
            try {
              resolvedMapping = await resolveSymbol(symbol);
              technicalResult = await analyzeTechnicalIndicators(resolvedMapping.fullTicker);
            } catch (error) {
              console.error('Error in technical analysis:', error);
            }

            const toolCallId = nanoid()

            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showTechnicalAnalysis',
                      toolCallId,
                      args: { symbol }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showTechnicalAnalysis',
                      toolCallId,
                      result: { 
                        symbol: resolvedMapping?.fullTicker || symbol,
                        exchange: resolvedMapping?.exchange || 'NASDAQ',
                        technicalResult 
                      }
                    }
                  ]
                }
              ]
            })

            const caption = await generateCaption(
              resolvedMapping?.fullTicker || symbol,
              [],
              'showTechnicalAnalysis',
              aiState
            )

            return (
              <BotCard>
                <div className="space-y-4">
                  <TechnicalAnalysis 
                    symbol={resolvedMapping?.symbol || symbol} 
                    exchange={resolvedMapping?.exchange || 'NASDAQ'} 
                  />
                  {technicalResult && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-xl border-2 border-primary/20 backdrop-blur-sm shadow-lg hover:shadow-primary/10 transition-all duration-300">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            technicalResult.signal.startsWith('STRONG_BUY') ? 'bg-green-500 text-white animate-pulse' :
                            technicalResult.signal.startsWith('BUY') ? 'bg-emerald-500/80 text-white' :
                            technicalResult.signal.startsWith('STRONG_SELL') ? 'bg-red-500 text-white animate-pulse' :
                            technicalResult.signal.startsWith('SELL') ? 'bg-rose-500/80 text-white' :
                            'bg-amber-500/80 text-white'
                          }`}>
                            {technicalResult.signal.replace('_', ' ')}
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Signal Strength: {technicalResult.confidence.toFixed(1)}%
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {technicalResult.reasons.map((reason: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-semibold text-foreground/80 group">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary/40 group-hover:scale-150 transition-transform duration-300" />
                              {reason}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3 border-l-2 border-primary/10 pl-4">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-muted-foreground uppercase">Key Metrics</span>
                          <span className="text-[10px] font-black text-primary uppercase animate-bounce-slow">Live</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex flex-col gap-1 p-2 bg-background/40 rounded-lg border border-primary/5">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">RSI (14)</span>
                            <span className={`font-black tracking-tight ${technicalResult.indicators.rsi > 70 ? 'text-red-500' : technicalResult.indicators.rsi < 30 ? 'text-green-500' : 'text-primary'}`}>
                              {technicalResult.indicators.rsi.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 p-2 bg-background/40 rounded-lg border border-primary/5">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">ADX (14)</span>
                            <span className="font-black text-foreground tracking-tight">{technicalResult.indicators.adx.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-col gap-1 p-2 bg-background/40 rounded-lg border border-primary/5">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Vol Ratio</span>
                            <span className={`font-black tracking-tight ${technicalResult.indicators.volume.ratio > 1.5 ? 'text-emerald-500 scale-110 origin-left' : 'text-foreground'}`}>
                              {technicalResult.indicators.volume.ratio.toFixed(1)}x
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 p-2 bg-background/40 rounded-lg border border-primary/5">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Trend</span>
                            <span className="font-black text-foreground tracking-tight truncate">
                              {technicalResult.indicators.movingAverages.ma20 > technicalResult.indicators.movingAverages.ma200 ? 'BULLISH' : 'BEARISH'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {caption}
              </BotCard>
            )
          }
        },
        showForexCrossRates: {
          description: `This tool evaluates global currencies and displays their current cross rates.`,
          parameters: z.object({}),
          generate: async function* ({ }) {
            yield <BotCard><></></BotCard>

            const toolCallId = nanoid()

            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showForexCrossRates',
                      toolCallId,
                      args: {}
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showForexCrossRates',
                      toolCallId,
                      result: {}
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              'Forex',
              [],
              'showForexCrossRates',
              aiState
            )

            return (
              <BotCard>
                <ForexCrossRates />
                {caption}
              </BotCard>
            )
          }
        },
        planTrade: {
          description: 'Generate a professional-grade trade execution plan with Entry, SL, TP, and R:R.',
          parameters: z.object({
            symbol: z.string().describe('The ticker symbol, e.g. BTCUSD, AAPL, NIFTY'),
            side: z.enum(['Long', 'Short']).describe('Direction of the trade'),
            entry: z.union([z.string(), z.number()]).describe('Precise entry price or zone'),
            stopLoss: z.union([z.string(), z.number()]).describe('Stop loss level'),
            takeProfit: z.union([z.string(), z.number()]).describe('Take profit Target 1 or main target'),
            riskReward: z.union([z.string(), z.number()]).describe('R:R ratio, e.g. 3.5'),
            rationale: z.string().describe('Highly professional technical rationale including indicators, volume, and SMC confluences used.')
          }),
          generate: async function* ({ symbol, side, entry, stopLoss, takeProfit, riskReward, rationale }: { symbol: string, side: string, entry: string | number, stopLoss: string | number, takeProfit: string | number, riskReward: string | number, rationale: string }) {
            yield <BotCard><></></BotCard>
            const toolCallId = nanoid()

            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [{
                    type: 'tool-call',
                    toolName: 'planTrade',
                    toolCallId,
                    args: { symbol, side, entry, stopLoss, takeProfit, riskReward, rationale }
                  }]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [{
                    type: 'tool-result',
                    toolName: 'planTrade',
                    toolCallId,
                    result: { symbol, side, entry, stopLoss, takeProfit, riskReward, rationale }
                  }]
                }
              ]
            })

            return (
              <BotCard>
                <TradePlanner 
                  symbol={symbol}
                  side={side as 'Long' | 'Short'}
                  entry={entry}
                  stopLoss={stopLoss}
                  takeProfit={takeProfit}
                  riskReward={riskReward}
                  rationale={rationale}
                />
              </BotCard>
            )
          }
        }
      }
    })

    return {
      id: nanoid(),
      display: result.value
    }
  } catch (err: any) {
    // If key is missing, show error message that Ollama connection is missing.
    if (err.message.includes('OpenAI API key is missing.')) {
      err.message =
        'Ollama connection is missing or OPENAI_API_BASE is not set. Please ensure your Ollama Docker container is running.'
    }
    return {
      id: nanoid(),
      display: (
        <div className="border p-4">
          <div className="text-red-700 font-medium">Error: {err.message}</div>
          <a
            href="https://github.com/bklieger-groq/stockbot-on-groq/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-red-800 hover:text-red-900"
          >
            If you think something has gone wrong, create an
            <span className="ml-1" style={{ textDecoration: 'underline' }}>
              {' '}
              issue on Github.
            </span>
          </a>
        </div>
      )
    }
  }
}

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    restoreChatHistory // Add the new action here
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] }
})
