'use client'

import React, { useEffect, useRef, memo } from 'react'

interface TechnicalAnalysisProps {
  symbol?: string
  exchange?: string
  interval?: string
}

const TechnicalAnalysisComponent = ({ 
  symbol = "AAPL", 
  exchange = "NASDAQ",
  interval = "1m"
}: TechnicalAnalysisProps) => {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return
    const containerElement = container.current
    containerElement.innerHTML = '' // Clear previous widget
    
    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      "interval": interval,
      "width": "100%",
      "isTransparent": false,
      "height": "450",
      "symbol": `${exchange}:${symbol}`,
      "showIntervalTabs": true,
      "displayMode": "single",
      "locale": "en",
      "colorTheme": "dark"
    })
    containerElement.appendChild(script)

    return () => {
      if (containerElement) {
        containerElement.innerHTML = ''
      }
    }
  }, [symbol, exchange, interval])

  return (
    <div
      className="tradingview-widget-container"
      ref={container}
      style={{ height: '450px', width: '100%' }}
    >
      <div className="tradingview-widget-container__widget"></div>
    </div>
  )
}

export const TechnicalAnalysis = memo(TechnicalAnalysisComponent)
