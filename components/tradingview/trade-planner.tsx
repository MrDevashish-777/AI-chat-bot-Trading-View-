'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  TargetIcon, 
  LockClosedIcon, 
  InfoCircledIcon,
  LightningBoltIcon
} from '@radix-ui/react-icons'
import { cn } from '@/lib/utils'

interface TradePlannerProps {
  symbol: string
  side: 'Long' | 'Short'
  entry: string | number
  stopLoss: string | number
  takeProfit: string | number
  rationale: string
  riskReward: string | number
  positionSize?: string
}

export function TradePlanner({
  symbol,
  side,
  entry,
  stopLoss,
  takeProfit,
  rationale,
  riskReward,
  positionSize = "2% of Account"
}: TradePlannerProps) {
  const isLong = side.toLowerCase() === 'long'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="group relative my-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-1 shadow-2xl backdrop-blur-xl"
    >
      {/* Animated Gradient Border Effect */}
      <div className={cn(
        "absolute -inset-[2px] opacity-20 transition-opacity group-hover:opacity-40",
        isLong ? "bg-emerald-500/50" : "bg-rose-500/50"
      )} />
      
      <div className="relative flex flex-col rounded-xl bg-zinc-950/80 p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl shadow-inner",
              isLong ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            )}>
              {isLong ? <ArrowUpIcon className="h-6 w-6" /> : <ArrowDownIcon className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white">{symbol}</h3>
              <p className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                isLong ? "text-emerald-400" : "text-rose-400"
              )}>
                {side} Execution Plan
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white">{riskReward}:1</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Risk : Reward</div>
          </div>
        </div>

        {/* Levels Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Entry */}
          <div className="relative overflow-hidden rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              <LightningBoltIcon className="h-3 w-3 text-amber-400" />
              Entry Level
            </div>
            <div className="text-lg font-bold text-white">{entry}</div>
          </div>

          {/* Stop Loss */}
          <div className="relative overflow-hidden rounded-xl bg-rose-500/5 p-4 transition-colors hover:bg-rose-500/10">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-rose-400">
              <LockClosedIcon className="h-3 w-3" />
              Invalidation (SL)
            </div>
            <div className="text-lg font-bold text-rose-200">{stopLoss}</div>
          </div>

          {/* Take Profit */}
          <div className="relative overflow-hidden rounded-xl bg-emerald-500/5 p-4 transition-colors hover:bg-emerald-500/10">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              <TargetIcon className="h-3 w-3" />
              Target (TP)
            </div>
            <div className="text-lg font-bold text-emerald-200">{takeProfit}</div>
          </div>
        </div>

        {/* Rationale Section */}
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <InfoCircledIcon className="h-3 w-3" />
            Strategic Rationale
          </div>
          <p className="text-sm leading-relaxed text-zinc-300 italic">
            "{rationale}"
          </p>
          <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-3">
             <span className="text-[10px] font-semibold text-zinc-500">Risk Management:</span>
             <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white">{positionSize}</span>
          </div>
        </div>

        {/* Dynamic Visualizer (CSS purely) */}
        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
           <div 
             className={cn(
               "h-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]",
               isLong ? "bg-emerald-500" : "bg-rose-500"
             )} 
             style={{ width: '100%' }} 
           />
        </div>
      </div>
    </motion.div>
  )
}
