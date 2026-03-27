'use client'

import React, { useEffect, useRef, memo } from 'react'

type ComparisonSymbolObject = {
  symbol: string;
  position: "SameScale";
};

export function StockChart({ 
  symbol, 
  comparisonSymbols,
  indicators = [] 
}: { 
  symbol: string, 
  comparisonSymbols: ComparisonSymbolObject[],
  indicators?: string[]
}) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return
    const containerElement = container.current
    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark', // Changed to dark for premium feel
      style: comparisonSymbols.length === 0 ? '1' : '2',
      hide_volume: false, // Always show volume as per user request
      locale: 'en',
      backgroundColor: 'rgba(0, 0, 0, 1)',
      gridColor: 'rgba(20, 20, 20, 1)',
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      compareSymbols: comparisonSymbols,
      calendar: false,
      hide_top_toolbar: false,
      studies: indicators,
      support_host: 'https://www.tradingview.com'
    })

    containerElement.appendChild(script)

    return () => {
      if (containerElement) {
        containerElement.innerHTML = ''
      }
    }
  }, [symbol, comparisonSymbols, indicators])

  return (
    <div style={{ height: '500px' }}>
      <div
        className="tradingview-widget-container"
        ref={container}
        style={{ height: '100%', width: '100%' }}
      >
        <div
          className="tradingview-widget-container__widget"
          style={{ height: 'calc(100% - 32px)', width: '100%' }}
        ></div>
        <div className="tradingview-widget-copyright">
          <a
            href="https://www.tradingview.com/"
            rel="noopener nofollow"
            target="_blank"
          >
            <span className="">Track all markets on TradingView</span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default memo(StockChart)
