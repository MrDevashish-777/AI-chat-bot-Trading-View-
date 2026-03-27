<div align="center">
  <img src="https://framerusercontent.com/images/8rLVs8U7n7R6v7Yl7l7R7L7rLVs.png" alt="Planitt Logo" width="200" />
  <h1>Planitt Market Analyzer</h1>
  <p><strong>A Professional-Grade AI Stock Intelligence Platform</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Drizzle-ORM-orange" alt="Drizzle ORM" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Ollama-Local_LLM-white?logo=ollama" alt="Ollama" />
    <img src="https://img.shields.io/badge/Docker-Enabled-blue?logo=docker" alt="Docker" />
  </p>
</div>

---

## 🌟 Overview

**Planitt Market Analyzer** is a state-of-the-art AI-driven financial intelligence platform developed for **Planitt Solutions Pvt. Ltd.** It transforms complex market data into actionable insights through a seamless conversational interface. By leveraging **Local LLMs (via Ollama)** and **Vercel AI SDK**, it provides real-time analysis, interactive charts, and deep financial metrics without external API rate limits or privacy concerns.

> [!IMPORTANT]  
> **Disclaimer:** Planitt Market Analyzer is for research and educational purposes only. It does not provide financial advice. Always consult with a professional advisor before making investment decisions.

---

## ✨ Key Features

- 🤖 **Local AI Brain**: Powered by Ollama (LLaMA 3), ensuring high-speed, secure, and private AI inference.
- 📊 **Interactive TradingView Charts**: Dynamic, real-time candlestick charts and technical indicators integrated directly into the chat.
- 🏦 **Deep Financials**: Detailed breakdown of company financials, balance sheets, and key performance indicators.
- 📰 **AI-Driven News Analysis**: Real-time news fetching with sentiment analysis to identify market-moving stories.
- 🔍 **Advanced Filtering**: Built-in stock screeners and heatmaps to discover trending assets and sectors.
- ⚡ **Lightning Fast**: Optimized with Next.js 15 and Turbo for a near-instant user experience.
- 🔒 **Privacy-First**: Your data stays local. No external AI APIs are required for the core intelligence engine.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), TailwindCSS, Framer Motion, Radix UI.
- **Backend**: Next.js Server Actions, Vercel AI SDK.
- **Database**: PostgreSQL with Drizzle ORM for high-performance data management.
- **AI Engine**: Ollama (Local LLaMA 3 implementation via Docker).
- **Data Providers**: Yahoo Finance, Alpha Vantage, Finnhub, TradingView Widgets.

---

## 📑 Interactive Interfaces

Explore the market through various specialized components:

| Feature | Description |
| :--- | :--- |
| **Market Heatmap** | Interactive visualization of daily sector and asset performance. |
| **Financial Deep-Dive** | Detailed metrics (P/E, EPS, Dividend Yield) and trend analysis. |
| **Live Charts** | Professional candlestick charts with real-time price history from TradingView. |
| **Technical Analysis** | Built-in indicators (RSI, Moving Averages, MACD) to gauge momentum. |
| **Stock Screener** | Discover new opportunities with customizable filters and criteria. |
| **Forex & Bonds** | Comprehensive monitoring of global currencies and fixed-income markets. |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/)
- [Node.js (v20+)](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation)

### 2. Environment Setup
Clone the repository and set up your environment:
```bash
cp .env.example .env
```
Ensure your `.env` contains the following for local Ollama support:
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/planitt_market_analyzer

# AI Configuration (Local Ollama)
OPENAI_API_BASE=http://localhost:11434/v1
OPENAI_MODEL=llama3
```

### 3. Spin up Infrastructure
Run the local database and Ollama instance using Docker:
```bash
docker-compose up -d
```

### 4. Database Initialization
Run migrations and seed the database with initial data:
```bash
pnpm db:push
pnpm seed
```

### 5. Start Development Server
```bash
pnpm install
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to start your analysis.

---

## 📁 Project Structure

```text
├── app/              # Next.js App Router (UI & API Routes)
├── components/       # Reusable UI components & Market Widgets
├── lib/              # Core logic, Database Schema, AI Handlers
├── public/           # Static assets (images, icons)
├── scripts/          # Database seeding and utility scripts
├── docker-compose.yml # Infrastructure orchestration
└── drizzle.config.ts # Database ORM configuration
```

---

## 🤝 Contributing

We welcome contributions! Please feel free to submit pull requests or open issues for feature requests and bug reports.

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for more details.

---
<div align="center">
  Proudly developed for <strong>Planitt Solutions Pvt. Ltd.</strong>
</div>
