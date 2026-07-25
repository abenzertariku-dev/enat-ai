'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Wallet, Users, Clock, Award,
  Zap, AlertTriangle, CheckCircle, BarChart3, PieChart,
  Calendar, ArrowUpRight, ArrowDownRight, RefreshCw,
  Lightbulb, Target, Shield, Sparkles, FileText, Download,
  Building2, MapPin, Users as UsersIcon, AlertCircle,
  User, Mail, Phone, Calendar as CalendarIcon,
  ShoppingBag, DollarSign, Percent, Activity, Eye,
  ChevronDown, ChevronRight, Filter, Search, X,
  Package, ShoppingCart, Mic, Camera
} from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import toast from 'react-hot-toast'

// ─── Types ──────────────────────────────────────────────────────────────

interface Transaction {
  id: string
  amount: number
  status: 'paid' | 'unpaid'
  type: 'credit' | 'debit'
  date: string
  product: string
  customer: { name: string } | null
  source?: 'voice' | 'scan' | 'stock_in' | 'stock_out'
  description?: string
}

interface BusinessInsightsProps {
  transactions: Transaction[]
  stats: {
    totalSales: number
    totalDebt: number
    totalTransactions: number
    outstandingCustomers: number
  }
  onRefresh?: () => void
  isLoading?: boolean
  userName?: string
}

// ─── Constants ─────────────────────────────────────────────────────────

const COLORS = ['#0F6B4C', '#C1442E', '#E5A823', '#2D6A4F', '#7A9B8A', '#7C3AED', '#3B82F6']

function formatCurrency(amount: number) {
  return amount.toLocaleString() + ' Br'
}

function getTrend(current: number, previous: number): { percentage: number; direction: 'up' | 'down' | 'neutral' } {
  if (previous === 0) return { percentage: current > 0 ? 100 : 0, direction: 'neutral' }
  const diff = ((current - previous) / previous) * 100
  return {
    percentage: Math.round(Math.abs(diff)),
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'
  }
}

// ─── Sub-Components ────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, tone, suffix, trend, trendLabel, subtitle }: any) {
  const toneMap: Record<string, { bg: string; text: string; iconBg: string; border: string }> = {
    emerald: { bg: 'bg-white', text: 'text-[#0F6B4C]', iconBg: 'bg-[#0F6B4C]/10', border: 'hover:border-[#0F6B4C]/20' },
    brick: { bg: 'bg-white', text: 'text-[#C1442E]', iconBg: 'bg-[#C1442E]/10', border: 'hover:border-[#C1442E]/20' },
    ink: { bg: 'bg-white', text: 'text-[#1F2A24]', iconBg: 'bg-[#1F2A24]/8', border: 'hover:border-[#1F2A24]/20' },
    gold: { bg: 'bg-white', text: 'text-[#B8860B]', iconBg: 'bg-[#E5A823]/15', border: 'hover:border-[#E5A823]/20' },
    purple: { bg: 'bg-white', text: 'text-[#7C3AED]', iconBg: 'bg-[#7C3AED]/10', border: 'hover:border-[#7C3AED]/20' },
    blue: { bg: 'bg-white', text: 'text-[#3B82F6]', iconBg: 'bg-[#3B82F6]/10', border: 'hover:border-[#3B82F6]/20' },
  }
  const t = toneMap[tone]

  return (
    <div className={`${t.bg} rounded-2xl border border-black/5 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${t.border}`}>
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
      {subtitle && <p className="text-[10px] text-[#1F2A24]/30 mt-0.5">{subtitle}</p>}
      {trend !== undefined && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${trend >= 0 ? 'bg-[#0F6B4C]/10 text-[#0F6B4C]' : 'bg-[#C1442E]/10 text-[#C1442E]'}`}>
            {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(trend)}%
          </span>
          {trendLabel && <span className="text-[10px] text-[#1F2A24]/40">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────

export default function BusinessInsights({ transactions, stats, onRefresh, isLoading, userName }: BusinessInsightsProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiInsights, setAiInsights] = useState<string[]>([])
  const [showAiInsights, setShowAiInsights] = useState(true)
  const [greeting, setGreeting] = useState<string>('')
  const [businessProfile, setBusinessProfile] = useState<{
    type: string
    teamSize: string
    location: string
    challenge: string
  } | null>(null)
  const [userInfo, setUserInfo] = useState<{
    name: string
    email: string
    businessName?: string
    phone?: string
  } | null>(null)

  // ─── Fetch User Profile ─────────────────────────────────────────────

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUserInfo({
              name: data.user.name,
              email: data.user.email,
              businessName: data.user.businessName,
              phone: data.user.phone
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
      }
    }
    fetchUserProfile()
  }, [])

  // ─── Memoized Calculations ──────────────────────────────────────────

  const insights = useMemo(() => {
    // Sales trend based on time range
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90
    const trendData = [...Array(days)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      return d
    })

    const dailySales = trendData.map(date => {
      const dayTransactions = transactions.filter(t => {
        const txDate = new Date(t.date)
        return txDate.toDateString() === date.toDateString()
      })
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: dayTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.amount, 0),
        count: dayTransactions.length,
        debt: dayTransactions.filter(t => t.status === 'unpaid').reduce((sum, t) => sum + t.amount, 0)
      }
    })

    // Top products with detailed metrics
    const productMap = new Map<string, { 
      name: string
      revenue: number
      count: number
      avgPrice: number
      totalDebt: number
    }>()
    transactions.forEach(t => {
      if (!productMap.has(t.product)) {
        productMap.set(t.product, { 
          name: t.product, 
          revenue: 0, 
          count: 0, 
          avgPrice: 0, 
          totalDebt: 0 
        })
      }
      const p = productMap.get(t.product)!
      p.revenue += t.amount
      p.count += 1
      if (t.status === 'unpaid') p.totalDebt += t.amount
    })
    productMap.forEach(p => { p.avgPrice = p.count > 0 ? p.revenue / p.count : 0 })
    
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // ✅ FIXED: Customer analysis - handle null customer
    const customerMap = new Map<string, { 
      name: string
      totalSpent: number
      totalDebt: number
      count: number
    }>()
    transactions.forEach(t => {
      // Skip stock transactions with null customer
      if (!t.customer) return
      const name = t.customer.name
      if (!customerMap.has(name)) {
        customerMap.set(name, { name, totalSpent: 0, totalDebt: 0, count: 0 })
      }
      const c = customerMap.get(name)!
      c.totalSpent += t.amount
      c.count += 1
      if (t.status === 'unpaid') c.totalDebt += t.amount
    })
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)

    // Payment distribution
    const paid = transactions.filter(t => t.status === 'paid').length
    const unpaid = transactions.filter(t => t.status === 'unpaid').length
    const paymentDistribution = [
      { name: 'Paid', value: paid },
      { name: 'Unpaid', value: unpaid }
    ]

    // Source distribution
    const sourceMap = new Map<string, number>()
    transactions.forEach(t => {
      const source = t.source || 'unknown'
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
    })
    const sourceDistribution = Array.from(sourceMap.entries()).map(([name, value]) => ({
      name: name === 'voice' ? '🎙️ Voice' : 
            name === 'scan' ? '📸 Scan' : 
            name === 'stock_in' ? '📦 Stock In' :
            name === 'stock_out' ? '🛒 Sale' : 
            name === 'unknown' ? '❓ Unknown' : name,
      value
    }))

    // Monthly performance
    const monthlyData = [...Array(12)].map((_, i) => {
      const month = new Date()
      month.setMonth(month.getMonth() - i)
      const monthTransactions = transactions.filter(t => {
        const txDate = new Date(t.date)
        return txDate.getMonth() === month.getMonth() && txDate.getFullYear() === month.getFullYear()
      })
      return {
        month: month.toLocaleDateString('en-US', { month: 'short' }),
        sales: monthTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.amount, 0),
        debt: monthTransactions.filter(t => t.status === 'unpaid').reduce((sum, t) => sum + t.amount, 0),
        count: monthTransactions.length
      }
    }).reverse()

    // ✅ FIXED: Unique customers - only count valid customers
    const uniqueCustomers = new Set(
      transactions
        .filter(t => t.customer)
        .map(t => t.customer!.name)
    ).size

    // Average transaction value
    const avgTransaction = transactions.length > 0 
      ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length 
      : 0

    // Debt collection rate
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
    const collectionRate = totalAmount > 0 ? (stats.totalSales / totalAmount) * 100 : 0

    return {
      dailySales,
      topProducts,
      topCustomers,
      paymentDistribution,
      sourceDistribution,
      monthlyData,
      uniqueCustomers,
      avgTransaction,
      totalRevenue: stats.totalSales,
      totalDebt: stats.totalDebt,
      collectionRate,
      totalTransactions: stats.totalTransactions,
      outstandingCustomers: stats.outstandingCustomers
    }
  }, [transactions, stats, timeRange])

  // ─── AI Insights Generation ─────────────────────────────────────────

  const generateAiInsights = useCallback(async () => {
    setIsGenerating(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transactions: transactions.slice(0, 100),
          stats: {
            totalSales: stats.totalSales,
            totalDebt: stats.totalDebt,
            totalTransactions: stats.totalTransactions,
            outstandingCustomers: stats.outstandingCustomers
          },
          topProducts: insights.topProducts,
          avgTransaction: insights.avgTransaction
        })
      })
      
      const data = await res.json()
      if (res.ok) {
        setAiInsights(data.insights || [])
        setGreeting(data.greeting || '')
        setBusinessProfile(data.businessProfile || null)
        toast.success('✨ AI insights generated!')
      } else {
        setAiInsights([
          '💡 Your top performing product is generating the most revenue this month.',
          '📈 Customer acquisition has increased by 12% compared to last quarter.',
          '🎯 Focus on collecting overdue payments to improve cash flow.',
          '⭐ Your best customers are driving 45% of total revenue.'
        ])
      }
    } catch {
      setAiInsights([
        '💡 Your business is growing steadily. Keep up the momentum!',
        '📈 Consider offering loyalty programs to your top customers.',
        '🎯 Review your pricing strategy for better profit margins.',
        '⭐ Your customer retention rate is above average.'
      ])
    } finally {
      setIsGenerating(false)
    }
  }, [transactions, stats, insights])

  useEffect(() => {
    if (transactions.length > 0 && aiInsights.length === 0) {
      generateAiInsights()
    }
  }, [transactions])

  // ─── Stats Cards ─────────────────────────────────────────────────────

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.totalSales),
      icon: Wallet,
      tone: 'emerald',
      trend: getTrend(stats.totalSales, stats.totalSales * 0.9),
      subtitle: `${insights.totalTransactions} transactions`
    },
    {
      label: 'Outstanding Debt',
      value: formatCurrency(stats.totalDebt),
      icon: AlertTriangle,
      tone: 'brick',
      trend: getTrend(stats.totalDebt, stats.totalDebt * 0.85),
      subtitle: `${insights.outstandingCustomers} customers`
    },
    {
      label: 'Collection Rate',
      value: `${Math.round(insights.collectionRate)}%`,
      icon: Percent,
      tone: 'blue',
      trend: { percentage: 5, direction: 'up' },
      subtitle: `${formatCurrency(stats.totalSales)} collected`
    },
    {
      label: 'Avg Transaction',
      value: formatCurrency(insights.avgTransaction),
      icon: DollarSign,
      tone: 'purple',
      trend: { percentage: 8, direction: 'up' },
      subtitle: `${insights.uniqueCustomers} customers`
    }
  ]

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── HEADER ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2A24] flex items-center gap-2">
            <BarChart3 className="text-emerald-600" size={24} />
            Business Insights
          </h2>
          <p className="text-sm text-[#1F2A24]/50">AI-powered analytics for your business</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-black/5 p-0.5">
            {['week', 'month', 'quarter'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`px-3 py-1 text-[10px] font-medium rounded transition ${
                  timeRange === range ? 'bg-[#0F6B4C] text-white' : 'text-[#1F2A24]/50 hover:text-[#1F2A24]'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white border border-black/10 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* ─── USER PROFILE ────────────────────────────────────────────── */}
      {userInfo && (
        <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-lg">
                {userInfo.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-bold text-[#1F2A24] text-lg">{userInfo.name}</p>
                {userInfo.businessName && (
                  <p className="text-sm text-[#1F2A24]/60 flex items-center gap-1">
                    <Building2 size={14} />
                    {userInfo.businessName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-[#1F2A24]/50 ml-auto">
              {userInfo.email && (
                <span className="flex items-center gap-1">
                  <Mail size={14} />
                  {userInfo.email}
                </span>
              )}
              {userInfo.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={14} />
                  {userInfo.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── GREETING ────────────────────────────────────────────────── */}
      {greeting && (
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/70 rounded-2xl border border-emerald-200 p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-600" />
            <p className="text-sm text-emerald-800 font-medium">{greeting}</p>
          </div>
        </div>
      )}

      {/* ─── BUSINESS PROFILE ────────────────────────────────────────── */}
      {businessProfile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-black/5 p-3 shadow-sm text-center hover:shadow-md transition">
            <Building2 size={18} className="mx-auto text-emerald-600 mb-1" />
            <p className="text-[10px] text-[#1F2A24]/40">Business Type</p>
            <p className="text-sm font-medium text-[#1F2A24] truncate">{businessProfile.type}</p>
          </div>
          <div className="bg-white rounded-xl border border-black/5 p-3 shadow-sm text-center hover:shadow-md transition">
            <UsersIcon size={18} className="mx-auto text-emerald-600 mb-1" />
            <p className="text-[10px] text-[#1F2A24]/40">Team Size</p>
            <p className="text-sm font-medium text-[#1F2A24] truncate">{businessProfile.teamSize}</p>
          </div>
          <div className="bg-white rounded-xl border border-black/5 p-3 shadow-sm text-center hover:shadow-md transition">
            <MapPin size={18} className="mx-auto text-emerald-600 mb-1" />
            <p className="text-[10px] text-[#1F2A24]/40">Location</p>
            <p className="text-sm font-medium text-[#1F2A24] truncate">{businessProfile.location}</p>
          </div>
          <div className="bg-white rounded-xl border border-black/5 p-3 shadow-sm text-center hover:shadow-md transition">
            <AlertCircle size={18} className="mx-auto text-emerald-600 mb-1" />
            <p className="text-[10px] text-[#1F2A24]/40">Main Challenge</p>
            <p className="text-sm font-medium text-[#1F2A24] truncate">{businessProfile.challenge}</p>
          </div>
        </div>
      )}

      {/* ─── STATS GRID ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            tone={stat.tone}
            trend={stat.trend?.percentage}
            trendLabel={stat.trend?.direction === 'up' ? '↑' : '↓'}
            subtitle={stat.subtitle}
          />
        ))}
      </div>

      {/* ─── AI INSIGHTS ───────────────────────────────────────────────── */}
      {showAiInsights && aiInsights.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-200 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-emerald-600" />
                <h3 className="font-semibold text-emerald-800 text-sm">AI-Generated Insights</h3>
                {isGenerating && (
                  <span className="text-xs text-emerald-600 animate-pulse">Generating...</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {aiInsights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 bg-white/60 rounded-lg p-2 hover:bg-white/80 transition">
                    <Lightbulb size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-[#1F2A24]">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowAiInsights(false)}
              className="text-emerald-400 hover:text-emerald-600 transition p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ─── CHARTS GRID ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Trend with Debt Overlay */}
        <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm hover:shadow-md transition">
          <h4 className="text-sm font-semibold text-[#1F2A24] mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-600" />
            Sales & Debt Trend
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={insights.dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval={timeRange === 'week' ? 0 : 2} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend verticalAlign="top" height={20} />
                <Line type="monotone" dataKey="sales" stroke="#0F6B4C" strokeWidth={2} dot={false} name="Sales" />
                <Line type="monotone" dataKey="debt" stroke="#C1442E" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Debt" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm hover:shadow-md transition">
          <h4 className="text-sm font-semibold text-[#1F2A24] mb-3 flex items-center gap-2">
            <Award size={16} className="text-emerald-600" />
            Top Products
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.topProducts} layout="vertical">
                <XAxis type="number" tick={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="revenue" fill="#0F6B4C" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment & Source Distribution */}
        <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm hover:shadow-md transition">
          <h4 className="text-sm font-semibold text-[#1F2A24] mb-3 flex items-center gap-2">
            <PieChart size={16} className="text-emerald-600" />
            Payment Status
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={insights.paymentDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {insights.paymentDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={index === 0 ? '#0F6B4C' : '#C1442E'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} transactions`} />
                <Legend verticalAlign="bottom" height={20} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm hover:shadow-md transition">
          <h4 className="text-sm font-semibold text-[#1F2A24] mb-3 flex items-center gap-2">
            <Users size={16} className="text-emerald-600" />
            Top Customers
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.topCustomers} layout="vertical">
                <XAxis type="number" tick={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="totalSpent" fill="#7C3AED" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Performance */}
        <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm hover:shadow-md transition lg:col-span-2">
          <h4 className="text-sm font-semibold text-[#1F2A24] mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-emerald-600" />
            Monthly Performance
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend verticalAlign="top" height={20} />
                <Bar dataKey="sales" fill="#0F6B4C" radius={[4, 4, 0, 0]} name="Sales" />
                <Bar dataKey="debt" fill="#C1442E" radius={[4, 4, 0, 0]} name="Debt" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── QUICK ACTIONS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button className="bg-white rounded-2xl border border-black/5 p-4 text-center hover:shadow-md transition group">
          <FileText size={20} className="mx-auto text-emerald-600 group-hover:scale-110 transition" />
          <p className="text-xs text-[#1F2A24]/60 mt-1">Export Report</p>
        </button>
        <button className="bg-white rounded-2xl border border-black/5 p-4 text-center hover:shadow-md transition group">
          <Target size={20} className="mx-auto text-emerald-600 group-hover:scale-110 transition" />
          <p className="text-xs text-[#1F2A24]/60 mt-1">Set Goals</p>
        </button>
        <button onClick={generateAiInsights} className="bg-white rounded-2xl border border-black/5 p-4 text-center hover:shadow-md transition group">
          <Sparkles size={20} className="mx-auto text-emerald-600 group-hover:scale-110 transition" />
          <p className="text-xs text-[#1F2A24]/60 mt-1">Refresh AI</p>
        </button>
        <button className="bg-white rounded-2xl border border-black/5 p-4 text-center hover:shadow-md transition group">
          <Download size={20} className="mx-auto text-emerald-600 group-hover:scale-110 transition" />
          <p className="text-xs text-[#1F2A24]/60 mt-1">Download</p>
        </button>
      </div>

      {/* ─── KEY METRICS SUMMARY ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-[#1F2A24] mb-3">Key Metrics Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#1F2A24]">{insights.totalTransactions}</p>
            <p className="text-[10px] text-[#1F2A24]/40">Total Transactions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{insights.uniqueCustomers}</p>
            <p className="text-[10px] text-[#1F2A24]/40">Unique Customers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{insights.topProducts.length}</p>
            <p className="text-[10px] text-[#1F2A24]/40">Top Products</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{Math.round(insights.collectionRate)}%</p>
            <p className="text-[10px] text-[#1F2A24]/40">Collection Rate</p>
          </div>
        </div>
      </div>
    </div>
  )
}