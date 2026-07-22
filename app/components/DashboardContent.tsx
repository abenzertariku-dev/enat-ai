'use client'

import { useMemo } from 'react'
import { Users, TrendingUp, Wallet, Clock, Zap, Inbox, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts'

interface Transaction {
  id: string
  customer: { name: string }
  product: string
  amount: number
  status: 'paid' | 'unpaid'
  date: string
}

interface TopCustomer {
  id: string
  name: string
  totalDebt: number
}

interface DashboardContentProps {
  /** Authoritative debt ranking from Customer.totalDebt (route-computed, not derived from the capped transaction list) */
  topCustomers?: TopCustomer[]
  stats: {
    totalSales: number
    totalDebt: number
    totalTransactions: number
    outstandingCustomers: number
  }
  transactions: Transaction[]
  onMarkAsPaid: (id: string) => void
  onAddSample: () => void
  isLoading: boolean
}

const COLORS = {
  emerald: '#0F6B4C',
  gold: '#E5A823',
  brick: '#C1442E',
  ink: '#1F2A24',
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  suffix,
}: {
  icon: any
  label: string
  value: string
  tone: 'emerald' | 'brick' | 'ink' | 'gold'
  suffix?: string
}) {
  const toneMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    emerald: { bg: 'bg-white', text: 'text-[#0F6B4C]', iconBg: 'bg-[#0F6B4C]/10' },
    brick: { bg: 'bg-white', text: 'text-[#C1442E]', iconBg: 'bg-[#C1442E]/10' },
    ink: { bg: 'bg-white', text: 'text-[#1F2A24]', iconBg: 'bg-[#1F2A24]/8' },
    gold: { bg: 'bg-white', text: 'text-[#B8860B]', iconBg: 'bg-[#E5A823]/15' },
  }
  const t = toneMap[tone]
  return (
    <div className={`${t.bg} rounded-2xl border border-black/5 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]`}>
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-[#1F2A24]/50">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${t.iconBg}`}>
          <Icon size={14} className={t.text} />
        </div>
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${t.text}`}>
        {value}
        {suffix && <span className="ml-1 text-sm font-semibold text-[#1F2A24]/40">{suffix}</span>}
      </p>
    </div>
  )
}

export default function DashboardContent({
  stats,
  transactions,
  topCustomers,
  onMarkAsPaid,
  onAddSample,
  isLoading,
}: DashboardContentProps) {
  // Last 7 days of sales, derived from the transactions you already have —
  // no extra data plumbing required.
  const salesTrend = useMemo(() => {
    const days: { key: string; label: string; sales: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({
        key: d.toDateString(),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        sales: 0,
      })
    }
    transactions.forEach((t) => {
      const key = new Date(t.date).toDateString()
      const day = days.find((d) => d.key === key)
      if (day) day.sales += t.amount
    })
    return days
  }, [transactions])

  const topDebtors = useMemo(() => {
    if (topCustomers && topCustomers.length > 0) {
      return topCustomers.map((c) => ({ name: c.name, amount: c.totalDebt }))
    }
    // Fallback if topCustomers wasn't passed: derive from the visible transactions.
    // Less accurate once a merchant has more than 50 transactions — prefer passing topCustomers.
    const map = new Map<string, number>()
    transactions
      .filter((t) => t.status === 'unpaid')
      .forEach((t) => {
        map.set(t.customer.name, (map.get(t.customer.name) || 0) + t.amount)
      })
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [topCustomers, transactions])

  const weekTotal = salesTrend.reduce((s, d) => s + d.sales, 0)
  const trendDelta = (() => {
    const half = Math.floor(salesTrend.length / 2)
    const first = salesTrend.slice(0, half).reduce((s, d) => s + d.sales, 0)
    const second = salesTrend.slice(half).reduce((s, d) => s + d.sales, 0)
    if (first === 0) return second > 0 ? 100 : 0
    return Math.round(((second - first) / first) * 100)
  })()

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Wallet} label="Today's Sales" tone="emerald" value={`${stats.totalSales.toLocaleString()}`} suffix="Br" />
        <StatCard icon={Clock} label="Outstanding" tone="brick" value={`${stats.totalDebt.toLocaleString()}`} suffix="Br" />
        <StatCard icon={Users} label="Customers" tone="gold" value={`${stats.outstandingCustomers}`} />
        <StatCard icon={TrendingUp} label="Transactions" tone="ink" value={`${stats.totalTransactions}`} />
      </div>

      {/* Sales trend chart */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[13px] font-semibold text-[#1F2A24]/70">Sales, last 7 days</h2>
            <p className="mt-0.5 text-xl font-bold tracking-tight text-[#1F2A24]">
              {weekTotal.toLocaleString()} <span className="text-sm font-semibold text-[#1F2A24]/40">Br</span>
            </p>
          </div>
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-semibold ${
              trendDelta >= 0 ? 'bg-[#0F6B4C]/10 text-[#0F6B4C]' : 'bg-[#C1442E]/10 text-[#C1442E]'
            }`}
          >
            {trendDelta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trendDelta)}%
          </span>
        </div>

        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={COLORS.emerald} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(31,42,36,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'rgba(31,42,36,0.4)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ stroke: COLORS.emerald, strokeWidth: 1, strokeDasharray: '3 3' }}
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.06)',
                  fontSize: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
               formatter={(value) => [
  `${Number(value).toLocaleString()} Br`,
  "Sales",
]}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke={COLORS.emerald}
                strokeWidth={2}
                fill="url(#salesFill)"
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top outstanding customers */}
      {topDebtors.length > 0 && (
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="text-[13px] font-semibold text-[#1F2A24]/70">Biggest outstanding balances</h2>
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDebtors} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={84}
                  tick={{ fontSize: 11.5, fill: 'rgba(31,42,36,0.6)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(193,68,46,0.06)' }}
                  contentStyle={{ borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', fontSize: 12 }}
                 formatter={(value) => [
  `${Number(value).toLocaleString()} Br`,
  "Owed",
]}
                />
                <Bar dataKey="amount" fill={COLORS.brick} radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quick Demo */}
      <button
        onClick={onAddSample}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F6B4C] p-3 font-medium text-white transition hover:bg-[#0B5A3F] disabled:opacity-50"
      >
        <Zap size={16} />
        {isLoading ? 'Processing…' : 'Quick demo: add sample transaction'}
      </button>

      {/* Transactions List */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="mb-3 text-[13.5px] font-semibold text-[#1F2A24]">Recent transactions</h2>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="py-10 text-center text-[#1F2A24]/35">
              <Inbox size={30} className="mx-auto mb-2" />
              <p className="text-[13.5px] font-medium text-[#1F2A24]/60">No transactions yet</p>
              <p className="text-[12px]">Add one using Scan or Voice.</p>
            </div>
          ) : (
            transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl bg-[#FBF9F5] p-3 transition hover:bg-[#F3EFE6]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-[#1F2A24]">{t.customer.name}</p>
                  <div className="flex items-center gap-2 text-[12px] text-[#1F2A24]/45">
                    <span className="truncate">{t.product}</span>
                    <span className="h-0.5 w-0.5 rounded-full bg-[#1F2A24]/25" />
                    <span>{new Date(t.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="ml-2 flex-shrink-0 text-right">
                  <p className={`font-bold ${t.status === 'unpaid' ? 'text-[#C1442E]' : 'text-[#0F6B4C]'}`}>
                    {t.amount.toLocaleString()} Br
                  </p>
                  <div className="mt-0.5 flex items-center justify-end gap-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${
                        t.status === 'unpaid' ? 'bg-[#C1442E]/10 text-[#C1442E]' : 'bg-[#0F6B4C]/10 text-[#0F6B4C]'
                      }`}
                    >
                      {t.status === 'unpaid' ? 'Unpaid' : 'Paid'}
                    </span>
                    {t.status === 'unpaid' && (
                      <button
                        onClick={() => onMarkAsPaid(t.id)}
                        className="rounded bg-[#1F2A24]/8 px-2 py-0.5 text-[10.5px] font-semibold text-[#1F2A24]/70 transition hover:bg-[#1F2A24]/15"
                      >
                        Mark paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}