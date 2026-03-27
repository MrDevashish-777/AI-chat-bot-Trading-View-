'use client'

import React, { useEffect, useRef, memo } from 'react'

const ForexCrossRatesComponent = () => {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return
    const containerElement = container.current
    if (containerElement.children.length === 0) {
      const script = document.createElement('script')
      script.src =
        'https://s3.tradingview.com/external-embedding/embed-widget-forex-cross-rates.js'
      script.type = 'text/javascript'
      script.async = true
      script.innerHTML = `
        {
          "width": "100%",
          "height": 400,
          "currencies": [
            "EUR",
            "USD",
            "JPY",
            "GBP",
            "CHF",
            "AUD",
            "CAD",
            "NZD",
            "CNY",
            "INR"
          ],
          "isTransparent": false,
          "colorTheme": "dark",
          "locale": "en"
        }`
      containerElement.appendChild(script)
    }

    return () => {
      if (containerElement) {
        containerElement.innerHTML = ''
      }
    }
  }, [])

  return (
    <div
      className="tradingview-widget-container"
      ref={container}
      style={{ height: '400px', width: '100%' }}
    >
      <div className="tradingview-widget-container__widget"></div>
    </div>
  )
}

export const ForexCrossRates = memo(ForexCrossRatesComponent)
