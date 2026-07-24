'use client'

import { Search, MessageSquare, Users, Shield, Sparkles, TrendingUp, TrendingDown, Phone, Mail, Clock, AlertTriangle, CheckCircle, CreditCard, ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import DebtGuardian from './DebtGuardian'

interface Customer {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  totalDebt: number
  totalPaid: number
  transactionCount: number
}

interface Transaction {
  id: string
  customer: { name: string }
  amount: number
  status: 'paid' | 'unpaid' | 'partial'
}

interface CustomersContentProps {
  customers?: Customer[]
  transactions?: Transaction[]
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function getRiskLevel(debt: number): { level: 'low' | 'medium' | 'high'; color: string; bg: string; label: string } {
  if (debt > 50000) {
    return { level: 'high', color: 'text-red-600', bg: 'bg-red-50', label: 'High Risk' }
  } else if (debt > 20000) {
    return { level: 'medium', color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Medium Risk' }
  } else {
    return { level: 'low', color: 'text-green-600', bg: 'bg-green-50', label: 'Low Risk' }
  }
}

function formatCurrency(amount: number) {
  return amount.toLocaleString() + ' Br'
}

export default function CustomersContent({ customers, transactions }: CustomersContentProps) {
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string
    name: string
  } | null>(null)
  const [filter, setFilter] = useState<'all' | 'with-debt' | 'settled'>('all')

  const list: Customer[] = useMemo(() => {
    if (customers) return customers

    const map = new Map<string, Customer>()
    ;(transactions ?? []).forEach((t) => {
      const name = t.customer.name
      if (!map.has(name)) {
        map.set(name, { id: name, name, totalDebt: 0, totalPaid: 0, transactionCount: 0 })
      }
      const c = map.get(name)!
      if (t.status === 'unpaid') c.totalDebt += t.amount
      else c.totalPaid += t.amount
      c.transactionCount += 1
    })
    return Array.from(map.values()).sort((a, b) => b.totalDebt - a.totalDebt)
  }, [customers, transactions])

  const filtered = list.filter((c) => {
  const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all"
        ? true
        : filter === "with-debt"
        ? c.totalDebt > 0
        : filter === "settled"
        ? c.totalDebt === 0
        : false;

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: list.length,
    withDebt: list.filter(c => c.totalDebt > 0).length,
    settled: list.filter(c => c.totalDebt === 0).length,
    totalDebt: list.reduce((sum, c) => sum + c.totalDebt, 0)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#1F2A24]">Customers</h2>
            <p className="mt-1 text-sm text-[#1F2A24]/50">
              Manage your customer relationships and balances
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-[#1F2A24]">{stats.total}</span>
            <span className="text-[#1F2A24]/40">total</span>
            <span className="w-px h-4 bg-[#1F2A24]/10" />
            <span className="font-medium text-[#C1442E]">{stats.withDebt}</span>
            <span className="text-[#1F2A24]/40">with debt</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#FBF9F5] p-3 text-center">
            <p className="text-xs text-[#1F2A24]/40">Total Debt</p>
            <p className="text-lg font-bold text-[#C1442E]">{formatCurrency(stats.totalDebt)}</p>
          </div>
          <div className="rounded-xl bg-[#FBF9F5] p-3 text-center">
            <p className="text-xs text-[#1F2A24]/40">With Debt</p>
            <p className="text-lg font-bold text-[#1F2A24]">{stats.withDebt}</p>
          </div>
          <div className="rounded-xl bg-[#FBF9F5] p-3 text-center">
            <p className="text-xs text-[#1F2A24]/40">Settled</p>
            <p className="text-lg font-bold text-[#0F6B4C]">{stats.settled}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1F2A24]/30" />
          <input
            type="text"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-[13.5px] placeholder:text-[#1F2A24]/30 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0F6B4C]/40"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[13.5px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0F6B4C]/40"
        >
          <option value="all">All</option>
          <option value="with-debt">With Debt</option>
          <option value="settled">Settled</option>
        </select>
      </div>

      {/* Customer List */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-[#1F2A24]/35">
            <Users size={30} className="mx-auto mb-2" />
            <p className="text-[13.5px] font-medium text-[#1F2A24]/60">No customers found</p>
            <p className="text-[12px]">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((customer) => {
              const risk = customer.totalDebt > 0 ? getRiskLevel(customer.totalDebt) : null
              const isDebtor = customer.totalDebt > 0

              return (
                <div
                  key={customer.id}
                  className={`group flex items-center gap-3 rounded-xl p-3 transition-all ${
                    isDebtor 
                      ? 'bg-[#FBF9F5] hover:bg-[#F3EFE6]' 
                      : 'bg-white hover:bg-[#FBF9F5]'
                  }`}
                >
                  {/* Avatar with status indicator */}
                  <div className="relative">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white ${
                      isDebtor ? 'bg-[#C1442E]' : 'bg-[#0F6B4C]'
                    }`}>
                      {initials(customer.name)}
                    </div>
                    {isDebtor && (
                      <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#C1442E] ring-2 ring-white animate-pulse" />
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13.5px] font-semibold text-[#1F2A24]">
                        {customer.name}
                      </p>
                      {risk && (
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${risk.bg} ${risk.color}`}>
                          {risk.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-[#1F2A24]/45">
                      <span>{customer.transactionCount} transactions</span>
                      {customer.phone && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-[#1F2A24]/20" />
                          <span className="flex items-center gap-0.5">
                            <Phone size={10} />
                            {customer.phone}
                          </span>
                        </>
                      )}
                      {customer.email && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-[#1F2A24]/20" />
                          <span className="truncate flex items-center gap-0.5">
                            <Mail size={10} />
                            {customer.email}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Balance & Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      {isDebtor ? (
                        <>
                          <p className="text-[13px] font-bold text-[#C1442E]">
                            {formatCurrency(customer.totalDebt)}
                          </p>
                          <p className="text-[10px] text-[#1F2A24]/30">due</p>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-[#0F6B4C]">
                          <CheckCircle size={14} />
                          <span className="text-[12px] font-semibold">Settled</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* AI Debt Guardian Button */}
                      {isDebtor && (
                        <button
                          onClick={() => setSelectedCustomer({
                            id: customer.id,
                            name: customer.name
                          })}
                          className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-all hover:bg-emerald-200 hover:scale-105 group/btn"
                          title="AI Debt Guardian"
                        >
                          <Shield size={15} />
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 text-[6px] text-white font-bold items-center justify-center flex">
                              AI
                            </span>
                          </span>
                        </button>
                      )}

                      {/* SMS Reminder */}
                      {isDebtor && customer.phone && (
                        <a
                          href={`sms:${customer.phone}?body=${encodeURIComponent(
                            `Selam ${customer.name}, this is a friendly reminder that you have an outstanding balance of ${customer.totalDebt.toLocaleString()} Br. Please let us know if you have any questions. Thank you!`
                          )}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E5A823]/15 text-[#B8860B] transition hover:bg-[#E5A823]/25"
                          title="Send SMS reminder"
                        >
                          <MessageSquare size={15} />
                        </a>
                      )}

                      {/* View Details Arrow */}
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#1F2A24]/20 transition hover:bg-[#1F2A24]/5 hover:text-[#1F2A24]/40 opacity-0 group-hover:opacity-100"
                        title="View details"
                      >
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI Debt Guardian Modal */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedCustomer(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-300"
          >
            <DebtGuardian
              customerId={selectedCustomer.id}
              customerName={selectedCustomer.name}
              onClose={() => setSelectedCustomer(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}